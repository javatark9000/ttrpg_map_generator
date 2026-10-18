import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';
import { connectRegions } from './connectivity';
import { cityAlleySections, cityBlocks, cityFrontagePlots, shuffleCity } from './city/layout';
import type { CityPlot } from './city/layout';

/** Exterior city: streets and walls are terrain; roofs never create interior maps. */
export function generateCity(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const street = c.cityStreetWidth === 'narrow' ? 1 : c.cityStreetWidth === 'wide' ? 3 : 2;
  const inset = c.cityWalls ? 1 : 0;
  const bounds: Rect = { x: inset, y: inset, w: w - inset * 2, h: h - inset * 2 };
  const roads = new Uint8Array(w * h), buildings = new Uint8Array(w * h), decoration = new Uint8Array(w * h);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const isRoad = (x: number, y: number) => inside(x, y) && roads[y * w + x] === 1;
  const each = (r: Rect, action: (x: number, y: number) => void) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) action(x, y);
  };
  const road = (r: Rect) => { p.rect(r, 'floor'); each(r, (x, y) => { roads[y * w + x] = 1; }); };
  // Callers specify a world-space size, not a multiplier of a different asset's size.
  const object = (asset: AssetId, x: number, y: number, size: number, rotation = 0) => p.object(asset, x, y, size / ASSET_SIZES[asset], rotation);
  map.terrain.fill(c.cityWalls ? 'wall' : 'floor');
  road(bounds);

  const blocks = cityBlocks(bounds, street, c.complexity, rng);
  for (const block of blocks) {
    p.rect(block, 'gravel');
    each(block, (x, y) => { roads[y * w + x] = 0; });
  }
  // A civic square is reserved before density is applied, never on top of a house.
  const centerDistance = (r: Rect) => Math.hypot(r.x + r.w / 2 - w / 2, r.y + r.h / 2 - h / 2);
  const square = blocks.length >= 5 ? blocks.reduce((best, r, i) => centerDistance(r) < centerDistance(blocks[best]) ? i : best, 0) : -1;
  const plots: CityPlot[] = [];
  blocks.forEach((block, index) => {
    if (index === square) { p.rect(block, 'floor'); return; }
    for (const section of cityAlleySections(block, c.cityAlleys, rng, road)) plots.push(...cityFrontagePlots(section, index, isRoad));
  });

  const occupiedCount = Math.round(plots.length * c.cityDensity / 100);
  const occupied = new Set(shuffleCity(plots.map((_, i) => i), rng).slice(0, occupiedCount));
  // Spatial ordering produces coherent neighborhoods rather than alternating shops.
  // Only the transition block may be mixed, to honor the global commercial quota.
  const alongX = rng.next() < .5, reverse = rng.next() < .5 ? -1 : 1;
  const districtOrder = blocks.map((_, i) => i).sort((a, b) => {
    const aa = blocks[a], bb = blocks[b];
    const main = alongX ? aa.x + aa.w / 2 - bb.x - bb.w / 2 : aa.y + aa.h / 2 - bb.y - bb.h / 2;
    const secondary = alongX ? aa.y - bb.y : aa.x - bb.x;
    return reverse * (main || secondary);
  });
  const districtRanks = new Map(districtOrder.map((index, rank) => [index, rank]));
  const commercialCount = Math.round(occupiedCount * c.cityDistrictBalance / 100);
  const commercial = new Set([...occupied].sort((a, b) => districtRanks.get(plots[a].block)! - districtRanks.get(plots[b].block)! || a - b).slice(0, commercialCount));
  const commercialBlocks = new Set([...commercial].map(i => plots[i].block));
  blocks.forEach((block, index) => {
    if (index === square) return;
    each(block, (x, y) => { if (!isRoad(x, y)) p.set(x, y, commercialBlocks.has(index) ? 'gravel' : 'grass'); });
  });

  function build(plot: CityPlot, shop: boolean): void {
    const size = Math.min(5, plot.w, plot.h);
    let x = plot.x + Math.floor((plot.w - size) / 2), y = plot.y + Math.floor((plot.h - size) / 2);
    if (plot.front === 'north') y = plot.y;
    else if (plot.front === 'south') y = plot.y + plot.h - size;
    else if (plot.front === 'west') x = plot.x;
    else x = plot.x + plot.w - size;
    const r = { x, y, w: size, h: size }, mid = Math.floor(size / 2);
    p.rect(r, shop ? 'floor' : 'wood'); p.border(r);
    each(r, (xx, yy) => { buildings[yy * w + xx] = 1; });
    const dx = plot.front === 'west' ? x : plot.front === 'east' ? x + size - 1 : x + mid;
    const dy = plot.front === 'north' ? y : plot.front === 'south' ? y + size - 1 : y + mid;
    p.set(dx, dy, 'floor');
    const angle = plot.front === 'north' ? Math.PI : plot.front === 'south' ? 0 : plot.front === 'west' ? Math.PI / 2 : -Math.PI / 2;
    const roof: AssetId = shop ? 'roof-shop' : c.houseStatus === 'poor' ? 'roof-house-poor' : c.houseStatus === 'wealthy' ? 'roof-house-wealthy' : 'roof-house-common';
    // Keep the entire SVG within its reserved footprint, including rotated roofs.
    object(roof, x + size / 2, y + size / 2, size, angle);
    object('door', dx + .5, dy + .5, .8, plot.front === 'west' || plot.front === 'east' ? Math.PI / 2 : 0);
  }
  plots.forEach((plot, index) => { if (occupied.has(index)) build(plot, commercial.has(index)); });

  function decorate(asset: AssetId, x: number, y: number, size: number, rotation = 0): boolean {
    // Conservative bounding boxes keep markets, trees and manholes out of buildings.
    const radius = size / 2;
    const cells: number[] = [];
    for (let yy = Math.floor(y - radius); yy < Math.ceil(y + radius); yy++) for (let xx = Math.floor(x - radius); xx < Math.ceil(x + radius); xx++) {
      if (!inside(xx, yy) || !p.open(xx, yy)) return false;
      const index = yy * w + xx;
      if (buildings[index] || decoration[index]) return false;
      cells.push(index);
    }
    object(asset, x, y, size, rotation);
    for (const index of cells) decoration[index] = 1;
    return true;
  }
  if (square >= 0 && c.landmarks) {
    const r = blocks[square], x = r.x + r.w / 2, y = r.y + r.h / 2;
    decorate('well', x, y, 1.5);
    if (commercialCount > 0 && r.w >= 7 && r.h >= 5) {
      decorate('market-stall', r.x + 1.5, r.y + 1.5, 2);
      decorate('market-stall', r.x + r.w - 1.5, r.y + r.h - 1.5, 2, Math.PI);
    }
    if (r.w >= 5 && r.h >= 7) {
      decorate('bench', x, r.y + 1, 1.5);
      decorate('tree-oak', r.x + 1.3, r.y + r.h - 1.3, 1.8);
    }
  }
  // Vacant plots remain usable courtyards; decoration never changes the density quota.
  plots.forEach((plot, index) => {
    if (occupied.has(index) || !c.landmarks || rng.next() > c.density / 160) return;
    const asset = commercialBlocks.has(plot.block) ? rng.pick<AssetId>(['crates', 'barrels', 'cart']) : rng.pick<AssetId>(['bush', 'flowers', 'tree-oak']);
    decorate(asset, plot.x + plot.w / 2, plot.y + plot.h / 2, asset === 'tree-oak' ? 1.8 : 1.2, rng.pick([0, Math.PI / 2, Math.PI, Math.PI * 1.5]));
  });

  const narrow = Math.min(bounds.w, bounds.h) < street * 2 + 3;
  const horizontal = bounds.w >= bounds.h;
  // Tiny maps share their sole avenue with both gates; ordinary cities have four gates.
  const sides: ('north' | 'south' | 'west' | 'east')[] = narrow ? horizontal ? ['west', 'east'] : ['north', 'south'] : ['north', 'south', 'west', 'east'];
  const gates = new Set<number>();
  const gateObjects: { x: number; y: number; angle: number }[] = [];
  for (const side of sides) {
    const verticalBorder = side === 'west' || side === 'east';
    const length = verticalBorder ? h : w;
    const start = narrow ? inset : Math.max(inset, Math.floor((length - street) / 2));
    const edge = side === 'west' || side === 'north' ? 0 : verticalBorder ? w - 1 : h - 1;
    for (let i = 0; i < street; i++) {
      const x = verticalBorder ? edge : start + i, y = verticalBorder ? start + i : edge;
      p.set(x, y, 'floor'); roads[y * w + x] = 1; gates.add(y * w + x);
    }
    gateObjects.push({ x: verticalBorder ? edge + .5 : start + street / 2, y: verticalBorder ? start + street / 2 : edge + .5, angle: verticalBorder ? Math.PI / 2 : 0 });
  }
  const firstGate = gateObjects[0];
  map.spawn = firstGate ? { x: Math.floor(firstGate.x), y: Math.floor(firstGate.y) } : { x: inset, y: inset };
  if (c.cityWalls) {
    for (let x = 1; x < w - 1; x++) for (const y of [0, h - 1]) if (!gates.has(y * w + x)) object('city-wall', x + .5, y + .5, 1);
    for (let y = 1; y < h - 1; y++) for (const x of [0, w - 1]) if (!gates.has(y * w + x)) object('city-wall', x + .5, y + .5, 1, Math.PI / 2);
    // The corner asset's unrotated arms point east and south.
    object('city-wall-corner', .5, .5, 1);
    object('city-wall-corner', w - .5, .5, 1, Math.PI / 2);
    object('city-wall-corner', w - .5, h - .5, 1, Math.PI);
    object('city-wall-corner', .5, h - .5, 1, Math.PI * 1.5);
    for (const gate of gateObjects) object('city-gate', gate.x, gate.y, street, gate.angle);
  }

  // Exterior streets and every door already join the network. This guard also
  // joins any isolated rear yard, without treating decorative SVGs as obstacles.
  connectRegions(map, 'floor');
  if (c.citySewers) {
    const candidates: number[] = [];
    for (let y = inset; y < h - inset; y++) for (let x = inset; x < w - inset; x++) {
      if (isRoad(x, y) && !buildings[y * w + x] && !decoration[y * w + x]) candidates.push(y * w + x);
    }
    const placed: { x: number; y: number }[] = [];
    const count = Math.max(1, Math.round(w * h / 350));
    for (const index of shuffleCity(candidates, rng)) {
      const x = index % w + .5, y = Math.floor(index / w) + .5;
      if (placed.some(point => Math.hypot(point.x - x, point.y - y) < 6)) continue;
      if (Math.hypot(x - map.spawn.x - .5, y - map.spawn.y - .5) < 2) continue;
      if (decorate('sewer-entrance', x, y, .9)) placed.push({ x, y });
      if (placed.length >= count) break;
    }
  }
}
