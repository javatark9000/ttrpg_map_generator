import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/slider/slider.js';
import '@material/web/switch/switch.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/progress/circular-progress.js';
import { ASSETS, ASSET_SIZES, BIOMES, DEFAULT_CONFIG } from './engine/types';
import type { AssetId, BattleMap, Biome, MapConfig, RenderOptions, Terrain, Theme, ForestPathLayout } from './engine/types';
import { THEMES, THEME_IDS, assetUrl } from './engine/themes';
import { SIZE_PRESETS, MIN_SIDE, MAX_SIDE, dimensionsError, aspectRatio } from './engine/dimensions';
import { PATH_LAYOUTS, MAX_ROOMS, maxRoomCount, roomCountError, scenarioOptionsError } from './engine/scenario-options';
import { freshSeed } from './engine/random';
import { loadAssets, renderMap } from './engine/render';
import { parseMap, STORAGE_KEY, LEGACY_STORAGE_KEY } from './engine/storage';
import { Viewport } from './viewport';
import type { Tool } from './viewport';
import { icon } from './icons';
import './style.css';
import './themes.css';
import './scenario-controls.css';

type Field = HTMLElement & { value: string; disabled: boolean };
type Toggle = HTMLElement & { selected: boolean; disabled: boolean };
type Slider = HTMLElement & { value: number };
type Checkbox = HTMLElement & { checked: boolean; disabled: boolean };
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const option = (value: string, label: string, selected = false) => `<md-select-option value="${value}" ${selected ? 'selected' : ''}><div slot="headline">${label}</div></md-select-option>`;
const iconButton = (id: string, name: string, title: string, extra = '') => `<md-icon-button id="${id}" title="${title}" aria-label="${title}" ${extra}>${icon(name)}</md-icon-button>`;

