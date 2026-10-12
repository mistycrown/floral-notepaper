// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NotePad } from "./NotePad";
import * as textareaCaret from "./textareaCaret";
import { requestSurfaceMode } from "../features/windows/surfaceMode";
import { requestSurfaceAction } from "../features/windows/surfaceActions";
import { newOutlineNode, outlineMarkdown } from "../features/notes/outline";
import type { Note, SaveNoteRequest } from "../features/notes/types";

let root: Root;
let container: HTMLDivElement;
let note: Note;
let saved: SaveNoteRequest[];
let saveFailure: boolean;
let commands: string[];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  saved = [];
  commands = [];
  saveFailure = false;
  note = {
    id: "pinned-note",
    title: "标题",
    content: "正文",
    category: "",
    fileName: "pinned.md",
    createdAt: "2026-10-12T00:00:00Z",
    updatedAt: "2026-10-12T00:00:00Z",
    wordCount: 2,
    noteType: "text",
  };
  mockWindows("main");
  mockIPC(
    async (command, args) => {
      commands.push(command);
      if (command === "config_get")
        return {
          locale: "zh-CN",
          noteSurfaceAutoSave: false,
          tileDoubleClickToEdit: true,
          tileColor: "#f6f3ec",
          tileColorMode: "custom",
          surfaceFontSize: 14,
        };
      if (command === "notes_list") return [{ ...note, preview: note.content }];
      if (command === "notes_get") return structuredClone(note);
      if (command === "notes_update") {
        if (saveFailure) throw new Error("save failed");
        const request = structuredClone((args as { request: SaveNoteRequest }).request);
        saved.push(request);
        note = { ...note, ...request };
        await emit("notes-changed");
        return structuredClone(note);
      }
      if (command === "images_get_base_dir") return "";
      return null;
    },
    { shouldMockEvents: true },
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  clearMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function pad() {
  return container.querySelector<HTMLElement>('[data-surface-mode="pad"]')!;
}

async function doubleClick(target: Element, button = 0, clientY = 0) {
  await act(async () => {
    target.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2, button, clientY }));
  });
}

async function editPinnedNote() {
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  await doubleClick(container.querySelector('[data-surface-mode="tile"]')!);
  expect(pad()).not.toBeNull();
}

function type(textarea: HTMLTextAreaElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      textarea,
      value,
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("double-clicking editor whitespace saves changes and returns to pinned reading mode", async () => {
  await editPinnedNote();
  type(pad().querySelector("textarea")!, "修改后的正文");
  await doubleClick(pad().querySelector("[data-pad-editor-body]")!);
  expect(saved).toHaveLength(1);
  expect(saved[0].content).toBe("修改后的正文");
  expect(container.querySelector('[data-surface-mode="tile"]')?.textContent).toContain(
    "修改后的正文",
  );
});

test("double-clicking below list items saves their text and task state", async () => {
  const nodes = [{ ...newOutlineNode("待办"), kind: "todo" as const }];
  note = { ...note, noteType: "list", outlineNodes: nodes, content: outlineMarkdown(nodes) };
  await editPinnedNote();
  type(pad().querySelector("textarea[data-outline-node]")!, "更新条目");
  await doubleClick(pad().querySelector("[data-outline-editor]")!);
  expect(saved[0].outlineNodes?.[0].text).toBe("更新条目");
  expect(container.querySelector('[data-surface-mode="tile"]')).not.toBeNull();
});

test.each([
  "[data-pad-note-title]",
  "textarea",
  "button",
  "button svg path",
  '[role="status"]',
  '[data-surface-resize-handle="true"]',
])("double-clicking %s preserves editing mode", async (selector) => {
  await editPinnedNote();
  await doubleClick(pad().querySelector(selector)!);
  expect(pad()).not.toBeNull();
  expect(saved).toHaveLength(0);
});

test("ordinary notepads do not become pinned on a whitespace double-click", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  await doubleClick(pad());
  expect(pad()).not.toBeNull();
});

test("only the textarea area below the last rendered line returns to reading", async () => {
  await editPinnedNote();
  const textarea = pad().querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!;
  vi.spyOn(textareaCaret, "getTextareaCaretPosition").mockReturnValue({ x: 30, y: 60 });
  await doubleClick(textarea, 0, 40);
  expect(pad()).not.toBeNull();
  await doubleClick(textarea, 0, 60);
  expect(pad()).not.toBeNull();
  await doubleClick(textarea, 0, 80);
  expect(container.querySelector('[data-surface-mode="tile"]')).not.toBeNull();
});

test("an empty body accepts a whitespace double-click and saves it", async () => {
  await editPinnedNote();
  const textarea = pad().querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!;
  type(textarea, "");
  await doubleClick(textarea);
  expect(saved[0].content).toBe("");
  expect(container.querySelector('[data-surface-mode="tile"]')).not.toBeNull();
});

test("recycled windows clear the previous note's pinned editing state", async () => {
  await editPinnedNote();
  await act(async () => emit("notepad:activate", "main"));
  await doubleClick(pad());
  expect(pad()).not.toBeNull();
  expect(saved).toHaveLength(0);
});

test("open-panel whitespace and right-button double-clicks do not switch mode", async () => {
  await editPinnedNote();
  await doubleClick(pad(), 2);
  expect(pad()).not.toBeNull();
  await act(async () => requestSurfaceAction("switchToOpen"));
  await doubleClick(pad());
  expect(pad().dataset.padMode).toBe("open");
});

test("save failure retains unsaved edits and allows another double-click to retry", async () => {
  await editPinnedNote();
  type(pad().querySelector("textarea")!, "未保存正文");
  saveFailure = true;
  await doubleClick(pad());
  expect(pad().querySelector<HTMLTextAreaElement>("textarea")?.value).toBe("未保存正文");
  expect(pad().querySelector('[role="status"]')?.textContent).toBe("保存失败");
  saveFailure = false;
  await doubleClick(pad());
  expect(container.querySelector('[data-surface-mode="tile"]')).not.toBeNull();
  expect(saved[0].content).toBe("未保存正文");
});

test("title-bar whitespace defers native dragging until the pointer moves", async () => {
  await editPinnedNote();
  const header = pad().querySelector('[role="status"]')!.parentElement!;
  act(() =>
    header.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0, screenX: 10, screenY: 10 }),
    ),
  );
  expect(commands).not.toContain("plugin:window|start_dragging");
  act(() =>
    window.dispatchEvent(new MouseEvent("mousemove", { buttons: 1, screenX: 12, screenY: 10 })),
  );
  expect(commands).not.toContain("start_window_drag_with_offset");
  await act(async () =>
    window.dispatchEvent(new MouseEvent("mousemove", { buttons: 1, screenX: 16, screenY: 10 })),
  );
  expect(commands).toContain("start_window_drag_with_offset");
  await doubleClick(header);
  expect(container.querySelector('[data-surface-mode="tile"]')).not.toBeNull();
});

test("notes pinned from a regular pad can return to reading mode after editing", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  await act(async () => requestSurfaceMode("tile"));
  await doubleClick(container.querySelector('[data-surface-mode="tile"]')!);
  await doubleClick(pad());
  expect(container.querySelector('[data-surface-mode="tile"]')).not.toBeNull();
  expect(saved).toHaveLength(0);
});
