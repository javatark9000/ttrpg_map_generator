import type { BattleMap, RenderOptions } from './types';
import { casterHeight, DEFAULT_LIGHTING, lightingProfile, shadowVector } from './lighting-settings';
import { fbm, hashString, Random } from './random';

export function lightingFor(map: BattleMap, options: RenderOptions) {
  const settings = { ...DEFAULT_LIGHTING, ...map.lighting };
  settings.enabled = settings.enabled && options.atmosphere;
  return settings;
}

/** Ground-only lighting, cached with terrain by the animation renderer. All
 * sampling is in world coordinates; exports never invent a different pattern.
 * Soft masks are bounded independently of output resolution (max 1024px/side).
 * Casters use conservative plan-view footprints, not expensive 3D ray tracing. */
export function drawSunlight(ctx: CanvasRenderingContext2D, map: BattleMap, tile: number, options: RenderOptions): void {
  const s = lightingFor(map, options), profile = lightingProfile(map.config.biome);
  if (!s.enabled || !s.sun || !s.intensity || !profile.outdoor) return;
  const { width: w, height: h, theme, biome } = map.config;
  const unit = Math.min(tile, 12, 1024 / Math.max(w, h));
  const make = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w * unit); c.height = Math.ceil(h * unit); return c; };
  const field = make(), mask = make(), shadow = make();
  const f = field.getContext('2d')!, m = mask.getContext('2d')!, sh = shadow.getContext('2d')!;
  const width = field.width, height = field.height, v = shadowVector(s.direction);
  const intensity = s.intensity / 100 * (theme === 'anime' ? 1.1 : theme === 'dark' ? .8 : 1);
  const warmth = s.warmth / 100;
  const color = [155 + warmth * 100, 185 + warmth * 29, 255 - warmth * 112].map(Math.round).join(',');
  const reach = Math.hypot(width, height) * .5;
  const ambient = f.createLinearGradient(width / 2 - v.x * reach, height / 2 - v.y * reach, width / 2 + v.x * reach, height / 2 + v.y * reach);
  ambient.addColorStop(0, `rgba(${color},${.22 * intensity})`);
  ambient.addColorStop(1, `rgba(${color},${.025 * intensity})`);
  f.fillStyle = ambient; f.fillRect(0, 0, width, height);

  // Merge each caster into opaque masks: overlapping shadows never stack dark.
  const cast = (path: Path2D, elevation: number) => {
    m.fill(path);
    const distance = s.shadowLength / 100 * 5 * elevation * unit;
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, unit * .2)));
    for (let i = 0; i <= steps; i++) {
      sh.save(); sh.translate(v.x * distance * i / steps, v.y * distance * i / steps); sh.fill(path); sh.restore();
    }
  };
  // Coalesce solid cells into horizontal runs; no offscreen canvases per object.
  const walls = new Path2D(), rocks = new Path2D();
  for (let y = 0; y < h; y++) for (let x = 0; x < w;) {
    const terrain = map.terrain[y * w + x];
    if (terrain !== 'wall' && terrain !== 'rock') { x++; continue; }
    const start = x; while (x < w && map.terrain[y * w + x] === terrain) x++;
    (terrain === 'wall' ? walls : rocks).rect(start * unit, y * unit, (x - start) * unit, unit);
  }
  cast(walls, .65); cast(rocks, biome === 'mountain' ? 1 : .5);
  for (const obj of map.objects) {
    const elevation = casterHeight(obj.asset); if (!elevation) continue;
    const local = new Path2D(), radius = obj.scale * unit * .37;
    if (obj.asset.startsWith('roof-') || ['market-stall', 'tent', 'fence', 'archway'].includes(obj.asset)) local.rect(-radius, -radius * .85, radius * 2, radius * 1.7);
    else local.ellipse(0, 0, radius, radius * .88, 0, 0, Math.PI * 2);
    const path = new Path2D();
    path.addPath(local, new DOMMatrix().translate(obj.x * unit, obj.y * unit).rotate(obj.rotation * 180 / Math.PI));
    cast(path, elevation);
  }
  // Beam blocking is independent of whether visible shadows are enabled.
  if (s.beams && profile.beams && s.beamStrength && s.beamDensity) {
    const beams = make(), b = beams.getContext('2d')!;
    const rng = new Random(map.config.seed + '-sunbeams');
    const angle = Math.atan2(v.y, v.x);
    const count = Math.min(60, Math.max(1, Math.ceil(w * h / 75 * s.beamDensity / 50)));
    for (let i = 0; i < count; i++) {
      b.save(); b.translate(rng.next() * width, rng.next() * height); b.rotate(angle);
      b.scale((4 + rng.next() * 9) * unit, (.45 + rng.next() * 1.25) * unit * (.3 + s.beamWidth / 100 * 1.4));
      const gradient = b.createRadialGradient(0, 0, 0, 0, 0, 1);
      const alpha = intensity * s.beamStrength / 100 * (.25 + rng.next() * .3);
      gradient.addColorStop(0, `rgba(${color},${alpha})`); gradient.addColorStop(.35, `rgba(${color},${alpha * .55})`); gradient.addColorStop(1, `rgba(${color},0)`);
      b.fillStyle = gradient; b.fillRect(-1, -1, 2, 2); b.restore();
    }
    if (biome === 'forest') {
      const dapple = make(), d = dapple.getContext('2d')!;
      const seed = hashString(map.config.seed + '-dapple');
      for (let y = 0; y < h * 2; y++) for (let x = 0; x < w * 2; x++) {
        const alpha = .15 + .85 * fbm(x * .45, y * .45, seed);
        d.fillStyle = `rgba(0,0,0,${alpha})`; d.fillRect(x * unit / 2, y * unit / 2, unit / 2 + .5, unit / 2 + .5);
      }
      b.globalCompositeOperation = 'destination-in'; b.drawImage(dapple, 0, 0); dapple.width = dapple.height = 1;
    }
    b.globalCompositeOperation = 'destination-out'; b.drawImage(shadow, 0, 0); b.drawImage(mask, 0, 0);
    f.drawImage(beams, 0, 0); beams.width = beams.height = 1;
  }
  // Exclude source footprints, so cliffs and roofs don't shadow their own tops.
  sh.globalCompositeOperation = 'destination-out'; sh.drawImage(mask, 0, 0);
  ctx.save();
  ctx.drawImage(field, 0, 0, w * tile, h * tile);
  if (s.shadows && s.shadowStrength && s.shadowLength) {
    f.clearRect(0, 0, width, height);
    f.filter = `blur(${(.03 + s.softness / 100 * .5) * unit}px)`; f.drawImage(shadow, 0, 0); f.filter = 'none';
    f.globalCompositeOperation = 'destination-out'; f.drawImage(mask, 0, 0);
    f.globalCompositeOperation = 'source-in'; f.fillStyle = biome === 'mountain' ? '#25374e' : theme === 'dark' ? '#0e1522' : '#243329'; f.fillRect(0, 0, width, height);
    ctx.globalAlpha = intensity * s.shadowStrength / 100 * .7;
    ctx.drawImage(field, 0, 0, w * tile, h * tile);
  }
  ctx.restore();
  for (const canvas of [field, mask, shadow]) canvas.width = canvas.height = 1;
}
