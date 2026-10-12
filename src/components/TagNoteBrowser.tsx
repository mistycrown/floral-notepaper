import { useMemo, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { groupNotesByTag } from "../features/notes/noteUtils";
import type { NoteMetadata } from "../features/notes/types";
import { NoteBrowserCard } from "./NoteBrowserCard";

interface TagNoteBrowserProps {
  notes: NoteMetadata[];
  selectedId?: string | null;
  compact?: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, id: string) => void;
}

export function TagNoteBrowser({
  notes,
  selectedId,
  compact = false,
  onSelect,
  onContextMenu,
}: TagNoteBrowserProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupNotesByTag(notes), [notes]);
  return (
    <div className="space-y-1" data-note-tag-browser="true">
      {groups.map(({ tag, notes: entries }) => {
        const isCollapsed = collapsed.has(tag);
        return (
          <section key={tag}>
            <button
              type="button"
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-bamboo/70 cursor-pointer hover:bg-bamboo-mist/40 transition-colors"
              aria-expanded={!isCollapsed}
              onClick={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(tag)) next.delete(tag);
                  else next.add(tag);
                  return next;
                })
              }
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
              <span className="truncate text-[11px] font-medium">
                {tag ? `#${tag}` : t("tags.untagged")}
              </span>
              <span className="ml-auto text-[9px] font-mono shrink-0">{entries.length}</span>
            </button>
            {!isCollapsed && (
              <ul className="ml-4 py-0.5 space-y-0.5">
                {entries.map((note) => (
                  <li key={note.id}>
                    <NoteBrowserCard
                      note={note}
                      selected={note.id === selectedId}
                      compact={compact}
                      onSelect={onSelect}
                      onContextMenu={onContextMenu}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
