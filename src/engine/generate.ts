import { ASSET_SIZES, BIOMES, BIOME_IDS, BUILDING_TYPES } from './types';
import { THEMES, THEME_IDS } from './themes';
import { dimensionsError } from './dimensions';
import { scenarioOptionsError } from './scenario-options';
import { generateDungeonRooms } from './dungeon-rooms';
import { generateForest } from './forest';
import { generateRuins, generateVillage, generateMountain } from './landscapes';
import { generateBuilding } from './buildings';
import type { AssetId, BattleMap, MapConfig, Terrain } from './types';
import { fbm, hashString, Random } from './random';

interface Room { x: number; y: number; w: number; h: number }
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
    return { ...source, config, terrain: Array.from({ length: w*h }, (_,i) => source.terrain[(i%w)*h+Math.floor(i/w)]),
      objects: source.objects.map(o => ({...o,x:o.y,y:o.x,rotation:Math.PI/2-o.rotation})), spawn:{x:source.spawn.y,y:source.spawn.x} };
  }
  const rng = new Random(seed + biome + (config.theme === 'vanilla' ? '' : `-${config.theme}`));
  const terrain: Terrain[] = Array(w * h).fill(biome === 'forest' ? 'grass' : biome === 'cave' ? 'rock' : 'wall');
  const suffix = rng.pick(THEMES[config.theme].suffixes);
  const map: BattleMap = { version: 2, config, name: `${biome === 'building' ? BUILDING_TYPES[config.buildingType].prefix : BIOMES[biome].prefix} ${suffix}`, terrain, objects: [], spawn: { x: 1, y: 1 } };
  const at = (x: number, y: number) => terrain[y * w + x];
  const set = (x: number, y: number, t: Terrain) => { if (x >= 0 && y >= 0 && x < w && y < h) terrain[y * w + x] = t; };
  const object = (asset: AssetId, x: number, y: number, scale = 1, rotation = 0) => {
    map.objects.push({ id: `obj-${map.objects.length}`, asset, x, y, scale: ASSET_SIZES[asset] * scale, rotation });
  };
  const carve = (x1: number, y1: number, x2: number, y2: number, radius = 0) => {
    let x = x1, y = y1;
    while (true) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) if (x + dx > 0 && x + dx < w - 1 && y + dy > 0 && y + dy < h - 1) set(x + dx, y + dy, 'floor');
      if (x === x2 && y === y2) break;
      if (x !== x2) x += Math.sign(x2 - x); else y += Math.sign(y2 - y);
    }
  };

  if (biome === 'ruins' || biome === 'village' || biome === 'mountain' || biome === 'building') {
    if (biome === 'ruins') generateRuins(map,rng,object);
    else if (biome === 'village') generateVillage(map,rng,object);
    else if (biome === 'mountain') generateMountain(map,rng,object);
    else generateBuilding(map,rng,object);
    connectRegions(map, biome === 'building' ? (['smithy','temple','warehouse'].includes(config.buildingType) ? 'floor' : 'wood') : biome === 'village' ? 'path' : 'gravel');
  } else if (biome === 'forest') {
    generateForest(map, rng, object);
    // Natural sandy fords preserve reachability without inventing unrequested roads.
    connectRegions(map, 'sand');
  } else if (biome === 'dungeon') {
    const rooms = generateDungeonRooms(config, rng);
    map.rooms = rooms;
    for (const room of rooms) for (let yy = room.y; yy < room.y + room.h; yy++) for (let xx = room.x; xx < room.x + room.w; xx++) set(xx, yy, 'floor');
    const center = (r: Room) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
    // Prim's minimum spanning tree guarantees all rooms are connected.
    const connected = new Set([0]);
    while (connected.size < rooms.length) {
      let best = Infinity, a = 0, b = 0;
      for (const i of connected) for (let j = 0; j < rooms.length; j++) if (!connected.has(j)) {
        const p = center(rooms[i]), q = center(rooms[j]);
        const d = Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
        if (d < best) { best = d; a = i; b = j; }
      }
      const p = center(rooms[a]), q = center(rooms[b]);
      carve(p.x, p.y, q.x, q.y, config.complexity < 35 ? 1 : 0);
      connected.add(b);
    }
    map.spawn = center(rooms[0]);
    if (config.landmarks) {
      object('stairs', map.spawn.x + 0.5, map.spawn.y + 0.5, 0.85);
      rooms.forEach((r, i) => {
        const c = center(r);
        if (i > 0 && r.w >= 6 && r.h >= 6) {
          if (i % 3 === 0) { object('rug', c.x + 0.5, c.y + 0.5, Math.min(r.w, r.h) / 6); object('table', c.x + 0.5, c.y + 0.5); object('books', c.x + 0.7, c.y + 0.3, 0.6); }
          else if (i % 3 === 1) { object('pillar', r.x + 1.5, r.y + 1.5); object('pillar', r.x + r.w - 1.5, r.y + 1.5); object('pillar', r.x + 1.5, r.y + r.h - 1.5); object('pillar', r.x + r.w - 1.5, r.y + r.h - 1.5); }
          else { object('altar', c.x + 0.5, r.y + 2, 1.1); object('rug', c.x + 0.5, c.y + 1.5, 0.9); }
        }
        object('torch', r.x + 0.5, r.y + Math.min(2.5, r.h / 2), 0.8, -Math.PI / 2);
        if (r.w > 7) object('torch', r.x + r.w - 0.5, r.y + r.h - 2, 0.8, Math.PI / 2);
        if (rng.next() * 100 < config.density) {
          object('crates', r.x + r.w - 1.6, r.y + r.h - 1.6, 0.85, rng.next() * .3);
          object('chest', r.x + r.w - 1.1, r.y + 1.1, 0.85);
          object('barrels', r.x + 1.2, r.y + r.h - 1.3, 0.9);
          if (i % 2) object(config.theme === 'anime' ? 'crystal' : 'bones', r.x + r.w - 1.5, r.y + r.h - 1.5, 0.9, rng.next() * 6);
        }
      });
      // Doors are placed at narrow room entrances, not randomly across rooms.
      const doors = new Set<string>();
      for (const r of rooms) {
        for (let x = r.x + 1; x < r.x + r.w - 1; x++) for (const y of [r.y, r.y + r.h - 1]) {
          const outside = y === r.y ? y - 1 : y + 1;
          if (outside >= 0 && outside < h && at(x, outside) === 'floor' && at(x - 1, outside) === 'wall' && at(x + 1, outside) === 'wall') {
            const key = `${x},${outside}`; if (!doors.has(key)) { object('door', x + .5, outside + .5, 1.0); doors.add(key); }
          }
        }
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (const x of [r.x, r.x + r.w - 1]) {
          const outside = x === r.x ? x - 1 : x + 1;
          if (outside >= 0 && outside < w && at(outside, y) === 'floor' && at(outside, y - 1) === 'wall' && at(outside, y + 1) === 'wall') {
            const key = `${outside},${y}`; if (!doors.has(key)) { object('door', outside + .5, y + .5, 1.0, Math.PI / 2); doors.add(key); }
          }
        }
      }
    }
  } else {
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) set(x, y, rng.next() < 0.45 + config.complexity * 0.0008 ? 'rock' : 'floor');
    for (let pass = 0; pass < 5; pass++) {
      const copy = terrain.slice();
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (copy[(y + dy) * w + x + dx] === 'rock') neighbors++;
        set(x, y, neighbors >= 5 ? 'rock' : 'floor');
      }
    }
    // A central clearing guarantees a viable cave even for dense random seeds.
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.hypot(dx, dy) < 3.3) set(Math.floor(w / 2) + dx, Math.floor(h / 2) + dy, 'floor');
    connectRegions(map);
    map.spawn = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
    const s = hashString(seed);
    if (config.water) {
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        if (at(x, y) === 'floor' && fbm(x * 0.14, y * 0.14, s) > 0.64 && Math.hypot(x - map.spawn.x, y - map.spawn.y) > 4) set(x, y, 'water');
      }
      connectRegions(map);
    }
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      if (at(x, y) !== 'floor' || Math.hypot(x - map.spawn.x, y - map.spawn.y) < 2.5) continue;
      const nearWall = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].includes('rock');
      if (nearWall && rng.next() < config.density / 260) object(rng.pick<AssetId>(['crystal', 'crystal', 'stalagmite', 'rock', 'mushrooms']), x + 0.5, y + 0.5, 0.7 + rng.next() * 0.5, rng.next() * 6.28);
      else if (config.landmarks && rng.next() < config.density / 7000) object(rng.pick<AssetId>(['bones', 'chest']), x + 0.5, y + 0.5, 0.8, rng.next() * 6.28);
    }
    if (config.landmarks) { object('campfire', map.spawn.x + 0.5, map.spawn.y + 0.5); object('bedroll', map.spawn.x + 2, map.spawn.y + 0.5); }
  }
  return map;
}

