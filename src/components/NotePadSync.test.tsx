// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MainWindow } from "./MainWindow";
import { NotePad } from "./NotePad";
import { SettingsPanel } from "./SettingsPanel";
import { getConfig } from "../features/settings/api";
import { requestSurfaceMode } from "../features/windows/surfaceMode";
import { newOutlineNode, outlineMarkdown } from "../features/notes/outline";
import type { Note, SaveNoteRequest } from "../features/notes/types";

let root: Root;
let container: HTMLDivElement;
let note: Note;
let saved: SaveNoteRequest[];
let backgroundTransparency: number | undefined;
const readNote = vi.fn<() => Note | Promise<Note>>();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  saved = [];
  backgroundTransparency = undefined;
  note = {
    id: "pinned-note",
    title: "原始标题",
    content: "原始正文",
    category: "",
    fileName: "pinned.md",
    createdAt: "2026-10-12T00:00:00Z",
    updatedAt: "2026-10-12T00:00:00Z",
    wordCount: 4,
    noteType: "text",
  };
  readNote.mockReset().mockImplementation(() => structuredClone(note));
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
          tileBackgroundTransparency: backgroundTransparency,
          tileColorPresets: [],
          fontSize: 14,
          surfaceFontSize: 14,
        };
      if (command === "notes_list") return [{ ...note, preview: note.content }];
      if (command === "notes_get") return readNote();
      if (command === "notes_update") {
        const request = structuredClone((args as { request: SaveNoteRequest }).request);
        saved.push(request);
        note = { ...note, ...request };
        // Match the backend: the event arrives before the save command resolves.
        await emit("notes-changed");
        return structuredClone(note);
      }
      if (command === "categories_list") return [];
      if (command === "fonts_list") return [];
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

function type(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function changed() {
  await act(async () => {
    await emit("notes-changed");
  });
}

function tile() {
  return container.querySelector<HTMLElement>('[data-surface-mode="tile"]')!;
}

test("saving title and body in the main window updates the pinned tile", async () => {
  await act(async () =>
    root.render(
      <>
        <div data-main-editor>
          <MainWindow />
        </div>
        <NotePad initialNoteId={note.id} initialSurfaceMode="tile" />
      </>,
    ),
  );
  const main = container.querySelector<HTMLElement>("[data-main-editor]")!;
  type(main.querySelector<HTMLInputElement>('input[placeholder="无标题笔记"]')!, "新标题");
  type(main.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!, "新正文 #工作");
  await act(async () => main.querySelector<HTMLButtonElement>('button[title="保存"]')!.click());
  expect(saved).toHaveLength(1);
  expect(tile().textContent).toContain("新标题");
  expect(tile().textContent).toContain("新正文 #工作");
  expect(tile().textContent).not.toContain("原始正文");
  expect(tile().dataset.noteId).toBe(note.id);
});

test("pinned tiles reload list nodes, task states, folds, and note type changes", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  const nodes = [
    { ...newOutlineNode("已完成"), kind: "todo" as const, checked: true, collapsed: true },
    newOutlineNode("折叠子项", 1),
  ];
  note = { ...note, noteType: "list", outlineNodes: nodes, content: outlineMarkdown(nodes) };
  await changed();
  expect(tile().querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  expect(tile().textContent).toContain("已完成");
  expect(tile().textContent).not.toContain("折叠子项");
  note = { ...note, outlineNodes: nodes.map((node) => ({ ...node, collapsed: false })) };
  await changed();
  expect(tile().textContent).toContain("折叠子项");
  note = { ...note, noteType: "text", outlineNodes: [], content: "恢复正文" };
  await changed();
  expect(tile().querySelector("[data-outline-editor]")).toBeNull();
  expect(tile().textContent).toContain("恢复正文");
});

test("external saves preserve unsaved local edits", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  const textarea = container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!;
  type(textarea, "小窗未保存的修改");
  note = { ...note, title: "主窗口标题", content: "主窗口保存的内容" };
  await changed();
  expect(textarea.value).toBe("小窗未保存的修改");
  expect(container.querySelector('[role="status"]')?.textContent).toBe("未保存");
});

