import { ASSETS } from './types';
import type { BattleMap, Terrain } from './types';
const terrainTypes = new Set<Terrain>(['grass', 'path', 'water', 'floor', 'wall', 'rock', 'sand']);
const assetTypes = new Set<string>(ASSETS.map(a => a.id));
export function parseMap(text: string): BattleMap {
  if (text.length > 5_000_000) throw new Error('El archivo es demasiado grande (máximo 5 MB).');
  const m = JSON.parse(text) as BattleMap;
  const c = m?.config;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (m?.version !== 1 || !c || !['forest', 'cave', 'dungeon'].includes(c.biome) || !Number.isInteger(c.width) || !Number.isInteger(c.height) || c.width < 16 || c.height < 16 || c.width > 80 || c.height > 80 || typeof c.seed !== 'string' || c.seed.length > 120 || typeof c.water !== 'boolean' || typeof c.landmarks !== 'boolean' || !finite(c.density) || c.density < 0 || c.density > 100 || !finite(c.complexity) || c.complexity < 0 || c.complexity > 100 || typeof m.name !== 'string' || m.name.length > 200) throw new Error('El archivo no es un proyecto Astra válido.');
  if (!Array.isArray(m.terrain) || m.terrain.length !== c.width * c.height || m.terrain.some(t => !terrainTypes.has(t))) throw new Error('Los datos de terreno no son válidos.');
  if (!Array.isArray(m.objects) || m.objects.length > 20_000 || m.objects.some(o => !o || !assetTypes.has(o.asset) || typeof o.id !== 'string' || o.id.length > 100 || !finite(o.x) || !finite(o.y) || o.x < 0 || o.y < 0 || o.x > c.width || o.y > c.height || !finite(o.scale) || o.scale <= 0 || o.scale > 20 || !finite(o.rotation))) throw new Error('Los objetos del mapa no son válidos.');
  if (!m.spawn || !Number.isInteger(m.spawn.x) || !Number.isInteger(m.spawn.y) || m.spawn.x < 0 || m.spawn.y < 0 || m.spawn.x >= c.width || m.spawn.y >= c.height) throw new Error('El punto de entrada no es válido.');
  return m;
}
export const STORAGE_KEY = 'astra-map-v1';
