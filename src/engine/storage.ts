import { ASSETS, BIOME_IDS } from './types';
import { THEME_IDS } from './themes';
import { dimensionsError } from './dimensions';
import { SCENARIO_DEFAULTS, scenarioOptionsError } from './scenario-options';
import type { BattleMap, Terrain } from './types';
const terrainTypes = new Set<Terrain>(['grass', 'path', 'water', 'floor', 'wall', 'rock', 'sand', 'wood', 'snow', 'gravel']);
const assetTypes = new Set<string>(ASSETS.map(a => a.id));
export function parseMap(text: string): BattleMap {
  if (text.length > 5_000_000) throw new Error('El archivo es demasiado grande (máximo 5 MB).');
  const parsed = JSON.parse(text);
  // Old projects retain their geometry, objects and seed; only absent themes migrate.
  if (parsed?.version === 1 && parsed.config && typeof parsed.config === 'object') {
    if (parsed.config.theme === undefined) parsed.config.theme = 'vanilla';
    parsed.version = 2;
  }
  // Additive version-2 migration: old maps keep their exact stored terrain and objects.
  if (parsed?.version === 2 && parsed.config && typeof parsed.config === 'object' && !Array.isArray(parsed.config)) {
    for (const [key, value] of Object.entries(SCENARIO_DEFAULTS)) if (parsed.config[key] === undefined) parsed.config[key] = value;
  }
  const m = parsed as BattleMap;
  const c = m?.config;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (m?.version !== 2 || !c || !THEME_IDS.includes(c.theme) || !BIOME_IDS.includes(c.biome) || dimensionsError(c.width, c.height) || typeof c.seed !== 'string' || c.seed.length > 120 || typeof c.water !== 'boolean' || typeof c.landmarks !== 'boolean' || !finite(c.density) || c.density < 0 || c.density > 100 || !finite(c.complexity) || c.complexity < 0 || c.complexity > 100 || typeof m.name !== 'string' || m.name.length > 200) throw new Error('El archivo no es un proyecto RC válido.');
  const scenarioError = scenarioOptionsError(c);
  if (scenarioError) throw new Error(scenarioError);
  if (m.rooms !== undefined && (!Array.isArray(m.rooms) || m.rooms.length > 256 || m.rooms.some(r => !r || ![r.x,r.y,r.w,r.h].every(Number.isInteger) || r.x < 1 || r.y < 1 || r.w < 4 || r.h < 4 || r.x + r.w >= c.width || r.y + r.h >= c.height))) throw new Error('Los datos de cuartos no son válidos.');
  if (!Array.isArray(m.terrain) || m.terrain.length !== c.width * c.height || m.terrain.some(t => !terrainTypes.has(t))) throw new Error('Los datos de terreno no son válidos.');
  if (!Array.isArray(m.objects) || m.objects.length > 20_000 || m.objects.some(o => !o || !assetTypes.has(o.asset) || typeof o.id !== 'string' || o.id.length > 100 || !finite(o.x) || !finite(o.y) || o.x < 0 || o.y < 0 || o.x > c.width || o.y > c.height || !finite(o.scale) || o.scale <= 0 || o.scale > 20 || !finite(o.rotation))) throw new Error('Los objetos del mapa no son válidos.');
  if (!m.spawn || !Number.isInteger(m.spawn.x) || !Number.isInteger(m.spawn.y) || m.spawn.x < 0 || m.spawn.y < 0 || m.spawn.x >= c.width || m.spawn.y >= c.height) throw new Error('El punto de entrada no es válido.');
  return m;
}
export const STORAGE_KEY = 'rc-map-v2';
export const LEGACY_STORAGE_KEY = 'astra-map-v1';
