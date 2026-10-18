import { ASSET_SIZES } from '../types';
import type { AssetId, BattleMap, MapLayer, Terrain } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject, Rect } from '../scenario-painter';

type TempleLevel = 'ground' | 'upper' | 'basement';
interface Point { x: number; y: number }
interface Annex extends Rect { use: 'study' | 'vestry' | 'store' | 'clergy' }

/** Architecture and ritual are independent of the map's Vanilla/Dark/Anime art. */
function generateTempleFloor(map: BattleMap, rng: Random, place: PlaceObject, level: TempleLevel = 'ground'): void {
  const p = painter(map, place), { w, h } = p, c = map.config;
  const style = c.templeStyle;
  if (c.templeSecretRooms && (w < 14 || h < 12)) {
    throw new Error('Las cámaras secretas del templo necesitan al menos 14 × 12 casillas. Amplía el mapa o desactívalas.');
  }
  map.terrain.fill('wall');
  map.objects.length = 0;
  delete map.rooms;
  const reserved = new Uint8Array(w * h), occupied = new Uint8Array(w * h);
  const secretBand = c.templeSecretRooms ? 5 : 0;
  const left = 1 + secretBand, right = w - 1, span = right - left;
  const cx = Math.floor((left + right) / 2);
  const landingY = h - 2;
  const annexes: Annex[] = [], secretRooms: Rect[] = [];
  let hall: Rect = { x: left, y: 1, w: span, h: h - 3 };
  let sanctuary: Rect | undefined, courtyard: Rect | undefined, vestibule: Rect | undefined;
  const reserve = (r: Rect) => {
    for (let y = Math.max(0, Math.floor(r.y)); y < Math.min(h, Math.ceil(r.y + r.h)); y++) {
      for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(w, Math.ceil(r.x + r.w)); x++) reserved[y * w + x] = 1;
    }
  };
  const room = (r: Rect, terrain: Terrain = 'floor') => p.rect(r, terrain);
  // Every architectural connection is intentional: no flood-fill repair through secrets.
  const route = (x: number, y: number, tx: number, ty: number) => {
    x = Math.floor(x); y = Math.floor(y); tx = Math.floor(tx); ty = Math.floor(ty);
    while (true) {
      p.set(x, y, 'floor'); reserve({ x, y, w: 1, h: 1 });
      if (x === tx && y === ty) break;
      if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
    }
  };
  const door = (x: number, y: number, vertical = false, secret = false) => {
    p.set(x, y, 'floor'); reserve({ x: x - (vertical ? 1 : 0), y: y - (vertical ? 0 : 1), w: vertical ? 3 : 1, h: vertical ? 1 : 3 });
    p.object(secret ? 'secret-entrance' : 'door', x + .5, y + .5, 1 / ASSET_SIZES[secret ? 'secret-entrance' : 'door'], vertical ? Math.PI / 2 : 0);
  };
  const annex = (r: Rect, use: Annex['use'], tx: number, ty: number) => {
    room(r); annexes.push({ ...r, use });
    const x = Math.floor(r.x + r.w / 2), y = Math.floor(r.y + r.h / 2);
    route(x, y, tx, ty);
    // Door on the edge facing the hall, not across the middle of the room.
    if (tx >= r.x + r.w) door(r.x + r.w, y, true);
    else if (tx < r.x) door(r.x - 1, y, true);
    else door(x, ty >= r.y + r.h ? r.y + r.h : r.y - 1);
  };

  if (level === 'basement') {
    // Underground plan: a central ceremonial chamber, service corridor and stores.
    const corridorY = Math.max(4, h - 5);
    hall = { x: left, y: 1, w: span, h: corridorY - 2 };
    room(hall);
    room({ x: left, y: corridorY, w: span, h: 3 });
    route(cx, corridorY, cx, hall.y + hall.h - 1);
    door(cx, corridorY - 1);
    if (!c.templeMainHallOnly && span >= 14 && hall.h >= 7) {
      const wing = Math.max(3, Math.floor(span * .23));
      for (const x of [left + wing, right - wing - 1]) {
        for (let y = 1; y < corridorY - 1; y++) p.set(x, y, 'wall');
        door(x, Math.floor(hall.h / 2), true);
      }
      annexes.push({ x: left, y: 1, w: wing, h: hall.h, use: 'store' });
      annexes.push({ x: right - wing, y: 1, w: wing, h: hall.h, use: 'vestry' });
      hall = { x: left + wing + 1, y: 1, w: span - wing * 2 - 2, h: hall.h };
    }
  } else if (style === 'roman') {
    // Longitudinal basilica with a stepped apse, broad nave and optional side chapels.
    const apseDepth = h >= 14 ? 4 : h >= 10 ? 2 : 1;
    const wing = !c.templeMainHallOnly && span >= 22 && h >= 16 ? Math.max(4, Math.floor(span * .18)) : 0;
    hall = { x: left + (wing ? wing + 1 : 0), y: apseDepth + 2, w: span - (wing ? 2 * (wing + 1) : 0), h: h - apseDepth - 4 };
    room(hall);
    const apseWidth = Math.max(3, Math.floor(hall.w * .48));
    sanctuary = { x: cx - Math.floor(apseWidth / 2), y: 1, w: apseWidth, h: apseDepth + 1 };
    room(sanctuary);
    room({ x: sanctuary.x - (hall.w > 8 ? 1 : 0), y: apseDepth, w: sanctuary.w + (hall.w > 8 ? 2 : 0), h: 3 });
    if (wing) {
      for (const x of [left, right - wing]) {
        const height = Math.max(3, Math.floor((h - 9) / 2));
        annex({ x, y: 4, w: wing, h: height }, x === left ? 'vestry' : 'clergy', cx, 5 + Math.floor(height / 2));
        if (h >= 23) annex({ x, y: h - height - 3, w: wing, h: height }, 'study', cx, h - Math.floor(height / 2) - 3);
      }
    }
  } else if (style === 'mosque') {
    // A broad qibla-facing prayer hall, followed by a separate open sahn and portico.
    const hasCourt = !c.templeMainHallOnly && h >= 18 && span >= 10;
    const hallEnd = hasCourt ? Math.max(7, Math.floor(h * .49)) : h - 3;
    hall = { x: left, y: 2, w: span, h: hallEnd - 2 };
    room(hall);
    sanctuary = { x: cx, y: 1, w: 1, h: 1 }; room(sanctuary);
    if (hasCourt) {
      courtyard = { x: left + 2, y: hallEnd + 3, w: span - 4, h: h - hallEnd - 6 };
      room({ x: left, y: hallEnd + 2, w: span, h: h - hallEnd - 4 });
      room(courtyard, 'sand');
      route(cx, hallEnd - 1, cx, hallEnd + 2); door(cx, hallEnd);
      // The passage and perimeter portico remain unobstructed around the basin.
      reserve({ x: left, y: hallEnd + 2, w: 1, h: h - hallEnd - 3 });
      reserve({ x: right - 1, y: hallEnd + 2, w: 1, h: h - hallEnd - 3 });
    }
  } else if (style === 'synagogue') {
    // Central bimah circulation, ark on the east-facing (top in this plan) wall,
    // study rooms to one side and a transverse entrance vestibule.
    const studyWidth = !c.templeMainHallOnly && span >= 17 && h >= 14 ? Math.max(4, Math.floor(span * .25)) : 0;
    const vestibuleDepth = !c.templeMainHallOnly && h >= 15 ? 4 : 0;
    hall = { x: left + (studyWidth ? studyWidth + 1 : 0), y: 1, w: span - (studyWidth ? studyWidth + 1 : 0), h: h - 3 - vestibuleDepth };
    room(hall);
    if (studyWidth) {
      const studyHeight = Math.max(3, Math.floor((hall.h - 1) / 2));
      annex({ x: left, y: 1, w: studyWidth, h: studyHeight }, 'study', hall.x + 1, Math.floor(studyHeight / 2) + 1);
      annex({ x: left, y: studyHeight + 2, w: studyWidth, h: hall.h - studyHeight - 1 }, 'study', hall.x + 1, studyHeight + 3);
    }
    if (vestibuleDepth) {
      vestibule = { x: left, y: h - 5, w: span, h: 3 };
      room(vestibule);
      door(Math.floor(hall.x + hall.w / 2), h - 6);
    }
  } else if (style === 'mandir') {
    // Garbhagriha -> narrow antarala -> pillared mandapa; the shrine is a room,
    // not an altar dropped in the same basilica rectangle.
    const sanctumDepth = h >= 14 ? Math.max(3, Math.floor(h * .22)) : h >= 10 ? 2 : 1;
    const connectorDepth = h >= 10 ? 2 : 1;
    const sanctumWidth = Math.max(3, Math.floor(span * .45));
    sanctuary = { x: cx - Math.floor(sanctumWidth / 2), y: 1, w: sanctumWidth, h: sanctumDepth };
    room(sanctuary);
    hall = { x: left, y: sanctumDepth + connectorDepth + 1, w: span, h: h - sanctumDepth - connectorDepth - 3 };
    room(hall);
    room({ x: cx - 1, y: sanctumDepth + 1, w: 3, h: connectorDepth });
    reserve({ x: cx - 1, y: sanctumDepth, w: 3, h: connectorDepth + 2 });
    if (!c.templeMainHallOnly && span >= 17 && sanctumDepth >= 3) {
      const wing = Math.floor((span - sanctumWidth) / 2) - 1;
      annex({ x: left, y: 1, w: wing, h: sanctumDepth }, 'vestry', cx, sanctumDepth);
      annex({ x: right - wing, y: 1, w: wing, h: sanctumDepth }, 'store', cx, sanctumDepth);
    }
  } else {
    // Pagoda: chamfered square hall and an enclosed central shrine; circulation
    // runs all around the core rather than along one nave axis.
    const side = Math.min(span, h - 3), x = cx - Math.floor(side / 2), y = Math.max(1, Math.floor((h - side) / 2) - 1);
    hall = { x, y, w: side, h: side }; room(hall);
    if (side >= 9) {
      for (const xx of [x, x + side - 1]) for (const yy of [y, y + side - 1]) p.set(xx, yy, 'wall');
    }
    const core = Math.max(2, Math.floor(side * .3));
    sanctuary = { x: cx - Math.floor(core / 2), y: y + Math.floor((side - core) / 2), w: core, h: core };
    if (side >= 10 && level === 'ground') {
      p.border({ x: sanctuary.x - 1, y: sanctuary.y - 1, w: core + 2, h: core + 2 });
      door(cx, sanctuary.y + core);
    }
    room(sanctuary);
    if (!c.templeMainHallOnly && span - side >= 10) {
      const wing = Math.floor((span - side) / 2) - 1;
      annex({ x: left, y: y + 1, w: wing, h: Math.max(3, side - 2) }, 'clergy', x, y + Math.floor(side / 2));
      annex({ x: right - wing, y: y + 1, w: wing, h: Math.max(3, side - 2) }, 'study', x + side - 1, y + Math.floor(side / 2));
    } else if (!c.templeMainHallOnly && h - (y + side) >= 7 && side >= 8) {
      const wing = Math.floor((side - 3) / 2);
      annex({ x, y: y + side + 1, w: wing, h: h - y - side - 4 }, 'clergy', cx, y + side + 2);
      annex({ x: x + side - wing, y: y + side + 1, w: wing, h: h - y - side - 4 }, 'study', cx, y + side + 2);
    }
  }

  if (level === 'ground' && !c.templeMainHallOnly && !annexes.length && !courtyard && !vestibule) {
    throw new Error(`No caben espacios anexos de este estilo en el plano orientado de ${w} × ${h} casillas. Amplía el mapa o activa «Solo gran salón».`);
  }

  const hallCX = Math.floor(hall.x + hall.w / 2), hallCY = Math.floor(hall.y + hall.h / 2);
  // A wide entrance landing also provides a shared, aligned stair location.
  const transition = { x: left + .5, y: landingY + .5 };
  const entrance = { x: hallCX, y: h - 1 };
  room({ x: left, y: h - 3, w: span, h: 2 });
  route(hallCX, landingY, hallCX, hall.y + hall.h - 1);
  route(left, landingY, hallCX, landingY);
  reserve({ x: left, y: h - 3, w: 2, h: 2 });
  if (level === 'ground') { door(entrance.x, entrance.y); map.spawn = { x: entrance.x, y: landingY }; }
  else map.spawn = { x: Math.floor(transition.x), y: Math.floor(transition.y) };

  if (style === 'pagoda' && level !== 'basement' && sanctuary && hall.w >= 10) {
    // Two side routes join the rear of the core without cutting its enclosure.
    const ringY = sanctuary.y - 2;
    for (const x of [sanctuary.x - 2, sanctuary.x + sanctuary.w + 1]) {
      route(hallCX, hall.y + hall.h - 1, x, hall.y + hall.h - 1);
      route(x, hall.y + hall.h - 1, x, ringY);
    }
    route(sanctuary.x - 2, ringY, sanctuary.x + sanctuary.w + 1, ringY);
  } else {
    reserve({ x: hallCX, y: hall.y + 1, w: 1, h: Math.max(1, hall.h - 1) });
    reserve({ x: hall.x, y: hallCY, w: hall.w, h: 1 });
  }

  if (c.templeSecretRooms) {
    const secret = { x: 1, y: Math.max(2, Math.min(h - 6, hallCY - 1)), w: 3, h: 3 };
    room(secret); secretRooms.push(secret);
    const sy = secret.y + 1;
    route(secret.x + secret.w - 1, sy, hall.x, sy);
    door(4, sy, true, true);
    // Keep the connecting passage hidden at its actual entrance into the hall.
    if (hall.x > 6) door(hall.x - 1, sy, true, true);
  }

  if (level === 'upper') {
    // The central void is real non-walkable terrain, not a copy of the ground hall.
    // Keep at least a one-cell continuous gallery even on minimum-size maps.
    if (hall.w < 3 || hall.h < 3) {
      throw new Error('El piso superior necesita un gran salón de al menos 3 × 3 casillas para rodear el vacío central. Amplía el mapa o desactiva el piso superior.');
    }
    const inset = hall.w >= 10 && hall.h >= 8 ? 2 : 1;
    const hole = { x: hall.x + inset, y: hall.y + inset, w: hall.w - inset * 2, h: hall.h - inset * 2 };
    room(hall); // upper gallery has no ground-floor pagoda shrine enclosure
    room(hole, 'void');
    if (courtyard) room(courtyard, 'void');
    // Reserve a complete ring; furniture must never cut the sole route upstairs.
    reserve({ x: hall.x, y: hall.y, w: hall.w, h: 1 });
    reserve({ x: hall.x, y: hall.y + hall.h - 1, w: hall.w, h: 1 });
    reserve({ x: hall.x, y: hall.y, w: 1, h: hall.h });
    reserve({ x: hall.x + hall.w - 1, y: hall.y, w: 1, h: hall.h });
  }

  /** Decorative furniture may be omitted when it does not fit. Required ritual
   * objects use requireRitual below. Footprints and sizes are measured in cells. */
  const furnishing = (asset: AssetId, x: number, y: number, size: number, rotation = 0, densityControlled = false, slim = false, ritual = false): boolean => {
    if (densityControlled && rng.next() * 100 >= c.density) return false;
    const horizontal = Math.abs(Math.cos(rotation)) >= .5;
    const sx = slim && !horizontal ? size * .3 : size;
    const sy = slim && horizontal ? size * .3 : size;
    const x0 = Math.floor(x - sx / 2 + .06), x1 = Math.ceil(x + sx / 2 - .06);
    const y0 = Math.floor(y - sy / 2 + .06), y1 = Math.ceil(y + sy / 2 - .06);
    if (x0 < 1 || y0 < 1 || x1 > w - 1 || y1 > h - 1) return false;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = yy * w + xx, t = map.terrain[i];
      if ((t !== 'floor' && t !== 'wood' && t !== 'sand') || occupied[i] || (!ritual && reserved[i])) return false;
    }
    p.object(asset, x, y, size / ASSET_SIZES[asset], rotation);
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) occupied[yy * w + xx] = 1;
    return true;
  };
  const requireRitual = (asset: AssetId, x: number, y: number, size: number, allowReserved = true) => {
    if (!furnishing(asset, x, y, size, 0, false, false, allowReserved)) {
      throw new Error(`No cabe el elemento ritual «${asset}» del templo en ${w} × ${h} casillas. Amplía el mapa o cambia su distribución.`);
    }
  };
  const center = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const shrine = (asset: AssetId, r: Rect, size = 2) => {
    const at = center(r); requireRitual(asset, at.x, at.y, Math.min(size, r.w - .2, r.h - .2));
  };
  const columns = (r: Rect, spacing: number) => {
    if (r.w < 7 || r.h < 5) return;
    for (let y = r.y + 1.5; y < r.y + r.h - 1; y += spacing) {
      for (const x of [r.x + 1.5, r.x + r.w - 1.5]) furnishing('pillar', x, y, .8);
    }
  };

  if (level === 'ground') {
    if (style === 'roman') {
      shrine('altar-roman', sanctuary ?? hall);
      columns(hall, 4);
      for (let y = hall.y + 2.5; y < hall.y + hall.h - 2; y += 2) {
        for (let x = hall.x + 3; x < hall.x + hall.w - 2; x += 3) {
          if (Math.abs(x - hallCX - .5) >= 2) furnishing('temple-bench', x, y, 2, 0, true, true);
        }
      }
      if (c.landmarks && sanctuary && sanctuary.w >= 6) for (const x of [sanctuary.x + 1, sanctuary.x + sanctuary.w - 1]) furnishing('statue-complete', x, sanctuary.y + 1, 1.2);
    } else if (style === 'mosque') {
      // Aniconic prayer hall: no statues, pagan altar or Christian pew layout.
      requireRitual('mihrab', hallCX + .5, hall.y + .6, Math.min(1.2, hall.w / 4));
      // Grid-aligned footprint stays before the cross aisle. Compact prayer halls
      // use a one-cell pulpit; the minbar is never silently omitted.
      if (hall.w >= 10 && hall.h >= 5) requireRitual('minbar', hallCX + 3, hall.y + 1, 2, false);
      else requireRitual('minbar', hall.x + hall.w - .5, hall.y + .5, 1, false);
      for (let y = hall.y + 2.5; y < hall.y + hall.h - 1; y += 2) {
        for (let x = hall.x + 1.5; x < hall.x + hall.w - 1; x += 2) furnishing('prayer-rug', x, y, .9, 0, true);
      }
      if (courtyard && courtyard.w >= 5 && courtyard.h >= 3) {
        requireRitual('ablution-fountain', courtyard.x + 1.5, courtyard.y + courtyard.h / 2, 1.8);
      }
      columns(hall, 5);
    } else if (style === 'synagogue') {
      const compactArk = hall.h < 7;
      requireRitual('torah-ark', hallCX + .5, hall.y + (compactArk ? .5 : 1), compactArk ? .9 : Math.min(1.6, hall.w / 3));
      requireRitual('bimah', hallCX + .5, hallCY + .5, Math.min(2, hall.w / 3, hall.h / 3));
      reserve({ x: hallCX - 1, y: hallCY - 1, w: 3, h: 3 });
      for (let y = hall.y + 3.5; y < hall.y + hall.h - 1; y += 3) {
        for (const x of [hall.x + 1.5, hall.x + hall.w - 1.5]) furnishing('temple-bench', x, y, Math.min(2, hall.w / 3), Math.PI / 2, true, true);
      }
    } else if (style === 'mandir') {
      shrine('mandir-shrine', sanctuary ?? hall);
      if (c.landmarks) {
        for (const x of [hallCX - 1.5, hallCX + 2.5]) requireRitual('ritual-brazier', x, hall.y + 1, .7);
        requireRitual('temple-bell', hallCX + .5, hall.y + hall.h - 1, .65);
      }
      columns(hall, 3);
    } else {
      shrine('pagoda-shrine', sanctuary ?? hall);
      if (hall.w >= 10) {
        for (const x of [hall.x + 1.5, hall.x + hall.w - 1.5]) for (const y of [hall.y + 1.5, hall.y + hall.h - 1.5]) furnishing('pillar', x, y, .8);
      }
      if (c.landmarks) requireRitual('temple-bell', hall.x + hall.w - 1.5, hall.y + hall.h / 2, .8);
    }
  } else if (level === 'basement') {
    columns(hall, 4);
    // No invented crypts or imagery imposed on every religion.
    if (c.landmarks) furnishing('chest', hallCX + .5, hall.y + 1, .9, 0, false, false, true);
    for (let x = hall.x + 1.5; x < hall.x + hall.w - 1; x += 3) furnishing('sacks', x, hall.y + hall.h - 1, .8, 0, true);
  }

  for (const r of annexes) {
    if (r.use === 'study') {
      furnishing('bookshelf', r.x + r.w / 2, r.y + .5, Math.min(1.8, r.w - .4), 0, false, true);
      furnishing('table', r.x + r.w / 2, r.y + r.h - 1, 1, 0, true);
    } else if (r.use === 'clergy') {
      furnishing('bed', r.x + 1, r.y + 1, 1.5, 0, true);
      furnishing('chest', r.x + r.w - 1, r.y + r.h - 1, .8, 0, true);
    } else {
      for (let y = r.y + 1; y < r.y + r.h; y += 3) furnishing(r.use === 'store' ? 'crates' : 'chest', r.x + 1, y, .9, 0, true);
    }
  }
  for (const r of secretRooms) furnishing('chest', r.x + 1, r.y + 1, .8, 0, false, false, true);

  // Windows are decoration on exterior-facing walls only; never alter sunlight.
  if (level !== 'basement') {
    for (let y = 3; y < h - 3; y += 5) {
      for (const [x, dx] of [[hall.x - 1, 1], [hall.x + hall.w, -1]]) {
        if (p.at(x, y) !== 'wall' || p.at(x + dx, y) !== 'floor') continue;
        // Only a solid stretch of wall, not an intersection or doorway.
        if (p.at(x, y - 1) !== 'wall' || p.at(x, y + 1) !== 'wall') continue;
        if (annexes.some(r => y >= r.y - 1 && y <= r.y + r.h && (x <= hall.x ? r.x < hall.x : r.x > hall.x))) continue;
        if (secretRooms.some(r => y >= r.y - 1 && y <= r.y + r.h && x < hall.x)) continue;
        p.object('window', x + .5, y + .5, .9 / ASSET_SIZES.window, Math.PI / 2);
      }
    }
  }
  if (c.landmarks) {
    for (const x of [hall.x + .5, hall.x + hall.w - .5]) furnishing('torch', x, hall.y + 1.5, .55);
  }
  if (level !== 'ground' || c.templeTransition !== 'none') {
    const stairs: AssetId = level === 'basement' || (level === 'ground' && c.templeTransition === 'upper') ? 'stairs-up' : 'stairs-down';
    // Kept to one cell on minimum plans; never removes the entrance passage.
    p.object(stairs, transition.x, transition.y, 1 / ASSET_SIZES[stairs]);
  }
}

/** Root is always ground; only genuinely distinct extra floors go into layers. */
export function generateTemple(map: BattleMap, rng: Random, place: PlaceObject): void {
  generateTempleFloor(map, rng, place);
  delete map.layers;
  map.activeLayer = 0;
  const level = map.config.templeTransition;
  if (level === 'none') return;
  const extra: BattleMap = { ...map, terrain: Array(map.config.width * map.config.height).fill('wall'), objects: [], spawn: { ...map.spawn } };
  const extraPlace: PlaceObject = (asset, x, y, scale = 1, rotation = 0) => {
    extra.objects.push({ id: `temple-${level}-${extra.objects.length}`, asset, x, y, scale: ASSET_SIZES[asset] * scale, rotation });
  };
  generateTempleFloor(extra, rng, extraPlace, level);
  const layer: MapLayer = {
    id: `temple-${level}`, name: level === 'upper' ? 'Galería superior' : 'Sótano ceremonial', elevation: level === 'upper' ? 1 : -1,
    terrain: extra.terrain, objects: extra.objects, spawn: extra.spawn,
  };
  map.layers = [layer];
}
