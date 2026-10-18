import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap, DungeonRoom, MapLayer } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';

export type InnRoomKind = 'single' | 'double' | 'family';
export interface InnRoom extends DungeonRoom {
  kind: InnRoomKind;
  beds: number;
}

interface Bank { x: number; w: number; wallX: number; corridorSide: 'left' | 'right' }
interface InnGeometry {
  corridorX: number;
  corridorWidth: number;
  lobbyY: number;
  guestHeight: number;
  banks: Bank[];
  capacity: number;
}
interface PlannedRoom extends Rect { bank: Bank }
const MIN_ROOM_HEIGHT = 4;

/** A real lobby, its separating wall and the exterior wall are never sold as rooms. */
function geometry(width: number, height: number, upperStairs = false): InnGeometry | undefined {
  if (width < 8 || height < (upperStairs ? 12 : 11)) return;
  const corridorWidth = width === 8 ? 1 : 2;
  // Stairs add a separate landing row between their footprint and the reception desk.
  const lobbyY = height - (upperStairs ? 6 : 5);
  const guestHeight = lobbyY - 2;
  const banks: Bank[] = [];
  let corridorX: number;
  if (width >= 14) {
    const leftWidth = Math.floor((width - 4 - corridorWidth) / 2);
    corridorX = leftWidth + 2;
    const rightWall = corridorX + corridorWidth;
    banks.push({ x: 1, w: leftWidth, wallX: corridorX - 1, corridorSide: 'right' });
    banks.push({ x: rightWall + 1, w: width - rightWall - 2, wallX: rightWall, corridorSide: 'left' });
  } else {
    corridorX = width - 1 - corridorWidth;
    banks.push({ x: 1, w: corridorX - 2, wallX: corridorX - 1, corridorSide: 'right' });
  }
  return {
    corridorX, corridorWidth, lobbyY, guestHeight, banks,
    capacity: banks.length * Math.floor((guestHeight + 1) / (MIN_ROOM_HEIGHT + 1)),
  };
}

/** Matches the long-axis orientation performed by the building dispatcher. */
export function maxInnRoomCount(width: number, height: number, upperStairs = false): number {
  if (width > height * 1.5) [width, height] = [height, width];
  return (geometry(width, height, upperStairs)?.capacity ?? 0) * (upperStairs ? 2 : 1);
}

/** Geometric feasibility only; central configuration validation owns types and ranges. */
export function innRoomCountError(width: number, height: number, count: number, upperStairs = false): string | undefined {
  const maximum = maxInnRoomCount(width, height, upperStairs);
  if (maximum === 0) return `La posada necesita al menos 8 × ${upperStairs ? 12 : 11} casillas en su orientación de generación para reservar recepción, pasillo${upperStairs ? ', escalera con rellano' : ''} y una habitación de 4 × 4. Amplía el mapa.`;
  if (count > maximum) return `En esta posada de ${width} × ${height} caben hasta ${maximum} habitaciones para huéspedes${upperStairs ? ' entre las dos plantas' : ''}. Reduce la cantidad o amplía el mapa${upperStairs ? '.' : ', o activa la segunda planta.'}`;
}

