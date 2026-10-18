import type { BattleMap, Biome } from '../types';
import type { Random } from '../random';
import type { PlaceObject } from '../scenario-painter';
import { generateForest } from './forest';
import { generateDungeon } from './dungeon';
import { generateCave } from './cave';
import { generateRuins } from './ruins';
import { generateVillage } from './village';
import { generateMountain } from './mountain';
import { generateBuilding } from './building';

const generators: Record<Biome, (map: BattleMap, rng: Random, place: PlaceObject) => void> = {
  forest: generateForest,
  dungeon: generateDungeon,
  cave: generateCave,
  ruins: generateRuins,
  village: generateVillage,
  mountain: generateMountain,
  building: generateBuilding,
};

export function generateScenario(map: BattleMap, rng: Random, place: PlaceObject): void {
  generators[map.config.biome](map, rng, place);
}
