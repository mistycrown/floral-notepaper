import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { openNoteInEditor } from "../features/windows/api";
import { filterNotes } from "../features/notes/noteUtils";
import { NoteBrowserCard } from "./NoteBrowserCard";
import type { NoteMetadata } from "../features/notes/types";

interface NotepadOpenPanelProps {
  notes: NoteMetadata[];
  compact?: boolean;
  onOpenNote: (noteId: string) => void;
}

export function NotepadOpenPanel({ notes, compact = false, onOpenNote }: NotepadOpenPanelProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => filterNotes(notes, searchQuery), [notes, searchQuery]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 pt-2 pb-1.5 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-paper-warm/60 border border-paper-deep/30">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-ink-ghost shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("notepad.search.placeholder", { defaultValue: "搜索笔记…" })}
            className="flex-1 text-[12px] font-body text-ink placeholder:text-ink-ghost/60 bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-ink-ghost hover:text-ink-faint transition-colors cursor-pointer"
              title={t("notepad.search.clear", { defaultValue: "清空搜索" })}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-2 pt-0 flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-0.5">
          {filteredNotes.map((note) => (
            <div key={note.id} className="relative group pr-7">
              <NoteBrowserCard note={note} compact={compact} onSelect={onOpenNote} />
              <button
                type="button"
                onClick={() => void openNoteInEditor(note.id)}
                className="absolute right-0 top-1.5 w-6 h-6 flex items-center justify-center rounded-md text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                title={t("notepad.tooltip.openInEditor")}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6M10 14 21 3" />
                </svg>
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-ink-ghost">
              {t("notepad.emptyState", { defaultValue: "还没有可打开的笔记" })}
            </div>
          )}
          {notes.length > 0 && filteredNotes.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-ink-ghost">
              {t("notepad.search.noResults", { defaultValue: "没有匹配的笔记" })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
