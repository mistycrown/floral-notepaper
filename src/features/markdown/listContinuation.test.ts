import { describe, expect, test, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { getListContinuation, handleListEnter } from "./listContinuation";

function insertEnter(value: string, cursor = value.length) {
  const edit = getListContinuation(value, cursor);
  return edit ? value.slice(0, edit.start) + edit.text + value.slice(edit.end) : null;
}

describe("Markdown list continuation", () => {
  test.each(["-", "*", "+"])("continues %s lists", (marker) => {
    expect(insertEnter(`${marker} 第一项`)).toBe(`${marker} 第一项\n${marker} `);
  });

  test("increments ordered lists and preserves nested indentation", () => {
    expect(insertEnter("9. 第九项")).toBe("9. 第九项\n10. ");
    expect(insertEnter("  3) 子项")).toBe("  3) 子项\n  4) ");
    expect(insertEnter("\t- 子项")).toBe("\t- 子项\n\t- ");
  });

  test.each([" ", "x", "X"])("starts an unchecked task after a [%s] task", (state) => {
    expect(insertEnter(`  - [${state}] 待办`)).toBe(`  - [${state}] 待办\n  - [ ] `);
    expect(insertEnter(`1. [${state}] 待办`)).toBe(`1. [${state}] 待办\n2. [ ] `);
  });

  test("splits an item at the caret without losing the rest of the content", () => {
    expect(insertEnter("- 甲乙\n正文", 3)).toBe("- 甲\n- 乙\n正文");
  });

  test.each(["- ", "2. ", "- [ ] ", "- [x] "])(
    "ends an empty %s item with a blank line",
    (marker) => {
      expect(insertEnter(`- 第一项\n${marker}`)).toBe("- 第一项\n\n");
    },
  );

  test("preserves CRLF and the following lines", () => {
    expect(insertEnter("标题\r\n- 第一项")).toBe("标题\r\n- 第一项\r\n- ");
    expect(insertEnter("- 第一项\r\n- \r\n正文", 9)).toBe("- 第一项\r\n\r\n\r\n正文");
  });

  test("ignores code examples until their enclosing fence closes", () => {
    expect(insertEnter("```md\n- 示例")).toBeNull();
    expect(insertEnter("~~~~md\n```\n- 示例")).toBeNull();
    expect(insertEnter("```md\n- 示例\n```\n- 第一项")).toBe("```md\n- 示例\n```\n- 第一项\n- ");
  });

  test("keeps normal paragraphs, incomplete prefixes and selections unchanged", () => {
    expect(insertEnter("正文")).toBeNull();
    expect(insertEnter("---")).toBeNull();
    expect(insertEnter("- 正文", 1)).toBeNull();
    expect(getListContinuation("- 正文", 2, 4)).toBeNull();
  });

  test.each([
    { shiftKey: true },
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
    { nativeEvent: { isComposing: true } },
    { nativeEvent: { keyCode: 229 } },
  ])("preserves modified Enter and IME confirmation: %o", (overrides) => {
    const preventDefault = vi.fn();
    const event = {
      key: "Enter",
      nativeEvent: {},
      preventDefault,
      ...overrides,
    } as unknown as KeyboardEvent<HTMLTextAreaElement>;
    expect(handleListEnter(event, vi.fn(), vi.fn())).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
