import type { BattleMap } from '../../types';
import type { Random } from '../../random';
import type { PlaceObject } from '../../scenario-painter';
import { getRegions, walkable } from '../connectivity';
import { shuffled } from './landscape';

export interface MountainEntrance { x: number; y: number; mouthX: number; mouthY: number }

/** Cave assets face south in their source SVG. They are independent landmarks, not portals. */
export function mountainEntrances(map: BattleMap, rng: Random, place: PlaceObject, count: number): MountainEntrance[] {
  const { width: w, height: h } = map.config, entrances: MountainEntrance[] = [];
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && walkable(map.terrain[y * w + x]);
  const suitable = (x: number, y: number) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1
    && Math.hypot(x - map.spawn.x, y - map.spawn.y) >= 1.5
    && entrances.every(e => Math.hypot(x - e.x, y - e.y) >= 3);
  const add = (x: number, y: number): boolean => {
    const facing = shuffled([...directions], rng).find(([dx, dy]) => free(x + dx, y + dy)
      && entrances.every(e => Math.hypot(x + dx - e.x, y + dy - e.y) >= 2));
    if (!facing) return false;
    const [dx, dy] = facing;
    place('cave-entrance', x + .5, y + .5, .8, Math.atan2(dy, dx) - Math.PI / 2);
    entrances.push({ x, y, mouthX: x + dx, mouthY: y + dy }); return true;
  };
  const candidates = shuffled(Array.from({ length: w * h }, (_, i) => i), rng);
  for (const i of candidates) {
    if (entrances.length === count) break;
    const x = i % w, y = Math.floor(i / w);
    if (map.terrain[i] === 'rock' && suitable(x, y)) add(x, y);
  }
  // Broad snowy/grass shelves can lack enough rock edges. Add isolated outcrops,
  // never a corridor or an inaccessible opening, and keep existing mouths clear.
  for (const i of candidates) {
    if (entrances.length === count) break;
    const x = i % w, y = Math.floor(i / w), terrain = map.terrain[i];
    if (!walkable(terrain) || terrain === 'path' || !suitable(x, y)
      || entrances.some(e => e.mouthX === x && e.mouthY === y)) continue;
    map.terrain[i] = 'rock';
    if (getRegions(map).length !== 1 || !add(x, y)) map.terrain[i] = terrain;
  }
  if (entrances.length !== count) throw new Error(`No hay espacio accesible para ${count} entradas de cueva en esta montaña. Reduce la cantidad o amplía el mapa.`);
  return entrances;
}
