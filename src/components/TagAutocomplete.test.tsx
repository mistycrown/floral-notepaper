// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TagAutocomplete } from "./TagAutocomplete";
import { applyTextareaTagCompletion } from "../features/notes/tagCompletion";

let container: HTMLDivElement;
let root: Root;
let value: string;
const ordinaryKey = vi.fn();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  ordinaryKey.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function mount(initial = "", disabled = false) {
  function Harness() {
    const [text, setText] = useState(initial);
    value = text;
    return (
      <TagAutocomplete
        tags={["工作", "读书", "word", "work", "工作"]}
        disabled={disabled}
        onComplete={(textarea, edit) => applyTextareaTagCompletion(textarea, edit, setText)}
      >
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={ordinaryKey}
        />
      </TagAutocomplete>
    );
  }
  act(() => root.render(<Harness />));
}
function input() {
  return container.querySelector("textarea")!;
}
function type(text: string, caret = text.length) {
  const textarea = input();
  act(() => {
    textarea.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      textarea,
      text,
    );
    textarea.setSelectionRange(caret, caret);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function key(name: string, options: KeyboardEventInit = {}) {
  act(() => {
    input().dispatchEvent(
      new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true, ...options }),
    );
  });
}
function options() {
  return [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')];
}

test("typing a hashtag shows existing tags once and typing Chinese filters them", () => {
  mount();
  type("正文 #");
  expect(options()).toHaveLength(4);
  expect(options().map((option) => option.textContent)).toContain("#工作");
  expect(input().getAttribute("aria-controls")).toBe(
    document.querySelector('[role="listbox"]')!.id,
  );
  type("正文 #工");
  expect(options().map((option) => option.textContent)).toEqual(["#工作"]);
});

test("arrows and Enter complete only the active token and keep the caret in the editor", () => {
  mount();
  type("#wo");
  expect(options().map((option) => option.textContent)).toEqual(["#word", "#work"]);
  key("ArrowDown");
  expect(options()[1].getAttribute("aria-selected")).toBe("true");
  key("Enter");
  expect(value).toBe("#work ");
  expect(input().selectionStart).toBe(6);
  expect(document.activeElement).toBe(input());
  expect(options()).toHaveLength(0);
  expect(ordinaryKey).not.toHaveBeenCalled();
});

test("mouse selection preserves later text while replacing the complete token under the caret", () => {
  mount();
  type("正文 #working 后续", 6);
  expect(options().map((option) => option.textContent)).toEqual(["#word", "#work"]);
  act(() => {
    options()
      .find((option) => option.textContent === "#work")!
      .click();
  });
  expect(value).toBe("正文 #work 后续");
  expect(input().selectionStart).toBe(9);
  expect(options()).toHaveLength(0);
});

test("Escape closes the prompt until the token changes", () => {
  mount();
  type("#工");
  key("Escape");
  expect(options()).toHaveLength(0);
  act(() => {
    input().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(options()).toHaveLength(0);
  type("#工作");
  expect(options()).toHaveLength(1);
});

test("IME composition hides suggestions and does not consume confirmation Enter", () => {
  mount();
  type("#");
  act(() => {
    input().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
  });
  type("#工");
  key("Enter", { isComposing: true });
  expect(options()).toHaveLength(0);
  expect(value).toBe("#工");
  expect(ordinaryKey).toHaveBeenCalledOnce();
  act(() => {
    input().dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "工" }));
  });
  expect(options().map((option) => option.textContent)).toEqual(["#工作"]);
});

test.each(["#未知", "# 标题", "```\n#工", "`#工`", "[标签 #工](url)"])(
  "normal input remains available for %s",
  (text) => {
    mount();
    type(text, text.includes("#工") ? text.indexOf("#工") + 2 : text.length);
    expect(options()).toHaveLength(0);
    key("Enter");
    expect(ordinaryKey).toHaveBeenCalledOnce();
  },
);

test("modifier Enter and Tab keep existing editor behavior; blur hides the popup", () => {
  mount();
  type("#工");
  key("Enter", { ctrlKey: true });
  key("Tab");
  expect(value).toBe("#工");
  expect(ordinaryKey).toHaveBeenCalledTimes(2);
  act(() => input().blur());
  expect(options()).toHaveLength(0);
});

test("disabled completion leaves the editor alone", () => {
  mount("", true);
  type("#工");
  expect(options()).toHaveLength(0);
});

test("tags already written in the current draft can be reused without saving", () => {
  mount();
  type("#新标签\n#新");
  expect(options().map((option) => option.textContent)).toEqual(["#新标签"]);
  key("Enter");
  expect(value).toBe("#新标签\n#新标签 ");
});
