// @vitest-environment jsdom
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { ContextMenuProvider } from "./ContextMenu";
import { OutlineEditor, type OutlineEditorHandle } from "./OutlineEditor";
import { newOutlineNode, outlineMarkdown } from "../features/notes/outline";
import type { OutlineNode } from "../features/notes/types";
import { newTimestampOutlineNode } from "../features/notes/outlineTimestamp";
import { requestOutlineSelection } from "../features/notes/outlineSelectionActions";

let container: HTMLDivElement;
let root: Root;
let latest: OutlineNode[];
const editor = createRef<OutlineEditorHandle>();
const clipboardWrite = vi.fn();

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  clipboardWrite.mockReset();
  mockIPC(
    (command, args) => {
      if (command === "plugin:clipboard-manager|write_text")
        clipboardWrite((args as { text: string }).text);
      return {};
    },
    { shouldMockEvents: true },
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  clearMocks();
});

function mount(nodes: OutlineNode[], readOnly = false, withMenu = false) {
  function Harness() {
    const [value, setValue] = useState(nodes);
    latest = value;
    const content = (
      <OutlineEditor ref={editor} nodes={value} onChange={setValue} readOnly={readOnly} />
    );
    return withMenu ? <ContextMenuProvider>{content}</ContextMenuProvider> : content;
  }
  act(() => root.render(<Harness />));
}

function input(index = 0): HTMLTextAreaElement {
  return container.querySelectorAll("textarea")[index];
}
function key(element: HTMLTextAreaElement, value: string, options: KeyboardEventInit = {}) {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options }),
    );
  });
}
function type(element: HTMLTextAreaElement, text: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      element,
      text,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("node type conversion and completion preserve Chinese text and children; undo restores them", () => {
  mount([newOutlineNode("中文项目"), newOutlineNode("子节点", 1)]);
  input().focus();
  key(input(), "T", { ctrlKey: true, shiftKey: true });
  expect(latest[0].kind).toBe("todo");
  act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(latest[0].checked).toBe(true);
  expect(latest.map((node) => node.text)).toEqual(["中文项目", "子节点"]);
  expect(outlineMarkdown(latest)).toBe("- [x] 中文项目\n  - 子节点");
  act(() => editor.current!.undo());
  expect(latest[0].checked).toBe(false);
  act(() => editor.current!.undo());
  expect(latest[0].kind).toBe("bullet");
  act(() => editor.current!.redo());
  expect(latest[0].kind).toBe("todo");
});

test("IME confirmation does not create a node; normal Enter splits at the caret and focuses the new item", () => {
  mount([newOutlineNode("中文输入")]);
  input().focus();
  input().setSelectionRange(2, 2);
  key(input(), "Enter", { isComposing: true });
  expect(latest).toHaveLength(1);
  key(input(), "Enter");
  expect(latest.map((node) => node.text)).toEqual(["中文", "输入"]);
  expect(document.activeElement).toBe(input(1));
  key(input(1), "z", { ctrlKey: true });
  expect(latest.map((node) => node.text)).toEqual(["中文输入"]);
});

test("Tab carries descendants; Shift+Tab restores hierarchy and folding can be undone", () => {
  mount([newOutlineNode("父项"), newOutlineNode("当前项"), newOutlineNode("子项", 1)]);
  input(1).focus();
  key(input(1), "Tab");
  expect(latest.map((node) => node.depth)).toEqual([0, 1, 2]);
  key(input(1), "Tab", { shiftKey: true });
  expect(latest.map((node) => node.depth)).toEqual([0, 0, 1]);
  const fold = container.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")[0];
  act(() => fold.click());
  expect(container.querySelectorAll("textarea")).toHaveLength(2);
  act(() => editor.current!.undo());
  expect(container.querySelectorAll("textarea")).toHaveLength(3);
});

test("multiline editing and Backspace merge keep node content; undo works for text edits", () => {
  mount([newOutlineNode("第一项"), newOutlineNode("第二项")]);
  type(input(), "第一项\n中文说明");
  expect(latest[0].text).toBe("第一项\n中文说明");
  input(1).focus();
  input(1).setSelectionRange(0, 0);
  key(input(1), "Backspace");
  expect(latest).toHaveLength(1);
  expect(latest[0].text).toBe("第一项\n中文说明第二项");
  act(() => editor.current!.undo());
  expect(latest).toHaveLength(2);
  act(() => editor.current!.undo());
  expect(latest[0].text).toBe("第一项");
});

test("multiline paste creates outline nodes with todo types and retains nested hierarchy", () => {
  mount([newOutlineNode("起点")]);
  input().setSelectionRange(2, 2);
  act(() => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "- 第一项\n  - [ ] 嵌套待办\n- [x] 完成项" },
    });
    input().dispatchEvent(event);
  });
  expect(latest.map((node) => [node.text, node.depth, node.kind, node.checked])).toEqual([
    ["起点第一项", 0, "bullet", false],
    ["嵌套待办", 1, "todo", false],
    ["完成项", 0, "todo", true],
  ]);
  expect(document.activeElement).toBe(input(2));
});

