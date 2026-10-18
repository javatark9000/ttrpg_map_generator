import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';
import { connectRegions } from './connectivity';
import { housingPlots, shuffle, villageStreets } from './village/layout';
import type { VillageBlock, VillagePlot } from './village/layout';
import { fittingPlot, placeHouse, placePlaza, placeSingular, SINGULAR_BUILDINGS, villageObject } from './village/buildings';
import type { HousingStatus, SingularBuilding } from './village/buildings';

interface Assignment { block: VillageBlock; kind: SingularBuilding }

/** Match mandatory structures before random decoration or the pond can consume land. */
function requiredBuildings(blocks: VillageBlock[], plaza: VillageBlock | undefined, required: SingularBuilding[]): Assignment[] | undefined {
  const candidates = required.map(kind => ({ kind, blocks: blocks.filter(block =>
    (block !== plaza || kind === 'market') && fittingPlot(block, kind)),
  })).sort((a, b) => a.blocks.length - b.blocks.length);
  const chosen: Assignment[] = [];
  const assign = (index: number): boolean => {
    if (index === candidates.length) return true;
    const entry = candidates[index];
    const available = [...entry.blocks].sort((a, b) => Number(b === plaza) - Number(a === plaza) || a.w * a.h - b.w * b.h);
    for (const block of available) {
      if (chosen.some(item => item.block === block)) continue;
      chosen.push({ block, kind: entry.kind });
      if (assign(index + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  return assign(0) ? chosen : undefined;
}

/** Reserve a fixed mix of building lots; density only determines which lots are occupied. */
function autoBuildings(blocks: VillageBlock[], plaza: VillageBlock | undefined, rng: Random): Assignment[] {
  const chosen: Assignment[] = [];
  const pending = [...SINGULAR_BUILDINGS];
  const budget = Math.min(pending.length, Math.round(blocks.length / 2));
  while (pending.length && chosen.length < budget) {
    const weight = pending.reduce((sum, entry) => sum + entry.weight, 0);
    let value = rng.next() * weight;
    const index = pending.findIndex(entry => (value -= entry.weight) < 0);
    const definition = pending.splice(index < 0 ? pending.length - 1 : index, 1)[0];
    const available = shuffle(blocks.filter(block =>
      !chosen.some(item => item.block === block) && (block !== plaza || definition.id === 'market') && fittingPlot(block, definition.id)), rng);
    // Use the plaza for its market, otherwise preserve big blocks for big structures.
    available.sort((a, b) => Number(b === plaza) - Number(a === plaza) || a.w * a.h - b.w * b.h);
    if (available.length) chosen.push({ block: available[0], kind: definition.id });
  }
  return chosen;
}

/** Largest remainder: percentages describe the actual houses, rounded to whole buildings. */
function housingStatuses(count: number, wealth: BattleMap['config']['villageWealth'], rng: Random): HousingStatus[] {
  const entries = (['poor', 'common', 'wealthy'] as const).map(status => {
    const exact = count * wealth[status] / 100;
    return { status, count: Math.floor(exact), remainder: exact % 1 };
  });
  const order = [...entries].sort((a, b) => b.remainder - a.remainder);
  const remaining = count - entries.reduce((sum, entry) => sum + entry.count, 0);
  for (let i = 0; i < remaining; i++) order[i].count++;
  return shuffle(entries.flatMap(entry => Array<HousingStatus>(entry.count).fill(entry.status)), rng);
}

export function generateVillage(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), c = map.config;
  map.terrain.fill('grass');
  const blocks = villageStreets(map, p, rng);
  const plazaCandidates = c.villageLayout === 'square' && blocks.length > 1
    ? [...blocks].sort((a, b) => Math.hypot(a.x + a.w / 2 - p.w / 2, a.y + a.h / 2 - p.h / 2)
      - Math.hypot(b.x + b.w / 2 - p.w / 2, b.y + b.h / 2 - p.h / 2))
    : [];
  let plaza: VillageBlock | undefined;
  let assignments: Assignment[] | undefined;
  // Move the selected layout's plaza when needed, but never silently remove it.
  for (const candidate of plazaCandidates.length ? plazaCandidates : [undefined]) {
    assignments = requiredBuildings(blocks, candidate, c.villageRequiredBuildings);
    if (assignments) { plaza = candidate; break; }
  }
  if (!assignments) {
    const names = c.villageRequiredBuildings.map(kind => SINGULAR_BUILDINGS.find(item => item.id === kind)!.name).join(', ');
    const plazaRequirement = plazaCandidates.length ? ' y la plaza del trazado seleccionado' : '';
    throw new Error(`No hay parcelas compatibles para todos los edificios obligatorios (${names})${plazaRequirement}. Amplía el mapa, elige cuadras grandes o cambia el trazado del pueblo.`);
  }
  const mandatory = c.villageRequiredBuildings.length > 0;
  if (!mandatory) assignments = autoBuildings(blocks, plaza, rng);
  const occupied = new Set(assignments.map(item => item.block));
  if (plaza) occupied.add(plaza);
  // A pond is optional, never displaces a mandatory building and stays out of roads.
  const freeBlocks = blocks.filter(block => !occupied.has(block));
  const pond = c.water && blocks.length > 2 && freeBlocks.length > 1
    ? [...freeBlocks].sort((a, b) => (a.x + p.h - a.y - a.h) - (b.x + p.h - b.y - b.h))[0]
    : undefined;
  if (pond) occupied.add(pond);

  const lots = blocks.filter(block => !occupied.has(block)).flatMap(housingPlots);
  // This capacity and order do not depend on density: increasing it only adds occupants.
  const target = Math.round((lots.length + assignments.length) * c.density / 100);
  const forcedCount = mandatory ? assignments.length : 0;
  const available: (VillagePlot | Assignment)[] = [...lots, ...(mandatory ? [] : assignments)];
  const selected = shuffle(available, rng).slice(0, Math.max(0, target - forcedCount));
  const houses = selected.filter((item): item is VillagePlot => !('kind' in item));
  const activeAssignments = mandatory ? assignments : selected.filter((item): item is Assignment => 'kind' in item);
  const statuses = housingStatuses(houses.length, c.villageWealth, rng);
  const reserved = new Uint8Array(p.w * p.h);
  const reserve = (plot: { x: number; y: number; w: number; h: number }) => {
    for (let y = plot.y; y < plot.y + plot.h; y++) for (let x = plot.x; x < plot.x + plot.w; x++) reserved[y * p.w + x] = 1;
  };
  if (plaza) {
    reserve(plaza);
    if (!activeAssignments.some(item => item.block === plaza)) placePlaza(p, plaza, c.landmarks);
  }
  for (const { block, kind } of activeAssignments) {
    reserve(block);
    placeSingular(p, fittingPlot(block, kind)!, kind, block === plaza, c.landmarks);
  }
  houses.forEach((plot, i) => { reserve(plot); placeHouse(p, plot, statuses[i]); });

  if (pond) {
    reserve(pond);
    const cx = pond.x + (pond.w - 1) / 2, cy = pond.y + (pond.h - 1) / 2;
    const rx = Math.min(4, (pond.w - 2) / 2), ry = Math.min(3, (pond.h - 2) / 2);
    for (let y = pond.y; y < pond.y + pond.h; y++) for (let x = pond.x; x < pond.x + pond.w; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) p.set(x, y, 'water');
    }
    if (c.landmarks) villageObject(p, 'bench', cx + .5, pond.y + .5, 1.2);
    if (c.density > 20) {
      villageObject(p, 'lilies', cx + .5, cy + .5, .8);
      villageObject(p, 'reeds', cx + rx, cy + .5, .8);
    }
  }
  // No tree crowns over roofs, corrals or the one-cell street frontages.
  const greenery: { x: number; y: number; radius: number }[] = [];
  for (let i = 0; i < p.w * p.h * c.density / 1700; i++) {
    const x = rng.int(1, p.w - 2), y = rng.int(1, p.h - 2);
    const asset = rng.pick<AssetId>(['tree-oak', 'bush', 'flowers']);
    const size = asset === 'tree-oak' ? 1.8 : .7, radius = size / 2;
    if (greenery.some(item => Math.hypot(item.x - x, item.y - y) < item.radius + radius + .3)) continue;
    let clear = true;
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
      if (reserved[yy * p.w + xx] || p.at(xx, yy) !== 'grass') clear = false;
    }
    if (clear) { villageObject(p, asset, x + .5, y + .5, size, rng.next() * Math.PI * 2); greenery.push({ x, y, radius }); }
  }
  connectRegions(map, 'path');
}
