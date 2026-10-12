import { useTranslation } from "react-i18next";
import type { NoteType } from "../features/notes/types";

export function NoteTypeSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: NoteType;
  onChange: (type: NoteType) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <select
      aria-label={t("outline.noteType", { defaultValue: "便签类型" })}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as NoteType)}
      className="h-7 max-w-24 rounded-lg px-1 text-[11px] text-ink-faint bg-paper-warm cursor-pointer disabled:opacity-40"
    >
      <option value="text">{t("outline.text", { defaultValue: "文本" })}</option>
      <option value="list">{t("outline.list", { defaultValue: "列表" })}</option>
    </select>
  );
}
