import type { BattleMap } from '../../types';
import { fbm, hashString, Random } from '../../random';

const RIVER_DIRECTIONS = ['north-south', 'east-west', 'diagonal-nw-se', 'diagonal-ne-sw'] as const;

/** Paint in world coordinates: diagonal rivers retain their width on narrow maps. */
export function paintForestRiver(map: BattleMap): void {
  const { width, height, seed, water, forestRiverDirection, complexity } = map.config;
  if (!water || forestRiverDirection === 'none') return;

  const direction = forestRiverDirection === 'random'
    ? new Random(`${seed}-forest-river`).pick(RIVER_DIRECTIONS)
    : forestRiverDirection;

  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;
  switch (direction) {
    case 'north-south':
      startX = width * 0.67;
      startY = 0;
      endX = startX;
      endY = height;
      break;
    case 'east-west':
      startX = 0;
      startY = height * 0.67;
      endX = width;
      endY = startY;
      break;
    case 'diagonal-nw-se':
      startX = 0;
      startY = 0;
      endX = width;
      endY = height;
      break;
    case 'diagonal-ne-sw':
      startX = width;
      startY = 0;
      endX = 0;
      endY = height;
      break;
  }

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.hypot(deltaX, deltaY);
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  // Use the same transverse sign as the original north-south river.
  const normalX = unitY;
  const normalY = -unitX;
  const diagonal = direction === 'diagonal-nw-se' || direction === 'diagonal-ne-sw';
  const breadth = diagonal ? Math.min(width, height) : direction === 'north-south' ? width : height;
  const variation = complexity / 100;
  const hash = hashString(seed);
  const amplitude = Math.min(breadth, length * 1.6) * (0.02 + variation * 0.064);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const localX = x - startX;
      const localY = y - startY;
      const progress = Math.max(0, Math.min(1, (localX * unitX + localY * unitY) / length));
      // Taper diagonal bends at their endpoints so they keep the selected corners.
      const envelope = diagonal ? Math.sin(Math.PI * progress) : 1;
      const bend = Math.sin(progress * (3 + variation * 3.6) + hash % 4) * amplitude * envelope;
      const distance = Math.abs(localX * normalX + localY * normalY - bend);
      const noise = fbm(x * 0.12, y * 0.12, hash);
      const index = y * width + x;
      if (distance < 2 + noise * 0.4) map.terrain[index] = 'sand';
      if (distance < 1.35 + noise * 0.3) map.terrain[index] = 'water';
    }
  }
}
