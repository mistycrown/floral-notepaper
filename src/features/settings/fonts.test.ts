import { describe, expect, test, vi } from "vitest";
import { applyFontFamily, fontFamilyCss } from "./fonts";

describe("local font selection", () => {
  test("quotes Chinese and punctuation in family names without injecting CSS", () => {
    expect(fontFamilyCss("微软雅黑")).toMatch(/^"微软雅黑", "HarmonyOS Sans SC"/);
    expect(fontFamilyCss('Font "Name"\\Test\n')).toMatch(/^"Font \\"Name\\"\\\\Test",/);
    expect(fontFamilyCss('"; color:red;')).toMatch(/^"\\"; color:red;",/);
    expect(fontFamilyCss("")).toContain('"Microsoft YaHei"');
  });

  test("updates all note fonts and restores the original CSS defaults", () => {
    const style = { setProperty: vi.fn(), removeProperty: vi.fn() };
    vi.stubGlobal("document", { documentElement: { style } });
    try {
      applyFontFamily("SimSun");
      for (const property of ["--font-body", "--font-display", "--font-serif"]) {
        expect(style.setProperty).toHaveBeenCalledWith(property, fontFamilyCss("SimSun"));
      }
      applyFontFamily("");
      expect(style.removeProperty.mock.calls.flat()).toEqual([
        "--font-body",
        "--font-display",
        "--font-serif",
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
