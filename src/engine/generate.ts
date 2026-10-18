import { ASSET_SIZES, BIOMES, BIOME_IDS, isBuildingBiome } from './types';
import { THEMES, THEME_IDS } from './themes';
import { dimensionsError } from './dimensions';
import { generationOptionsError } from './scenario-options';
import { generateScenario } from './scenarios';
import type { AssetId, BattleMap, MapConfig, Terrain, MapLayer } from './types';
import { Random } from './random';

export { getRegions, walkable } from './scenarios/connectivity';

/** Validate, initialize and dispatch a map to its scenario-specific generator. */
export function generateMap(input: MapConfig): BattleMap {
  const config = { ...input };
  const error = dimensionsError(config.width, config.height);
  if (error) throw new Error(error);
  const scenarioError = generationOptionsError(config);
  if (scenarioError) throw new Error(scenarioError);
  if (!THEME_IDS.includes(config.theme)) throw new Error('La temática no es válida.');
  if (!BIOME_IDS.includes(config.biome) || typeof config.water !== 'boolean' || typeof config.landmarks !== 'boolean' || typeof config.seed !== 'string' || config.seed.length > 120 || !Number.isFinite(config.density) || config.density < 0 || config.density > 100 || !Number.isFinite(config.complexity) || config.complexity < 0 || config.complexity > 100) throw new Error('La configuración del mapa no es válida.');

  const { width: w, height: h, biome, seed } = config;
  // Narrow building plans follow the long axis; objects and entry rotate with it.
  if (isBuildingBiome(biome) && w > h * 1.5) {
    const source = generateMap({ ...config, width: h, height: w });
    // A real clockwise quarter-turn preserves directional SVGs; swapping X/Y would reflect them.
    const rotateFloor = (floor: Pick<MapLayer, 'terrain' | 'objects' | 'spawn' | 'rooms'>) => ({
      terrain: Array.from({ length: w * h }, (_, i) => floor.terrain[(w - 1 - i % w) * h + Math.floor(i / w)]),
      objects: floor.objects.map(o => ({ ...o, x: w - o.y, y: o.x, rotation: o.rotation + Math.PI / 2 })),
      spawn: { x: w - 1 - floor.spawn.y, y: floor.spawn.x },
      rooms: floor.rooms?.map(r => ({ ...r, x: w - r.y - r.h, y: r.x, w: r.h, h: r.w })),
    });
    return { ...source, config, ...rotateFloor(source), layers: source.layers?.map(layer => ({ ...layer, ...rotateFloor(layer) })) };
  }

  const rng = new Random(seed + (isBuildingBiome(biome) ? 'building' : biome) + (config.theme === 'vanilla' ? '' : `-${config.theme}`));
  const terrain: Terrain[] = Array(w * h).fill(biome === 'forest' ? 'grass' : biome === 'cave' ? 'rock' : 'wall');
  const suffix = rng.pick(THEMES[config.theme].suffixes);
  const map: BattleMap = {
    version: 2,
    config,
    name: `${BIOMES[biome].prefix} ${suffix}`,
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
