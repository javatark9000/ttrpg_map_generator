import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';

const MAX_EXTRA_ROOMS = 40;
const ROOM_PITCH = 7; // Four floor rows, two walls and a separate circulation row.
const MIN_MAIN_HEIGHT = 10;

/** Same long-axis convention as generateMap; mandatory service areas are not rooms. */
export function maxSmithyExtraRooms(width: number, height: number): number {
  if (width > height * 1.5) [width, height] = [height, width];
  const columns = Math.floor((width - 3) / 5);
  const rows = Math.max(0, Math.floor((height - 1 - MIN_MAIN_HEIGHT) / ROOM_PITCH));
  return Math.min(MAX_EXTRA_ROOMS, columns * rows);
}

/** Geometry only: central configuration validation owns integer/range checks. */
export function smithyExtraRoomCountError(width: number, height: number, count: number): string | undefined {
  const maximum = maxSmithyExtraRooms(width, height);
  if (count > maximum) {
    return `En ${width} × ${height} caben de 0 a ${maximum} habitaciones adicionales de herrería. Taller, recepción y almacén no se incluyen; amplía el mapa para añadir más.`;
  }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function expanded(rect: Rect, margin: number): Rect {
  return { x: rect.x - margin, y: rect.y - margin, w: rect.w + margin * 2, h: rect.h + margin * 2 };
}

/** A working smithy, not an anvil-filled generic house. Geometry is already oriented
 * by generateMap. Even at 8×8 the three mandatory functions remain as open zones. */
export function generateSmithy(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const count = c.smithyExtraRoomCount;
  const error = smithyExtraRoomCountError(w, h, count);
  if (error) throw new Error(error);
  const reserved: Rect[] = [], occupied: Rect[] = [];
  const entry = Math.floor(w / 2);
  const reserve = (rect: Rect) => reserved.push(rect);

  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'floor');
  map.spawn = { x: entry, y: h - 2 };

  const door = (x: number, y: number, vertical = false) => {
    p.set(x, y, 'floor');
    p.object('door', x + .5, y + .5, .85, vertical ? Math.PI / 2 : 0);
    reserve(vertical ? { x: x - 1, y, w: 3, h: 1 } : { x, y: y - 1, w: 1, h: 3 });
  };
  door(entry, h - 1);

  // Additional rooms occupy a northern annex. Each opens onto a corridor, not
  // another room; the western spine connects every row to the main workshop.
  const columns = count ? Math.min(count, Math.floor((w - 3) / 5)) : 0;
  const rows = columns ? Math.ceil(count / columns) : 0;
  const extraRooms: Rect[] = [];
  for (let index = 0; index < count; index++) {
    const column = index % columns, row = Math.floor(index / columns);
    const left = 2 + Math.floor(column * (w - 3) / columns);
    const right = 2 + Math.floor((column + 1) * (w - 3) / columns);
    const top = row * ROOM_PITCH;
    const room = { x: left + 1, y: top + 1, w: right - left - 1, h: 4 };
    p.border({ x: left, y: top, w: right - left + 1, h: 6 });
    p.rect(room, 'floor');
    door(Math.floor((left + right) / 2), top + 5);
    extraRooms.push(room);
  }
  if (rows) {
    reserve({ x: 1, y: 1, w: 1, h: rows * ROOM_PITCH });
    for (let row = 0; row < rows; row++) reserve({ x: 1, y: row * ROOM_PITCH + 6, w: w - 2, h: 1 });
  }
  // Metadata counts only requested additional rooms, never the three core zones.
  map.rooms = extraRooms.map(room => ({ ...room }));

  const mainTop = Math.max(1, rows * ROOM_PITCH);
  const mainHeight = h - 1 - mainTop;
  const partitioned = mainHeight >= MIN_MAIN_HEIGHT;
  const serviceHeight = partitioned ? 4 : Math.max(2, Math.floor(mainHeight * .35));
  const serviceTop = h - 1 - serviceHeight;
  const workshopBottom = serviceTop - (partitioned ? 1 : 0);
  const workshop: Rect = { x: 1, y: mainTop, w: w - 2, h: workshopBottom - mainTop };
  const dividedServices = partitioned && w >= 12;
  const divider = dividedServices ? Math.max(entry + 1, Math.min(w - 5, Math.floor(w * .62))) : entry;
  const reception: Rect = { x: 1, y: serviceTop, w: dividedServices ? divider - 1 : entry - 1, h: serviceHeight };
  const storage: Rect = { x: divider + 1, y: serviceTop, w: w - divider - 2, h: serviceHeight };

  if (partitioned) {
    for (let x = 1; x < w - 1; x++) p.set(x, serviceTop - 1, 'wall');
    door(entry, serviceTop - 1);
    if (dividedServices) {
      for (let y = serviceTop; y < h - 1; y++) p.set(divider, y, 'wall');
      door(divider, h - 3, true);
      door(w - 3, serviceTop - 1);
    }
  }

  // A continuous one-cell route runs from the entrance, around the hot work zone,
  // to the annex. Reserving real footprints also protects door landings.
  reserve({ x: entry, y: workshopBottom - 1, w: 1, h: h - workshopBottom });
  reserve({ x: entry, y: workshopBottom - 1, w: w - 1 - entry, h: 1 });
  reserve({ x: w - 2, y: mainTop, w: 1, h: workshop.h });
  reserve({ x: 1, y: mainTop, w: w - 2, h: 1 });
  if (dividedServices) reserve({ x: entry, y: h - 3, w: w - 1 - entry, h: 1 });

  const fits = (bounds: Rect, zone: Rect): boolean => {
    if (bounds.x < zone.x || bounds.y < zone.y || bounds.x + bounds.w > zone.x + zone.w || bounds.y + bounds.h > zone.y + zone.h) return false;
    if (reserved.some(rect => overlaps(bounds, rect)) || occupied.some(rect => overlaps(expanded(bounds, .06), rect))) return false;
    // Validate the whole illustration footprint, not just its center tile.
    for (let y = Math.floor(bounds.y); y < Math.ceil(bounds.y + bounds.h); y++) {
      for (let x = Math.floor(bounds.x); x < Math.ceil(bounds.x + bounds.w); x++) if (!p.open(x, y)) return false;
    }
    return true;
  };

  const furnish = (asset: AssetId, zone: Rect, size = ASSET_SIZES[asset], rotation = 0, preferred?: { x: number; y: number }): boolean => {
    if (zone.w <= 0 || zone.h <= 0) return false;
    const candidates: { x: number; y: number }[] = preferred ? [preferred] : [];
    // Wall-first candidates keep centers clear without scattering inventory randomly.
    const inset = size / 2 + .04;
    for (let x = zone.x + inset; x <= zone.x + zone.w - inset; x += .5) {
      candidates.push({ x, y: zone.y + inset }, { x, y: zone.y + zone.h - inset });
    }
    for (let y = zone.y + inset; y <= zone.y + zone.h - inset; y += .5) {
      candidates.push({ x: zone.x + inset, y }, { x: zone.x + zone.w - inset, y });
    }
    for (let y = zone.y + inset; y <= zone.y + zone.h - inset; y += .5) {
      for (let x = zone.x + inset; x <= zone.x + zone.w - inset; x += .5) candidates.push({ x, y });
    }
    for (const point of candidates) {
      const bounds = { x: point.x - size / 2, y: point.y - size / 2, w: size, h: size };
      if (!fits(bounds, zone)) continue;
      p.object(asset, point.x, point.y, size / ASSET_SIZES[asset], rotation);
      occupied.push(bounds);
      return true;
    }
    return false;
  };

  // The furnace is structural equipment: landmarks never remove it. A full cell
  // of working clearance surrounds it (clipped only by the wall in wall mode).
  const furnaceSize = Math.min(ASSET_SIZES['forge-furnace'], workshop.h - 2, workshop.w - 4);
  const central = c.smithyForgeLayout === 'central';
  const fx = central ? w / 2 : 1 + furnaceSize / 2 + .03;
  const fy = workshop.y + workshop.h / 2;
  const furnaceRotation = central ? 0 : -Math.PI / 2;
  p.object('forge-furnace', fx, fy, furnaceSize / ASSET_SIZES['forge-furnace'], furnaceRotation);
  const furnaceBounds = { x: fx - furnaceSize / 2, y: fy - furnaceSize / 2, w: furnaceSize, h: furnaceSize };
  occupied.push(furnaceBounds);
  reserve(expanded(furnaceBounds, 1));
  if (c.landmarks) {
    const fireOffset = furnaceSize * .14;
    p.object('campfire', fx - Math.sin(furnaceRotation) * fireOffset, fy + Math.cos(furnaceRotation) * fireOffset,
      Math.min(.5, furnaceSize * .26) / ASSET_SIZES.campfire, furnaceRotation);
  }

  const compact = workshop.w < 9;
  // Equipment precedes optional clutter. A small plan remains a functional smithy
  // at zero density; density controls supplementary stock, not mandatory zones.
  if (!furnish('anvil', workshop, compact ? .82 : 1.2, 0, { x: fx + furnaceSize / 2 + 1.75, y: fy })) {
    throw new Error('No cabe el yunque obligatorio sin bloquear la circulación de la herrería.');
  }
  furnish('smith-tools', workshop, compact ? .75 : 1);
  if (!furnish('order-shelf', reception, 1)) {
    throw new Error('No cabe la estantería de pedidos obligatoria en la recepción de la herrería.');
  }
  furnish('counter', reception, Math.min(ASSET_SIZES.counter, reception.h > 2 ? 1.7 : 1.35));
  if (!furnish('cast-metal', storage, storage.w < 4 ? .85 : 1.2)) {
    throw new Error('No caben los materiales obligatorios sin bloquear el almacén de la herrería.');
  }
  furnish('sacks', storage, compact ? .8 : 1.1);
  furnish('armor', workshop, compact ? .85 : 1.2);
  furnish('swords', reception, .85);
  furnish('smith-tools', storage, .8);

  if (workshop.w * workshop.h >= 130) {
    furnish('bench', workshop, 1.5);
    furnish('anvil', workshop, 1.2);
    furnish('spears', workshop, 1.4, Math.PI / 2);
  }
  const inventory: AssetId[] = ['cast-metal', 'smith-tools', 'swords', 'armor', 'crates', 'sacks'];
  const stockSlots = Math.min(18, Math.floor(workshop.w * workshop.h / 24));
  for (let i = 0; i < stockSlots; i++) {
    if (rng.next() * 100 >= c.density) continue;
    const asset = inventory[i % inventory.length];
    const zone = i % 3 === 0 ? storage : workshop;
    const preferred = { x: zone.x + 1 + rng.next() * Math.max(0, zone.w - 2), y: zone.y + 1 + rng.next() * Math.max(0, zone.h - 2) };
    furnish(asset, zone, Math.min(1.2, ASSET_SIZES[asset]), 0, preferred);
  }
  if (c.density > 35) furnish('crates', storage, 1.2);

  // Requested annex rooms are useful spaces, not empty quota boxes.
  for (let i = 0; i < extraRooms.length; i++) {
    const room = extraRooms[i];
    if (i % 3 === 0) {
      furnish('table', room, 1.5);
      furnish('books', room, .7);
      furnish('chest', room, .85);
    } else if (i % 3 === 1) {
      furnish('bed', room, 1.8);
      furnish('equipment-pack', room, .8);
      furnish('chest', room, .85);
    } else {
      furnish('bench', room, 1.4);
      furnish('smith-tools', room, .85);
      furnish('armor', room, 1.1);
    }
  }

  // Exterior windows are decorative and never replace terrain or emit light.
  const windowAt = (x: number, y: number, rotation: number) => {
    if (Math.abs(x - fx) < furnaceSize / 2 + 1 && Math.abs(y - fy) < furnaceSize / 2 + 1) return;
    if (map.objects.some(object => object.asset === 'door' && Math.hypot(object.x - x, object.y - y) < 1.6)) return;
    const side = x < 1 || x > w - 1;
    const insideX = x < 1 ? 1.5 : x > w - 1 ? w - 1.5 : x;
    const insideY = y < 1 ? 1.5 : y > h - 1 ? h - 1.5 : y;
    // Reject intersections with annex walls, not only exterior corners/doors.
    if (![-.4, 0, .4].every(offset => p.open(insideX + (side ? 0 : offset), insideY + (side ? offset : 0)))) return;
    if (p.at(x, y) === 'wall') p.object('window', x, y, 1, rotation);
  };
  for (let x = 3.5; x < w - 2; x += 6) {
    windowAt(x, .5, 0);
    windowAt(x, h - .5, Math.PI);
  }
  for (let y = 3.5; y < h - 2; y += 6) {
    windowAt(.5, y, Math.PI / 2);
    windowAt(w - .5, y, -Math.PI / 2);
  }
  if (c.landmarks) {
    p.object('torch', .65, h - 2.5, .5, -Math.PI / 2);
    if (w >= 14) p.object('torch', w - .65, workshop.y + 2, .5, Math.PI / 2);
  }
}
