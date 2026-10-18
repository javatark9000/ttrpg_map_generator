import { ASSET_SIZES } from '../../types';
import type { AssetId, BattleMap } from '../../types';
import type { Rect, painter } from '../../scenario-painter';
import type { VillageBlock, VillagePlot } from './layout';

type Painter = ReturnType<typeof painter>;
export type SingularBuilding = BattleMap['config']['villageRequiredBuildings'][number];
export type HousingStatus = keyof BattleMap['config']['villageWealth'];
export const SINGULAR_BUILDINGS: { id: SingularBuilding; name: string; minimum: number; weight: number; roof?: AssetId }[] = [
  { id: 'market', name: 'mercado', minimum: 6, weight: 4 },
  { id: 'tavern', name: 'taberna', minimum: 7, weight: 3, roof: 'roof-tavern' },
  { id: 'temple', name: 'templo', minimum: 8, weight: 1, roof: 'roof-temple' },
  { id: 'ranch', name: 'rancho con corral', minimum: 7, weight: 2, roof: 'roof-ranch' },
];
const HOUSES: Record<HousingStatus, { roof: AssetId; size: number }> = {
  poor: { roof: 'roof-house-poor', size: 3 },
  common: { roof: 'roof-house-common', size: 4 },
  wealthy: { roof: 'roof-house-wealthy', size: 5 },
};

/** Render by absolute footprint, independently of each SVG's natural catalog size. */
export function villageObject(p: Painter, asset: AssetId, x: number, y: number, size: number, rotation = 0): void {
  p.object(asset, x, y, size / ASSET_SIZES[asset], rotation);
}

export function fittingPlot(block: VillageBlock, kind: SingularBuilding): VillagePlot | undefined {
  const definition = SINGULAR_BUILDINGS.find(item => item.id === kind)!;
  if (Math.min(block.w, block.h) < definition.minimum) return;
  if (kind !== 'ranch') return block;
  const verticalStreet = block.front === 'east' || block.front === 'west';
  if (verticalStreet ? block.h >= 11 : block.w >= 11) return block;
  if (block.linear) return;
  if (block.h >= 11) return { ...block, front: 'east', street: block.x + block.w };
}

function access(p: Painter, plot: VillagePlot, footprint: Rect, door: boolean): void {
  let x = footprint.x + Math.floor(footprint.w / 2), y = footprint.y + Math.floor(footprint.h / 2);
  let rotation = 0;
  switch (plot.front) {
    case 'north': y = footprint.y; rotation = Math.PI; p.line(x, y, x, plot.street); break;
    case 'south': y = footprint.y + footprint.h - 1; p.line(x, y, x, plot.street); break;
    case 'east': x = footprint.x + footprint.w - 1; rotation = -Math.PI / 2; p.line(x, y, plot.street, y); break;
    case 'west': x = footprint.x; rotation = Math.PI / 2; p.line(x, y, plot.street, y); break;
  }
  if (door) villageObject(p, 'door', x + .5, y + .5, .9, rotation);
}

function roof(p: Painter, plot: VillagePlot, asset: AssetId, requestedSize: number): Rect {
  const size = Math.min(requestedSize, plot.w - 2, plot.h - 2);
  const footprint = { x: plot.x + Math.floor((plot.w - size) / 2), y: plot.y + Math.floor((plot.h - size) / 2), w: size, h: size };
  p.rect(footprint, 'floor'); p.border(footprint);
  const rotation = plot.front === 'north' ? Math.PI : plot.front === 'east' ? -Math.PI / 2 : plot.front === 'west' ? Math.PI / 2 : 0;
  villageObject(p, asset, footprint.x + size / 2, footprint.y + size / 2, size + .6, rotation);
  access(p, plot, footprint, true);
  return footprint;
}

export function placeHouse(p: Painter, plot: VillagePlot, status: HousingStatus): void {
  const house = HOUSES[status];
  roof(p, plot, house.roof, house.size);
}

export function placePlaza(p: Painter, plot: VillagePlot, landmarks: boolean): void {
  p.rect(plot, 'floor');
  access(p, plot, plot, false);
  if (landmarks) villageObject(p, 'well', plot.x + plot.w / 2, plot.y + plot.h / 2, 1.5);
}

function market(p: Painter, plot: VillagePlot, plaza: boolean, landmarks: boolean): void {
  if (plaza) placePlaza(p, plot, landmarks);
  else { p.rect(plot, 'floor'); access(p, plot, plot, false); }
  // Opposite corners leave the center, the well and all four frontages unobstructed.
  const size = Math.min(2.6, (Math.min(plot.w, plot.h) - 1) / 2);
  villageObject(p, 'market-structure', plot.x + size / 2 + .35, plot.y + size / 2 + .35, size);
  villageObject(p, 'market-structure', plot.x + plot.w - size / 2 - .35, plot.y + plot.h - size / 2 - .35, size, Math.PI);
}

function corral(p: Painter, plot: VillagePlot, pen: Rect): void {
  p.rect(pen, 'sand');
  const gateX = pen.x + Math.floor(pen.w / 2), gateY = pen.y + Math.floor(pen.h / 2);
  // Modular one-cell fence runs. A deliberate one-cell opening is the gate.
  for (let x = pen.x; x < pen.x + pen.w; x++) {
    if (!(plot.front === 'north' && x === gateX)) villageObject(p, 'corral', x + .5, pen.y + .15, 1);
    if (!(plot.front === 'south' && x === gateX)) villageObject(p, 'corral', x + .5, pen.y + pen.h - .15, 1);
  }
  for (let y = pen.y; y < pen.y + pen.h; y++) {
    if (!(plot.front === 'west' && y === gateY)) villageObject(p, 'corral', pen.x + .15, y + .5, 1, Math.PI / 2);
    if (!(plot.front === 'east' && y === gateY)) villageObject(p, 'corral', pen.x + pen.w - .15, y + .5, 1, Math.PI / 2);
  }
  access(p, plot, pen, false);
}

export function placeSingular(p: Painter, plot: VillagePlot, kind: SingularBuilding, plaza: boolean, landmarks: boolean): void {
  if (kind === 'market') { market(p, plot, plaza, landmarks); return; }
  if (kind === 'ranch') {
    const verticalStreet = plot.front === 'east' || plot.front === 'west';
    const house: VillagePlot = verticalStreet ? { ...plot, h: 6 } : { ...plot, w: 6 };
    roof(p, house, 'roof-ranch', 4);
    const pen: Rect = verticalStreet
      ? { x: plot.x + 1, y: plot.y + 7, w: Math.min(6, plot.w - 2), h: Math.min(6, plot.h - 7) }
      : { x: plot.x + 7, y: plot.y + 1, w: Math.min(6, plot.w - 7), h: Math.min(6, plot.h - 2) };
    corral(p, plot, pen);
    return;
  }
  const definition = SINGULAR_BUILDINGS.find(item => item.id === kind)!;
  roof(p, plot, definition.roof!, kind === 'temple' ? 6 : 5);
}
