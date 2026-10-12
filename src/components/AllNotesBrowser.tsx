import type { MouseEvent } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NoteMetadata } from "../features/notes/types";
import { NoteBrowserCard } from "./NoteBrowserCard";

interface AllNotesBrowserProps {
  notes: NoteMetadata[];
  selectedId?: string | null;
  compact?: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, id: string) => void;
}

export function AllNotesBrowser({
  notes,
  selectedId,
  compact = false,
  onSelect,
  onContextMenu,
}: AllNotesBrowserProps) {
  const { t } = useTranslation();

  // Sort notes by updated time, newest first
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  return (
    <div className="space-y-0.5" data-all-notes-browser="true">
      {sortedNotes.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-ink-ghost">
          {t("main.search.empty", { defaultValue: "还没有笔记" })}
        </div>
      ) : (
        sortedNotes.map((note) => (
          <NoteBrowserCard
            key={note.id}
            note={note}
            selected={note.id === selectedId}
            compact={compact}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
          />
        ))
      )}
    </div>
  );
}
