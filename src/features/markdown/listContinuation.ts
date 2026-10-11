import type { KeyboardEvent } from "react";

interface ListContinuationEdit {
  start: number;
  end: number;
  text: string;
  cursor: number;
}

function insideCodeFence(content: string): boolean {
  let fence: { marker: string; length: number } | null = null;
  for (const line of content.split(/\r?\n/)) {
    const match = /^[ \t]*(?:>[ \t]*)*(?:[-+*][ \t]+|\d+[.)][ \t]+)?(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) continue;
    const marker = match[1][0];
    if (fence) {
      if (marker === fence.marker && match[1].length >= fence.length && !match[2].trim()) {
        fence = null;
      }
    } else if (marker !== "`" || !match[2].includes("`")) {
      fence = { marker, length: match[1].length };
    }
  }
  return fence !== null;
}

export function getListContinuation(
  value: string,
  start: number,
  end = start,
): ListContinuationEdit | null {
  if (start !== end || start < 0 || start > value.length) return null;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  if (insideCodeFence(value.slice(0, lineStart))) return null;
  const nextNewline = value.indexOf("\n", start);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const contentEnd = value[lineEnd - 1] === "\r" ? lineEnd - 1 : lineEnd;
  const line = value.slice(lineStart, contentEnd);
  const match = /^([ \t]*)([-+*]|(\d{1,9})([.)]))([ \t]+)(?:\[([ xX])\]([ \t]+|$))?/.exec(line);
  if (!match || start - lineStart < match[0].length) return null;

  const newline = value.includes("\r\n") ? "\r\n" : "\n";
  if (!line.slice(match[0].length).trim()) {
    // Leave a blank line so subsequent prose is outside the Markdown list.
    return { start: lineStart, end: contentEnd, text: newline, cursor: lineStart + newline.length };
  }

  const marker = match[3] ? `${Number(match[3]) + 1}${match[4]}` : match[2];
  const task = match[6] != null ? `[ ]${match[7] || " "}` : "";
  const text = newline + match[1] + marker + match[5] + task;
  return { start, end, text, cursor: start + text.length };
}

export function handleListEnter(
  event: KeyboardEvent<HTMLTextAreaElement>,
  setContent: (value: string) => void,
  markDirty: () => void,
): boolean {
  if (
    event.key !== "Enter" ||
    event.defaultPrevented ||
    event.shiftKey ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.nativeEvent.isComposing ||
    event.nativeEvent.keyCode === 229
  )
    return false;

  const textarea = event.currentTarget;
  if (textarea.disabled || textarea.readOnly) return false;
  const value = textarea.value;
  const edit = getListContinuation(value, textarea.selectionStart, textarea.selectionEnd);
  if (!edit) return false;

  event.preventDefault();
  textarea.setSelectionRange(edit.start, edit.end);
  // Use the same browser editing command as the formatting toolbar to keep undo.
  if (!document.execCommand("insertText", false, edit.text)) {
    textarea.setRangeText(edit.text, edit.start, edit.end, "end");
  }
  setContent(value.slice(0, edit.start) + edit.text + value.slice(edit.end));
  markDirty();
  requestAnimationFrame(() => textarea.setSelectionRange(edit.cursor, edit.cursor));
  return true;
}
