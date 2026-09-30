export const LOOP_MS = 2400;
export const FRAME_MS = 100;
export const FRAME_COUNT = LOOP_MS / FRAME_MS;
export const MAX_GIF_PIXELS = 1_000_000;
export const MAX_GIF_SIDE = 1600;

/** Integer tile size keeps grid alignment and aspect ratio, including narrow maps. */
export function gifDimensions(width: number, height: number, requestedTile: number) {
  if (![width, height, requestedTile].every(n => Number.isFinite(n) && n > 0)) throw new Error('Las dimensiones de exportación no son válidas.');
  const tile = Math.floor(Math.min(requestedTile, Math.sqrt(MAX_GIF_PIXELS / (width * height)), MAX_GIF_SIDE / Math.max(width, height)));
  if (tile < 1) throw new Error('El mapa es demasiado grande para exportar como GIF.');
  return { tile, width: width * tile, height: height * tile, reduced: tile < requestedTile };
}
export function loopPhase(timeMs: number): number {
  return ((timeMs % LOOP_MS) + LOOP_MS) % LOOP_MS / LOOP_MS * Math.PI * 2;
}
export function lightPulse(phase: number, offset: number): number {
  return .74 + .14 * Math.sin(phase * 3 + offset) + .08 * Math.sin(phase * 7 + offset * 2);
}
