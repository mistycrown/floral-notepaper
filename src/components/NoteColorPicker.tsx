import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getErrorMessage, setNoteColor } from "../features/notes/api";
import {
  normalizeTileColor,
  normalizeTileColorPresets,
  parseHexColor,
  tileTextColor,
} from "../features/settings/tileColor";
import { HexColorInput } from "./HexColorInput";

interface NoteColorPickerProps {
  noteId: string;
  color?: string;
  defaultColor?: string;
  presets?: string[];
  onClose: () => void;
}

export function NoteColorPicker({
  noteId,
  color,
  defaultColor,
  presets,
  onClose,
}: NoteColorPickerProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(color);
  const [custom, setCustom] = useState(normalizeTileColor(color ?? defaultColor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const colors = normalizeTileColorPresets(presets);
  const parsedCustom = parseHexColor(custom);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (!busy.current) onClose();
      }
      if (event.key === "Tab") {
        const buttons = panelRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled)",
        );
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panelRef.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === panelRef.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    setSelected(color);
  }, [color]);
  const choose = async (next: string | null) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const note = await setNoteColor(noteId, next);
      setSelected(note.tileColor);
      setCustom(normalizeTileColor(note.tileColor ?? defaultColor));
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const previewColor = parsedCustom ?? normalizeTileColor(selected ?? defaultColor);
  return (
    <div
      data-edge-hide-block="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/20 p-3"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !busy.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-color-title"
        className="w-full max-w-[280px] max-h-full overflow-y-auto rounded-xl bg-cloud p-3 shadow-xl border border-paper-deep/50 outline-none"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 id="note-color-title" className="text-[13px] text-ink font-medium">
            {t("noteColor.title")}
          </h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label={t("noteColor.close")}
            className="w-7 h-7 rounded text-ink-faint hover:bg-paper-warm cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2 mb-3" role="group" aria-label={t("noteColor.title")}>
          {colors.map((preset, index) => (
            <button
              type="button"
              key={index}
              disabled={saving}
              aria-label={t("settings.tileColorPresets.slot", { index: index + 1 }) + ` ${preset}`}
              aria-pressed={selected === preset}
              onClick={() => void choose(preset)}
              className="h-7 rounded border border-black/10 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: preset,
                color: tileTextColor(preset),
                outline: selected === preset ? "2px solid var(--color-bamboo)" : undefined,
                outlineOffset: 2,
              }}
            >
              {selected === preset ? "✓" : ""}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2 mb-3">
          <HexColorInput
            value={custom}
            onChange={setCustom}
            disabled={saving}
            label={t("noteColor.custom")}
            onApply={() => {
              if (parsedCustom) void choose(parsedCustom);
            }}
          />
          <button
            type="button"
            disabled={saving || !parsedCustom}
            onClick={() => {
              if (parsedCustom) void choose(parsedCustom);
            }}
            className="h-8 px-2 shrink-0 rounded bg-bamboo text-cloud text-[11px] cursor-pointer disabled:opacity-50"
          >
            {t("noteColor.apply")}
          </button>
        </div>
        <div
          className="rounded-lg px-3 py-2 mb-2 text-[13px]"
          style={{ backgroundColor: previewColor, color: tileTextColor(previewColor) }}
        >
          {t("noteColor.preview")}
        </div>
        <button
          type="button"
          disabled={saving || !selected}
          onClick={() => void choose(null)}
          className="text-[11px] text-bamboo cursor-pointer disabled:opacity-40"
        >
          {t("noteColor.reset")}
        </button>
        <p className="text-[10px] leading-relaxed text-ink-faint mt-2">{t("noteColor.hint")}</p>
        {saving && (
          <p role="status" className="text-[11px] text-ink-faint mt-1">
            {t("noteColor.saving")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-[11px] text-red-400 mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