test("pinned preview supports task completion without node menus or fold buttons", () => {
  mount([newOutlineNode("项目"), { ...newOutlineNode("待办", 1), kind: "todo" }], true);
  expect(container.querySelector("textarea")).toBeNull();
  expect(container.querySelector("button")).toBeNull();
  expect(container.querySelector("select")).toBeNull();
  expect(container.textContent).toContain("待办");
  act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(latest[1].checked).toBe(true);
});

test("editor removes the hint and per-row dropdowns; Mac shortcut toggles node type", () => {
  mount([newOutlineNode("中文条目")]);
  expect(container.textContent).not.toContain("Enter");
  expect(container.querySelector("select")).toBeNull();
  input().focus();
  input().setSelectionRange(2, 2);
  key(input(), "t", { metaKey: true, shiftKey: true });
  expect(latest[0].kind).toBe("todo");
  expect(input().selectionStart).toBe(2);
  key(input(), "t", { metaKey: true, shiftKey: true });
  expect(latest[0].kind).toBe("bullet");
});

test("right-click menu converts a node while keeping clipboard commands and undo", async () => {
  mount([newOutlineNode("中文项目"), newOutlineNode("子项", 1)], false, true);
  await act(async () => {
    input().dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 50 }),
    );
  });
  const action = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("转换为待办"),
  )!;
  expect(action).toBeDefined();
  expect(container.textContent).toContain("粘贴");
  expect(container.textContent).not.toContain("插入待办列表");
  await act(async () => action.click());
  expect(latest[0].kind).toBe("todo");
  expect(latest.map((node) => node.text)).toEqual(["中文项目", "子项"]);
  expect(latest[1].depth).toBe(1);
  act(() => editor.current!.undo());
  expect(latest[0].kind).toBe("bullet");
});

test("timestamp is a separate time badge in both editor and pinned preview", () => {
  const node = newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30));
  node.text += "时间记录正文";
  mount([node]);
  expect(container.querySelector("time")?.dateTime).toBe("2026-10-12T14:30");
  expect(container.querySelector("time")?.textContent).toBe("10-12 14:30");
  expect(container.querySelector("time")?.title).toBe("2026-10-12 14:30");
  expect(container.querySelector("time")?.parentElement).toBe(input().parentElement);
  expect(input().value).toBe("时间记录正文");
  act(() => editor.current!.focusNode(node.id));
  expect(document.activeElement).toBe(input());
  mount([node], true);
  expect(container.querySelector("time")?.textContent).toBe("10-12 14:30");
  expect(container.querySelector("time")?.parentElement?.textContent).toContain("时间记录正文");
  expect(container.textContent).toContain("时间记录正文");
  expect(container.querySelector("textarea")).toBeNull();
});

test("typing and undo retain timestamp; Enter splits only the editable body", () => {
  const node = newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30));
  mount([node]);
  type(input(), "第一段第二段");
  expect(latest[0].text).toBe("[2026-10-12 14:30] 第一段第二段");
  input().setSelectionRange(3, 3);
  key(input(), "Enter");
  expect(latest.map((item) => item.text)).toEqual(["[2026-10-12 14:30] 第一段", "第二段"]);
  expect(document.activeElement).toBe(input(1));
  act(() => editor.current!.undo());
  expect(input().value).toBe("第一段第二段");
  act(() => editor.current!.undo());
  expect(input().value).toBe("");
  expect(container.querySelector("time")).not.toBeNull();
});

