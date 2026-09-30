import { generateMap } from './generate';
import type { MapConfig } from './types';
self.onmessage = (event: MessageEvent<MapConfig>) => {
  try { self.postMessage({ map: generateMap(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'No se pudo generar el mapa.' }); }
};
