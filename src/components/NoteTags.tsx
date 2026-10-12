import { useDeferredValue, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { extractNoteTags } from "../features/notes/tags";

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

export function NoteTagHint({ content }: { content: string }) {
  const { t } = useTranslation();
  const deferredContent = useDeferredValue(content);
  const tags = useMemo(() => extractNoteTags(deferredContent), [deferredContent]);
  return (
    <div
      className="flex items-center gap-1.5 mt-2 min-w-0 text-[10px] font-body text-ink-ghost"
      title={t("tags.hint")}
    >
      <span className="shrink-0 text-bamboo/60" aria-hidden="true">
        #
      </span>
      {tags.length ? (
        <div
          className="flex items-center gap-1.5 overflow-x-auto min-w-0"
          aria-label={t("tags.noteTags")}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="shrink-0 rounded bg-bamboo-mist/60 px-1.5 py-0.5 text-bamboo"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="truncate">{t("tags.hint")}</span>
      )}
    </div>
  );
}