$('#app').innerHTML = `
<header class="app-header">
  <a class="brand" href="./" aria-label="RC map generator, inicio"><span class="brand-mark">${icon('sparkle')}</span><span class="brand-name">RC<span class="brand-caption">map generator</span></span></a>
  <div class="header-divider"></div><div class="header-description">Un mundo por imaginar.</div>
  <div class="header-actions">
    <span class="local-badge"><span></span> Hecho en tu navegador</span>
    ${iconButton('open-project', 'folder', 'Abrir proyecto JSON')}
    ${iconButton('save-project', 'save', 'Guardar proyecto JSON')}
    <md-filled-button id="open-export">${icon('download', 'button-icon')}<span>Exportar mapa</span></md-filled-button>
  </div>
</header>
<div class="app-layout">
  <aside class="sidebar" aria-label="Configuración del mapa">
    <div class="sidebar-top"><span class="eyebrow">TU PRÓXIMA AVENTURA</span>${iconButton('close-sidebar', 'close', 'Cerrar panel')}</div>
    <div class="theme-picker" role="group" aria-label="Temática del mundo">${THEME_IDS.map(theme => `<button class="theme-card ${theme === 'vanilla' ? 'selected' : ''}" data-theme="${theme}" aria-pressed="${theme === 'vanilla'}" title="${THEMES[theme].description}"><img src="${assetUrl('tree-oak', theme)}" alt=""/><span>${THEMES[theme].name}</span></button>`).join('')}</div><p id="theme-description" class="theme-description">${THEMES.vanilla.description}</p>
    <div class="panel-tabs" role="tablist" aria-label="Panel del editor"><button id="tab-world" class="panel-tab active" role="tab" aria-selected="true" aria-controls="world-panel">${icon('map')} Crear mundo</button><button id="tab-assets" class="panel-tab" role="tab" aria-selected="false" aria-controls="assets-panel">${icon('layers')} Objetos <span>${ASSETS.length}</span></button></div>
    <section id="world-panel" class="panel-content" role="tabpanel" aria-labelledby="tab-world">
      <div class="section-heading"><h2>Elige un escenario</h2><span class="step-number">01</span></div>
      <div class="biome-list">${Object.entries(BIOMES).map(([key, b]) => `<button class="biome-card ${key === 'forest' ? 'selected' : ''}" data-biome="${key}" aria-pressed="${key === 'forest'}"><span class="biome-art ${key}"><img src="${assetUrl(key === 'forest' ? 'tree-oak' : key === 'cave' ? 'crystal' : 'pillar', 'vanilla')}" alt=""/></span><span class="biome-info"><strong>${b.name}</strong><small>${b.subtitle}</small></span><span class="biome-check">${icon('check')}</span></button>`).join('')}</div>
      <section id="dungeon-options" class="scenario-options" aria-label="Distribución de la mazmorra" hidden>
        <div class="section-heading"><h2>Cuartos de la mazmorra</h2>${icon('castle')}</div>
        <label class="toggle-row"><span>Cantidad automática</span><md-switch id="rooms-auto" aria-label="Cantidad automática de cuartos" selected></md-switch></label>
        <md-outlined-text-field id="room-count" label="Cantidad de cuartos" type="number" inputmode="numeric" min="1" max="30" step="1" value="6" disabled></md-outlined-text-field>
        <p id="room-limit" class="scenario-hint">El límite se adapta al tamaño del mapa.</p><p id="room-error" class="size-error" role="alert" hidden></p>
      </section>
      <section id="forest-options" class="scenario-options" aria-label="Caminos del bosque">
        <div class="section-heading"><h2>Diseña el recorrido</h2>${icon('map')}</div>
        <label class="scenario-check"><md-checkbox id="forest-paths" aria-label="Generar caminos" checked></md-checkbox><span>Generar caminos</span></label>
        <div class="path-layouts" role="group" aria-label="Trazado principal">${PATH_LAYOUTS.map(layout => `<button class="path-card ${layout.id === 'meander' ? 'selected' : ''}" data-path-layout="${layout.id}" aria-pressed="${layout.id === 'meander'}" aria-label="${layout.name}: ${layout.description}" title="${layout.description}"><svg viewBox="0 0 100 64" aria-hidden="true"><rect width="100" height="64" rx="6" class="path-thumb-ground"/><path d="M20 0V64M40 0V64M60 0V64M80 0V64M0 16H100M0 32H100M0 48H100" class="path-thumb-grid"/><g class="path-thumb-trees"><circle cx="12" cy="12" r="6"/><circle cx="89" cy="51" r="7"/><circle cx="14" cy="53" r="5"/></g><path d="${layout.preview}" class="path-thumb-edge"/><path d="${layout.preview}" class="path-thumb-road"/></svg><span>${layout.name}</span></button>`).join('')}</div>
        <p id="path-description" class="scenario-hint">${PATH_LAYOUTS[0].description}</p>
        <label class="scenario-check"><md-checkbox id="forest-branches" aria-label="Caminos alternos"></md-checkbox><span>Caminos alternos<small>Desvíos que vuelven a la ruta principal</small></span></label>
        <label class="scenario-check"><md-checkbox id="forest-dead-ends" aria-label="Callejones sin salida"></md-checkbox><span>Callejones sin salida<small>Ramales que terminan dentro del bosque</small></span></label>
        <p class="scenario-hint subtle">Miniaturas orientativas. La semilla y la complejidad dan forma a las curvas.</p>
      </section>
      <div class="section-heading separated"><h2>Traza los límites</h2><span class="step-number">02</span></div>
      <md-outlined-select id="map-size" label="Formato del mapa">${SIZE_PRESETS.map(p => option(p.value, p.label, p.value === '40x30')).join('')}${option('custom', 'Personalizado · Ancho y alto libres')}</md-outlined-select>
      <div class="dimension-fields"><md-outlined-text-field id="map-width" type="number" label="Ancho" value="40" min="${MIN_SIDE}" max="${MAX_SIDE}" step="1" inputmode="numeric"></md-outlined-text-field>${iconButton('swap-dimensions', 'redo', 'Intercambiar ancho y alto')}<md-outlined-text-field id="map-height" type="number" label="Alto" value="30" min="${MIN_SIDE}" max="${MAX_SIDE}" step="1" inputmode="numeric"></md-outlined-text-field></div>
      <div class="dimension-summary"><span id="aspect-preview" aria-hidden="true"></span><span id="aspect-ratio">4:3</span><span id="cell-total">1.200 casillas</span></div><p id="size-error" class="size-error" role="alert" hidden></p>
      <div class="field-hint">${icon('grid')} Cada casilla representa 5 pies / 1,5 m</div>
      <div class="seed-row"><md-outlined-text-field id="seed" label="Semilla del mundo" value="RC-7429" maxlength="120" spellcheck="false"></md-outlined-text-field>${iconButton('random-seed', 'dice', 'Elegir una nueva semilla')}</div>
      <div class="section-heading separated"><h2>Dale personalidad</h2><span class="step-number">03</span></div>
      <div class="slider-label"><label id="density-label">Vegetación y objetos</label><output id="density-value">62<span>%</span></output></div>
      <md-slider id="density" aria-labelledby="density-label" min="0" max="100" value="62" step="1"></md-slider>
      <div class="range-labels"><span>Despejado</span><span>Frondoso</span></div>
      <div class="slider-label second"><label id="complexity-label">Complejidad del terreno</label><output id="complexity-value">55<span>%</span></output></div>
      <md-slider id="complexity" aria-labelledby="complexity-label" min="0" max="100" value="55" step="1"></md-slider>
      <div class="range-labels"><span>Sereno</span><span>Intrincado</span></div>
      <div class="toggle-list"><label class="toggle-row"><span>${icon('water')} Ríos y lagunas</span><md-switch id="water" aria-label="Ríos y lagunas" selected></md-switch></label><label class="toggle-row"><span>${icon('flag')} Puntos de interés</span><md-switch id="landmarks" aria-label="Puntos de interés" selected></md-switch></label></div>
      <div class="world-note">${icon('sparkle')} Una semilla, un mundo único.<br><span>La aventura la escribes tú.</span></div>
    </section>
    <section id="assets-panel" class="panel-content" role="tabpanel" aria-labelledby="tab-assets" hidden>
      <div class="section-heading"><h2>Pequeños grandes detalles</h2><span id="asset-theme-label" class="theme-badge">Vanilla</span></div><p class="panel-description">Elige un objeto y colócalo sobre el mapa. Pulsa <kbd>R</kbd> para girarlo.</p>
      <md-outlined-text-field id="asset-search" label="Buscar objetos">${icon('search')}</md-outlined-text-field>
      <div class="asset-filters"><button class="active" data-category="all">Todos</button><button data-category="nature">Naturaleza</button><button data-category="adventure">Aventura</button></div>
      <div class="asset-grid">${ASSETS.map(a => `<button class="asset-card" data-asset="${a.id}" data-category="${a.category}" title="Colocar ${a.name}" aria-pressed="false"><img src="${assetUrl(a.id, 'vanilla')}" alt="" loading="lazy"/><span>${a.name}</span></button>`).join('')}</div><p id="no-assets" hidden>No hay objetos con ese nombre.</p>
      <div class="asset-size-controls"><label for="object-scale">Escala del objeto</label><md-slider id="object-scale" aria-label="Escala del objeto" min="50" max="180" value="100" step="10"></md-slider><div class="range-labels"><span>50 %</span><span id="object-scale-value">100 %</span><span>180 %</span></div></div>
    </section>
    <div class="sidebar-footer"><md-filled-button id="generate">${icon('sparkle', 'button-icon')} Generar mapa</md-filled-button><p>Generación procedural · Sin IA generativa</p></div>
  </aside>
  <main class="workspace">
    <div class="map-heading"><div class="map-heading-left">${iconButton('toggle-sidebar', 'menu', 'Abrir panel de creación')}<span class="map-type-icon">${icon('trees')}</span><div><div class="map-title-row"><h1 id="map-title">El bosque de los susurros</h1><span class="map-edited" hidden>Editado</span><span id="scenario-summary" class="scenario-summary" hidden></span></div><p><span id="map-biome">BOSQUE</span><span class="dot-separator">·</span><span id="map-dimensions">40 × 30 casillas</span><span class="dot-separator">·</span><span id="map-style">Ilustración natural</span></p></div></div><div class="view-toggles"><button id="grid-toggle" class="view-toggle active" aria-pressed="true" title="Mostrar cuadrícula (G)">${icon('grid')}<span>Cuadrícula</span></button><button id="light-toggle" class="view-toggle active" aria-pressed="true" title="Activar o desactivar ambientación">${icon('sun')}<span>Atmósfera</span></button></div></div>
    <div id="map-stage" class="map-stage">
      <canvas id="map-canvas" aria-label="Mapa de batalla. Usa los controles para desplazar, pintar terrenos o colocar objetos."></canvas>
      <div class="canvas-corner-label"><span class="live-dot"></span> LIENZO DE AVENTURA</div>
      <div class="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="20"/><path class="compass-fill" d="m30 3 6 23 21 4-21 5-6 22-5-22-22-5 22-4Z"/><path d="M30 3v54M3 30h54"/><circle cx="30" cy="30" r="3"/></svg></div>
      <div class="canvas-toolbar" role="toolbar" aria-label="Herramientas de edición">${iconButton('tool-pan', 'hand', 'Desplazar (V)', 'class="active" aria-pressed="true"')}${iconButton('tool-brush', 'brush', 'Pintar terreno (B)', 'aria-pressed="false"')}${iconButton('tool-place', 'trees', 'Colocar objetos', 'aria-pressed="false"')}${iconButton('tool-erase', 'eraser', 'Borrar objetos (E)', 'aria-pressed="false"')}<span class="tool-separator"></span>${iconButton('undo', 'undo', 'Deshacer (Ctrl+Z)', 'disabled')}${iconButton('redo', 'redo', 'Rehacer (Ctrl+Shift+Z)', 'disabled')}</div>
      <div id="brush-panel" class="brush-panel" hidden><span class="eyebrow" id="brush-title">PINTAR TERRENO</span><div class="terrain-swatches">${([['grass', 'Hierba', '#778456'], ['path', 'Sendero', '#b4a273'], ['water', 'Agua', '#568d85'], ['floor', 'Suelo de piedra', '#939381'], ['wall', 'Muro', '#42483e'], ['rock', 'Roca sólida', '#53645e']] as const).map(([id, label, color]) => `<button data-terrain="${id}" class="terrain-swatch ${id === 'grass' ? 'active' : ''}" style="--swatch:${color}" title="${label}" aria-label="${label}" aria-pressed="${id === 'grass'}"></button>`).join('')}</div><div class="brush-sizes"><span>Pincel</span>${[1, 2, 3].map(n => `<button data-brush="${n}" class="${n === 1 ? 'active' : ''}" aria-label="Pincel de ${n} casillas">${n}</button>`).join('')}</div></div>
      <div class="canvas-bottom"><div id="tool-hint" class="tool-hint">${icon('hand')} Arrastra para explorar <span>·</span> Rueda para acercar</div><div class="zoom-controls">${iconButton('zoom-out', 'minus', 'Alejar')}<button id="zoom-level" title="Ajustar mapa a la pantalla">100 %</button>${iconButton('zoom-in', 'plus', 'Acercar')}<span></span>${iconButton('fit-map', 'fit', 'Ajustar a la pantalla (F)')}</div></div>
      <div id="loading" class="loading-overlay"><div class="loading-card"><span class="loading-star">${icon('sparkle')}</span><h2>Dibujando otro mundo…</h2><p>Un lugar donde comienza una historia.</p><md-circular-progress indeterminate aria-label="Generando mapa"></md-circular-progress></div></div>
    </div>
    <footer class="status-bar"><div><span class="status-dot"></span><span id="save-status">Todo listo para la aventura</span></div><div class="status-details"><span id="object-count">0 objetos</span><span class="status-divider"></span><span id="cell-position">X — &nbsp; Y —</span><span class="status-divider"></span><button id="help-button">${icon('help')}<span>Atajos y ayuda</span></button></div></footer>
  </main>
</div>
<dialog id="export-dialog" class="modal"><div class="modal-top"><span class="eyebrow">DE TU IMAGINACIÓN A LA MESA</span>${iconButton('close-export', 'close', 'Cerrar exportación')}</div><h2>Tu aventura, lista para llevar.</h2><p class="modal-description">Una imagen de alta calidad para imprimir o llevar a tu mesa virtual favorita.</p><div class="export-preview"><img id="export-preview" alt="Vista previa del mapa actual"/><span id="export-map-name"></span></div><div class="export-fields"><md-outlined-select id="export-format" label="Formato">${option('png', 'PNG · Sin pérdida', true)}${option('jpeg', 'JPEG · Más ligero')}</md-outlined-select><md-outlined-select id="export-resolution" label="Píxeles por casilla">${option('50', '50 px · Ligero')}${option('100', '100 px · Recomendado', true)}${option('150', '150 px · Alta resolución')}</md-outlined-select></div><label class="toggle-row export-grid"><span>${icon('grid')} Incluir cuadrícula</span><md-switch id="export-grid" aria-label="Incluir cuadrícula en la imagen" selected></md-switch></label><p class="export-meta"><span id="export-dimensions">4000 × 3000 px</span><span>Sin marcas de agua</span></p><div class="modal-actions"><md-text-button id="cancel-export">Volver al mapa</md-text-button><md-filled-button id="download-image">${icon('download', 'button-icon')} Descargar imagen</md-filled-button></div><p id="export-error" class="export-error" role="alert" hidden></p><p class="export-note">La exportación usa el mapa completo, no el zoom de la vista.</p></dialog>
<dialog id="help-dialog" class="modal help-modal"><div class="modal-top"><span class="eyebrow">EL CUADERNO DEL CARTÓGRAFO</span>${iconButton('close-help', 'close', 'Cerrar ayuda')}</div><h2>Unas coordenadas para empezar.</h2><p class="modal-description">Configura un escenario y pulsa <strong>Generar mapa</strong>. La misma semilla y configuración producen el mismo mundo.</p><div class="shortcut-list">${[['V', 'Desplazar el lienzo'], ['B', 'Pintar terrenos'], ['E', 'Borrar objetos'], ['R', 'Girar el objeto seleccionado'], ['G', 'Mostrar u ocultar la cuadrícula'], ['F', 'Ajustar el mapa a la pantalla'], ['Ctrl Z', 'Deshacer'], ['Ctrl ⇧ Z', 'Rehacer']].map(([key, label]) => `<div><span>${label}</span><kbd>${key}</kbd></div>`).join('')}</div><p class="help-note">También puedes desplazar con Alt + arrastrar o el botón derecho. Los cambios se guardan en este navegador. Descarga el proyecto JSON para conservar una copia editable.</p><p class="help-note">Los objetos son decorativos: ajusta los pasos y coberturas según tu encuentro. Cada casilla equivale a 5 pies (aprox. 1,5 m).</p></dialog>
<dialog id="confirm-dialog" class="modal confirm-modal"><span class="eyebrow">ANTES DE SEGUIR</span><h2>¿Reemplazar este mundo?</h2><p>Se reemplazará el mapa y sus ediciones. Puedes guardar el proyecto JSON para conservar una copia.</p><div class="modal-actions"><md-text-button id="cancel-replace">Cancelar</md-text-button><md-filled-button id="confirm-replace">Reemplazar mapa</md-filled-button></div></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div><input id="project-input" type="file" accept=".json,application/json" hidden />`;

