import type { Rect } from '../../scenario-painter';

export type HouseLayout = 'compact' | 'corridor' | 'courtyard';
export type HouseLayoutChoice = HouseLayout | 'random';
export type HouseRoomKind = 'bedroom' | 'living-kitchen' | 'living' | 'kitchen' | 'study' | 'courtyard' | 'corridor';
export interface HouseRoom extends Rect { kind: HouseRoomKind }
export interface HouseDoor { x: number; y: number; vertical: boolean }
export interface HousePlan {
  rooms: HouseRoom[];
  walls: Rect[];
  doors: HouseDoor[];
  entrance: number;
}

/** Match generateMap's long-axis orientation, including when called directly by UI validation. */
export function houseBedroomCapacity(width: number, height: number, layout: HouseLayoutChoice): number {
  if (width > height * 1.5) [width, height] = [height, width];
  switch (layout) {
    case 'compact': return Math.min(2, Math.floor((width - 1) / 4));
    case 'corridor': return width >= 12 && height >= 11 ? 2 * Math.floor((height - 6) / 4) : 0;
    case 'courtyard': return width >= 18 && height >= 18 ? 2 * Math.floor((height - 11) / 4) : 0;
    case 'random': return Math.max(...HOUSE_LAYOUTS.map(value => houseBedroomCapacity(width, height, value)));
  }
}
export const HOUSE_LAYOUTS: readonly HouseLayout[] = ['compact', 'corridor', 'courtyard'];

export function houseOptionsError(width: number, height: number, layout: HouseLayoutChoice, bedrooms: number): string | undefined {
  const maximum = houseBedroomCapacity(width, height, layout);
  if (!maximum) return layout === 'courtyard'
    ? 'La casa con patio necesita al menos 18 × 18 casillas.'
    : 'La casa con pasillo necesita al menos 12 casillas de ancho y 11 de alto en el plano orientado.';
  if (bedrooms > maximum) return `Esta distribución de casa admite hasta ${maximum} dormitorios en ${width} × ${height}. Reduce la cantidad o amplía el mapa.`;
}

/** Room slices retain three clear cells and one wall between neighbouring bedrooms. */
function slices(start: number, extent: number, count: number): { start: number; size: number }[] {
  const available = extent - (count - 1), base = Math.floor(available / count), remainder = available % count;
  let cursor = start;
  return Array.from({ length: count }, (_, index) => {
    const size = base + (index < remainder ? 1 : 0), part = { start: cursor, size };
    cursor += size + 1;
    return part;
  });
}

/** Build a validated house template with its automatic bedroom count already resolved. */
export function planHouse(w: number, h: number, layout: HouseLayout, bedrooms: number): HousePlan {
  const plan: HousePlan = { rooms: [], walls: [], doors: [], entrance: Math.floor(w / 2) };
  const room = (kind: HouseRoomKind, x: number, y: number, width: number, height: number) => plan.rooms.push({ kind, x, y, w: width, h: height });
  const wallH = (x: number, y: number, width: number) => plan.walls.push({ x, y, w: width, h: 1 });
  const wallV = (x: number, y: number, height: number) => plan.walls.push({ x, y, w: 1, h: height });
  const door = (x: number, y: number, vertical = false) => plan.doors.push({ x, y, vertical });

  if (layout === 'compact') {
    const split = 1 + Math.max(3, Math.floor((h - 3) * .46));
    wallH(1, split, w - 2);
    const parts = slices(1, w - 2, bedrooms);
    for (const [index, part] of parts.entries()) {
      if (index) wallV(part.start - 1, 1, split - 1);
      room('bedroom', part.start, 1, part.size, split - 1);
      // A single bedroom shares the entrance axis, leaving room for a straight circulation band.
      door(bedrooms === 1 ? plan.entrance : part.start + part.size - 1, split);
    }
    room('living-kitchen', 1, split + 1, w - 2, h - split - 2);
  } else if (layout === 'corridor') {
    const leftWidth = Math.floor((w - 6) / 2), leftWall = 1 + leftWidth, rightWall = leftWall + 3;
    const south = h - 5;
    wallV(leftWall, 1, h - 2); wallV(rightWall, 1, h - 2);
    room('corridor', leftWall + 1, 1, 2, h - 2);
    plan.entrance = leftWall + 1;
    for (let side = 0; side < 2; side++) {
      const x = side ? rightWall + 1 : 1, width = side ? w - rightWall - 2 : leftWidth;
      const boundary = side ? rightWall : leftWall;
      wallH(x, south - 1, width);
      room(side ? 'living' : 'kitchen', x, south, width, 4);
      door(boundary, south + 2, true);
      const count = side ? Math.floor(bedrooms / 2) : Math.ceil(bedrooms / 2);
      const parts = slices(1, south - 2, Math.max(1, count));
      for (const [index, part] of parts.entries()) {
        if (index) wallH(x, part.start - 1, width);
        room(count ? 'bedroom' : 'study', x, part.start, width, part.size);
        door(boundary, part.start + part.size - 1, true);
      }
    }
  } else {
    // Four-cell residential wings enclose a real open-air court; all bedroom doors face it.
    const south = h - 5, middleHeight = h - 12;
    wallH(1, 5, w - 2); wallH(1, south - 1, w - 2);
    wallV(5, 6, middleHeight); wallV(w - 6, 6, middleHeight);
    room('kitchen', 1, 1, w - 2, 4);
    room('living', 1, south, w - 2, 4);
    room('courtyard', 6, 6, w - 12, middleHeight);
    door(plan.entrance, 5); door(plan.entrance, south - 1);
    for (let side = 0; side < 2; side++) {
      const x = side ? w - 5 : 1, boundary = side ? w - 6 : 5;
      const count = side ? Math.floor(bedrooms / 2) : Math.ceil(bedrooms / 2);
      for (const [index, part] of slices(6, middleHeight, Math.max(1, count)).entries()) {
        if (index) wallH(x, part.start - 1, 4);
        room(count ? 'bedroom' : 'study', x, part.start, 4, part.size);
        door(boundary, part.start + part.size - 1, true);
      }
    }
  }
  return plan;
}
