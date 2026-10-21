import { assetImage } from './engine/render';
import type { AssetId, BattleMap, Theme } from './engine/types';
import type { AnimatedScene } from './engine/animation';
export type Tool = 'pan' | 'brush' | 'erase' | 'place';
export class Viewport {
  private ctx: CanvasRenderingContext2D;
  private image?: HTMLCanvasElement;
  private images: HTMLCanvasElement[] = [];
  private map?: BattleMap;
  private tile = 56;
  private zoom = 1;
  private offset = { x: 0, y: 0 };
  private pointer?: { x: number; y: number };
  private dragging = false;
  private painting = false;
  private last = { x: 0, y: 0 };
  private queued = false;
  private editPreview = new Set<number>();
  private animation?: AnimatedScene;
  private animationTimer?: number;
  private readonly ui: { accent: string; muted: string; danger: string };
  tool: Tool = 'pan';
  brushSize = 1;
  selectedAsset: AssetId = 'tree-oak';
  selectedTheme?: Theme;
  assetScale = 2.8;
  rotation = 0;
  onEdit?: (x: number, y: number, first: boolean) => void;
  onEditEnd?: () => void;
  onZoom?: (zoom: number) => void;
  onHover?: (x: number, y: number) => void;
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const style = getComputedStyle(document.documentElement);
    this.ui = {
      accent: style.getPropertyValue('--accent').trim(),
      muted: style.getPropertyValue('--muted').trim(),
      danger: style.getPropertyValue('--danger').trim(),
    };
    new ResizeObserver(() => { this.resize(); }).observe(canvas.parentElement!);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      if (!this.map) return;
      const p = this.point(e); this.last = p;
      canvas.setPointerCapture(e.pointerId);
      if (this.tool === 'pan' || e.button === 1 || e.button === 2 || e.altKey) { this.dragging = true; canvas.style.cursor = 'grabbing'; }
      else { this.painting = true; this.editAt(p, true); }
    });
    canvas.addEventListener('pointermove', e => {
      const p = this.point(e); this.pointer = p;
      if (this.dragging) { this.offset.x += p.x - this.last.x; this.offset.y += p.y - this.last.y; }
      if (this.painting && this.tool !== 'place') this.editAt(p, false);
      this.last = p;
      const pos = this.cell(p); this.onHover?.(Math.floor(pos.x), Math.floor(pos.y)); this.draw();
    });
    const end = () => { if (this.painting) this.onEditEnd?.(); this.painting = false; this.dragging = false; this.updateCursor(); this.draw(); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('pointerleave', () => { this.pointer = undefined; this.draw(); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); const p = this.point(e); this.setZoom(this.zoom * Math.exp(-e.deltaY * .001), p); }, { passive: false });
    document.addEventListener('visibilitychange', () => this.tickAnimation());
    this.resize();
  }
  setAnimation(scene?: AnimatedScene): void {
    this.animation?.dispose(); this.animation = scene;
    this.tickAnimation(); this.draw();
  }
  private tickAnimation(): void {
    window.clearTimeout(this.animationTimer);
    if (!this.animation || document.hidden) return;
    if (!document.querySelector('dialog[open]')) this.draw();
    const cells = (this.map?.config.width ?? 0) * (this.map?.config.height ?? 0);
    const delay = cells > 6000 ? 200 : cells > 3600 ? 150 : 100;
    this.animationTimer = window.setTimeout(() => this.tickAnimation(), delay);
  }
  private point(e: MouseEvent): { x: number; y: number } { const rect = this.canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
  private cell(p: { x: number; y: number }): { x: number; y: number } { return { x: (p.x - this.offset.x) / this.zoom / this.tile, y: (p.y - this.offset.y) / this.zoom / this.tile }; }
  private editAt(p: { x: number; y: number }, first: boolean): void { const pos = this.cell(p); if (this.map && pos.x >= 0 && pos.y >= 0 && pos.x < this.map.config.width && pos.y < this.map.config.height) this.onEdit?.(Math.floor(pos.x), Math.floor(pos.y), first); }
  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2), rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    this.draw();
  }
  setMap(map: BattleMap, image: HTMLCanvasElement, fit = false): void { this.setMapLayers(map, [image], fit); }
  setMapLayers(map: BattleMap, images: HTMLCanvasElement[], fit = false): void {
    if (!images.length) return;
    this.map = map; this.images = images; this.image = images[0]; this.tile = images[0].width / map.config.width;
    this.editPreview.clear();
    if (fit) this.fit(); else this.draw();
  }
  replaceLayer(index: number, image: HTMLCanvasElement): void {
    this.images[index] = image;
    if (index === 0) this.image = image;
    this.editPreview.clear(); this.draw();
  }
  updateAnimationObjects(map: BattleMap): void { this.animation?.updateObjects(map); this.draw(); }
  previewEdit(x: number, y: number): void {
    if (!this.map) return;
    const size = this.brushSize, shift = Math.floor(size / 2), { width, height } = this.map.config;
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
      const xx = x + dx - shift, yy = y + dy - shift;
      if (xx >= 0 && yy >= 0 && xx < width && yy < height) this.editPreview.add(yy * width + xx);
    }
    this.draw();
  }
  setTool(tool: Tool): void { this.tool = tool; this.updateCursor(); this.draw(); }
  private updateCursor(): void { this.canvas.style.cursor = this.tool === 'pan' ? 'grab' : 'crosshair'; }
  fit(): void {
    if (!this.image) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.zoom = Math.min((w - 100) / this.image.width, (h - 116) / this.image.height);
    this.zoom = Math.max(.04, this.zoom);
    this.offset = { x: (w - this.image.width * this.zoom) / 2, y: (h - this.image.height * this.zoom) / 2 };
    this.onZoom?.(this.zoom); this.draw();
  }
  zoomBy(factor: number): void { this.setZoom(this.zoom * factor); }
  private setZoom(value: number, anchor = { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 }): void {
    const next = Math.max(.04, Math.min(3, value)), ratio = next / this.zoom;
    this.offset.x = anchor.x - (anchor.x - this.offset.x) * ratio;
    this.offset.y = anchor.y - (anchor.y - this.offset.y) * ratio;
    this.zoom = next; this.onZoom?.(this.zoom); this.draw();
  }
  draw(): void {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => { this.queued = false; this.paint(); });
  }
  private paint(): void {
    const ctx = this.ctx, dpr = Math.min(devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    if (!this.image || !this.map) return;
    ctx.save(); ctx.translate(this.offset.x, this.offset.y); ctx.scale(this.zoom, this.zoom);
    ctx.shadowColor = '#00000066'; ctx.shadowBlur = 30 / this.zoom; ctx.shadowOffsetY = 10 / this.zoom;
    ctx.fillStyle = '#1c151b'; ctx.fillRect(0, 0, this.image.width, this.image.height);
    ctx.shadowColor = 'transparent';
    const animated = this.animation?.frame(performance.now());
    if (animated) ctx.drawImage(animated, 0, 0, this.image.width, this.image.height);
    else for (const image of this.images) ctx.drawImage(image, 0, 0, this.image.width, this.image.height);
    if (this.editPreview.size) {
      const color = this.tool === 'erase' ? this.ui.danger : this.ui.accent;
      ctx.fillStyle = `${color}38`;
      for (const index of this.editPreview) {
        const x = index % this.map.config.width, y = Math.floor(index / this.map.config.width);
        ctx.fillRect(x * this.tile, y * this.tile, this.tile, this.tile);
      }
    }
    ctx.strokeStyle = `${this.ui.accent}66`; ctx.lineWidth = 1 / this.zoom; ctx.strokeRect(0, 0, this.image.width, this.image.height);
    // Editor coordinates stay readable at every zoom and never enter the export.
    ctx.fillStyle = this.ui.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${10 / this.zoom}px Inter, sans-serif`;
    for (let x = 0; x < this.map.config.width; x += 5) ctx.fillText(String(x + 1).padStart(2, '0'), (x + .5) * this.tile, -12 / this.zoom);
    for (let y = 0; y < this.map.config.height; y += 5) ctx.fillText(String(y + 1).padStart(2, '0'), -17 / this.zoom, (y + .5) * this.tile);
    if (this.pointer && !this.dragging && this.tool !== 'pan') {
      const p = this.cell(this.pointer), x = Math.floor(p.x), y = Math.floor(p.y);
      if (x >= 0 && y >= 0 && x < this.map.config.width && y < this.map.config.height) {
        if (this.tool === 'place') {
          const img = assetImage(this.selectedAsset, this.selectedTheme ?? this.map.config.theme), size = this.assetScale * this.tile;
          ctx.save(); ctx.globalAlpha = .65; ctx.translate((x + .5) * this.tile, (y + .5) * this.tile); ctx.rotate(this.rotation); ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
        } else {
          const size = this.brushSize, shift = Math.floor(size / 2);
          const color = this.tool === 'erase' ? this.ui.danger : this.ui.accent;
          ctx.fillStyle = `${color}33`; ctx.strokeStyle = color; ctx.lineWidth = 1.5 / this.zoom;
          ctx.fillRect((x - shift) * this.tile, (y - shift) * this.tile, size * this.tile, size * this.tile); ctx.strokeRect((x - shift) * this.tile, (y - shift) * this.tile, size * this.tile, size * this.tile);
        }
      }
    }
    ctx.restore();
  }
}