function planRooms(layout: InnGeometry, count: number, rng: Random): PlannedRoom[] {
  const quotas = layout.banks.map(() => Math.floor(count / layout.banks.length));
  const firstBank = rng.int(0, layout.banks.length - 1);
  for (let i = 0; i < count % layout.banks.length; i++) quotas[(firstBank + i) % quotas.length]++;
  const rooms: PlannedRoom[] = [];
  layout.banks.forEach((bank, index) => {
    const amount = quotas[index];
    if (!amount) return;
    const heights = Array<number>(amount).fill(MIN_ROOM_HEIGHT);
    let remaining = layout.guestHeight - amount * MIN_ROOM_HEIGHT - (amount - 1);
    // Distribute real spare cells, never truncate the requested room count.
    while (remaining-- > 0) heights[rng.int(0, amount - 1)]++;
    let y = 1;
    for (const h of heights) {
      rooms.push({ x: bank.x, y, w: bank.w, h, bank });
      y += h + 1;
    }
  });
  return rooms;
}

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Local furniture bounds reserve a full walking strip beside every guest-room door. */
function furnishRoom(room: PlannedRoom, index: number, rng: Random, place: PlaceObject, density: number, landmarks: boolean): InnRoom {
  const area: Rect = {
    x: room.x + (room.bank.corridorSide === 'left' ? 1 : 0),
    y: room.y, w: room.w - 1, h: room.h,
  };
  const occupied: Rect[] = [];
  const fits = (box: Rect) => box.x >= area.x && box.y >= area.y && box.x + box.w <= area.x + area.w && box.y + box.h <= area.y + area.h && !occupied.some(other => overlaps(box, other));
  const put = (asset: AssetId, x: number, y: number, size: number, rotation = 0): boolean => {
    // Bounding square is deliberately conservative, including the SVG's transparent margin.
    const box = { x: x - size / 2, y: y - size / 2, w: size, h: size };
    if (!fits(box)) return false;
    place(asset, x, y, size / ASSET_SIZES[asset], rotation);
    occupied.push(box);
    return true;
  };
  const slots: { x: number; y: number }[] = [];
  for (let x = area.x + .8; slots.length < 3 && x + .7 <= area.x + area.w; x += 1.6) {
    for (let y = area.y + .8; slots.length < 3 && y + .7 <= area.y + area.h; y += 1.6) slots.push({ x, y });
  }
  const beds = Math.min(index % 3 + 1, slots.length);
  // Narrow minimum-size rooms can be single/double; family rooms require three real bed slots.
  const kind: InnRoomKind = beds === 3 ? 'family' : beds === 2 ? 'double' : 'single';
  const rotation = rng.next() < .5 ? 0 : Math.PI;
  for (const slot of slots.slice(0, beds)) {
    if (!put('bed', slot.x, slot.y, 1.4, rotation)) throw new Error('No se pudo reservar el mobiliario mínimo de una habitación de la posada.');
  }
  const findPlace = (asset: AssetId, size: number): boolean => {
    for (let y = area.y + size / 2 + .1; y + size / 2 <= area.y + area.h; y += .5) {
      for (let x = area.x + area.w - size / 2 - .1; x - size / 2 >= area.x; x -= .5) {
        if (put(asset, x, y, size)) return true;
      }
    }
    return false;
  };
  if (!findPlace('chest', .65)) throw new Error('No hay espacio para el cofre de una habitación de la posada. Amplía el mapa.');
  if (rng.next() * 100 < density) findPlace('table', 1.1);
  if (rng.next() * 100 < density) findPlace('bookshelf', .9);
  if (landmarks && rng.next() * 100 < density) findPlace('equipment-pack', .55);
  return { x: room.x, y: room.y, w: room.w, h: room.h, kind, beds };
}

