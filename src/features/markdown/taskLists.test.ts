import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { MarkdownPreview } from "./MarkdownPreview";
import { taskListInsertion, toggleMarkdownTask } from "./taskLists";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

describe("Markdown tasks", () => {
  test("maps nested and quoted tasks to source markers and leaves fenced examples alone", () => {
    const content =
      "标题\r\n\r\n- [ ] 第一项\r\n  - [X] 子项\r\n\r\n> 1. [ ] 引用项\r\n\r\n```md\r\n- [ ] 示例\r\n```";
    const markup = renderToStaticMarkup(
      createElement(MarkdownPreview, {
        content,
        onTaskToggle: vi.fn(),
      }),
    );
    const offsets = Array.from(markup.matchAll(/data-task-offset="(\d+)"/g), (match) =>
      Number(match[1]),
    );

    expect(offsets).toEqual([
      content.indexOf("[ ] 第一项") + 1,
      content.indexOf("[X] 子项") + 1,
      content.indexOf("[ ] 引用项") + 1,
    ]);
    expect(markup.match(/type="checkbox"/g)).toHaveLength(3);
    expect(markup).not.toContain('disabled=""');
    expect(toggleMarkdownTask(content, offsets[1], false)).toBe(
      content.replace("[X] 子项", "[ ] 子项"),
    );
    expect(toggleMarkdownTask(content, offsets[2], true)).toBe(
      content.replace("[ ] 引用项", "[x] 引用项"),
    );
  });

  test("keeps preview checkboxes read-only without a write callback", () => {
    const markup = renderToStaticMarkup(createElement(MarkdownPreview, { content: "- [ ] 待办" }));
    expect(markup).toContain('disabled=""');
  });

  test("preserves task offsets when HTML sanitization is enabled", () => {
    const markup = renderToStaticMarkup(
      createElement(MarkdownPreview, {
        content: "- [ ] 待办\n\n<mark>正文</mark>",
        renderHtml: true,
        onTaskToggle: vi.fn(),
      }),
    );
    expect(markup).toContain('data-task-offset="3"');
    expect(markup).not.toContain('disabled=""');
  });

  test("inserts a task on its own line and places the cursor after the marker", () => {
    expect(taskListInsertion("开头结尾", 2, 2)).toEqual({
      value: "开头\n- [ ] \n结尾",
      cursor: 9,
    });
    expect(taskListInsertion("", 0, 0)).toEqual({ value: "- [ ] ", cursor: 6 });
  });

  test("converts a multiline selection while preserving existing tasks and CRLF", () => {
    const content = "- 第一项\r\n2. 第二项\r\n- [x] 已完成";
    const result = taskListInsertion(content, 0, content.length);
    expect(result.value).toBe("- [ ] 第一项\r\n- [ ] 第二项\r\n- [x] 已完成");
    expect(result.cursor).toBe(result.value.length);
  });

  test("rejects offsets that do not point to a task marker", () => {
    expect(toggleMarkdownTask("正文", 0, true)).toBe("正文");
    expect(toggleMarkdownTask("- [ ] 待办", 4.5, true)).toBe("- [ ] 待办");
  });
});