test("multiline paste and merge use body cursor offsets without corrupting the timestamp", () => {
  const node = newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30));
  node.text += "前后";
  mount([node]);
  input().setSelectionRange(1, 1);
  act(() => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { getData: () => "甲\n乙" } });
    input().dispatchEvent(event);
  });
  expect(latest.map((item) => item.text)).toEqual(["[2026-10-12 14:30] 前甲", "乙后"]);
  expect(input(1).selectionStart).toBe(2);
  input(1).setSelectionRange(0, 0);
  key(input(1), "Backspace");
  expect(input().value).toBe("前甲乙后");
  expect(input().selectionStart).toBe(2);
  expect(container.querySelector("time")).not.toBeNull();
});

test("Backspace at the start removes the time badge and undo restores it", () => {
  const node = newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30));
  node.text += "保留正文";
  mount([node]);
  input().setSelectionRange(0, 0);
  key(input(), "Backspace");
  expect(latest[0].text).toBe("保留正文");
  expect(container.querySelector("time")).toBeNull();
  act(() => editor.current!.undo());
  expect(input().value).toBe("保留正文");
  expect(container.querySelector("time")).not.toBeNull();
});

test("arrow navigation uses displayed body lengths for timestamped entries", () => {
  const first = newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30));
  first.text += "记录";
  mount([first, newOutlineNode("下一条")]);
  input().setSelectionRange(2, 2);
  key(input(), "ArrowDown");
  expect(document.activeElement).toBe(input(1));
  expect(input(1).selectionStart).toBe(0);
  key(input(1), "ArrowUp");
  expect(document.activeElement).toBe(input());
  expect(input().selectionStart).toBe(2);
});

function clipboardEvent(target: Element, command: "copy" | "cut" | "paste", text = "") {
  const setData = vi.fn();
  act(() => {
    const event = new Event(command, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { setData, getData: () => text } });
    target.dispatchEvent(event);
  });
  return setData;
}

test("Ctrl+A copies the entire list including folded children, timestamp and task state", () => {
  const parent = { ...newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30)), collapsed: true };
  parent.text += "记录";
  const nodes = [
    parent,
    { ...newOutlineNode("隐藏待办", 1), kind: "todo" as const, checked: true },
    newOutlineNode("末项"),
  ];
  mount(nodes);
  input().focus();
  key(input(), "a", { ctrlKey: true });
  expect(container.querySelector('[data-outline-selection="all"]')).not.toBeNull();
  expect(container.querySelectorAll('[data-outline-selected="true"]')).toHaveLength(2);
  expect(clipboardEvent(input(), "copy")).toHaveBeenCalledWith(
    "text/plain",
    outlineMarkdown(nodes),
  );
});

test.each(["Delete", "Backspace", "Enter"])(
  "whole-list %s clears the list and undo restores all nodes",
  (command) => {
    const nodes = [
      newOutlineNode("第一条"),
      { ...newOutlineNode("子待办", 1), kind: "todo" as const },
    ];
    mount(nodes);
    input().focus();
    key(input(), "a", { ctrlKey: true });
    key(input(), command);
    expect(latest).toHaveLength(1);
    expect(latest[0].text).toBe("");
    expect(container.querySelector('[data-outline-selection="all"]')).toBeNull();
    act(() => editor.current!.undo());
    expect(latest).toEqual(nodes);
  },
);

test("Cmd+A and cut copy every item before removing them; undo restores hierarchy", () => {
  const nodes = [newOutlineNode("父项"), newOutlineNode("子项", 1)];
  mount(nodes);
  key(input(), "a", { metaKey: true });
  expect(clipboardEvent(input(), "cut")).toHaveBeenCalledWith("text/plain", "- 父项\n  - 子项");
  expect(latest).toHaveLength(1);
  expect(latest[0].text).toBe("");
  act(() => editor.current!.undo());
  expect(latest).toEqual(nodes);
});

