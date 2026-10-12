import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createNote, getErrorMessage, getNote, listNotes, updateNote } from "../features/notes/api";
import { useImagePaste } from "../features/images/useImagePaste";
import { useImageBaseDir } from "../features/images/useImageBaseDir";
import { reportInstallPreparation } from "../features/update/api";
import type { UpdateInstallPrepareRequest } from "../features/update/types";
import { showToast } from "./Toast";
import type { Note, NoteMetadata } from "../features/notes/types";
import { metadataFromNote } from "../features/notes/noteUtils";
import { toggleMarkdownTask } from "../features/markdown/taskLists";
import { handleListEnter } from "../features/markdown/listContinuation";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { confirm } from "@tauri-apps/plugin-dialog";
import { newOutlineNode } from "../features/notes/outline";
import { newTimestampOutlineNode } from "../features/notes/outlineTimestamp";
import { normalizeQuickInsertKind } from "../features/settings/quickInsertKind";
import {
  animateCurrentWindowBounds,
  closeCurrentWindow,
  getCurrentWindowBounds,
  recycleCurrentNotepad,
  setCurrentWindowAlwaysOnTop,
  showCurrentWindow,
  startCurrentWindowDrag,
  startCurrentWindowDragWithOffset,
  startCurrentWindowResize,
} from "../features/windows/controls";
import type { ResizeDirection } from "../features/windows/controls";
import { getConfig } from "../features/settings/api";
import {
  DEFAULT_TILE_LINE_HEIGHT,
  normalizeTileLineHeight,
} from "../features/settings/tileLineHeight";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
  resolveTileColor,
  resolveNoteTileColor,
  normalizeTileColorPresets,
  normalizeTileBackgroundTransparency,
} from "../features/settings/tileColor";
import type { TileColorMode } from "../features/settings/types";
import {
  shouldEnterPadFromTileOnDoubleClick,
  shouldReturnToTileAfterManualSave,
} from "../features/windows/noteSurfaceSavePolicy";
import {
  NOTE_SURFACE_ACTION_EVENT,
  surfaceActionFromEvent,
} from "../features/windows/surfaceActions";
import {
  NOTE_SURFACE_MODE_EVENT,
  getSurfaceTargetBounds,
  surfaceModeFromEvent,
} from "../features/windows/surfaceMode";
import type { NoteSurfaceMode } from "../features/windows/surfaceMode";
import {
  emitTileWindowUnpinned,
  tileSurfaceModeUnpinNoteId,
} from "../features/windows/tileWindowEvents";
import { NotepadOpenPanel } from "./NotepadOpenPanel";
import { Tile } from "./Tile";
import { getTextareaCaretPosition } from "./textareaCaret";
import { NoteColorPicker } from "./NoteColorPicker";
import { OutlineEditor, type OutlineEditorHandle } from "./OutlineEditor";
import { useOutlineNote } from "../features/notes/useOutlineNote";
import { setTileEdgeHide } from "../features/windows/tileEdgeHide";
import { useTileEdgeHide } from "../features/windows/useTileEdgeHide";

type OpenMode = "new" | "open";
type NotePadStatus = "empty" | "opened" | "saved" | "dirty" | "saveFailed" | "copied";

interface NotePadProps {
  initialNoteId?: string;
  initialSurfaceMode?: NoteSurfaceMode;
  initialAutoSave?: boolean;
  initialTileColor?: string;
}

const surfaceResizeHandles: Array<{
  direction: ResizeDirection;
  className: string;
  size: string;
}> = [
  {
    direction: "NorthWest",
    size: "w-8 h-8",
    className: "top-0 left-0 cursor-nwse-resize",
  },
  {
    direction: "NorthEast",
    size: "w-5 h-5",
    className: "top-0 right-0 cursor-nesw-resize",
  },
  {
    direction: "SouthWest",
    size: "w-8 h-8",
    className: "bottom-0 left-0 cursor-nesw-resize",
  },
  {
    direction: "SouthEast",
    size: "w-5 h-5",
    className: "bottom-0 right-0 cursor-nwse-resize",
  },
];

function isTileControlDoubleClickTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button,input,textarea,select,a,[data-surface-resize-handle="true"]'))
  );
}

const TILE_DRAG_START_THRESHOLD_PX = 5;

function SurfaceResizeHandles() {
  return (
    <>
      {surfaceResizeHandles.map((handle) => (
        <div
          key={handle.direction}
          aria-hidden="true"
          data-surface-resize-handle="true"
          data-resize-direction={handle.direction}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            void startCurrentWindowResize(handle.direction).catch(() => undefined);
          }}
          className={`absolute ${handle.size} opacity-0 ${handle.className}`}
        />
      ))}
    </>
  );
}

