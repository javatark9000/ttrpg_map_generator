import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';
import { connectRegions } from './connectivity';

/** The original library layout, extracted without introducing new rooms or options. */
export function generateLibrary(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const floor = 'wood' as const;
  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, floor);
  const entrance = Math.floor(w / 2);
  p.set(entrance, h - 1, floor);
  p.object('door', entrance + .5, h - .5, .9);
  map.spawn = { x: entrance, y: h - 2 };

  // Preserve the old density checks and random draw order. Asset-specific natural
  // sizes are applied by PlaceObject, rather than another global scale factor.
  const furniture = (asset: AssetId, x: number, y: number, scale = 1, rotation = 0, required = false): boolean => {
    if (p.open(x, y) && (required || rng.next() * 100 < c.density)) {
      p.object(asset, x, y, scale, rotation);
      return true;
    }
    return false;
  };
  const feature = (asset: AssetId, x: number, y: number, scale = 1): void => {
    if (c.landmarks) furniture(asset, x, y, scale, 0, true);
  };

  if (h >= 16) {
    const divider = h - 7;
    for (let x = 1; x <= w - 2; x++) p.set(x, divider, 'wall');
    p.set(entrance, divider, floor);
    p.object('door', entrance + .5, divider + .5, .85);
  }
  const end = h >= 16 ? h - 9 : h - 3;
  const spacing = c.complexity > 60 ? 3 : 4;
  for (let y = 3; y < end; y += spacing) {
    for (let x = 3; x < w - 2; x += spacing) {
      if (Math.abs(x - entrance) > 1.5) furniture('bookshelf', x, y, .9);
    }
  }
  feature('bookshelf', 2.6, 2.5, .8);
  feature('table', w / 2, h - 4, .9);
  feature('books', w / 2 + .3, h - 4, .6);
  furniture('rug', w / 2, h - 4, 1.1);

  p.set(map.spawn.x, map.spawn.y, floor);
  if (c.landmarks) {
    p.object('torch', 1.6, Math.min(h - 2.5, 3.5), .65, -Math.PI / 2);
    if (w > 14) p.object('torch', w - 1.6, h - 3.5, .65, Math.PI / 2);
  }
  connectRegions(map, floor);

  // Decorative exterior windows only: keep the wall solid and avoid corners,
  // doors and junctions with the reading-room divider. No random draws here.
  const window = (x: number, y: number, inwardX: number, inwardY: number, rotation: number): void => {
    const tangentX = -inwardY, tangentY = inwardX;
    for (let offset = -1; offset <= 1; offset++) {
      const wx = x + tangentX * offset, wy = y + tangentY * offset;
      if (p.at(wx, wy) !== 'wall' || !p.open(wx + inwardX, wy + inwardY)) return;
    }
    p.object('window', x + .5, y + .5, 1, rotation);
  };
  const windowSpacing = 6;
  for (let x = 3; x < w - 2; x += windowSpacing) {
    window(x, 0, 0, 1, 0);
    window(x, h - 1, 0, -1, Math.PI);
  }
  for (let y = 3; y < h - 2; y += windowSpacing) {
    window(0, y, 1, 0, -Math.PI / 2);
    window(w - 1, y, -1, 0, Math.PI / 2);
  }
}
