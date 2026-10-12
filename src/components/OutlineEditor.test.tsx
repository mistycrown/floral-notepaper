// @vitest-environment jsdom
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { ContextMenuProvider } from "./ContextMenu";
import { OutlineEditor, type OutlineEditorHandle } from "./OutlineEditor";
import { newOutlineNode, outlineMarkdown } from "../features/notes/outline";
import type { OutlineNode } from "../features/notes/types";

let container: HTMLDivElement;
let root: Root;
let latest: OutlineNode[];
const editor = createRef<OutlineEditorHandle>();

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  mockIPC(() => ({}), { shouldMockEvents: true });
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