export function NotePad({
  initialNoteId,
  initialSurfaceMode = "pad",
  initialAutoSave = true,
  initialTileColor = DEFAULT_TILE_COLOR,
}: NotePadProps) {
  const { t } = useTranslation();
  const [surfaceMode, setSurfaceMode] = useState<NoteSurfaceMode>(initialSurfaceMode);
  const pinnedNoteIdRef = useRef(initialSurfaceMode === "tile" ? initialNoteId : undefined);
  const returningToTileRef = useRef(false);
  const draftSessionRef = useRef(0);
  const [mode, setMode] = useState<OpenMode>("new");
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<NotePadStatus>("empty");
  const [noteSurfaceAutoSave, setNoteSurfaceAutoSave] = useState(initialAutoSave);
  const [tileColorRaw, setTileColorRaw] = useState(normalizeTileColor(initialTileColor));
  const [tileColorMode, setTileColorMode] = useState<TileColorMode>("system");
  const [tileColorPresets, setTileColorPresets] = useState(() => normalizeTileColorPresets());
  const [surfaceFontSize, setSurfaceFontSize] = useState(14);
  const [tileLineHeight, setTileLineHeight] = useState(DEFAULT_TILE_LINE_HEIGHT);
  const [tileBackgroundTransparency, setTileBackgroundTransparency] = useState(0);
  const [compactNoteList, setCompactNoteList] = useState(false);
  const [tileRenderMarkdown, setTileRenderMarkdown] = useState(false);
  const [tileDoubleClickToEdit, setTileDoubleClickToEdit] = useState(false);
  const [tileSaveReturnsToPin, setTileSaveReturnsToPin] = useState(false);
  const [tileColor, setTileColor] = useState(() =>
    resolveTileColor("system", normalizeTileColor(initialTileColor)),
  );
  const [isExiting, setIsExiting] = useState(false);
  const [tileContentCopied, setTileContentCopied] = useState(false);
  const [tileClipboardPending, setTileClipboardPending] = useState(false);
  const tileClipboardPendingRef = useRef(false);
  const tileClipboardMountedRef = useRef(true);
  const [tileTimestampPending, setTileTimestampPending] = useState(false);
  const tileTimestampPendingRef = useRef(false);
  const pendingOutlineFocusRef = useRef<string | null>(null);
  const quickInsertKindsRef = useRef({
    timestamp: "bullet" as "bullet" | "todo",
    clipboard: "bullet" as "bullet" | "todo",
  });
  const [noteTileColor, setNoteTileColor] = useState<string | undefined>();
  const [noteTileAccentColor, setNoteTileAccentColor] = useState<string | undefined>();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const closeColorPicker = useCallback(() => setColorPickerOpen(false), []);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const outlineEditorRef = useRef<OutlineEditorHandle>(null);
  const outline = useOutlineNote((value) => {
    contentValueRef.current = value;
    setContent(value);
    statusRef.current = "dirty";
    setStatus("dirty");
  });
  const focusContent = useCallback(() => {
    const active = document.activeElement;
    if (
      active === contentRef.current ||
      (active instanceof HTMLTextAreaElement &&
        outline.snapshot.current.outlineNodes.some(
          (node) => node.id === active.dataset.outlineNode,
        ))
    )
      return;
    if (outline.snapshot.current.noteType === "list") outlineEditorRef.current?.focus();
    else contentRef.current?.focus();
  }, [outline.snapshot]);
  const tileDragIntentRef = useRef<{ x: number; y: number } | null>(null);
  const windowLabelRef = useRef("");
  const statusRef = useRef<NotePadStatus>("empty");
  const contentValueRef = useRef(content);
  contentValueRef.current = content;
  const titleValueRef = useRef(title);
  titleValueRef.current = title;
  const editingNoteIdRef = useRef(editingNoteId);
  editingNoteIdRef.current = editingNoteId;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const noteSyncEpochRef = useRef(0);
  const tileColorModeRef = useRef(tileColorMode);
  tileColorModeRef.current = tileColorMode;
  const tileColorRawRef = useRef(tileColorRaw);
  tileColorRawRef.current = tileColorRaw;
  const isStandby = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("standby") === "1",
  );
  // 窗口位于池中（standby 预热或已回收隐藏）时为 true：
  // 休眠期间跳过笔记列表拉取，激活时统一刷新
  const dormantRef = useRef(isStandby.current);
  useTileEdgeHide(surfaceMode === "tile" && !isExiting && !dormantRef.current);
  const hasEnteredOnce = useRef(false);
  const statusLabel = useMemo<Record<NotePadStatus, string>>(
    () => ({
      empty: t("notepad.status.empty", { defaultValue: "空" }),
      opened: t("notepad.status.opened", { defaultValue: "已打开" }),
      saved: t("notepad.status.saved", { defaultValue: "已保存" }),
      dirty: t("notepad.status.unsaved", { defaultValue: "未保存" }),
      saveFailed: t("notepad.status.saveFailed", { defaultValue: "保存失败" }),
      copied: t("notepad.status.copied", { defaultValue: "已复制" }),
    }),
    [t],
  );
  statusRef.current = status;

  useEffect(() => {
    tileClipboardMountedRef.current = true;
    return () => {
      tileClipboardMountedRef.current = false;
    };
  }, []);

  const refreshNotes = useCallback(async () => {
    // 池中休眠的窗口不拉取笔记列表，激活时会统一刷新
    if (dormantRef.current) return [] as NoteMetadata[];
    const loadedNotes = await listNotes();
    setNotes(loadedNotes);
    return loadedNotes;
  }, []);

  const applyNote = useCallback(
    (note: Note) => {
      draftSessionRef.current += 1;
      if (pinnedNoteIdRef.current !== note.id) pinnedNoteIdRef.current = undefined;
      noteSyncEpochRef.current += 1;
      setNoteTileColor(note.tileColor);
      setNoteTileAccentColor(note.tileAccentColor);
      setColorPickerOpen(false);
      editingNoteIdRef.current = note.id;
      titleValueRef.current = note.title;
      contentValueRef.current = note.content;
      setEditingNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      outline.load(note);
      setMode("new");
      setStatus("opened");
    },
    [outline.load],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [loadedConfig] = await Promise.all([getConfig(), refreshNotes()]);
        if (!cancelled) {
          setNoteSurfaceAutoSave(loadedConfig.noteSurfaceAutoSave);
          setSurfaceFontSize(loadedConfig.surfaceFontSize ?? 14);
          setTileLineHeight(normalizeTileLineHeight(loadedConfig.tileLineHeight));
          setTileBackgroundTransparency(
            normalizeTileBackgroundTransparency(loadedConfig.tileBackgroundTransparency),
          );
          setCompactNoteList(loadedConfig.compactNoteList ?? false);
          setTileRenderMarkdown(loadedConfig.tileRenderMarkdown ?? false);
          setTileDoubleClickToEdit(loadedConfig.tileDoubleClickToEdit ?? false);
          setTileSaveReturnsToPin(loadedConfig.tileSaveReturnsToPin ?? false);
          quickInsertKindsRef.current = {
            timestamp: normalizeQuickInsertKind(loadedConfig.timestampInsertKind),
            clipboard: normalizeQuickInsertKind(loadedConfig.clipboardInsertKind),
          };
          setTileColorRaw(normalizeTileColor(loadedConfig.tileColor));
          setTileColorMode(loadedConfig.tileColorMode ?? "system");
          setTileColorPresets(normalizeTileColorPresets(loadedConfig.tileColorPresets));
          setTileColor(
            resolveTileColor(loadedConfig.tileColorMode ?? "system", loadedConfig.tileColor),
          );
        }
        if (initialNoteId) {
          const note = await getNote(initialNoteId);
          if (!cancelled) applyNote(note);
        }
      } catch (error) {
        if (!cancelled) showToast(getErrorMessage(error));
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyNote, initialNoteId, refreshNotes]);

  useEffect(() => {
    let cancelled = false;
    const unlisten = listen("notes-changed", () => {
      const epoch = ++noteSyncEpochRef.current;
      const noteId = editingNoteIdRef.current;
      void refreshNotes().catch(() => undefined);
      if (!noteId || dormantRef.current) return;

      const canSync = () =>
        !cancelled &&
        !dormantRef.current &&
        noteSyncEpochRef.current === epoch &&
        editingNoteIdRef.current === noteId &&
        statusRef.current !== "dirty" &&
        statusRef.current !== "saveFailed";

      void (async () => {
        // The backend emits before the save command resolves. Let this window's
        // pending saves settle before reloading, so its own event stays clean.
        await saveQueueRef.current;
        if (!canSync()) return;
        const queue = saveQueueRef.current;
        const titleSnapshot = titleValueRef.current;
        const contentSnapshot = contentValueRef.current;
        const outlineSnapshot = outline.snapshot.current;
        const note = await getNote(noteId);
        if (
          !canSync() ||
          saveQueueRef.current !== queue ||
          titleValueRef.current !== titleSnapshot ||
          contentValueRef.current !== contentSnapshot ||
          outline.snapshot.current !== outlineSnapshot
        )
          return;

        titleValueRef.current = note.title;
        contentValueRef.current = note.content;
        statusRef.current = "saved";
        setTitle(note.title);
        setContent(note.content);
        outline.load(note);
        setNoteTileColor(note.tileColor);
        setNoteTileAccentColor(note.tileAccentColor);
        setStatus("saved");
      })().catch(() => undefined);
    });
    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
  }, [refreshNotes, outline.load, outline.snapshot]);

  useEffect(() => {
    const unlisten = listen<NoteMetadata>("note-color-changed", (event) => {
      if (event.payload.id === editingNoteIdRef.current) {
        setNoteTileColor(event.payload.tileColor);
        setNoteTileAccentColor(event.payload.tileAccentColor);
      }
      setNotes((current) =>
        current.map((note) =>
          note.id === event.payload.id
            ? {
                ...note,
                tileColor: event.payload.tileColor,
                tileAccentColor: event.payload.tileAccentColor,
              }
            : note,
        ),
      );
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (isStandby.current) return;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          hasEnteredOnce.current = true;
          void showCurrentWindow()
            .then(focusContent)
            .catch(() => undefined);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<{
      tileColor?: string;
      tileColorMode?: TileColorMode;
      tileColorPresets?: string[];
      surfaceFontSize?: number;
      tileLineHeight?: number;
      tileBackgroundTransparency?: number;
      compactNoteList?: boolean;
      tileRenderMarkdown?: boolean;
      tileDoubleClickToEdit?: boolean;
      tileSaveReturnsToPin?: boolean;
      timestampInsertKind?: "bullet" | "todo";
      clipboardInsertKind?: "bullet" | "todo";
    }>("config-changed", (event) => {
      const mode = event.payload.tileColorMode ?? tileColorModeRef.current;
      const raw = event.payload.tileColor ?? tileColorRawRef.current;
      setTileColorMode(mode);
      setTileColorRaw(normalizeTileColor(raw));
      setTileColor(resolveTileColor(mode, raw));
      if (event.payload.tileColorPresets != null)
        setTileColorPresets(normalizeTileColorPresets(event.payload.tileColorPresets));
      if (event.payload.surfaceFontSize != null) setSurfaceFontSize(event.payload.surfaceFontSize);
      if (event.payload.tileLineHeight != null)
        setTileLineHeight(normalizeTileLineHeight(event.payload.tileLineHeight));
      if (event.payload.tileBackgroundTransparency != null)
        setTileBackgroundTransparency(
          normalizeTileBackgroundTransparency(event.payload.tileBackgroundTransparency),
        );
      if (event.payload.compactNoteList != null) setCompactNoteList(event.payload.compactNoteList);
      if (event.payload.tileRenderMarkdown != null)
        setTileRenderMarkdown(event.payload.tileRenderMarkdown);
      if (event.payload.tileDoubleClickToEdit != null)
        setTileDoubleClickToEdit(event.payload.tileDoubleClickToEdit);
      if (event.payload.timestampInsertKind != null)
        quickInsertKindsRef.current.timestamp = normalizeQuickInsertKind(
          event.payload.timestampInsertKind,
        );
      if (event.payload.clipboardInsertKind != null)
        quickInsertKindsRef.current.clipboard = normalizeQuickInsertKind(
          event.payload.clipboardInsertKind,
        );
      if (event.payload.tileSaveReturnsToPin != null)
        setTileSaveReturnsToPin(event.payload.tileSaveReturnsToPin);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (tileColorMode !== "system") return;
    const observer = new MutationObserver(() => {
      setTileColor(resolveTileColor("system", tileColorRaw));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [tileColorMode, tileColorRaw]);

  useEffect(() => {
    let myLabel = "";
    try {
      myLabel = getCurrentWindow().label;
      windowLabelRef.current = myLabel;
    } catch {
      // not in Tauri environment (tests)
    }

    const unlisten = listen<string>("notepad:activate", (event) => {
      if (event.payload !== myLabel) return;

      isStandby.current = false;
      dormantRef.current = false;
      hasEnteredOnce.current = true;
      noteSyncEpochRef.current += 1;
      editingNoteIdRef.current = null;
      pinnedNoteIdRef.current = undefined;
      draftSessionRef.current += 1;
      setEditingNoteId(null);
      setNoteTileColor(undefined);
      setNoteTileAccentColor(undefined);
      setColorPickerOpen(false);
      setTitle("");
      setContent("");
      outline.load();
      setMode("new");
      setStatus("empty");
      setIsExiting(false);
      setSurfaceMode("pad");
      void refreshNotes().catch(() => undefined);
      void showCurrentWindow()
        .then(focusContent)
        .catch(() => undefined);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [refreshNotes]);

  const saveNote = useCallback(async () => {
    const run = saveQueueRef.current.then(async () => {
      const noteId = editingNoteIdRef.current;
      const titleSnapshot = titleValueRef.current;
      const contentSnapshot = contentValueRef.current;
      const outlineSnapshot = outline.snapshot.current;
      const existingCategory = notesRef.current.find((n) => n.id === noteId)?.category ?? "";
      const request = {
        title: titleSnapshot,
        content: contentSnapshot,
        ...outlineSnapshot,
        category: existingCategory,
      };
      const note = noteId ? await updateNote(noteId, request) : await createNote(request);

      editingNoteIdRef.current = note.id;
      setEditingNoteId(note.id);
      setNotes((current) => {
        const metadata = metadataFromNote(note);
        const exists = current.some((item) => item.id === note.id);
        const next = exists
          ? current.map((item) => (item.id === note.id ? metadata : item))
          : [metadata, ...current];
        return [...next].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });
      const contentChanged =
        contentValueRef.current !== contentSnapshot ||
        titleValueRef.current !== titleSnapshot ||
        outline.snapshot.current !== outlineSnapshot;
      statusRef.current = contentChanged ? "dirty" : "saved";
      setStatus(contentChanged ? "dirty" : "saved");
      return note;
    });
    saveQueueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const savePendingChanges = useCallback(async () => {
    await saveQueueRef.current;
    while (statusRef.current === "dirty" || statusRef.current === "saveFailed") {
      await saveNote();
    }
  }, [saveNote]);

  // 通过 ref 持有最新的 saveNote，让下方的 Tauri 监听只注册一次，
  // 避免每次输入（content 变化）都注销再重注册事件监听
  const saveNoteRef = useRef(saveNote);
  saveNoteRef.current = saveNote;

  useEffect(() => {
    const unlisten = listen<UpdateInstallPrepareRequest>("update://prepare-install", (event) => {
      const respond = async () => {
        const windowLabel = windowLabelRef.current || "notepad";
        if (statusRef.current !== "dirty") {
          await reportInstallPreparation(event.payload.requestId, windowLabel, "ready");
          return;
        }

        try {
          await saveNoteRef.current();
          await reportInstallPreparation(event.payload.requestId, windowLabel, "ready");
        } catch (error) {
          setStatus("saveFailed");
          showToast(getErrorMessage(error));
          await reportInstallPreparation(
            event.payload.requestId,
            windowLabel,
            "failed",
            getErrorMessage(error),
          );
        }
      };

      void respond().catch(async (error) => {
        await reportInstallPreparation(
          event.payload.requestId,
          windowLabelRef.current || "notepad",
          "failed",
          getErrorMessage(error),
        ).catch(() => undefined);
      });
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const hasDraftContent = useCallback(
    () => Boolean(editingNoteId || title.trim() || content.trim()),
    [content, editingNoteId, title],
  );

  const imageBaseDir = useImageBaseDir();

  const ensureNoteSaved = useCallback(async (): Promise<string | null> => {
    if (editingNoteId) return editingNoteId;
    try {
      const note = await saveNote();
      return note.id;
    } catch {
      return null;
    }
  }, [editingNoteId, saveNote]);

  const {
    handlePaste: imagePasteHandler,
    handleDrop: imageDropHandler,
    handleDragOver: imageDragOverHandler,
  } = useImagePaste({
    noteId: editingNoteId,
    textareaRef: contentRef,
    setContent,
    markDirty: () => setStatus("dirty"),
    onEnsureNoteSaved: ensureNoteSaved,
    onError: showToast,
    t,
  });

  const tileNoteId = editingNoteId ?? initialNoteId ?? "";

  const switchSurfaceMode = useCallback(
    async (nextMode: NoteSurfaceMode) => {
      if (nextMode === surfaceMode) return;
      // Restore expanded native coordinates before reading or animating bounds.
      await setTileEdgeHide(false);
      const unpinnedNoteId = tileSurfaceModeUnpinNoteId(surfaceMode, nextMode, tileNoteId);
      if (nextMode === "tile" || surfaceMode === "tile") {
        pinnedNoteIdRef.current = editingNoteIdRef.current ?? initialNoteId;
      }
      setSurfaceMode(nextMode);
      if (unpinnedNoteId) {
        void emitTileWindowUnpinned(unpinnedNoteId).catch(() => undefined);
      }

      try {
        const currentBounds = await getCurrentWindowBounds();
        const targetBounds = getSurfaceTargetBounds(nextMode, currentBounds);

        if (nextMode === "tile") {
          await setCurrentWindowAlwaysOnTop(true);
        }

        await animateCurrentWindowBounds(targetBounds);
      } catch (error) {
        showToast(getErrorMessage(error));
      }
    },
    [initialNoteId, surfaceMode, tileNoteId],
  );

  useEffect(() => {
    function handleSurfaceModeRequest(event: Event) {
      const nextMode = surfaceModeFromEvent(event);
      if (!nextMode) return;
      void switchSurfaceMode(nextMode);
    }

    window.addEventListener(NOTE_SURFACE_MODE_EVENT, handleSurfaceModeRequest);
    return () => {
      window.removeEventListener(NOTE_SURFACE_MODE_EVENT, handleSurfaceModeRequest);
    };
  }, [switchSurfaceMode]);

  useEffect(() => {
    if (surfaceMode !== "tile") return;
    void setCurrentWindowAlwaysOnTop(true).catch(() => undefined);
  }, [surfaceMode]);

  const handleSave = useCallback(
    async ({ isAutoSave = false }: { isAutoSave?: boolean } = {}) => {
      try {
        const savedNote = await saveNote();
        if (
          shouldReturnToTileAfterManualSave({
            enabled: tileSaveReturnsToPin,
            noteId: savedNote.id,
            currentMode: surfaceMode,
            isAutoSave,
          })
        ) {
          await switchSurfaceMode("tile");
        }
      } catch (error) {
        setStatus("saveFailed");
        showToast(getErrorMessage(error));
      }
    },
    [saveNote, surfaceMode, switchSurfaceMode, tileSaveReturnsToPin],
  );

  // 全局监听（Ctrl+S、表面动作）只注册一次，通过 ref 取最新回调，
  // 避免回调依赖 content 导致每次输入都重绑监听
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const clearPendingTileDrag = useCallback(() => {
    tileDragIntentRef.current = null;
  }, []);

  const canReturnToTile =
    surfaceMode === "pad" &&
    mode === "new" &&
    Boolean(editingNoteId && pinnedNoteIdRef.current === editingNoteId);

  useEffect(() => clearPendingTileDrag, [clearPendingTileDrag]);

  useEffect(() => {
    if (!(surfaceMode === "tile" && tileDoubleClickToEdit) && !canReturnToTile) {
      clearPendingTileDrag();
      return undefined;
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const intent = tileDragIntentRef.current;
      if (!intent) return;
      // Pointer left the window during a missed mouseup, etc. — drop the stale intent.
      if ((event.buttons & 1) === 0) {
        clearPendingTileDrag();
        return;
      }

      const distanceX = event.screenX - intent.x;
      const distanceY = event.screenY - intent.y;
      const distance = Math.hypot(distanceX, distanceY);
      if (distance < TILE_DRAG_START_THRESHOLD_PX) return;

      tileDragIntentRef.current = null;
      // Compensate for the deadzone drift before handing off to the OS drag.
      void startCurrentWindowDragWithOffset(distanceX, distanceY).catch(() => undefined);
    };

    const handleMouseUp = () => clearPendingTileDrag();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canReturnToTile, clearPendingTileDrag, surfaceMode, tileDoubleClickToEdit]);

  const handleTileDoubleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (
        !shouldEnterPadFromTileOnDoubleClick(
          tileDoubleClickToEdit,
          isTileControlDoubleClickTarget(event.target),
        )
      ) {
        return;
      }

      clearPendingTileDrag();
      event.preventDefault();
      event.stopPropagation();
      setMode("new");
      void switchSurfaceMode("pad");
    },
    [clearPendingTileDrag, switchSurfaceMode, tileDoubleClickToEdit],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void handleSaveRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenNote = async (noteId: string) => {
    try {
      await savePendingChanges();
      const note = await getNote(noteId);
      applyNote(note);
      await switchSurfaceMode("pad");
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  };

  const handlePin = async () => {
    try {
      await savePendingChanges();
      if (!editingNoteIdRef.current) {
        await saveNote();
      }
      await switchSurfaceMode("tile");
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  };

  const handlePadDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!canReturnToTile || event.button !== 0 || returningToTileRef.current) return;
    const target = event.target;
    // The text editor fills the body, so its area below the last line is also
    // whitespace. Mirror its wrapping and scroll position before accepting it.
    const isBodyWhitespace =
      target instanceof HTMLTextAreaElement &&
      target === contentRef.current &&
      (!target.value || event.clientY > getTextareaCaretPosition(target, target.value.length).y);
    if (
      !(target instanceof Element) ||
      target.closest(
        'button,input,select,a,[role="status"],[role="menu"],[role="listbox"],[data-outline-row],[data-surface-resize-handle="true"]',
      ) ||
      (target.closest("textarea") && !isBodyWhitespace) ||
      (!isBodyWhitespace &&
        Array.from(target.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
        ))
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearPendingTileDrag();
    returningToTileRef.current = true;
    const noteId = editingNoteIdRef.current;
    const session = draftSessionRef.current;
    const returnToTile = async () => {
      try {
        await savePendingChanges();
        if (editingNoteIdRef.current !== noteId || draftSessionRef.current !== session) return;
        await switchSurfaceMode("tile");
      } catch (error) {
        setStatus("saveFailed");
        showToast(getErrorMessage(error));
      } finally {
        returningToTileRef.current = false;
      }
    };
    void returnToTile();
  };

  const handleClose = useCallback(async () => {
    try {
      await savePendingChanges();
      setIsExiting(true);
      if (surfaceMode === "tile") {
        await closeCurrentWindow();
        return;
      }

      // 回收进窗口池：窗口只是被隐藏，立刻清空编辑器状态并进入休眠，
      // 避免上一篇笔记全文和笔记列表驻留在隐藏窗口的内存里
      dormantRef.current = true;
      await recycleCurrentNotepad();
      setEditingNoteId(null);
      setNoteTileColor(undefined);
      setNoteTileAccentColor(undefined);
      setColorPickerOpen(false);
      setTitle("");
      setContent("");
      setNotes([]);
      outline.load();
      setMode("new");
      setStatus("empty");
      setIsExiting(false);
    } catch (error) {
      dormantRef.current = false;
      setIsExiting(false);
      showToast(getErrorMessage(error));
    }
  }, [surfaceMode, savePendingChanges]);

  const copyTileContent = useCallback(async () => {
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) {
        throw new Error(t("notepad.error.copyUnsupported", { defaultValue: "当前环境不支持复制" }));
      }
      await clipboard.writeText(content);
      setTileContentCopied(true);
      if (statusRef.current !== "dirty" && statusRef.current !== "saveFailed") {
        setStatus("copied");
      }
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }, [content, t]);

  const appendTileClipboard = useCallback(async () => {
    if (tileClipboardPendingRef.current || outline.snapshot.current.noteType !== "list") return;
    tileClipboardPendingRef.current = true;
    setTileClipboardPending(true);
    const noteId = editingNoteIdRef.current;
    const isCurrentList = () =>
      tileClipboardMountedRef.current &&
      !dormantRef.current &&
      editingNoteIdRef.current === noteId &&
      outline.snapshot.current.noteType === "list";
    try {
      const text = (await readText()).replace(/\r\n?/g, "\n");
      if (!isCurrentList()) return;
      if (!text.trim()) {
        showToast(
          t("notepad.clipboard.empty", { defaultValue: "剪贴板中没有可追加的文字" }),
          "info",
        );
        return;
      }
      const count = Array.from(text).length;
      if (
        count > 100 &&
        !(await confirm(
          t("notepad.clipboard.confirmLongText", {
            count,
            defaultValue:
              "剪贴板中的文字有 {{count}} 字，超过 100 字，可能是误操作。仍要追加为一个条目吗？",
          }),
          {
            title: t("notepad.clipboard.confirmTitle", { defaultValue: "确认追加条目" }),
            kind: "warning",
            okLabel: t("notepad.clipboard.append", { defaultValue: "追加" }),
            cancelLabel: t("common.cancel", { defaultValue: "取消" }),
          },
        ))
      )
        return;
      if (!isCurrentList()) return;
      const node = { ...newOutlineNode(text), kind: quickInsertKindsRef.current.clipboard };
      outline.changeNodes([...outline.snapshot.current.outlineNodes, node]);
      await handleSaveRef.current({ isAutoSave: true });
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      tileClipboardPendingRef.current = false;
      setTileClipboardPending(false);
    }
  }, [outline.changeNodes, outline.snapshot, t]);

  const appendTileTimestamp = useCallback(async () => {
    if (
      tileTimestampPendingRef.current ||
      tileClipboardPendingRef.current ||
      outline.snapshot.current.noteType !== "list"
    )
      return;
    tileTimestampPendingRef.current = true;
    setTileTimestampPending(true);
    const noteId = editingNoteIdRef.current;
    const session = draftSessionRef.current;
    const node = newTimestampOutlineNode();
    try {
      setMode("new");
      await switchSurfaceMode("pad");
      if (
        !tileClipboardMountedRef.current ||
        dormantRef.current ||
        editingNoteIdRef.current !== noteId ||
        draftSessionRef.current !== session ||
        outline.snapshot.current.noteType !== "list"
      )
        return;
      pendingOutlineFocusRef.current = node.id;
      node.kind = quickInsertKindsRef.current.timestamp;
      outline.changeNodes([...outline.snapshot.current.outlineNodes, node]);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      tileTimestampPendingRef.current = false;
      setTileTimestampPending(false);
    }
  }, [outline.changeNodes, outline.snapshot, switchSurfaceMode]);

  useEffect(() => {
    const id = pendingOutlineFocusRef.current;
    if (surfaceMode !== "pad" || !id || !outline.nodes.some((node) => node.id === id)) return;
    outlineEditorRef.current?.focusNode(id);
    pendingOutlineFocusRef.current = null;
  }, [surfaceMode, outline.nodes]);

  useEffect(() => {
    if (!tileContentCopied) return;
    const timer = window.setTimeout(() => setTileContentCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [tileContentCopied]);

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;
  const copyTileContentRef = useRef(copyTileContent);
  copyTileContentRef.current = copyTileContent;
  const switchSurfaceModeRef = useRef(switchSurfaceMode);
  switchSurfaceModeRef.current = switchSurfaceMode;

  const handleTaskToggle = useCallback((offset: number, checked: boolean) => {
    const next = toggleMarkdownTask(contentValueRef.current, offset, checked);
    if (next === contentValueRef.current) return;
    contentValueRef.current = next;
    setContent(next);
    statusRef.current = "dirty";
    setStatus("dirty");
    void handleSaveRef.current({ isAutoSave: true });
  }, []);

  useEffect(() => {
    function handleSurfaceActionRequest(event: Event) {
      const action = surfaceActionFromEvent(event);
      if (!action) return;

      if (action === "copy") {
        void copyTileContentRef.current();
        return;
      }

      if (action === "save") {
        void handleSaveRef.current();
        return;
      }

      if (action === "color") {
        const openPicker = async () => {
          if (!editingNoteIdRef.current) await saveNoteRef.current();
          setColorPickerOpen(true);
        };
        void openPicker().catch((error) => showToast(getErrorMessage(error)));
        return;
      }

      if (action === "close") {
        void handleCloseRef.current();
        return;
      }

      if (action === "switchToOpen") {
        setMode("open");
        void refreshNotes().catch(() => undefined);
        return;
      }

      setMode("new");
      void switchSurfaceModeRef.current("pad");
    }

    window.addEventListener(NOTE_SURFACE_ACTION_EVENT, handleSurfaceActionRequest);
    return () => {
      window.removeEventListener(NOTE_SURFACE_ACTION_EVENT, handleSurfaceActionRequest);
    };
  }, [refreshNotes]);

  useEffect(() => {
    if (!noteSurfaceAutoSave || status !== "dirty") {
      return undefined;
    }
    if (!hasDraftContent()) return undefined;

    const timer = window.setTimeout(() => {
      void handleSave({ isAutoSave: true });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    content,
    title,
    outline.nodes,
    outline.noteType,
    handleSave,
    hasDraftContent,
    noteSurfaceAutoSave,
    status,
  ]);

  const handleDrag = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button,input,textarea,select,a,[data-note-selectable]")) return;

    if ((surfaceMode === "tile" && tileDoubleClickToEdit) || canReturnToTile) {
      if (event.button !== 0 || event.detail > 1) return;
      clearPendingTileDrag();
      tileDragIntentRef.current = {
        x: event.screenX,
        y: event.screenY,
      };
      return;
    }

    void startCurrentWindowDrag().catch(() => undefined);
  };

  const isTile = surfaceMode === "tile";
  const tileTitle = title.trim();
  const enterClass = hasEnteredOnce.current ? "" : "animate-window-enter";
  const surfaceWrapperClassName = `w-full h-screen flex flex-col bg-transparent p-0 ${isExiting ? "animate-window-exit" : enterClass}`;
  const padSurfaceClassName =
    "app-surface-frame relative noise-bg w-full h-full min-h-0 bg-cloud overflow-hidden flex flex-col flex-1 border border-paper-deep/70 shadow-[0_1px_10px_rgba(26,26,24,0.06)] transition-all duration-200 ease-out";

  return (
    <div className={surfaceWrapperClassName}>
      {colorPickerOpen && editingNoteId && (
        <NoteColorPicker
          key={editingNoteId}
          noteId={editingNoteId}
          color={noteTileColor}
          presets={tileColorPresets}
          defaultColor={tileColor}
          onClose={closeColorPicker}
        />
      )}
      {isTile ? (
        <Tile
          title={tileTitle || undefined}
          content={content}
          outlineNodes={outline.noteType === "list" ? outline.nodes : undefined}
          onOutlineChange={outline.changeNodes}
          color={resolveNoteTileColor(noteTileColor, tileColor)}
          accentColor={noteTileAccentColor}
          backgroundTransparency={tileBackgroundTransparency}
          fontSize={surfaceFontSize}
          lineHeight={tileLineHeight}
          renderMarkdown={
            tileRenderMarkdown ||
            /^[ \t]*(?:>[ \t]*)*(?:[-+*]|\d+[.)])[ \t]+\[[ xX]\](?:[ \t]+|$)/m.test(content)
          }
          imageBaseDir={imageBaseDir ?? undefined}
          onTaskToggle={handleTaskToggle}
          width="100%"
          className="h-full cursor-default"
          contentBottomPadding={44}
          data-surface-mode={surfaceMode}
          data-context-menu="tile"
          data-note-id={tileNoteId}
          onMouseDown={handleDrag}
          onDoubleClick={handleTileDoubleClick}
        >
          <button
            type="button"
            aria-label="取消钉屏"
            title="取消钉屏"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => void handleClose()}
            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full text-ink-ghost/70 hover:text-red-400 hover:bg-danger-bg/80 transition-colors cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={
              outline.noteType === "list"
                ? t("notepad.clipboard.appendTooltip", { defaultValue: "从剪贴板追加条目" })
                : tileContentCopied
                  ? statusLabel.copied
                  : t("contextMenu.tile.copy", { defaultValue: "复制" })
            }
            title={
              outline.noteType === "list"
                ? t("notepad.clipboard.appendTooltip", { defaultValue: "从剪贴板追加条目" })
                : tileContentCopied
                  ? statusLabel.copied
                  : t("contextMenu.tile.copy", { defaultValue: "复制" })
            }
            onMouseDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onClick={() =>
              void (outline.noteType === "list" ? appendTileClipboard() : copyTileContent())
            }
            disabled={outline.noteType === "list" && (tileClipboardPending || tileTimestampPending)}
            className={`absolute bottom-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-lg bg-cloud/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
              outline.noteType !== "list" && tileContentCopied
                ? "text-bamboo"
                : "text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/80"
            }`}
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {outline.noteType === "list" ? (
                <>
                  <rect x="7" y="2" width="10" height="4" rx="1" />
                  <path d="M17 4h2a2 2 0 0 1 2 2v6M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7M18 14v8M14 18h8" />
                </>
              ) : tileContentCopied ? (
                <path d="m5 12 4 4L19 6" />
              ) : (
                <>
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </>
              )}
            </svg>
          </button>
          {outline.noteType === "list" && (
            <button
              type="button"
              aria-label={t("notepad.timestamp.add", { defaultValue: "新建时间记录" })}
              title={t("notepad.timestamp.add", { defaultValue: "新建时间记录" })}
              onMouseDown={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onClick={() => void appendTileTimestamp()}
              disabled={tileClipboardPending || tileTimestampPending}
              className="absolute bottom-2 right-11 z-10 w-7 h-7 flex items-center justify-center rounded-lg bg-cloud/80 text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a9 9 0 1 0 0 18M12 7v5l3 2M19 3v6M16 6h6" />
              </svg>
            </button>
          )}
          <SurfaceResizeHandles />
        </Tile>
      ) : (
        <div
          className={padSurfaceClassName}
          data-surface-mode={surfaceMode}
          data-context-menu="pad"
          data-pad-mode={mode}
          onDoubleClick={handlePadDoubleClick}
        >
          <>
            <div
              className="flex items-center justify-between gap-2 min-w-0 px-4 pt-1 pb-0 cursor-default shrink-0"
              onMouseDown={handleDrag}
            >
              <span role="status" aria-live="polite" className="sr-only">
                {statusLabel[status]}
              </span>

              <span
                data-pad-note-title="true"
                data-note-selectable="true"
                title={title.trim() || t("common.untitledNote", { defaultValue: "无标题笔记" })}
                className="min-w-0 flex-1 truncate text-[11px] font-display text-ink-soft select-text"
              >
                {title.trim() || t("common.untitledNote", { defaultValue: "无标题笔记" })}
              </span>

              <div className="ml-auto shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => void handlePin()}
                  className="group w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer text-ink-ghost hover:text-ink-faint hover:bg-paper-warm"
                  title={t("notepad.tooltip.pinToTile", { defaultValue: "转为磁贴" })}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 17v5" />
                    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                  </svg>
                </button>

                <button
                  onClick={() => void handleClose()}
                  className="group w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:bg-danger-bg hover:text-red-400 transition-all duration-200 cursor-pointer"
                  title={t("notepad.tooltip.close", { defaultValue: "关闭" })}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mx-4 mt-1 h-px bg-paper-deep/50" />

            {mode === "new" ? (
              <div
                data-pad-editor-body="true"
                className="px-4 pt-2 pb-2 flex flex-col flex-1 min-h-0"
              >
                {outline.noteType === "list" ? (
                  <div className="flex-1 min-h-0 overflow-y-auto pb-2">
                    <OutlineEditor
                      ref={outlineEditorRef}
                      nodes={outline.nodes}
                      onChange={outline.changeNodes}
                      fontSize={surfaceFontSize}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    <textarea
                      ref={contentRef}
                      data-tab-indent="true"
                      value={content}
                      onChange={(event) => {
                        setContent(event.target.value);
                        setStatus("dirty");
                      }}
                      onPaste={imagePasteHandler}
                      onDrop={imageDropHandler}
                      onDragOver={imageDragOverHandler}
                      onKeyDown={(event) =>
                        handleListEnter(event, setContent, () => setStatus("dirty"))
                      }
                      placeholder={t("notepad.placeholder.content", { defaultValue: "写点什么……" })}
                      className="w-full flex-1 min-h-0 pb-2 leading-relaxed text-ink-soft font-body placeholder:text-ink-ghost/50"
                      style={{
                        fontSize: `${surfaceFontSize}px`,
                        tabSize: `var(--tab-indent-size, 2)`,
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <NotepadOpenPanel
                notes={notes}
                compact={compactNoteList}
                onOpenNote={(noteId) => void handleOpenNote(noteId)}
              />
            )}
          </>
          <SurfaceResizeHandles />
        </div>
      )}
    </div>
  );
}
