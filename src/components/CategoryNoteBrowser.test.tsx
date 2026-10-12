// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CategoryNoteBrowser } from "./CategoryNoteBrowser";
import { groupNotesByCategory } from "../features/notes/noteUtils";
import type { NoteMetadata } from "../features/notes/types";

const note: NoteMetadata = {
  id: "note-1",
  title: "Drag this note",
  category: "Source",
  fileName: "note-1.md",
  preview: "Preview text",
  wordCount: 12,
  createdAt: "2026-10-11T00:00:00Z",
  updatedAt: "2026-10-11T00:00:00Z",
};
let root: Root;
let container: HTMLDivElement;
let hit: Element | null;
const onMove = vi.fn();
const onSelect = vi.fn();
const onContextMenu = vi.fn();

function pointer(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  button = 0,
  pointerId = 1,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button,
    buttons: type === "pointerup" ? 0 : 1,
  });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: "mouse" },
    isPrimary: { value: true },
  });
  act(() => {
    target.dispatchEvent(event);
  });
}

function card(): HTMLButtonElement {
  return container.querySelector<HTMLButtonElement>("[data-note-card]")!;
}
function folder(name: string): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-note-category="${name}"]`)!;
}
function begin(target: Element | null) {
  hit = target;
  pointer(card(), "pointerdown", 10, 10);
  pointer(document, "pointermove", 30, 30);
}

beforeEach(() => {
  onMove.mockReset();
  onSelect.mockReset();
  onContextMenu.mockReset();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: vi.fn(() => hit),
  });
  hit = null;
  container = document.createElement("div");
  container.dataset.noteBrowserScroll = "true";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <CategoryNoteBrowser
        groups={groupNotesByCategory([note], ["", "Source", "Empty", "Folded"])}
        selectedId={null}
        compact={false}
        collapsedCategories={new Set(["Folded"])}
        renamingCategory={null}
        renameCategoryValue=""
        onRenameValueChange={() => {}}
        onRename={() => {}}
        onCancelRename={() => {}}
        onToggleCollapse={() => {}}
        onCategoryContextMenu={() => {}}
        onNoteContextMenu={onContextMenu}
        onSelect={onSelect}
        onMove={onMove}
      />,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test.each(["Empty", "Folded", ""])(
  "moves a note to the empty/collapsed/uncategorized target '%s'",
  (category) => {
    begin(folder(category).querySelector("button"));
    expect(folder(category).querySelector('[data-drop-target="true"]')).not.toBeNull();
    expect(document.body.style.cursor).toBe("grabbing");
    pointer(document, "pointerup", 30, 30);
    expect(onMove).toHaveBeenCalledExactlyOnceWith(note.id, category);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
    expect(document.querySelector('[aria-hidden="true"].fixed')).toBeNull();
    act(() => card().click());
    expect(onSelect).not.toHaveBeenCalled();
    pointer(card(), "pointerdown", 10, 10);
    pointer(document, "pointerup", 10, 10);
    act(() => card().click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(note.id);
  },
);

test("a small mouse movement remains a normal click", () => {
  hit = folder("Empty");
  pointer(card(), "pointerdown", 10, 10);
  pointer(document, "pointermove", 13, 12);
  pointer(document, "pointerup", 13, 12);
  act(() => card().click());
  expect(onMove).not.toHaveBeenCalled();
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(note.id);
});

test.each(["escape", "cancel", "blur"])("%s cancels a drag and restores the cursor", (kind) => {
  begin(folder("Empty"));
  act(() => {
    if (kind === "escape")
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    if (kind === "blur") window.dispatchEvent(new Event("blur"));
  });
  if (kind === "cancel") pointer(document, "pointercancel", 30, 30);
  pointer(document, "pointerup", 30, 30);
  expect(onMove).not.toHaveBeenCalled();
  expect(document.body.style.cursor).toBe("");
});

test.each(["same", "outside"])("dropping on %s does not move a note", (kind) => {
  begin(kind === "same" ? folder("Source") : document.body);
  pointer(document, "pointerup", 30, 30);
  expect(onMove).not.toHaveBeenCalled();
});

test("right click keeps the note context menu and never starts a drag", () => {
  hit = folder("Empty");
  pointer(card(), "pointerdown", 10, 10, 2);
  pointer(document, "pointermove", 30, 30);
  pointer(document, "pointerup", 30, 30);
  act(() => {
    card().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
  });
  expect(onMove).not.toHaveBeenCalled();
  expect(onContextMenu.mock.calls[0][1]).toBe(note.id);
  expect(card().draggable).toBe(false);
});

test("another pointer cannot finish the active drag", () => {
  begin(folder("Empty"));
  pointer(document, "pointerup", 30, 30, 0, 2);
  expect(onMove).not.toHaveBeenCalled();
  pointer(document, "pointerup", 30, 30);
  expect(onMove).toHaveBeenCalledExactlyOnceWith(note.id, "Empty");
});

test("category groups have indented content without borders", () => {
  const group = folder("Source");
  expect(group.querySelector("[data-category-contents]")?.className).toContain("ml-4");
  expect(group.outerHTML).not.toMatch(/\bborder(?:-|\s)/);
});

test("dragging near the list edge scrolls while preserving the drop target", () => {
  vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
  hit = folder("Empty");
  pointer(card(), "pointerdown", 10, 10);
  pointer(document, "pointermove", 30, 95);
  const callback = vi.mocked(requestAnimationFrame).mock.calls[0][0];
  act(() => callback(0));
  expect(container.scrollTop).toBe(8);
  expect(folder("Empty").querySelector('[data-drop-target="true"]')).not.toBeNull();
  pointer(document, "pointerup", 30, 95);
  expect(onMove).toHaveBeenCalledExactlyOnceWith(note.id, "Empty");
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