test("local edits made during a reload are preserved", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  let resolveRead!: (value: Note) => void;
  readNote.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  await changed();
  const textarea = container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!;
  type(textarea, "加载期间的新修改");
  await act(async () => resolveRead({ ...note, content: "旧快照" }));
  expect(textarea.value).toBe("加载期间的新修改");
});

test("a delayed older reload cannot overwrite the newest saved content", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  let resolveRead!: (value: Note) => void;
  const older = { ...note, content: "较早保存" };
  readNote.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  await changed();
  note = { ...note, content: "最新保存" };
  await changed();
  await act(async () => resolveRead(older));
  expect(tile().textContent).toContain("最新保存");
  expect(tile().textContent).not.toContain("较早保存");
});

test("the notepad's own save event leaves it saved and does not trigger another write", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  type(container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")!, "小窗已保存");
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    );
  });
  expect(saved).toHaveLength(1);
  expect(container.querySelector('[role="status"]')?.textContent).toBe("已保存");
  expect(container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")?.value).toBe(
    "小窗已保存",
  );
});

test("a failed reload retains the displayed note and later changes retry it", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  readNote.mockRejectedValueOnce(new Error("read failed"));
  note = { ...note, content: "重新同步" };
  await changed();
  expect(tile().textContent).toContain("原始正文");
  await changed();
  expect(tile().textContent).toContain("重新同步");
});

test("reactivating a pooled window discards a pending reload of its previous note", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} />));
  let resolveRead!: (value: Note) => void;
  readNote.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  await changed();
  await act(async () => {
    await emit("notepad:activate", "main");
  });
  await act(async () => resolveRead({ ...note, content: "上一篇便签" }));
  expect(container.querySelector<HTMLTextAreaElement>("textarea[data-tab-indent]")?.value).toBe("");
  expect(container.querySelector('[role="status"]')?.textContent).toBe("空");
});

test("pinned background transparency loads at startup, updates live, and stays out of pad mode", async () => {
  backgroundTransparency = 40;
  note.tileColor = "#284563";
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  expect(tile().style.backgroundColor).toBe("rgba(40, 69, 99, 0.6)");
  expect(tile().style.opacity).toBe("");
  expect(tile().style.getPropertyValue("--color-ink")).toBe("#ffffff");
  await act(async () => {
    await emit("config-changed", { tileBackgroundTransparency: 70 });
  });
  expect(tile().style.backgroundColor).toBe("rgba(40, 69, 99, 0.3)");
  await act(async () => {
    await emit("config-changed", { surfaceFontSize: 16 });
  });
  expect(tile().style.backgroundColor).toBe("rgba(40, 69, 99, 0.3)");
  await act(async () => requestSurfaceMode("pad"));
  const pad = container.querySelector<HTMLElement>('[data-surface-mode="pad"]')!;
  expect(pad.style.backgroundColor).toBe("");
  expect(pad.style.opacity).toBe("");
});

test("the settings slider changes pinned backgrounds immediately and defaults to opaque for old config", async () => {
  const config = await getConfig();
  const onChange = vi.fn((next: typeof config) => {
    void emit("config-changed", next);
  });
  await act(async () =>
    root.render(
      <>
        <SettingsPanel
          config={config}
          onChange={onChange}
          onMigrateDataDir={() => {}}
          onClose={() => {}}
        />
        <NotePad initialNoteId={note.id} initialSurfaceMode="tile" />
      </>,
    ),
  );
  const slider = container.querySelector<HTMLInputElement>(
    'input[aria-label="钉选便签背景透明度"]',
  )!;
  expect(slider.value).toBe("0");
  expect(slider.min).toBe("0");
  expect(slider.max).toBe("80");
  expect(tile().style.backgroundColor).toBe("rgb(246, 243, 236)");
  await act(async () => type(slider, "60"));
  expect(onChange).toHaveBeenCalledWith({ ...config, tileBackgroundTransparency: 60 });
  expect(tile().style.backgroundColor).toBe("rgba(246, 243, 236, 0.4)");
  expect(tile().style.opacity).toBe("");
});
