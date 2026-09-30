import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { FRAME_COUNT, FRAME_MS, MAX_GIF_PIXELS, MAX_GIF_SIDE } from './animation-settings';

/** Streaming, one global palette to avoid temporal color shimmer. */
export function createGifEncoder(width: number, height: number) {
  if (![width,height].every(n => Number.isInteger(n) && n > 0 && n <= MAX_GIF_SIDE) || width * height > MAX_GIF_PIXELS) throw new Error('El GIF supera el límite de resolución.');
  const encoder = GIFEncoder();
  let palette: number[][] | undefined;
  let frames = 0;
  let previous: Uint8Array | undefined;
  return {
    add(data: Uint8Array) {
      if (frames >= FRAME_COUNT || data.length !== width * height * 4) throw new Error('Fotograma GIF no válido.');
      const first = !palette;
      if (!palette) palette = quantize(data, 255, { format: 'rgb565' });
      const index = applyPalette(data, palette, 'rgb565'), transparentIndex = palette.length;
      // Keep unchanged pixels from the preceding frame instead of encoding the whole
      // static landscape 24 times. Changed pixels include the old positions of waves.
      if (previous) for (let i = 0; i < index.length; i++) {
        const color = index[i];
        if (color === previous[i]) index[i] = transparentIndex;
        previous[i] = color;
      }
      else previous = index.slice();
      encoder.writeFrame(index, width, height, {
        palette: first ? [...palette, [0, 0, 0]] : undefined, delay: FRAME_MS, repeat: 0,
        dispose: 1, transparent: !first, transparentIndex,
      });
      frames++;
    },
    finish() {
      if (frames !== FRAME_COUNT) throw new Error('La animación GIF está incompleta.');
      encoder.finish(); return encoder.bytes();
    },
  };
}