const view = new Viewport($('#map-canvas'));
let config: MapConfig = { ...DEFAULT_CONFIG };
let map: BattleMap;
let mapImage: HTMLCanvasElement;
let options: RenderOptions = { grid: true, gridOpacity: .22, atmosphere: true };
let terrain: Terrain = 'grass';
let busy = true;
let edited = false;
let assetsReady = false;
const undoStack: BattleMap[] = [], redoStack: BattleMap[] = [];
let strokeSnapshot: BattleMap | undefined;
let previousCell: { x: number; y: number } | undefined;
let renderTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
let category = 'all';
let pendingConfirm: (() => void) | undefined;
let pendingFit = true;
const worker = new Worker(new URL('./engine/generate.worker.ts', import.meta.url), { type: 'module' });

function toast(message: string): void { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3600); }
function setBusy(value: boolean, label = 'Dibujando otro mundo…'): void {
  busy = value; $('#loading').hidden = !value; $('#loading h2').textContent = label;
  for (const id of ['generate', 'open-export', 'open-project', 'save-project']) ($(`#${id}`) as Field).disabled = value;
  document.querySelectorAll<HTMLButtonElement>('.theme-card').forEach(button => button.disabled = value);
  updateDimensions();
}
function render(fit = false): void {
  if (!map || !assetsReady) return;
  clearTimeout(renderTimer); renderTimer = undefined;
  mapImage = renderMap(map, 56, options); view.setMap(map, mapImage, fit); updateStatus();
}
function scheduleRender(): void { if (!renderTimer) renderTimer = setTimeout(() => render(), 100); }
function saveLocal(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); $('#save-status').textContent = 'Guardado en este navegador'; }
  catch { $('#save-status').textContent = 'Sin guardado local · Descarga tu proyecto'; }
}
function updateStatus(): void {
  $('#map-title').textContent = map.name;
  $('#map-biome').textContent = BIOMES[map.config.biome].name.toUpperCase();
  $('#map-dimensions').textContent = `${map.config.width} × ${map.config.height} casillas`;
  $('#map-style').textContent = `${THEMES[map.config.theme].name} · ${aspectRatio(map.config.width, map.config.height)}`;
  $('.map-type-icon').innerHTML = icon(BIOMES[map.config.biome].icon);
  $('#object-count').textContent = `${map.objects.length} objetos`;
  $('#scenario-summary').hidden = map.config.biome !== 'dungeon' || !map.rooms;
  $('#scenario-summary').textContent = map.rooms ? `${map.rooms.length} ${map.rooms.length === 1 ? 'cuarto' : 'cuartos'}` : '';
  $('#scenario-summary').title = 'Cuartos de la generación original; la edición manual no recalcula este conteo.';
  $('.map-edited').hidden = !edited;
  ($('#undo') as Field).disabled = !undoStack.length;
  ($('#redo') as Field).disabled = !redoStack.length;
}
function syncControls(): void {
  document.querySelectorAll<HTMLElement>('[data-biome]').forEach(el => { const active = el.dataset.biome === config.biome; el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
  const size = `${config.width}x${config.height}`;
  ($('#map-size') as Field).value = SIZE_PRESETS.some(p => p.value === size) ? size : 'custom';
  ($('#map-width') as Field).value = String(config.width); ($('#map-height') as Field).value = String(config.height);
  ($('#rooms-auto') as Toggle).selected = config.roomCount === 0;
  if (config.roomCount > 0) ($('#room-count') as Field).value = String(config.roomCount);
  ($('#forest-paths') as Checkbox).checked = config.forestPaths;
  ($('#forest-branches') as Checkbox).checked = config.forestBranches;
  ($('#forest-dead-ends') as Checkbox).checked = config.forestDeadEnds;
  updateDimensions(); syncThemeUI();
  ($('#seed') as Field).value = config.seed;
  ($('#density') as Slider).value = config.density; ($('#complexity') as Slider).value = config.complexity;
  $('#density-value').innerHTML = `${config.density}<span>%</span>`; $('#complexity-value').innerHTML = `${config.complexity}<span>%</span>`;
  ($('#water') as Toggle).selected = config.water; ($('#water') as Toggle).disabled = config.biome === 'dungeon';
  ($('#landmarks') as Toggle).selected = config.landmarks;
  $('#density-label').textContent = config.biome === 'forest' ? 'Vegetación y objetos' : config.biome === 'dungeon' ? 'Muebles y objetos' : 'Rocas y objetos';
}
function syncThemeUI(): void {
  const theme = config.theme;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLElement>('.theme-card').forEach(el => { const active = el.dataset.theme === theme; el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
  $('#theme-description').textContent = THEMES[theme].description;
  $('#asset-theme-label').textContent = THEMES[theme].name;
  document.querySelectorAll<HTMLElement>('[data-asset]').forEach(el => { el.querySelector('img')!.src = assetUrl(el.dataset.asset!, theme); });
  document.querySelectorAll<HTMLElement>('[data-biome]').forEach(el => { const id = el.dataset.biome === 'forest' ? 'tree-oak' : el.dataset.biome === 'cave' ? 'crystal' : 'pillar'; el.querySelector('img')!.src = assetUrl(id, theme); });
  document.querySelectorAll<HTMLElement>('[data-terrain]').forEach(el => { el.style.setProperty('--swatch', THEMES[theme].swatches[el.dataset.terrain as Terrain]); });
  $('#forest-options').style.setProperty('--preview-ground', THEMES[theme].swatches.grass);
  $('#forest-options').style.setProperty('--preview-road', THEMES[theme].swatches.path);
}
function updateDimensions(): void {
  const width = Number(($('#map-width') as Field).value), height = Number(($('#map-height') as Field).value);
  const error = dimensionsError(width, height);
  $('#size-error').hidden = !error; $('#size-error').textContent = error ?? '';
  const roomError = config.biome === 'dungeon' && !($('#rooms-auto') as Toggle).selected && !error ? roomCountError(width, height, Number(($('#room-count') as Field).value)) : undefined;
  $('#room-error').textContent = roomError ?? ''; $('#room-error').hidden = !roomError;
  ($('#generate') as Field).disabled = busy || !!error || !!roomError;
  $('#dungeon-options').hidden = config.biome !== 'dungeon'; $('#forest-options').hidden = config.biome !== 'forest';
  const maximum = maxRoomCount(width, height);
  $('#room-count').setAttribute('max', String(maximum));
  ($('#room-count') as Field).disabled = busy || ($('#rooms-auto') as Toggle).selected;
  $('#room-limit').textContent = `De 1 a ${maximum} cuartos en este tamaño. Cada cuarto tiene al menos 4 × 4 casillas. La opción manual respeta la cantidad exacta.`;
  updatePathControls();
  $('#aspect-ratio').textContent = aspectRatio(width, height);
  $('#cell-total').textContent = error ? `${MIN_SIDE}–${MAX_SIDE} por lado · máx. 6.400` : `${(width * height).toLocaleString('es')} casillas`;
  const ratio = error ? 1 : width / height;
  $('#aspect-preview').style.width = `${Math.min(30, 20 * ratio)}px`;
  $('#aspect-preview').style.height = `${Math.min(20, 30 / ratio)}px`;
}
function updatePathControls(): void {
  const enabled = ($('#forest-paths') as Checkbox).checked;
  document.querySelectorAll<HTMLButtonElement>('[data-path-layout]').forEach(button => {
    const selected = button.dataset.pathLayout === config.forestPathLayout;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); button.disabled = busy || !enabled;
  });
  ($('#forest-branches') as Checkbox).disabled = busy || !enabled;
  ($('#forest-dead-ends') as Checkbox).disabled = busy || !enabled;
  $('#path-description').textContent = enabled ? PATH_LAYOUTS.find(p => p.id === config.forestPathLayout)!.description : 'Sin senderos. El bosque mantiene su terreno, agua y decoración natural.';
}
function readConfig(): MapConfig {
  const width = Number(($('#map-width') as Field).value), height = Number(($('#map-height') as Field).value);
  let seed = ($('#seed') as Field).value.trim();
  if (!seed) { seed = freshSeed(); ($('#seed') as Field).value = seed; }
  const count = ($('#rooms-auto') as Toggle).selected ? 0 : Number(($('#room-count') as Field).value);
  return { ...config, width, height, seed, density: Number(($('#density') as Slider).value), complexity: Number(($('#complexity') as Slider).value), water: ($('#water') as Toggle).selected, landmarks: ($('#landmarks') as Toggle).selected,
    roomCount: Number.isInteger(count) && count >= 0 && count <= MAX_ROOMS ? count : 0,
    forestPaths: ($('#forest-paths') as Checkbox).checked, forestBranches: ($('#forest-branches') as Checkbox).checked, forestDeadEnds: ($('#forest-dead-ends') as Checkbox).checked };
}
function requestGenerate(): void {
  if (busy) return;
  const next = readConfig();
  const error = dimensionsError(next.width, next.height) ?? (next.biome === 'dungeon' && !($('#rooms-auto') as Toggle).selected ? roomCountError(next.width, next.height, Number(($('#room-count') as Field).value)) : undefined) ?? scenarioOptionsError(next);
  if (error) { toast(error); return; }
  const run = () => { config = next; pendingFit = !map || map.config.width !== config.width || map.config.height !== config.height; setBusy(true); worker.postMessage(config); $('.sidebar').classList.remove('mobile-open'); };
  if (edited) confirmReplace(run); else run();
}
function confirmReplace(action: () => void): void { pendingConfirm = action; ($('#confirm-dialog') as HTMLDialogElement).showModal(); }
worker.onmessage = async (e: MessageEvent<{ map?: BattleMap; error?: string }>) => {
  try {
    if (e.data.error || !e.data.map) throw new Error(e.data.error);
    map = e.data.map; config = { ...map.config }; edited = false; undoStack.length = 0; redoStack.length = 0;
    await new Promise(resolve => setTimeout(resolve, 30));
    render(pendingFit); saveLocal(); setBusy(false); syncControls();
  } catch (error) { setBusy(false); toast(error instanceof Error ? error.message : 'No se pudo generar el mapa.'); }
};
worker.onerror = () => { setBusy(false); toast('No se pudo iniciar el generador. Recarga la página e inténtalo de nuevo.'); };

function selectTab(which: 'world' | 'assets'): void {
  for (const name of ['world', 'assets']) { $(`#${name}-panel`).hidden = which !== name; $(`#tab-${name}`).classList.toggle('active', which === name); $(`#tab-${name}`).setAttribute('aria-selected', String(which === name)); }
}
function setTool(tool: Tool): void {
  view.setTool(tool);
  for (const t of ['pan', 'brush', 'place', 'erase']) { $(`#tool-${t}`).classList.toggle('active', t === tool); $(`#tool-${t}`).setAttribute('aria-pressed', String(t === tool)); }
  $('#brush-panel').hidden = tool !== 'brush' && tool !== 'erase';
  $('.terrain-swatches').hidden = tool === 'erase'; $('#brush-title').textContent = tool === 'erase' ? 'BORRAR OBJETOS' : 'PINTAR TERRENO';
  if (tool === 'place') { selectTab('assets'); }
  const hints: Record<Tool, string> = { pan: `${icon('hand')} Arrastra para explorar <span>·</span> Rueda para acercar`, brush: `${icon('brush')} Arrastra para pintar <span>·</span> Ctrl Z para deshacer`, erase: `${icon('eraser')} Arrastra para borrar objetos <span>·</span> No borra terreno`, place: `${icon('trees')} Clic para colocar <span>·</span> R para girar` };
  $('#tool-hint').innerHTML = hints[tool];
}
function pushUndo(snapshot: BattleMap): void { undoStack.push(snapshot); if (undoStack.length > 30) undoStack.shift(); redoStack.length = 0; }
function restoreHistory(redo = false): void {
  if (busy || !map) return;
  const from = redo ? redoStack : undoStack, to = redo ? undoStack : redoStack;
  const snapshot = from.pop(); if (!snapshot) return;
  to.push(structuredClone(map)); map = snapshot; config.theme = map.config.theme; syncThemeUI(); edited = true; render(); saveLocal();
}
function paintCell(x: number, y: number): void {
  const w = map.config.width, h = map.config.height, size = view.brushSize, shift = Math.floor(size / 2);
  if (view.tool === 'brush') {
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
      const xx = x + dx - shift, yy = y + dy - shift;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) map.terrain[yy * w + xx] = terrain;
    }
  } else if (view.tool === 'erase') {
    map.objects = map.objects.filter(o => Math.hypot(o.x - x - .5, o.y - y - .5) > Math.max(size * .6, o.scale * .36));
  }
}
view.onEdit = (x, y) => {
  if (busy || !map) return;
  if (!strokeSnapshot) { strokeSnapshot = structuredClone(map); previousCell = undefined; }
  if (view.tool === 'place') {
    if (map.objects.length >= 20_000) { toast('El mapa ya tiene el máximo de objetos.'); return; }
    map.objects.push({ id: crypto.randomUUID(), asset: view.selectedAsset, x: x + .5, y: y + .5, rotation: view.rotation, scale: view.assetScale });
  } else {
    if (previousCell) { const steps = Math.max(Math.abs(x - previousCell.x), Math.abs(y - previousCell.y)); for (let i = 0; i <= steps; i++) paintCell(Math.round(previousCell.x + (x - previousCell.x) * i / Math.max(1, steps)), Math.round(previousCell.y + (y - previousCell.y) * i / Math.max(1, steps))); }
    else paintCell(x, y);
    previousCell = { x, y };
  }
  edited = true; scheduleRender();
};
view.onEditEnd = () => { if (strokeSnapshot) { pushUndo(strokeSnapshot); strokeSnapshot = undefined; previousCell = undefined; render(); saveLocal(); } };
view.onZoom = z => { $('#zoom-level').textContent = `${Math.round(z * 100)} %`; };
view.onHover = (x, y) => { $('#cell-position').textContent = map && x >= 0 && y >= 0 && x < map.config.width && y < map.config.height ? `X ${String(x + 1).padStart(2, '0')}   Y ${String(y + 1).padStart(2, '0')}` : 'X —   Y —'; };

document.querySelectorAll<HTMLElement>('.theme-card').forEach(el => el.addEventListener('click', () => {
  if (busy) return;
  const theme = el.dataset.theme as Theme;
  if (theme === config.theme) return;
  if (map) { pushUndo(structuredClone(map)); map.config.theme = theme; }
  config.theme = theme; syncThemeUI(); render(); if (map) saveLocal();
  toast(`${THEMES[theme].name}: mapa, objetos y pinceles actualizados. Tus ediciones se conservan.`);
}));
$('#map-size').addEventListener('change', () => {
  const value = ($('#map-size') as Field).value;
  if (value !== 'custom') { const [w, h] = value.split('x'); ($('#map-width') as Field).value = w; ($('#map-height') as Field).value = h; }
  updateDimensions();
});
for (const id of ['map-width', 'map-height']) $(`#${id}`).addEventListener('input', () => { ($('#map-size') as Field).value = 'custom'; updateDimensions(); });
$('#swap-dimensions').addEventListener('click', () => {
  const w = ($('#map-width') as Field).value; ($('#map-width') as Field).value = ($('#map-height') as Field).value; ($('#map-height') as Field).value = w;
  const size = `${($('#map-width') as Field).value}x${($('#map-height') as Field).value}`;
  ($('#map-size') as Field).value = SIZE_PRESETS.some(p => p.value === size) ? size : 'custom'; updateDimensions();
});
$('#rooms-auto').addEventListener('change', updateDimensions);
$('#room-count').addEventListener('input', updateDimensions);
$('#forest-paths').addEventListener('change', updatePathControls);
document.querySelectorAll<HTMLElement>('[data-path-layout]').forEach(button => button.addEventListener('click', () => {
  config.forestPathLayout = button.dataset.pathLayout as ForestPathLayout; updatePathControls();
}));
$('.path-layouts').addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-path-layout]')].filter(b => !b.disabled);
  const index = buttons.indexOf(event.target as HTMLButtonElement); if (index < 0) return;
  const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -3 : 3;
  const target = buttons[(index + step + buttons.length) % buttons.length]; target.focus(); target.click(); event.preventDefault();
});
$('#generate').addEventListener('click', requestGenerate);
$('#random-seed').addEventListener('click', () => { ($('#seed') as Field).value = freshSeed(); toast('Nueva semilla lista. Pulsa Generar mapa para explorarla.'); });
document.querySelectorAll<HTMLElement>('[data-biome]').forEach(el => el.addEventListener('click', () => { config = readConfig(); config.biome = el.dataset.biome as Biome; syncControls(); }));
for (const id of ['density', 'complexity']) $(`#${id}`).addEventListener('input', () => { $(`#${id}-value`).innerHTML = `${Number(($(`#${id}`) as Slider).value)}<span>%</span>`; });
$('#tab-world').addEventListener('click', () => selectTab('world'));
$('#tab-assets').addEventListener('click', () => selectTab('assets'));
$('.panel-tabs').addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const which = $('#tab-world').getAttribute('aria-selected') === 'true' ? 'assets' : 'world'; selectTab(which); $(`#tab-${which}`).focus(); e.preventDefault(); } });
for (const tool of ['pan', 'brush', 'erase', 'place'] as const) $(`#tool-${tool}`).addEventListener('click', () => setTool(tool));
$('#undo').addEventListener('click', () => restoreHistory()); $('#redo').addEventListener('click', () => restoreHistory(true));
$('#zoom-in').addEventListener('click', () => view.zoomBy(1.25)); $('#zoom-out').addEventListener('click', () => view.zoomBy(.8));
$('#fit-map').addEventListener('click', () => view.fit()); $('#zoom-level').addEventListener('click', () => view.fit());
function toggleGrid(): void { options.grid = !options.grid; $('#grid-toggle').classList.toggle('active', options.grid); $('#grid-toggle').setAttribute('aria-pressed', String(options.grid)); render(); }
$('#grid-toggle').addEventListener('click', toggleGrid);
$('#light-toggle').addEventListener('click', () => { options.atmosphere = !options.atmosphere; $('#light-toggle').classList.toggle('active', options.atmosphere); $('#light-toggle').setAttribute('aria-pressed', String(options.atmosphere)); render(); });
document.querySelectorAll<HTMLElement>('[data-terrain]').forEach(el => el.addEventListener('click', () => { terrain = el.dataset.terrain as Terrain; document.querySelectorAll<HTMLElement>('[data-terrain]').forEach(t => { t.classList.toggle('active', t === el); t.setAttribute('aria-pressed', String(t === el)); }); }));
document.querySelectorAll<HTMLElement>('[data-brush]').forEach(el => el.addEventListener('click', () => { view.brushSize = Number(el.dataset.brush); document.querySelectorAll<HTMLElement>('[data-brush]').forEach(t => t.classList.toggle('active', t === el)); }));
document.querySelectorAll<HTMLElement>('[data-asset]').forEach(el => el.addEventListener('click', () => { view.selectedAsset = el.dataset.asset as AssetId; view.assetScale = ASSET_SIZES[view.selectedAsset] * Number(($('#object-scale') as Slider).value) / 100; document.querySelectorAll<HTMLElement>('[data-asset]').forEach(t => { t.classList.toggle('selected', t === el); t.setAttribute('aria-pressed', String(t === el)); }); setTool('place'); if (window.innerWidth < 760) { $('.sidebar').classList.remove('mobile-open'); toast('Objeto seleccionado. Toca el mapa para colocarlo.'); } }));
$('#object-scale').addEventListener('input', () => { const scale = Number(($('#object-scale') as Slider).value); view.assetScale = ASSET_SIZES[view.selectedAsset] * scale / 100; $('#object-scale-value').textContent = `${scale} %`; view.draw(); });
function filterAssets(): void {
  const query = ($('#asset-search') as Field).value.toLocaleLowerCase('es'); let found = 0;
  document.querySelectorAll<HTMLElement>('[data-asset]').forEach(el => { const a = ASSETS.find(a => a.id === el.dataset.asset)!; const show = (category === 'all' || category === a.category) && a.name.toLocaleLowerCase('es').includes(query); el.hidden = !show; if (show) found++; }); $('#no-assets').hidden = found > 0;
}
$('#asset-search').addEventListener('input', filterAssets);
document.querySelectorAll<HTMLElement>('.asset-filters [data-category]').forEach(el => el.addEventListener('click', () => { category = el.dataset.category!; document.querySelectorAll<HTMLElement>('.asset-filters button').forEach(t => t.classList.toggle('active', t === el)); filterAssets(); }));
$('#toggle-sidebar').addEventListener('click', () => $('.sidebar').classList.toggle('mobile-open'));
$('#close-sidebar').addEventListener('click', () => $('.sidebar').classList.remove('mobile-open'));
$('#help-button').addEventListener('click', () => ($('#help-dialog') as HTMLDialogElement).showModal());
$('#close-help').addEventListener('click', () => ($('#help-dialog') as HTMLDialogElement).close());
$('#cancel-replace').addEventListener('click', () => { pendingConfirm = undefined; ($('#confirm-dialog') as HTMLDialogElement).close(); });
$('#confirm-replace').addEventListener('click', () => { ($('#confirm-dialog') as HTMLDialogElement).close(); const action = pendingConfirm; pendingConfirm = undefined; action?.(); });

