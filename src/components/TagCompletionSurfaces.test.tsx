// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MainWindow } from "./MainWindow";
import { NotePad } from "./NotePad";
import { newOutlineNode } from "../features/notes/outline";
import type { Note, SaveNoteRequest } from "../features/notes/types";

let root: Root;
let container: HTMLDivElement;
let note: Note;
let saved: SaveNoteRequest[];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  saved = [];
  note = {
    id: "draft",
    title: "正文便签",
    category: "",
    fileName: "draft.md",
    noteType: "text",
    content: "正文",
    createdAt: "2026-10-11T00:00:00Z",
    updatedAt: "2026-10-11T00:00:00Z",
    wordCount: 2,
    tags: [],
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
      if (command === "notes_list")
        return [
          { ...note, preview: note.content },
          {
            ...note,
            id: "tag-bank",
            title: "已有标签",
            preview: "#工作 #读书",
            tags: ["工作", "读书"],
          },
        ];
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
  vi.unstubAllGlobals();
});

function type(element: HTMLTextAreaElement, text: string) {
  act(() => {
    element.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      element,
      text,
    );
    element.setSelectionRange(text.length, text.length);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function key(element: HTMLTextAreaElement, key: string, options: KeyboardEventInit = {}) {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options }),
    );
  });
}
async function save() {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
}

test.each(["main", "pad"])(
  "%s textarea suggests saved tags and saves the completed content",
  async (surface) => {
    await act(async () =>
      root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
    );
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!;
    type(textarea, "正文 #工");
    expect(document.querySelector('[role="option"]')?.textContent).toBe("#工作");
    key(textarea, "Enter");
    expect(textarea.value).toBe("正文 #工作 ");
    await save();
    expect(saved[saved.length - 1].content).toBe("正文 #工作 ");
    expect(saved[saved.length - 1].category).toBe("");
  },
);

test.each(["main", "pad"])(
  "%s outline completes tags without creating a node and supports undo",
  async (surface) => {
    note.noteType = "list";
    note.outlineNodes = [newOutlineNode("#工")];
    note.content = "- #工";
    await act(async () =>
      root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
    );
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea[data-outline-node]")!;
    type(textarea, "#工");
    expect(document.querySelector('[role="option"]')?.textContent).toBe("#工作");
    key(textarea, "Enter");
    expect(container.querySelectorAll("textarea[data-outline-node]")).toHaveLength(1);
    expect(textarea.value).toBe("#工作 ");
    await save();
    expect(saved[saved.length - 1].outlineNodes?.[0].text).toBe("#工作 ");
    key(textarea, "z", { ctrlKey: true });
    expect(textarea.value).toBe("#工");
  },
);
