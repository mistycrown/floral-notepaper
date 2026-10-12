export const DEFAULT_TILE_LINE_HEIGHT = 1.8;
export const MIN_TILE_LINE_HEIGHT = 1;
export const MAX_TILE_LINE_HEIGHT = 3;

export function normalizeTileLineHeight(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(MIN_TILE_LINE_HEIGHT, Math.min(MAX_TILE_LINE_HEIGHT, value))
    : DEFAULT_TILE_LINE_HEIGHT;
}
