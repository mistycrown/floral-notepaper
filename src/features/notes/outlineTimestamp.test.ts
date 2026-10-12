import { expect, test } from "vitest";
import { outlineMarkdown, parseOutline } from "./outline";
import { newTimestampOutlineNode, readOutlineTimestamp } from "./outlineTimestamp";

test("timestamp uses local date and zero-padded 24-hour time", () => {
  const node = newTimestampOutlineNode(new Date(2026, 0, 2, 3, 4, 59));
  expect(node.text).toBe("[2026-01-02 03:04] ");
  expect(node.depth).toBe(0);
  expect(readOutlineTimestamp(node.text)).toEqual({
    prefix: "[2026-01-02 03:04] ",
    label: "2026-01-02 03:04",
    dateTime: "2026-01-02T03:04",
    text: "",
  });
});

test("timestamp and multiline Chinese text survive Markdown export and parsing", () => {
  const node = newTimestampOutlineNode(new Date(2026, 9, 12, 14, 30));
  node.text += "会议记录\n下一步";
  const content = outlineMarkdown([node]);
  expect(content).toBe("- [2026-10-12 14:30] 会议记录\n  下一步");
  expect(readOutlineTimestamp(parseOutline(content)[0].text)?.text).toBe("会议记录\n下一步");
});

test.each([
  "普通条目",
  "2026-10-12 14:30 文字",
  "[2026-13-12 14:30] 文字",
  "[2026-10-12 24:30] 文字",
  "[2026-10-12 14:60] 文字",
])("ordinary or malformed text stays plain: %s", (text) => {
  expect(readOutlineTimestamp(text)).toBeNull();
});
