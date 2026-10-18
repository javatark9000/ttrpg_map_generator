import type { BattleMap } from '../types';
import type { Random } from '../random';
import type { PlaceObject } from '../scenario-painter';
import { generateDungeonRooms } from './dungeon-rooms';

interface Room { x: number; y: number; w: number; h: number }

export function generateDungeon(map: BattleMap, rng: Random, object: PlaceObject): void {
  const { config } = map;
  const { width: w, height: h } = config;
  const at = (x: number, y: number) => map.terrain[y * w + x];
  const set = (x: number, y: number) => { if (x > 0 && x < w - 1 && y > 0 && y < h - 1) map.terrain[y * w + x] = 'floor'; };
  const carve = (x1: number, y1: number, x2: number, y2: number, radius = 0) => {
    let x = x1, y = y1;
    while (true) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) set(x + dx, y + dy);
      if (x === x2 && y === y2) break;
      if (x !== x2) x += Math.sign(x2 - x); else y += Math.sign(y2 - y);
    }
  };

  const rooms = generateDungeonRooms(config, rng);
  map.rooms = rooms;
  for (const room of rooms) for (let yy = room.y; yy < room.y + room.h; yy++) for (let xx = room.x; xx < room.x + room.w; xx++) map.terrain[yy * w + xx] = 'floor';
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
  if (!config.landmarks) return;

  object('stairs', map.spawn.x + 0.5, map.spawn.y + 0.5, 0.85);
  rooms.forEach((r, i) => {
    const c = center(r);
    if (i > 0 && r.w >= 6 && r.h >= 6) {
      if (i % 3 === 0) {
        object('rug', c.x + 0.5, c.y + 0.5, Math.min(r.w, r.h) / 6);
        object('table', c.x + 0.5, c.y + 0.5);
        object('books', c.x + 0.7, c.y + 0.3, 0.6);
      } else if (i % 3 === 1) {
        object('pillar', r.x + 1.5, r.y + 1.5);
        object('pillar', r.x + r.w - 1.5, r.y + 1.5);
        object('pillar', r.x + 1.5, r.y + r.h - 1.5);
        object('pillar', r.x + r.w - 1.5, r.y + r.h - 1.5);
      } else {
        object('altar', c.x + 0.5, r.y + 2, 1.1);
        object('rug', c.x + 0.5, c.y + 1.5, 0.9);
      }
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
        const key = `${x},${outside}`;
        if (!doors.has(key)) { object('door', x + .5, outside + .5, 1.0); doors.add(key); }
      }
    }
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (const x of [r.x, r.x + r.w - 1]) {
      const outside = x === r.x ? x - 1 : x + 1;
      if (outside >= 0 && outside < w && at(outside, y) === 'floor' && at(outside, y - 1) === 'wall' && at(outside, y + 1) === 'wall') {
        const key = `${outside},${y}`;
        if (!doors.has(key)) { object('door', outside + .5, y + .5, 1.0, Math.PI / 2); doors.add(key); }
      }
    }
  }
}
