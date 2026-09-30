import { describe, expect, it } from 'vitest';
import { generateMap, getRegions, walkable } from './generate';
import { DEFAULT_CONFIG } from './types';
import type { Biome } from './types';
import { parseMap } from './storage';
import { Random, fbm } from './random';

describe('seeded randomness', () => {
  it('is deterministic and stays in range', () => {
    const a = new Random('test'), b = new Random('test');
    for (let i = 0; i < 500; i++) { const n = a.next(); expect(n).toBe(b.next()); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThan(1); }
  });
  it('produces bounded noise', () => {
    for (let i = 0; i < 200; i++) { const n = fbm(i * .3, i * -.27, 31); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(1); }
  });
});

describe.each<Biome>(['forest', 'dungeon', 'cave'])('%s generator', biome => {
  it('generates the same map from the same configuration', () => {
    const config = { ...DEFAULT_CONFIG, biome };
    expect(generateMap(config)).toEqual(generateMap(config));
    expect(config).toEqual({ ...DEFAULT_CONFIG, biome });
  });
  it('changes the map when the seed changes', () => {
    expect(generateMap({ ...DEFAULT_CONFIG, biome, seed: 'A' })).not.toEqual(generateMap({ ...DEFAULT_CONFIG, biome, seed: 'B' }));
  });
  it('changes terrain when complexity changes', () => {
    expect(generateMap({ ...DEFAULT_CONFIG, biome, complexity: 0 }).terrain).not.toEqual(generateMap({ ...DEFAULT_CONFIG, biome, complexity: 100 }).terrain);
  });
  it('survives a JSON round trip', () => {
    const map = generateMap({ ...DEFAULT_CONFIG, biome });
    expect(parseMap(JSON.stringify(map))).toEqual(map);
  });
  it('generates connected terrain and bounded objects across seeds and sizes', () => {
    for (let i = 0; i < 30; i++) {
      const map = generateMap({ ...DEFAULT_CONFIG, biome, seed: `regression-${i}`, width: i % 2 ? 24 : 56, height: i % 2 ? 18 : 40, complexity: (i % 3) * 50 });
      expect(map.terrain).toHaveLength(map.config.width * map.config.height);
      expect(walkable(map.terrain[map.spawn.y * map.config.width + map.spawn.x])).toBe(true);
      expect(getRegions(map)).toHaveLength(1);
      expect(map.objects.every(o => o.x >= 0 && o.y >= 0 && o.x < map.config.width && o.y < map.config.height)).toBe(true);
      expect(new Set(map.objects.map(o => o.id)).size).toBe(map.objects.length);
    }
  });
});

describe('configuration and persistence safety', () => {
  it('rejects malformed dimensions and controls', () => {
    expect(() => generateMap({ ...DEFAULT_CONFIG, width: 9000 })).toThrow();
    expect(() => generateMap({ ...DEFAULT_CONFIG, height: 2.5 })).toThrow();
    expect(() => generateMap({ ...DEFAULT_CONFIG, density: NaN })).toThrow();
    expect(() => generateMap({ ...DEFAULT_CONFIG, complexity: -1 })).toThrow();
  });
  it('rejects malformed saved projects', () => {
    expect(() => parseMap('{}')).toThrow();
    expect(() => parseMap('not json')).toThrow();
    const map = generateMap(DEFAULT_CONFIG);
    expect(() => parseMap(JSON.stringify({ ...map, terrain: [] }))).toThrow();
    expect(() => parseMap(JSON.stringify({ ...map, terrain: map.terrain.map(() => 'lava') }))).toThrow();
    expect(() => parseMap(JSON.stringify({ ...map, objects: [{ ...map.objects[0], asset: '../../evil.svg' }] }))).toThrow();
    expect(() => parseMap(JSON.stringify({ ...map, objects: [{ ...map.objects[0], scale: 50000 }] }))).toThrow();
    expect(() => parseMap(JSON.stringify({ ...map, spawn: { x: -1, y: 0 } }))).toThrow();
  });
  it('respects water and landmark toggles', () => {
    for (const biome of ['forest', 'cave'] as const) {
      const map = generateMap({ ...DEFAULT_CONFIG, biome, water: false, landmarks: false });
      expect(map.terrain.includes('water')).toBe(false);
      expect(map.objects.some(o => o.asset === 'campfire' || o.asset === 'bridge' || o.asset === 'bedroll')).toBe(false);
    }
  });
});
