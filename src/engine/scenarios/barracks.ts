import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';

type BedLayout = 'walls' | 'perpendicular' | 'rows';
interface BedPosition { x: number; y: number; rotation: number; side: number }

/** Military quarters: clear circulation is reserved before any furniture is placed. */
export function generateBarracks(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const entrance = Math.floor(w / 2);
  const contents = c.barracksContents / 100;
  // One draw chooses the whole arrangement, never a different layout per bed.
  const randomLayout = rng.pick<BedLayout>(['walls', 'perpendicular', 'rows']);
  const layout: BedLayout = c.barracksBedLayout === 'random' ? randomLayout : c.barracksBedLayout;
  const divided = h >= 16;
  const serviceEnd = divided ? 6 : 3.5;
  const occupied: Rect[] = [];
  const reserved: Rect[] = [
    { x: entrance, y: 1, w: 1, h: h - 2 },
    { x: 1, y: h - 2, w: w - 2, h: 1 },
  ];
  const overlaps = (a: Rect, b: Rect, gap = 0) =>
    a.x < b.x + b.w + gap && a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'wood');
  p.set(entrance, h - 1, 'wood');
  p.object('door', entrance + .5, h - .5, .9);
  map.spawn = { x: entrance, y: h - 2 };
  if (divided) {
    for (let x = 1; x < w - 1; x++) p.set(x, 6, 'wall');
    p.set(entrance, 6, 'wood');
    p.object('door', entrance + .5, 6.5, .85);
  }

  // Conservative sprite bounds include the full illustration, even after rotation.
  // No object may straddle a wall, another furnishing, or the reserved circulation.
  const put = (asset: AssetId, x: number, y: number, scale = 1, rotation = 0): boolean => {
    const size = ASSET_SIZES[asset] * scale;
    const extent = size * (Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation)));
    const box: Rect = { x: x - extent / 2, y: y - extent / 2, w: extent, h: extent };
    if (box.x < 1 || box.y < 1 || box.x + box.w > w - 1 || box.y + box.h > h - 1) return false;
    if (reserved.some(r => overlaps(box, r, .1)) || occupied.some(r => overlaps(box, r, .2))) return false;
    for (let yy = Math.floor(box.y); yy < Math.ceil(box.y + box.h); yy++) {
      for (let xx = Math.floor(box.x); xx < Math.ceil(box.x + box.w); xx++) {
        if (!p.open(xx, yy)) return false;
      }
    }
    p.object(asset, x, y, scale, rotation);
    occupied.push(box);
    return true;
  };

  if (contents > 0) {
    // The officers' table stays on the left; the armory stays on the right.
    // Neither service area borrows space from the through corridor or bed slots.
    put('table', (1 + entrance) / 2, divided ? 2.8 : 2.2, .9);
    if (divided && contents >= .4) put('bench', (1 + entrance) / 2, 4.9, .7);
    const weaponSize = Math.max(ASSET_SIZES.spears, ASSET_SIZES.swords);
    const weapons: { x: number; y: number }[] = [];
    for (let y = 1.2 + weaponSize / 2; y + weaponSize / 2 <= serviceEnd - .2; y += weaponSize + .7) {
      for (let x = entrance + 1.2 + weaponSize / 2; x + weaponSize / 2 <= w - 1.2; x += weaponSize + .7) {
        weapons.push({ x, y });
      }
    }
    shuffle(weapons, rng);
    for (const [i, position] of weapons.slice(0, Math.ceil(weapons.length * contents)).entries()) {
      put(i % 2 ? 'swords' : 'spears', position.x, position.y, 1, i % 2 ? Math.PI : 0);
    }
  }

  const bedSize = ASSET_SIZES['barracks-bed'];
  const left = 1.15 + bedSize / 2, right = w - left;
  const firstRow = divided ? 8 + bedSize / 2 : serviceEnd + .3 + bedSize / 2;
  const lastRow = h - 2.15 - bedSize / 2;
  const rowStep = bedSize + 1.8;
  const beds: BedPosition[] = [];
  for (let y = firstRow; y <= lastRow; y += rowStep) {
    if (layout === 'rows') {
      for (let x = left; x <= right; x += bedSize + 1.2) {
        // This column remains a continuous, full-cell passage through the building.
        if (x + bedSize / 2 > entrance - .1 && x - bedSize / 2 < entrance + 1.1) continue;
        beds.push({ x, y, rotation: 0, side: x < entrance ? 1 : -1 });
      }
    } else {
      beds.push({ x: left, y, rotation: layout === 'walls' ? 0 : -Math.PI / 2, side: 1 });
      beds.push({ x: right, y, rotation: layout === 'walls' ? Math.PI : Math.PI / 2, side: -1 });
    }
  }
  // A seeded ordering makes the content control fill a stable subset of bed slots.
  shuffle(beds, rng);
  const placed: BedPosition[] = [];
  for (const bed of beds.slice(0, Math.ceil(beds.length * contents))) {
    if (put('barracks-bed', bed.x, bed.y, 1, bed.rotation)) placed.push(bed);
  }
  // Add packs only after all beds, so equipment can never steal a selected bed slot.
  const packOffset = (bedSize + ASSET_SIZES['equipment-pack']) / 2 + .3;
  for (const bed of placed) {
    if (rng.next() >= contents) continue;
    if (layout === 'walls') {
      if (put('equipment-pack', bed.x + bed.side * packOffset, bed.y, 1, bed.rotation)) continue;
    }
    put('equipment-pack', bed.x, bed.y + packOffset, 1, bed.rotation);
  }

  // Windows are decorations on exterior walls, not holes or light sources.
  for (let y = 3; y < h - 3; y += 6) {
    if (p.at(1, y) === 'wood') p.object('window', .5, y + .5, .85, Math.PI / 2);
    if (p.at(w - 2, y) === 'wood') p.object('window', w - .5, y + .5, .85, Math.PI / 2);
  }
  for (let x = 3; x < w - 3; x += 6) {
    p.object('window', x + .5, .5, .85);
    if (Math.abs(x - entrance) > 2) p.object('window', x + .5, h - .5, .85);
  }
  if (c.landmarks) {
    p.object('torch', .5, 1.5, .5, -Math.PI / 2);
    if (w >= 14) p.object('torch', w - .5, h - 1.5, .5, Math.PI / 2);
  }
}

function shuffle<T>(items: T[], rng: Random): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
}
