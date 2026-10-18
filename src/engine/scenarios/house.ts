import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';
import { HOUSE_LAYOUTS, houseBedroomCapacity, planHouse } from './house/layout';
import type { HouseRoom } from './house/layout';

export { houseBedroomCapacity, houseOptionsError } from './house/layout';

interface Footprint extends Rect { asset?: AssetId }
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** A single residential floor. Additional storeys belong to the project's layer orchestration. */
export function generateHouse(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const compatible = HOUSE_LAYOUTS.filter(layout => houseBedroomCapacity(w, h, layout) >= Math.max(1, c.houseBedrooms));
  const layout = c.houseLayout === 'random' ? rng.pick(compatible) : c.houseLayout;
  const capacity = houseBedroomCapacity(w, h, layout);
  const target = Math.min(capacity, Math.max(1, Math.round(w * h / (150 - c.complexity * .7))));
  const bedroomCount = c.houseBedrooms || rng.int(Math.max(1, target - 1), target);
  const plan = planHouse(w, h, layout, bedroomCount);
  const occupied: Footprint[] = [], reserved: Rect[] = [];
  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'wood');
  for (const wall of plan.walls) p.rect(wall, 'wall');
  const court = plan.rooms.find(room => room.kind === 'courtyard');
  if (court) p.rect(court, 'grass');

  // A door is decorative over a permanently traversable threshold. Keep its immediate apron clear.
  const doors = [...plan.doors, { x: plan.entrance, y: h - 1, vertical: false }];
  for (const door of doors) {
    p.set(door.x, door.y, 'wood');
    p.object('door', door.x + .5, door.y + .5, .9 / ASSET_SIZES.door, door.vertical ? Math.PI / 2 : 0);
    reserved.push(door.vertical
      ? { x: door.x - .75, y: door.y + .2, w: 2.5, h: .6 }
      : { x: door.x + .2, y: door.y - .75, w: .6, h: 2.5 });
  }
  map.spawn = { x: plan.entrance, y: h - 2 };
  reserved.push({ x: map.spawn.x, y: map.spawn.y, w: 1, h: 1 });
  for (const room of plan.rooms) if (room.kind === 'corridor') reserved.push(room);
  if (layout === 'compact' && bedroomCount === 1) {
    // Reserve a full cell from the entrance to the aligned bedroom door before placing any furniture.
    const threshold = plan.doors[0].y;
    reserved.push({ x: plan.entrance, y: threshold, w: 1, h: h - 1 - threshold });
  }

  const floorFits = (box: Rect, room: HouseRoom) => {
    if (box.x < room.x || box.y < room.y || box.x + box.w > room.x + room.w || box.y + box.h > room.y + room.h) return false;
    for (let y = Math.floor(box.y); y < Math.ceil(box.y + box.h); y++) {
      for (let x = Math.floor(box.x); x < Math.ceil(box.x + box.w); x++) if (!p.open(x, y)) return false;
    }
    return !reserved.some(other => overlaps(box, other));
  };
  const put = (asset: AssetId, room: HouseRoom, x: number, y: number, size: number, rotation = 0, overlay = false): boolean => {
    const box: Footprint = { x: x - size / 2, y: y - size / 2, w: size, h: size, asset };
    if (!floorFits(box, room) || (!overlay && occupied.some(other => overlaps(box, other)))) return false;
    p.object(asset, x, y, size / ASSET_SIZES[asset], rotation);
    if (!overlay) occupied.push(box);
    return true;
  };

  // Check complete footprints. Appliance backs must touch a continuous wall, not a door opening.
  const furnish = (asset: AssetId, room: HouseRoom, size: number, wallMounted = false, required = false) => {
    if (!required && rng.next() * 100 >= c.density) return undefined;
    const pad = size / 2 + .06;
    const left = room.x + pad, right = room.x + room.w - pad;
    const top = room.y + pad, bottom = room.y + room.h - pad;
    const candidates: { x: number; y: number; rotation: number; wall?: 'north' | 'south' | 'west' | 'east' }[] = [];
    const center = { x: room.x + room.w / 2, y: room.y + room.h / 2, rotation: 0 };
    if (!wallMounted) candidates.push(center);
    // Corner-first wall runs fit compact rooms without shrinking the objects unpredictably.
    const positions = (min: number, max: number) => {
      const values = [min, max];
      for (let v = min + .5; v < max; v += .5) values.push(v);
      return values;
    };
    for (const x of positions(left, right)) candidates.push({ x, y: top, rotation: 0, wall: 'north' });
    for (const x of positions(left, right)) candidates.push({ x, y: bottom, rotation: Math.PI, wall: 'south' });
    for (const y of positions(top, bottom)) candidates.push({ x: left, y, rotation: -Math.PI / 2, wall: 'west' });
    for (const y of positions(top, bottom)) candidates.push({ x: right, y, rotation: Math.PI / 2, wall: 'east' });
    if (!wallMounted) {
      for (let y = top; y <= bottom; y += .5) for (let x = left; x <= right; x += .5) candidates.push({ x, y, rotation: 0 });
    }
    for (const candidate of candidates) {
      if (wallMounted) {
        const horizontal = candidate.wall === 'north' || candidate.wall === 'south';
        const start = Math.floor((horizontal ? candidate.x : candidate.y) - size / 2);
        const end = Math.ceil((horizontal ? candidate.x : candidate.y) + size / 2);
        let backing = true;
        for (let t = start; t < end; t++) {
          const x = horizontal ? t : candidate.wall === 'west' ? room.x - 1 : room.x + room.w;
          const y = horizontal ? candidate.wall === 'north' ? room.y - 1 : room.y + room.h : t;
          if (p.at(x, y) !== 'wall') { backing = false; break; }
        }
        if (!backing) continue;
      }
      if (put(asset, room, candidate.x, candidate.y, size, candidate.rotation)) return candidate;
    }
    if (required) throw new Error(`No hay espacio libre para ${asset} en la distribución de casa. Amplía el mapa o elige otra plantilla.`);
    return undefined;
  };

  // Core residential fittings do not depend on density or the landmark switch.
  for (const room of plan.rooms) {
    if (room.kind === 'bedroom') {
      furnish('bed', room, 1.4, true, true);
    } else if (room.kind === 'living-kitchen') {
      furnish('wood-stove', room, 1.05, true, true);
      furnish('fireplace', room, 1.15, true, true);
      furnish('table', room, 1.05, false, true);
    } else if (room.kind === 'kitchen') {
      furnish('wood-stove', room, 1.05, true, true);
      furnish('counter', room, 1.2, true, true);
    } else if (room.kind === 'living') {
      furnish('fireplace', room, 1.15, true, true);
      furnish('table', room, 1.15, false, true);
    } else if (room.kind === 'study') {
      furnish('table', room, 1.05, false, true);
    }
  }
  for (const room of plan.rooms) {
    if (room.kind === 'bedroom') {
      furnish('chest', room, .65);
      furnish('bookshelf', room, 1.1, true);
    } else if (room.kind === 'living' || room.kind === 'living-kitchen' || room.kind === 'study') {
      furnish('bench', room, 1.15);
      furnish('bookshelf', room, 1.15, true);
      if (rng.next() * 100 < c.density) {
        const size = Math.min(1.8, room.w - .2, room.h - .2);
        put('rug', room, room.x + room.w / 2, room.y + room.h / 2, size, 0, true);
      }
    } else if (room.kind === 'kitchen') {
      furnish('barrels', room, .85);
      furnish('sacks', room, .7);
      furnish('table', room, 1.1);
    } else if (room.kind === 'courtyard') {
      // Keep a central cross open between the common rooms and all bedroom doors.
      const safeCorners: HouseRoom[] = [
        { ...room, w: Math.max(1, Math.floor(room.w / 2) - 1), h: Math.max(1, Math.floor(room.h / 2) - 1) },
        { ...room, x: room.x + Math.ceil(room.w / 2) + 1, y: room.y + Math.ceil(room.h / 2) + 1,
          w: Math.max(1, Math.floor(room.w / 2) - 1), h: Math.max(1, Math.floor(room.h / 2) - 1) },
      ];
      for (const corner of safeCorners) furnish('flowers', corner, .7);
    }
  }

  // Windows are added last, strictly on outside walls. They do not cut terrain or create light sources.
  const windowAt = (x: number, y: number, ix: number, iy: number, rotation: number) => {
    if (p.at(x, y) !== 'wall' || !p.open(ix, iy)) return;
    if (doors.some(door => Math.abs(door.x - x) + Math.abs(door.y - y) < 2)) return;
    const inside = { x: ix, y: iy, w: 1, h: 1 };
    if (occupied.some(box => (box.asset === 'wood-stove' || box.asset === 'fireplace') && overlaps(box, inside))) return;
    p.object('window', x + .5, y + .5, .9 / ASSET_SIZES.window, rotation);
  };
  const spacing = c.houseStatus === 'wealthy' ? 4 : c.houseStatus === 'poor' ? 7 : 5;
  for (let x = 2; x < w - 2; x += spacing) {
    windowAt(x, 0, x, 1, 0); windowAt(x, h - 1, x, h - 2, 0);
  }
  for (let y = 2; y < h - 2; y += spacing) {
    windowAt(0, y, 1, y, Math.PI / 2); windowAt(w - 1, y, w - 2, y, Math.PI / 2);
  }
  if (c.landmarks) {
    for (const room of plan.rooms.filter(room => room.kind === 'living' || room.kind === 'living-kitchen')) {
      // Lights are optional accents, unlike beds, cooking facilities and the domestic hearth.
      furnish('torch', room, .45, true);
    }
  }
}
