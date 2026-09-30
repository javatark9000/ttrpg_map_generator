import type { DungeonRoom, MapConfig } from './types';
import { Random } from './random';
import { MIN_ROOM_PARTITION, scenarioOptionsError } from './scenario-options';

export function generateDungeonRooms(config: MapConfig, rng: Random): DungeonRoom[] {
  const error = scenarioOptionsError(config);
  if (error) throw new Error(error);
  const rooms: DungeonRoom[] = [];
  const minSize = config.complexity > 65 ? 8 : config.complexity > 30 ? 10 : 13;
  const capacity = (w: number, h: number) => Math.floor(w / MIN_ROOM_PARTITION) * Math.floor(h / MIN_ROOM_PARTITION);
  const room = (x: number, y: number, w: number, h: number, exact: boolean) => {
    if (!exact) { rooms.push({ x: x + rng.int(1, 2), y: y + rng.int(1, 2), w: Math.max(4, w - rng.int(3, 4)), h: Math.max(4, h - rng.int(3, 4)) }); return; }
    // At least four playable cells and one wall cell on every side of each leaf.
    const inset = (length: number) => rng.int(1, Math.min(3, Math.max(1, Math.floor((length - 4) / 2))));
    const left = inset(w), top = inset(h);
    const rw = Math.max(4, w - left - inset(w)), rh = Math.max(4, h - top - inset(h));
    rooms.push({ x: x + left, y: y + top, w: rw, h: rh });
  };
  const split = (x: number, y: number, w: number, h: number, depth: number, quota: number) => {
    if (quota === 1) { room(x,y,w,h,true); return; }
    let vertical = w / h > 1.25 ? true : h / w > 1.25 ? false : rng.next() > .5;
    if (quota === 0) {
      if ((vertical ? w : h) < minSize * 2 && (vertical ? h : w) >= minSize * 2) vertical = !vertical;
      const length = vertical ? w : h;
      if (length < minSize * 2 || depth >= 7) { room(x,y,w,h,false); return; }
      const cut = rng.int(minSize, length - minSize);
      if (vertical) { split(x,y,cut,h,depth+1,0); split(x+cut,y,w-cut,h,depth+1,0); }
      else { split(x,y,w,cut,depth+1,0); split(x,y+cut,w,h-cut,depth+1,0); }
      return;
    }
    // Only choose cuts whose children can still accommodate the exact remaining quota.
    // This prevents silently returning fewer rooms for unlucky seeds or narrow maps.
    const choices: { vertical: boolean; cut: number; left: number; right: number }[] = [];
    for (const axis of [vertical, !vertical]) {
      const length = axis ? w : h;
      for (let cut = MIN_ROOM_PARTITION; cut <= length - MIN_ROOM_PARTITION; cut++) {
        const a = axis ? capacity(cut,h) : capacity(w,cut), b = axis ? capacity(w-cut,h) : capacity(w,h-cut);
        if (a > 0 && b > 0 && a + b >= quota) choices.push({ vertical: axis, cut, left: a, right: b });
      }
      if (choices.length) break;
    }
    if (!choices.length) throw new Error('No hay espacio suficiente para la cantidad de cuartos solicitada.');
    // Complexity changes room proportions without changing the requested count.
    choices.sort((a,b) => Math.abs(a.left-a.right) - Math.abs(b.left-b.right));
    const choice = choices[rng.int(0, Math.max(0, Math.ceil(choices.length * (.25 + config.complexity / 150)) - 1))];
    const low = Math.max(1, quota - choice.right), high = Math.min(quota - 1, choice.left);
    const count = Math.max(low, Math.min(high, Math.round(quota * choice.left / (choice.left + choice.right))));
    const cut = choice.cut;
    if (choice.vertical) { split(x,y,cut,h,depth+1,count); split(x+cut,y,w-cut,h,depth+1,quota-count); }
    else { split(x,y,w,cut,depth+1,count); split(x,y+cut,w,h-cut,depth+1,quota-count); }
  };
  split(0,0,config.width,config.height,0,config.roomCount);
  return rooms;
}
