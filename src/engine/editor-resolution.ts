const MAX_PIXELS = 750_000;
const FULL_DETAIL_CELLS = 1_600;
const MAX_SIDE = 4096;
const MAX_TILE = 56;
const MIN_TILE = 8;

/** Choose an editor-only resolution; exports use their requested tile size. */
export function editorTileSize(width: number, height: number): number {
  const cells = Math.max(1, width * height);
  const byArea = cells <= FULL_DETAIL_CELLS ? MAX_TILE : Math.floor(Math.sqrt(MAX_PIXELS / cells));
  const bySide = Math.floor(MAX_SIDE / Math.max(1, width, height));
  return Math.max(MIN_TILE, Math.min(MAX_TILE, byArea, bySide));
}
