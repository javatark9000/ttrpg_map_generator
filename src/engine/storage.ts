import { ASSETS, ASSET_SIZES, BIOME_IDS, BUILDING_BIOMES, DEFAULT_CONFIG } from './types';
import { parseLighting } from './lighting-settings';
import { THEME_IDS } from './themes';
import { dimensionsError } from './dimensions';
import { scenarioOptionsError } from './scenario-options';
import type { BattleMap, MapLayer, Terrain } from './types';

const terrainTypes = new Set<Terrain>(['grass', 'path', 'water', 'floor', 'wall', 'rock', 'sand', 'wood', 'snow', 'gravel', 'void']);
const assetTypes = new Set<string>(ASSETS.map(a => a.id));
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function parseMap(text: string): BattleMap {
  if (text.length > 5_000_000) throw new Error('El archivo es demasiado grande (máximo 5 MB).');
  const parsed = JSON.parse(text);
  if (!parsed || ![1, 2].includes(parsed.version) || !parsed.config || typeof parsed.config !== 'object' || Array.isArray(parsed.config)) throw new Error('El archivo no es un proyecto RC válido.');
  const input = parsed.config;
  if (parsed.version === 1 && input.theme === undefined) input.theme = 'vanilla';
  parsed.version = 2;
  if (input.biome === 'building') {
    const type = input.buildingType ?? 'house';
    if (!BUILDING_BIOMES.includes(type)) throw new Error('El tipo de edificio anterior no es válido.');
    input.biome = type;
  }
  // Validate mandatory original fields before filling additive options.
  if (!BIOME_IDS.includes(input.biome) || !THEME_IDS.includes(input.theme) || dimensionsError(input.width, input.height)
    || typeof input.seed !== 'string' || input.seed.length > 120 || typeof input.water !== 'boolean' || typeof input.landmarks !== 'boolean'
    || !finite(input.density) || input.density < 0 || input.density > 100 || !finite(input.complexity) || input.complexity < 0 || input.complexity > 100
    || typeof parsed.name !== 'string' || parsed.name.length > 200) throw new Error('El archivo no es un proyecto RC válido.');
  // Migration never regenerates geometry. Preserve the old river orientation.
  if (input.forestRiverDirection === undefined) input.forestRiverDirection = 'north-south';
  parsed.config = { ...structuredClone(DEFAULT_CONFIG), ...input };
  delete parsed.config.buildingType;
  const map = parsed as BattleMap, config = map.config;
  const error = scenarioOptionsError(config);
  if (error) throw new Error(error);
  const { width, height } = config;
  let objectCount = 0;
  const validateFloor = (floor: Pick<MapLayer, 'terrain' | 'objects' | 'spawn' | 'rooms'>) => {
    if (!floor || !Array.isArray(floor.terrain) || floor.terrain.length !== width * height || floor.terrain.some(t => !terrainTypes.has(t))) throw new Error('Los datos de terreno no son válidos.');
    if (!Array.isArray(floor.objects)) throw new Error('Los objetos del mapa no son válidos.');
    objectCount += floor.objects.length;
    if (objectCount > 20_000 || floor.objects.some(o => !o || !assetTypes.has(o.asset) || typeof o.id !== 'string' || o.id.length > 100
      || !finite(o.x) || !finite(o.y) || o.x < 0 || o.y < 0 || o.x > width || o.y > height
      || !finite(o.scale) || o.scale <= 0 || o.scale > Math.max(20, ASSET_SIZES[o.asset] * 4) || !finite(o.rotation)
      || (o.theme !== undefined && !THEME_IDS.includes(o.theme)))) throw new Error('Los objetos del mapa no son válidos.');
    const spawn = floor.spawn;
    if (!spawn || !Number.isInteger(spawn.x) || !Number.isInteger(spawn.y) || spawn.x < 0 || spawn.y < 0 || spawn.x >= width || spawn.y >= height) throw new Error('El punto de entrada no es válido.');
    if (floor.rooms !== undefined && (!Array.isArray(floor.rooms) || floor.rooms.length > 256 || floor.rooms.some(r => !r
      || ![r.x, r.y, r.w, r.h].every(Number.isInteger) || r.x < 0 || r.y < 0 || r.w < 1 || r.h < 1 || r.x + r.w > width || r.y + r.h > height))) throw new Error('Los datos de habitaciones no son válidos.');
  };
  validateFloor(map);
  if (map.layers !== undefined) {
    if (!Array.isArray(map.layers) || map.layers.length > 8) throw new Error('El proyecto admite hasta ocho plantas adicionales.');
    const ids = new Set<string>();
    for (const layer of map.layers) {
      if (!layer || typeof layer.id !== 'string' || !layer.id || layer.id.length > 100 || ids.has(layer.id)
        || typeof layer.name !== 'string' || layer.name.length > 100 || !Number.isInteger(layer.elevation)) throw new Error('Los datos de plantas no son válidos.');
      ids.add(layer.id);
      validateFloor(layer);
    }
  }
  if (map.activeLayer !== undefined && (!Number.isInteger(map.activeLayer) || map.activeLayer < 0 || map.activeLayer > (map.layers?.length ?? 0))) throw new Error('La planta seleccionada no existe.');
  if (map.lighting !== undefined) map.lighting = parseLighting(map.lighting);
  return map;
}
export const STORAGE_KEY = 'rc-map-v2';
export const LEGACY_STORAGE_KEY = 'astra-map-v1';
