import type { MapConfig, ForestPathLayout, VillageLayout } from './types';
import { dungeonRoomQuotasBoundsError } from './scenarios/dungeon/quotas';
import { houseOptionsError } from './scenarios/house/layout';
import { innRoomCountError } from './scenarios/inn';
import { smithyExtraRoomCountError } from './scenarios/smithy';
import { maxMountainCaveEntrances } from './scenarios/mountain/options';
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
const choices = {
  forestRiverDirection: ['none', 'random', 'north-south', 'east-west', 'diagonal-nw-se', 'diagonal-ne-sw'],
  forestPathLayout: PATH_LAYOUTS.map(layout => layout.id),
  villageLayout: VILLAGE_LAYOUTS.map(layout => layout.id),
  caveChasms: ['none', 'safe', 'dividing'], ruinLayout: ['grid', 'courtyard', 'scattered', 'random'],
  ruinFeatures: ['simple', 'standard', 'monumental'], villageBlockSize: ['small', 'mixed', 'large'],
  mountainPathLayout: ['pass', 'switchback', 'ridge', 'fork', 'random'],
  cityAlleys: ['none', 'few', 'many'], cityStreetWidth: ['narrow', 'standard', 'wide'],
  houseStatus: ['poor', 'common', 'wealthy'], houseLayout: ['compact', 'corridor', 'courtyard', 'random'],
  tavernCondition: ['ordered', 'messy'], smithyForgeLayout: ['wall', 'central'],
  templeStyle: ['roman', 'mosque', 'synagogue', 'mandir', 'pagoda'], templeTransition: ['none', 'upper', 'basement'],
  warehouseShelfLayout: ['parallel', 'perimeter', 'mixed', 'random'], barracksBedLayout: ['walls', 'perpendicular', 'rows', 'random'],
} satisfies Partial<Record<keyof MapConfig, string[]>>;

/** Runtime boundary shared by form submission, worker and project import. */
export function scenarioOptionsError(config: MapConfig): string | undefined {
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
    if (!(choices[key] as readonly string[]).includes(config[key])) return `La opción ${key} no es válida.`;
  }
  for (const key of ['forestPaths', 'forestBranches', 'forestDeadEnds', 'mountainSnow', 'mountainPaths', 'caveNaturalBridges',
    'ruinSecretPassages', 'citySewers', 'cityWalls', 'tavernUpperStairs', 'innUpperStairs', 'templeMainHallOnly', 'templeSecretRooms'] as const) {
    if (typeof config[key] !== 'boolean') return `La opción ${key} debe estar activada o desactivada.`;
  }
  for (const key of ['ruinDecay', 'cityDensity', 'cityDistrictBalance', 'warehouseFill', 'barracksContents'] as const) {
    if (!Number.isFinite(config[key]) || config[key] < 0 || config[key] > 100) return `${key} debe estar entre 0 y 100.`;
  }
  for (const key of ['roomCount', 'houseBedrooms', 'smithyExtraRoomCount', 'mountainCaveEntrances', 'innRoomCount'] as const) {
    if (!Number.isInteger(config[key]) || config[key] < (key === 'innRoomCount' ? 1 : 0) || config[key] > 40) return `${key} debe ser un entero entre ${key === 'innRoomCount' ? 1 : 0} y 40.`;
  }
  const quotas = config.dungeonRooms;
  if (quotas !== null) {
    if (!quotas || typeof quotas !== 'object' || Array.isArray(quotas)) return 'Las cuotas de habitaciones no son válidas.';
    const counts = [quotas.small, quotas.medium, quotas.large];
    if (counts.some(n => !Number.isInteger(n) || n < 0) || counts.reduce((a, b) => a + b, 0) < 1 || counts.reduce((a, b) => a + b, 0) > MAX_ROOMS) return `Solicita entre 1 y ${MAX_ROOMS} habitaciones, con cantidades enteras no negativas.`;
  }
  if (!config.villageWealth || typeof config.villageWealth !== 'object' || Array.isArray(config.villageWealth)) return 'La distribución de viviendas no es válida.';
  const wealth = [config.villageWealth.poor, config.villageWealth.common, config.villageWealth.wealthy];
  if (wealth.some(n => !Number.isFinite(n) || n < 0 || n > 100) || Math.abs(wealth.reduce((a, b) => a + b, 0) - 100) > .001) return 'Los porcentajes de viviendas deben sumar 100.';
  const required = config.villageRequiredBuildings;
  if (!Array.isArray(required) || required.some(id => !['market', 'tavern', 'temple', 'ranch'].includes(id)) || new Set(required).size !== required.length) return 'La selección de edificios obligatorios no es válida.';
}

/** Stored maps keep their geometry even when an older generation setting no longer fits. */
export function generationOptionsError(config: MapConfig): string | undefined {
  const error = scenarioOptionsError(config);
  if (error) return error;
  const { width, height } = config;
  switch (config.biome) {
    case 'dungeon':
      return config.dungeonRooms !== null
        ? dungeonRoomQuotasBoundsError(width, height, config.dungeonRooms)
        : config.roomCount > 0 ? roomCountError(width, height, config.roomCount) : undefined;
    case 'house': return houseOptionsError(width, height, config.houseLayout, config.houseBedrooms);
    case 'inn': return innRoomCountError(width, height, config.innRoomCount, config.innUpperStairs);
    case 'smithy': return smithyExtraRoomCountError(width, height, config.smithyExtraRoomCount);
    case 'mountain': {
      const maximum = maxMountainCaveEntrances(width, height);
      if (config.mountainCaveEntrances > maximum) return `En ${width} × ${height} se admiten hasta ${maximum} entradas de cueva.`;
      break;
    }
  }
}
