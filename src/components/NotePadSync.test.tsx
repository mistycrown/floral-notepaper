// @vitest-environment jsdom
import { act, useState } from "react";
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
import * as toast from "./Toast";

let root: Root;
let container: HTMLDivElement;
let note: Note;
let saved: SaveNoteRequest[];
let backgroundTransparency: number | undefined;
let timestampInsertKind: "bullet" | "todo" | undefined;
let clipboardInsertKind: "bullet" | "todo" | undefined;
const readNote = vi.fn<() => Note | Promise<Note>>();
const readClipboard = vi.fn<() => string | Promise<string>>();
const confirmClipboard = vi.fn<() => string | Promise<string>>();
const writeClipboard = vi.fn<(value: string) => Promise<void>>();
const changeEdgeHide = vi.fn<() => null | Promise<null>>();
let clipboardDialogMessage: string;
let saveError: Error | undefined;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  saved = [];
  backgroundTransparency = undefined;
  timestampInsertKind = undefined;
  clipboardInsertKind = undefined;
  clipboardDialogMessage = "";
  saveError = undefined;
  readClipboard.mockReset().mockReturnValue("剪贴板文字");
  confirmClipboard.mockReset().mockReturnValue("追加");
  writeClipboard.mockReset().mockResolvedValue(undefined);
  changeEdgeHide.mockReset().mockReturnValue(null);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: writeClipboard },
  });
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
          timestampInsertKind,
          clipboardInsertKind,
        };
      if (command === "notes_list") return [{ ...note, preview: note.content }];
      if (command === "notes_get") return readNote();
      if (command === "set_tile_edge_hide") return changeEdgeHide();
      if (command === "plugin:clipboard-manager|read_text") return readClipboard();
      if (command === "plugin:dialog|message") {
        clipboardDialogMessage = (args as { message: string }).message;
        return confirmClipboard();
      }
      if (command === "notes_update") {
        if (saveError) throw saveError;
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
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "clipboard");
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

async function renderPinnedList() {
  const nodes = [
    { ...newOutlineNode("已有条目"), collapsed: true },
    { ...newOutlineNode("子待办", 1), kind: "todo" as const, checked: true },
  ];
  note = { ...note, noteType: "list", outlineNodes: nodes, content: outlineMarkdown(nodes) };
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  return container.querySelector<HTMLButtonElement>('button[title="从剪贴板追加条目"]')!;
}

test("pinned list appends clipboard text as one top-level item and immediately saves it", async () => {
  const button = await renderPinnedList();
  const previous = structuredClone(note.outlineNodes);
  readClipboard.mockReturnValue("第一行\r\n第二行\r第三行");
  expect(button.getAttribute("aria-label")).toBe("从剪贴板追加条目");
  await act(async () => button.click());
  expect(readClipboard).toHaveBeenCalledTimes(1);
  expect(writeClipboard).not.toHaveBeenCalled();
  expect(confirmClipboard).not.toHaveBeenCalled();
  expect(saved).toHaveLength(1);
  expect(saved[0].noteType).toBe("list");
  expect(saved[0].outlineNodes!.slice(0, 2)).toEqual(previous);
  expect(saved[0].outlineNodes).toHaveLength(3);
  expect(saved[0].outlineNodes![2]).toMatchObject({
    text: "第一行\n第二行\n第三行",
    depth: 0,
    kind: "bullet",
    checked: false,
    collapsed: false,
  });
  expect(saved[0].content).toBe("- 已有条目\n  - [x] 子待办\n- 第一行\n  第二行\n  第三行");
  expect(tile().textContent).toContain("第三行");
});

test.each(["字".repeat(100), "🌸".repeat(100)])(
  "100 characters append without confirmation",
  async (text) => {
    const button = await renderPinnedList();
    readClipboard.mockReturnValue(text);
    await act(async () => button.click());
    expect(confirmClipboard).not.toHaveBeenCalled();
    expect(saved[0].outlineNodes![2].text).toBe(text);
  },
);

