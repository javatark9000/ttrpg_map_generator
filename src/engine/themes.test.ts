import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateMap, getRegions, walkable } from './generate';
import { ASSETS, DEFAULT_CONFIG } from './types';
import { THEME_IDS } from './themes';
import { dimensionsError, aspectRatio } from './dimensions';
import { parseMap } from './storage';
import { freshSeed } from './random';

const formats = [[8,8],[8,120],[120,8],[16,96],[96,16],[24,48],[48,24],[32,32],[64,36],[36,64],[80,80]];
describe.each(THEME_IDS)('%s world', theme => {
  it('is deterministic and preserves the theme through JSON', () => {
    const config = { ...DEFAULT_CONFIG, theme };
    const a = generateMap(config);
    expect(a).toEqual(generateMap(config));
    expect(parseMap(JSON.stringify(a))).toEqual(a);
    expect(a.config.theme).toBe(theme);
  });
  it.each(['forest', 'dungeon', 'cave'] as const)('%s supports squares, portraits and extreme aspect ratios', biome => {
    for (const [width, height] of formats) for (let i = 0; i < 3; i++) {
      const map = generateMap({ ...DEFAULT_CONFIG, biome, theme, width, height, seed: `RC-RATIO-${i}`, complexity: i * 50 });
      expect(map.terrain.length).toBe(width * height);
      expect(getRegions(map).length, `${biome}/${theme}/${width}x${height}/${i}`).toBe(1);
      expect(walkable(map.terrain[map.spawn.y * width + map.spawn.x])).toBe(true);
      for (const object of map.objects) {
        expect(object.x, `${object.asset} x in ${width}x${height}`).toBeGreaterThanOrEqual(0);
        expect(object.y, `${object.asset} y in ${width}x${height}`).toBeGreaterThanOrEqual(0);
        expect(object.x).toBeLessThan(width); expect(object.y).toBeLessThan(height);
      }
    }
  });
  it('has all 27 props and 4 terrain textures as self-contained SVGs', () => {
    for (const id of [...ASSETS.map(a => a.id), 'terrain-grass', 'terrain-soil', 'terrain-stone', 'terrain-water']) {
      const source = readFileSync(`public/assets/${theme}/${id}.svg`, 'utf8');
      expect(source).toContain('<svg'); expect(source).toContain('viewBox="0 0 128 128"');
      expect(source).not.toMatch(/(?:href|src)="https?:/);
      const original = readFileSync(`public/assets/${id}.svg`, 'utf8');
      if (theme === 'vanilla') expect(source).toBe(original);
      else expect(source).not.toBe(original);
    }
  });
});

describe('migration and configuration', () => {
  it('migrates old maps to Vanilla without changing the saved scene or legacy seed', () => {
    const source = generateMap({ ...DEFAULT_CONFIG, seed: 'ASTRA-7429' });
    const { theme: _theme, ...config } = source.config;
    const legacy = { ...source, version: 1, config };
    const migrated = parseMap(JSON.stringify(legacy));
    expect(migrated.config.theme).toBe('vanilla'); expect(migrated.version).toBe(2);
    expect(migrated.terrain).toEqual(source.terrain); expect(migrated.objects).toEqual(source.objects);
    expect(migrated.config.seed).toBe('ASTRA-7429');
  });
  it('rejects unknown or missing themes in version 2 and invalid geometry', () => {
    const source = generateMap(DEFAULT_CONFIG);
    for (const theme of ['evil', '../dark', null, undefined]) expect(() => parseMap(JSON.stringify({ ...source, config: { ...source.config, theme } }))).toThrow();
    expect(() => parseMap(JSON.stringify({ ...source, version: 99 }))).toThrow();
    expect(() => generateMap({ ...DEFAULT_CONFIG, width: 120, height: 120 })).toThrow();
    expect(dimensionsError(8,120)).toBeUndefined(); expect(dimensionsError(80,80)).toBeUndefined();
    expect(dimensionsError(0,30)).toBeTruthy(); expect(dimensionsError(NaN,30)).toBeTruthy();
    expect(dimensionsError(7,30)).toBeTruthy(); expect(dimensionsError(16.5,30)).toBeTruthy();
    expect(dimensionsError(121,30)).toBeTruthy(); expect(dimensionsError(120,54)).toBeTruthy();
  });
  it('reports actual aspect ratios and uses the new RC seed prefix', () => {
    expect(aspectRatio(64,36)).toBe('16:9'); expect(aspectRatio(36,64)).toBe('9:16');
    expect(aspectRatio(37,23)).toBe('37:23'); expect(aspectRatio(0,30)).toBe('—');
    expect(DEFAULT_CONFIG.seed).toMatch(/^RC-/); expect(freshSeed()).toMatch(/^RC-[A-Z0-9]+$/);
  });
  it('themes affect procedural decoration, not just the display colors', () => {
    const a = generateMap({ ...DEFAULT_CONFIG, theme: 'dark' });
    const b = generateMap({ ...DEFAULT_CONFIG, theme: 'anime' });
    expect(a.objects).not.toEqual(b.objects); expect(a.name).not.toBe(b.name);
  });
});