export function walkable(t: Terrain): boolean { return t !== 'wall' && t !== 'rock' && t !== 'water'; }
export function getRegions(map: BattleMap): number[][] {
  const { width: w, height: h } = map.config;
  const visited = new Uint8Array(w * h), regions: number[][] = [];
  for (let i = 0; i < map.terrain.length; i++) {
    if (visited[i] || !walkable(map.terrain[i])) continue;
    const region = [i]; visited[i] = 1;
    for (let j = 0; j < region.length; j++) {
      const p = region[j], x = p % w, y = Math.floor(p / w);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const n = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && !visited[n] && walkable(map.terrain[n])) { visited[n] = 1; region.push(n); }
      }
    }
    regions.push(region);
  }
  return regions.sort((a, b) => b.length - a.length);
}
function connectRegions(map: BattleMap, connectionTerrain: Terrain = 'floor'): void {
  const w = map.config.width, regions = getRegions(map);
  if (regions.length < 2) return;
  const main = [...regions[0]];
  for (const region of regions.slice(1)) {
    let best = Infinity, a = main[0], b = region[0];
    for (const p of region) for (const q of main) {
      const d = Math.abs(p % w - q % w) + Math.abs(Math.floor(p / w) - Math.floor(q / w));
      if (d < best) { best = d; a = p; b = q; }
    }
    let x = a % w, y = Math.floor(a / w);
    const tx = b % w, ty = Math.floor(b / w);
    while (x !== tx || y !== ty) {
      map.terrain[y * w + x] = connectionTerrain;
      if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
    }
    main.push(...region);
  }
}
