import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  createTagCompletionEdit,
  getTagCompletionContext,
  getTagSuggestions,
  type TagCompletionContext,
  type TagCompletionEdit,
} from "../features/notes/tagCompletion";
import { useViewportPopupPosition, type PopupPosition } from "./popupPosition";
import { getTextareaCaretPosition } from "./textareaCaret";
import { extractNoteTags } from "../features/notes/tags";

interface SuggestionState {
  textarea: HTMLTextAreaElement;
  value: string;
  caret: number;
  context: TagCompletionContext;
  matches: string[];
  anchor: PopupPosition;
  active: number;
}

interface TagAutocompleteProps {
  tags: readonly string[];
  onComplete: (textarea: HTMLTextAreaElement, edit: TagCompletionEdit) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TagAutocomplete({
  tags,
  onComplete,
  children,
  className = "",
  disabled = false,
}: TagAutocompleteProps) {
  const { t } = useTranslation();
  const listId = useId();
  const container = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const dismissed = useRef<{ textarea: HTMLTextAreaElement; value: string; caret: number } | null>(
    null,
  );
  const [state, setState] = useState<SuggestionState | null>(null);
  const { popupRef, popupPosition } = useViewportPopupPosition(
    state?.anchor ?? null,
    state?.matches.join("\n"),
  );

  function update(target: EventTarget | null) {
    if (!(target instanceof HTMLTextAreaElement) || !container.current?.contains(target)) return;
    const context =
      !disabled && !target.disabled && !target.readOnly && !composing.current
        ? getTagCompletionContext(target.value, target.selectionStart, target.selectionEnd)
        : null;
    const draftTags = context
      ? extractNoteTags(target.value.slice(0, context.start) + target.value.slice(context.end))
      : [];
    const matches = context ? getTagSuggestions([...tags, ...draftTags], context.query) : [];
    if (
      !context ||
      matches.length === 0 ||
      (dismissed.current?.textarea === target &&
        dismissed.current.value === target.value &&
        dismissed.current.caret === target.selectionStart)
    ) {
      setState(null);
      return;
    }
    dismissed.current = null;
    const anchor = getTextareaCaretPosition(target, context.start);
    setState((current) => ({
      textarea: target,
      value: target.value,
      caret: target.selectionStart,
      context,
      matches,
      anchor,
      active:
        current?.textarea === target && current.context.query === context.query
          ? Math.min(current.active, matches.length - 1)
          : 0,
    }));
  }

  function dismiss() {
    if (state)
      dismissed.current = {
        textarea: state.textarea,
        value: state.textarea.value,
        caret: state.textarea.selectionStart,
      };
    setState(null);
  }

  function choose(tag: string) {
    if (!state || composing.current || disabled) return;
    const textarea = state.textarea;
    const context = getTagCompletionContext(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
    );
    if (!context || textarea.disabled || textarea.readOnly) {
      dismiss();
      return;
    }
    const edit = createTagCompletionEdit(textarea.value, context, tag);
    dismissed.current = { textarea, value: edit.value, caret: edit.cursor };
    setState(null);
    onComplete(textarea, edit);
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (
      !state ||
      event.target !== state.textarea ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      composing.current ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setState(
        (current) =>
          current && {
            ...current,
            active: (current.active + direction + current.matches.length) % current.matches.length,
          },
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      choose(state.matches[state.active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }
  }

  useEffect(() => {
    if (!state) return;
    const textarea = state.textarea;
    const attributes = {
      "aria-autocomplete": "list",
      "aria-controls": listId,
      "aria-activedescendant": `${listId}-${state.active}`,
    };
    const previous = Object.fromEntries(
      Object.keys(attributes).map((key) => [key, textarea.getAttribute(key)]),
    );
    for (const [key, value] of Object.entries(attributes)) textarea.setAttribute(key, value);
    const refreshPosition = () => {
      const anchor = getTextareaCaretPosition(textarea, state.context.start);
      setState((current) => (current?.textarea === textarea ? { ...current, anchor } : current));
    };
    window.addEventListener("resize", refreshPosition);
    window.addEventListener("scroll", refreshPosition, true);
    const onWindowBlur = () => setState(null);
    window.addEventListener("blur", onWindowBlur);
    document.getElementById(`${listId}-${state.active}`)?.scrollIntoView?.({ block: "nearest" });
    return () => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === null) textarea.removeAttribute(key);
        else textarea.setAttribute(key, value);
      }
      window.removeEventListener("resize", refreshPosition);
      window.removeEventListener("scroll", refreshPosition, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [state?.textarea, state?.context.start, state?.active, listId]);

  useEffect(() => {
    if (disabled) setState(null);
  }, [disabled]);

  return (
    <div
      ref={container}
      className={className}
      onInputCapture={(event) => update(event.target)}
      onSelectCapture={(event) => update(event.target)}
      onFocusCapture={(event) => update(event.target)}
      onClickCapture={(event) => update(event.target)}
      onKeyUpCapture={(event) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) update(event.target);
      }}
      onKeyDownCapture={handleKey}
      onCompositionStartCapture={() => {
        composing.current = true;
        setState(null);
      }}
      onCompositionEndCapture={(event) => {
        composing.current = false;
        update(event.target);
      }}
      onBlurCapture={() => {
        composing.current = false;
        dismiss();
      }}
    >
      {children}
      {state &&
        createPortal(
          <div
            ref={popupRef}
            id={listId}
            role="listbox"
            aria-label={t("tags.suggestions")}
            title={t("tags.suggestions")}
            className="popup-menu fixed z-[9999] py-1 rounded-lg border border-paper-deep/40 bg-cloud/95 backdrop-blur-sm overflow-y-auto select-none"
            style={{
              left: popupPosition?.x ?? state.anchor.x,
              top: popupPosition?.y ?? state.anchor.y,
              width: "min(220px, calc(100vw - 8px))",
              maxHeight: "min(240px, calc(100vh - 8px))",
            }}
          >
            {state.matches.map((tag, index) => (
              <button
                key={tag}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === state.active}
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(tag)}
                onMouseEnter={() => setState((current) => current && { ...current, active: index })}
                className={`block w-full px-3 py-1.5 text-left text-[12px] font-body truncate cursor-pointer ${index === state.active ? "bg-bamboo-mist/70 text-bamboo" : "text-ink-soft hover:bg-paper-warm/70"}`}
              >
                #{tag}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
