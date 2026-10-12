import type { TileColorMode } from "./types";
import chroma from "chroma-js";

export const DEFAULT_TILE_COLOR = "#f6f3ec";
export const SYSTEM_TILE_COLOR_LIGHT = "#f6f3ec";
export const SYSTEM_TILE_COLOR_DARK = "#191919";
export const MAX_TILE_BACKGROUND_TRANSPARENCY = 80;

export function normalizeTileBackgroundTransparency(value?: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.min(MAX_TILE_BACKGROUND_TRANSPARENCY, Math.max(0, value)))
    : 0;
}

export const DEFAULT_TILE_COLOR_PRESETS = [
  "#f6f3ec",
  "#fff0b3",
  "#ffd9df",
  "#d9eddf",
  "#d7eafa",
  "#e5ddf5",
  "#191919",
  "#2d5a3d",
  "#284563",
  "#59374e",
  "#70472c",
  "#3e355d",
] as const;

const FULL_HEX_COLOR = /^#?([0-9a-fA-F]{6})$/;
const SHORT_HEX_COLOR = /^#?([0-9a-fA-F]{3})$/;

export function parseHexColor(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  const fullMatch = trimmed.match(FULL_HEX_COLOR);
  if (fullMatch) {
    return `#${fullMatch[1].toLowerCase()}`;
  }

  const shortMatch = trimmed.match(SHORT_HEX_COLOR);
  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((character) => character + character)
      .join("")
      .toLowerCase()}`;
  }

  return null;
}

export function normalizeTileColor(value: string | null | undefined): string {
  return parseHexColor(value) ?? DEFAULT_TILE_COLOR;
}

export function normalizeTileColorPresets(values?: readonly unknown[] | null): string[] {
  return DEFAULT_TILE_COLOR_PRESETS.map((fallback, index) => {
    const value = values?.[index];
    return typeof value === "string" ? (parseHexColor(value) ?? fallback) : fallback;
  });
}

export function resolveSystemTileColor(): string {
  if (typeof document === "undefined") return SYSTEM_TILE_COLOR_LIGHT;
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "dark" ? SYSTEM_TILE_COLOR_DARK : SYSTEM_TILE_COLOR_LIGHT;
}

export function resolveTileColor(mode: TileColorMode, customColor: string): string {
  return mode === "system" ? resolveSystemTileColor() : normalizeTileColor(customColor);
}

export function resolveNoteTileColor(noteColor: string | undefined, defaultColor: string): string {
  return noteColor &&
    (FULL_HEX_COLOR.test(noteColor.trim()) || SHORT_HEX_COLOR.test(noteColor.trim()))
    ? normalizeTileColor(noteColor)
    : defaultColor;
}

export function tileTextColor(background: string): string {
  return chroma(normalizeTileColor(background)).luminance() > 0.179 ? "#1a1a18" : "#ffffff";
}

// Preserve HSL hue and saturation while adjusting lightness for readable emphasis.
// Mixing pastel RGB with black desaturates it; the save-time Rust calculation
// uses the same channel formula below so persisted and inherited colors agree.
export function getTileAccentColor(background: string): string {
  const normalized = normalizeTileColor(background);
  const rgb = [1, 3, 5].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16));
  const luminance = (channels: number[]) =>
    channels.reduce((sum, channel, index) => {
      const value = channel / 255;
      const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
  const baseLuminance = luminance(rgb);
  const channels = rgb.map((channel) => channel / 255);
  const min = Math.min(...channels);
  const max = Math.max(...channels);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const hueChannels = channels.map((channel) => (delta === 0 ? 0 : (channel - min) / delta));
  const target = baseLuminance > 0.179 ? 0 : 1;
  for (let step = 1; step <= 100; step++) {
    const nextLightness = lightness + ((target - lightness) * step) / 100;
    const chroma = (1 - Math.abs(2 * nextLightness - 1)) * saturation;
    const offset = nextLightness - chroma / 2;
    const candidate = hueChannels.map((channel) => Math.round((offset + chroma * channel) * 255));
    const accentLuminance = luminance(candidate);
    const contrast =
      (Math.max(baseLuminance, accentLuminance) + 0.05) /
      (Math.min(baseLuminance, accentLuminance) + 0.05);
    if (contrast >= 4.5)
      return `#${candidate.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }
  return target === 0 ? "#000000" : "#ffffff";
}
