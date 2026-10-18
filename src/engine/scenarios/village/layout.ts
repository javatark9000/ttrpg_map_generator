import type { BattleMap } from '../../types';
import type { Random } from '../../random';
import type { Rect, painter } from '../../scenario-painter';

type Painter = ReturnType<typeof painter>;
export type Front = 'north' | 'south' | 'east' | 'west';
export interface VillagePlot extends Rect { front: Front; street: number }
export interface VillageBlock extends VillagePlot { linear: boolean }

/** Street coordinates, not a stretched image. Mixed axes have seeded unequal spans. */
function axis(length: number, size: BattleMap['config']['villageBlockSize'], rng: Random): number[] {
  const span = length - 1;
  const target = size === 'small' ? 10 : size === 'large' ? 20 : 14;
  const count = Math.max(1, Math.min(Math.floor(span / 8), Math.ceil(span / target)));
  const minimum = count === 1 ? span : 8;
  const spare = span - minimum * count;
  const weights = Array.from({ length: count }, () => size === 'mixed' ? .25 + rng.next() * 1.5 : 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map(weight => spare * weight / sum);
  const spans = exact.map(value => minimum + Math.floor(value));
  const order = exact.map((value, i) => ({ i, fraction: value % 1 })).sort((a, b) => b.fraction - a.fraction);
  const remainder = span - spans.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remainder; i++) spans[order[i].i]++;
  const points = [0];
  for (const width of spans) points.push(points[points.length - 1] + width);
  return points;
}

export function villageStreets(map: BattleMap, p: Painter, rng: Random): VillageBlock[] {
  const { width: w, height: h, villageLayout, villageBlockSize } = map.config;
  const blocks: VillageBlock[] = [];
  if (villageLayout === 'linear') {
    const horizontal = w >= h, length = horizontal ? w : h, depth = horizontal ? h : w;
    // A narrow map has buildings on one side rather than unusably thin lots on both.
    const street = depth < 13 ? depth - 1 : Math.floor(depth / 2);
    if (horizontal) p.line(0, street, w - 1, street);
    else p.line(street, 0, street, h - 1);
    const points = axis(length, villageBlockSize, rng);
    for (let i = 0; i < points.length - 1; i++) {
      for (const [start, end, before] of [[1, street, true], [street + 1, depth - 1, false]] as const) {
        if (end - start < 5) continue;
        const along = points[i] + 1, width = points[i + 1] - along;
        blocks.push(horizontal
          ? { x: along, y: start, w: width, h: end - start, front: before ? 'south' : 'north', street, linear: true }
          : { x: start, y: along, w: end - start, h: width, front: before ? 'east' : 'west', street, linear: true });
      }
    }
    map.spawn = horizontal ? { x: 0, y: street } : { x: street, y: 0 };
  } else {
    const xs = axis(w, villageBlockSize, rng), ys = axis(h, villageBlockSize, rng);
    for (const x of xs) p.line(x, 0, x, h - 1);
    for (const y of ys) p.line(0, y, w - 1, y);
    for (let row = 0; row < ys.length - 1; row++) for (let col = 0; col < xs.length - 1; col++) {
      blocks.push({ x: xs[col] + 1, y: ys[row] + 1, w: xs[col + 1] - xs[col] - 1,
        h: ys[row + 1] - ys[row] - 1, front: 'south', street: ys[row + 1], linear: false });
    }
    map.spawn = { x: 0, y: 0 };
  }
  return blocks;
}

/** At most two rows: every house keeps a frontage without paths through another house. */
export function housingPlots(block: VillageBlock): VillagePlot[] {
  const verticalStreet = block.front === 'east' || block.front === 'west';
  const cols = block.w >= 16 && !(block.linear && verticalStreet) ? 2 : 1;
  const rows = block.h >= 16 && !(block.linear && !verticalStreet) ? 2 : 1;
  const plots: VillagePlot[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = block.x + Math.floor(col * block.w / cols), y = block.y + Math.floor(row * block.h / rows);
    const w = block.x + Math.floor((col + 1) * block.w / cols) - x;
    const h = block.y + Math.floor((row + 1) * block.h / rows) - y;
    const front: Front = block.linear ? block.front : rows > 1 && row === 0 ? 'north' : 'south';
    const street = block.linear ? block.street : front === 'north' ? block.y - 1 : block.y + block.h;
    plots.push({ x, y, w, h, front, street });
  }
  return plots;
}

export function shuffle<T>(items: readonly T[], rng: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
