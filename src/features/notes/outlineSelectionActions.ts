export const OUTLINE_SELECTION_EVENT = "outline-selection-command";

export interface OutlineSelectionRequest {
  command: "selectAll" | "getSelection" | "replaceSelection";
  text?: string;
  expectedText?: string;
  handled: boolean;
  selectionText?: string;
}

export function requestOutlineSelection(
  target: HTMLElement | null,
  command: OutlineSelectionRequest["command"],
  text?: string,
  expectedText?: string,
): OutlineSelectionRequest {
  const detail: OutlineSelectionRequest = { command, text, expectedText, handled: false };
  target?.dispatchEvent(new CustomEvent(OUTLINE_SELECTION_EVENT, { bubbles: true, detail }));
  return detail;
}
