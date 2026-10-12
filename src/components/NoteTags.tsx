import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeNoteTags } from "../features/notes/tags";

export type NoteGrouping = "category" | "tag" | "all";

export function NoteGroupingControl({
  value,
  onChange,
}: {
  value: NoteGrouping;
  onChange: (value: NoteGrouping) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex gap-1 rounded-lg bg-paper-warm/60 p-0.5"
      role="group"
      aria-label={t("tags.groupBy")}
    >
      {(["all", "category", "tag"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={`flex-1 rounded-md px-3 py-1 text-[11px] font-body cursor-pointer transition-colors ${value === mode ? "bg-cloud text-bamboo shadow-sm" : "text-ink-ghost hover:text-ink-soft"}`}
        >
          {mode === "category"
            ? t("tags.byCategory")
            : mode === "tag"
              ? t("tags.byTag")
              : t("tags.all")}
        </button>
      ))}
    </div>
  );
}

export function NoteTagEditor({
  tags,
  knownTags,
  onChange,
}: {
  tags: readonly string[];
  knownTags: readonly string[];
  onChange: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const composing = useRef(false);
  const query = draft.trim().replace(/^#/, "");
  const invalid = Boolean(query && !normalizeNoteTags([draft]).length);
  const matches = useMemo(
    () =>
      normalizeNoteTags(knownTags)
        .filter((tag) => !tags.includes(tag) && tag.toLowerCase().startsWith(query.toLowerCase()))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 8),
    [knownTags, tags, query],
  );
  const open = focused && !invalid && matches.length > 0;
  const add = (value = draft) => {
    const normalized = normalizeNoteTags([value]);
    if (!normalized.length) return;
    if (!tags.includes(normalized[0])) onChange([...tags, normalized[0]]);
    setDraft("");
    setActive(-1);
    setFocused(false);
  };
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 mt-2 mb-1 min-w-0 shrink-0 text-[11px] font-body text-ink-ghost"
      title={t("tags.hint")}
      role="group"
      aria-label={t("tags.noteTags")}
    >
      <span className="shrink-0 text-bamboo/60">{t("tags.byTag")}</span>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-bamboo-mist/60 px-1.5 py-0.5 text-bamboo max-w-full"
        >
          <span className="truncate">#{tag}</span>
          <button
            type="button"
            aria-label={t("tags.remove", { tag })}
            title={t("tags.remove", { tag })}
            onClick={() => onChange(tags.filter((value) => value !== tag))}
            className="shrink-0 cursor-pointer hover:text-ink rounded px-0.5"
          >
            ×
          </button>
        </span>
      ))}
      <div className="relative flex items-center gap-1">
        <input
          type="text"
          role="combobox"
          aria-label={t("tags.add")}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            open && active >= 0 && active < matches.length ? `${listId}-${active}` : undefined
          }
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${listId}-error` : undefined}
          placeholder={t("tags.add")}
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            setDraft(event.target.value);
            setActive(-1);
            setFocused(true);
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onBlur={() => {
            if (!composing.current) add();
            setFocused(false);
          }}
          onKeyDown={(event) => {
            if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
              add();
            } else if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              add(open && active >= 0 ? matches[active] : draft);
            } else if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault();
              setActive(
                event.key === "ArrowDown"
                  ? (active + 1) % matches.length
                  : (active <= 0 ? matches.length : active) - 1,
              );
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setFocused(false);
              setActive(-1);
            }
          }}
          className={`w-28 min-w-0 rounded px-1.5 py-0.5 bg-paper-warm/40 placeholder:text-ink-ghost/60 focus:bg-paper-warm/70 ${invalid ? "text-red-400" : "text-ink-soft"}`}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            aria-label={t("tags.add")}
            disabled={invalid}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => add()}
            className="rounded px-1 cursor-pointer text-bamboo disabled:opacity-40"
          >
            +
          </button>
        )}
        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label={t("tags.suggestions")}
            className="absolute top-full left-0 z-50 mt-1 min-w-36 max-w-64 max-h-48 overflow-y-auto rounded-lg border border-paper-deep/40 bg-cloud shadow-lg py-1"
          >
            {matches.map((tag, index) => (
              <button
                key={tag}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => add(tag)}
                onMouseEnter={() => setActive(index)}
                className={`block w-full px-3 py-1.5 text-left truncate cursor-pointer ${index === active ? "bg-bamboo-mist/70 text-bamboo" : "text-ink-soft hover:bg-paper-warm/70"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
      {invalid && (
        <span id={`${listId}-error`} role="alert" className="text-red-400">
          {t("tags.invalid")}
        </span>
      )}
    </div>
  );
}
