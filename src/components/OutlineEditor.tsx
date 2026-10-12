import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { OutlineNode } from "../features/notes/types";
import { readOutlineTimestamp } from "../features/notes/outlineTimestamp";
import { OutlineTimestamp } from "./OutlineTimestamp";
import {
  OUTLINE_SELECTION_EVENT,
  type OutlineSelectionRequest,
} from "../features/notes/outlineSelectionActions";
import {
  OUTLINE_NODE_TYPE_EVENT,
  type OutlineNodeTypeRequest,
} from "../features/notes/outlineNodeActions";
import {
  indentNode,
  mergeNode,
  newOutlineNode,
  outlineMarkdown,
  parseOutline,
  splitNode,
  subtreeEnd,
  visibleOutline,
} from "../features/notes/outline";

export interface OutlineEditorHandle {
  focus: () => void;
  focusNode: (id: string, cursor?: number) => void;
  selectAll: () => void;
  undo: () => void;
  redo: () => void;
}

interface Props {
  nodes: OutlineNode[];
  onChange?: (nodes: OutlineNode[]) => void;
  readOnly?: boolean;
  fontSize?: number;
  className?: string;
}

interface Snapshot {
  nodes: OutlineNode[];
  id?: string;
  cursor?: number;
}

export const OutlineEditor = forwardRef<OutlineEditorHandle, Props>(function OutlineEditor(
  { nodes, onChange, readOnly = false, fontSize = 14, className = "" },
  ref,
) {
  const { t } = useTranslation();
  const elements = useRef(new Map<string, HTMLTextAreaElement>());
  const container = useRef<HTMLDivElement>(null);
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const pendingFocus = useRef<{ id: string; cursor: number } | null>(null);
  const lastEdit = useRef<{ id: string; at: number } | null>(null);
  const expected = useRef(nodes);
  const visible = visibleOutline(nodes);
  const [allSelected, setAllSelected] = useState(false);
  const allSelectedRef = useRef(false);

  function clearSelection() {
    allSelectedRef.current = false;
    setAllSelected(false);
  }

  function selectAll() {
    allSelectedRef.current = true;
    setAllSelected(true);
    if (readOnly) {
      container.current?.focus({ preventScroll: true });
      const range = document.createRange();
      if (container.current) range.selectNodeContents(container.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    } else {
      const active = document.activeElement;
      const input =
        active instanceof HTMLTextAreaElement && container.current?.contains(active)
          ? active
          : elements.current.get(visible[0]?.id);
      input?.focus({ preventScroll: true });
      input?.select();
    }
  }

  // A load or an edit from another surface starts a new local history.
  useLayoutEffect(() => {
    if (expected.current !== nodes) {
      clearSelection();
      past.current = [];
      future.current = [];
      lastEdit.current = null;
    }
    expected.current = nodes;
    for (const element of elements.current.values()) {
      element.style.height = "0px";
      element.style.height = `${element.scrollHeight}px`;
    }
    const focus = pendingFocus.current;
    if (focus) {
      const element = elements.current.get(focus.id);
      element?.focus();
      element?.setSelectionRange(focus.cursor, focus.cursor);
      pendingFocus.current = null;
    }
  }, [nodes]);

  function snapshot(): Snapshot {
    const element = document.activeElement as HTMLTextAreaElement | null;
    return {
      nodes,
      id: element?.dataset.outlineNode,
      cursor: element?.selectionStart ?? undefined,
    };
  }

  function focusNode(id: string, cursor = 0) {
    const element = elements.current.get(id);
    element?.focus();
    element?.setSelectionRange(cursor, cursor);
    element?.scrollIntoView?.({ block: "nearest" });
  }

  function commit(next: OutlineNode[], focusId?: string, cursor = 0, textEditId?: string) {
    if (!onChange || next === nodes) return;
    clearSelection();
    const now = Date.now();
    if (!textEditId || lastEdit.current?.id !== textEditId || now - lastEdit.current.at > 600) {
      past.current.push(snapshot());
      if (past.current.length > 200) past.current.shift();
    }
    lastEdit.current = textEditId ? { id: textEditId, at: now } : null;
    future.current = [];
    if (focusId) pendingFocus.current = { id: focusId, cursor };
    expected.current = next;
    onChange(next);
  }

  function restore(from: typeof past, to: typeof past) {
    const target = from.current.pop();
    if (!target || !onChange) return;
    clearSelection();
    to.current.push(snapshot());
    lastEdit.current = null;
    if (target.id) pendingFocus.current = { id: target.id, cursor: target.cursor ?? 0 };
    expected.current = target.nodes;
    onChange(target.nodes);
  }

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (visible[0]) focusNode(visible[0].id);
    },
    focusNode,
    selectAll,
    undo: () => restore(past, future),
    redo: () => restore(future, past),
  }));

  function replaceSelection(text: string, keepId?: string) {
    if (!allSelectedRef.current || readOnly || !onChange) return;
    const next = parseOutline(text);
    if (keepId) next[0].id = keepId;
    const last = next[next.length - 1];
    commit(next, last.id, (readOutlineTimestamp(last.text)?.text ?? last.text).length);
  }

  useEffect(() => {
    const target = container.current;
    if (!target) return;
    const handleSelection = (event: Event) => {
      const detail = (event as CustomEvent<OutlineSelectionRequest>).detail;
      if (!detail) return;
      if (detail.command === "selectAll") {
        selectAll();
        detail.handled = true;
      } else if (allSelectedRef.current) {
        const text = outlineMarkdown(nodes);
        if (detail.command === "getSelection") {
          detail.handled = true;
          detail.selectionText = text;
        } else if (
          detail.command === "replaceSelection" &&
          !readOnly &&
          onChange &&
          (detail.expectedText === undefined || detail.expectedText === text)
        ) {
          detail.handled = true;
          replaceSelection(detail.text ?? "");
        }
      }
    };
    target.addEventListener(OUTLINE_SELECTION_EVENT, handleSelection);
    return () => target.removeEventListener(OUTLINE_SELECTION_EVENT, handleSelection);
  }, [nodes, readOnly, onChange]);

  function changeNode(id: string, changes: Partial<OutlineNode>) {
    commit(nodes.map((node) => (node.id === id ? { ...node, ...changes } : node)));
  }

  function changeNodeKind(node: OutlineNode, kind: OutlineNode["kind"]) {
    if (node.kind === kind) return;
    commit(
      nodes.map((item) => (item.id === node.id ? { ...item, kind, checked: false } : item)),
      node.id,
      elements.current.get(node.id)?.selectionStart ?? 0,
    );
  }

  useEffect(() => {
    const target = container.current;
    if (!target || readOnly) return;
    const handleTypeRequest = (event: Event) => {
      const detail = (event as CustomEvent<OutlineNodeTypeRequest>).detail;
      if (!detail || (detail.kind !== "bullet" && detail.kind !== "todo")) return;
      const node = nodes.find((item) => item.id === detail.nodeId);
      if (node) changeNodeKind(node, detail.kind);
    };
    target.addEventListener(OUTLINE_NODE_TYPE_EVENT, handleTypeRequest);
    return () => target.removeEventListener(OUTLINE_NODE_TYPE_EVENT, handleTypeRequest);
  }, [nodes, onChange, readOnly]);

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>, node: OutlineNode) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const element = event.currentTarget;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const timestamp = readOutlineTimestamp(node.text);
    const prefixLength = timestamp?.prefix.length ?? 0;
    const text = timestamp?.text ?? node.text;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.shiftKey && !event.altKey && event.key.toLowerCase() === "t") {
      event.preventDefault();
      event.stopPropagation();
      changeNodeKind(node, node.kind === "todo" ? "bullet" : "todo");
    } else if (modifier && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey || event.key.toLowerCase() === "y") restore(future, past);
      else restore(past, future);
    } else if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      commit(indentNode(nodes, node.id, event.shiftKey), node.id, start);
    } else if (event.key === "Enter" && !event.shiftKey && !modifier && !event.altKey) {
      event.preventDefault();
      if (!text && node.depth > 0) commit(indentNode(nodes, node.id, true), node.id);
      else {
        const result = splitNode(nodes, node.id, start + prefixLength, end + prefixLength);
        commit(result.nodes, result.focusId);
      }
    } else if (
      event.key === "Backspace" &&
      start === 0 &&
      end === 0 &&
      !modifier &&
      !event.altKey
    ) {
      if (timestamp) {
        event.preventDefault();
        commit(
          nodes.map((item) => (item.id === node.id ? { ...item, text } : item)),
          node.id,
        );
      } else {
        const result = mergeNode(nodes, node.id);
        if (result) {
          event.preventDefault();
          const previous = result.nodes.find((item) => item.id === result.focusId)!;
          commit(
            result.nodes,
            result.focusId,
            result.cursor - (readOutlineTimestamp(previous.text)?.prefix.length ?? 0),
          );
        }
      }
    } else if (
      (event.key === "ArrowUp" && start === 0 && end === 0) ||
      (event.key === "ArrowDown" && start === text.length && end === start)
    ) {
      const index = visible.findIndex((item) => item.id === node.id);
      const target = visible[index + (event.key === "ArrowUp" ? -1 : 1)];
      if (target) {
        event.preventDefault();
        focusNode(
          target.id,
          event.key === "ArrowUp"
            ? (readOutlineTimestamp(target.text)?.text ?? target.text).length
            : 0,
        );
      }
    } else if (modifier && event.key === "Enter" && node.kind === "todo") {
      event.preventDefault();
      changeNode(node.id, { checked: !node.checked });
    }
  }

  return (
    <div
      ref={container}
      data-outline-editor="true"
      data-outline-editable={readOnly ? undefined : "true"}
      data-note-selectable="true"
      data-outline-selection={allSelected ? "all" : undefined}
      tabIndex={-1}
      className={`font-body min-w-0 ${className}`}
      style={{ fontSize }}
      onMouseDownCapture={(event) => {
        if (event.button === 0) {
          clearSelection();
          if (readOnly && !(event.target instanceof HTMLInputElement))
            container.current?.focus({ preventScroll: true });
        }
      }}
      onKeyDownCapture={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        const modifier = event.ctrlKey || event.metaKey;
        if (modifier && !event.altKey && event.key.toLowerCase() === "a") {
          event.preventDefault();
          event.stopPropagation();
          selectAll();
        } else if (allSelectedRef.current && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          clearSelection();
          window.getSelection()?.removeAllRanges();
          const input = document.activeElement;
          if (input instanceof HTMLTextAreaElement)
            input.setSelectionRange(input.selectionEnd, input.selectionEnd);
        } else if (
          allSelectedRef.current &&
          !readOnly &&
          (event.key === "Delete" ||
            event.key === "Backspace" ||
            (!modifier && event.key === "Enter"))
        ) {
          event.preventDefault();
          event.stopPropagation();
          replaceSelection("");
        } else if (
          allSelectedRef.current &&
          !modifier &&
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
        ) {
          clearSelection();
        }
      }}
      onCopy={(event) => {
        if (!allSelectedRef.current) return;
        event.preventDefault();
        event.clipboardData.setData("text/plain", outlineMarkdown(nodes));
      }}
      onCut={(event) => {
        if (!allSelectedRef.current) return;
        event.preventDefault();
        event.clipboardData.setData("text/plain", outlineMarkdown(nodes));
        if (!readOnly) replaceSelection("");
      }}
      onPasteCapture={(event) => {
        if (!allSelectedRef.current || readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        replaceSelection(event.clipboardData.getData("text/plain"));
      }}
    >
      {visible.map((node) => {
        const index = nodes.findIndex((item) => item.id === node.id);
        const hasChildren = subtreeEnd(nodes, index) > index + 1;
        const timestamp = readOutlineTimestamp(node.text);
        const text = timestamp?.text ?? node.text;
        return (
          <div
            key={node.id}
            data-outline-row={node.id}
            data-outline-kind={node.kind}
            data-outline-selected={allSelected ? "true" : undefined}
            className="group flex items-start gap-1 min-w-0 py-0.5"
            style={{ marginLeft: `${node.depth * 20}px` }}
          >
            {!readOnly && (
              <button
                type="button"
                disabled={!hasChildren}
                aria-label={
                  node.collapsed
                    ? t("outline.expand", { defaultValue: "展开子节点" })
                    : t("outline.collapse", { defaultValue: "折叠子节点" })
                }
                aria-expanded={hasChildren ? !node.collapsed : undefined}
                onClick={() => changeNode(node.id, { collapsed: !node.collapsed })}
                className={`w-4 h-7 shrink-0 text-ink-ghost cursor-pointer disabled:cursor-default ${hasChildren ? "" : "invisible"}`}
              >
                <span aria-hidden="true">{node.collapsed ? "▸" : "▾"}</span>
              </button>
            )}
            {node.kind === "todo" ? (
              <span className="outline-task-marker w-3 h-7 shrink-0 flex items-center justify-center">
                <input
                  type="checkbox"
                  aria-label={t("outline.complete", { defaultValue: "完成待办" })}
                  checked={node.checked}
                  disabled={!onChange}
                  onChange={(event) => changeNode(node.id, { checked: event.target.checked })}
                  className="note-task-checkbox shrink-0 cursor-pointer"
                />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="w-3 leading-7 shrink-0 text-ink-faint text-center"
              >
                •
              </span>
            )}
            <div className={`flex-1 min-w-0 ${readOnly ? "" : "flex items-start gap-1"}`}>
              {readOnly ? (
                <div
                  className={`flex-1 min-w-0 whitespace-pre-wrap break-words leading-7 ${node.kind === "todo" && node.checked ? "line-through opacity-50" : ""}`}
                >
                  {timestamp && (
                    <>
                      <OutlineTimestamp timestamp={timestamp} />{" "}
                    </>
                  )}
                  {text || "\u00a0"}
                </div>
              ) : (
                <>
                  {timestamp && <OutlineTimestamp timestamp={timestamp} className="mt-1" />}
                  <textarea
                    ref={(element) => {
                      if (element) elements.current.set(node.id, element);
                      else elements.current.delete(node.id);
                    }}
                    data-outline-node={node.id}
                    aria-keyshortcuts="Control+Shift+T Meta+Shift+T"
                    aria-label={t("outline.item", { defaultValue: "大纲条目" })}
                    rows={1}
                    value={text}
                    onChange={(event) => {
                      if (allSelectedRef.current) {
                        replaceSelection(event.target.value, node.id);
                        return;
                      }
                      commit(
                        nodes.map((item) =>
                          item.id === node.id
                            ? { ...item, text: (timestamp?.prefix ?? "") + event.target.value }
                            : item,
                        ),
                        undefined,
                        0,
                        node.id,
                      );
                    }}
                    onKeyDown={(event) => handleKey(event, node)}
                    onPaste={(event) => {
                      const text = event.clipboardData.getData("text/plain");
                      if (!text.includes("\n")) return;
                      event.preventDefault();
                      const prefixLength = timestamp?.prefix.length ?? 0;
                      const start = event.currentTarget.selectionStart + prefixLength;
                      const end = event.currentTarget.selectionEnd + prefixLength;
                      const pasted = parseOutline(text);
                      pasted[0] = { ...node, text: node.text.slice(0, start) + pasted[0].text };
                      for (let i = 1; i < pasted.length; i++) pasted[i].depth += node.depth;
                      pasted[pasted.length - 1].text += node.text.slice(end);
                      const insertAt = subtreeEnd(nodes, index);
                      const next = [
                        ...nodes.slice(0, index),
                        pasted[0],
                        ...nodes.slice(index + 1, insertAt),
                        ...pasted.slice(1),
                        ...nodes.slice(insertAt),
                      ];
                      commit(
                        next,
                        pasted[pasted.length - 1].id,
                        (
                          readOutlineTimestamp(pasted[pasted.length - 1].text)?.text ??
                          pasted[pasted.length - 1].text
                        ).length,
                      );
                    }}
                    placeholder={t("outline.placeholder", { defaultValue: "写一项……" })}
                    className={`block flex-1 w-full min-w-0 resize-none overflow-hidden bg-transparent leading-7 text-ink-soft placeholder:text-ink-ghost/40 outline-none ${node.kind === "todo" && node.checked ? "line-through opacity-50" : ""}`}
                    style={{ fontSize: "inherit" }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          onClick={() => {
            const node = newOutlineNode();
            commit([...nodes, node], node.id);
          }}
          className="mt-2 ml-5 text-[11px] text-ink-ghost hover:text-bamboo cursor-pointer"
        >
          {t("outline.add", { defaultValue: "+ 添加条目" })}
        </button>
      )}
    </div>
  );
});
