import type { BattleMap, RenderOptions } from './types';
import { createAnimatedScene } from './animation';
import { FRAME_COUNT, FRAME_MS, gifDimensions } from './animation-settings';

export function exportGif(map: BattleMap, requestedTile: number, options: RenderOptions, signal: AbortSignal, progress: (frame: number, total: number) => void): Promise<Blob> {
  signal.throwIfAborted();
  const {tile, width, height} = gifDimensions(map.config.width, map.config.height, requestedTile);
  const scene = createAnimatedScene(map, tile, options);
  let worker: Worker;
  try { worker = new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' }); }
  catch (error) { scene.dispose(); throw error; }
  return new Promise((resolve, reject) => {
    let frame = 0, settled = false, timer: ReturnType<typeof setTimeout>;
    const cleanup = () => { settled = true; clearTimeout(timer); worker.terminate(); scene.dispose(); signal.removeEventListener('abort', abort); };
    const fail = (error: unknown) => { if (settled) return; cleanup(); reject(error); };
    const abort = () => fail(new DOMException('Exportación cancelada.', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    const send = () => {
      if (settled) return;
      try {
        signal.throwIfAborted();
        clearTimeout(timer); timer = setTimeout(() => fail(new Error('La exportación tardó demasiado. Prueba una resolución menor.')), 60_000);
        if (frame === FRAME_COUNT) { worker.postMessage({type:'finish'}); return; }
        const canvas = scene.frame(frame * FRAME_MS);
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
        worker.postMessage({type:'frame', width, height, pixels:pixels.buffer}, [pixels.buffer]);
      } catch (error) { fail(error); }
    };
    worker.onmessage = (event: MessageEvent<{type:string; message?:string; bytes:ArrayBuffer}>) => {
      if (settled) return;
      if (event.data.type === 'error') { fail(new Error(event.data.message)); return; }
      if (event.data.type === 'done') { const blob = new Blob([event.data.bytes], {type:'image/gif'}); cleanup(); resolve(blob); return; }
      frame++; progress(frame, FRAME_COUNT); send();
    };
    worker.onerror = () => fail(new Error('No se pudo iniciar el codificador GIF. Recarga la página e inténtalo de nuevo.'));
    worker.onmessageerror = () => fail(new Error('No se pudo leer un fotograma GIF.'));
    progress(0, FRAME_COUNT); send();
  });
}
