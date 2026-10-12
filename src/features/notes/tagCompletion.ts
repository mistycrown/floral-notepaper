import { extractNoteTags } from "./tags";

export interface TagCompletionContext {
  start: number;
  end: number;
  query: string;
}

export interface TagCompletionEdit {
  start: number;
  end: number;
  text: string;
  value: string;
  cursor: number;
}

export function getTagCompletionContext(
  value: string,
  start: number,
  end = start,
): TagCompletionContext | null {
  if (start !== end || start < 0 || start > value.length) return null;
  const match = /(?:^|[\s([{（【「『，。！？、；：,:;!?])#([\p{L}\p{N}_-]*)$/u.exec(
    value.slice(0, start),
  );
  if (!match) return null;
  const tokenStart = start - match[1].length - 1;
  const suffix = /^[\p{L}\p{N}_-]*/u.exec(value.slice(start))![0];
  const tokenEnd = start + suffix.length;
  const lineStart = value.lastIndexOf("\n", tokenStart - 1) + 1;
  if (
    !match[1] &&
    /^ {0,3}$/.test(value.slice(lineStart, tokenStart)) &&
    /^[ \t]/.test(value.slice(tokenEnd))
  )
    return null;
  // Probe through the existing parser so code, links and escapes share its rules.
  let probe = "__tag_completion_probe__";
  while (value.includes(probe)) probe += "_";
  const marked = value.slice(0, tokenStart) + `#${probe}` + value.slice(tokenEnd);
  if (!extractNoteTags(marked).includes(probe)) return null;
  return { start: tokenStart, end: tokenEnd, query: match[1] };
}

export function getTagSuggestions(tags: readonly string[], query: string, limit = 8): string[] {
  const prefix = query.toLowerCase();
  return [...new Set(tags)]
    .filter((tag) => /^[\p{L}\p{N}_-]+$/u.test(tag) && tag.toLowerCase().startsWith(prefix))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

export function createTagCompletionEdit(
  value: string,
  context: TagCompletionContext,
  tag: string,
): TagCompletionEdit {
  const suffix = value.slice(context.end);
  const text = `#${tag}${!suffix || suffix.startsWith("#") ? " " : ""}`;
  return {
    start: context.start,
    end: context.end,
    text,
    value: value.slice(0, context.start) + text + suffix,
    cursor: context.start + text.length + (suffix.startsWith(" ") ? 1 : 0),
  };
}

export function applyTextareaTagCompletion(
  textarea: HTMLTextAreaElement,
  edit: TagCompletionEdit,
  onChange: (value: string) => void,
) {
  textarea.focus();
  textarea.setSelectionRange(edit.start, edit.end);
  if (
    typeof document.execCommand !== "function" ||
    !document.execCommand("insertText", false, edit.text)
  ) {
    textarea.setRangeText(edit.text, edit.start, edit.end, "end");
  }
  onChange(edit.value);
  textarea.setSelectionRange(edit.cursor, edit.cursor);
  requestAnimationFrame(() => {
    if (textarea.isConnected && textarea.value === edit.value)
      textarea.setSelectionRange(edit.cursor, edit.cursor);
  });
}
