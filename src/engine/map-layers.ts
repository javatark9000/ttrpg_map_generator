import type { BattleMap, MapLayer } from './types';

/** Root data is always the ground floor; additional floors never duplicate it. */
export function activeLayerData(map: BattleMap): BattleMap | MapLayer {
  const index = map.activeLayer ?? 0;
  if (index === 0) return map;
  const layer = map.layers?.[index - 1];
  if (!layer) throw new Error('La planta seleccionada no existe.');
  return layer;
}

/** A render/export view, not a replacement for the full editable project. */
export function mapForActiveLayer(map: BattleMap): BattleMap {
  const layer = activeLayerData(map);
  if (layer === map) return map;
  return { ...map, terrain: layer.terrain, objects: layer.objects, spawn: layer.spawn,
    rooms: layer.rooms, layers: undefined, activeLayer: 0 };
}
