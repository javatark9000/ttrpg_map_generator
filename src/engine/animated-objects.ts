import type { AssetId, Theme } from './types';
import { assetImage } from './render';

export const WIND_ASSETS: readonly AssetId[] = ['tree-oak', 'tree-pine', 'tree-gold', 'bush', 'reeds', 'flowers'];
export const ANIMATED_ASSETS: readonly AssetId[] = [...WIND_ASSETS, 'lilies', 'crystal', 'altar', 'torch', 'campfire'];
const PAD = 32, SIDE = 128 + PAD * 2;

/** One rasterized sprite per asset, not per object or frame. The art and its
 * shadow are cached together so bending a plant never produces shadow seams. */
export function createSpriteCache(theme: Theme) {
  const sprites = new Map<AssetId, HTMLCanvasElement>();
  const tints = new Map<AssetId, HTMLCanvasElement>();
  const magic = theme === 'dark' ? '#d69fc6' : theme === 'anime' ? '#d8c8ff' : '#b4f4dc';
  return {
    magic,
    sprite(asset: AssetId) {
      let sprite = sprites.get(asset);
      if (!sprite) {
        sprite = document.createElement('canvas'); sprite.width = sprite.height = SIDE;
        const ctx = sprite.getContext('2d')!, image = assetImage(asset, theme);
        ctx.shadowColor = theme === 'dark' ? '#060a10bb' : theme === 'anime' ? '#35466566' : asset.startsWith('tree') ? '#10251caa' : '#12221b88';
        ctx.shadowBlur = asset.startsWith('tree') ? 10 : 6; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 7;
        if (image) ctx.drawImage(image, PAD, PAD, 128, 128);
        sprites.set(asset, sprite);
      }
      return sprite;
    },
    tint(asset: AssetId) {
      let tint = tints.get(asset);
      if (!tint) {
        tint = document.createElement('canvas'); tint.width = tint.height = 128;
        const ctx = tint.getContext('2d')!, image = assetImage(asset, theme);
        if (image) ctx.drawImage(image, 0, 0, 128, 128);
        ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = magic; ctx.fillRect(0, 0, 128, 128);
        tints.set(asset, tint);
      }
      return tint;
    },
    dispose() { for (const canvas of [...sprites.values(), ...tints.values()]) { canvas.width = canvas.height = 1; } sprites.clear(); tints.clear(); },
  };
}

/** Coordinates are normalized to the original SVG's 128px viewbox, centered on
 * the object. Lower stems/roots remain fixed; only the upper portion bends. */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, asset: AssetId, phase: number, offset: number): void {
  if (WIND_ASSETS.includes(asset)) {
    const anchor = asset.startsWith('tree') ? 88 : 98;
    const cut = PAD + anchor, y = anchor - 64;
    const strength = asset.startsWith('tree') ? .012 : asset === 'reeds' ? .035 : .02;
    const shear = strength * (Math.sin(phase + offset) + .2 * Math.sin(phase * 2 + offset));
    ctx.save(); ctx.transform(1, 0, shear, 1, -y * shear, 0);
    ctx.drawImage(sprite, 0, 0, SIDE, cut, -64-PAD, -64-PAD, SIDE, cut); ctx.restore();
    ctx.drawImage(sprite, 0, cut, SIDE, SIDE-cut, -64-PAD, y, SIDE, SIDE-cut);
  } else if (asset === 'lilies') {
    ctx.save(); ctx.translate(Math.cos(phase + offset) * 1.7, Math.sin(phase + offset) * 2);
    ctx.rotate(Math.sin(phase + offset) * .018); ctx.drawImage(sprite, -64-PAD, -64-PAD); ctx.restore();
  } else ctx.drawImage(sprite, -64-PAD, -64-PAD);
}

export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath(); ctx.moveTo(x, y-size); ctx.quadraticCurveTo(x+size*.2, y-size*.2, x+size, y);
  ctx.quadraticCurveTo(x+size*.2, y+size*.2, x, y+size); ctx.quadraticCurveTo(x-size*.2, y+size*.2, x-size, y);
  ctx.quadraticCurveTo(x-size*.2, y-size*.2, x, y-size); ctx.fill();
}

export function drawMagic(ctx: CanvasRenderingContext2D, asset: AssetId, phase: number, offset: number, magic: string, tint: HTMLCanvasElement): void {
  const pulse = .5 + .5 * Math.sin(phase + offset);
  ctx.fillStyle = magic; ctx.strokeStyle = magic;
  if (asset === 'crystal' || asset === 'mushrooms') {
    ctx.globalAlpha = (asset === 'mushrooms' ? .08 : .04) + pulse * .22; ctx.drawImage(tint, -64, -64);
    if (asset === 'crystal') for (const [i, [x,y]] of [[0,-36],[-24,5],[29,0]].entries()) {
      ctx.globalAlpha = .15 + .7 * (.5 + .5 * Math.sin(phase + offset + i*2)); sparkle(ctx, x, y, 2.5 + pulse*2);
    }
    if (asset === 'mushrooms') for (const [x,y] of [[-16,-19],[18,1],[-17,24],[25,-30]]) {
      ctx.globalAlpha = .2 + pulse * .6; ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();
    }
  }
  if (asset === 'altar') {
    const points = [[0,-25],[19,9],[-19,9],[0,-25],[0,19],[19,-15],[-19,-15],[0,19]];
    ctx.lineWidth = 1.6;
    for(let i=0;i<points.length-1;i++) {
      if (i===3) continue;
      ctx.globalAlpha = .15 + .65 * (.5 + .5 * Math.sin(phase + offset - i * .8));
      ctx.beginPath();ctx.moveTo(points[i][0],points[i][1]);ctx.lineTo(points[i+1][0],points[i+1][1]);ctx.stroke();
    }
    ctx.globalAlpha = .2 + pulse*.5;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-3,24,phase,phase+Math.PI*.8);ctx.stroke();
    for(let i=0;i<4;i++) {
      const t=((phase+offset)/(Math.PI*2)+i/4)%1;
      ctx.globalAlpha=Math.sin(t*Math.PI)**2*.6;sparkle(ctx,Math.sin(i*2+offset)*25,-5-t*37,1.6);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawPetals(ctx: CanvasRenderingContext2D, phase: number, offset: number, theme: Theme): void {
  ctx.fillStyle = theme === 'anime' ? '#f8ccd9' : theme === 'dark' ? '#b8a69e' : '#e4d1ae';
  for(let i=0;i<(theme==='anime'?2:1);i++) {
    const t=((phase+offset)/(Math.PI*2)+i*.5)%1;
    ctx.globalAlpha=Math.sin(t*Math.PI)**2*(theme==='anime'?.55:.3);
    ctx.beginPath();ctx.ellipse(-18+t*38,-12+Math.sin(t*Math.PI*2+i)*7,2.6,1.3,t*Math.PI*2,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
