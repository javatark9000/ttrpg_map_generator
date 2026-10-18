import type { MapConfig } from '../../types';

/** Shared with configuration validation/UI; the minimum map can host one entrance. */
export function maxMountainCaveEntrances(width: number, height: number): number {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8) return 0;
  return Math.min(12, Math.max(1, Math.floor(width * height / 144)));
}

export type MountainLayout = MapConfig['mountainPathLayout'];
