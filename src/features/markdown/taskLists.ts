import type { Root, ListItem } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// Keep source offsets from the Markdown parser so code blocks and nested tasks
// cannot be mistaken for a different checkbox when the preview is clicked.
export const remarkTaskOffsets: Plugin<[], Root> = () => (tree, file) => {
  const source = String(file);
  visit(tree, "listItem", (node: ListItem) => {
    const start = node.position?.start.offset;
    if (node.checked == null || start == null) return;
    const marker = /^(?:[-+*]|\d+[.)])[ \t]+\[([ xX])\]/.exec(source.slice(start));
    if (!marker) return;
    node.data ??= {};
    node.data.hProperties = {
      ...node.data.hProperties,
      "data-task-offset": start + marker[0].lastIndexOf("[") + 1,
    };
  });
};

export function toggleMarkdownTask(content: string, offset: number, checked: boolean): string {
  if (
    !Number.isInteger(offset) ||
    offset < 1 ||
    content[offset - 1] !== "[" ||
    content[offset + 1] !== "]" ||
    !/^[ xX]$/.test(content[offset] ?? "")
  )
    return content;
  return content.slice(0, offset) + (checked ? "x" : " ") + content.slice(offset + 1);
}

export function taskListInsertion(value: string, start: number, end: number) {
  const selected = value.slice(start, end);
  const newline = value.includes("\r\n") ? "\r\n" : "\n";
  const tasks = selected
    ? selected
        .split(/\r?\n/)
        .map((line) =>
          /^\s*(?:[-+*]|\d+[.)])[ \t]+\[[ xX]\]/.test(line)
            ? line
            : `- [ ] ${line.replace(/^\s*(?:[-+*]|\d+[.)])[ \t]+/, "")}`,
        )
        .join(newline)
    : "- [ ] ";
  const prefix = start > 0 && value[start - 1] !== "\n" ? newline : "";
  const suffix = end < value.length && value[end] !== "\n" && value[end] !== "\r" ? newline : "";
  const insertion = prefix + tasks + suffix;
  return {
    value: value.slice(0, start) + insertion + value.slice(end),
    cursor: start + prefix.length + tasks.length,
  };
}