test.each([true, false])("101 characters require confirmation (accepted: %s)", async (accepted) => {
  const button = await renderPinnedList();
  const original = structuredClone(note);
  readClipboard.mockReturnValue("字".repeat(101));
  confirmClipboard.mockReturnValue(accepted ? "追加" : "取消");
  await act(async () => button.click());
  expect(confirmClipboard).toHaveBeenCalledTimes(1);
  expect(clipboardDialogMessage).toContain("101 字");
  expect(clipboardDialogMessage).toContain("超过 100 字");
  expect(saved).toHaveLength(accepted ? 1 : 0);
  if (accepted) expect(saved[0].outlineNodes![2].text).toBe("字".repeat(101));
  else expect(note).toEqual(original);
  expect(button.disabled).toBe(false);
});

test.each(["", " \r\n\t "])("empty clipboard text shows a hint without appending", async (text) => {
  const showToast = vi.spyOn(toast, "showToast");
  const button = await renderPinnedList();
  readClipboard.mockReturnValue(text);
  await act(async () => button.click());
  expect(saved).toHaveLength(0);
  expect(confirmClipboard).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith("剪贴板中没有可追加的文字", "info");
  expect(button.disabled).toBe(false);
});

test("clipboard read failure leaves the note unchanged and allows retry", async () => {
  const showToast = vi.spyOn(toast, "showToast");
  const button = await renderPinnedList();
  readClipboard.mockRejectedValueOnce(new Error("剪贴板读取失败"));
  await act(async () => button.click());
  expect(saved).toHaveLength(0);
  expect(showToast).toHaveBeenCalledWith("剪贴板读取失败");
  expect(button.disabled).toBe(false);
  await act(async () => button.click());
  expect(saved).toHaveLength(1);
});

test("repeated clicks during confirmation append only one item", async () => {
  const button = await renderPinnedList();
  readClipboard.mockReturnValue("字".repeat(101));
  let resolveConfirm!: (value: string) => void;
  confirmClipboard.mockReturnValue(
    new Promise((resolve) => {
      resolveConfirm = resolve;
    }),
  );
  await act(async () => {
    button.click();
    button.click();
  });
  expect(button.disabled).toBe(true);
  expect(readClipboard).toHaveBeenCalledTimes(1);
  expect(confirmClipboard).toHaveBeenCalledTimes(1);
  expect(saved).toHaveLength(0);
  await act(async () => {
    resolveConfirm("追加");
  });
  expect(saved).toHaveLength(1);
  expect(saved[0].outlineNodes).toHaveLength(3);
  expect(button.disabled).toBe(false);
});

test("pending clipboard confirmation cannot write into a recycled note window", async () => {
  const button = await renderPinnedList();
  readClipboard.mockReturnValue("字".repeat(101));
  let resolveConfirm!: (value: string) => void;
  confirmClipboard.mockReturnValue(
    new Promise((resolve) => {
      resolveConfirm = resolve;
    }),
  );
  await act(async () => button.click());
  await act(async () => {
    await emit("notepad:activate", "main");
  });
  await act(async () => {
    resolveConfirm("追加");
  });
  expect(saved).toHaveLength(0);
});

test("closing the surface during clipboard confirmation prevents appending", async () => {
  const button = await renderPinnedList();
  readClipboard.mockReturnValue("字".repeat(101));
  let resolveConfirm!: (value: string) => void;
  confirmClipboard.mockReturnValue(
    new Promise((resolve) => {
      resolveConfirm = resolve;
    }),
  );
  await act(async () => button.click());
  await act(async () => root.render(null));
  await act(async () => {
    resolveConfirm("追加");
  });
  expect(saved).toHaveLength(0);
});

test("confirmation appends to the latest list after another window edits the note", async () => {
  const button = await renderPinnedList();
  readClipboard.mockReturnValue("字".repeat(101));
  let resolveConfirm!: (value: string) => void;
  confirmClipboard.mockReturnValue(
    new Promise((resolve) => {
      resolveConfirm = resolve;
    }),
  );
  await act(async () => button.click());
  const nodes = [...note.outlineNodes!, newOutlineNode("其他窗口追加")];
  note = { ...note, outlineNodes: nodes, content: outlineMarkdown(nodes) };
  await changed();
  await act(async () => {
    resolveConfirm("追加");
  });
  expect(saved).toHaveLength(1);
  expect(saved[0].outlineNodes).toHaveLength(4);
  expect(saved[0].outlineNodes![2].text).toBe("其他窗口追加");
  expect(saved[0].outlineNodes![3].text).toBe("字".repeat(101));
});

