import { createGifEncoder } from './gif-encoder';
let encoder: ReturnType<typeof createGifEncoder> | undefined;
self.onmessage = (event: MessageEvent<{ type: 'frame' | 'finish'; width: number; height: number; pixels: ArrayBuffer }>) => {
  try {
    const message = event.data;
    if (message.type === 'frame') {
      encoder ??= createGifEncoder(message.width, message.height);
      encoder.add(new Uint8Array(message.pixels));
      self.postMessage({ type: 'ready' });
    } else {
      if (!encoder) throw new Error('No hay fotogramas para exportar.');
      const bytes = encoder.finish();
      self.postMessage({ type: 'done', bytes: bytes.buffer }, { transfer: [bytes.buffer] });
      encoder = undefined;
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo codificar el GIF.' });
  }
};
