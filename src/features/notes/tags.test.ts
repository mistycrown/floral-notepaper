import { expect, it } from "vitest";
import { normalizeNoteTags } from "./tags";

it("normalizes metadata tags while retaining order and case", () => {
  expect(
    normalizeNoteTags([" 工作 ", "#读书", "工作", "", "bad tag", "标点，", "项目_1-A", "a", "A"]),
  ).toEqual(["工作", "读书", "项目_1-A", "a", "A"]);
});
