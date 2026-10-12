import { describe, expect, test } from "vitest";
import chroma from "chroma-js";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
  resolveNoteTileColor,
  tileTextColor,
  parseHexColor,
  DEFAULT_TILE_COLOR_PRESETS,
  normalizeTileColorPresets,
  getTileAccentColor,
  normalizeTileBackgroundTransparency,
} from "./tileColor";

describe("tile color settings", () => {
  test("transparency defaults to opaque and repairs invalid or out-of-range settings", () => {
    for (const value of [undefined, NaN, Infinity, -Infinity, -1]) {
      expect(normalizeTileBackgroundTransparency(value)).toBe(0);
    }
    expect(normalizeTileBackgroundTransparency(50)).toBe(50);
    expect(normalizeTileBackgroundTransparency(100)).toBe(80);
    expect(normalizeTileBackgroundTransparency(40.7)).toBe(41);
  });
  test("parses pasted hex colors without accepting incomplete or invalid input", () => {
    expect(parseHexColor(" #AbC123 ")).toBe("#abc123");
    expect(parseHexColor("#0fA")).toBe("#00ffaa");
    expect(parseHexColor("ABCDEF")).toBe("#abcdef");
    for (const value of [
      "",
      "#",
      "#1",
      "#12",
      "#1234",
      "#12345",
      "#1234567",
      "#gg0000",
      "red",
      "rgb(1,2,3)",
    ]) {
      expect(parseHexColor(value)).toBeNull();
    }
  });

  test("retains edited slot positions and duplicate colors while repairing only invalid slots", () => {
    const values = normalizeTileColorPresets(["#abc", "#ABC", "#broken", "#112233"]);
    expect(values).toHaveLength(12);
    expect(values.slice(0, 4)).toEqual([
      "#aabbcc",
      "#aabbcc",
      DEFAULT_TILE_COLOR_PRESETS[2],
      "#112233",
    ]);
    expect(values.slice(4)).toEqual(DEFAULT_TILE_COLOR_PRESETS.slice(4));
    expect(normalizeTileColorPresets()).toEqual(DEFAULT_TILE_COLOR_PRESETS);
    expect(normalizeTileColorPresets(null)).toEqual(DEFAULT_TILE_COLOR_PRESETS);
    expect(normalizeTileColorPresets([undefined, 123])).toEqual(DEFAULT_TILE_COLOR_PRESETS);
    expect(normalizeTileColorPresets(Array(15).fill("#112233"))).toHaveLength(12);
    expect(DEFAULT_TILE_COLOR_PRESETS[0]).toBe("#f6f3ec");
  });
  test("accent darkens light colors and lightens dark colors while keeping readable contrast", () => {
    for (const background of [
      "#f6f3ec",
      "#fff0b3",
      "#ffd9df",
      "#d9eddf",
      "#d7eafa",
      "#e5ddf5",
      "#ffffff",
      "#808080",
    ]) {
      const accent = getTileAccentColor(background);
      expect(chroma(accent).luminance()).toBeLessThan(chroma(background).luminance());
      expect(chroma.contrast(background, accent)).toBeGreaterThanOrEqual(4.5);
    }
    for (const background of [
      "#191919",
      "#2d5a3d",
      "#284563",
      "#59374e",
      "#70472c",
      "#3e355d",
      "#000000",
    ]) {
      const accent = getTileAccentColor(background);
      expect(chroma(accent).luminance()).toBeGreaterThan(chroma(background).luminance());
      expect(chroma.contrast(background, accent)).toBeGreaterThanOrEqual(4.5);
    }
    expect(getTileAccentColor("#abc")).toBe(getTileAccentColor("#aabbcc"));
  });
  test("individual colors override the default and reset or invalid colors inherit it", () => {
    expect(resolveNoteTileColor("#abc", "#191919")).toBe("#aabbcc");
    expect(resolveNoteTileColor(undefined, "#191919")).toBe("#191919");
    expect(resolveNoteTileColor("broken", "#191919")).toBe("#191919");
  });

  test("uses opaque white text on dark notes and readable dark text on light notes", () => {
    for (const color of ["#191919", "#2d5a3d", "#284563", "#59374e", "#70472c", "#3e355d"]) {
      expect(tileTextColor(color)).toBe("#ffffff");
    }
    for (const color of ["#f6f3ec", "#fff0b3", "#ffd9df", "#d9eddf", "#d7eafa", "#e5ddf5"]) {
      expect(tileTextColor(color)).toBe("#1a1a18");
    }
  });
  test("normalizes full and shorthand hex colors", () => {
    expect(normalizeTileColor("#ABCDEF")).toBe("#abcdef");
    expect(normalizeTileColor("abc")).toBe("#aabbcc");
  });

  test("falls back to the default tile color for invalid values", () => {
    expect(DEFAULT_TILE_COLOR).toBe("#f6f3ec");
    expect(normalizeTileColor("")).toBe(DEFAULT_TILE_COLOR);
    expect(normalizeTileColor("#12zz99")).toBe(DEFAULT_TILE_COLOR);
  });
});
