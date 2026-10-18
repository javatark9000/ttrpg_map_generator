import type { BattleMap } from '../../types';
import type { Random } from '../../random';
import type { MountainLayout } from './options';

interface Point { x: number; y: number }

/** Rasterize segments rather than testing one sample per column: even sharp bends stay connected. */
function stroke(map: BattleMap, points: Point[], radius: number): void {
  const { width: w, height: h } = map.config;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const squared = dx * dx + dy * dy;
    for (let y = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius)); y <= Math.min(h - 1, Math.ceil(Math.max(a.y, b.y) + radius)); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius)); x <= Math.min(w - 1, Math.ceil(Math.max(a.x, b.x) + radius)); x++) {
        const t = squared ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / squared)) : 0;
        if (Math.hypot(x - a.x - dx * t, y - a.y - dy * t) <= radius) map.terrain[y * w + x] = 'path';
      }
    }
  }
}

export function mountainPaths(map: BattleMap, rng: Random, requested: MountainLayout): void {
  const { width: w, height: h, complexity } = map.config, portrait = h > w;
  const length = (portrait ? h : w) - 1, span = (portrait ? w : h) - 1;
  const point = (long: number, short: number): Point => portrait ? { x: short, y: long } : { x: long, y: short };
  const layout = requested === 'random' ? rng.pick(['pass', 'switchback', 'ridge', 'fork'] as const) : requested;
  const phase = rng.next() * Math.PI * 2, bend = complexity / 100;
  const paths: Point[][] = [];
  if (layout === 'switchback') {
    const turns = 3 + Math.floor(bend * 3), points = [point(0, span * .5)];
    const side = rng.next() < .5 ? -1 : 1;
    for (let i = 1; i <= turns; i++) points.push(point(length * i / (turns + 1), span * (.5 + side * (i % 2 ? 1 : -1) * (.22 + bend * .1))));
    points.push(point(length, span * .5)); paths.push(points);
  } else if (layout === 'fork') {
    const joint = point(length * .48, span * .5);
    paths.push([point(0, span * (.4 + rng.next() * .2)), point(length * .23, span * .46), joint]);
    paths.push([joint, point(length * .72, span * .3), point(length, span * .18)]);
    paths.push([joint, point(length * .72, span * .7), point(length, span * .82)]);
  } else {
    const points: Point[] = [], offset = layout === 'ridge' ? span * (.35 + rng.next() * .3) : span * .5;
    for (let long = 0; long <= length; long++) {
      const short = offset + Math.sin(long / length * (layout === 'ridge' ? 2.8 : 4 + bend * 4) + phase) * span * (layout === 'ridge' ? .035 + bend * .025 : .08 + bend * .12);
      points.push(point(long, short));
    }
    paths.push(points);
  }
  for (const path of paths) stroke(map, path, Math.min(w, h) < 12 ? .85 : 1.15);
  const entry = paths[0][0]; map.spawn = { x: Math.round(entry.x), y: Math.round(entry.y) };
}
