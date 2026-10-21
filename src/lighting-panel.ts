import type { BattleMap } from './engine/types';
import { DEFAULT_LIGHTING, LIGHTING_RANGES, lightingProfile } from './engine/lighting-settings';
import type { LightingNumber, LightingSettings } from './engine/lighting-settings';
import { icon } from './icons';
import './lighting.css';

type Control = HTMLElement & { value: number; selected: boolean; disabled: boolean };
const $ = (id: string) => document.getElementById(id)!;
const labels: Record<LightingNumber, string> = {
  intensity: 'Intensidad solar', direction: 'Origen de la luz', warmth: 'Calidez · fría / cálida',
  beamStrength: 'Intensidad de los haces', beamWidth: 'Anchura de los haces', beamDensity: 'Cantidad de haces',
  shadowStrength: 'Intensidad de las sombras', shadowLength: 'Longitud de las sombras', softness: 'Suavidad de las sombras',
  vignette: 'Viñeta · oscurecer bordes', halos: 'Halos de fuego y magia',
};
const toggles = { enabled: 'Iluminación activada', sun: 'Luz solar', beams: 'Haces de luz', shadows: 'Sombras solares' } as const;
const toggle = (key: keyof typeof toggles) => `<label class="toggle-row"><span>${toggles[key]}</span><md-switch id="lighting-${key}" aria-label="${toggles[key]}" selected></md-switch></label>`;
const slider = (key: LightingNumber) => `<div class="lighting-slider"><div class="slider-label"><label id="lighting-${key}-label">${labels[key]}</label><output id="lighting-${key}-value"></output></div><md-slider id="lighting-${key}" aria-labelledby="lighting-${key}-label" min="0" max="${LIGHTING_RANGES[key]}" value="${DEFAULT_LIGHTING[key]}" step="1"></md-slider></div>`;
export function lightingPanel(): string {
  return `<section id="lighting-panel" class="panel-content" aria-labelledby="lighting-title" hidden>
    <div class="panel-heading"><h2 id="lighting-title">Iluminación</h2></div>
    ${toggle('enabled')}
    <div class="light-presets" role="group" aria-label="Preajustes de iluminación"><button id="light-dawn" title="Luz cálida desde el este">${icon('sun')}Alba</button><button id="light-day" title="Luz solar diurna">${icon('sun')}Día</button><button id="light-night" title="Sin sol directo, con viñeta y halos">${icon('moon')}Noche</button></div>
    <p id="lighting-context" class="scenario-hint"></p>
    <div class="light-compass" aria-hidden="true"><span>N</span><div id="light-compass-arrow">${icon('sun')}</div><span>O · 270° &nbsp; E · 90°</span><span>S · 180°</span></div>
    <section class="lighting-section" aria-label="Luz solar">${toggle('sun')}${slider('intensity')}${slider('direction')}
      <p class="scenario-hint">Origen del sol. Las sombras se proyectan al lado opuesto.</p>${slider('warmth')}</section>
    <section class="lighting-section" aria-label="Haces de luz">${toggle('beams')}${slider('beamStrength')}${slider('beamWidth')}${slider('beamDensity')}
      <p class="scenario-hint">Disponibles en bosque y ruinas.</p></section>
    <section class="lighting-section" aria-label="Sombras solares">${toggle('shadows')}${slider('shadowStrength')}${slider('shadowLength')}${slider('softness')}
      <p class="scenario-hint">Proyección 2D. Las sombras de contacto del dibujo se conservan.</p></section>
    <section class="lighting-section" aria-label="Ambiente">${slider('vignette')}${slider('halos')}
      <p class="scenario-hint">Independientes de la luz solar. Halos no desactiva llamas, runas ni destellos.</p></section>
    <md-outlined-button id="lighting-reset">Restablecer iluminación</md-outlined-button>
    <p class="scenario-hint">Los ajustes se guardan y exportan. Atmósfera no borra sus valores.</p>
  </section>`;
}
export function syncLightingControls(map?: BattleMap, busy = false): void {
  const s = { ...DEFAULT_LIGHTING, ...map?.lighting }, profile = lightingProfile(map?.config.biome ?? 'forest');
  const disabled = busy || !map;
  for (const key of Object.keys(toggles) as (keyof typeof toggles)[]) {
    const el = $(`lighting-${key}`) as Control; el.selected = s[key];
    el.disabled = disabled || (key !== 'enabled' && (!s.enabled || !profile.outdoor)) || ((key === 'beams' || key === 'shadows') && !s.sun) || (key === 'beams' && !profile.beams);
  }
  for (const key of Object.keys(LIGHTING_RANGES) as LightingNumber[]) {
    const el = $(`lighting-${key}`) as Control; el.value = s[key];
    const solar = key !== 'vignette' && key !== 'halos';
    el.disabled = disabled || !s.enabled || (solar && (!s.sun || !profile.outdoor)) || (key.startsWith('beam') && (!profile.beams || !s.beams)) || (['shadowStrength', 'shadowLength', 'softness'].includes(key) && !s.shadows);
    $(`lighting-${key}-value`).textContent = `${Math.round(s[key])}${key === 'direction' ? '°' : '%'}`;
  }
  ($('lighting-reset') as Control).disabled = disabled;
  for (const id of ['light-dawn', 'light-day', 'light-night']) {
    ($(id) as HTMLButtonElement).disabled = disabled || (id !== 'light-night' && !profile.outdoor);
  }
  $('lighting-context').textContent = profile.description;
  $('light-compass-arrow').style.transform = `rotate(${s.direction}deg)`;
  $('light-toggle').classList.toggle('active', s.enabled);
  $('light-toggle').setAttribute('aria-pressed', String(s.enabled));
}
/** The caller groups a slider gesture into a single undo transaction. */
export function bindLightingControls(get: () => LightingSettings, change: (settings: LightingSettings, commit: boolean) => void): void {
  for (const key of Object.keys(toggles) as (keyof typeof toggles)[]) {
    $(`lighting-${key}`).addEventListener('change', () => change({ ...get(), [key]: ($(`lighting-${key}`) as Control).selected }, true));
  }
  for (const key of Object.keys(LIGHTING_RANGES) as LightingNumber[]) {
    const update = (commit: boolean) => change({ ...get(), [key]: Math.max(0, Math.min(LIGHTING_RANGES[key], Number(($(`lighting-${key}`) as Control).value))) }, commit);
    $(`lighting-${key}`).addEventListener('input', () => update(false));
    $(`lighting-${key}`).addEventListener('change', () => update(true));
  }
  $('lighting-reset').addEventListener('click', () => change({ ...DEFAULT_LIGHTING }, true));
  $('light-dawn').addEventListener('click', () => change({ ...get(), enabled: true, sun: true, intensity: 68, warmth: 80, direction: 90 }, true));
  $('light-day').addEventListener('click', () => change({ ...get(), enabled: true, sun: true, intensity: 85, warmth: 40, direction: 135 }, true));
  $('light-night').addEventListener('click', () => change({ ...get(), enabled: true, sun: false, vignette: 75, halos: 100 }, true));
}
