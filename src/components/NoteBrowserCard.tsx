import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { formatShortDate, formatTime, getDisplayTitle } from "../features/notes/noteUtils";
import type { NoteMetadata } from "../features/notes/types";

interface NoteBrowserCardProps {
  note: NoteMetadata;
  selected?: boolean;
  compact?: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, id: string) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>, note: NoteMetadata) => void;
  onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
}

export function NoteBrowserCard({
  note,
  selected = false,
  compact = false,
  onSelect,
  onContextMenu,
  onPointerDown,
  onClickCapture,
}: NoteBrowserCardProps) {
  const { t } = useTranslation();
  const title = getDisplayTitle(note, t);
  return (
    <button
      type="button"
      data-note-card={note.id}
      aria-current={selected ? "true" : undefined}
      title={title}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => onPointerDown?.(event, note)}
      onClickCapture={onClickCapture}
      onClick={() => onSelect(note.id)}
      onContextMenu={(event) => onContextMenu?.(event, note.id)}
      className={`w-full min-w-0 text-left rounded-lg px-3 ${compact ? "py-1.5" : "py-2.5"} transition-colors cursor-pointer select-none group relative ${selected ? "bg-bamboo-mist/70" : "hover:bg-paper-warm/70"}`}
    >
      {selected && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-bamboo/60" />
      )}
      <div className={`flex items-baseline justify-between ${compact ? "" : "mb-0.5"}`}>
        <span
          className={`block min-w-0 truncate text-[13px] font-display font-medium ${selected ? "text-bamboo" : "text-ink-soft"}`}
        >
          {title}
        </span>
        {!compact && (
          <span className="ml-2 text-[10px] text-ink-ghost font-mono tabular-nums shrink-0">
            {formatShortDate(note.updatedAt)}
          </span>
        )}
      </div>
      {!compact && (
        <>
          <p className="text-[11px] text-ink-ghost leading-relaxed truncate group-hover:text-ink-faint">
            {note.preview || t("common.blankNote")}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-ghost/60 font-mono tabular-nums">
            <span>{formatTime(note.updatedAt)}</span>
            <span className="text-ink-ghost/40">·</span>
            <span>{t("common.wordCount", { count: note.wordCount })}</span>
          </div>
        </>
      )}
    </button>
  );
}
