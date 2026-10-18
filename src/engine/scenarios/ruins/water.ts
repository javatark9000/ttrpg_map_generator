import type { BattleMap } from '../../types';
import { fbm, hashString } from '../../random';
import type { Random } from '../../random';

/** Pick an entirely free footprint; never flood a ruin, plaza or entrance approach. */
export function ruinWater(map: BattleMap, reserved: Uint8Array, rng: Random): void {
  const { width: w, height: h, seed } = map.config;
  const noiseSeed = hashString(`${seed}:ruins-water`);
  const free = (x: number, y: number) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1 && !reserved[y * w + x] && (map.terrain[y * w + x] === 'grass' || map.terrain[y * w + x] === 'gravel');
  const candidates: { x: number; y: number; priority: number }[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (free(x, y)) candidates.push({ x, y, priority: rng.next() });
  candidates.sort((a, b) => a.priority - b.priority);
  const rotation = rng.next() * Math.PI, cos = Math.cos(rotation), sin = Math.sin(rotation);
  const aspect = .65 + rng.next() * .55;
  const radius = Math.max(1.3, Math.min(5.5, Math.min(w, h) * (.08 + rng.next() * .05)));
  for (const shrink of [1, .72, .48]) {
    const rx = Math.max(1.1, radius * shrink), ry = Math.max(1.05, rx * aspect);
    const reach = Math.ceil(Math.max(rx, ry) * 1.2);
    for (const center of candidates.slice(0, 240)) {
      const cells: number[] = [];
      let valid = true;
      for (let dy = -reach; dy <= reach && valid; dy++) for (let dx = -reach; dx <= reach; dx++) {
        const x = center.x + dx, y = center.y + dy;
        const u = (dx * cos + dy * sin) / rx, v = (-dx * sin + dy * cos) / ry;
        const edge = .82 + fbm(x * .42, y * .42, noiseSeed) * .35;
        if (Math.hypot(u, v) > edge) continue;
        if (!free(x, y)) { valid = false; break; }
        cells.push(y * w + x);
      }
      if (valid && cells.length >= 3) {
        for (const cell of cells) map.terrain[cell] = 'water';
        return;
      }
    }
  }
  throw new Error('No se pudo colocar agua sin invadir las ruinas o sus accesos. Amplía el mapa, prueba otra semilla o desactiva el agua.');
}
