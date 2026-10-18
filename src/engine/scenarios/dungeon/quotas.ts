import type { DungeonRoom, MapConfig } from '../../types';
import type { Random } from '../../random';

export type DungeonRoomQuotas = NonNullable<MapConfig['dungeonRooms']>;
type RoomSize = keyof DungeonRoomQuotas;
type Partition = { width: number; height: number } & (
  | { size: RoomSize }
  | { vertical: boolean; first: Partition; second: Partition }
);
const SIZES: RoomSize[] = ['small', 'medium', 'large'];
const MIN_SIDE = { small: 4, medium: 9, large: 13 };
const MAX_SIDE = { small: 8, medium: 12, large: Infinity };
const total = (q: DungeonRoomQuotas) => q.small + q.medium + q.large;
const area = (q: DungeonRoomQuotas) => q.small * 36 + q.medium * 121 + q.large * 225;
const key = (q: DungeonRoomQuotas) => `${q.small},${q.medium},${q.large}`;
let cachedPlan: { key: string; plan: Partition | null } | undefined;

/** Necessary bounds only: passing these is NOT treated as proof of capacity. */
function fitsBounds(w: number, h: number, q: DungeonRoomQuotas): boolean {
  if (area(q) > w * h) return false;
  // Each minimum leaf square contains floor(side / unit)^2 disjoint unit
  // squares. Their total cannot exceed the enclosing rectangle's grid capacity.
  // Multiple units detect narrow-map failures that a plain area check misses.
  for (const unit of [6, 11, 15, 5, 7, 3, 2, 4]) {
    const required = q.small * Math.floor(6 / unit) ** 2
      + q.medium * Math.floor(11 / unit) ** 2 + q.large * Math.floor(15 / unit) ** 2;
    if (required > Math.floor(w / unit) * Math.floor(h / unit)) return false;
  }
  return true;
}

function join(first: Partition, second: Partition, vertical: boolean): Partition {
  return {
    width: vertical ? first.width + second.width : Math.max(first.width, second.width),
    height: vertical ? Math.max(first.height, second.height) : first.height + second.height,
    vertical, first, second,
  };
}

/**
 * Exact feasibility within the generator's integer, axis-aligned BSP model.
 * A leaf reserves one wall cell on EACH side, not merely its playable area.
 * Memoized failed states and necessary packing bounds prune impossible cuts.
 * No attempt budget or seed-dependent placement can silently lower a quota.
 */
function findPlan(width: number, height: number, quotas: DungeonRoomQuotas): Partition | null {
  const requestKey = `${width}x${height}:${key(quotas)}`;
  if (cachedPlan?.key === requestKey) return cachedPlan.plan;
  const memo = new Map<string, Partition | null>();
  const allocations = new Map<string, DungeonRoomQuotas[]>();
  function solve(w: number, h: number, q: DungeonRoomQuotas): Partition | null {
    if (!fitsBounds(w, h, q)) return null;
    const stateKey = `${w}x${h}:${key(q)}`;
    if (memo.has(stateKey)) return memo.get(stateKey)!;
    const occupied = SIZES.filter(size => q[size] > 0);
    // A single category has an exact rectangular-grid solution; avoid searching
    // all equivalent allocations of dozens of identical leaves.
    if (occupied.length === 1) {
      const size = occupied[0], side = MIN_SIDE[size] + 2;
      const n = q[size], rows = Math.min(n, Math.floor(h / side));
      let column: Partition = { width: side, height: side, size };
      for (let i = 1; i < rows; i++) column = join(column, { width: side, height: side, size }, false);
      if (rows === n) return column;
      const rest = solve(w - side, h, { ...q, [size]: n - rows });
      return rest ? join(column, rest, true) : null;
    }
    const quotaKey = key(q);
    let subsets = allocations.get(quotaKey);
    if (!subsets) {
      subsets = [];
      for (let large = 0; large <= q.large; large++) for (let medium = 0; medium <= q.medium; medium++) for (let small = 0; small <= q.small; small++) {
        const subset = { small, medium, large }, n = total(subset);
        if (n > 0 && n < total(q)) subsets.push(subset);
      }
      allocations.set(quotaKey, subsets);
    }
    const smallest = MIN_SIDE[occupied[0]] + 2;
    const axes = w === h ? [true] : w > h ? [true, false] : [false, true];
    for (const vertical of axes) {
      const length = vertical ? w : h;
      // Reflections cover cuts beyond the midpoint: both quota allocations
      // are considered, so this does not discard any feasible BSP layout.
      for (let cut = Math.floor(length / 2); cut >= smallest; cut--) {
        const aw = vertical ? cut : w, ah = vertical ? h : cut;
        const bw = vertical ? w - cut : w, bh = vertical ? h : h - cut;
        const candidates = subsets.filter(a => fitsBounds(aw, ah, a) && fitsBounds(bw, bh, {
          small: q.small - a.small, medium: q.medium - a.medium, large: q.large - a.large,
        }));
        // Try balanced occupancies first; feasibility never depends on this order.
        const target = area(q) * cut / length;
        candidates.sort((a, b) => Math.abs(area(a) - target) - Math.abs(area(b) - target));
        for (const a of candidates) {
          const b = { small: q.small - a.small, medium: q.medium - a.medium, large: q.large - a.large };
          const first = solve(aw, ah, a);
          if (!first) continue;
          const second = solve(bw, bh, b);
          if (!second) continue;
          const plan = join(first, second, vertical);
          memo.set(stateKey, plan);
          return plan;
        }
      }
    }
    memo.set(stateKey, null);
    return null;
  }
  const plan = solve(width, height, quotas);
  // Regenerating with another seed can reuse the same feasible partition.
  cachedPlan = { key: requestKey, plan };
  return plan;
}

