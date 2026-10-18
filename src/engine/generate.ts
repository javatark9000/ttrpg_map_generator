import { ASSET_SIZES, BIOMES, BIOME_IDS, BUILDING_TYPES } from './types';
import { THEMES, THEME_IDS } from './themes';
import { dimensionsError } from './dimensions';
import { scenarioOptionsError } from './scenario-options';
import { generateScenario } from './scenarios';
import type { AssetId, BattleMap, MapConfig, Terrain } from './types';
import { Random } from './random';

export { getRegions, walkable } from './scenarios/connectivity';

/** Validate, initialize and dispatch a map to its scenario-specific generator. */
export function generateMap(input: MapConfig): BattleMap {
  const config = { ...input };
  const error = dimensionsError(config.width, config.height);
  if (error) throw new Error(error);
  const scenarioError = scenarioOptionsError(config);
  if (scenarioError) throw new Error(scenarioError);
  if (!THEME_IDS.includes(config.theme)) throw new Error('La temática no es válida.');
  if (!BIOME_IDS.includes(config.biome) || typeof config.seed !== 'string' || config.seed.length > 120 || !Number.isFinite(config.density) || config.density < 0 || config.density > 100 || !Number.isFinite(config.complexity) || config.complexity < 0 || config.complexity > 100) throw new Error('La configuración del mapa no es válida.');

  const { width: w, height: h, biome, seed } = config;
  // Narrow building plans follow the long axis; objects and entry rotate with it.
  if (biome === 'building' && w > h * 1.5) {
    const source = generateMap({ ...config, width: h, height: w });
    return {
      ...source,
      config,
      terrain: Array.from({ length: w * h }, (_, i) => source.terrain[(i % w) * h + Math.floor(i / w)]),
      objects: source.objects.map(o => ({ ...o, x: o.y, y: o.x, rotation: Math.PI / 2 - o.rotation })),
      spawn: { x: source.spawn.y, y: source.spawn.x },
    };
  }

  const rng = new Random(seed + biome + (config.theme === 'vanilla' ? '' : `-${config.theme}`));
  const terrain: Terrain[] = Array(w * h).fill(biome === 'forest' ? 'grass' : biome === 'cave' ? 'rock' : 'wall');
  const suffix = rng.pick(THEMES[config.theme].suffixes);
  const map: BattleMap = {
    version: 2,
    config,
    name: `${biome === 'building' ? BUILDING_TYPES[config.buildingType].prefix : BIOMES[biome].prefix} ${suffix}`,
    terrain,
    objects: [],
    spawn: { x: 1, y: 1 },
  };
  const object = (asset: AssetId, x: number, y: number, scale = 1, rotation = 0) => {
    map.objects.push({ id: `obj-${map.objects.length}`, asset, x, y, scale: ASSET_SIZES[asset] * scale, rotation });
  };

  generateScenario(map, rng, object);
  return map;
}
