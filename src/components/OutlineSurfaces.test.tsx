// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { afterEach, beforeEach, expect, test } from "vitest";
import { MainWindow } from "./MainWindow";
import { NotePad } from "./NotePad";
import { newOutlineNode, outlineMarkdown } from "../features/notes/outline";
import type { Note, SaveNoteRequest } from "../features/notes/types";

let root: Root;
let container: HTMLDivElement;
let saved: SaveNoteRequest[];
let note: Note;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  saved = [];
  const nodes = [
    newOutlineNode("中文项目"),
    { ...newOutlineNode("待办", 1), kind: "todo" as const },
  ];
  note = {
    id: "outline-demo",
    title: "大纲便签",
    category: "",
    fileName: "demo.md",
    createdAt: "2026-10-11T00:00:00Z",
    updatedAt: "2026-10-11T00:00:00Z",
    wordCount: 6,
    content: outlineMarkdown(nodes),
    noteType: "list",
    outlineNodes: nodes,
  };
  mockWindows("main");
  mockIPC(
    (command, args) => {
      if (command === "config_get")
        return {
          locale: "zh-CN",
          defaultViewMode: "edit",
          dataDir: "",
          noteAutoSave: false,
          noteSurfaceAutoSave: false,
          tileColor: "#f6f3ec",
          tileColorMode: "custom",
          tileColorPresets: [],
          fontSize: 14,
          surfaceFontSize: 14,
        };
      if (command === "notes_list") return [{ ...note, preview: note.content }];
      if (command === "notes_get") return structuredClone(note);
      if (command === "notes_update" || command === "notes_create") {
        const request = structuredClone((args as { request: SaveNoteRequest }).request);
        saved.push(request);
        note = { ...note, ...request };
        return structuredClone(note);
      }
      if (command === "categories_list") return [];
      if (command === "images_get_base_dir") return "";
      if (command === "update_status")
        return { status: "idle", currentVersion: "1.2.0", channel: "stable" };
      if (command === "plugin:window|is_maximized") return false;
      return null;
    },
    { shouldMockEvents: true },
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  clearMocks();
});

async function save() {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
}

test("main editor saves fold-only changes and type conversion through its actual save queue", async () => {
  await act(async () => root.render(<MainWindow />));
  expect(container.querySelectorAll("textarea[data-outline-node]")).toHaveLength(2);
  const content = note.content;
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>("[data-outline-editor] button[aria-expanded]")!
      .click(),
  );
  await save();
  expect(saved[0].content).toBe(content);
  expect(saved[0].noteType).toBe("list");
  expect(saved[0].outlineNodes![0].collapsed).toBe(true);
  const select = container.querySelector<HTMLSelectElement>('select[aria-label="便签类型"]')!;
  await act(async () => {
    select.value = "text";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await save();
  expect(saved[1].noteType).toBe("text");
  expect(saved[1].outlineNodes).toEqual([]);
  expect(saved[1].content).toBe(content);
});

test("small notepad saves node type and task completion through its actual save queue", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  expect(container.querySelectorAll("textarea[data-outline-node]")).toHaveLength(2);
  await act(async () => {
    const target = container.querySelector<HTMLTextAreaElement>("textarea[data-outline-node]")!;
    target.focus();
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await act(async () =>
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  await save();
  expect(saved[0].noteType).toBe("list");
  expect(saved[0].outlineNodes![0].kind).toBe("todo");
  expect(saved[0].outlineNodes![0].checked).toBe(true);
  expect(saved[0].content).toBe("- [x] 中文项目\n  - [ ] 待办");
});
