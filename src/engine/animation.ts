import type { BattleMap, RenderOptions } from './types';
import { orderedObjects, renderMap, terrainPath } from './render';
import { ANIMATED_ASSETS, createSpriteCache, drawMagic, drawPetals, drawSprite } from './animated-objects';
import { hashString, Random } from './random';
import { lightPulse, loopPhase } from './animation-settings';

export interface AnimatedScene {
  frame(timeMs: number): HTMLCanvasElement;
  dispose(): void;
}
export function hasAnimation(map: BattleMap, options: Pick<RenderOptions, 'bioluminescence'> = {}): boolean {
  return map.terrain.includes('water') || map.objects.some(o => ANIMATED_ASSETS.includes(o.asset) || (o.asset === 'mushrooms' && options.bioluminescence));
}

/** Cache terrain, individual sprites and finishing separately. Draw each object's
 * motion in its normal depth order, so trees occlude flames, magic and petals.
 * No procedural map regeneration and no SVG decoding per frame. */
export function createAnimatedScene(map: BattleMap, tile: number, options: RenderOptions): AnimatedScene {
  const layers: HTMLCanvasElement[] = [];
  renderMap(map, tile, options, layers, false);
  // The object layer is intentionally empty; small shared sprites replace it.
  layers[1].width = layers[1].height = 1;
  const cache = createSpriteCache(map.config.theme);
  const canvas = document.createElement('canvas');
  canvas.width = layers[0].width; canvas.height = layers[0].height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { width, theme } = map.config;
  const water = terrainPath(map, t => t === 'water', tile);
  const rng = new Random(map.config.seed + '-water-motion');
  const ripples = map.terrain.flatMap((t, index) => t !== 'water' ? [] : [{
    x: (index % width + rng.next()) * tile, y: (Math.floor(index / width) + rng.next()) * tile,
    offset: rng.next() * Math.PI * 2, length: (.18 + rng.next() * .3) * tile,
  }]);
  const objects = orderedObjects(map).map(obj => ({
    obj, offset: hashString(`${map.config.seed}/${obj.id}`) / 0xffffffff * Math.PI * 2,
    sprite: cache.sprite(obj.asset),
    tint: obj.asset === 'crystal' || obj.asset === 'altar' || (obj.asset === 'mushrooms' && options.bioluminescence) ? cache.tint(obj.asset) : undefined,
  }));
  const lights = objects.filter(({obj}) => ['torch','campfire','crystal','altar'].includes(obj.asset) || (obj.asset === 'mushrooms' && options.bioluminescence));
  const lilies = objects.filter(({obj}) => obj.asset === 'lilies');
  const warm = theme === 'dark' ? '218,135,67' : theme === 'anime' ? '255,203,111' : '255,183,79';
  return {
    frame(timeMs) {
      const phase = loopPhase(timeMs);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(layers[0], 0, 0);
      if (ripples.length) {
        ctx.save(); ctx.clip(water);
        ctx.strokeStyle = theme === 'dark' ? '#abc5c4' : theme === 'anime' ? '#d9ffff' : '#d2ebcf';
        ctx.lineWidth = Math.max(.65, tile * .028); ctx.lineCap = 'round';
        for (const r of ripples) {
          const a = phase + r.offset, x = r.x + Math.cos(a) * tile * .12, y = r.y + Math.sin(a) * tile * .13;
          ctx.globalAlpha = .1 + .14 * (.5 + .5 * Math.sin(a));
          ctx.beginPath(); ctx.moveTo(x - r.length, y);
          ctx.quadraticCurveTo(x, y - tile * .09 * Math.sin(a), x + r.length, y); ctx.stroke();
          ctx.globalAlpha *= .4; ctx.beginPath(); ctx.ellipse(x, y + tile * .12, r.length * .5, tile * .07, 0, 0, Math.PI); ctx.stroke();
        }
        for (const {obj, offset} of lilies) {
          const t = ((phase + offset) / (Math.PI*2)) % 1, radius = obj.scale * tile * (.3 + t*.3);
          ctx.globalAlpha = Math.sin(t*Math.PI)**2*.18;
          ctx.beginPath();ctx.ellipse(obj.x*tile,obj.y*tile,radius,radius*.65,obj.rotation,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();
      }
      if (options.atmosphere) for (const {obj, offset} of lights) {
        const fire = obj.asset === 'torch' || obj.asset === 'campfire';
        const color = fire ? warm : theme === 'dark' ? '196,116,168' : theme === 'anime' ? '194,166,255' : '141,223,189';
        const pulse = fire ? lightPulse(phase,offset) : .65 + .25 * Math.sin(phase+offset);
        const x = obj.x * tile, y = obj.y * tile, radius = tile * (fire ? 2.3 + pulse*.8 : obj.asset === 'mushrooms' ? 1 : 2);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(${color},${pulse * .26})`);
        glow.addColorStop(.45, `rgba(${color},${pulse * .09})`); glow.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = glow; ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
      }
      for (const {obj, offset, sprite, tint} of objects) {
        const pulse = lightPulse(phase, offset), size = obj.scale * tile;
        ctx.save(); ctx.translate(obj.x * tile, obj.y * tile); ctx.rotate(obj.rotation); ctx.scale(size / 128, size / 128);
        drawSprite(ctx, sprite, obj.asset, phase, offset);
        if (tint) drawMagic(ctx, obj.asset, phase, offset, cache.magic, tint);
        if (obj.asset === 'flowers' || (obj.asset === 'tree-gold' && theme === 'anime')) drawPetals(ctx, phase, offset, theme);
        if (obj.asset !== 'torch' && obj.asset !== 'campfire') { ctx.restore(); continue; }
        // Inner flames flicker independently; the original stones, logs and torch stay still.
        const base = obj.asset === 'torch' ? -5 : 20;
        const sway = Math.sin(phase * 3 + offset) * 4;
        ctx.globalAlpha = .65 + pulse * .25;
        ctx.fillStyle = theme === 'dark' ? '#eea450' : '#ffc56a';
        ctx.beginPath(); ctx.moveTo(-10, base);
        ctx.bezierCurveTo(-20, base-13, -3+sway, base-22, sway-1, base-34-pulse*7);
        ctx.bezierCurveTo(10+sway, base-18, 21, base-5, 7, base+4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = theme === 'anime' ? '#fff5d1' : '#ffe9a7';
        ctx.beginPath(); ctx.moveTo(-5, base); ctx.quadraticCurveTo(-8, base-10, 3+sway, base-21); ctx.quadraticCurveTo(1, base-8, 8, base); ctx.closePath(); ctx.fill();
        // Faded endpoints make each ember wrap continuously across the loop boundary.
        for (let i = 0; i < 3; i++) {
          const t = ((phase + offset + i * Math.PI * 2 / 3) / (Math.PI * 2)) % 1;
          ctx.globalAlpha = Math.sin(t * Math.PI) ** 2 * .8;
          ctx.beginPath(); ctx.arc(Math.sin(t * 5 + i) * 11, base-14-t*43, 1.4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }
      ctx.drawImage(layers[2], 0, 0);
      return canvas;
    },
    dispose() { cache.dispose(); for (const layer of [...layers, canvas]) { layer.width = 1; layer.height = 1; } },
  };
}
