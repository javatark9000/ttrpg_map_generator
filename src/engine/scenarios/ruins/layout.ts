import type { Random } from '../../random';
import type { Rect } from '../../scenario-painter';
import type { MapConfig } from '../../types';

type RuinLayout = MapConfig['ruinLayout'];
type RuinFeatures = MapConfig['ruinFeatures'];
export interface RuinPlan { sites: Rect[]; plazas: Rect[] }

export function contains(r: Rect, x: number, y: number, margin = 0): boolean {
  return x >= r.x - margin && y >= r.y - margin && x < r.x + r.w + margin && y < r.y + r.h + margin;
}
function overlaps(a: Rect, b: Rect, margin = 1): boolean {
  return a.x < b.x + b.w + margin && a.x + a.w + margin > b.x && a.y < b.y + b.h + margin && a.y + a.h + margin > b.y;
}

/** All layouts reserve their open spaces before any walls or decoration are painted. */
export function planRuins(w: number, h: number, complexity: number, layout: Exclude<RuinLayout, 'random'>, features: RuinFeatures, rng: Random): RuinPlan {
  const sites: Rect[] = [], plazas: Rect[] = [];
  const step = Math.round(15 - complexity * .06);
  const fit = (area: Rect, centered: boolean): Rect | undefined => {
    if (area.w < 5 || area.h < 5) return;
    const rw = Math.min(area.w, rng.int(6, features === 'monumental' ? 12 : 10));
    const rh = Math.min(area.h, rng.int(6, features === 'monumental' ? 12 : 10));
    return { x: area.x + (centered ? Math.floor((area.w - rw) / 2) : rng.int(0, area.w - rw)), y: area.y + (centered ? Math.floor((area.h - rh) / 2) : rng.int(0, area.h - rh)), w: rw, h: rh };
  };
  const fill = (area: Rect) => {
    const cols = Math.max(1, Math.floor((area.w + 2) / step)), rows = Math.max(1, Math.floor((area.h + 2) / step));
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      const x = area.x + Math.floor(gx * area.w / cols), y = area.y + Math.floor(gy * area.h / rows);
      const right = area.x + Math.floor((gx + 1) * area.w / cols), bottom = area.y + Math.floor((gy + 1) * area.h / rows);
      const site = fit({ x, y, w: right - x - (gx < cols - 1 ? 2 : 0), h: bottom - y - (gy < rows - 1 ? 2 : 0) }, true);
      if (site) sites.push(site);
    }
  };
  if (layout === 'courtyard') {
    if (Math.min(w, h) >= 19) {
      const pw = Math.max(5, Math.min(features === 'monumental' ? 14 : 10, w - 16));
      const ph = Math.max(5, Math.min(features === 'monumental' ? 14 : 10, h - 16));
      const court = { x: Math.floor((w - pw) / 2), y: Math.floor((h - ph) / 2), w: pw, h: ph };
      plazas.push(court);
      fill({ x: 1, y: 1, w: w - 2, h: court.y - 2 });
      fill({ x: 1, y: court.y + ph + 1, w: w - 2, h: h - court.y - ph - 2 });
      fill({ x: 1, y: court.y, w: court.x - 2, h: ph });
      fill({ x: court.x + pw + 1, y: court.y, w: w - court.x - pw - 2, h: ph });
    } else if (Math.max(w, h) >= 17) {
      // Narrow maps retain a courtyard on the long axis instead of squeezing four wings.
      const vertical = h >= w, length = vertical ? h : w;
      const span = Math.min(7, length - 14), start = Math.floor((length - span) / 2);
      plazas.push(vertical ? { x: 2, y: start, w: w - 4, h: span } : { x: start, y: 2, w: span, h: h - 4 });
      fill(vertical ? { x: 1, y: 1, w: w - 2, h: start - 2 } : { x: 1, y: 1, w: start - 2, h: h - 2 });
      fill(vertical ? { x: 1, y: start + span + 1, w: w - 2, h: h - start - span - 2 } : { x: start + span + 1, y: 1, w: w - start - span - 2, h: h - 2 });
    } else {
      // A compact enclosing ruin with an open inner court remains meaningful at 8 × 8.
      sites.push({ x: 1, y: 1, w: w - 2, h: h - 2 });
      plazas.push({ x: 2, y: 2, w: w - 4, h: h - 4 });
    }
  } else if (layout === 'scattered') {
    if (features !== 'simple' && Math.min(w, h) >= 16) {
      const pw = rng.int(4, Math.min(8, Math.floor(w / 3))), ph = rng.int(4, Math.min(8, Math.floor(h / 3)));
      plazas.push({ x: rng.int(3, w - pw - 3), y: rng.int(3, h - ph - 3), w: pw, h: ph });
    }
    const target = Math.max(1, Math.floor(w * h / (step * step)));
    for (let attempt = 0; attempt < target * 45 && sites.length < target; attempt++) {
      const site = fit({ x: 1, y: 1, w: w - 2, h: h - 2 }, false)!;
      if (![...sites, ...plazas].some(other => overlaps(site, other, 2))) sites.push(site);
    }
  } else {
    fill({ x: 1, y: 1, w: w - 2, h: h - 2 });
    if (features !== 'simple' && sites.length >= 4) {
      const distance = (r: Rect) => Math.hypot(r.x + r.w / 2 - w / 2, r.y + r.h / 2 - h / 2);
      let closest = 0;
      for (let i = 1; i < sites.length; i++) if (distance(sites[i]) < distance(sites[closest])) closest = i;
      plazas.push(sites.splice(closest, 1)[0]);
    }
  }
  if (!sites.length) throw new Error('No se pudieron colocar recintos sin invadir la plaza. Amplía el mapa o prueba otra semilla.');
  return { sites, plazas };
}
