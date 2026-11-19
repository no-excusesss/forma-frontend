"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

type Option = { value: string; label: string };

/** A manually committed combobox: searching never changes the submitted value. */
export function Select({
  id,
  name,
  value: controlledValue,
  defaultValue = "",
  options,
  onValueChange,
  placeholder = "Select an option",
  searchable = false,
  optionsLabel = "options",
  "aria-label": label,
  required,
  disabled,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: {
  id: string;
  name: string;
  value?: string;
  defaultValue?: string;
  options: Option[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  optionsLabel?: string;
  "aria-label"?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const listId = `${id}-options`;
  const expanded = open && !disabled && !!portalRoot;

  function openMenu() {
    setPortalRoot(input.current?.closest("dialog") ?? document.body);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }
  function show(last = false) {
    if (disabled || input.current?.matches(":disabled")) return;
    setQuery("");
    const index = options.findIndex((option) => option.value === value);
    setActive(index >= 0 ? index : last ? options.length - 1 : 0);
    openMenu();
  }
  function choose(option: Option) {
    setInternalValue(option.value);
    onValueChange?.(option.value);
    close();
    input.current?.focus();
  }

  useLayoutEffect(() => {
    if (!expanded) return;
    function position() {
      if (!input.current || !panel.current) return;
      const rect = input.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const below = bottom - rect.bottom - 16;
      const above = rect.top - top - 16;
      const flip = below < 240 && above > below;
      const height = Math.min(320, Math.max(80, flip ? above : below));
      Object.assign(panel.current.style, {
        width: `${Math.min(rect.width, window.innerWidth - 24)}px`,
        left: `${Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12))}px`,
        maxHeight: `${height}px`,
        top: flip ? "auto" : `${rect.bottom + 8}px`,
        bottom: flip ? `${window.innerHeight - rect.top + 8}px` : "auto",
      });
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !input.current?.parentElement?.contains(event.target)
      ) {
        setOpen(false);
        setQuery("");
        setActive(-1);
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);

  useEffect(() => {
    if (!expanded || active < 0) return;
    const option = document.getElementById(`${listId}-${active}`);
    const list = option?.parentElement;
    if (!option || !list) return;
    const row = option.getBoundingClientRect();
    const bounds = list.getBoundingClientRect();
    // Scroll only the menu; scrollIntoView can also move the surrounding page.
    if (row.top < bounds.top) list.scrollTop -= bounds.top - row.top;
    else if (row.bottom > bounds.bottom)
      list.scrollTop += row.bottom - bounds.bottom;
  }, [active, expanded, listId, query]);

  return (
    <>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <div className={`select-control${expanded ? " is-open" : ""}`}>
        {expanded && searchable && (
          <Search size={16} className="select-search-icon" aria-hidden="true" />
        )}
        <input
          ref={input}
          id={id}
          data-select-name={name}
          className={`select-input${expanded && searchable ? " is-searching" : ""}`}
          role="combobox"
          aria-label={label}
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-haspopup="listbox"
          aria-autocomplete={searchable ? "list" : "none"}
          aria-activedescendant={
            expanded && filtered[active] ? `${listId}-${active}` : undefined
          }
          aria-required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
          spellCheck={false}
          readOnly={!searchable}
          disabled={disabled}
          value={expanded && searchable ? query : (selected?.label ?? "")}
          placeholder={
            expanded && searchable ? `Search ${optionsLabel}…` : placeholder
          }
          onFocus={(event) => {
            if (searchable && !expanded) event.currentTarget.select();
          }}
          onClick={() => {
            if (!expanded) show();
            else if (!searchable) close();
          }}
          onBlur={() => close()}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            openMenu();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              if (expanded) {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            } else if (event.key === "Tab") close();
            else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!expanded) show(event.key === "ArrowUp");
              else
                setActive((index) =>
                  Math.max(
                    0,
                    Math.min(
                      filtered.length - 1,
                      index + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
            } else if (
              (event.key === "Home" || event.key === "End") &&
              expanded &&
              (!searchable || event.ctrlKey)
            ) {
              event.preventDefault();
              setActive(event.key === "Home" ? 0 : filtered.length - 1);
            } else if (
              event.key === "Enter" ||
              (event.key === " " && !searchable)
            ) {
              event.preventDefault();
              if (!expanded) show();
              else if (filtered[active]) choose(filtered[active]);
            } else if (
              !searchable &&
              event.key.length === 1 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              event.preventDefault();
              const now = Date.now();
              const previous = typeahead.current;
              const text =
                (now - previous.time < 700 ? previous.text : "") +
                event.key.toLocaleLowerCase();
              typeahead.current = { text, time: now };
              const letters = [...text].every((letter) => letter === text[0])
                ? text[0]
                : text;
              const start = letters.length === 1 ? active + 1 : 0;
              const index = options.findIndex((_, offset) =>
                options[(start + offset) % options.length]?.label
                  .toLocaleLowerCase()
                  .startsWith(letters),
              );
              setQuery("");
              openMenu();
              if (index >= 0) setActive((start + index) % options.length);
            }
          }}
        />
        <ChevronDown size={16} className="select-chevron" aria-hidden="true" />
      </div>
      {expanded &&
        portalRoot &&
        createPortal(
          <div
            ref={panel}
            className="select-popover"
            onMouseDown={(event) => {
              if (
                !(event.target instanceof Element) ||
                !event.target.matches(".select-options")
              )
                event.preventDefault();
            }}
          >
            {searchable && (
              <div className="select-menu-heading" aria-hidden="true">
                <span>
                  {optionsLabel[0].toUpperCase() + optionsLabel.slice(1)}
                </span>
                <span>{filtered.length}</span>
              </div>
            )}
            <div
              id={listId}
              role="listbox"
              aria-label={label || optionsLabel}
              className="select-options"
            >
              {filtered.map((option, index) => (
                <div
                  id={`${listId}-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  className={`select-option${index === active ? " is-active" : ""}`}
                  onPointerMove={(event) => {
                    if (event.pointerType === "mouse") setActive(index);
                  }}
                  onClick={() => choose(option)}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check size={16} strokeWidth={2} aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
            {!filtered.length && (
              <div className="select-empty" role="status">
                <Search size={20} aria-hidden="true" />
                <p>No {optionsLabel} found</p>
                <span>Try a different search.</span>
              </div>
            )}
            {searchable && (
              <p className="select-menu-hint">
                Type to search · ↑ ↓ to explore · Enter to select
              </p>
            )}
          </div>,
          portalRoot,
        )}
    </>
  );
}
