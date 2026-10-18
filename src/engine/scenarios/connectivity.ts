import type { BattleMap, Terrain } from '../types';

export function walkable(t: Terrain): boolean {
  return t !== 'wall' && t !== 'rock' && t !== 'water';
}

export function getRegions(map: BattleMap): number[][] {
  const { width: w, height: h } = map.config;
  const visited = new Uint8Array(w * h), regions: number[][] = [];
  for (let i = 0; i < map.terrain.length; i++) {
    if (visited[i] || !walkable(map.terrain[i])) continue;
    const region = [i];
    visited[i] = 1;
    for (let j = 0; j < region.length; j++) {
      const p = region[j], x = p % w, y = Math.floor(p / w);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const n = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && !visited[n] && walkable(map.terrain[n])) {
          visited[n] = 1;
          region.push(n);
        }
      }
    }
    regions.push(region);
  }
  return regions.sort((a, b) => b.length - a.length);
}

export function connectRegions(map: BattleMap, connectionTerrain: Terrain = 'floor'): void {
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
