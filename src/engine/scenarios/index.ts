import type { AssetId, BattleMap, Biome } from '../types';
import type { Random } from '../random';
import { generateForest } from './forest';
import { generateDungeon } from './dungeon';
import { generateCave } from './cave';
import { generateRuins } from './ruins';
import { generateVillage } from './village';
import { generateMountain } from './mountain';
import { generateBuilding } from './building';
import { connectRegions } from './connectivity';

export type PlaceObject = (asset: AssetId, x: number, y: number, scale?: number, rotation?: number) => void;
export type ScenarioGenerator = (map: BattleMap, rng: Random, object: PlaceObject) => void;

const generators: Record<Biome, ScenarioGenerator> = {
  forest(map, rng, object) {
    generateForest(map, rng, object);
    // Natural sandy fords preserve reachability without inventing unrequested roads.
    connectRegions(map, 'sand');
  },
  dungeon: generateDungeon,
  cave: generateCave,
  ruins(map, rng, object) {
    generateRuins(map, rng, object);
    connectRegions(map, 'gravel');
  },
  village(map, rng, object) {
    generateVillage(map, rng, object);
    connectRegions(map, 'path');
  },
  mountain(map, rng, object) {
    generateMountain(map, rng, object);
    connectRegions(map, 'gravel');
  },
  building(map, rng, object) {
    generateBuilding(map, rng, object);
    const floor = ['smithy', 'temple', 'warehouse'].includes(map.config.buildingType) ? 'floor' : 'wood';
    connectRegions(map, floor);
  },
};

export function generateScenario(map: BattleMap, rng: Random, object: PlaceObject): void {
  generators[map.config.biome](map, rng, object);
}
