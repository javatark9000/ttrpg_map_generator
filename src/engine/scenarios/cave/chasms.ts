import type { BattleMap } from '../../types';
import { fbm, hashString, Random } from '../../random';
import { getRegions } from '../connectivity';

/** Chasms are generated after water and the ordinary cave connectivity repair.
 * Never run connectRegions afterwards: dividing mode deliberately permits islands.
 * A natural bridge is real stone floor, not the decorative wooden bridge asset.
 */
export function generateCaveChasms(map: BattleMap): void {
  const { config, terrain, spawn } = map;
  if (config.caveChasms === 'none') return;
  const { width: w, height: h } = config;
  const seed = hashString(`${config.seed}-${config.theme}-cave-chasms`);
  const rng = new Random(seed);
  const protectedCell = (x: number, y: number) => Math.hypot(x - spawn.x, y - spawn.y) <= 3.5;
  const starts: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (terrain[y * w + x] === 'floor' && !protectedCell(x, y)) starts.push(y * w + x);
  }
  if (!starts.length) throw new Error('No hay espacio para una sima fuera de la entrada. Amplía la caverna o desactiva las simas.');

  // A procedural upper bound, not a user-requested quantity.
  const maxChasms = Math.min(4, 1 + Math.floor(w * h / 1600));
  let carved = 0;
  for (let attempt = 0; attempt < maxChasms * 16 && carved < maxChasms; attempt++) {
    const start = rng.pick(starts);
    if (terrain[start] !== 'floor') continue;
    const cx = start % w, cy = Math.floor(start / w);
    const angle = rng.next() * Math.PI * 2;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    // Progressively try shorter faults when narrow caves cannot fit a long safe one.
    const length = Math.max(3, Math.min(Math.max(w, h) * .65, 8 + Math.sqrt(w * h) * .55) * [1, .7, .45, .25][attempt % 4]);
    const cells = new Set<number>();
    const samples = Math.ceil(length * 3);
    for (let step = 0; step <= samples; step++) {
      const t = step / samples, along = (t - .5) * length;
      const bend = (fbm(t * 3, attempt * .7, seed) - .5) * Math.min(4, length * .25);
      const x = cx + ux * along - uy * bend, y = cy + uy * along + ux * bend;
      const radius = .65 + fbm(t * 5, attempt + 11, seed) * .65;
      for (let yy = Math.floor(y - radius); yy <= Math.ceil(y + radius); yy++) {
        for (let xx = Math.floor(x - radius); xx <= Math.ceil(x + radius); xx++) {
          if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= h - 1 || protectedCell(xx, yy)) continue;
          const index = yy * w + xx;
          if (terrain[index] === 'floor' && Math.hypot(xx - x, yy - y) <= radius) cells.add(index);
        }
      }
    }
    // Keep a single fissure rather than disconnected dots clipped by solid rock.
    const fissure = largestPatch(cells, w);
    if (fissure.length < 3) continue;
    for (const index of fissure) terrain[index] = 'void';
    const regions = getRegions(map);
    if (config.caveChasms === 'safe' && regions.length !== 1) {
      // Reject the whole cut: repairing it with floor would silently invent a bridge.
      // In dividing mode the protected central clearing remains the entry region.
      for (const index of fissure) terrain[index] = 'floor';
      continue;
    }
    carved++;
  }

  if (!carved) throw new Error('No se pudo colocar una sima respetando la entrada y el modo elegido. Amplía la caverna, cambia la semilla o desactiva las simas.');

  // The safe-mode check above is performed BEFORE bridges: a walkable detour
  // exists independently of these optional stone crossings.
  if (config.caveNaturalBridges) addNaturalBridges(map, rng, carved);
}

function largestPatch(cells: Set<number>, width: number): number[] {
  const remaining = new Set(cells);
  let largest: number[] = [];
  while (remaining.size) {
    const first = remaining.values().next().value!;
    const patch = [first];
    remaining.delete(first);
    for (let j = 0; j < patch.length; j++) {
      const index = patch[j];
      for (const next of [index - 1, index + 1, index - width, index + width]) {
        if (remaining.delete(next)) patch.push(next);
      }
    }
    if (patch.length > largest.length) largest = patch;
  }
  return largest;
}

function addNaturalBridges(map: BattleMap, rng: Random, limit: number): void {
  const { width: w, height: h } = map.config;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h ? map.terrain[y * w + x] : undefined;
  const candidates: number[][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (at(x, y) !== 'floor') continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const span: number[] = [];
      let xx = x + dx, yy = y + dy;
      while (at(xx, yy) === 'void' && span.length < 6) {
        span.push(yy * w + xx);
        xx += dx; yy += dy;
      }
      if (!span.length || at(xx, yy) !== 'floor') continue;
      const middle = span[Math.floor(span.length / 2)], mx = middle % w, my = Math.floor(middle / w);
      // Void on both sides makes this read as a crossing, not filling a tiny hole.
      if (at(mx - dy, my + dx) === 'void' && at(mx + dy, my - dx) === 'void') candidates.push(span);
    }
  }
  const placed: number[] = [];
  while (candidates.length && placed.length < limit) {
    const [span] = candidates.splice(rng.int(0, candidates.length - 1), 1);
    const middle = span[Math.floor(span.length / 2)], x = middle % w, y = Math.floor(middle / w);
    if (span.some(index => map.terrain[index] !== 'void') || placed.some(index => Math.hypot(index % w - x, Math.floor(index / w) - y) < 5)) continue;
    for (const index of span) map.terrain[index] = 'floor';
    placed.push(middle);
  }
  if (!placed.length) throw new Error('Las simas generadas no admiten un puente natural. Cambia la semilla o desactiva los puentes naturales.');
}