test("paste replaces the full selection and preserves pasted task types and nesting", () => {
  mount([newOutlineNode("旧一"), newOutlineNode("旧二")]);
  key(input(), "a", { ctrlKey: true });
  clipboardEvent(input(), "paste", "- 新父项\n  - [x] 已完成");
  expect(latest.map(({ text, depth, kind, checked }) => [text, depth, kind, checked])).toEqual([
    ["新父项", 0, "bullet", false],
    ["已完成", 1, "todo", true],
  ]);
  act(() => editor.current!.undo());
  expect(latest.map((node) => node.text)).toEqual(["旧一", "旧二"]);
});

test("typing after select-all replaces every item; Escape returns to normal row editing", () => {
  mount([newOutlineNode("旧一"), newOutlineNode("旧二")]);
  input(1).focus();
  key(input(1), "a", { ctrlKey: true });
  type(input(1), "替换内容");
  expect(latest.map((node) => node.text)).toEqual(["替换内容"]);
  act(() => editor.current!.undo());
  key(input(), "a", { ctrlKey: true });
  key(input(), "Escape");
  expect(container.querySelector('[data-outline-selection="all"]')).toBeNull();
  type(input(), "只修改第一条");
  expect(latest.map((node) => node.text)).toEqual(["只修改第一条", "旧二"]);
});

test("preview supports whole-list keyboard selection and copy without editing", () => {
  const nodes = [newOutlineNode("第一条"), newOutlineNode("第二条")];
  mount(nodes, true);
  const preview = container.querySelector<HTMLElement>("[data-outline-editor]")!;
  act(() =>
    preview.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true, cancelable: true }),
    ),
  );
  expect(window.getSelection()?.toString()).toContain("第一条");
  expect(window.getSelection()?.toString()).toContain("第二条");
  expect(clipboardEvent(preview, "copy")).toHaveBeenCalledWith("text/plain", "- 第一条\n- 第二条");
  clipboardEvent(preview, "cut");
  expect(latest).toEqual(nodes);
});

test("right-click select-all and copy use the entire list instead of one textarea", async () => {
  mount([newOutlineNode("第一条"), newOutlineNode("第二条")], false, true);
  const openMenu = async () =>
    act(async () =>
      input().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })),
    );
  await openMenu();
  await act(async () =>
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.startsWith("全选"))!
      .click(),
  );
  expect(container.querySelector('[data-outline-selection="all"]')).not.toBeNull();
  await openMenu();
  await act(async () =>
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.startsWith("复制"))!
      .click(),
  );
  expect(clipboardWrite).toHaveBeenCalledWith("- 第一条\n- 第二条");
});

test("pinned list context menu offers whole-list selection and copy", async () => {
  mount([newOutlineNode("第一条"), newOutlineNode("第二条")], true, true);
  const preview = container.querySelector<HTMLElement>("[data-outline-editor]")!;
  preview.dataset.contextMenu = "tile";
  const openMenu = async () =>
    act(async () =>
      preview.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })),
    );
  await openMenu();
  await act(async () =>
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.startsWith("全选"))!
      .click(),
  );
  await openMenu();
  await act(async () =>
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.startsWith("复制"))!
      .click(),
  );
  expect(clipboardWrite).toHaveBeenCalledWith("- 第一条\n- 第二条");
});

test("async clipboard commands cannot replace a different selection snapshot", () => {
  mount([newOutlineNode("原始条目"), newOutlineNode("第二条")]);
  const target = container.querySelector<HTMLElement>("[data-outline-editor]")!;
  act(() => {
    requestOutlineSelection(target, "selectAll");
  });
  const selection = requestOutlineSelection(target, "getSelection");
  expect(selection.selectionText).toBe("- 原始条目\n- 第二条");
  act(() => {
    expect(requestOutlineSelection(target, "replaceSelection", "替换", "过期的选择").handled).toBe(
      false,
    );
  });
  expect(latest.map((node) => node.text)).toEqual(["原始条目", "第二条"]);
  act(() => {
    expect(
      requestOutlineSelection(target, "replaceSelection", "替换", selection.selectionText).handled,
    ).toBe(true);
  });
  expect(latest.map((node) => node.text)).toEqual(["替换"]);
});
