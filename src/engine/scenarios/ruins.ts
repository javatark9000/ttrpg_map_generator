import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap } from '../types';
import { fbm, hashString, Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';
import { connectRegions } from './connectivity';
import { contains, planRuins } from './ruins/layout';
import { ruinWater } from './ruins/water';

interface Entrance { x: number; y: number; dx: number; dy: number; rotation: number }

function entrance(r: Rect, plazas: Rect[], rng: Random): Entrance {
  let side = rng.int(0, 3);
  if (plazas.length) {
    const center = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const distance = (r: Rect) => Math.hypot(r.x + r.w / 2 - center.x, r.y + r.h / 2 - center.y);
    const target = plazas.reduce((nearest, r) => distance(r) < distance(nearest) ? r : nearest);
    const dx = target.x + target.w / 2 - center.x, dy = target.y + target.h / 2 - center.y;
    if (Math.abs(dx) > Math.abs(dy)) side = dx > 0 ? 1 : 3;
    else if (dy !== 0) side = dy > 0 ? 0 : 2;
  }
  const mx = r.x + Math.floor(r.w / 2), my = r.y + Math.floor(r.h / 2);
  return [
    { x: mx, y: r.y + r.h - 1, dx: 0, dy: 1, rotation: 0 },
    { x: r.x + r.w - 1, y: my, dx: 1, dy: 0, rotation: -Math.PI / 2 },
    { x: mx, y: r.y, dx: 0, dy: -1, rotation: Math.PI },
    { x: r.x, y: my, dx: -1, dy: 0, rotation: Math.PI / 2 },
  ][side];
}

export function generateRuins(map: BattleMap, rng: Random, place: PlaceObject): void {
  const p = painter(map, place), { w, h } = p, c = map.config, seed = hashString(c.seed);
  // Independent streams: density, water and decorative toggles do not move the buildings.
  const root = `${c.seed}:ruins:${c.theme}:${rng.next()}`;
  const layout = c.ruinLayout === 'random' ? new Random(`${root}:choice`).pick(['grid', 'courtyard', 'scattered'] as const) : c.ruinLayout;
  const { sites, plazas } = planRuins(w, h, c.complexity, layout, c.ruinFeatures, new Random(`${root}:plan`));
  const structureRng = new Random(`${root}:structure`), featureRng = new Random(`${root}:features`), decorRng = new Random(`${root}:decor`);
  const reserved = new Uint8Array(w * h);
  const reserve = (r: Rect) => {
    for (let y = Math.max(0, r.y); y < Math.min(h, r.y + r.h); y++) for (let x = Math.max(0, r.x); x < Math.min(w, r.x + r.w); x++) reserved[y * w + x] = 1;
  };
  map.terrain.fill('grass');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fbm(x * .15, y * .15, seed) > .58) p.set(x, y, 'gravel');
  for (const plaza of plazas) reserve(plaza);
  const entries: Entrance[] = [];
  for (const r of sites) {
    reserve(r);
    p.rect(r, 'floor'); p.border(r);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const wear = fbm(x * .48, y * .48, seed + 31);
      if (p.at(x, y) === 'wall' && wear < .18 + c.ruinDecay * .006) p.set(x, y, wear < .4 ? 'gravel' : 'grass');
      else if (p.at(x, y) === 'floor' && fbm(x * .4, y * .4, seed + 71) > .7 - c.ruinDecay * .0024) p.set(x, y, 'grass');
    }
    const door = entrance(r, plazas, structureRng);
    entries.push(door);
    // Keep the actual threshold and its approach clear, even at maximum decay.
    for (let d = -1; d <= 1; d++) {
      p.set(door.x + door.dx * d, door.y + door.dy * d, d > 0 ? 'gravel' : 'floor');
      reserve({ x: door.x + door.dx * d, y: door.y + door.dy * d, w: 1, h: 1 });
    }
  }
  // Courtyards are open paving, never extra enclosed rooms or simulated upper floors.
  for (const plaza of plazas) {
    p.rect(plaza, 'floor');
    for (let y = plaza.y; y < plaza.y + plaza.h; y++) for (let x = plaza.x; x < plaza.x + plaza.w; x++) {
      if (fbm(x * .4, y * .4, seed + 71) > .8 - c.ruinDecay * .0018) p.set(x, y, 'gravel');
    }
  }
  map.spawn = { x: entries[0].x, y: entries[0].y };
  if (c.water) ruinWater(map, reserved, new Random(`${root}:water`));
  // Repair navigation before choosing wall-mounted ornaments, so they cannot end up
  // attached to a wall that the connectivity pass subsequently removes.
  connectRegions(map, 'gravel');

  const occupied: { x: number; y: number; radius: number }[] = [];
  const nearEntry = (x: number, y: number, radius: number) => entries.some(e => Math.hypot(x - e.x - .5, y - e.y - .5) < radius + .8);
  const add = (asset: AssetId, x: number, y: number, scale = 1, rotation = 0, structural = false): boolean => {
    const radius = ASSET_SIZES[asset] * scale * .43;
    if (x - radius < .15 || y - radius < .15 || x + radius > w - .15 || y + radius > h - .15) return false;
    if (!structural) {
      if (nearEntry(x, y, radius) || occupied.some(o => Math.hypot(o.x - x, o.y - y) < o.radius + radius + .12)) return false;
      for (let yy = Math.floor(y - radius); yy <= Math.floor(y + radius); yy++) for (let xx = Math.floor(x - radius); xx <= Math.floor(x + radius); xx++) if (!p.open(xx, yy)) return false;
    }
    p.object(asset, x, y, scale, rotation);
    occupied.push({ x, y, radius });
    return true;
  };
  for (let i = 0; i < sites.length; i++) {
    const e = entries[i];
    if (Math.min(sites[i].w, sites[i].h) >= 6) add('archway', e.x + .5, e.y + .5, .72, e.rotation, true);
  }

  if (c.ruinSecretPassages) {
    const candidates: { x: number; y: number; rotation: number }[] = [];
    for (const r of sites) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      if (p.at(x, y) !== 'wall' || nearEntry(x + .5, y + .5, .8)) continue;
      // Opposite sides must both lead onto useful ground. No tunnel is carved,
      // no doors are paired, and these wall cells remain non-walkable.
      if ((y === r.y || y === r.y + r.h - 1) && x > r.x && x < r.x + r.w - 1 && p.open(x, y - 1) && p.open(x, y + 1)) candidates.push({ x, y, rotation: y === r.y ? Math.PI : 0 });
      else if ((x === r.x || x === r.x + r.w - 1) && y > r.y && y < r.y + r.h - 1 && p.open(x - 1, y) && p.open(x + 1, y)) candidates.push({ x, y, rotation: x === r.x ? Math.PI / 2 : -Math.PI / 2 });
    }
    const secretRng = new Random(`${root}:secrets`);
    let count = 0;
    while (candidates.length && count < (c.ruinFeatures === 'monumental' ? 3 : 1)) {
      const candidate = candidates.splice(secretRng.int(0, candidates.length - 1), 1)[0];
      const x = candidate.x + .5, y = candidate.y + .5;
      if (occupied.some(o => Math.hypot(o.x - x, o.y - y) < o.radius + 1.1)) continue;
      if (add('secret-entrance', x, y, .8, candidate.rotation, true)) count++;
    }
    if (count === 0) throw new Error('No quedó un muro adecuado para el acceso secreto. Reduce el deterioro, prueba otra semilla o desactiva los pasadizos secretos.');
  }

  if (c.landmarks) {
    const monumental = c.ruinFeatures === 'monumental', simple = c.ruinFeatures === 'simple';
    for (const r of sites) {
      const corners = [{ x: r.x + 1.6, y: r.y + 1.6 }, { x: r.x + r.w - 1.6, y: r.y + 1.6 }, { x: r.x + 1.6, y: r.y + r.h - 1.6 }, { x: r.x + r.w - 1.6, y: r.y + r.h - 1.6 }];
      for (const corner of corners.slice(0, simple ? 1 : monumental ? 4 : 2)) add('broken-pillar', corner.x, corner.y, .65, featureRng.next() * Math.PI * 2);
    }
    const spaces = [...plazas, ...sites];
    const targetStatues = simple ? 1 : monumental ? Math.min(8, Math.max(3, Math.floor(w * h / 180))) : 2;
    let statues = 0;
    for (let attempt = 0; attempt < targetStatues * 30 && statues < targetStatues; attempt++) {
      const r = spaces[attempt % spaces.length];
      const x = r.x + 1.5 + featureRng.next() * Math.max(0, r.w - 3), y = r.y + 1.5 + featureRng.next() * Math.max(0, r.h - 3);
      // Both variants are readable at standard/monumental, not a rotated intact statue.
      const broken = simple ? c.ruinDecay >= 50 : statues % 2 === 1;
      if (add(broken ? 'statue-broken' : 'statue-complete', x, y, monumental ? .9 : .75, featureRng.int(0, 3) * Math.PI / 2)) statues++;
    }
    if (!simple) {
      let stairs = 0;
      for (let attempt = 0; attempt < 80 && stairs < (monumental ? 2 : 1); attempt++) {
        const r = spaces[attempt % spaces.length];
        const x = r.x + 1.5 + featureRng.next() * Math.max(0, r.w - 3), y = r.y + 1.5 + featureRng.next() * Math.max(0, r.h - 3);
        if (add(stairs === 0 ? 'stairs-up' : 'stairs-down', x, y, .8, featureRng.int(0, 3) * Math.PI / 2)) {
          // A surviving column beside the stairs suggests an upper floor; neither
          // illustration adds layers, elevation, hidden routes or navigation links.
          add('broken-pillar', x + 1.2, y, .55, featureRng.next());
          stairs++;
        }
      }
    }
    if (c.theme === 'anime' && monumental && plazas.length) {
      const r = plazas[0]; add('altar', r.x + r.w / 2, r.y + r.h / 2, .7);
    }
  }

  for (const r of sites) {
    const amount = Math.round(r.w * r.h * c.density / 650);
    for (let i = 0; i < amount; i++) {
      const x = r.x + decorRng.next() * r.w, y = r.y + decorRng.next() * r.h;
      add('rubble', x, y, .4 + decorRng.next() * .35, decorRng.next() * Math.PI * 2);
    }
  }
  for (let i = 0; i < w * h * c.density / 1100; i++) {
    const x = decorRng.int(1, w - 2) + .5, y = decorRng.int(1, h - 2) + .5;
    if (p.at(x, y) !== 'grass' || plazas.some(r => contains(r, x, y))) continue;
    const asset = decorRng.pick<AssetId>(c.theme === 'dark' ? ['bush', 'tree-oak', 'bones', 'log'] : ['bush', 'tree-oak', 'flowers', 'flowers']);
    add(asset, x, y, .65 + decorRng.next() * .3, decorRng.next() * Math.PI * 2);
  }
}
