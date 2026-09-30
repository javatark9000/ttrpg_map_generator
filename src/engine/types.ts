export type Biome = 'forest' | 'dungeon' | 'cave';
export type Theme = 'vanilla' | 'dark' | 'anime';
export type Terrain = 'grass' | 'path' | 'water' | 'floor' | 'wall' | 'rock' | 'sand';
export type AssetId = 'tree-oak' | 'tree-pine' | 'tree-gold' | 'bush' | 'rock' | 'flowers' | 'mushrooms' | 'log' | 'lilies' | 'reeds' | 'chest' | 'barrels' | 'table' | 'books' | 'bones' | 'crystal' | 'stalagmite' | 'pillar' | 'campfire' | 'bedroll' | 'stairs' | 'rug' | 'door' | 'bridge' | 'torch' | 'crates' | 'altar';
export interface MapObject {
  id: string;
  asset: AssetId;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}
export interface MapConfig {
  biome: Biome;
  theme: Theme;
  width: number;
  height: number;
  seed: string;
  density: number;
  complexity: number;
  water: boolean;
  landmarks: boolean;
}
export interface BattleMap {
  version: 2;
  config: MapConfig;
  name: string;
  terrain: Terrain[];
  objects: MapObject[];
  spawn: { x: number; y: number };
}
export interface RenderOptions { grid: boolean; gridOpacity: number; atmosphere: boolean }
export const BIOMES: Record<Biome, { name: string; subtitle: string; prefix: string; icon: string }> = {
  forest: { name: 'Bosque', subtitle: 'Senderos entre lo salvaje', prefix: 'El bosque', icon: 'trees' },
  dungeon: { name: 'Mazmorra', subtitle: 'Secretos bajo la piedra', prefix: 'La cripta', icon: 'castle' },
  cave: { name: 'Caverna', subtitle: 'Ecos de otro mundo', prefix: 'La caverna', icon: 'mountain' },
};
export const DEFAULT_CONFIG: MapConfig = { biome: 'forest', theme: 'vanilla', width: 40, height: 30, seed: 'RC-7429', density: 62, complexity: 55, water: true, landmarks: true };
export const ASSETS: { id: AssetId; name: string; category: 'nature' | 'adventure'; size: number }[] = [
  { id: 'tree-oak', name: 'Roble', category: 'nature', size: 2.8 },
  { id: 'tree-pine', name: 'Pino', category: 'nature', size: 2.4 },
  { id: 'tree-gold', name: 'Roble otoñal', category: 'nature', size: 2.7 },
  { id: 'bush', name: 'Arbusto', category: 'nature', size: 1.1 },
  { id: 'rock', name: 'Rocas', category: 'nature', size: 1.6 },
  { id: 'flowers', name: 'Flores', category: 'nature', size: 0.9 },
  { id: 'mushrooms', name: 'Setas', category: 'nature', size: 0.9 },
  { id: 'log', name: 'Tronco', category: 'nature', size: 1.8 },
  { id: 'lilies', name: 'Nenúfares', category: 'nature', size: 1.2 },
  { id: 'reeds', name: 'Juncos', category: 'nature', size: 1.0 },
  { id: 'crystal', name: 'Cristales', category: 'nature', size: 1.5 },
  { id: 'stalagmite', name: 'Estalagmita', category: 'nature', size: 1.8 },
  { id: 'chest', name: 'Cofre', category: 'adventure', size: 1.0 },
  { id: 'barrels', name: 'Barriles', category: 'adventure', size: 1.4 },
  { id: 'table', name: 'Mesa', category: 'adventure', size: 2.0 },
  { id: 'books', name: 'Libros', category: 'adventure', size: 0.9 },
  { id: 'bones', name: 'Restos', category: 'adventure', size: 1.2 },
  { id: 'pillar', name: 'Columna', category: 'adventure', size: 1.2 },
  { id: 'campfire', name: 'Hoguera', category: 'adventure', size: 1.5 },
  { id: 'bedroll', name: 'Saco de dormir', category: 'adventure', size: 1.2 },
  { id: 'stairs', name: 'Escaleras', category: 'adventure', size: 2.2 },
  { id: 'rug', name: 'Alfombra', category: 'adventure', size: 3.0 },
  { id: 'door', name: 'Puerta', category: 'adventure', size: 1.1 },
  { id: 'bridge', name: 'Puente', category: 'adventure', size: 4.2 },
  { id: 'torch', name: 'Antorcha', category: 'adventure', size: 0.9 },
  { id: 'crates', name: 'Cajas', category: 'adventure', size: 1.8 },
  { id: 'altar', name: 'Altar arcano', category: 'adventure', size: 2.5 },
];
export const ASSET_SIZES = Object.fromEntries(ASSETS.map(a => [a.id, a.size])) as Record<AssetId, number>;
