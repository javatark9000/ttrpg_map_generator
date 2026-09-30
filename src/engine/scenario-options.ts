import { BUILDING_TYPES } from './types';
import type { MapConfig, ForestPathLayout, BuildingType, VillageLayout } from './types';
export const VILLAGE_LAYOUTS: { id: VillageLayout; name: string }[] = [{id:'square',name:'Plaza central'},{id:'crossroads',name:'Calles en cuadrícula'},{id:'linear',name:'Calle principal'}];
export const PATH_LAYOUTS: { id: ForestPathLayout; name: string; description: string; preview: string }[] = [
  { id: 'meander', name: 'Sinuoso', description: 'Cruza de oeste a este con curvas y entradas variables.', preview: 'M0 40C22 40 20 17 40 21S61 49 80 34S93 21 100 21' },
  { id: 'vertical', name: 'Vertical', description: 'Un sendero de norte a sur; ideal para mapas de retrato.', preview: 'M43 0C43 17 66 16 63 32S36 45 44 64' },
  { id: 'diagonal', name: 'Diagonal', description: 'Une el oeste con el sur en una travesía diagonal.', preview: 'M0 10C25 10 24 27 47 31S66 46 82 64' },
  { id: 'bend', name: 'Recodo', description: 'Entra por el oeste y gira hacia el norte.', preview: 'M0 48C22 48 49 55 65 38S69 13 71 0' },
  { id: 'fork', name: 'Bifurcación', description: 'Una ruta se divide en dos salidas formando una Y.', preview: 'M0 35Q25 29 48 33Q70 22 84 0M48 33Q72 43 89 64' },
  { id: 'crossroads', name: 'Encrucijada', description: 'Cuatro accesos se encuentran en un cruce central.', preview: 'M0 37Q27 24 49 33Q74 42 100 25M41 0Q60 19 49 33Q37 50 58 64' },
  { id: 'loop', name: 'Circuito', description: 'Un anillo alrededor de un claro, con un acceso lateral.', preview: 'M0 34L24 34C21 10 47 6 68 13S88 44 70 53S25 54 24 34' },
];
export const SCENARIO_DEFAULTS = { roomCount: 0, forestPaths: true, forestPathLayout: 'meander' as ForestPathLayout, forestBranches: false, forestDeadEnds: false, buildingType: 'house' as BuildingType, ruinDecay: 55, villageLayout: 'square' as VillageLayout, mountainSnow: true };
export const MIN_ROOM_PARTITION = 6;
export const MAX_ROOMS = 40;
export function maxRoomCount(width: number, height: number): number {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8) return 1;
  return Math.min(MAX_ROOMS, Math.floor(width / MIN_ROOM_PARTITION) * Math.floor(height / MIN_ROOM_PARTITION));
}
export function roomCountError(width: number, height: number, count: number): string | undefined {
  if (!Number.isInteger(count) || count < 1 || count > MAX_ROOMS) return `Elige un número entero de 1 a ${Math.min(MAX_ROOMS, maxRoomCount(width,height))} cuartos.`;
  if (count > maxRoomCount(width,height)) return `En ${width} × ${height} caben hasta ${maxRoomCount(width,height)} cuartos. Reduce la cantidad o amplía el mapa.`;
}
export function scenarioOptionsError(config: MapConfig): string | undefined {
  if (!Object.hasOwn(BUILDING_TYPES, config.buildingType)) return 'El tipo de edificio no es válido.';
  if (!Number.isFinite(config.ruinDecay) || config.ruinDecay < 0 || config.ruinDecay > 100) return 'El deterioro debe estar entre 0 y 100.';
  if (!VILLAGE_LAYOUTS.some(l => l.id === config.villageLayout)) return 'El trazado del pueblo no es válido.';
  if (typeof config.mountainSnow !== 'boolean') return 'La opción de nieve no es válida.';
  if (!Number.isInteger(config.roomCount) || config.roomCount < 0 || config.roomCount > MAX_ROOMS) return `La cantidad debe ser un entero de 1 a ${MAX_ROOMS}, o automática.`;
  if (config.biome === 'dungeon' && config.roomCount > 0) { const error=roomCountError(config.width,config.height,config.roomCount); if(error)return error; }
  if (!PATH_LAYOUTS.some(p => p.id === config.forestPathLayout)) return 'El trazado de caminos no es válido.';
  if ([config.forestPaths, config.forestBranches, config.forestDeadEnds].some(value => typeof value !== 'boolean')) return 'Las opciones de caminos deben estar activadas o desactivadas.';
}
