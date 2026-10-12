// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NoteTagEditor } from "./NoteTags";

let root: Root;
let container: HTMLDivElement;
let tags: string[];
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  function Harness() {
    const [value, setValue] = useState(["工作"]);
    tags = value;
    return (
      <NoteTagEditor
        tags={value}
        knownTags={["工作", "读书", "读书", "旅行"]}
        onChange={setValue}
      />
    );
  }
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
function input() {
  return container.querySelector<HTMLInputElement>('[role="combobox"]')!;
}
function type(value: string) {
  act(() => {
    input().focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function key(value: string, options: KeyboardEventInit = {}) {
  act(() =>
    input().dispatchEvent(
      new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options }),
    ),
  );
}

test("deduplicates suggestions, excludes assigned tags, and supports mouse selection", () => {
  type("读");
  const options = container.querySelectorAll<HTMLButtonElement>('[role="option"]');
  expect([...options].map((option) => option.textContent)).toEqual(["#读书"]);
  act(() => options[0].click());
  expect(tags).toEqual(["工作", "读书"]);
  expect(input().value).toBe("");
});
test("adds a typed Chinese name, accepts an optional hash, and avoids duplicates", () => {
  type(" #新标签 ");
  key("Enter");
  expect(tags).toEqual(["工作", "新标签"]);
  type("#工作");
  key("Enter");
  expect(tags).toEqual(["工作", "新标签"]);
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="移除标签 工作"]')!.click());
  expect(tags).toEqual(["新标签"]);
});
test("invalid tag names stay editable with an error; empty input cannot add a tag", () => {
  type("多个 标签");
  key("Enter");
  expect(tags).toEqual(["工作"]);
  expect(input().getAttribute("aria-invalid")).toBe("true");
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  type("#");
  key("Enter");
  expect(tags).toEqual(["工作"]);
});
test("IME Enter does not submit until composition ends", () => {
  type("新标签");
  act(() => input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
  key("Enter");
  expect(tags).toEqual(["工作"]);
  act(() => input().dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })));
  key("Enter");
  expect(tags).toEqual(["工作", "新标签"]);
});
test("blur commits a valid draft and Escape dismisses suggestions", () => {
  type("旅");
  key("Escape");
  expect(container.querySelector('[role="listbox"]')).toBeNull();
  type("旅行");
  act(() => input().blur());
  expect(tags).toEqual(["工作", "旅行"]);
});
