import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getDisplayTitle, type CategoryGroup } from "../features/notes/noteUtils";
import { useNoteCategoryDrag } from "../features/notes/useNoteCategoryDrag";
import { NoteBrowserCard } from "./NoteBrowserCard";

interface CategoryNoteBrowserProps {
  groups: CategoryGroup[];
  selectedId: string | null;
  compact: boolean;
  collapsedCategories: Set<string>;
  renamingCategory: string | null;
  renameCategoryValue: string;
  onRenameValueChange: (value: string) => void;
  onRename: (category: string) => void;
  onCancelRename: () => void;
  onToggleCollapse: (category: string) => void;
  onCategoryContextMenu: (event: MouseEvent<HTMLElement>, category: string) => void;
  onNoteContextMenu: (event: MouseEvent<HTMLElement>, id: string) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, category: string) => void;
}

export function CategoryNoteBrowser({
  groups,
  selectedId,
  compact,
  collapsedCategories,
  renamingCategory,
  renameCategoryValue,
  onRenameValueChange,
  onRename,
  onCancelRename,
  onToggleCollapse,
  onCategoryContextMenu,
  onNoteContextMenu,
  onSelect,
  onMove,
}: CategoryNoteBrowserProps) {
  const { t } = useTranslation();
  const { browserRef, drag, targetCategory, startDrag, onClickCapture } =
    useNoteCategoryDrag(onMove);
  return (
    <div ref={browserRef} className="space-y-1" data-category-note-browser="true">
      {groups.map((group) => {
        const isCollapsed = collapsedCategories.has(group.category);
        const isTarget = targetCategory === group.category;
        return (
          <section key={group.category} data-note-category={group.category}>
            <div
              className={`flex items-center gap-1 px-2 rounded-lg transition-colors ${isTarget ? "bg-bamboo/15" : "hover:bg-paper-warm/50"}`}
              data-drop-target={isTarget || undefined}
            >
              <button
                type="button"
                onClick={() => onToggleCollapse(group.category)}
                onClickCapture={onClickCapture}
                onContextMenu={(event) => {
                  if (group.category) onCategoryContextMenu(event, group.category);
                }}
                aria-label={group.category || t("main.category.uncategorized")}
                aria-expanded={!isCollapsed}
                className="flex items-center gap-1.5 min-w-0 flex-1 py-1.5 text-left cursor-pointer select-none"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`text-bamboo/50 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-bamboo/50 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {renamingCategory !== group.category && (
                  <span className="text-[11px] text-bamboo/70 font-medium truncate">
                    {group.category || t("main.category.uncategorized")}
                  </span>
                )}
              </button>
              {renamingCategory === group.category && (
                <input
                  type="text"
                  autoFocus
                  value={renameCategoryValue}
                  onChange={(event) => onRenameValueChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === "Enter") onRename(group.category);
                    if (event.key === "Escape") onCancelRename();
                  }}
                  onBlur={() => onRename(group.category)}
                  className="flex-1 min-w-0 px-1 text-[11px] font-body text-ink bg-paper-warm/80 border border-bamboo/30 rounded"
                />
              )}
              <span className="text-[9px] text-bamboo/40 font-mono shrink-0">
                {group.notes.length}
              </span>
            </div>
            {!isCollapsed && (
              <div className="ml-4 py-0.5 space-y-0.5" data-category-contents="true">
                {group.notes.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-ink-ghost/50">
                    {t("main.category.emptyFolder")}
                  </p>
                ) : (
                  group.notes.map((note) => (
                    <NoteBrowserCard
                      key={note.id}
                      note={note}
                      selected={selectedId === note.id}
                      compact={compact}
                      onSelect={onSelect}
                      onContextMenu={onNoteContextMenu}
                      onPointerDown={startDrag}
                      onClickCapture={onClickCapture}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
      {drag &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none max-w-56 rounded-lg bg-cloud/95 shadow-lg px-3 py-2 text-[12px] text-bamboo font-display truncate"
            style={{ left: drag.x + 12, top: drag.y + 12 }}
            aria-hidden="true"
          >
            {getDisplayTitle(drag.note, t)}
          </div>,
          document.body,
        )}
    </div>
  );
}
