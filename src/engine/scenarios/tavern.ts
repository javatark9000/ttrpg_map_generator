import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w - .001 && a.x + a.w > b.x + .001 &&
  a.y < b.y + b.h - .001 && a.y + a.h > b.y + .001;

type FurniturePlacement = [asset: AssetId, x: number, y: number, size: number, rotation?: number];

// Both floors use the same local placement rule. Sizes are absolute casillas;
// the catalog conversion happens only when emitting an object.
function tavernFurniture(p: ReturnType<typeof painter>, reserved: Rect[]) {
  const occupied: Rect[] = [];
  // Commit seating only after both the table and its bench fit. A rejected
  // group leaves neither objects nor occupied footprints behind.
  const group = (items: FurniturePlacement[]): boolean => {
    const pending: Rect[] = [];
    for (const [, x, y, size, rotation = 0] of items) {
      const side = size * (Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation)));
      const box = { x: x - side / 2, y: y - side / 2, w: side, h: side };
      if (box.x < 1 - .001 || box.y < 1 - .001 || box.x + side > p.w - 1 + .001 || box.y + side > p.h - 1 + .001) return false;
      if (reserved.some(r => overlaps(box, r)) || occupied.some(r => overlaps(box, r)) || pending.some(r => overlaps(box, r))) return false;
      for (let yy = Math.floor(box.y + .001); yy < Math.ceil(box.y + side - .001); yy++)
        for (let xx = Math.floor(box.x + .001); xx < Math.ceil(box.x + side - .001); xx++)
          if (!p.open(xx, yy)) return false;
      pending.push(box);
    }
    for (const [asset, x, y, size, rotation = 0] of items)
      p.object(asset, x, y, size / ASSET_SIZES[asset], rotation);
    occupied.push(...pending);
    return true;
  };
  const furniture = (...item: FurniturePlacement): boolean => group([item]);
  const required = (asset: AssetId, x: number, y: number, size: number, rotation = 0): void => {
    if (!furniture(asset, x, y, size, rotation)) throw new Error(`La taberna no puede colocar su elemento obligatorio: ${asset}.`);
  };
  return { furniture, required, group };
}

/** A public hall and serving bar, with two independently accessible service rooms.
 * Furniture footprints and reserved aisles are local generation constraints, not
 * a change to the editor's terrain-only navigation model.
 */