test("append save failure retains the new item for a manual retry", async () => {
  const showToast = vi.spyOn(toast, "showToast");
  const button = await renderPinnedList();
  saveError = new Error("保存追加条目失败");
  await act(async () => button.click());
  expect(showToast).toHaveBeenCalledWith("保存追加条目失败");
  expect(tile().textContent).toContain("剪贴板文字");
  expect(button.disabled).toBe(false);
  saveError = undefined;
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    );
  });
  expect(saved).toHaveLength(1);
  expect(saved[0].outlineNodes![2].text).toBe("剪贴板文字");
});

test("text note still copies its content from the bottom-right button", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[title="复制"]')!.click(),
  );
  expect(writeClipboard).toHaveBeenCalledWith("原始正文");
  expect(readClipboard).not.toHaveBeenCalled();
  expect(container.querySelector('button[title="已复制"]')).not.toBeNull();
});

test("timestamp button enters editing, appends one item, focuses its body and preserves it after saving", async () => {
  const clock = new Date(2026, 9, 12, 14, 30);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  await renderPinnedList();
  const previous = structuredClone(note.outlineNodes);
  const button = container.querySelector<HTMLButtonElement>('button[title="新建时间记录"]')!;
  expect(button).not.toBeNull();
  expect(container.querySelector('button[title="从剪贴板追加条目"]')).not.toBeNull();
  await act(async () => {
    button.click();
    button.click();
  });
  expect(container.querySelector('[data-surface-mode="tile"]')).toBeNull();
  expect(container.querySelector('[data-surface-mode="pad"]')).not.toBeNull();
  const inputs = container.querySelectorAll<HTMLTextAreaElement>("textarea[data-outline-node]");
  // The collapsed existing child stays folded; the appended top-level entry is visible.
  expect(inputs).toHaveLength(2);
  const body = inputs[1];
  expect(document.activeElement).toBe(body);
  // A delayed startup show must not move the caret back to the first item.
  while (frames.length) {
    await act(async () => frames.shift()!(performance.now()));
  }
  expect(document.activeElement).toBe(body);
  expect(body.value).toBe("");
  expect(body.selectionStart).toBe(0);
  expect(container.querySelector("time")?.textContent).toBe("10-12 14:30");
  expect(saved).toHaveLength(0);
  type(body, "会议记录\n下一步");
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    );
  });
  expect(saved).toHaveLength(1);
  expect(saved[0].outlineNodes!.slice(0, 2)).toEqual(previous);
  expect(saved[0].outlineNodes).toHaveLength(3);
  expect(saved[0].outlineNodes![2].text).toBe("[2026-10-12 14:30] 会议记录\n下一步");
  await act(async () => requestSurfaceMode("tile"));
  expect(tile().querySelector("time")?.textContent).toBe("10-12 14:30");
  expect(tile().textContent).toContain("会议记录");
});

test("text notes do not expose the timestamp entry button", async () => {
  await act(async () => root.render(<NotePad initialNoteId={note.id} initialSurfaceMode="tile" />));
  expect(container.querySelector('button[title="新建时间记录"]')).toBeNull();
});

test("timestamp button is disabled while clipboard confirmation is pending", async () => {
  const clipboardButton = await renderPinnedList();
  readClipboard.mockReturnValue("字".repeat(101));
  let resolveConfirm!: (value: string) => void;
  confirmClipboard.mockReturnValue(
    new Promise((resolve) => {
      resolveConfirm = resolve;
    }),
  );
  await act(async () => clipboardButton.click());
  const timestampButton = container.querySelector<HTMLButtonElement>(
    'button[title="新建时间记录"]',
  )!;
  expect(timestampButton.disabled).toBe(true);
  await act(async () => {
    resolveConfirm("取消");
  });
  expect(timestampButton.disabled).toBe(false);
});

