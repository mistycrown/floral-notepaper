import type { OutlineNode } from "../notes/types";

export function normalizeQuickInsertKind(value: unknown): OutlineNode["kind"] {
  return value === "todo" ? "todo" : "bullet";
}
