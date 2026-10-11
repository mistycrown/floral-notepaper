import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { getConfig } from "../features/settings/api";
import type { AppConfig } from "../features/settings/types";
import { requestSurfaceAction } from "../features/windows/surfaceActions";
import { getTileContextMenuItems } from "../features/windows/tileContextMenu";
import { taskListInsertion } from "../features/markdown/taskLists";
import { POPUP_VIEWPORT_MARGIN, useViewportPopupPosition } from "./popupPosition";

interface MenuState {
  x: number;
  y: number;
  hasSelection: boolean;
  type: "edit" | "tile" | "pad" | "preview";
  padMode?: string;
  canInsertTask: boolean;
}

const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const { popupRef: menuRef, popupPosition: menuPosition } = useViewportPopupPosition(
    menu,
    menu?.type,
  );
  const editableTargetRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLElement | null>(
    null,
  );
  const tileCtrlCloseRef = useRef(true);
  const selectionRef = useRef("");
  const previewTargetRef = useRef<HTMLElement | null>(null);
  const tileContextMenuItems = useMemo(() => getTileContextMenuItems(t), [t]);

  useEffect(() => {
    getConfig()
      .then((c) => {
        tileCtrlCloseRef.current = c.tileCtrlClose ?? true;
      })
      .catch(() => {});
    const unlisten = listen<AppConfig>("config-changed", (event) => {
      tileCtrlCloseRef.current = event.payload.tileCtrlClose ?? true;
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const isEditable =
        target.tagName === "TEXTAREA" ||
        (target instanceof HTMLInputElement &&
          ["text", "search", "email", "url", "tel", "password", "number"].includes(target.type)) ||
        target.isContentEditable;
      const tileTarget = target.closest<HTMLElement>('[data-context-menu="tile"]');
      const padTarget = target.closest<HTMLElement>('[data-context-menu="pad"]');
      const previewTarget = target.closest<HTMLElement>(".markdown-selectable");

      if (!isEditable && !tileTarget && !padTarget && !previewTarget) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      if (tileTarget && event.ctrlKey && tileCtrlCloseRef.current) {
        requestSurfaceAction("close");
        return;
      }
      let selection = window.getSelection()?.toString() || "";
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        selection = target.value.slice(target.selectionStart ?? 0, target.selectionEnd ?? 0);
      }
      selectionRef.current = selection;
      previewTargetRef.current = previewTarget;

      if (tileTarget) {
        editableTargetRef.current = null;
        setMenuClosing(false);
        setMenu({
          x: event.clientX,
          y: event.clientY,
          hasSelection: selection.length > 0,
          type: "tile",
          canInsertTask: false,
        });
        return;
      }

      editableTargetRef.current = isEditable ? target : null;
      setMenuClosing(false);
      setMenu({
        x: event.clientX,
        y: event.clientY,
        hasSelection: selection.length > 0,
        type: isEditable ? "edit" : padTarget ? "pad" : "preview",
        padMode: padTarget?.dataset.padMode,
        canInsertTask:
          target instanceof HTMLTextAreaElement && !target.disabled && !target.readOnly,
      });
    }

    function handleClick() {
      setMenuClosing(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuClosing(true);
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!menuClosing || !menu) return;
    const timer = window.setTimeout(() => {
      setMenu(null);
      setMenuClosing(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [menuClosing, menu]);

  const dismissMenu = useCallback(() => {
    setMenuClosing(true);
  }, []);

  const runCommand = async (command: string) => {
    const target = editableTargetRef.current;

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      const value = target.value;
      const selected = value.slice(start, end);
      const before = value.slice(0, start);
      const after = value.slice(end);

      target.focus();

      const nativeSetter = target instanceof HTMLTextAreaElement ? textareaSetter : inputSetter;
      const setValue = (newValue: string, cursorPos: number) => {
        nativeSetter?.call(target, newValue);
        target.selectionStart = target.selectionEnd = cursorPos;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      };

      switch (command) {
        case "copy":
          if (selected) await writeText(selected);
          break;
        case "cut":
          if (selected) {
            await writeText(selected);
            setValue(before + after, start);
          }
          break;
        case "paste": {
          const text = await readText();
          setValue(before + text + after, start + text.length);
          break;
        }
        case "selectAll":
          target.select();
          break;
        case "insertTask": {
          const insertion = taskListInsertion(value, start, end);
          setValue(insertion.value, insertion.cursor);
          break;
        }
      }
    } else {
      if (command === "copy" && selectionRef.current) {
        await writeText(selectionRef.current);
      } else if (command === "selectAll" && previewTargetRef.current) {
        const range = document.createRange();
        range.selectNodeContents(previewTargetRef.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      } else {
        target?.focus();
        document.execCommand(command);
      }
    }

    dismissMenu();
  };

  const runSurfaceAction = (action: (typeof tileContextMenuItems)[number]["action"]) => {
    requestSurfaceAction(action);
    dismissMenu();
  };

  const items = useMemo(
    () =>
      menu
        ? menu.type === "tile"
          ? tileContextMenuItems.map((item) => ({
              ...item,
              shortcut: "",
              action: () =>
                item.action === "copy" && menu.hasSelection
                  ? runCommand("copy")
                  : runSurfaceAction(item.action),
              disabled: false,
            }))
          : [
              ...(menu.type === "edit"
                ? [
                    {
                      label: t("contextMenu.edit.cut", { defaultValue: "剪切" }),
                      shortcut: "Ctrl+X",
                      action: () => runCommand("cut"),
                      disabled: !menu.hasSelection,
                    },
                    {
                      label: t("contextMenu.edit.copy", { defaultValue: "复制" }),
                      shortcut: "Ctrl+C",
                      action: () => runCommand("copy"),
                      disabled: !menu.hasSelection,
                    },
                    {
                      label: t("contextMenu.edit.paste", { defaultValue: "粘贴" }),
                      shortcut: "Ctrl+V",
                      action: () => runCommand("paste"),
                      disabled: false,
                    },
                  ]
                : menu.type === "preview"
                  ? [
                      {
                        label: t("contextMenu.edit.copy", { defaultValue: "复制" }),
                        shortcut: "Ctrl+C",
                        action: () => runCommand("copy"),
                        disabled: !menu.hasSelection,
                      },
                    ]
                  : []),
              ...(menu.type === "edit" || menu.type === "preview"
                ? [
                    { separator: true as const },
                    {
                      label: t("contextMenu.edit.selectAll", { defaultValue: "全选" }),
                      shortcut: "Ctrl+A",
                      action: () => runCommand("selectAll"),
                      disabled: false,
                    },
                  ]
                : []),
              ...(menu.canInsertTask
                ? [
                    { separator: true as const },
                    {
                      label: t("contextMenu.edit.insertTask", { defaultValue: "插入待办列表" }),
                      shortcut: "- [ ]",
                      action: () => runCommand("insertTask"),
                      disabled: false,
                    },
                  ]
                : []),
              ...(menu.padMode
                ? [
                    {
                      label: t("noteColor.title"),
                      shortcut: "",
                      action: () => runSurfaceAction("color"),
                      disabled: false,
                    },
                    ...(menu.type === "edit" ? [{ separator: true as const }] : []),
                    {
                      label:
                        menu.padMode === "open"
                          ? t("notepad.tab.edit", { defaultValue: "编辑" })
                          : t("notepad.tab.open", { defaultValue: "打开" }),
                      shortcut: "",
                      action: () =>
                        runSurfaceAction(menu.padMode === "open" ? "switchToPad" : "switchToOpen"),
                      disabled: false,
                    },
                  ]
                : []),
            ]
        : [],
    [menu, runCommand, t, tileContextMenuItems],
  );

  return (
    <>
      {children}
      {menu && (
        <div
          ref={menuRef}
          data-edge-hide-block="true"
          className={`fixed z-[9999] min-w-[152px] py-1.5 bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg overflow-x-hidden overflow-y-auto select-none ${menuClosing ? "animate-menu-exit" : "animate-menu-enter"}`}
          style={{
            left: menuPosition?.x ?? menu.x,
            top: menuPosition?.y ?? menu.y,
            maxWidth: `calc(100vw - ${POPUP_VIEWPORT_MARGIN * 2}px)`,
            maxHeight: `calc(100vh - ${POPUP_VIEWPORT_MARGIN * 2}px)`,
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {items.map((item, index) =>
            "separator" in item ? (
              <div key={index} className="mx-2 my-1 h-px bg-paper-deep/40" />
            ) : (
              <button
                key={item.label}
                onClick={() => void item.action()}
                disabled={item.disabled}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-body transition-colors cursor-pointer disabled:text-ink-ghost/40 disabled:cursor-default disabled:hover:bg-transparent ${
                  "tone" in item && item.tone === "danger"
                    ? "text-red-400 hover:bg-danger-bg hover:text-red-500"
                    : "text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo"
                }`}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] text-ink-ghost/60 font-mono ml-6">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}
