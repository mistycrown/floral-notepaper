import { expect, test } from "vitest";
import { normalizeQuickInsertKind } from "./quickInsertKind";

test.each([
  ["todo", "todo"],
  ["bullet", "bullet"],
  [undefined, "bullet"],
  ["invalid", "bullet"],
  [null, "bullet"],
])("quick insert kind %s becomes %s", (value, expected) => {
  expect(normalizeQuickInsertKind(value)).toBe(expected);
});
