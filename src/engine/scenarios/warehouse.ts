import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';

/**
 * Storage is planned before stock is drawn: changing fill never removes racks,
 * shifts columns or narrows an aisle. Objects remain decorative in the map model;
 * this local occupancy grid additionally protects their actual placement space.
 */
export function generateWarehouse(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, config = map.config;
  const layout = config.warehouseShelfLayout === 'random'
    ? rng.pick(['parallel', 'perimeter', 'mixed'] as const)
    : config.warehouseShelfLayout;
  const perimeter = layout !== 'parallel';
  const entrance = Math.floor(w / 2), aisleLeft = entrance - 1, aisleRight = entrance;
  const loadingDepth = h >= 12 ? 4 : 2;
  const loadingY = h - 1 - loadingDepth;
  const firstRackY = perimeter ? 3 : 2;
  const crossAisles = new Set<number>([perimeter ? 2 : 1, loadingY]);
  // Six-cell runs are interrupted by a full-width, one-cell cross aisle.
  for (let y = firstRackY + 6; y < loadingY; y += 7) crossAisles.add(y);

  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'floor');
  // A two-cell loading entrance feeds a straight, two-cell central corridor.
  for (const x of [aisleLeft, aisleRight]) {
    p.set(x, h - 1, 'floor');
    p.object('door', x + .5, h - .5, .95 / ASSET_SIZES.door);
  }
  map.spawn = { x: entrance, y: h - 2 };

  const reserved = new Uint8Array(w * h);
  const occupied = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (x === aisleLeft || x === aisleRight || crossAisles.has(y)) reserved[y * w + x] = 1;
    }
  }
  const available = (x: number, y: number): boolean =>
    x >= 1 && y >= 1 && x < w - 1 && y < h - 1 &&
    !reserved[y * w + x] && !occupied[y * w + x];

  // Windows align with circulation, never with a wall rack, corner or door.
  p.object('window', entrance + .5, .5, 1 / ASSET_SIZES.window);
  for (const y of crossAisles) {
    p.object('window', .5, y + .5, 1 / ASSET_SIZES.window, Math.PI / 2);
    p.object('window', w - .5, y + .5, 1 / ASSET_SIZES.window, Math.PI / 2);
  }

  // A one-cell aisle separates each pair of interior rows. Mixed layouts also
  // leave an unbroken aisle between the wall racks and the first interior row.
  const inset = perimeter ? 3 : 2;
  const leftRows: number[] = [], rightRows: number[] = [];
  for (let x = aisleLeft - 1; x >= inset; x -= 2) leftRows.push(x);
  for (let x = aisleRight + 1; x <= w - 1 - inset; x += 2) rightRows.push(x);
  const rows = [...leftRows, ...rightRows];
  const racks: { x: number; y: number; rotation: number }[] = [];
  const rack = (x: number, y: number, rotation: number): void => {
    if (!available(x, y)) return;
    occupied[y * w + x] = 1;
    racks.push({ x, y, rotation });
  };

  // Columns occupy the same structural lines as racks, not the lanes between
  // them. A small footprint needs no interior supports; larger halls get a grid.
  const columnXs = [
    ...leftRows.filter((_, i) => i % 3 === 0),
    ...rightRows.filter((_, i) => i % 3 === 0),
  ];
  if (w >= 12 && loadingY - firstRackY >= 6) {
    for (let y = firstRackY; y < loadingY - 1; y += 7) {
      for (const x of columnXs) {
        if (!available(x, y)) continue;
        occupied[y * w + x] = 1;
        p.object('pillar', x + .5, y + .5, .8 / ASSET_SIZES.pillar);
      }
    }
  }

  if (perimeter) {
    for (let x = 1; x < w - 1; x++) rack(x, 1, 0);
    for (let y = 3; y < loadingY; y++) {
      rack(1, y, Math.PI / 2);
      rack(w - 2, y, Math.PI / 2);
    }
  }
  if (layout !== 'perimeter') {
    for (const x of rows) {
      for (let y = firstRackY; y < loadingY; y++) rack(x, y, Math.PI / 2);
    }
  }

  // Shelf sprites are one-cell modules whose horizontal ends join. Rotation
  // creates vertical runs without stretching a single bookshelf illustration.
  for (const { x, y, rotation } of racks) {
    const asset = rng.next() * 100 < config.warehouseFill ? 'shelf-full' : 'shelf-empty';
    p.object(asset, x + .5, y + .5, 1 / ASSET_SIZES[asset], rotation);
  }

  // Cargo occupies side bays only. The entrance, central route and the entire
  // loading cross aisle remain clear even at 100% stock.
  const cargo = (asset: AssetId, x: number, y: number, cells = 1): boolean => {
    for (let yy = y; yy < y + cells; yy++) {
      for (let xx = x; xx < x + cells; xx++) if (!available(xx, yy)) return false;
    }
    for (let yy = y; yy < y + cells; yy++) {
      for (let xx = x; xx < x + cells; xx++) occupied[yy * w + xx] = 1;
    }
    // Bounding squares fit entirely in their reserved cells, including SVG
    // padding. Loose groups retain their proportions and never overlap racks.
    p.object(asset, x + cells / 2, y + cells / 2, cells * .9 / ASSET_SIZES[asset]);
    return true;
  };
  if (config.landmarks && loadingDepth >= 3) cargo('cart', 1, loadingY + 1, 2);
  for (let y = loadingY + 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const stock = rng.next() * 100;
      const asset = rng.pick<AssetId>(['crates', 'barrels', 'sacks']);
      if (stock < config.warehouseFill) cargo(asset, x, y);
    }
  }
  if (config.landmarks) {
    p.object('torch', .5, h - 1.5, .6 / ASSET_SIZES.torch, -Math.PI / 2);
    p.object('torch', w - .5, h - 1.5, .6 / ASSET_SIZES.torch, Math.PI / 2);
  }
}
