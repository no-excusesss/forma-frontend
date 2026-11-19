"use client";
import Link from "next/link";
import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { z } from "zod";
import { useFeedback } from "@/providers/app-provider";
import { ConfirmDialog } from "./ui";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { Select } from "./select";

export interface FieldSpec {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  searchable?: boolean;
  optionsLabel?: string;
  nullable?: boolean;
  min?: string;
  max?: string;
  step?: string;
  maxLength?: number;
  autoComplete?: string;
  wide?: boolean;
  section?: string;
  stage?: string;
  advanced?: boolean;
  disabled?: boolean;
  value?: string | number;
  onValueChange?: (value: string) => void;
  action?: ReactNode;
  derive?: { from: string; transform: (value: string) => string };
}
export interface FormStage {
  id: string;
  label: string;
  description: string;
}

export function DataForm({
  fields,
  schema,
  initial = {},
  onSave,
  submit = "Save changes",
  children,
  disabled = false,
  stages,
  childrenStage,
  advancedLabel = "Optional details",
  cancelHref,
  onValuesChange,
  externalDirty = false,
  protectChanges = true,
}: {
  fields: FieldSpec[];
  schema: z.ZodType;
  initial?: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<string | void>;
  submit?: string;
  children?: ReactNode;
  disabled?: boolean;
  stages?: FormStage[];
  childrenStage?: string;
  advancedLabel?: string;
  cancelHref?: string;
  onValuesChange?: (values: Record<string, unknown>) => void;
  externalDirty?: boolean;
  protectChanges?: boolean;
}) {
  const id = useId();
  const notify = useFeedback();
  const formRef = useRef<HTMLFormElement>(null);
  const edited = useRef(new Set<string>());
  const [values, setValues] = useState<Record<string, unknown>>({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [stage, setStage] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const guard = useUnsavedChanges(
    protectChanges && (dirty || externalDirty),
    () => setDirty(false),
  );
  const formStages = stages?.length
    ? stages
    : [{ id: "all", label: "", description: "" }];
  const last = stage === formStages.length - 1;

  function change(field: FieldSpec, value: string | boolean) {
    const next = { ...values, [field.name]: value };
    edited.current.add(field.name);
    for (const dependent of fields)
      if (
        dependent.derive?.from === field.name &&
        !edited.current.has(dependent.name)
      )
        next[dependent.name] = dependent.derive.transform(String(value));
    setValues(next);
    setDirty(true);
    field.onValueChange?.(String(value));
    onValuesChange?.(
      Object.fromEntries(
        fields.map((item) => [
          item.name,
          item.name === field.name
            ? value
            : (item.value ?? next[item.name] ?? initial[item.name] ?? ""),
        ]),
      ),
    );
    if (errors[field.name])
      setErrors((previous) => ({ ...previous, [field.name]: "" }));
  }
  function focusField(field: FieldSpec) {
    const targetStage = stages?.findIndex((item) => item.id === field.stage);
    if (targetStage !== undefined && targetStage >= 0) {
      setStage(targetStage);
      setFurthest((previous) => Math.max(previous, targetStage));
    }
    requestAnimationFrame(() => {
      const element = document.getElementById(`${id}-${field.name}`);
      const details = element?.closest("details");
      if (details) details.open = true;
      if (element?.matches(":disabled"))
        element
          .closest(".field")
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus();
      else element?.focus();
    });
  }
  function goStage(next: number) {
    setStage(next);
    setError("");
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>(`[data-stage="${formStages[next].id}"] h2`)
        ?.focus(),
    );
  }
  function renderField(field: FieldSpec) {
    const fieldId = `${id}-${field.name}`;
    const shared = {
      id: fieldId,
      name: field.name,
      required: field.required,
      disabled: field.disabled,
      "aria-invalid": !!errors[field.name],
      "aria-describedby":
        [
          errors[field.name] ? `${fieldId}-error` : "",
          field.help ? `${fieldId}-help` : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
    const value =
      field.value ?? values[field.name] ?? initial[field.name] ?? "";
    return (
      <Fragment key={field.name}>
        {field.section && !stages && (
          <div className="form-section">
            <h3>{field.section}</h3>
          </div>
        )}
        <div
          className={`field ${field.wide || field.type === "textarea" ? "wide" : ""} ${field.type === "checkbox" ? "checkbox-field" : ""}`}
        >
          {field.type === "checkbox" ? (
            <label className="checkbox-label">
              <input
                {...shared}
                type="checkbox"
                checked={!!value}
                onChange={(event) => change(field, event.target.checked)}
              />
              {field.label}
            </label>
          ) : (
            <>
              <div className="field-label-row">
                <label id={`${fieldId}-label`} htmlFor={fieldId}>
                  {field.label}
                  {field.required && (
                    <span className="required" aria-hidden="true">
                      {" "}
                      *
                    </span>
                  )}
                </label>
                {field.action}
              </div>
              {field.options ? (
                <Select
                  {...shared}
                  disabled={disabled || busy || field.disabled}
                  value={String(value)}
                  onValueChange={(value) => change(field, value)}
                  placeholder={field.placeholder}
                  searchable={field.searchable}
                  optionsLabel={field.optionsLabel}
                  options={
                    field.required
                      ? field.options
                      : [
                          { value: "", label: "Not specified" },
                          ...field.options,
                        ]
                  }
                />
              ) : field.type === "textarea" ? (
                <textarea
                  {...shared}
                  rows={field.advanced ? 3 : 4}
                  value={String(value)}
                  onChange={(event) => change(field, event.target.value)}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                />
              ) : field.type === "password" ? (
                <div className="password-control">
                  <input
                    {...shared}
                    type={visiblePasswords[field.name] ? "text" : "password"}
                    value={String(value)}
                    onChange={(event) => change(field, event.target.value)}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                  />
                  <button
                    type="button"
                    className="icon-button password-toggle"
                    disabled={busy || disabled || field.disabled}
                    aria-label={
                      visiblePasswords[field.name]
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={!!visiblePasswords[field.name]}
                    onClick={() =>
                      setVisiblePasswords((previous) => ({
                        ...previous,
                        [field.name]: !previous[field.name],
                      }))
                    }
                  >
                    {visiblePasswords[field.name] ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              ) : (
                <input
                  {...shared}
                  type={field.type || "text"}
                  value={String(value)}
                  onChange={(event) => change(field, event.target.value)}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  maxLength={field.maxLength}
                  autoComplete={field.autoComplete}
                />
              )}
            </>
          )}
          {errors[field.name] && (
            <p id={`${fieldId}-error`} className="field-error">
              {errors[field.name]}
            </p>
          )}
          {field.help && (
            <p id={`${fieldId}-help`} className="field-help">
              {field.help}
            </p>
          )}
        </div>
      </Fragment>
    );
  }

  return (
    <>
      <form
        ref={formRef}
        className={`data-form ${stages ? "staged-form" : ""}`}
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const data = new FormData(event.currentTarget);
          const input: Record<string, unknown> = {};
          fields.forEach((field) => {
            const raw = data.get(field.name);
            input[field.name] =
              field.type === "checkbox"
                ? raw === "on"
                : field.type === "number"
                  ? raw === "" || raw === null
                    ? NaN
                    : Number(raw)
                  : raw === "" && field.nullable
                    ? null
                    : raw === null
                      ? ""
                      : String(raw);
          });
          const result = schema.safeParse(input);
          const relevant = result.success
            ? []
            : result.error.issues.filter(
                (issue) =>
                  last ||
                  fields.find((field) => field.name === issue.path[0])
                    ?.stage === formStages[stage].id,
              );
          if (relevant.length) {
            const next: Record<string, string> = {};
            relevant.forEach((issue) => {
              const key = String(issue.path[0]);
              if (!next[key]) next[key] = issue.message;
            });
            setErrors(next);
            setError("Please check the highlighted fields.");
            const first = fields.find((field) => next[field.name]);
            if (first) focusField(first);
            return;
          }
          setErrors({});
          if (!last) {
            const next = stage + 1;
            goStage(next);
            setFurthest((previous) => Math.max(previous, next));
            return;
          }
          if (!result.success) {
            setError("Please check the required details before saving.");
            return;
          }
          setBusy(true);
          try {
            const message = await onSave(
              result.data as Record<string, unknown>,
            );
            setDirty(false);
            notify(message || "Changes saved.");
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "We couldn’t save your changes. Your details are still here.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy || disabled}>
          {fields.some((field) => field.required) && (
            <p className="form-guidance">
              <span aria-hidden="true">*</span> Required fields
            </p>
          )}
          {stages && (
            <nav className="form-stepper" aria-label="Progress">
              {stages.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={index > furthest || busy}
                  aria-current={index === stage ? "step" : undefined}
                  className={
                    index === stage
                      ? "current"
                      : index < stage
                        ? "complete"
                        : ""
                  }
                  onClick={() => goStage(index)}
                >
                  <span>{index < stage ? <Check size={13} /> : index + 1}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </nav>
          )}
          {formStages.map((item, index) => {
            const stageFields = stages
              ? fields.filter((field) => field.stage === item.id)
              : fields;
            const advanced = stageFields.filter((field) => field.advanced);
            return (
              <section
                className="form-stage"
                data-stage={item.id}
                key={item.id}
                hidden={index !== stage}
              >
                {stages && (
                  <div className="stage-heading">
                    <p className="eyebrow">
                      STEP {index + 1} OF {stages.length}
                    </p>
                    <h2 tabIndex={-1}>{item.label}</h2>
                    <p>{item.description}</p>
                  </div>
                )}
                <div className="form-grid">
                  {stageFields
                    .filter((field) => !field.advanced)
                    .map(renderField)}
                </div>
                {advanced.length > 0 && (
                  <details className="advanced-fields">
                    <summary>
                      {advancedLabel}
                      <span aria-hidden="true">+</span>
                    </summary>
                    <div className="form-grid">{advanced.map(renderField)}</div>
                  </details>
                )}
                {(!childrenStage || childrenStage === item.id) && children}
              </section>
            );
          })}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions flow-actions">
            <div>
              {stage > 0 ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => goStage(stage - 1)}
                >
                  <ArrowLeft size={15} /> Back
                </button>
              ) : cancelHref ? (
                <Link href={cancelHref} className="text-link muted">
                  Cancel
                </Link>
              ) : null}
            </div>
            <div className="flow-action-end">
              {protectChanges && (dirty || externalDirty) && (
                <span className="unsaved-label">Unsaved changes</span>
              )}
              <button
                className="button"
                type="submit"
                disabled={busy || disabled}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={16} /> Saving…
                  </>
                ) : last ? (
                  submit
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
      <ConfirmDialog
        open={guard.pendingHref !== null}
        title="Leave without saving?"
        description="Your changes haven’t been saved. Keep editing, or discard them and continue."
        onClose={guard.cancelLeave}
        onConfirm={guard.confirmLeave}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
      />
    </>
  );
}
