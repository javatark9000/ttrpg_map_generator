import type { BattleMap, Biome } from '../types';
import type { Random } from '../random';
import type { PlaceObject } from '../scenario-painter';
import { generateForest } from './forest';
import { generateDungeon } from './dungeon';
import { generateCave } from './cave';
import { generateRuins } from './ruins';
import { generateVillage } from './village';
import { generateMountain } from './mountain';
import { generateCity } from './city';
import { generateHouse } from './house';
import { generateTavern } from './tavern';
import { generateInn } from './inn';
import { generateSmithy } from './smithy';
import { generateTemple } from './temple';
import { generateLibrary } from './library';
import { generateWarehouse } from './warehouse';
import { generateBarracks } from './barracks';

const generators: Record<Biome, (map: BattleMap, rng: Random, place: PlaceObject) => void> = {
  forest: generateForest, dungeon: generateDungeon, cave: generateCave, ruins: generateRuins,
  village: generateVillage, mountain: generateMountain, city: generateCity,
  house: generateHouse, tavern: generateTavern, inn: generateInn, smithy: generateSmithy,
  temple: generateTemple, library: generateLibrary, warehouse: generateWarehouse, barracks: generateBarracks,
};

export function generateScenario(map: BattleMap, rng: Random, place: PlaceObject): void {
  generators[map.config.biome](map, rng, place);
}