function drawFloor(map: BattleMap, rng: Random, place: PlaceObject, layout: InnGeometry, count: number, upper: boolean, firstRoomIndex: number): void {
  const p = painter(map, place), { w, h } = p;
  map.terrain.fill('wall');
  p.rect({ x: 1, y: 1, w: w - 2, h: h - 2 }, 'wood');
  const entrance = layout.corridorX + Math.floor((layout.corridorWidth - 1) / 2);
  map.spawn = { x: entrance, y: h - 2 };
  if (!upper) {
    p.set(entrance, h - 1, 'wood');
    p.object('door', entrance + .5, h - .5, 1 / ASSET_SIZES.door);
  }

  const plans = planRooms(layout, count, rng);
  for (const bank of layout.banks) {
    const rooms = plans.filter(room => room.bank === bank);
    if (!rooms.length) continue;
    for (let y = 1; y < layout.lobbyY; y++) p.set(bank.wallX, y, 'wall');
    // Close the last rooms against the lobby: their only access is their corridor door.
    for (let x = bank.x; x < bank.x + bank.w; x++) p.set(x, layout.lobbyY - 1, 'wall');
    for (const room of rooms) {
      if (room.y > 1) for (let x = room.x; x < room.x + room.w; x++) p.set(x, room.y - 1, 'wall');
      const doorY = room.y + Math.floor(room.h / 2);
      p.set(bank.wallX, doorY, 'wood');
      p.object('door', bank.wallX + .5, doorY + .5, 1 / ASSET_SIZES.door, Math.PI / 2);
    }
  }
  const rooms = plans.map((room, index) => furnishRoom(room, firstRoomIndex + index, rng, place, map.config.density, map.config.landmarks));
  map.rooms = rooms;

  // Reception is essential infrastructure, independent of density and landmarks.
  if (!upper) {
    const y = layout.banks.length === 1 ? h - 2 : h - 2.5;
    p.object('inn-reception', 2.5, y, 2 / ASSET_SIZES['inn-reception']);
  } else {
    p.object('bench', 2.5, h - 2, 1.4 / ASSET_SIZES.bench);
  }
  if (map.config.innUpperStairs) {
    const stairsX = layout.banks.length === 1 ? 2.2 : w - 2.5;
    const stairsY = layout.lobbyY + 1;
    const asset = upper ? 'stairs-down' : 'stairs-up';
    p.object(asset, stairsX, stairsY, 2 / ASSET_SIZES[asset]);
    if (upper) map.spawn = { x: Math.floor(stairsX), y: Math.floor(stairsY + 1.5) };
  }

  // All windows sit on exterior wall cells with interior floor behind them.
  // Interior partitions, corners and the entrance therefore cannot receive a window.
  for (let x = 2; x < w - 2; x += 4) {
    if (p.at(x, 1) === 'wood') p.object('window', x + .5, .5, 1 / ASSET_SIZES.window);
  }
  for (let y = 2; y < layout.lobbyY - 2; y += 4) {
    if (p.at(1, y) === 'wood') p.object('window', .5, y + .5, 1 / ASSET_SIZES.window, Math.PI / 2);
    if (p.at(w - 2, y) === 'wood') p.object('window', w - .5, y + .5, 1 / ASSET_SIZES.window, Math.PI / 2);
  }
  if (map.config.landmarks) {
    p.object('torch', .5, layout.lobbyY + 1, .55 / ASSET_SIZES.torch, -Math.PI / 2);
    if (w >= 14) p.object('torch', w - .5, layout.lobbyY + 3, .55 / ASSET_SIZES.torch, Math.PI / 2);
  }
  // Connectivity is constructed explicitly; no post-pass is allowed to punch guest-room walls.
}

/** Exact total guest rooms; optional upper storey shares stairs, not a duplicated floor plan. */
export function generateInn(map: BattleMap, rng: Random, place: PlaceObject): void {
  const { width, height, innRoomCount, innUpperStairs } = map.config;
  const layout = geometry(width, height, innUpperStairs);
  if (!layout) throw new Error('La posada necesita orientar el plano sobre el eje largo antes de generar sus habitaciones.');
  const groundCount = innUpperStairs ? Math.floor(innRoomCount / 2) : innRoomCount;
  const upperCount = innRoomCount - groundCount;
  if (groundCount > layout.capacity || upperCount > layout.capacity) throw new Error('La cantidad de habitaciones supera la capacidad de las plantas de esta posada.');
  const varietyOffset = rng.int(0, 2);
  map.activeLayer = 0;
  drawFloor(map, rng, place, layout, groundCount, false, varietyOffset);
  if (!innUpperStairs) return;

  const upstairs: BattleMap = {
    version: map.version, config: map.config, name: map.name,
    terrain: Array(width * height).fill('wall'), objects: [], spawn: { x: 1, y: 1 },
  };
  const upperPlace: PlaceObject = (asset, x, y, scale = 1, rotation = 0) => {
    upstairs.objects.push({ id: `inn-upper-${upstairs.objects.length}`, asset, x, y, scale: ASSET_SIZES[asset] * scale, rotation });
  };
  drawFloor(upstairs, rng, upperPlace, layout, upperCount, true, varietyOffset + groundCount);
  const layer: MapLayer = {
    id: 'inn-upper', name: 'Primera planta', elevation: 1,
    terrain: upstairs.terrain, objects: upstairs.objects, spawn: upstairs.spawn, rooms: upstairs.rooms,
  };
  map.layers = [layer];
}