export function generateTavern(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const messy = c.tavernCondition === 'messy';
  const divider = Math.max(4, Math.min(w - 4, Math.round(w * (.64 + rng.next() * .05))));
  const split = Math.max(4, Math.min(h - 3, Math.round(h * (.46 + rng.next() * .08))));
  const aisle = divider - 1;
  const barRow = h < 10 ? 2 : 3;
  const kitchenDoor = barRow - 1, cellarDoor = split + 1;
  const reserved: Rect[] = [];
  const reserve = (x: number, y: number, width: number, height: number) =>
    reserved.push({ x, y, w: width, h: height });

  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'wood');
  // Service rooms are defined by walls, not inferred from scattered decoration.
  p.rect({ x: divider + 1, y: 1, w: w - divider - 2, h: split - 1 }, 'floor');
  for (let y = 1; y < h - 1; y++) p.set(divider, y, 'wall');
  for (let x = divider + 1; x < w - 1; x++) p.set(x, split, 'wall');
  const door = (x: number, y: number, vertical = false) => {
    p.set(x, y, x > divider || y === kitchenDoor ? 'floor' : 'wood');
    p.object('door', x + .5, y + .5, .85 / ASSET_SIZES.door, vertical ? Math.PI / 2 : 0);
  };
  door(aisle, h - 1);
  door(divider, kitchenDoor, true);
  door(divider, cellarDoor, true);
  map.spawn = { x: aisle, y: h - 2 };

  // Continuous public route, open bar end, staff passage and service landings.
  reserve(aisle, 1, 1, h - 2);
  reserve(1, barRow - 1, divider - 1, 1);
  reserve(1, barRow + 1, divider - 1, 1);
  reserve(divider, kitchenDoor, w - divider - 1, 1);
  reserve(divider, cellarDoor, w - divider - 1, 1);

  const { furniture, required, group } = tavernFurniture(p, reserved);

  // A continuous modular counter separates customers from the staff passage.
  // The side aisle is its sole open end; never shrink it to increase bar length.
  for (let x = 1; x < aisle; x++) {
    required('bar-counter', x + .5, barRow + .5, 1);
    // Drinks intentionally sit on the counter rather than claiming floor space.
    if ((x - 1) % 2 === 0) p.object('drinks', x + .5, barRow + .5, .35 / ASSET_SIZES.drinks);
  }

  const serviceX = (divider + w) / 2;
  // These defining fixtures survive density=0 and landmarks=false.
  required('wood-stove', serviceX, split - 1, Math.min(1.4, w - divider - 2));
  const barrelSize = Math.min(1.2, h - split - 3 - .1);
  required('barrels', serviceX, h - 1 - barrelSize / 2 - .05, barrelSize);
  if (split >= 7) furniture('counter', serviceX, split - 3, 1.3);
  for (let y = cellarDoor + 2.5; y < h - 3; y += 2)
    if (rng.next() * 100 < c.density) furniture('sacks', divider + 1.7, y, 1);

  // Small plans still retain seating and a stair landing. Larger plans use a
  // full-size staircase; it is placed before optional furniture can consume it.
  const compact = h < 11 || divider < 6;
  const stairSize = compact ? 1.1 : 1.8;
  const stairX = 1 + stairSize / 2, stairY = h - 1 - stairSize / 2 - .05;
  if (c.tavernUpperStairs) {
    required('stairs-up', stairX, stairY, stairSize, -Math.PI / 2);
    // Rotate the south-facing asset so its entrance faces the eastern landing.
    reserve(stairX + stairSize / 2, Math.floor(stairY), aisle - stairX - stairSize / 2 + 1, 1);
  }

  const tableSize = compact ? 1.05 : 1.5;
  const benchSize = compact ? .55 : .8;
  const firstY = barRow + 2 + tableSize / 2 + .1;
  const firstX = compact ? 1.65 : 2.15;
  const step = c.complexity > 60 ? 3.3 : 4;
  let tables = 0;
  for (let y = firstY; y + tableSize / 2 < h - 1; y += step) {
    for (let x = firstX; x + tableSize / 2 <= aisle; x += step) {
      if (tables > 0 && rng.next() * 100 >= c.density) continue;
      // A brawl changes furniture inside its bay, never reserved circulation.
      // If either displaced piece fails, retry the complete tidy seating group.
      const dx = messy ? (rng.next() - .5) * .4 : 0;
      const dy = messy ? (rng.next() - .5) * .3 : 0;
      const angle = messy ? (rng.next() - .5) * .45 : 0;
      const benchY = y + (compact ? .9 : 1.3);
      const placed = group([
        ['table', x + dx, y + dy, tableSize, angle],
        ['bench', x + (messy ? .25 : 0), benchY, benchSize, messy ? Math.PI / 2 : 0],
      ]);
      if (!placed && (!messy || !group([
        ['table', x, y, tableSize], ['bench', x, benchY, benchSize],
      ]))) continue;
      tables++;
      if (!compact && c.density > 70) furniture('bench', x, y - 1.3, benchSize, messy ? -.35 : 0);
      if (messy) {
        // Spilled vessels on the floor, not just a random rotation of the map.
        furniture('drinks', x + tableSize / 2 + .4, y + .6, .35, rng.next() * Math.PI * 2);
      }
    }
  }

  if (tables === 0) throw new Error('La taberna no tiene espacio para una mesa con asiento en el salón.');
  if (!compact) furniture('fireplace', 1.7, h - 2.1, 1.3, Math.PI);
  if (c.landmarks) {
    p.object('torch', .8, barRow + 1.5, .55 / ASSET_SIZES.torch, -Math.PI / 2);
    p.object('torch', w - .8, cellarDoor + .5, .55 / ASSET_SIZES.torch, Math.PI / 2);
  }

  // Exterior windows never punch holes in the terrain, affect lighting, or
  // overlap doors, corners or the junction of an interior partition.
  const window = (x: number, y: number, rotation = 0) =>
    p.object('window', x + .5, y + .5, .8 / ASSET_SIZES.window, rotation);
  for (let x = 2; x < w - 2; x += 4) {
    if (Math.abs(x - divider) > 1) window(x, 0);
    if (Math.abs(x - divider) > 1 && Math.abs(x - aisle) > 1) window(x, h - 1);
  }
  for (let y = 2; y < h - 2; y += 4) {
    window(0, y, Math.PI / 2);
    if (Math.abs(y - split) > 1) window(w - 1, y, Math.PI / 2);
  }

  if (c.tavernUpperStairs) addUpperFloor(map, rng, divider, stairX, stairY, stairSize);
}

