import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { HexColorInput } from "./HexColorInput";
import { NoteColorPicker } from "./NoteColorPicker";
import { TileColorPresetsEditor } from "./TileColorPresetsEditor";

test("hex input retains incomplete text, exposes invalid state, and does not replace it with a fallback", () => {
  const html = renderToStaticMarkup(
    <HexColorInput value="#12" label="Custom" onChange={() => {}} />,
  );
  expect(html).toContain('type="text"');
  expect(html).toContain('value="#12"');
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain('placeholder="#RRGGBB"');
  const valid = renderToStaticMarkup(
    <HexColorInput value="#abc" label="Custom" onChange={() => {}} />,
  );
  expect(valid).toContain('value="#aabbcc"');
  expect(valid).toContain('value="#abc"');
  expect(valid).toContain('aria-invalid="false"');
});

test("settings palette and note quick picker use the same edited slots including duplicates", () => {
  const presets = Array(12).fill("#112233");
  const settings = renderToStaticMarkup(
    <TileColorPresetsEditor value={presets} onChange={() => {}} />,
  );
  const picker = renderToStaticMarkup(
    <NoteColorPicker noteId="example" presets={presets} onClose={() => {}} />,
  );
  for (const html of [settings, picker]) {
    expect(html.match(/background-color:#112233/g)).toHaveLength(12);
    expect(html.match(/aria-pressed=/g)).toHaveLength(12);
    expect(html).toContain('type="text"');
    expect(html).toContain('placeholder="#RRGGBB"');
  }
});
