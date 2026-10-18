import type { AssetId, Biome } from './types';

export interface LightingSettings {
  enabled: boolean;
  sun: boolean;
  intensity: number;
  /** Compass bearing of the light SOURCE: 0 = north, 90 = east. */
  direction: number;
  warmth: number;
  beams: boolean;
  beamStrength: number;
  beamWidth: number;
  beamDensity: number;
  shadows: boolean;
  shadowStrength: number;
  shadowLength: number;
  softness: number;
  vignette: number;
  halos: number;
}
export const DEFAULT_LIGHTING: Readonly<LightingSettings> = Object.freeze({
  enabled: true, sun: true, intensity: 50, direction: 315, warmth: 65,
  beams: true, beamStrength: 45, beamWidth: 50, beamDensity: 50, shadows: true, shadowStrength: 45,
  shadowLength: 40, softness: 65, vignette: 45, halos: 100,
});
export const LIGHTING_RANGES = {
  intensity: 100, direction: 359, warmth: 100, beamStrength: 100, beamWidth: 100, beamDensity: 100,
  shadowStrength: 100, shadowLength: 100, softness: 100, vignette: 100, halos: 100,
} as const;
export type LightingNumber = keyof typeof LIGHTING_RANGES;

/** Strict project validation; absent properties migrate additively. */
export function parseLighting(value: unknown): LightingSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Los ajustes de iluminación no son válidos.');
  const input = value as Record<string, unknown>, result = { ...DEFAULT_LIGHTING };
  for (const key of Object.keys(DEFAULT_LIGHTING) as (keyof LightingSettings)[]) {
    if (input[key] === undefined) continue;
    const v = input[key];
    if (typeof DEFAULT_LIGHTING[key] === 'boolean') {
      if (typeof v !== 'boolean') throw new Error('Los ajustes de iluminación no son válidos.');
    } else if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > LIGHTING_RANGES[key as LightingNumber]) {
      throw new Error('Los ajustes de iluminación no son válidos.');
    }
    Object.assign(result, { [key]: v });
  }
  return result;
}
export function lightingProfile(biome: Biome): { outdoor: boolean; beams: boolean; description: string } {
  switch (biome) {
    case 'forest': return { outdoor: true, beams: true, description: 'Bosque · Haces fragmentados entre las copas y sombras de los árboles.' };
    case 'ruins': return { outdoor: true, beams: true, description: 'Ruinas · Haces en zonas abiertas, recortados por muros y estructuras.' };
    case 'village': return { outdoor: true, beams: false, description: 'Pueblo · Luz ambiental y sombras de tejados. Sin haces sobre las casas.' };
    case 'mountain': return { outdoor: true, beams: false, description: 'Montaña · Luz direccional y sombras frías de los bordes rocosos. Sin haces.' };
    default: return { outdoor: false, beams: false, description: 'Interior · Sin sol directo. Puedes ajustar la viñeta y los halos de fuego y magia.' };
  }
}
export function shadowVector(direction: number): { x: number; y: number } {
  const radians = direction * Math.PI / 180;
  return { x: -Math.sin(radians), y: Math.cos(radians) };
}
/** Approximate heights, not navigation obstacles or a physical 3D model. */
export function casterHeight(asset: AssetId): number {
  if (asset.startsWith('tree-')) return 1.8;
  if (asset.startsWith('roof-')) return 1.2;
  if (['pillar', 'broken-pillar', 'archway', 'statue', 'stalagmite'].includes(asset)) return .85;
  if (['rock', 'bush', 'well', 'market-stall', 'tent', 'fence'].includes(asset)) return .4;
  return 0;
}
