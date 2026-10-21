export const EDITOR_MAX_PIXELS = 750_000;
export const EDITOR_FULL_DETAIL_MAX_CELLS = 1_600;
export const EDITOR_MAX_SIDE = 4096;
export const EDITOR_MAX_TILE = 56;
export const EDITOR_MIN_TILE = 8;

/**
 * Keep the interactive canvas within a predictable pixel budget. Exporting uses
 * its requested resolution separately, so this only affects the editor preview.
 */
export function editorTileSize(width: number, height: number): number {
  const cells = Math.max(1, width * height);
  const longestSide = Math.max(1, width, height);
  const pixelBudget = cells <= EDITOR_FULL_DETAIL_MAX_CELLS
    ? cells * EDITOR_MAX_TILE * EDITOR_MAX_TILE
    : EDITOR_MAX_PIXELS;
  const byArea = Math.floor(Math.sqrt(pixelBudget / cells));
  const bySide = Math.floor(EDITOR_MAX_SIDE / longestSide);
  return Math.max(EDITOR_MIN_TILE, Math.min(EDITOR_MAX_TILE, byArea, bySide));
}