/**
 * Constant-time necessary bounds for the UI, after central value validation.
 * Undefined means "not ruled out", NOT proof of capacity. The generation worker
 * performs the exact BSP search; never run that search on each form input.
 */
export function dungeonRoomQuotasBoundsError(width: number, height: number, quotas: DungeonRoomQuotas): string | undefined {
  if (!fitsBounds(width, height, quotas)) return `En ${width} × ${height} no cabe esa combinación de habitaciones con sus muros. Reduce las cuotas o amplía el mapa; no se reducirán automáticamente.`;
}

export function generateQuotaRooms(width: number, height: number, quotas: DungeonRoomQuotas, complexity: number, rng: Random): DungeonRoom[] {
  const plan = findPlan(width, height, quotas);
  if (!plan) throw new Error(`No hay una distribución BSP en ${width} × ${height} para las habitaciones solicitadas y sus muros. Reduce las cuotas o amplía el mapa; no se reducirán automáticamente.`);
  const rooms: DungeonRoom[] = [];
  function place(node: Partition, x: number, y: number, w: number, h: number): void {
    if ('size' in node) {
      const min = MIN_SIDE[node.size];
      // At least one wall cell surrounds every leaf, including the outer border.
      // The shorter INTERIOR side defines the category; long rooms are allowed.
      const horizontalShort = w < h || (w === h && rng.next() < .5);
      const availableShort = (horizontalShort ? w : h) - 2;
      const availableLong = (horizontalShort ? h : w) - 2;
      const shortMax = Math.min(MAX_SIDE[node.size], availableShort);
      const short = rng.int(min, shortMax);
      const longMin = Math.max(short, availableLong - 2 - Math.floor(complexity / 25));
      const long = rng.int(longMin, availableLong);
      const rw = horizontalShort ? short : long, rh = horizontalShort ? long : short;
      rooms.push({ x: x + rng.int(1, w - rw - 1), y: y + rng.int(1, h - rh - 1), w: rw, h: rh });
      return;
    }
    let { first, second } = node;
    if (rng.next() < .5) [first, second] = [second, first];
    const { vertical } = node;
    const minimum = vertical ? first.width : first.height;
    const maximum = (vertical ? w - second.width : h - second.height);
    const cut = rng.int(minimum, maximum);
    if (vertical) { place(first, x, y, cut, h); place(second, x + cut, y, w - cut, h); }
    else { place(first, x, y, w, cut); place(second, x, y + cut, w, h - cut); }
  }
  place(plan, 0, 0, width, height);
  return rooms;
}
