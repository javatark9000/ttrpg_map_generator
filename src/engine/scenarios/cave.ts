import type { AssetId, BattleMap } from '../types';
import { fbm, hashString } from '../random';
import type { Random } from '../random';
import type { PlaceObject } from '../scenario-painter';
import { connectRegions } from './connectivity';
import { generateCaveChasms } from './cave/chasms';

export function generateCave(map: BattleMap, rng: Random, object: PlaceObject): void {
  const { config } = map;
  const { width: w, height: h, seed } = config;
  const at = (x: number, y: number) => map.terrain[y * w + x];
  const set = (x: number, y: number, terrain: 'rock' | 'floor' | 'water') => {
    if (x >= 0 && y >= 0 && x < w && y < h) map.terrain[y * w + x] = terrain;
  };

  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    set(x, y, rng.next() < 0.45 + config.complexity * 0.0008 ? 'rock' : 'floor');
  }
  for (let pass = 0; pass < 5; pass++) {
    const copy = map.terrain.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (copy[(y + dy) * w + x + dx] === 'rock') neighbors++;
      set(x, y, neighbors >= 5 ? 'rock' : 'floor');
    }
  }

  // A central clearing guarantees a viable cave even for dense random seeds.
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (Math.hypot(dx, dy) < 3.3) set(Math.floor(w / 2) + dx, Math.floor(h / 2) + dy, 'floor');
  }
  connectRegions(map);
  map.spawn = { x: Math.floor(w / 2), y: Math.floor(h / 2) };

  const s = hashString(seed);
  if (config.water) {
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      if (at(x, y) === 'floor' && fbm(x * 0.14, y * 0.14, s) > 0.64 && Math.hypot(x - map.spawn.x, y - map.spawn.y) > 4) set(x, y, 'water');
    }
    connectRegions(map);
  }

  generateCaveChasms(map);

  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    if (at(x, y) !== 'floor' || Math.hypot(x - map.spawn.x, y - map.spawn.y) < 2.5) continue;
    const neighbors = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)];
    // Keep fault edges and narrow natural crossings visually clear.
    if (neighbors.includes('void')) continue;
    const nearWall = neighbors.includes('rock');
    if (nearWall && rng.next() < config.density / 260) object(rng.pick<AssetId>(['crystal', 'crystal', 'stalagmite', 'rock', 'mushrooms']), x + 0.5, y + 0.5, 0.7 + rng.next() * 0.5, rng.next() * 6.28);
    else if (config.landmarks && rng.next() < config.density / 7000) object(rng.pick<AssetId>(['bones', 'chest']), x + 0.5, y + 0.5, 0.8, rng.next() * 6.28);
  }
  if (config.landmarks) {
    object('campfire', map.spawn.x + 0.5, map.spawn.y + 0.5);
    object('bedroll', map.spawn.x + 2, map.spawn.y + 0.5);
  }
}
