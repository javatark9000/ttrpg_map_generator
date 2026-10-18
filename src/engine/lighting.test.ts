import { describe, expect, it } from 'vitest';
import { casterHeight, DEFAULT_LIGHTING, LIGHTING_RANGES, lightingProfile, parseLighting, shadowVector } from './lighting-settings';
import { generateMap } from './generate';
import { parseMap } from './storage';
import { DEFAULT_CONFIG } from './types';

describe('lighting settings and project compatibility', () => {
  it('adds absent settings without mutating defaults', () => {
    const parsed = parseLighting({ direction: 90 });
    expect(parsed).toEqual({ ...DEFAULT_LIGHTING, direction: 90 });
    expect(DEFAULT_LIGHTING.direction).toBe(315);
  });
  it.each(Object.keys(LIGHTING_RANGES))('validates %s as a bounded finite number', key => {
    const max = LIGHTING_RANGES[key as keyof typeof LIGHTING_RANGES];
    for (const value of [-1, max + 1, NaN, Infinity, null, '50', false]) expect(() => parseLighting({ [key]: value })).toThrow('iluminación');
    for (const value of [0, max]) expect(parseLighting({ [key]: value })[key as keyof typeof LIGHTING_RANGES]).toBe(value);
  });
  it('rejects malformed settings and boolean flags', () => {
    for (const value of [null, [], 123, 'luz', { sun: 1 }, { enabled: 'false' }, { shadows: null }, { beams: 0 }]) expect(() => parseLighting(value)).toThrow('iluminación');
  });
  it('retains legacy geometry and persists custom lighting in version 2', () => {
    const map = generateMap({ ...DEFAULT_CONFIG, width: 16, height: 12 });
    expect(parseMap(JSON.stringify(map))).toEqual(map);
    map.lighting = { ...DEFAULT_LIGHTING, direction: 97, halos: 22, sun: false };
    expect(parseMap(JSON.stringify(map))).toEqual(map);
    expect(() => parseMap(JSON.stringify({ ...map, lighting: { intensity: -5 } }))).toThrow('iluminación');
  });
  it('selects outdoor and beam profiles without sunlight indoors', () => {
    for (const biome of ['forest', 'ruins'] as const) expect(lightingProfile(biome)).toMatchObject({ outdoor: true, beams: true });
    for (const biome of ['village', 'mountain'] as const) expect(lightingProfile(biome)).toMatchObject({ outdoor: true, beams: false });
    for (const biome of ['building', 'dungeon', 'cave'] as const) expect(lightingProfile(biome)).toMatchObject({ outdoor: false, beams: false });
  });
  it.each([[0, 0, 1], [90, -1, 0], [180, 0, -1], [270, 1, 0], [315, Math.SQRT1_2, Math.SQRT1_2]])('projects opposite the light source at %d°', (angle, x, y) => {
    expect(shadowVector(angle).x).toBeCloseTo(x); expect(shadowVector(angle).y).toBeCloseTo(y);
  });
  it('casts tall objects, not flat props or every decoration', () => {
    expect(casterHeight('tree-oak')).toBeGreaterThan(casterHeight('rock'));
    expect(casterHeight('roof-house')).toBeGreaterThan(0);
    for (const asset of ['rug', 'bridge', 'lilies', 'flowers', 'torch'] as const) expect(casterHeight(asset)).toBe(0);
  });
});
