// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MainWindow } from "./MainWindow";
import { NotePad } from "./NotePad";
import { newOutlineNode } from "../features/notes/outline";
import { emit } from "@tauri-apps/api/event";
import type { Note, SaveNoteRequest } from "../features/notes/types";

let root: Root;
let container: HTMLDivElement;
let note: Note;
let saved: SaveNoteRequest[];
let holdSave: Promise<void> | undefined;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  saved = [];
  holdSave = undefined;
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
    async (command, args) => {
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
      if (command === "notes_get")
        return structuredClone(
          (args as { id: string }).id === "tag-bank"
            ? { ...note, id: "tag-bank", tags: ["工作", "读书"] }
            : note,
        );
      if (command === "notes_update" || command === "notes_create") {
        const request = structuredClone((args as { request: SaveNoteRequest }).request);
        saved.push(request);
        await holdSave;
        note = {
          ...note,
          ...request,
          ...(command === "notes_create" ? { tags: request.tags ?? [] } : {}),
        };
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

function type(element: HTMLTextAreaElement | HTMLInputElement, text: string) {
  act(() => {
    element.focus();
    Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(element, text);
    element.setSelectionRange(text.length, text.length);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function key(
  element: HTMLTextAreaElement | HTMLInputElement,
  key: string,
  options: KeyboardEventInit = {},
) {
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

test.each(["main"])(
  "%s edits metadata tags with suggestions without changing the body",
  async (surface) => {
    await act(async () =>
      root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
    );
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!;
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    type(input, "工");
    expect(document.querySelector('[role="option"]')?.textContent).toBe("#工作");
    key(input, "ArrowDown");
    key(input, "Enter");
    expect(textarea.value).toBe("正文");
    await save();
    expect(saved[saved.length - 1].tags).toEqual(["工作"]);
    expect(saved[saved.length - 1].content).toBe("正文");
    expect(saved[saved.length - 1].category).toBe("");
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="移除标签 工作"]')!.click());
    type(textarea, "正文 #工作");
    expect(document.querySelector('[role="option"]')).toBeNull();
    await save();
    expect(saved[saved.length - 1].tags).toEqual([]);
    expect(saved[saved.length - 1].content).toBe("正文 #工作");
  },
);

test.each(["main", "pad"])(
  "%s outline Enter creates a node without completing body hashtags",
  async (surface) => {
    note.noteType = "list";
    note.outlineNodes = [newOutlineNode("#工")];
    note.content = "- #工";
    await act(async () =>
      root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
    );
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea[data-outline-node]")!;
    type(textarea, "#工");
    expect(document.querySelector('[role="option"]')).toBeNull();
    key(textarea, "Enter");
    expect(container.querySelectorAll("textarea[data-outline-node]")).toHaveLength(2);
    expect(textarea.value).toBe("#工");
    await save();
    expect(saved[saved.length - 1].outlineNodes?.[0].text).toBe("#工");
    expect(saved[saved.length - 1].tags).toEqual(surface === "main" ? [] : undefined);
  },
);

test.each(["main"])("%s includes a typed tag in Ctrl+S", async (surface) => {
  await act(async () =>
    root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
  );
  const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  type(input, "新标签");
  await act(async () => key(input, "s", { ctrlKey: true }));
  expect(saved[saved.length - 1]?.tags).toEqual(["新标签"]);
  expect(saved[saved.length - 1]?.content).toBe("正文");
});

test.each(["main"])("%s keeps new tag edits dirty while a save is pending", async (surface) => {
  await act(async () =>
    root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
  );
  const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  type(input, "第一");
  key(input, "Enter");
  let release!: () => void;
  holdSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  await save();
  expect(saved[saved.length - 1]?.tags).toEqual(["第一"]);
  type(input, "第二");
  key(input, "Enter");
  await act(async () => {
    release();
    await Promise.resolve();
  });
  expect(container.textContent).toContain("未保存");
  holdSave = undefined;
  await save();
  expect(saved[saved.length - 1]?.tags).toEqual(["第一", "第二"]);
});

test.each(["main"])("%s synchronizes saved metadata tags from another window", async (surface) => {
  await act(async () =>
    root.render(surface === "main" ? <MainWindow /> : <NotePad initialNoteId={note.id} />),
  );
  note = { ...note, tags: ["同步标签"] };
  await act(async () => {
    await emit("notes-changed");
  });
  expect(container.querySelector('[aria-label="移除标签 同步标签"]')).not.toBeNull();
  await save();
  expect(saved[saved.length - 1]?.tags).toEqual(["同步标签"]);
});

test("switching notes saves old tags and replaces the editor's metadata", async () => {
  await act(async () => root.render(<MainWindow />));
  type(container.querySelector<HTMLInputElement>('[role="combobox"]')!, "自己的标签");
  key(container.querySelector<HTMLInputElement>('[role="combobox"]')!, "Enter");
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[data-note-card="tag-bank"]')!.click(),
  );
  expect(saved[saved.length - 1]?.tags).toEqual(["自己的标签"]);
  expect(container.querySelector('[aria-label="移除标签 自己的标签"]')).toBeNull();
  expect(container.querySelector('[aria-label="移除标签 工作"]')).not.toBeNull();
  await save();
  expect(saved[saved.length - 1]?.tags).toEqual(["工作", "读书"]);
});

test.each(["text", "list"] as const)(
  "small %s window shows only a header title and preserves metadata on save",
  async (noteType) => {
    note.tags = ["元数据标签"];
    note.noteType = noteType;
    if (noteType === "list") {
      note.outlineNodes = [newOutlineNode("正文")];
      note.content = "- 正文";
    }
    await act(async () => root.render(<NotePad initialNoteId={note.id} />));
    expect(container.querySelector("[data-pad-note-title]")?.textContent).toBe("正文便签");
    expect(container.querySelector('[role="status"]')?.className).toBe("sr-only");
    expect(container.querySelector('[role="combobox"]')).toBeNull();
    expect(container.querySelector('select[aria-label="便签类型"]')).toBeNull();
    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(container.textContent).not.toContain("元数据标签");
    const textarea = container.querySelector<HTMLTextAreaElement>(
      noteType === "list" ? "textarea[data-outline-node]" : "textarea[data-tab-indent]",
    )!;
    type(textarea, "修改正文 #正文标签");
    await save();
    expect(saved[saved.length - 1]).not.toHaveProperty("tags");
    expect(note.tags).toEqual(["元数据标签"]);
    expect(saved[saved.length - 1].title).toBe("正文便签");
    expect(saved[saved.length - 1].noteType).toBe(noteType);
  },
);

test("small-window saves cannot overwrite tags changed in the main window", async () => {
  note.tags = ["旧标签"];
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  type(
    container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!,
    "小窗正在编辑的正文",
  );
  note = { ...note, tags: ["主窗口的新标签"] };
  await act(async () => {
    await emit("notes-changed");
  });
  await save();
  expect(saved[saved.length - 1]).not.toHaveProperty("tags");
  expect(note.tags).toEqual(["主窗口的新标签"]);
});

test("pooled small-window activation resets its header and creates an untagged draft", async () => {
  note.tags = ["旧标签"];
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  await act(async () => {
    await emit("notepad:activate", "main");
  });
  expect(container.querySelector("[data-pad-note-title]")?.textContent).toBe("无标题笔记");
  expect(container.querySelector('[role="combobox"]')).toBeNull();
  type(container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!, "新正文");
  await save();
  expect(saved[saved.length - 1]).not.toHaveProperty("tags");
  expect(saved[saved.length - 1]?.title).toBe("");
  expect(saved[saved.length - 1]?.content).toBe("新正文");
  expect(note.tags).toEqual([]);
});