/** Upstairs is the proprietor's private lodging and a separate reading room,
 * with a shared southern landing. It is not a duplicate of the public bar.
 */
function addUpperFloor(map: BattleMap, rng: Random, divider: number, stairX: number, stairY: number, stairSize: number): void {
  const { width: w, height: h } = map.config;
  const upper: BattleMap = {
    version: 2, config: map.config, name: map.name,
    terrain: Array(w * h).fill('wall'), objects: [],
    spawn: { x: Math.ceil(stairX + stairSize / 2), y: Math.floor(stairY) },
  };
  const put: PlaceObject = (asset, x, y, scale = 1, rotation = 0) => {
    upper.objects.push({ id: `tavern-upper-${upper.objects.length}`, asset, x, y, scale: ASSET_SIZES[asset] * scale, rotation });
  };
  const p = painter(upper, put);
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'wood');
  const partition = Math.max(3, Math.min(h - 4, Math.floor(h * .48)));
  // Two northern private rooms open onto the shared landing, not each other.
  for (let x = 1; x < w - 1; x++) p.set(x, partition, 'wall');
  for (let y = 1; y < partition; y++) p.set(divider, y, 'wall');
  const leftDoor = divider - 1, rightDoor = divider + 1;
  for (const x of [leftDoor, rightDoor]) {
    p.set(x, partition, 'wood');
    p.object('door', x + .5, partition + .5, .85 / ASSET_SIZES.door);
  }
  const routes: Rect[] = [
    { x: leftDoor, y: 1, w: 1, h: h - 2 },
    { x: rightDoor, y: 1, w: 1, h: partition },
    { x: leftDoor, y: partition + 1, w: rightDoor - leftDoor + 1, h: 1 },
    { x: stairX + stairSize / 2, y: Math.floor(stairY), w: leftDoor + 1 - stairX - stairSize / 2, h: 1 },
  ];
  const { furniture: furnish, required } = tavernFurniture(p, routes);
  required('stairs-down', stairX, stairY, stairSize, -Math.PI / 2);
  const bedroomWidth = divider - 2;
  const bedSize = Math.min(1.6, bedroomWidth - .2, partition - 1.2);
  required('bed', 1 + bedSize / 2 + .05, 1 + bedSize / 2 + .05, bedSize);
  if (partition > 5) furnish('chest', 1.55, partition - 1, .8);
  // The compact reading room retains a table even when only one furnishing
  // column remains alongside its door aisle.
  const studySize = Math.min(1.2, w - divider - 3 - .1);
  required('table', w - 1 - studySize / 2 - .05, 1 + studySize / 2 + .05, studySize);
  if (partition > 5) furnish('bookshelf', w - 1.65, partition - 1, 1);
  for (let y = partition + 2.1; y < h - 2; y += 3.5) {
    for (let x = divider + 2.5; x < w - 2; x += 3.5) {
      if (rng.next() * 100 < map.config.density) {
        if (furnish('table', x, y, 1.2)) furnish('bench', x, y + 1.1, .7);
      }
    }
  }
  for (let x = 2; x < w - 2; x += 4) {
    if (Math.abs(x - divider) > 1) p.object('window', x + .5, .5, .8 / ASSET_SIZES.window);
  }
  for (let y = 2; y < h - 2; y += 4) {
    if (Math.abs(y - partition) > 1) {
      p.object('window', .5, y + .5, .8 / ASSET_SIZES.window, Math.PI / 2);
      p.object('window', w - .5, y + .5, .8 / ASSET_SIZES.window, Math.PI / 2);
    }
  }
  map.layers = [{ id: 'tavern-upper', name: 'Planta superior', elevation: 1, terrain: upper.terrain, objects: upper.objects, spawn: upper.spawn }];
  map.activeLayer = 0;
}
