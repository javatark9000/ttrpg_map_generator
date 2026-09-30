import { ASSETS } from './types';
import type { BattleMap, RenderOptions, Terrain } from './types';
import { fbm, hashString, Random } from './random';

const images = new Map<string, HTMLImageElement>();
export async function loadAssets(): Promise<void> {
  await Promise.all([...ASSETS.map(a => a.id), 'terrain-grass', 'terrain-soil', 'terrain-stone', 'terrain-water'].map(async id => {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}assets/${id}.svg`;
    await image.decode();
    images.set(id, image);
  }));
}
export function assetImage(id: string): HTMLImageElement | undefined { return images.get(id); }

// Trace cell boundaries into closed polygons; rounded corners soften organic terrain.
function terrainPath(map: BattleMap, test: (t: Terrain) => boolean, tile: number, round = true): Path2D {
  const { width: w, height: h } = map.config;
  const edges = new Map<string, [number, number][]>();
  const has = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && test(map.terrain[y * w + x]);
  const edge = (x: number, y: number, xx: number, yy: number) => { const k = `${x},${y}`; const list = edges.get(k) ?? []; list.push([xx, yy]); edges.set(k, list); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (has(x, y)) {
    if (!has(x, y - 1)) edge(x, y, x + 1, y);
    if (!has(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!has(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!has(x - 1, y)) edge(x, y + 1, x, y);
  }
  const path = new Path2D();
  while (edges.size) {
    const key = edges.keys().next().value as string;
    const [sx, sy] = key.split(',').map(Number);
    let points: [number, number][] = [[sx * tile, sy * tile]];
    let current = key;
    for (let guard = 0; guard < w * h * 4 + 1; guard++) {
      const list = edges.get(current);
      if (!list?.length) break;
      const [x, y] = list.pop()!;
      if (!list.length) edges.delete(current);
      current = `${x},${y}`;
      if (current === key) break;
      points.push([x * tile, y * tile]);
    }
    if (round && points.length > 3) {
      // Remove collinear grid vertices so coastlines become long, flowing curves.
      const simplified = points.filter((p, i) => {
        const before = points[(i + points.length - 1) % points.length], after = points[(i + 1) % points.length];
        const corner = (p[0] - before[0]) * (after[1] - p[1]) !== (p[1] - before[1]) * (after[0] - p[0]);
        const anchor = p[0] === before[0] ? Math.round(p[1] / tile) % 3 === 0 : Math.round(p[0] / tile) % 3 === 0;
        return corner || anchor;
      });
      if (simplified.length > 3) points = simplified;
      const last = points[points.length - 1], first = points[0];
      path.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
      for (let i = 0; i < points.length; i++) { const p = points[i], q = points[(i + 1) % points.length]; path.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    } else { path.moveTo(...points[0]); for (const point of points.slice(1)) path.lineTo(...point); }
    path.closePath();
  }
  return path;
}

function colorField(ctx: CanvasRenderingContext2D, width: number, height: number, seed: number, dark: number[], light: number[], tile: number): void {
  const small = document.createElement('canvas');
  // Sample in world coordinates, so exporting at another resolution keeps the same landscape.
  small.width = Math.ceil(width / tile * 3.5); small.height = Math.ceil(height / tile * 3.5);
  const sc = small.getContext('2d')!, pixels = sc.createImageData(small.width, small.height);
  for (let y = 0; y < small.height; y++) for (let x = 0; x < small.width; x++) {
    const n = fbm(x * 0.095, y * 0.095, seed), i = (y * small.width + x) * 4;
    for (let c = 0; c < 3; c++) pixels.data[i + c] = dark[c] + (light[c] - dark[c]) * n;
    pixels.data[i + 3] = 255;
  }
  sc.putImageData(pixels, 0, 0);
  ctx.drawImage(small, 0, 0, width, height);
}
function texture(ctx: CanvasRenderingContext2D, name: string, width: number, height: number, opacity: number, tile: number): void {
  const image = images.get(`terrain-${name}`);
  if (!image) return;
  // Rasterize SVG tiles explicitly: browser SVG patterns otherwise depend on viewport sizing.
  const stamp = document.createElement('canvas'); stamp.width = 128; stamp.height = 128;
  stamp.getContext('2d')!.drawImage(image, 0, 0, 128, 128);
  const pattern = ctx.createPattern(stamp, 'repeat');
  if (!pattern) return;
  pattern.setTransform(new DOMMatrix().scale(tile / 64));
  ctx.globalAlpha = opacity; ctx.fillStyle = pattern; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1;
}

export function renderMap(map: BattleMap, tile: number, options: RenderOptions): HTMLCanvasElement {
  const { width: w, height: h, biome } = map.config;
  const canvas = document.createElement('canvas');
  canvas.width = w * tile; canvas.height = h * tile;
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width, height = canvas.height, seed = hashString(map.config.seed);
  const rng = new Random(map.config.seed + '-art');
  const forest = biome === 'forest', cave = biome === 'cave';
  colorField(ctx, width, height, seed, forest ? [66, 85, 51] : cave ? [35, 49, 49] : [41, 46, 39], forest ? [137, 149, 91] : cave ? [87, 105, 98] : [83, 86, 70], tile);
  texture(ctx, forest ? 'grass' : 'stone', width, height, 0.52, tile);

  if (!forest) {
    const floor = terrainPath(map, t => t !== 'wall' && t !== 'rock', tile, cave);
    ctx.strokeStyle = cave ? '#1a2c2d' : '#191f1c'; ctx.lineWidth = tile * 0.42; ctx.stroke(floor);
    ctx.strokeStyle = cave ? '#768578' : '#a09f82'; ctx.lineWidth = tile * 0.17; ctx.stroke(floor);
    ctx.save(); ctx.clip(floor);
    colorField(ctx, width, height, seed + 4, cave ? [69, 84, 79] : [98, 103, 88], cave ? [124, 133, 109] : [158, 152, 124], tile);
    if (!cave) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const px = x * tile, py = y * tile;
        ctx.fillStyle = `rgba(${rng.next() > .5 ? '220,207,167' : '32,47,36'},${rng.next() * .12})`; ctx.fillRect(px + 1, py + 1, tile - 2, tile - 2);
        ctx.strokeStyle = '#454d3c70'; ctx.lineWidth = tile * .025; ctx.strokeRect(px + 1, py + 1, tile - 2, tile - 2);
        ctx.strokeStyle = '#dfd2a533'; ctx.lineWidth = tile * .014; ctx.beginPath(); ctx.moveTo(px + 3, py + tile - 3); ctx.lineTo(px + 3, py + 3); ctx.lineTo(px + tile - 3, py + 3); ctx.stroke();
        if (rng.next() < .13) { ctx.strokeStyle = '#4f564947'; ctx.beginPath(); ctx.moveTo(px + tile, py + tile * .2); ctx.lineTo(px + tile * .65, py + tile * .5); ctx.lineTo(px + tile * .75, py + tile * .75); ctx.stroke(); }
      }
    }
    texture(ctx, 'stone', width, height, .9, tile);
    ctx.restore();
    ctx.save(); ctx.clip(floor); ctx.strokeStyle = '#18272177'; ctx.lineWidth = tile * .24; ctx.stroke(floor); ctx.strokeStyle = '#18272125'; ctx.lineWidth = tile * .52; ctx.stroke(floor); ctx.restore();
    // Small strata and fissures across the solid stone, never on the playable floor.
    const solid = terrainPath(map, t => t === 'wall' || t === 'rock', tile, cave);
    ctx.save(); ctx.clip(solid);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (cave) {
        const px = (x + rng.next() * .6) * tile, py = (y + rng.next() * .5) * tile;
        ctx.strokeStyle = '#162b2b55'; ctx.lineWidth = tile * .035; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + tile * .5, py + tile * .25); ctx.lineTo(px + tile * .8, py + tile * .15); ctx.stroke();
      } else {
        ctx.strokeStyle = '#1b242072'; ctx.lineWidth = tile * .04; ctx.strokeRect(x * tile + (y % 2 ? tile * .5 : 0), y * tile, tile, tile * .5); ctx.strokeRect(x * tile + (y % 2 ? 0 : tile * .5), y * tile + tile * .5, tile, tile * .5);
      }
    }
    ctx.restore();
  }

  const groundLayers: { type: Terrain; dark: number[]; light: number[]; texture: string }[] = [
    { type: 'grass', dark: [66, 85, 51], light: [137, 149, 91], texture: 'grass' },
    { type: 'sand', dark: [134, 132, 86], light: [176, 169, 112], texture: 'soil' },
    { type: 'path', dark: [136, 124, 82], light: [187, 169, 114], texture: 'soil' },
  ];
  if (forest) groundLayers.push(
    { type: 'floor', dark: [100, 106, 88], light: [155, 151, 119], texture: 'stone' },
    { type: 'wall', dark: [36, 44, 38], light: [75, 86, 69], texture: 'stone' },
    { type: 'rock', dark: [48, 64, 59], light: [91, 105, 88], texture: 'stone' },
  );
  for (const layer of groundLayers) {
    if (layer.type === 'grass' && forest) continue;
    if (!map.terrain.includes(layer.type)) continue;
    const outline = terrainPath(map, t => t === layer.type, tile, layer.type !== 'wall' && layer.type !== 'floor');
    ctx.strokeStyle = layer.type === 'path' ? '#a09b6170' : '#8e9a6650'; ctx.lineWidth = tile * .26; ctx.stroke(outline);
    ctx.save(); ctx.clip(outline); colorField(ctx, width, height, seed + 2, layer.dark, layer.light, tile); texture(ctx, layer.texture, width, height, .8, tile); ctx.restore();
  }
  if (map.terrain.includes('water')) {
    const water = terrainPath(map, t => t === 'water', tile);
    ctx.strokeStyle = forest ? '#b2ab77' : '#8e9e86'; ctx.lineWidth = tile * .14; ctx.stroke(water);
    ctx.save(); ctx.clip(water);
    colorField(ctx, width, height, seed + 7, cave ? [31, 76, 81] : [45, 93, 87], cave ? [75, 146, 145] : [99, 149, 119], tile);
    ctx.strokeStyle = '#bdd0a635'; ctx.lineWidth = tile * .5; ctx.stroke(water);
    ctx.strokeStyle = '#c9d5ad66'; ctx.lineWidth = tile * .08; ctx.stroke(water);
    texture(ctx, 'water', width, height, .7, tile);
    ctx.restore();
  }

  // Fine pebbles, grass blades and leaf litter add scale without obstructing play.
  for (let i = 0; i < w * h * 3; i++) {
    const x = rng.next() * width, y = rng.next() * height;
    const t = map.terrain[Math.floor(y / tile) * w + Math.floor(x / tile)];
    if (t === 'water' || t === 'wall' || t === 'rock') continue;
    ctx.fillStyle = rng.next() > .5 ? '#ded0a744' : '#2d432d38';
    ctx.beginPath(); ctx.ellipse(x, y, tile * (.007 + rng.next() * .025), tile * .013, rng.next() * 6, 0, Math.PI * 2); ctx.fill();
    if (t === 'grass' && rng.next() > .35) {
      ctx.strokeStyle = '#344c3544'; ctx.lineWidth = tile * .018; ctx.beginPath(); ctx.moveTo(x - tile * .05, y - tile * .06); ctx.lineTo(x, y); ctx.lineTo(x + tile * .025, y - tile * .1); ctx.stroke();
    }
  }

  const objects = [...map.objects].sort((a, b) => {
    const z = (asset: string) => asset === 'rug' || asset === 'bridge' ? -2 : asset.startsWith('tree') ? 2 : 0;
    return z(a.asset) - z(b.asset) || a.y - b.y;
  });
  for (const obj of objects) {
    const image = images.get(obj.asset); if (!image) continue;
    const size = obj.scale * tile, x = obj.x * tile, y = obj.y * tile;
    if (options.atmosphere && ['campfire', 'crystal', 'torch', 'altar'].includes(obj.asset)) {
      const warm = obj.asset === 'campfire' || obj.asset === 'torch';
      const radius = tile * (warm ? 3.5 : 2.0);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, warm ? '#f5be6688' : '#8cdfbd45'); glow.addColorStop(.4, warm ? '#f5be6625' : '#8cdfbd18'); glow.addColorStop(1, '#00000000');
      ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(obj.rotation);
    ctx.shadowColor = obj.asset.startsWith('tree') ? '#10251caa' : '#12221b88';
    ctx.shadowBlur = tile * (obj.asset.startsWith('tree') ? .22 : .09); ctx.shadowOffsetX = tile * .12; ctx.shadowOffsetY = tile * .2;
    ctx.drawImage(image, -size / 2, -size / 2, size, size); ctx.restore();
  }

  if (options.atmosphere) {
    const vignette = ctx.createRadialGradient(width * .45, height * .42, width * .13, width * .5, height * .5, Math.max(width, height) * .65);
    vignette.addColorStop(0, '#15271b00'); vignette.addColorStop(.55, '#14291d08'); vignette.addColorStop(1, '#091c2055');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    // Broad sunbeams are deliberately subtle: the grid remains legible.
    if (forest) {
      ctx.save(); ctx.globalCompositeOperation = 'soft-light';
      const beam = ctx.createLinearGradient(0, 0, width, height); beam.addColorStop(0, '#ece0ac30'); beam.addColorStop(1, '#ece0ac00'); ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(width * .1, 0); ctx.lineTo(width * .24, 0); ctx.lineTo(width * .9, height); ctx.lineTo(width * .54, height); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  if (options.grid) {
    ctx.strokeStyle = `rgba(20,32,26,${options.gridOpacity})`; ctx.lineWidth = Math.max(.65, tile / 72);
    ctx.beginPath();
    for (let x = 1; x < w; x++) { ctx.moveTo(x * tile, 0); ctx.lineTo(x * tile, height); }
    for (let y = 1; y < h; y++) { ctx.moveTo(0, y * tile); ctx.lineTo(width, y * tile); }
    ctx.stroke();
  }
  return canvas;
}