test("timestamp creation is cancelled when a pooled window activates another note", async () => {
  await renderPinnedList();
  let finishSwitch!: (value: null) => void;
  changeEdgeHide.mockReturnValueOnce(
    new Promise((resolve) => {
      finishSwitch = resolve;
    }),
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[title="新建时间记录"]')!.click(),
  );
  await act(async () => {
    await emit("notepad:activate", "main");
  });
  await act(async () => {
    finishSwitch(null);
  });
  expect(container.querySelector("time")).toBeNull();
  expect(container.querySelector("textarea[data-outline-node]")).toBeNull();
  expect(saved).toHaveLength(0);
});

test("failed edit-mode transition does not append a timestamp and can be retried", async () => {
  const showToast = vi.spyOn(toast, "showToast");
  await renderPinnedList();
  changeEdgeHide.mockRejectedValueOnce(new Error("切换编辑模式失败"));
  const button = container.querySelector<HTMLButtonElement>('button[title="新建时间记录"]')!;
  await act(async () => button.click());
  expect(showToast).toHaveBeenCalledWith("切换编辑模式失败");
  expect(tile().querySelector("time")).toBeNull();
  expect(button.disabled).toBe(false);
  await act(async () => button.click());
  expect(container.querySelector("time")).not.toBeNull();
  expect(document.activeElement).toBe(container.querySelectorAll("textarea[data-outline-node]")[1]);
});

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

test.each(["bullet", "todo"] as const)(
  "quick insert actions load their persisted %s defaults",
  async (kind) => {
    timestampInsertKind = kind;
    clipboardInsertKind = kind;
    const clipboardButton = await renderPinnedList();
    await act(async () => clipboardButton.click());
    expect(saved[0].outlineNodes![2]).toMatchObject({ kind, checked: false, depth: 0 });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('button[title="新建时间记录"]')!.click(),
    );
    const body = container.querySelectorAll<HTMLTextAreaElement>("textarea[data-outline-node]")[2];
    expect(document.activeElement).toBe(body);
    type(body, "记录正文");
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
      ),
    );
    expect(saved[1].outlineNodes![3]).toMatchObject({ kind, checked: false, depth: 0 });
  },
);

test("settings independently change both quick insert defaults for an already-open pinned note", async () => {
  const nodes = [newOutlineNode("已有条目")];
  note = { ...note, noteType: "list", outlineNodes: nodes, content: outlineMarkdown(nodes) };
  const initialConfig = await getConfig();
  const onChange = vi.fn();
  function Harness() {
    const [config, setConfig] = useState(initialConfig);
    return (
      <>
        <SettingsPanel
          config={config}
          onChange={(next) => {
            onChange(next);
            setConfig(next);
            void emit("config-changed", next);
          }}
          onMigrateDataDir={() => {}}
          onClose={() => {}}
        />
        <NotePad initialNoteId={note.id} initialSurfaceMode="tile" />
      </>
    );
  }
  await act(async () => root.render(<Harness />));
  const timestamp = container.querySelector<HTMLSelectElement>(
    'select[aria-label="时间记录默认类型"]',
  )!;
  const clipboard = container.querySelector<HTMLSelectElement>(
    'select[aria-label="剪贴板追加默认类型"]',
  )!;
  expect(timestamp.value).toBe("bullet");
  expect(clipboard.value).toBe("bullet");
  const change = async (select: HTMLSelectElement, value: string) =>
    act(async () => {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await change(clipboard, "todo");
  await change(timestamp, "todo");
  expect(onChange).toHaveBeenLastCalledWith({
    ...initialConfig,
    clipboardInsertKind: "todo",
    timestampInsertKind: "todo",
  });
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[title="从剪贴板追加条目"]')!.click(),
  );
  expect(saved[0].outlineNodes![1]).toMatchObject({ kind: "todo", checked: false });
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[title="新建时间记录"]')!.click(),
  );
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    ),
  );
  expect(saved[1].outlineNodes![2]).toMatchObject({ kind: "todo", checked: false });
  await change(timestamp, "bullet");
  expect(clipboard.value).toBe("todo");
  await act(async () => requestSurfaceMode("tile"));
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[title="新建时间记录"]')!.click(),
  );
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    ),
  );
  expect(saved[2].outlineNodes![3]).toMatchObject({ kind: "bullet", checked: false });
  expect(saved[2].outlineNodes![1].kind).toBe("todo");
});
