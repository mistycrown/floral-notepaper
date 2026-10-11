import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_TILE_COLOR_PRESETS,
  normalizeTileColorPresets,
  parseHexColor,
  tileTextColor,
} from "../features/settings/tileColor";
import { HexColorInput } from "./HexColorInput";

interface TileColorPresetsEditorProps {
  value?: string[];
  onChange: (presets: string[]) => void;
}

export function TileColorPresetsEditor({ value, onChange }: TileColorPresetsEditorProps) {
  const { t } = useTranslation();
  const presets = normalizeTileColorPresets(value);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState<string>(presets[0]);
  const activeColor = presets[active];
  useEffect(() => {
    setDraft(activeColor);
  }, [active, activeColor]);
  const parsed = parseHexColor(draft);
  const apply = () => {
    if (!parsed) return;
    onChange(presets.map((color, index) => (index === active ? parsed : color)));
    setDraft(parsed);
  };
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] text-ink-faint">{t("settings.tileColorPresets.label")}</h3>
        <button
          type="button"
          onClick={() => {
            onChange([...DEFAULT_TILE_COLOR_PRESETS]);
            setDraft(DEFAULT_TILE_COLOR_PRESETS[active]);
          }}
          className="text-[11px] text-bamboo cursor-pointer"
        >
          {t("settings.tileColorPresets.reset")}
        </button>
      </div>
      <div
        role="group"
        aria-label={t("settings.tileColorPresets.label")}
        className="grid grid-cols-6 gap-2"
      >
        {presets.map((color, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={active === index}
            aria-label={t("settings.tileColorPresets.slot", { index: index + 1 }) + ` ${color}`}
            onClick={() => setActive(index)}
            className="h-8 rounded border border-black/10 cursor-pointer text-[11px] font-mono"
            style={{
              backgroundColor: color,
              color: tileTextColor(color),
              outline: active === index ? "2px solid var(--color-bamboo)" : undefined,
              outlineOffset: 2,
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <label className="block text-[11px] text-ink-faint">
        {t("settings.tileColorPresets.slot", { index: active + 1 })}
      </label>
      <div className="flex items-start gap-2">
        <HexColorInput
          value={draft}
          onChange={setDraft}
          label={t("settings.tileColorPresets.slot", { index: active + 1 })}
          onApply={apply}
        />
        <button
          type="button"
          disabled={!parsed || parsed === activeColor}
          onClick={apply}
          className="h-8 px-2 shrink-0 rounded bg-bamboo text-cloud text-[11px] cursor-pointer disabled:opacity-40"
        >
          {t("noteColor.apply")}
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-ink-faint">
        {t("settings.tileColorPresets.hint")}
      </p>
    </section>
  );
}
