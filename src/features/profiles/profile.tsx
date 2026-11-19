"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, changedFields, segment } from "@/lib/api";
import type {
  OwnProfile,
  ProfileCompletion,
  PublicProfile,
} from "@/lib/contracts";
import { profileSchema } from "@/lib/validation";
import { useAuth, useOwnProfile, useRefresh } from "@/providers/app-provider";
import { DataForm, type FieldSpec } from "@/components/forms";
import {
  EmptyState,
  ErrorState,
  ImageView,
  Loading,
  PageIntro,
  Verified,
  Notice,
} from "@/components/ui";
import { SingleMedia } from "@/components/uploads";
const fields: FieldSpec[] = [
  {
    name: "firstName",
    label: "First name",
    required: true,
    autoComplete: "given-name",
  },
  {
    name: "lastName",
    label: "Last name",
    required: true,
    autoComplete: "family-name",
  },
  {
    name: "username",
    label: "Username",
    required: true,
    help: "Lowercase letters, numbers, and underscores. 3–40 characters.",
  },
  {
    name: "phoneNumber",
    label: "Phone number",
    type: "tel",
    nullable: true,
    autoComplete: "tel",
  },
  {
    name: "bio",
    label: "A little about you",
    type: "textarea",
    nullable: true,
    maxLength: 2000,
  },
  {
    name: "dateOfBirth",
    label: "Date of birth",
    type: "date",
    nullable: true,
    min: "1900-01-01",
  },
  {
    name: "gender",
    label: "Gender",
    nullable: true,
    options: ["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"].map(
      (v) => ({ value: v, label: v.toLowerCase().replaceAll("_", " ") }),
    ),
  },
  { name: "nationality", label: "Nationality", nullable: true },
  {
    name: "country",
    label: "Country",
    nullable: true,
    autoComplete: "country-name",
  },
  {
    name: "state",
    label: "State / region",
    nullable: true,
    autoComplete: "address-level1",
  },
  {
    name: "city",
    label: "City",
    nullable: true,
    autoComplete: "address-level2",
  },
  {
    name: "preferredLanguage",
    label: "Preferred language",
    nullable: true,
    placeholder: "en-NG",
    help: "Use a language tag, for example en or en-NG.",
  },
  {
    name: "address",
    label: "Private address",
    type: "textarea",
    nullable: true,
    maxLength: 500,
  },
];
export function ProfileEditor({ checkout = false }: { checkout?: boolean }) {
  const router = useRouter();
  const client = useQueryClient();
  const auth = useAuth();
  const profile = useOwnProfile();
  const refresh = useRefresh();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const completion = useQuery({
    queryKey: ["private", auth.user?.id, "completeness"],
    queryFn: () => api<ProfileCompletion>("/users/me/profile/completeness"),
    enabled: !!profile.data,
  });
  if (profile.isPending) return <Loading />;
  if (profile.error)
    return (
      <ErrorState
        error={profile.error}
        retry={() => {
          void profile.refetch();
        }}
      />
    );
  const p = profile.data;
  const initial: Record<string, unknown> = {};
  fields.forEach((f) => {
    initial[f.name] = p?.[f.name as keyof OwnProfile] ?? null;
  });
  initial.dateOfBirth = p?.dateOfBirth?.slice(0, 10) ?? null;
  return (
    <>
      <PageIntro
        eyebrow="YOUR PROFILE"
        title={p ? "Make it personal." : "Nice to meet you."}
        description={
          checkout
            ? "Add your shipping and contact details, then return straight to checkout."
            : "A little about the person behind your account."
        }
      />
      {checkout && (
        <Notice>
          Your bag is saved. Complete the required delivery details below to
          continue to payment.
        </Notice>
      )}
      <div className="profile-actions">
        <p className="muted small-text">{auth.user?.email} · Account email</p>
        <button
          className="text-link"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await auth.logout();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn’t sign out.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Signing out…" : "Sign out ↗"}
        </button>
      </div>
      {error && (
        <p className="signout-error" role="alert">
          {error}
        </p>
      )}
      {p && (
        <>
          {completion.data && (
            <div className="completion">
              <p>
                {completion.data.complete
                  ? "Your profile is complete."
                  : "A few finishing touches."}
              </p>
              {!completion.data.complete && (
                <p>
                  Still to add:{" "}
                  {completion.data.missingFields
                    .map((v) => v.replace(/([A-Z])/g, " $1").toLowerCase())
                    .join(", ")}
                  .
                </p>
              )}
            </div>
          )}
          {completion.error && (
            <ErrorState
              error={completion.error}
              retry={() => {
                void completion.refetch();
              }}
            />
          )}
          <SingleMedia
            path="/users/me/profile-picture"
            src={p.profilePicture}
            label="Profile picture"
          />
          <Link
            className="text-link breadcrumb"
            href={`/people/${segment(p.username)}`}
          >
            View your public profile ↗
          </Link>
        </>
      )}
      <section className="panel">
        <h2>{p ? "Your details" : "Create your profile"}</h2>
        <p className="field-help" style={{ marginBottom: 25 }}>
          Only your name, username, bio, city, country, preferred language, and
          picture appear on your public profile.
        </p>
        <DataForm
          key={p ? `${p.id}:${JSON.stringify(initial)}` : "new"}
          fields={fields.map((field) => ({
            ...field,
            label: field.name === "address" ? "Shipping address" : field.label,
            required:
              field.required ||
              (checkout &&
                ["phoneNumber", "address", "country", "state", "city"].includes(
                  field.name,
                )),
            advanced: [
              "dateOfBirth",
              "gender",
              "nationality",
              ...(!checkout ? ["address"] : []),
            ].includes(field.name),
          }))}
          advancedLabel="Additional profile details (optional)"
          cancelHref={checkout ? "/checkout" : "/"}
          schema={
            checkout
              ? profileSchema.extend({
                  phoneNumber: z
                    .string()
                    .trim()
                    .regex(/^\+?[\d ()-]{7,30}$/, "Add a valid phone number."),
                  address: z
                    .string()
                    .trim()
                    .min(1, "Add your shipping address.")
                    .max(500),
                  country: z.string().trim().min(1).max(80),
                  state: z.string().trim().min(1).max(100),
                  city: z.string().trim().min(1).max(100),
                })
              : profileSchema
          }
          initial={initial}
          submit={
            checkout
              ? "Save & return to checkout"
              : p
                ? "Save changes"
                : "Create profile"
          }
          onSave={async (values) => {
            const saved = await api<OwnProfile>(
              p ? "/users/me/profile" : "/users/profile",
              {
                method: p ? "PATCH" : "POST",
                body: p ? changedFields(values, initial) : values,
              },
            );
            client.setQueryData(["private", auth.user?.id, "profile"], saved);
            await refresh();
            router.replace(checkout ? "/checkout" : "/");
            return p ? "Your profile is updated." : "Your profile is ready.";
          }}
        />
      </section>
    </>
  );
}
export function PublicPerson({ username }: { username: string }) {
  const query = useQuery({
    queryKey: ["person", username],
    queryFn: ({ signal }) =>
      api<PublicProfile>(`/users/${segment(username)}/profile`, { signal }),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const p = query.data;
  if (!p) return <EmptyState />;
  return (
    <section className="public-profile">
      <ImageView src={p.profilePicture} alt={`${p.firstName} ${p.lastName}`} />
      <p className="eyebrow">@{p.username}</p>
      <h1>
        {p.firstName} {p.lastName}
      </h1>
      <p className="muted small-text">
        {[p.city, p.country].filter(Boolean).join(", ")}
      </p>
      {p.bio && <p className="plain-text">{p.bio}</p>}
      <p className="muted small-text">
        Part of the community since{" "}
        {new Date(p.accountCreatedAt).toLocaleDateString("en", {
          month: "long",
          year: "numeric",
        })}
      </p>
      {p.preferredLanguage && (
        <p className="field-help">Language: {p.preferredLanguage}</p>
      )}
      {p.seller && (
        <Link
          className="button secondary"
          href={`/stores/${segment(p.seller.slug)}`}
        >
          Visit {p.seller.displayName}{" "}
          <Verified status={p.seller.verificationStatus} /> ↗
        </Link>
      )}
    </section>
  );
}
