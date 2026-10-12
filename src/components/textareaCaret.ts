import type { PopupPosition } from "./popupPosition";

// Mirror the textarea's typography and wrapping to locate a token inside scrolled text.
export function getTextareaCaretPosition(
  textarea: HTMLTextAreaElement,
  offset: number,
): PopupPosition {
  const rect = textarea.getBoundingClientRect();
  const computed = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  for (const property of [
    "boxSizing",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "wordSpacing",
    "textIndent",
    "textTransform",
    "tabSize",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderStyle",
  ]) {
    const cssProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    mirror.style.setProperty(cssProperty, computed.getPropertyValue(cssProperty));
  }
  Object.assign(mirror.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    overflow: "hidden",
    width: `${
      textarea.clientWidth
        ? computed.boxSizing === "border-box"
          ? textarea.clientWidth +
            (parseFloat(computed.borderLeftWidth) || 0) +
            (parseFloat(computed.borderRightWidth) || 0)
          : textarea.clientWidth -
            (parseFloat(computed.paddingLeft) || 0) -
            (parseFloat(computed.paddingRight) || 0)
        : rect.width
    }px`,
  });
  mirror.textContent = textarea.value.slice(0, offset);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(offset) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const lineHeight = parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) || 14) * 1.9;
  const position = {
    x: Math.min(
      rect.right,
      Math.max(rect.left, rect.left + marker.offsetLeft - textarea.scrollLeft),
    ),
    y: Math.min(
      rect.bottom,
      Math.max(rect.top, rect.top + marker.offsetTop - textarea.scrollTop + lineHeight),
    ),
  };
  mirror.remove();
  return position;
}
