import type { Random } from '../../random';
import type { Rect } from '../../scenario-painter';

export type CityFront = 'north' | 'south' | 'west' | 'east';
export interface CityPlot extends Rect { front: CityFront; block: number }
interface Span { start: number; length: number }

/** Unequal blocks, with the requested road width preserved between them. */
function blockSpans(start: number, length: number, street: number, target: number, rng: Random): Span[] {
  const available = length - street * 2;
  if (available < 3) return [];
  const count = Math.max(1, Math.min(Math.floor((available + street) / (3 + street)), Math.round((available + street) / (target + street))));
  const lengths = Array<number>(count).fill(3);
  for (let extra = available - street * (count - 1) - count * 3; extra > 0; extra--) lengths[rng.int(0, count - 1)]++;
  let cursor = start + street;
  return lengths.map(size => { const span = { start: cursor, length: size }; cursor += size + street; return span; });
}

export function cityBlocks(bounds: Rect, street: number, complexity: number, rng: Random): Rect[] {
  // A narrow map has one avenue rather than a ring that would consume every lot.
  if (Math.min(bounds.w, bounds.h) < street * 2 + 3) {
    if (bounds.w >= bounds.h) return bounds.h - street >= 3 ? [{ ...bounds, y: bounds.y + street, h: bounds.h - street }] : [];
    return bounds.w - street >= 3 ? [{ ...bounds, x: bounds.x + street, w: bounds.w - street }] : [];
  }
  const target = 13 - Math.floor(complexity / 25);
  const xs = blockSpans(bounds.x, bounds.w, street, target, rng);
  const ys = blockSpans(bounds.y, bounds.h, street, target, rng);
  return ys.flatMap(y => xs.map(x => ({ x: x.start, y: y.start, w: x.length, h: y.length })));
}

/** Alleys are reserved before plots, so they cannot pass beneath a roof. */
export function cityAlleySections(block: Rect, amount: 'none' | 'few' | 'many', rng: Random, road: (r: Rect) => void): Rect[] {
  if (amount === 'none' || (amount === 'few' && rng.next() >= .35)) return [block];
  const split = (r: Rect, vertical: boolean): Rect[] => {
    const length = vertical ? r.w : r.h;
    if (length < 7) return [r];
    const left = Math.floor((length - 1) / 2);
    if (vertical) {
      road({ x: r.x + left, y: r.y, w: 1, h: r.h });
      return [{ ...r, w: left }, { ...r, x: r.x + left + 1, w: r.w - left - 1 }];
    }
    road({ x: r.x, y: r.y + left, w: r.w, h: 1 });
    return [{ ...r, h: left }, { ...r, y: r.y + left + 1, h: r.h - left - 1 }];
  };
  const vertical = block.w >= block.h;
  const sections = split(block, vertical);
  return amount === 'many' ? sections.flatMap(r => split(r, !vertical)) : sections;
}

/** Small unpaved gaps prevent a full frontage from sealing its rear courtyard. */
function frontageSpans(start: number, length: number): Span[] {
  if (length < 3) return [];
  const count = Math.max(1, Math.min(Math.floor((length + 1) / 4), Math.round((length + 1) / 5)));
  const available = length - count + 1, base = Math.floor(available / count);
  let cursor = start;
  return Array.from({ length: count }, (_, i) => {
    const size = base + (i < available % count ? 1 : 0);
    const span = { start: cursor, length: size }; cursor += size + 1; return span;
  });
}

export function cityFrontagePlots(r: Rect, block: number, isRoad: (x: number, y: number) => boolean): CityPlot[] {
  const result: CityPlot[] = [];
  if (r.w < 3 || r.h < 3) return result;
  const north = isRoad(r.x + Math.floor(r.w / 2), r.y - 1);
  const south = isRoad(r.x + Math.floor(r.w / 2), r.y + r.h);
  let top = 0, bottom = 0;
  if (north) {
    top = Math.min(5, south && r.h >= 6 ? Math.floor(r.h / 2) : r.h);
    for (const span of frontageSpans(r.x, r.w)) result.push({ x: span.start, y: r.y, w: span.length, h: top, front: 'north', block });
  }
  if (south && r.h - top >= 3) {
    bottom = Math.min(5, r.h - top);
    for (const span of frontageSpans(r.x, r.w)) result.push({ x: span.start, y: r.y + r.h - bottom, w: span.length, h: bottom, front: 'south', block });
  }
  const remaining = r.h - top - bottom;
  if (remaining < 3) return result;
  const west = isRoad(r.x - 1, r.y + top + Math.floor(remaining / 2));
  const east = isRoad(r.x + r.w, r.y + top + Math.floor(remaining / 2));
  let left = 0;
  if (west) {
    left = Math.min(5, east && r.w >= 6 ? Math.floor(r.w / 2) : r.w);
    for (const span of frontageSpans(r.y + top, remaining)) result.push({ x: r.x, y: span.start, w: left, h: span.length, front: 'west', block });
  }
  if (east && r.w - left >= 3) {
    const right = Math.min(5, r.w - left);
    for (const span of frontageSpans(r.y + top, remaining)) result.push({ x: r.x + r.w - right, y: span.start, w: right, h: span.length, front: 'east', block });
  }
  return result;
}

export function shuffleCity<T>(items: T[], rng: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i); [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
