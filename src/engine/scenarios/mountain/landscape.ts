import type { BattleMap } from '../../types';
import type { Random } from '../../random';
import { getRegions, walkable } from '../connectivity';

export function shuffled<T>(values: T[], rng: Random): T[] {
  for (let i = values.length - 1; i > 0; i--) { const j = rng.int(0, i); [values[i], values[j]] = [values[j], values[i]]; }
  return values;
}

/** Remove isolated shelves rather than disguising artificial corridors as natural gravel. */
export function retainNaturalRegion(map: BattleMap, paths: boolean): void {
  const regions = getRegions(map), { width: w, height: h } = map.config;
  if (!regions.length) {
    if (paths) throw new Error('El camino de montaña no contiene terreno transitable.');
    // A fully rocky noise sample still needs a natural playable clearing.
    const x = Math.floor(w / 2), y = Math.floor(h / 2);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) map.terrain[(y + dy) * w + x + dx] = 'grass';
    map.spawn = { x, y }; return;
  }
  const entry = map.spawn.y * w + map.spawn.x;
  const retained = paths ? regions.find(region => region.includes(entry)) : regions[0];
  if (!retained) throw new Error('El punto de entrada no está conectado al camino de montaña.');
  const keep = new Set(retained);
  for (let i = 0; i < map.terrain.length; i++) if (walkable(map.terrain[i]) && !keep.has(i)) map.terrain[i] = 'rock';
  if (!paths) {
    // Prefer an accessible boundary; never place the spawn on rock merely to reach an edge.
    let best = retained[0], distance = Infinity;
    for (const index of retained) {
      const x = index % w, y = Math.floor(index / w), d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d < distance) { best = index; distance = d; }
    }
    map.spawn = { x: best % w, y: Math.floor(best / w) };
  }
}

/** Try scattered free sites and sizes; reject a lake that cuts the playable region in two. */
export function mountainLake(map: BattleMap, rng: Random): void {
  const { width: w, height: h } = map.config;
  const candidates = shuffled(map.terrain.flatMap((t, i) => {
    const x = i % w, y = Math.floor(i / w);
    return walkable(t) && t !== 'path' && x > 0 && y > 0 && x < w - 1 && y < h - 1 ? [i] : [];
  }), rng);
  const radius = Math.min(2.5, Math.min(w, h) * .16), angle = rng.next() * Math.PI;
  for (const size of [radius, Math.max(1, radius * .65), .65]) {
    for (const center of candidates) {
      const cx = center % w, cy = Math.floor(center / w), cells: number[] = [];
      let valid = true;
      const reach = Math.ceil(size * 1.3);
      for (let y = cy - reach; y <= cy + reach && valid; y++) for (let x = cx - reach; x <= cx + reach; x++) {
        const dx = x - cx, dy = y - cy;
        const u = dx * Math.cos(angle) + dy * Math.sin(angle), v = -dx * Math.sin(angle) + dy * Math.cos(angle);
        if (Math.hypot(u / 1.3, v) > size) continue;
        const index = y * w + x, terrain = map.terrain[index];
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 || !walkable(terrain) || terrain === 'path' || Math.hypot(x - map.spawn.x, y - map.spawn.y) < 2) { valid = false; break; }
        cells.push(index);
      }
      if (!valid || !cells.length) continue;
      const previous = cells.map(i => map.terrain[i]);
      for (const index of cells) map.terrain[index] = 'water';
      const regions = getRegions(map);
      if (regions.length === 1 && regions[0].length >= 6) return;
      cells.forEach((index, i) => { map.terrain[index] = previous[i]; });
    }
  }
  throw new Error('No hay espacio para una laguna sin bloquear esta montaña. Amplía el mapa o desactiva el agua.');
}
