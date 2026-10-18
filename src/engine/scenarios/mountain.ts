import type { AssetId, BattleMap } from '../types';
import { fbm, hashString, Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';
import { walkable } from './connectivity';
import { mountainPaths } from './mountain/paths';
import { mountainLake, retainNaturalRegion, shuffled } from './mountain/landscape';
import { mountainEntrances } from './mountain/entrances';

export { maxMountainCaveEntrances } from './mountain/options';

export function generateMountain(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config, seed = hashString(c.seed);
  // Geometry is independent of theme/decorative density and optional landmark objects.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x * .16, y * .16, seed);
    p.set(x, y, c.mountainSnow && n > .57 ? 'snow' : n > .49 ? 'rock' : n < .4 ? 'grass' : 'gravel');
  }
  if (c.mountainPaths) mountainPaths(map, new Random(`${c.seed}-mountain-paths`), c.mountainPathLayout);
  retainNaturalRegion(map, c.mountainPaths);
  if (c.water) mountainLake(map, new Random(`${c.seed}-mountain-lake`));
  const entrances = mountainEntrances(map, new Random(`${c.seed}-mountain-caves`), p.object, c.mountainCaveEntrances);
  const clearOfEntrances = (x: number, y: number) => entrances.every(e => Math.hypot(x - e.x - .5, y - e.y - .5) >= 2.2
    && Math.hypot(x - e.mouthX - .5, y - e.mouthY - .5) >= 1.5);
  const freeOfObjects = (x: number, y: number, radius: number) => clearOfEntrances(x, y)
    && map.objects.every(o => Math.hypot(x - o.x, y - o.y) >= radius + o.scale * .35);

  if (c.landmarks) {
    // Use genuinely open sites. In particular, a camp must not erase lake shores,
    // cliffs or a path, or invent a gravel connection when paths are disabled.
    const sites = shuffled(map.terrain.flatMap((terrain, i) => {
      const x = i % w, y = Math.floor(i / w);
      if (!walkable(terrain) || terrain === 'path' || x < 1 || y < 1 || x >= w - 2 || y >= h - 1) return [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) {
        const t = p.at(x + dx, y + dy);
        if (t === undefined || !walkable(t) || t === 'path' || !clearOfEntrances(x + dx + .5, y + dy + .5)) return [];
      }
      return [i];
    }), new Random(`${c.seed}-mountain-camp`));
    if (sites.length) {
      const x = sites[0] % w, y = Math.floor(sites[0] / w);
      p.object('tent', x + .5, y + .5, .7); p.object('campfire', x + 1.8, y + .5, .65);
    }
    const markers = shuffled(map.terrain.flatMap((terrain, i) => {
      if (!walkable(terrain) || terrain === 'path') return [];
      const x = i % w, y = Math.floor(i / w);
      return c.mountainPaths && ![[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => p.at(nx, ny) === 'path') ? [] : [i];
    }), new Random(`${c.seed}-mountain-markers`));
    let remaining = Math.min(6, Math.max(1, Math.floor(Math.max(w, h) / 8)));
    for (const index of markers) {
      if (!remaining) break;
      const x = index % w + .5, y = Math.floor(index / w) + .5;
      if (freeOfObjects(x, y, 1.5)) { p.object('cairn', x, y, .7); remaining--; }
    }
  }
  for (let i = 0; i < w * h * c.density / 1100; i++) {
    const x = rng.int(1, w - 2), y = rng.int(1, h - 2), t = p.at(x, y);
    if (!freeOfObjects(x + .5, y + .5, .65)) continue;
    // Keep illustrations away from the complete route, not just their centre cell.
    if (c.mountainPaths && [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => p.at(nx, ny) === 'path')) continue;
    if (t === 'grass' || t === 'gravel') p.object(rng.pick<AssetId>(['rock', 'rock', 'tree-pine', 'bush']), x + .5, y + .5, .6 + rng.next() * .5, rng.next() * Math.PI * 2);
    else if (t === 'rock' && rng.next() < .3) p.object('rock', x + .5, y + .5, .85);
  }
}
