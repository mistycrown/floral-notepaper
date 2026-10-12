import { describe, expect, test } from "vitest";
import {
  createTagCompletionEdit,
  getTagCompletionContext,
  getTagSuggestions,
} from "./tagCompletion";

describe("tag completion context", () => {
  test.each(["#", "正文 #", "(#", "正文，#", "#工作", "#work_2", "#daily-life"])(
    "recognizes %s",
    (value) => {
      const context = getTagCompletionContext(value, value.length);
      expect(context).not.toBeNull();
      expect(value.slice(context!.start, context!.end)).toBe(`#${context!.query}`);
    },
  );

  test.each([
    "# 标题",
    "C#",
    "word#",
    "\\#",
    "##",
    "```\n#",
    "~~~\n#",
    "    #",
    "https://example.com/#",
    "[#](url)",
    "![#](image.png)",
    "`#`",
    "[#]: url",
  ])("does not prompt for Markdown syntax in %s", (value) => {
    const caret = value.lastIndexOf("#") + 1;
    expect(getTagCompletionContext(value, caret)).toBeNull();
  });

  test("rejects selections and replaces the whole tag when the caret is in the middle", () => {
    const value = "先写 #working 后续正文";
    expect(getTagCompletionContext(value, 5, 8)).toBeNull();
    const caret = value.indexOf("#") + 3;
    const context = getTagCompletionContext(value, caret)!;
    expect(context.query).toBe("wo");
    expect(value.slice(context.start, context.end)).toBe("#working");
    const edit = createTagCompletionEdit(value, context, "work");
    expect(edit.value).toBe("先写 #work 后续正文");
    expect(edit.value.slice(0, edit.cursor)).toBe("先写 #work ");
  });

  test("only replaces the active occurrence and preserves punctuation and newlines", () => {
    const value = "#工作\n正文 #工，下一句";
    const caret = value.lastIndexOf("#") + 2;
    const edit = createTagCompletionEdit(value, getTagCompletionContext(value, caret)!, "工作");
    expect(edit.value).toBe("#工作\n正文 #工作，下一句");
    expect(edit.cursor).toBe(edit.value.indexOf("，"));
    expect(
      createTagCompletionEdit("#工\n后续", getTagCompletionContext("#工\n后续", 2)!, "工作").value,
    ).toBe("#工作\n后续");
    expect(createTagCompletionEdit("#工", getTagCompletionContext("#工", 2)!, "工作").value).toBe(
      "#工作 ",
    );
  });
});

test("candidates are existing valid tags, unique, sorted, bounded and filtered by prefix", () => {
  expect(getTagSuggestions(["工作", "工作", "读书", "work", "Work", "invalid tag"], "工")).toEqual([
    "工作",
  ]);
  expect(getTagSuggestions(["读书", "工作", "读书"], "")).toHaveLength(2);
  expect(getTagSuggestions(["work", "word", "daily"], "WO")).toEqual(["word", "work"]);
  expect(getTagSuggestions(["work"], "new")).toEqual([]);
  expect(
    getTagSuggestions(
      Array.from({ length: 20 }, (_, index) => `tag${index}`),
      "",
    ),
  ).toHaveLength(8);
});
