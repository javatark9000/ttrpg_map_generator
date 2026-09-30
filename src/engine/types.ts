export type Biome = 'forest' | 'dungeon' | 'cave' | 'ruins' | 'village' | 'mountain' | 'building';
export type BuildingType = 'house' | 'tavern' | 'inn' | 'smithy' | 'temple' | 'library' | 'warehouse' | 'barracks';
export type VillageLayout = 'square' | 'crossroads' | 'linear';
export type Theme = 'vanilla' | 'dark' | 'anime';
export type ForestPathLayout = 'meander' | 'vertical' | 'diagonal' | 'bend' | 'fork' | 'crossroads' | 'loop';
export interface DungeonRoom { x: number; y: number; w: number; h: number }
export type Terrain = 'grass' | 'path' | 'water' | 'floor' | 'wall' | 'rock' | 'sand' | 'wood' | 'snow' | 'gravel';
export type AssetId = 'tree-oak' | 'tree-pine' | 'tree-gold' | 'bush' | 'rock' | 'flowers' | 'mushrooms' | 'log' | 'lilies' | 'reeds' | 'chest' | 'barrels' | 'table' | 'books' | 'bones' | 'crystal' | 'stalagmite' | 'pillar' | 'campfire' | 'bedroll' | 'stairs' | 'rug' | 'door' | 'bridge' | 'torch' | 'crates' | 'altar' | 'rubble' | 'broken-pillar' | 'archway' | 'statue' | 'roof-house' | 'roof-shop' | 'well' | 'market-stall' | 'cart' | 'fence' | 'bed' | 'bench' | 'bookshelf' | 'counter' | 'anvil' | 'forge' | 'weapon-rack' | 'sacks' | 'cairn' | 'tent';
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
  /** Zero retains automatic BSP room selection. */
  roomCount: number;
  forestPaths: boolean;
  forestPathLayout: ForestPathLayout;
  forestBranches: boolean;
  forestDeadEnds: boolean;
  buildingType: BuildingType;
  ruinDecay: number;
  villageLayout: VillageLayout;
  mountainSnow: boolean;
}
export interface BattleMap {
  version: 2;
  config: MapConfig;
  name: string;
  terrain: Terrain[];
  objects: MapObject[];
  spawn: { x: number; y: number };
  /** Original generated rooms; manual terrain edits do not redefine this metadata. */
  rooms?: DungeonRoom[];
}
export interface RenderOptions { grid: boolean; gridOpacity: number; atmosphere: boolean; bioluminescence?: boolean }
export const BIOMES: Record<Biome, { name: string; subtitle: string; prefix: string; icon: string; art: AssetId }> = {
  forest: { name: 'Bosque', subtitle: 'Senderos entre lo salvaje', prefix: 'El bosque', icon: 'trees', art: 'tree-oak' },
  dungeon: { name: 'Mazmorra', subtitle: 'Secretos bajo la piedra', prefix: 'La cripta', icon: 'castle', art: 'pillar' },
  cave: { name: 'Caverna', subtitle: 'Ecos de otro mundo', prefix: 'La caverna', icon: 'mountain', art: 'crystal' },
  ruins: { name: 'Ruinas', subtitle: 'Vestigios entre la maleza', prefix: 'Las ruinas', icon: 'castle', art: 'broken-pillar' },
  village: { name: 'Pueblo', subtitle: 'Calles, plazas y tejados', prefix: 'El pueblo', icon: 'village', art: 'roof-house' },
  mountain: { name: 'Montaña', subtitle: 'Cumbres y pasos de altura', prefix: 'El paso', icon: 'mountain', art: 'cairn' },
  building: { name: 'Edificios', subtitle: 'Interiores con identidad propia', prefix: 'El edificio', icon: 'house', art: 'bed' },
};
export const BIOME_IDS = Object.keys(BIOMES) as Biome[];
export const OUTDOOR_BIOMES: Biome[] = ['forest', 'ruins', 'village', 'mountain'];
export const BUILDING_TYPES: Record<BuildingType, { name: string; prefix: string; description: string; art: AssetId }> = {
  house: { name: 'Casa', prefix: 'La casa', description: 'Sala común, cocina y dormitorios separados.', art: 'bed' },
  tavern: { name: 'Taberna', prefix: 'La taberna', description: 'Salón con mesas, barra, cocina y despensa.', art: 'counter' },
  inn: { name: 'Posada', prefix: 'La posada', description: 'Habitaciones a ambos lados de un pasillo y recepción.', art: 'bed' },
  smithy: { name: 'Herrería', prefix: 'La herrería', description: 'Taller de piedra con fragua, yunques y almacén.', art: 'anvil' },
  temple: { name: 'Templo', prefix: 'El templo', description: 'Nave central, bancos, columnas y santuario.', art: 'altar' },
  library: { name: 'Biblioteca', prefix: 'La biblioteca', description: 'Estanterías, corredores de consulta y sala de lectura.', art: 'bookshelf' },
  warehouse: { name: 'Almacén', prefix: 'El almacén', description: 'Zonas de carga, cajas, sacos y un corredor de servicio.', art: 'sacks' },
  barracks: { name: 'Cuartel', prefix: 'El cuartel', description: 'Literas, armería y sala de oficiales.', art: 'weapon-rack' },
};
export const DEFAULT_CONFIG: MapConfig = { biome: 'forest', theme: 'vanilla', width: 40, height: 30, seed: 'RC-7429', density: 62, complexity: 55, water: true, landmarks: true, roomCount: 0, forestPaths: true, forestPathLayout: 'meander', forestBranches: false, forestDeadEnds: false, buildingType: 'house', ruinDecay: 55, villageLayout: 'square', mountainSnow: true };
export const ASSETS: { id: AssetId; name: string; category: 'nature' | 'adventure' | 'architecture'; size: number }[] = [
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
  { id: 'rubble', name: 'Escombros', category: 'nature', size: 1.7 },
  { id: 'broken-pillar', name: 'Columna rota', category: 'architecture', size: 1.4 },
  { id: 'archway', name: 'Arco derruido', category: 'architecture', size: 2.5 },
  { id: 'statue', name: 'Estatua', category: 'architecture', size: 1.6 },
  { id: 'roof-house', name: 'Tejado de casa', category: 'architecture', size: 6.4 },
  { id: 'roof-shop', name: 'Tejado de comercio', category: 'architecture', size: 6.4 },
  { id: 'well', name: 'Pozo', category: 'architecture', size: 1.8 },
  { id: 'market-stall', name: 'Puesto de mercado', category: 'architecture', size: 2.5 },
  { id: 'cart', name: 'Carreta', category: 'adventure', size: 2.2 },
  { id: 'fence', name: 'Valla', category: 'architecture', size: 2.5 },
  { id: 'bed', name: 'Cama', category: 'architecture', size: 1.8 },
  { id: 'bench', name: 'Banco', category: 'architecture', size: 1.8 },
  { id: 'bookshelf', name: 'Estantería', category: 'architecture', size: 2 },
  { id: 'counter', name: 'Barra de taberna', category: 'architecture', size: 2.5 },
  { id: 'anvil', name: 'Yunque', category: 'architecture', size: 1.3 },
  { id: 'forge', name: 'Fragua', category: 'architecture', size: 2.3 },
  { id: 'weapon-rack', name: 'Armero', category: 'architecture', size: 1.8 },
  { id: 'sacks', name: 'Sacos', category: 'adventure', size: 1.4 },
  { id: 'cairn', name: 'Hito de montaña', category: 'nature', size: 1.3 },
  { id: 'tent', name: 'Tienda de campaña', category: 'adventure', size: 2.7 },
];
export const ASSET_SIZES = Object.fromEntries(ASSETS.map(a => [a.id, a.size])) as Record<AssetId, number>;
