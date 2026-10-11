import { useId } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_TILE_COLOR, parseHexColor } from "../features/settings/tileColor";

interface HexColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  onApply?: () => void;
}

export function HexColorInput({ value, onChange, label, disabled, onApply }: HexColorInputProps) {
  const { t } = useTranslation();
  const id = useId();
  const parsed = parseHexColor(value);
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={parsed ?? DEFAULT_TILE_COLOR}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="w-8 h-8 shrink-0 rounded border border-paper-deep/40 bg-transparent cursor-pointer"
        />
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          maxLength={7}
          aria-label={`${label} (${t("noteColor.hexLabel")})`}
          aria-invalid={!parsed}
          aria-describedby={!parsed ? `${id}-error` : undefined}
          placeholder="#RRGGBB"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              if (parsed && !disabled) onApply?.();
            }
          }}
          className={`w-full min-w-0 h-8 px-2 rounded-lg bg-paper-warm/70 border text-[12px] font-mono text-ink-soft outline-none ${parsed ? "border-paper-deep/40 focus:border-bamboo" : "border-red-400"}`}
        />
      </div>
      {!parsed && (
        <p id={`${id}-error`} role="status" className="text-[10px] text-red-400 mt-1">
          {t("noteColor.invalidHex")}
        </p>
      )}
    </div>
  );
}