function download(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
function filename(): string { return map.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
$('#save-project').addEventListener('click', () => { if (!map) return; download(new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' }), `${filename()}.${map.config.theme}.rc.json`); toast('Proyecto guardado. Puedes volver a abrirlo para editarlo.'); });
$('#open-project').addEventListener('click', () => ($('#project-input') as HTMLInputElement).click());
$('#project-input').addEventListener('change', async () => {
  const input = $('#project-input') as HTMLInputElement, file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('El archivo supera el límite de 5 MB.');
    const loaded = parseMap(await file.text());
    const apply = () => { map = loaded; config = { ...loaded.config }; edited = true; undoStack.length = 0; redoStack.length = 0; syncControls(); render(true); saveLocal(); toast('Proyecto abierto. Tu aventura continúa.'); };
    if (edited) confirmReplace(apply); else apply();
  } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo abrir el proyecto.'); }
  input.value = '';
});

let previewUrl: string | undefined;
$('#open-export').addEventListener('click', async () => {
  if (!map || busy) return;
  ($('#export-grid') as Toggle).selected = options.grid;
  $('#export-error').hidden = true;
  if (map.config.width * map.config.height * Number(($('#export-resolution') as Field).value) ** 2 > 40_000_000) ($('#export-resolution') as Field).value = '50';
  $('#export-map-name').textContent = map.name;
  const preview = document.createElement('canvas'); preview.width = 640; preview.height = Math.round(640 * mapImage.height / mapImage.width); preview.getContext('2d')!.drawImage(mapImage, 0, 0, preview.width, preview.height);
  const blob = await new Promise<Blob | null>(resolve => preview.toBlob(resolve));
  if (blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    const image = $('#export-preview') as HTMLImageElement; image.src = previewUrl;
    try { await image.decode(); } catch { /* The map can still be exported without its thumbnail. */ }
  }
  updateExportMeta(); const dialog = $('#export-dialog') as HTMLDialogElement; if (!dialog.open) dialog.showModal();
});
function updateExportMeta(): void {
  if (!map) return;
  const size = Number(($('#export-resolution') as Field).value);
  $('#export-dimensions').textContent = `${map.config.width * size} × ${map.config.height * size} px`;
}
$('#export-resolution').addEventListener('change', () => { updateExportMeta(); $('#export-error').hidden = true; });
$('#export-grid').addEventListener('change', () => {
  const preview = renderMap(map, 16, { ...options, grid: ($('#export-grid') as Toggle).selected });
  preview.toBlob(blob => { if (blob) { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(blob); ($('#export-preview') as HTMLImageElement).src = previewUrl; } });
});
for (const id of ['close-export', 'cancel-export']) $(`#${id}`).addEventListener('click', () => ($('#export-dialog') as HTMLDialogElement).close());
$('#download-image').addEventListener('click', async () => {
  const button = $('#download-image') as Field; button.disabled = true; $('#export-error').hidden = true;
  try {
    const tile = Number(($('#export-resolution') as Field).value), format = ($('#export-format') as Field).value;
    const pixels = map.config.width * tile * map.config.height * tile;
    if (pixels > 40_000_000) throw new Error('Esta resolución es muy grande. Elige 100 o 50 px por casilla (máximo 40 megapíxeles).');
    button.textContent = 'Preparando imagen…'; await new Promise(resolve => setTimeout(resolve, 50));
    const exported = renderMap(map, tile, { ...options, grid: ($('#export-grid') as Toggle).selected });
    const blob = await new Promise<Blob>((resolve, reject) => exported.toBlob(b => b ? resolve(b) : reject(new Error('El navegador no pudo exportar esta resolución. Prueba con una menor.')), `image/${format}`, .94));
    download(blob, `${filename()}-${map.config.theme}-${map.config.width}x${map.config.height}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    exported.width = 1; exported.height = 1;
    ($('#export-dialog') as HTMLDialogElement).close(); toast('Mapa exportado. Que empiece la aventura.');
  } catch (error) { $('#export-error').textContent = error instanceof Error ? error.message : 'No se pudo exportar la imagen.'; $('#export-error').hidden = false; }
  finally { button.disabled = false; button.innerHTML = `${icon('download', 'button-icon')} Descargar imagen`; }
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });

document.addEventListener('keydown', e => {
  if (busy || document.querySelector('dialog[open]')) return;
  if (e.composedPath().some(el => el instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT', 'MD-SLIDER', 'MD-OUTLINED-SELECT', 'MD-OUTLINED-TEXT-FIELD'].includes(el.tagName) || el.isContentEditable))) return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); restoreHistory(e.shiftKey); return; }
  if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); restoreHistory(true); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (key === 'v') setTool('pan'); else if (key === 'b') setTool('brush'); else if (key === 'e') setTool('erase'); else if (key === 'g') toggleGrid(); else if (key === 'f') view.fit(); else if (key === 'r') { view.rotation += Math.PI / 4; view.draw(); toast(`Rotación: ${Math.round(view.rotation * 180 / Math.PI) % 360}°`); } else if (key === '+' || key === '=') view.zoomBy(1.25); else if (key === '-') view.zoomBy(.8);
});

async function init(): Promise<void> {
  setBusy(true);
  try {
    await loadAssets(); assetsReady = true;
    let restored: BattleMap | undefined;
    try { const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY); if (saved) restored = parseMap(saved); } catch { /* Invalid or unavailable browser storage is not fatal. */ }
    if (restored) { map = restored; config = { ...map.config }; edited = true; syncControls(); render(true); setBusy(false); saveLocal(); }
    else { worker.postMessage(config); }
  } catch { setBusy(false); $('#save-status').textContent = 'No se pudieron cargar las ilustraciones'; toast('No se pudieron cargar los assets. Comprueba la conexión y recarga la página.'); }
}
void init();
