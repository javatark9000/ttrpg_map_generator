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
import { ASSETS, ASSET_SIZES, BIOMES, DEFAULT_CONFIG, BUILDING_BIOMES, isBuildingBiome } from './engine/types';
import type { AssetId, BattleMap, Biome, MapConfig, RenderOptions, Terrain, Theme, ForestPathLayout, VillageLayout } from './engine/types';
import { THEMES, THEME_IDS, assetUrl } from './engine/themes';
import { SIZE_PRESETS, MIN_SIDE, MAX_SIDE, dimensionsError, aspectRatio } from './engine/dimensions';
import { PATH_LAYOUTS, VILLAGE_LAYOUTS, generationOptionsError } from './engine/scenario-options';
import { freshSeed } from './engine/random';
import { loadAssets, renderMap } from './engine/render';
import { createAnimatedScene, hasAnimation } from './engine/animation';
import { gifDimensions } from './engine/animation-settings';
import { parseMap, STORAGE_KEY, LEGACY_STORAGE_KEY } from './engine/storage';
import { activeLayerData } from './engine/map-layers';
import { Viewport } from './viewport';
import type { Tool } from './viewport';
import { icon } from './icons';
import { ASSET_FAMILIES, ASSET_FAMILY_MEMBERSHIP, DEFAULT_ASSET_FAMILY } from './asset-families';
import type { AssetFamilyId } from './asset-families';
import { DEFAULT_LIGHTING } from './engine/lighting-settings';
import type { LightingSettings } from './engine/lighting-settings';
import { lightingPanel, bindLightingControls, syncLightingControls } from './lighting-panel';
import './style.css';
import './themes.css';
import './scenario-controls.css';
import './animation.css';
import './expanded-worlds.css';

type Field = HTMLElement & { value: string; disabled: boolean };
type Toggle = HTMLElement & { selected: boolean; disabled: boolean };
type Slider = HTMLElement & { value: number };
type Checkbox = HTMLElement & { checked: boolean; disabled: boolean };
type NumberField = Field & { validity: ValidityState; validationMessage: string; error: boolean; errorText: string };
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const option = (value: string, label: string, selected = false) => `<md-select-option value="${value}" ${selected ? 'selected' : ''}><div slot="headline">${label}</div></md-select-option>`;
const iconButton = (id: string, name: string, title: string, extra = '') => `<md-icon-button id="${id}" title="${title}" aria-label="${title}" ${extra}>${icon(name)}</md-icon-button>`;
const parseCount = (id: string): number => {
  const value = ($(`#${id}`) as Field).value.trim();
  return value === '' ? Number.NaN : Number(value);
};

$('#app').innerHTML = `
<a class="skip-link" href="#map-canvas">Saltar al mapa</a>
<header class="app-header">
  ${iconButton('toggle-sidebar', 'menu', 'Abrir panel del editor', 'aria-controls="editor-sidebar" aria-expanded="false"')}
  <div class="brand" aria-label="RC map generator"><span class="brand-name">RC</span><span class="brand-caption">map generator</span></div>
  <div class="header-actions">
    ${iconButton('open-project', 'folder', 'Abrir proyecto JSON')}
    ${iconButton('save-project', 'save', 'Guardar proyecto JSON')}
    <button id="open-export" class="primary-button">${icon('download', 'button-icon')}<span>Exportar</span></button>
  </div>
</header>
<div class="app-layout">
  <aside id="editor-sidebar" class="sidebar" aria-label="Editor de mapas">
    <div class="sidebar-top"><h2 class="sidebar-title">Editor de mapas</h2>${iconButton('close-sidebar', 'close', 'Cerrar panel')}</div>
    <div class="panel-tabs" role="tablist" aria-label="Panel del editor"><button id="tab-world" class="panel-tab active" role="tab" aria-selected="true" aria-controls="world-panel">${icon('map')} Crear mundo</button><button id="tab-assets" class="panel-tab" role="tab" aria-selected="false" tabindex="-1" aria-controls="assets-panel">${icon('layers')} Objetos <span>${ASSETS.length}</span></button><button id="tab-lighting" class="panel-tab" role="tab" aria-selected="false" tabindex="-1" aria-controls="lighting-panel">${icon('sun')} Iluminación</button></div>
    <section id="world-panel" class="panel-content" role="tabpanel" aria-labelledby="tab-world">
      <div class="section-heading"><h2>Escenario</h2></div>
      <div class="biome-list" role="group" aria-label="Escenario para generar">${Object.entries(BIOMES).map(([key, b]) => `<button class="biome-card ${key === 'forest' ? 'selected' : ''}" data-biome="${key}" aria-pressed="${key === 'forest'}" title="${b.subtitle}"><span class="biome-art ${key}"><img src="${assetUrl(b.art, 'vanilla')}" alt=""/></span><span class="biome-info"><strong>${b.name}</strong></span><span class="biome-check">${icon('check')}</span></button>`).join('')}</div>
      <p class="scenario-hint">El escenario y sus opciones se aplican al pulsar Generar mapa.</p>
      <div class="section-heading separated"><h2>Temática del mundo</h2></div>
      <div class="theme-picker" role="group" aria-label="Temática del mundo">${THEME_IDS.map(theme => `<button class="theme-card ${theme === 'vanilla' ? 'selected' : ''}" data-theme="${theme}" aria-pressed="${theme === 'vanilla'}" title="${THEMES[theme].description}"><img src="${assetUrl('tree-oak', theme)}" alt=""/><span>${THEMES[theme].name}</span></button>`).join('')}</div>
      <p id="theme-description" class="theme-description">${THEMES.vanilla.description}</p>
      <p class="scenario-hint">El tema cambia el mapa actual sin regenerarlo. Los objetos manuales conservan su estilo.</p>
      <div class="section-heading separated"><h2>Dimensiones</h2></div>
      <md-outlined-select id="map-size" label="Formato del mapa">${SIZE_PRESETS.map(p => option(p.value, p.label, p.value === '40x30')).join('')}${option('custom', 'Personalizado · Ancho y alto libres')}</md-outlined-select>
      <div class="dimension-fields"><md-outlined-text-field id="map-width" type="number" label="Ancho" value="40" min="${MIN_SIDE}" max="${MAX_SIDE}" step="1" inputmode="numeric" aria-describedby="size-error"></md-outlined-text-field>${iconButton('swap-dimensions', 'redo', 'Intercambiar ancho y alto')}<md-outlined-text-field id="map-height" type="number" label="Alto" value="30" min="${MIN_SIDE}" max="${MAX_SIDE}" step="1" inputmode="numeric" aria-describedby="size-error"></md-outlined-text-field></div>
      <div class="dimension-summary"><span id="aspect-preview" aria-hidden="true"></span><span id="aspect-ratio">4:3</span><span id="cell-total">1.200 casillas</span></div><p id="size-error" class="size-error" role="alert" hidden></p>
      <p class="field-hint">${icon('grid')} Cada casilla representa 5 pies / 1,5 m</p>
      <section id="house-status-options" class="scenario-options" aria-label="Estatus general de las viviendas" hidden>
        <md-outlined-select id="house-status" label="Estatus general de las casas">${option('poor','Humildes')}${option('common','Comunes',true)}${option('wealthy','Acomodadas')}</md-outlined-select>
        <p class="scenario-hint">Determina el aspecto general de las viviendas. Pueblo usa además su distribución porcentual propia.</p>
      </section>
      <section id="dungeon-options" class="scenario-options" aria-label="Distribución de la mazmorra" hidden>
        <div class="section-heading"><h2>Cuartos por tamaño</h2>${icon('castle')}</div>
        <label class="toggle-row"><span>Cantidad automática</span><md-switch id="rooms-auto" aria-label="Cantidad automática de cuartos" selected></md-switch></label>
        <div id="legacy-room-count" class="legacy-room-count" role="status" hidden><strong id="legacy-room-label"></strong><span>Configuración de un proyecto anterior, sin distribución por tamaños.</span><md-text-button id="replace-legacy-rooms">Configurar por tamaños</md-text-button></div>
        <div class="scenario-number-grid" id="dungeon-room-counts">
          <md-outlined-text-field id="dungeon-rooms-small" label="Pequeños · 4–8" type="number" inputmode="numeric" min="0" max="40" step="1" value="4"></md-outlined-text-field>
          <md-outlined-text-field id="dungeon-rooms-medium" label="Medianos · 9–12" type="number" inputmode="numeric" min="0" max="40" step="1" value="2"></md-outlined-text-field>
          <md-outlined-text-field id="dungeon-rooms-large" label="Grandes · 13+" type="number" inputmode="numeric" min="0" max="40" step="1" value="1"></md-outlined-text-field>
        </div>
        <p class="scenario-hint">Tamaño según el lado interior más corto: 4–8, 9–12 o 13+ casillas. El formulario comprueba límites básicos; la distribución exacta BSP se comprueba al generar, sin reducir cuotas.</p>
      </section>
      <section id="cave-options" class="scenario-options" aria-label="Simas de la caverna" hidden>
        <div class="section-heading"><h2>Simas y pasos naturales</h2>${icon('mountain')}</div>
        <md-outlined-select id="cave-chasms" label="Simas">${option('none','Sin simas',true)}${option('safe','Con rodeo seguro')}${option('dividing','Pueden dividir la cueva')}</md-outlined-select>
        <label class="toggle-row"><span>Puentes naturales</span><md-switch id="cave-natural-bridges" aria-label="Puentes naturales en las simas"></md-switch></label>
        <p class="scenario-hint">Las simas son terreno vacío no transitable. En modo seguro siempre existe una ruta alternativa.</p>
      </section>
      <section id="ruins-options" class="scenario-options" aria-label="Configuración de las ruinas" hidden>
        <div class="slider-label"><label id="decay-label">Deterioro</label><output id="decay-value">55<span>%</span></output></div>
        <md-slider id="ruin-decay" aria-labelledby="decay-label" min="0" max="100" value="55" step="1"></md-slider><div class="range-labels"><span>Muros en pie</span><span>Derrumbado</span></div>
        <div class="scenario-control-grid"><md-outlined-select id="ruin-layout" label="Distribución">${option('grid','Cuadrícula')}${option('courtyard','Patio central')}${option('scattered','Dispersa')}${option('random','Aleatoria',true)}</md-outlined-select><md-outlined-select id="ruin-features" label="Elementos">${option('simple','Simples')}${option('standard','Estándar',true)}${option('monumental','Monumentales')}</md-outlined-select></div>
        <label class="toggle-row"><span>Accesos secretos decorativos</span><md-switch id="ruin-secret-passages" aria-label="Accesos secretos decorativos"></md-switch></label>
        <p class="scenario-hint">Escaleras, niveles y accesos secretos son señales visuales; no crean plantas o corredores ocultos.</p>
      </section>
      <section id="village-options" class="scenario-options" aria-label="Distribución del pueblo" hidden>
        <div class="scenario-control-grid"><md-outlined-select id="village-layout" label="Trazado del pueblo">${VILLAGE_LAYOUTS.map(l=>option(l.id,l.name,l.id==='square')).join('')}</md-outlined-select><md-outlined-select id="village-block-size" label="Tamaño de cuadras">${option('small','Pequeñas')}${option('mixed','Mixtas',true)}${option('large','Grandes')}</md-outlined-select></div>
        <fieldset class="scenario-fieldset"><legend>Estatus de viviendas · total 100 %</legend><div class="scenario-number-grid"><md-outlined-text-field id="village-wealth-poor" label="Humildes %" type="number" min="0" max="100" value="30"></md-outlined-text-field><md-outlined-text-field id="village-wealth-common" label="Comunes %" type="number" min="0" max="100" value="50"></md-outlined-text-field><md-outlined-text-field id="village-wealth-wealthy" label="Acomodadas %" type="number" min="0" max="100" value="20"></md-outlined-text-field></div></fieldset>
        <fieldset class="scenario-fieldset"><legend>Edificios singulares obligatorios</legend><div class="scenario-check-grid"><label class="scenario-check"><md-checkbox id="village-require-market"></md-checkbox><span>Mercado</span></label><label class="scenario-check"><md-checkbox id="village-require-tavern"></md-checkbox><span>Taberna</span></label><label class="scenario-check"><md-checkbox id="village-require-temple"></md-checkbox><span>Templo</span></label><label class="scenario-check"><md-checkbox id="village-require-ranch"></md-checkbox><span>Rancho</span></label></div></fieldset>
        <p class="scenario-hint">Sin selección, los edificios singulares se colocan automáticamente si hay espacio. Mercado y plaza pueden compartir parcela.</p>
      </section>
      <section id="mountain-options" class="scenario-options" aria-label="Paisaje de montaña" hidden>
        <label class="toggle-row"><span>${icon('mountain')} Nieve en las cumbres</span><md-switch id="mountain-snow" aria-label="Nieve en las cumbres" selected></md-switch></label>
        <label class="toggle-row"><span>Generar camino</span><md-switch id="mountain-paths" aria-label="Generar camino de montaña" selected></md-switch></label>
        <md-outlined-select id="mountain-path-layout" label="Forma del camino">${option('pass','Paso',true)}${option('switchback','Zigzag')}${option('ridge','Cresta')}${option('fork','Bifurcación')}${option('random','Aleatoria')}</md-outlined-select>
        <md-outlined-text-field id="mountain-cave-entrances" label="Entradas de cueva" type="number" inputmode="numeric" min="0" max="40" step="1" value="0"></md-outlined-text-field>
        <p class="scenario-hint">Las cuevas son accesos independientes. Sin camino se conserva terreno natural conectado.</p>
      </section>
      <section id="city-options" class="scenario-options" aria-label="Configuración de la ciudad" hidden>
        <div class="slider-label"><label id="city-density-label">Densidad de edificios</label><output id="city-density-value">80<span>%</span></output></div><md-slider id="city-density" aria-labelledby="city-density-label" min="0" max="100" value="80" step="1"></md-slider>
        <div class="slider-label second"><label id="city-balance-label">Comercio en los distritos</label><output id="city-balance-value">35<span>%</span></output></div><md-slider id="city-district-balance" aria-labelledby="city-balance-label" min="0" max="100" value="35" step="1"></md-slider>
        <div class="scenario-control-grid"><md-outlined-select id="city-alleys" label="Callejones">${option('none','Ninguno')}${option('few','Pocos',true)}${option('many','Muchos')}</md-outlined-select><md-outlined-select id="city-street-width" label="Ancho de calles">${option('narrow','Estrechas')}${option('standard','Estándar',true)}${option('wide','Anchas')}</md-outlined-select></div>
        <label class="toggle-row"><span>Accesos de alcantarilla</span><md-switch id="city-sewers" aria-label="Accesos visibles de alcantarilla" selected></md-switch></label><label class="toggle-row"><span>Murallas urbanas</span><md-switch id="city-walls" aria-label="Murallas urbanas"></md-switch></label>
      </section>
      <section id="house-options" class="scenario-options" aria-label="Distribución de la casa" hidden>
        <md-outlined-select id="house-layout" label="Plantilla de la casa">${option('compact','Compacta')}${option('corridor','Con pasillo')}${option('courtyard','Con patio')}${option('random','Aleatoria',true)}</md-outlined-select>
        <label class="toggle-row"><span>Dormitorios automáticos</span><md-switch id="house-bedrooms-auto" aria-label="Cantidad automática de dormitorios" selected></md-switch></label>
        <md-outlined-text-field id="house-bedrooms" label="Cantidad de dormitorios" type="number" inputmode="numeric" min="1" max="40" step="1" value="2"></md-outlined-text-field>
        <md-text-button id="compact-house">Interior compacto · 24 × 18</md-text-button>
      </section>
      <section id="tavern-options" class="scenario-options" aria-label="Configuración de la taberna" hidden>
        <md-outlined-select id="tavern-condition" label="Estado del salón">${option('ordered','Ordenado',true)}${option('messy','Pelea reciente')}</md-outlined-select>
        <label class="toggle-row"><span>Escaleras a planta superior</span><md-switch id="tavern-upper-stairs" aria-label="Escaleras a planta superior"></md-switch></label>
      </section>
      <section id="inn-options" class="scenario-options" aria-label="Configuración de la posada" hidden>
        <md-outlined-text-field id="inn-room-count" label="Habitaciones para huéspedes" type="number" inputmode="numeric" min="1" max="40" step="1" value="4"></md-outlined-text-field>
        <label class="toggle-row"><span>Escaleras a planta superior</span><md-switch id="inn-upper-stairs" aria-label="Escaleras a planta superior"></md-switch></label>
        <p class="scenario-hint">Total entre todas las plantas; no incluye recepción ni servicios. Las habitaciones pueden ser individuales, dobles o familiares.</p>
      </section>
      <section id="smithy-options" class="scenario-options" aria-label="Configuración de la herrería" hidden>
        <md-outlined-select id="smithy-forge-layout" label="Posición del horno">${option('wall','Contra la pared',true)}${option('central','Central')}</md-outlined-select>
        <md-outlined-text-field id="smithy-extra-room-count" label="Habitaciones adicionales" type="number" inputmode="numeric" min="0" max="40" step="1" value="0"></md-outlined-text-field>
        <p class="scenario-hint">Taller, recepción y almacén siempre están incluidos.</p>
      </section>
      <section id="temple-options" class="scenario-options" aria-label="Configuración del templo" hidden>
        <md-outlined-select id="temple-style" label="Estilo arquitectónico">${option('roman','Basílica romana',true)}${option('mosque','Mezquita')}${option('synagogue','Sinagoga')}${option('mandir','Mandir')}${option('pagoda','Pagoda')}</md-outlined-select>
        <label class="toggle-row"><span>Solo gran salón</span><md-switch id="temple-main-hall-only" aria-label="Generar únicamente el gran salón" selected></md-switch></label><label class="toggle-row"><span>Habitaciones secretas</span><md-switch id="temple-secret-rooms" aria-label="Habitaciones secretas"></md-switch></label>
        <md-outlined-select id="temple-transition" label="Transición de nivel">${option('none','Sin otra planta',true)}${option('upper','Planta superior')}${option('basement','Sótano')}</md-outlined-select>
      </section>
      <section id="warehouse-options" class="scenario-options" aria-label="Configuración del almacén" hidden>
        <div class="slider-label"><label id="warehouse-fill-label">Volumen de mercancía</label><output id="warehouse-fill-value">65<span>%</span></output></div><md-slider id="warehouse-fill" aria-labelledby="warehouse-fill-label" min="0" max="100" value="65" step="1"></md-slider>
        <md-outlined-select id="warehouse-shelf-layout" label="Distribución de estantes">${option('parallel','Filas paralelas')}${option('perimeter','Perimetral')}${option('mixed','Mixta',true)}${option('random','Aleatoria')}</md-outlined-select>
      </section>
      <section id="library-options" class="scenario-options" aria-label="Configuración de la biblioteca" hidden><p class="scenario-hint">La biblioteca conserva por ahora su distribución clásica, con ventanas decorativas y escalas revisadas.</p></section>
      <section id="barracks-options" class="scenario-options" aria-label="Configuración del cuartel" hidden>
        <md-outlined-select id="barracks-bed-layout" label="Disposición de literas">${option('walls','Junto a muros')}${option('perpendicular','Perpendiculares')}${option('rows','En filas',true)}${option('random','Aleatoria')}</md-outlined-select>
        <div class="slider-label"><label id="barracks-contents-label">Volumen de equipo</label><output id="barracks-contents-value">60<span>%</span></output></div><md-slider id="barracks-contents" aria-labelledby="barracks-contents-label" min="0" max="100" value="60" step="1"></md-slider>
      </section>
      <section id="forest-options" class="scenario-options" aria-label="Caminos del bosque">
        <div class="section-heading"><h2>Diseña el recorrido</h2>${icon('map')}</div>
        <label class="scenario-check"><md-checkbox id="forest-paths" aria-label="Generar caminos" checked></md-checkbox><span>Generar caminos</span></label>
        <md-outlined-select id="forest-river-direction" label="Orientación del río">${option('none','Sin río')}${option('random','Aleatoria',true)}${option('north-south','Norte–sur')}${option('east-west','Este–oeste')}${option('diagonal-nw-se','Diagonal NO–SE')}${option('diagonal-ne-sw','Diagonal NE–SO')}</md-outlined-select>
        <div class="path-layouts" role="group" aria-label="Trazado principal">${PATH_LAYOUTS.map(layout => `<button class="path-card ${layout.id === 'meander' ? 'selected' : ''}" data-path-layout="${layout.id}" aria-pressed="${layout.id === 'meander'}" aria-label="${layout.name}: ${layout.description}" title="${layout.description}"><svg viewBox="0 0 100 64" aria-hidden="true"><rect width="100" height="64" rx="6" class="path-thumb-ground"/><path d="M20 0V64M40 0V64M60 0V64M80 0V64M0 16H100M0 32H100M0 48H100" class="path-thumb-grid"/><g class="path-thumb-trees"><circle cx="12" cy="12" r="6"/><circle cx="89" cy="51" r="7"/><circle cx="14" cy="53" r="5"/></g><path d="${layout.preview}" class="path-thumb-edge"/><path d="${layout.preview}" class="path-thumb-road"/></svg><span>${layout.name}</span></button>`).join('')}</div>
        <p id="path-description" class="scenario-hint">${PATH_LAYOUTS[0].description}</p>
        <label class="scenario-check"><md-checkbox id="forest-branches" aria-label="Caminos alternos"></md-checkbox><span>Caminos alternos<small>Desvíos que vuelven a la ruta principal</small></span></label>
        <label class="scenario-check"><md-checkbox id="forest-dead-ends" aria-label="Callejones sin salida"></md-checkbox><span>Callejones sin salida<small>Ramales que terminan dentro del bosque</small></span></label>
        <p class="scenario-hint subtle">Miniaturas orientativas. La semilla y la complejidad dan forma a las curvas.</p>
      </section>
      <div class="section-heading separated"><h2>Distribución y semilla</h2></div>
      <div class="seed-row"><md-outlined-text-field id="seed" label="Semilla del mundo" value="RC-7429" maxlength="120" spellcheck="false"></md-outlined-text-field>${iconButton('random-seed', 'dice', 'Elegir una nueva semilla')}</div>
      <div id="general-density-control"><div class="slider-label"><label id="density-label">Vegetación y objetos</label><output id="density-value">62<span>%</span></output></div>
      <md-slider id="density" aria-labelledby="density-label" min="0" max="100" value="62" step="1"></md-slider>
      <div class="range-labels"><span>Despejado</span><span>Frondoso</span></div></div>
      <div id="complexity-control"><div class="slider-label second"><label id="complexity-label">Complejidad del terreno</label><output id="complexity-value">55<span>%</span></output></div>
      <md-slider id="complexity" aria-labelledby="complexity-label" min="0" max="100" value="55" step="1"></md-slider>
      <div class="range-labels"><span>Sereno</span><span>Intrincado</span></div></div>
      <div class="toggle-list"><label class="toggle-row"><span>${icon('water')} Ríos y lagunas</span><md-switch id="water" aria-label="Ríos y lagunas" selected></md-switch></label><label class="toggle-row"><span>${icon('flag')} Puntos de interés</span><md-switch id="landmarks" aria-label="Puntos de interés" selected></md-switch></label></div>
      <label class="toggle-row" title="Efecto opcional en la vista animada y el GIF; no cambia PNG/JPEG ni el proyecto."><span>${icon('sparkle')} Setas bioluminiscentes</span><md-switch id="bioluminescence" aria-label="Setas bioluminiscentes"></md-switch></label><p class="scenario-hint">Opcional · solo en la vista animada y el GIF.</p>
    </section>
    <section id="assets-panel" class="panel-content" role="tabpanel" aria-labelledby="tab-assets" hidden>
      <div class="asset-browser-controls">
        <div class="section-heading"><h2>Objetos</h2><span id="asset-theme-label" class="theme-badge">Vanilla</span></div>
        <md-outlined-select id="object-theme" label="Estilo visual del objeto">${THEME_IDS.map(theme => option(theme, THEMES[theme].name, theme === 'vanilla')).join('')}</md-outlined-select>
        <p class="scenario-hint">Las próximas colocaciones conservarán este estilo al cambiar el tema del mundo.</p>
        <md-outlined-text-field id="asset-search" label="Buscar en todas las familias">${icon('search')}</md-outlined-text-field>
        <button id="clear-asset-search" class="text-button" hidden>Limpiar búsqueda</button>
        <md-outlined-select id="asset-family" label="Familia">${ASSET_FAMILIES.map(family => option(family.id, family.name, family.id === DEFAULT_ASSET_FAMILY[DEFAULT_CONFIG.biome])).join('')}</md-outlined-select>
        <p id="asset-results-label" class="asset-results-label" role="status" aria-live="polite"></p>
      </div>
      <div class="asset-results">
        <div class="asset-grid">${ASSETS.map(a => `<button class="asset-card ${a.id === 'tree-oak' ? 'selected' : ''}" data-asset="${a.id}" title="Colocar ${a.name}" aria-pressed="${a.id === 'tree-oak'}" hidden><img src="${assetUrl(a.id, 'vanilla')}" alt="" loading="lazy"/><span class="asset-name">${a.name}</span><span class="asset-groups" hidden>${ASSET_FAMILY_MEMBERSHIP[a.id].map(id => ASSET_FAMILIES.find(family => family.id === id)!.name).join(' · ')}</span></button>`).join('')}</div>
        <p id="no-assets" class="empty-state" hidden>No hay objetos que coincidan. Prueba otro nombre o limpia la búsqueda.</p>
      </div>
      <div class="asset-placement">
        <div class="placement-summary"><span>Próxima colocación</span><strong id="selected-asset-name">Roble</strong></div>
        <div class="asset-size-controls"><label for="object-scale">Escala del objeto</label><md-slider id="object-scale" aria-label="Escala del objeto" min="25" max="400" value="100" step="5"></md-slider><div class="range-labels"><span>25 %</span><span id="object-scale-value">100 %</span><span>400 %</span></div></div>
        <div class="asset-rotation"><button id="rotate-object" class="secondary-button compact">${icon('redo')} Girar 45°</button><output id="object-rotation" aria-label="Rotación de la próxima colocación" aria-live="polite">0°</output></div>
      </div>
    </section>
    ${lightingPanel()}
    <div id="generate-footer" class="sidebar-footer"><p id="scenario-error" class="size-error scenario-error" role="alert" hidden></p><button id="generate" class="primary-button" aria-describedby="size-error scenario-error">${icon('sparkle', 'button-icon')} Generar mapa</button></div>
  </aside>
  <main id="main" class="workspace" aria-labelledby="map-title">
    <div class="map-heading">
      <div class="map-heading-left"><h1 id="map-title">Mapa de batalla</h1></div>
      <div class="map-view-actions"><label id="layer-picker" class="layer-picker" hidden><span>Planta</span><select id="active-layer" aria-label="Planta activa"><option value="0">Planta baja</option></select></label><div class="view-toggles"><button id="grid-toggle" class="view-toggle active" aria-pressed="true" aria-label="Cuadrícula" title="Mostrar cuadrícula (G)">${icon('grid')}<span>Cuadrícula</span></button><button id="light-toggle" class="view-toggle active" aria-pressed="true" aria-label="Atmósfera" title="Activar o desactivar ambientación">${icon('sun')}<span>Atmósfera</span></button><button id="animation-toggle" class="view-toggle active" aria-pressed="true" aria-label="Animación" title="Pausar o reanudar las animaciones">${icon('water')}<span>Animación</span></button></div></div>
    </div>
    <div id="operation-error" class="operation-error" hidden><p id="operation-error-message" role="alert"></p>${iconButton('dismiss-operation-error', 'close', 'Ocultar mensaje de error')}</div>
    <div id="map-stage" class="map-stage">
      <canvas id="map-canvas" tabindex="0" aria-label="Mapa de batalla" aria-describedby="map-keyboard-help"></canvas>
      <p id="map-keyboard-help" class="sr-only">V para desplazar, B para pintar, E para borrar objetos, R para girar la próxima colocación, G para cuadrícula, F para ajustar. Más y menos cambian el zoom. Las herramientas también están disponibles como botones.</p>
      <div class="canvas-toolbar" role="toolbar" aria-label="Herramientas de edición">${iconButton('tool-pan', 'hand', 'Desplazar (V)', 'class="active" aria-pressed="true"')}${iconButton('tool-brush', 'brush', 'Pintar terreno (B)', 'aria-pressed="false"')}${iconButton('tool-place', 'trees', 'Colocar objetos', 'aria-pressed="false"')}${iconButton('tool-erase', 'eraser', 'Borrar objetos (E)', 'aria-pressed="false"')}<span class="tool-separator"></span>${iconButton('undo', 'undo', 'Deshacer (Ctrl+Z)', 'disabled')}${iconButton('redo', 'redo', 'Rehacer (Ctrl+Shift+Z)', 'disabled')}</div>
      <div id="brush-panel" class="brush-panel" hidden><div class="brush-heading"><span class="eyebrow" id="brush-title">Pintar terreno</span>${iconButton('close-brush', 'close', 'Cerrar paleta')}</div><p id="terrain-name" class="terrain-name" aria-live="polite">Hierba</p><div class="terrain-swatches">${([['grass', 'Hierba', '#778456'], ['path', 'Sendero', '#b4a273'], ['water', 'Agua', '#568d85'], ['floor', 'Suelo de piedra', '#939381'], ['wall', 'Muro', '#42483e'], ['rock', 'Roca sólida', '#53645e'], ['sand', 'Arena', '#aba16a'], ['wood', 'Suelo de madera', '#987143'], ['snow', 'Nieve', '#d1ddd7'], ['gravel', 'Grava', '#888e7f'], ['void', 'Sima / vacío', '#090b12']] as const).map(([id, label, color]) => `<button data-terrain="${id}" class="terrain-swatch ${id === 'grass' ? 'active' : ''}" style="--swatch:${color}" title="${label}" aria-label="${label}" aria-pressed="${id === 'grass'}"></button>`).join('')}</div><div class="brush-sizes"><span>Pincel</span>${[1, 2, 3].map(n => `<button data-brush="${n}" class="${n === 1 ? 'active' : ''}" aria-label="Pincel de ${n} casillas" aria-pressed="${n === 1}">${n}</button>`).join('')}</div></div>
      <div class="canvas-bottom"><div id="tool-hint" class="tool-hint">${icon('hand')} Arrastra para explorar <span>·</span> Rueda para acercar</div><div class="zoom-controls">${iconButton('zoom-out', 'minus', 'Alejar')}<button id="zoom-level" title="Ajustar mapa a la pantalla" aria-label="Zoom 100 %. Ajustar mapa a la pantalla">100 %</button>${iconButton('zoom-in', 'plus', 'Acercar')}<span></span>${iconButton('fit-map', 'fit', 'Ajustar a la pantalla (F)')}</div></div>
      <div id="loading" class="loading-overlay" role="status" aria-live="polite"><div class="loading-card"><h2>Cargando ilustraciones…</h2><md-circular-progress indeterminate aria-label="Operación en curso"></md-circular-progress></div></div>
    </div>
    <footer class="status-bar">
      <div class="status-project"><span class="map-edited" hidden>Editado</span><span id="save-status" role="status">Listo</span></div>
      <div class="status-map"><span id="map-biome"></span><span id="map-dimensions"></span><span id="map-style"></span><span id="scenario-summary" class="scenario-summary" hidden></span><span id="object-count">0 objetos</span></div>
      <div class="status-details"><span id="cell-position">X — &nbsp; Y —</span><button id="help-button" aria-label="Atajos y ayuda">${icon('help')}<span>Ayuda</span></button></div>
    </footer>
  </main>
</div>
<dialog id="export-dialog" class="modal" aria-labelledby="export-title">
  <div class="modal-heading"><h2 id="export-title">Exportar mapa</h2>${iconButton('close-export', 'close', 'Cerrar exportación')}</div>
  <div class="export-preview"><img id="export-preview" alt="Vista previa de la planta que se exportará"/><span id="export-map-name"></span></div>
  <div class="export-fields"><md-outlined-select id="export-format" label="Formato">${option('png', 'PNG · Sin pérdida', true)}${option('jpeg', 'JPEG · Más ligero')}${option('gif', 'GIF · Animado en bucle')}</md-outlined-select><md-outlined-select id="export-resolution" label="Píxeles por casilla">${option('25', '25 px · GIF ligero')}${option('50', '50 px · Ligero')}${option('100', '100 px · Recomendado', true)}${option('150', '150 px · Alta resolución')}</md-outlined-select></div>
  <label class="toggle-row export-grid"><span>${icon('grid')} Incluir cuadrícula</span><md-switch id="export-grid" aria-label="Incluir cuadrícula en la imagen" selected></md-switch></label>
  <p class="export-meta"><span id="export-dimensions">4000 × 3000 px</span><span>Sin marcas de agua</span></p>
  <p id="gif-note" class="export-note" hidden></p>
  <div id="gif-progress" role="status" aria-live="polite" hidden><progress id="gif-progress-bar" max="24" value="0" aria-label="Progreso de exportación GIF"></progress><span id="gif-progress-text"></span></div>
  <div class="modal-actions"><md-text-button id="cancel-export">Volver al mapa</md-text-button><button id="download-image" class="primary-button">${icon('download', 'button-icon')} Descargar imagen</button></div>
  <p id="export-error" class="export-error" role="alert" hidden></p>
  <p class="export-note">Se exporta la planta activa completa, no el zoom de la vista. El proyecto JSON conserva todas las plantas.</p>
</dialog>
<dialog id="help-dialog" class="modal help-modal" aria-labelledby="help-title">
  <div class="modal-heading"><h2 id="help-title">Atajos y ayuda</h2>${iconButton('close-help', 'close', 'Cerrar ayuda')}</div>
  <p class="modal-description">Configura un escenario y pulsa <strong>Generar mapa</strong>. La misma semilla y configuración producen el mismo mapa. La generación es procedural, sin IA generativa.</p>
  <div class="shortcut-list">${[['V', 'Desplazar el lienzo'], ['B', 'Pintar terrenos'], ['E', 'Borrar objetos'], ['R', 'Girar la próxima colocación 45°'], ['G', 'Mostrar u ocultar la cuadrícula'], ['F', 'Ajustar el mapa a la pantalla'], ['+ / −', 'Cambiar zoom'], ['Ctrl/Cmd Z', 'Deshacer'], ['Ctrl/Cmd ⇧ Z', 'Rehacer'], ['Ctrl/Cmd Y', 'Rehacer']].map(([key, label]) => `<div><span>${label}</span><kbd>${key}</kbd></div>`).join('')}</div>
  <p class="help-note">También puedes desplazar con Alt + arrastrar o los botones central y derecho. En Objetos, el selector muestra una familia cada vez y la búsqueda abarca todas. Un objeto compartido aparece en sus distintas familias.</p>
  <p class="help-note">Los cambios se guardan en este navegador cuando el almacenamiento está disponible. Descarga el proyecto JSON para conservar una copia editable de todas las plantas.</p>
  <p class="help-note">Los objetos son decorativos. Cada casilla equivale a 5 pies (aprox. 1,5 m). La colocación y pintura sobre el canvas requieren un dispositivo de puntero.</p>
</dialog>
<dialog id="confirm-dialog" class="modal confirm-modal" aria-labelledby="confirm-title">
  <h2 id="confirm-title">¿Reemplazar el mapa?</h2>
  <p>Se reemplazarán el mapa y sus ediciones. Guarda el proyecto JSON si quieres conservarlos.</p>
  <div class="modal-actions"><button id="cancel-replace" class="secondary-button" autofocus>Cancelar</button><button id="confirm-replace" class="danger-button">Reemplazar mapa</button></div>
</dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div><input id="project-input" type="file" accept=".json,application/json" hidden />`;

const view = new Viewport($('#map-canvas'));
void document.fonts.ready.then(() => view.draw());
let config: MapConfig = structuredClone(DEFAULT_CONFIG);
let map: BattleMap;
let mapImage: HTMLCanvasElement;
let objectTheme: Theme = config.theme;
view.selectedTheme = objectTheme;
let manualDungeonRooms = { small: 4, medium: 2, large: 1 };
let legacyRoomCount: number | undefined;
let manualHouseBedrooms = 2;
let options: RenderOptions = { grid: true, gridOpacity: .22, atmosphere: true };
let animationEnabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let terrain: Terrain = 'grass';
let busy = true;
let edited = false;
let assetsReady = false;
const undoStack: BattleMap[] = [], redoStack: BattleMap[] = [];
let strokeSnapshot: BattleMap | undefined;
let lightingSnapshot: BattleMap | undefined;
let previousCell: { x: number; y: number } | undefined;
let renderTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
let assetFamily: AssetFamilyId | undefined;
const compactLayout = matchMedia('(max-width: 900px)');
let openSelect: HTMLElement | undefined;
let pendingConfirm: (() => void) | undefined;
let pendingFit = true;
let skipNextLocalSave = false;
const worker = new Worker(new URL('./engine/generate.worker.ts', import.meta.url), { type: 'module' });

function toast(message: string): void { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3600); }
function showOperationError(message: string): void {
  $('#operation-error-message').textContent = message;
  $('#operation-error').hidden = false;
}
function setBusy(value: boolean, label = 'Generando mapa…'): void {
  busy = value; $('#loading').hidden = !value; $('#loading h2').textContent = label;
  $('#world-panel').inert = value;
  $('#map-stage').setAttribute('aria-busy', String(value));
  for (const id of ['generate', 'open-export', 'open-project', 'save-project']) ($(`#${id}`) as Field).disabled = value;
  document.querySelectorAll<HTMLButtonElement>('.theme-card').forEach(button => button.disabled = value);
  updateDimensions(); syncLightingControls(map, busy);
}
function render(fit = false): void {
  if (!map || !assetsReady) return;
  clearTimeout(renderTimer); renderTimer = undefined;
  view.setAnimation();
  mapImage = renderMap(map, 56, options); view.setMap(map, mapImage, fit); updateAnimation(); updateStatus();
}
function updateAnimation(): void {
  $('#animation-toggle').classList.toggle('active', animationEnabled);
  $('#animation-toggle').setAttribute('aria-pressed', String(animationEnabled));
  $('#animation-toggle').title = animationEnabled ? 'Pausar las animaciones' : 'Reanudar las animaciones';
  view.setAnimation(map && assetsReady && animationEnabled && hasAnimation(map, options)
    ? createAnimatedScene(map, gifDimensions(map.config.width, map.config.height, 56).tile, options) : undefined);
}
$('#animation-toggle').addEventListener('click', () => { animationEnabled = !animationEnabled; updateAnimation(); });
$('#bioluminescence').addEventListener('change', () => {
  options.bioluminescence = ($('#bioluminescence') as Toggle).selected; updateAnimation();
});
function scheduleRender(): void { if (!renderTimer) renderTimer = setTimeout(() => render(), 100); }
function serializeProject(): string {
  const json = JSON.stringify(map);
  if (new Blob([json]).size > 5_000_000) {
    throw new Error('El proyecto supera el límite de 5 MB. Reduce plantas u objetos antes de guardarlo.');
  }
  return json;
}
function saveLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProject());
    $('#save-status').textContent = 'Guardado en este navegador';
  } catch (error) {
    $('#save-status').textContent = error instanceof Error ? error.message : 'Sin guardado local · Descarga tu proyecto';
  }
}
function syncLayerSelector(): void {
  const select = $('#active-layer') as HTMLSelectElement;
  const layers = [{ name: 'Planta baja', elevation: 0 }, ...(map.layers ?? [])];
  const labels = layers.map(layer => `${layer.name}${layer.elevation ? ` · ${layer.elevation > 0 ? '+' : ''}${layer.elevation}` : ''}`);
  // Painting and lighting redraw frequently; keep the open selector's DOM intact.
  if (select.options.length !== labels.length || labels.some((label, index) => select.options[index].text !== label)) {
    select.replaceChildren(...labels.map((label, index) => new Option(label, String(index))));
  }
  select.value = String(map.activeLayer ?? 0);
  $('#layer-picker').hidden = layers.length < 2;
}
function updateStatus(): void {
  const layer = activeLayerData(map);
  $('#map-title').textContent = map.name;
  $('#map-biome').textContent = BIOMES[map.config.biome].name;
  $('#map-dimensions').textContent = `${map.config.width} × ${map.config.height} casillas`;
  $('#map-style').textContent = `${THEMES[map.config.theme].name} · ${aspectRatio(map.config.width, map.config.height)}`;
  $('#object-count').textContent = `${layer.objects.length} objetos`;
  $('#object-count').title = 'Objetos de la planta activa';
  $('#scenario-summary').hidden = map.config.biome !== 'dungeon' || !layer.rooms;
  $('#scenario-summary').textContent = layer.rooms ? `${layer.rooms.length} ${layer.rooms.length === 1 ? 'cuarto' : 'cuartos'}` : '';
  $('#scenario-summary').title = 'Cuartos de la planta activa; la edición manual no recalcula este conteo.';
  syncLayerSelector();
  $('.map-edited').hidden = !edited;
  ($('#undo') as Field).disabled = !undoStack.length;
  ($('#redo') as Field).disabled = !redoStack.length;
  if (!$('#assets-panel').hidden && assetFamily === undefined) {
    assetFamily = DEFAULT_ASSET_FAMILY[map.config.biome];
    filterAssets();
  }
}
function syncControls(): void {
  document.querySelectorAll<HTMLElement>('[data-biome]').forEach(element => {
    const active = element.dataset.biome === config.biome;
    element.classList.toggle('selected', active);
    element.setAttribute('aria-pressed', String(active));
  });

  const size = `${config.width}x${config.height}`;
  ($('#map-size') as Field).value = SIZE_PRESETS.some(preset => preset.value === size) ? size : 'custom';
  ($('#map-width') as Field).value = String(config.width);
  ($('#map-height') as Field).value = String(config.height);
  ($('#seed') as Field).value = config.seed;
  ($('#density') as Slider).value = config.density;
  ($('#complexity') as Slider).value = config.complexity;
  $('#density-value').innerHTML = `${config.density}<span>%</span>`;
  $('#complexity-value').innerHTML = `${config.complexity}<span>%</span>`;
  ($('#water') as Toggle).selected = config.water;
  ($('#water') as Toggle).disabled = config.biome === 'dungeon' || config.biome === 'city' || isBuildingBiome(config.biome);
  ($('#landmarks') as Toggle).selected = config.landmarks;
  ($('#house-status') as Field).value = config.houseStatus;

  ($('#forest-river-direction') as Field).value = config.forestRiverDirection;
  ($('#forest-paths') as Checkbox).checked = config.forestPaths;
  ($('#forest-branches') as Checkbox).checked = config.forestBranches;
  ($('#forest-dead-ends') as Checkbox).checked = config.forestDeadEnds;

  legacyRoomCount = config.dungeonRooms === null && config.roomCount > 0 ? config.roomCount : undefined;
  const dungeonAuto = config.dungeonRooms === null && legacyRoomCount === undefined;
  ($('#rooms-auto') as Toggle).selected = dungeonAuto;
  if (config.dungeonRooms) manualDungeonRooms = { ...config.dungeonRooms };
  for (const key of ['small', 'medium', 'large'] as const) {
    ($(`#dungeon-rooms-${key}`) as Field).value = String((config.dungeonRooms ?? manualDungeonRooms)[key]);
  }

  ($('#cave-chasms') as Field).value = config.caveChasms;
  ($('#cave-natural-bridges') as Toggle).selected = config.caveNaturalBridges;
  ($('#ruin-decay') as Slider).value = config.ruinDecay;
  $('#decay-value').innerHTML = `${config.ruinDecay}<span>%</span>`;
  ($('#ruin-layout') as Field).value = config.ruinLayout;
  ($('#ruin-features') as Field).value = config.ruinFeatures;
  ($('#ruin-secret-passages') as Toggle).selected = config.ruinSecretPassages;

  ($('#village-layout') as Field).value = config.villageLayout;
  ($('#village-block-size') as Field).value = config.villageBlockSize;
  for (const key of ['poor', 'common', 'wealthy'] as const) {
    ($(`#village-wealth-${key}`) as Field).value = String(config.villageWealth[key]);
  }
  for (const id of ['market', 'tavern', 'temple', 'ranch'] as const) {
    ($(`#village-require-${id}`) as Checkbox).checked = config.villageRequiredBuildings.includes(id);
  }

  ($('#mountain-snow') as Toggle).selected = config.mountainSnow;
  ($('#mountain-paths') as Toggle).selected = config.mountainPaths;
  ($('#mountain-path-layout') as Field).value = config.mountainPathLayout;
  ($('#mountain-cave-entrances') as Field).value = String(config.mountainCaveEntrances);

  ($('#city-density') as Slider).value = config.cityDensity;
  $('#city-density-value').innerHTML = `${config.cityDensity}<span>%</span>`;
  ($('#city-district-balance') as Slider).value = config.cityDistrictBalance;
  $('#city-balance-value').innerHTML = `${config.cityDistrictBalance}<span>%</span>`;
  ($('#city-alleys') as Field).value = config.cityAlleys;
  ($('#city-street-width') as Field).value = config.cityStreetWidth;
  ($('#city-sewers') as Toggle).selected = config.citySewers;
  ($('#city-walls') as Toggle).selected = config.cityWalls;

  ($('#house-layout') as Field).value = config.houseLayout;
  const bedroomsAuto = config.houseBedrooms === 0;
  ($('#house-bedrooms-auto') as Toggle).selected = bedroomsAuto;
  if (!bedroomsAuto) manualHouseBedrooms = config.houseBedrooms;
  ($('#house-bedrooms') as Field).value = String(bedroomsAuto ? manualHouseBedrooms : config.houseBedrooms);

  ($('#tavern-condition') as Field).value = config.tavernCondition;
  ($('#tavern-upper-stairs') as Toggle).selected = config.tavernUpperStairs;
  ($('#inn-room-count') as Field).value = String(config.innRoomCount);
  ($('#inn-upper-stairs') as Toggle).selected = config.innUpperStairs;
  ($('#smithy-forge-layout') as Field).value = config.smithyForgeLayout;
  ($('#smithy-extra-room-count') as Field).value = String(config.smithyExtraRoomCount);
  ($('#temple-style') as Field).value = config.templeStyle;
  ($('#temple-main-hall-only') as Toggle).selected = config.templeMainHallOnly;
  ($('#temple-secret-rooms') as Toggle).selected = config.templeSecretRooms;
  ($('#temple-transition') as Field).value = config.templeTransition;
  ($('#warehouse-fill') as Slider).value = config.warehouseFill;
  $('#warehouse-fill-value').innerHTML = `${config.warehouseFill}<span>%</span>`;
  ($('#warehouse-shelf-layout') as Field).value = config.warehouseShelfLayout;
  ($('#barracks-bed-layout') as Field).value = config.barracksBedLayout;
  ($('#barracks-contents') as Slider).value = config.barracksContents;
  $('#barracks-contents-value').innerHTML = `${config.barracksContents}<span>%</span>`;

  $('#density-label').textContent = config.biome === 'village'
    ? 'Ocupación del pueblo'
    : config.biome === 'city'
      ? 'Decoración urbana'
      : isBuildingBiome(config.biome) || config.biome === 'dungeon'
        ? 'Muebles y objetos'
        : ['forest', 'ruins'].includes(config.biome) ? 'Vegetación y objetos' : 'Rocas y objetos';
  updateDimensions();
  syncThemeUI();
  syncLightingControls(map, busy);
}
function syncObjectThemeUI(): void {
  ($('#object-theme') as Field).value = objectTheme;
  $('#asset-theme-label').textContent = THEMES[objectTheme].name;
  document.querySelectorAll<HTMLElement>('[data-asset]').forEach(el => { el.querySelector('img')!.src = assetUrl(el.dataset.asset!, objectTheme); });
  view.selectedTheme = objectTheme;
  view.draw();
}
function syncThemeUI(): void {
  const theme = config.theme;
  document.querySelectorAll<HTMLElement>('.theme-card').forEach(el => { const active = el.dataset.theme === theme; el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
  $('#theme-description').textContent = THEMES[theme].description;
  syncObjectThemeUI();
  document.querySelectorAll<HTMLElement>('[data-biome]').forEach(el => { const id = BIOMES[el.dataset.biome as Biome].art; el.querySelector('img')!.src = assetUrl(id, theme); });
  document.querySelectorAll<HTMLElement>('[data-terrain]').forEach(el => { const id = el.dataset.terrain as Terrain; el.style.setProperty('--swatch', THEMES[theme].swatches[id]); });
  $('#forest-options').style.setProperty('--preview-ground', THEMES[theme].swatches.grass);
  $('#forest-options').style.setProperty('--preview-road', THEMES[theme].swatches.path);
}
function updateDimensions(): void {
  const width = Number(($('#map-width') as Field).value), height = Number(($('#map-height') as Field).value);
  const dimensionError = dimensionsError(width, height);
  $('#size-error').hidden = !dimensionError; $('#size-error').textContent = dimensionError ?? '';
  for (const id of ['map-width', 'map-height']) {
    $(`#${id}`).setAttribute('aria-invalid', String(!!dimensionError));
    $(`#${id}`).toggleAttribute('error', !!dimensionError);
  }
  const optionError = dimensionError ? undefined : generationOptionsError(readConfig());
  $('#scenario-error').textContent = optionError ?? ''; $('#scenario-error').hidden = !optionError;
  ($('#generate') as Field).disabled = busy || !!dimensionError || !!optionError;
  const scenarioIds = ['forest','dungeon','cave','ruins','village','mountain','city', ...BUILDING_BIOMES] as const;
  for (const biome of scenarioIds) {
    const section = $(`#${biome}-options`);
    section.hidden = config.biome !== biome;
    section.setAttribute('aria-describedby', 'scenario-error');
  }
  $('#house-status-options').hidden = config.biome !== 'city';
  $('#general-density-control').hidden = ['warehouse', 'barracks'].includes(config.biome);
  $('#complexity-control').hidden = ['smithy', 'inn', 'temple', 'warehouse', 'barracks'].includes(config.biome);
  $('#legacy-room-count').hidden = legacyRoomCount === undefined;
  if (legacyRoomCount !== undefined) {
    $('#legacy-room-label').textContent = `Cantidad anterior: ${legacyRoomCount} ${legacyRoomCount === 1 ? 'cuarto' : 'cuartos'}`;
  }
  for (const key of ['small', 'medium', 'large']) {
    ($(`#dungeon-rooms-${key}`) as Field).disabled = busy || legacyRoomCount !== undefined || ($('#rooms-auto') as Toggle).selected;
  }
  ($('#house-bedrooms') as Field).disabled = busy || ($('#house-bedrooms-auto') as Toggle).selected;
  ($('#forest-river-direction') as Field).disabled = busy || !($('#water') as Toggle).selected;
  ($('#cave-natural-bridges') as Toggle).disabled = busy || ($('#cave-chasms') as Field).value === 'none';
  ($('#mountain-path-layout') as Field).disabled = busy || !($('#mountain-paths') as Toggle).selected;
  // Use each control's declared constraints, not a second set of engine limits.
  for (const field of document.querySelectorAll<NumberField>('.scenario-options md-outlined-text-field[type="number"]')) {
    const invalid = !field.disabled && !field.validity.valid;
    field.error = invalid;
    field.errorText = invalid ? field.validationMessage : '';
    field.setAttribute('aria-invalid', String(invalid));
  }
  updatePathControls();
  $('#aspect-ratio').textContent = aspectRatio(width, height);
  $('#cell-total').textContent = dimensionError ? `${MIN_SIDE}–${MAX_SIDE} por lado · máx. 6.400` : `${(width * height).toLocaleString('es')} casillas`;
  const ratio = dimensionError ? 1 : width / height;
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
  const width = Number(($('#map-width') as Field).value);
  const height = Number(($('#map-height') as Field).value);
  let seed = ($('#seed') as Field).value.trim();
  if (!seed) {
    seed = freshSeed();
    ($('#seed') as Field).value = seed;
  }

  const dungeonRooms = legacyRoomCount !== undefined || ($('#rooms-auto') as Toggle).selected ? null : {
    small: parseCount('dungeon-rooms-small'),
    medium: parseCount('dungeon-rooms-medium'),
    large: parseCount('dungeon-rooms-large'),
  };
  const villageRequiredBuildings = (['market', 'tavern', 'temple', 'ranch'] as const)
    .filter(id => ($(`#village-require-${id}`) as Checkbox).checked);

  return {
    ...config,
    width,
    height,
    seed,
    roomCount: legacyRoomCount ?? 0,
    density: Number(($('#density') as Slider).value),
    complexity: Number(($('#complexity') as Slider).value),
    water: ($('#water') as Toggle).selected,
    landmarks: ($('#landmarks') as Toggle).selected,
    houseStatus: ($('#house-status') as Field).value as MapConfig['houseStatus'],
    forestRiverDirection: ($('#forest-river-direction') as Field).value as MapConfig['forestRiverDirection'],
    forestPaths: ($('#forest-paths') as Checkbox).checked,
    forestBranches: ($('#forest-branches') as Checkbox).checked,
    forestDeadEnds: ($('#forest-dead-ends') as Checkbox).checked,
    dungeonRooms,
    caveChasms: ($('#cave-chasms') as Field).value as MapConfig['caveChasms'],
    caveNaturalBridges: ($('#cave-natural-bridges') as Toggle).selected,
    ruinDecay: Number(($('#ruin-decay') as Slider).value),
    ruinLayout: ($('#ruin-layout') as Field).value as MapConfig['ruinLayout'],
    ruinFeatures: ($('#ruin-features') as Field).value as MapConfig['ruinFeatures'],
    ruinSecretPassages: ($('#ruin-secret-passages') as Toggle).selected,
    villageLayout: ($('#village-layout') as Field).value as VillageLayout,
    villageBlockSize: ($('#village-block-size') as Field).value as MapConfig['villageBlockSize'],
    villageWealth: {
      poor: parseCount('village-wealth-poor'),
      common: parseCount('village-wealth-common'),
      wealthy: parseCount('village-wealth-wealthy'),
    },
    villageRequiredBuildings,
    mountainSnow: ($('#mountain-snow') as Toggle).selected,
    mountainPaths: ($('#mountain-paths') as Toggle).selected,
    mountainPathLayout: ($('#mountain-path-layout') as Field).value as MapConfig['mountainPathLayout'],
    mountainCaveEntrances: parseCount('mountain-cave-entrances'),
    cityDensity: Number(($('#city-density') as Slider).value),
    cityDistrictBalance: Number(($('#city-district-balance') as Slider).value),
    cityAlleys: ($('#city-alleys') as Field).value as MapConfig['cityAlleys'],
    citySewers: ($('#city-sewers') as Toggle).selected,
    cityWalls: ($('#city-walls') as Toggle).selected,
    cityStreetWidth: ($('#city-street-width') as Field).value as MapConfig['cityStreetWidth'],
    houseLayout: ($('#house-layout') as Field).value as MapConfig['houseLayout'],
    houseBedrooms: ($('#house-bedrooms-auto') as Toggle).selected ? 0 : parseCount('house-bedrooms'),
    tavernCondition: ($('#tavern-condition') as Field).value as MapConfig['tavernCondition'],
    tavernUpperStairs: ($('#tavern-upper-stairs') as Toggle).selected,
    innRoomCount: parseCount('inn-room-count'),
    innUpperStairs: ($('#inn-upper-stairs') as Toggle).selected,
    smithyForgeLayout: ($('#smithy-forge-layout') as Field).value as MapConfig['smithyForgeLayout'],
    smithyExtraRoomCount: parseCount('smithy-extra-room-count'),
    templeStyle: ($('#temple-style') as Field).value as MapConfig['templeStyle'],
    templeMainHallOnly: ($('#temple-main-hall-only') as Toggle).selected,
    templeSecretRooms: ($('#temple-secret-rooms') as Toggle).selected,
    templeTransition: ($('#temple-transition') as Field).value as MapConfig['templeTransition'],
    warehouseFill: Number(($('#warehouse-fill') as Slider).value),
    warehouseShelfLayout: ($('#warehouse-shelf-layout') as Field).value as MapConfig['warehouseShelfLayout'],
    barracksBedLayout: ($('#barracks-bed-layout') as Field).value as MapConfig['barracksBedLayout'],
    barracksContents: Number(($('#barracks-contents') as Slider).value),
  };
}
function requestGenerate(): void {
  if (busy) return;
  const next = readConfig();
  const error = dimensionsError(next.width, next.height) ?? generationOptionsError(next);
  if (error) { toast(error); return; }
  const run = () => {
    config = next; pendingFit = !map || map.config.width !== config.width || map.config.height !== config.height;
    $('#operation-error').hidden = true;
    setBusy(true); worker.postMessage(config);
    if (compactLayout.matches) { setSidebarOpen(false); $('#map-canvas').focus(); }
  };
  if (edited) confirmReplace(run); else run();
}
function confirmReplace(action: () => void): void { pendingConfirm = action; ($('#confirm-dialog') as HTMLDialogElement).showModal(); }
worker.onmessage = async (e: MessageEvent<{ map?: BattleMap; error?: string }>) => {
  try {
    if (e.data.error || !e.data.map) throw new Error(e.data.error);
    const lighting = map?.lighting;
    map = e.data.map; if (lighting) map.lighting = { ...lighting };
    lightingSnapshot = undefined;
    config = structuredClone(map.config); edited = false; undoStack.length = 0; redoStack.length = 0;
    render(pendingFit);
    if (skipNextLocalSave) {
      skipNextLocalSave = false;
      $('#save-status').textContent = 'Recuperación local fallida · El proyecto anterior no se sobrescribió';
    } else saveLocal();
    setBusy(false); syncControls();
  } catch (error) {
    skipNextLocalSave = false;
    setBusy(false);
    showOperationError(error instanceof Error ? error.message : 'No se pudo generar el mapa.');
  }
};
worker.onerror = () => {
  skipNextLocalSave = false;
  setBusy(false);
  showOperationError('No se pudo iniciar el generador. Recarga la página e inténtalo de nuevo.');
};

const panelTabs = ['world', 'assets', 'lighting'] as const;
function selectTab(which: typeof panelTabs[number]): void {
  for (const name of panelTabs) {
    $(`#${name}-panel`).hidden = which !== name;
    const tab = $(`#tab-${name}`); tab.classList.toggle('active', which === name); tab.setAttribute('aria-selected', String(which === name)); tab.tabIndex = which === name ? 0 : -1;
  }
  $('#generate-footer').hidden = which !== 'world';
  if (which === 'assets') {
    if (assetFamily === undefined && map) assetFamily = DEFAULT_ASSET_FAMILY[map.config.biome];
    filterAssets();
  }
}
function setSidebarOpen(open: boolean): void {
  const sidebar = $('#editor-sidebar');
  sidebar.classList.toggle('mobile-open', open);
  sidebar.inert = compactLayout.matches && !open;
  $('#toggle-sidebar').setAttribute('aria-expanded', String(!compactLayout.matches || open));
  $('#toggle-sidebar').setAttribute('aria-label', open ? 'Cerrar panel del editor' : 'Abrir panel del editor');
}
function setTool(tool: Tool): void {
  view.setTool(tool);
  for (const t of ['pan', 'brush', 'place', 'erase']) { $(`#tool-${t}`).classList.toggle('active', t === tool); $(`#tool-${t}`).setAttribute('aria-pressed', String(t === tool)); }
  $('#brush-panel').hidden = tool !== 'brush' && tool !== 'erase';
  $('.terrain-swatches').hidden = tool === 'erase';
  $('#terrain-name').hidden = tool === 'erase';
  $('#brush-title').textContent = tool === 'erase' ? 'Borrar objetos' : 'Pintar terreno';
  if (tool === 'place') { selectTab('assets'); }
  const hints: Record<Tool, string> = { pan: `${icon('hand')} Arrastra para explorar <span>·</span> Rueda para acercar`, brush: `${icon('brush')} Arrastra para pintar <span>·</span> Ctrl Z para deshacer`, erase: `${icon('eraser')} Arrastra para borrar objetos <span>·</span> No borra terreno`, place: `${icon('trees')} Clic para colocar <span>·</span> R para girar` };
  $('#tool-hint').innerHTML = hints[tool];
}
function pushUndo(snapshot: BattleMap): void { undoStack.push(snapshot); if (undoStack.length > 30) undoStack.shift(); redoStack.length = 0; }
function restoreHistory(redo = false): void {
  if (busy || !map) return;
  const from = redo ? redoStack : undoStack, to = redo ? undoStack : redoStack;
  const snapshot = from.pop(); if (!snapshot) return;
  to.push(structuredClone(map)); map = snapshot; config = structuredClone(map.config); syncControls(); edited = true; render(); saveLocal();
}
function paintCell(x: number, y: number): void {
  const w = map.config.width, h = map.config.height, size = view.brushSize, shift = Math.floor(size / 2), layer = activeLayerData(map);
  if (view.tool === 'brush') {
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
      const xx = x + dx - shift, yy = y + dy - shift;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) layer.terrain[yy * w + xx] = terrain;
    }
  } else if (view.tool === 'erase') {
    layer.objects = layer.objects.filter(o => Math.hypot(o.x - x - .5, o.y - y - .5) > Math.max(size * .6, o.scale * .36));
  }
}
view.onEdit = (x, y) => {
  if (busy || !map) return;
  if (!strokeSnapshot) { strokeSnapshot = structuredClone(map); previousCell = undefined; }
  const layer = activeLayerData(map);
  if (view.tool === 'place') {
    const objectTotal = map.objects.length + (map.layers ?? []).reduce((total, item) => total + item.objects.length, 0);
    if (objectTotal >= 20_000) { toast('El proyecto ya tiene el máximo de 20.000 objetos entre todas sus plantas.'); return; }
    layer.objects.push({ id: crypto.randomUUID(), asset: view.selectedAsset, x: x + .5, y: y + .5, rotation: view.rotation, scale: view.assetScale, theme: view.selectedTheme! });
  } else {
    if (previousCell) { const steps = Math.max(Math.abs(x - previousCell.x), Math.abs(y - previousCell.y)); for (let i = 0; i <= steps; i++) paintCell(Math.round(previousCell.x + (x - previousCell.x) * i / Math.max(1, steps)), Math.round(previousCell.y + (y - previousCell.y) * i / Math.max(1, steps))); }
    else paintCell(x, y);
    previousCell = { x, y };
  }
  edited = true; scheduleRender();
};
view.onEditEnd = () => { if (strokeSnapshot) { pushUndo(strokeSnapshot); strokeSnapshot = undefined; previousCell = undefined; render(); saveLocal(); } };
view.onZoom = z => {
  const value = `${Math.round(z * 100)} %`;
  $('#zoom-level').textContent = value;
  $('#zoom-level').setAttribute('aria-label', `Zoom ${value}. Ajustar mapa a la pantalla`);
};
view.onHover = (x, y) => { $('#cell-position').textContent = map && x >= 0 && y >= 0 && x < map.config.width && y < map.config.height ? `X ${String(x + 1).padStart(2, '0')}   Y ${String(y + 1).padStart(2, '0')}` : 'X —   Y —'; };

document.querySelectorAll<HTMLElement>('.theme-card').forEach(el => el.addEventListener('click', () => {
  if (busy) return;
  const theme = el.dataset.theme as Theme;
  if (theme === config.theme) return;
  if (map) { pushUndo(structuredClone(map)); map.config.theme = theme; edited = true; }
  config.theme = theme; syncThemeUI(); render(); if (map) saveLocal();
  toast(`${THEMES[theme].name}: mapa, objetos procedurales y pinceles actualizados. Los objetos manuales conservan su temática.`);
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
$('#compact-house').addEventListener('click', () => {
  ($('#map-width') as Field).value = '24'; ($('#map-height') as Field).value = '18'; ($('#map-size') as Field).value = '24x18'; updateDimensions();
});
$('#ruin-decay').addEventListener('input', () => { $('#decay-value').innerHTML = `${($('#ruin-decay') as Slider).value}<span>%</span>`; updateDimensions(); });
$('#rooms-auto').addEventListener('change', () => {
  legacyRoomCount = undefined;
  if (!($('#rooms-auto') as Toggle).selected) {
    for (const key of ['small', 'medium', 'large'] as const) {
      ($(`#dungeon-rooms-${key}`) as Field).value = String(manualDungeonRooms[key]);
    }
  }
  updateDimensions();
});
$('#replace-legacy-rooms').addEventListener('click', () => {
  legacyRoomCount = undefined;
  ($('#rooms-auto') as Toggle).selected = false;
  for (const key of ['small', 'medium', 'large'] as const) {
    ($(`#dungeon-rooms-${key}`) as Field).value = String(manualDungeonRooms[key]);
  }
  updateDimensions();
});
for (const key of ['small', 'medium', 'large'] as const) $(`#dungeon-rooms-${key}`).addEventListener('input', () => {
  legacyRoomCount = undefined;
  ($('#rooms-auto') as Toggle).selected = false;
  const value = parseCount(`dungeon-rooms-${key}`);
  if (Number.isFinite(value)) manualDungeonRooms[key] = value;
  updateDimensions();
});
$('#house-bedrooms-auto').addEventListener('change', () => {
  if (!($('#house-bedrooms-auto') as Toggle).selected) ($('#house-bedrooms') as Field).value = String(manualHouseBedrooms);
  updateDimensions();
});
$('#house-bedrooms').addEventListener('input', () => {
  ($('#house-bedrooms-auto') as Toggle).selected = false;
  const value = parseCount('house-bedrooms');
  if (Number.isFinite(value)) manualHouseBedrooms = value;
  updateDimensions();
});
$('#forest-paths').addEventListener('change', () => { updatePathControls(); updateDimensions(); });
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
for (const id of ['density', 'complexity']) $(`#${id}`).addEventListener('input', () => { $(`#${id}-value`).innerHTML = `${Number(($(`#${id}`) as Slider).value)}<span>%</span>`; updateDimensions(); });
for (const [id, output] of [['city-density','city-density-value'], ['city-district-balance','city-balance-value'], ['warehouse-fill','warehouse-fill-value'], ['barracks-contents','barracks-contents-value']] as const) {
  $(`#${id}`).addEventListener('input', () => { $(`#${output}`).innerHTML = `${Number(($(`#${id}`) as Slider).value)}<span>%</span>`; updateDimensions(); });
}
for (const id of ['water','cave-natural-bridges','ruin-secret-passages','mountain-snow','mountain-paths','city-sewers','city-walls','tavern-upper-stairs','inn-upper-stairs','temple-main-hall-only','temple-secret-rooms']) $(`#${id}`).addEventListener('change', updateDimensions);
for (const id of ['house-status','forest-river-direction','cave-chasms','ruin-layout','ruin-features','village-layout','village-block-size','mountain-path-layout','city-alleys','city-street-width','house-layout','tavern-condition','smithy-forge-layout','temple-style','temple-transition','warehouse-shelf-layout','barracks-bed-layout']) $(`#${id}`).addEventListener('change', updateDimensions);
for (const id of ['village-wealth-poor','village-wealth-common','village-wealth-wealthy','mountain-cave-entrances','inn-room-count','smithy-extra-room-count']) $(`#${id}`).addEventListener('input', updateDimensions);
for (const id of ['market','tavern','temple','ranch']) $(`#village-require-${id}`).addEventListener('change', updateDimensions);
for (const tab of panelTabs) $(`#tab-${tab}`).addEventListener('click', () => selectTab(tab));
$('.panel-tabs').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const current = panelTabs.findIndex(tab => $(`#tab-${tab}`) === e.target); if (current < 0) return;
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? panelTabs.length - 1 : (current + (e.key === 'ArrowLeft' ? -1 : 1) + panelTabs.length) % panelTabs.length;
  selectTab(panelTabs[next]); $(`#tab-${panelTabs[next]}`).focus(); e.preventDefault();
});
for (const tool of ['pan', 'brush', 'erase', 'place'] as const) $(`#tool-${tool}`).addEventListener('click', () => {
  setTool(tool);
  if (tool === 'place' && compactLayout.matches) {
    setSidebarOpen(true);
    $('#asset-family').focus();
  }
});
$('#undo').addEventListener('click', () => restoreHistory()); $('#redo').addEventListener('click', () => restoreHistory(true));
$('#zoom-in').addEventListener('click', () => view.zoomBy(1.25)); $('#zoom-out').addEventListener('click', () => view.zoomBy(.8));
$('#fit-map').addEventListener('click', () => view.fit()); $('#zoom-level').addEventListener('click', () => view.fit());
$('#active-layer').addEventListener('change', () => {
  if (!map || busy) return;
  map.activeLayer = Number(($('#active-layer') as HTMLSelectElement).value);
  render(); saveLocal();
  toast(`Planta activa: ${($('#active-layer') as HTMLSelectElement).selectedOptions[0]?.textContent ?? 'planta baja'}.`);
});
function toggleGrid(): void { options.grid = !options.grid; $('#grid-toggle').classList.toggle('active', options.grid); $('#grid-toggle').setAttribute('aria-pressed', String(options.grid)); render(); }
$('#grid-toggle').addEventListener('click', toggleGrid);
function changeLighting(settings: LightingSettings, commit: boolean): void {
  if (busy || !map) return;
  if (!lightingSnapshot) lightingSnapshot = structuredClone(map);
  map.lighting = { ...settings }; edited = true; syncLightingControls(map);
  if (commit) {
    if (JSON.stringify(lightingSnapshot.lighting ?? DEFAULT_LIGHTING) !== JSON.stringify(settings)) pushUndo(lightingSnapshot);
    lightingSnapshot = undefined; render(); saveLocal();
  } else scheduleRender();
}
bindLightingControls(() => ({ ...DEFAULT_LIGHTING, ...map?.lighting }), changeLighting);
$('#light-toggle').addEventListener('click', () => changeLighting({ ...DEFAULT_LIGHTING, ...map?.lighting, enabled: !(map?.lighting?.enabled ?? true) }, true));
document.querySelectorAll<HTMLElement>('[data-terrain]').forEach(el => el.addEventListener('click', () => {
  terrain = el.dataset.terrain as Terrain;
  $('#terrain-name').textContent = el.getAttribute('aria-label');
  document.querySelectorAll<HTMLElement>('[data-terrain]').forEach(t => { t.classList.toggle('active', t === el); t.setAttribute('aria-pressed', String(t === el)); });
}));
document.querySelectorAll<HTMLElement>('[data-brush]').forEach(el => el.addEventListener('click', () => {
  view.brushSize = Number(el.dataset.brush);
  document.querySelectorAll<HTMLElement>('[data-brush]').forEach(t => { t.classList.toggle('active', t === el); t.setAttribute('aria-pressed', String(t === el)); });
}));
$('#close-brush').addEventListener('click', () => { $('#brush-panel').hidden = true; $(`#tool-${view.tool}`).focus(); });
$('#object-theme').addEventListener('change', () => { objectTheme = ($('#object-theme') as Field).value as Theme; syncObjectThemeUI(); });
document.querySelectorAll<HTMLElement>('[data-asset]').forEach(el => el.addEventListener('click', () => {
  view.selectedAsset = el.dataset.asset as AssetId;
  view.assetScale = ASSET_SIZES[view.selectedAsset] * Number(($('#object-scale') as Slider).value) / 100;
  $('#selected-asset-name').textContent = ASSETS.find(asset => asset.id === view.selectedAsset)!.name;
  document.querySelectorAll<HTMLElement>('[data-asset]').forEach(t => { t.classList.toggle('selected', t === el); t.setAttribute('aria-pressed', String(t === el)); });
  setTool('place');
  if (compactLayout.matches) {
    setSidebarOpen(false); $('#map-canvas').focus();
    toast('Objeto seleccionado. Toca el mapa para colocarlo.');
  }
}));
$('#object-scale').addEventListener('input', () => { const scale = Number(($('#object-scale') as Slider).value); view.assetScale = ASSET_SIZES[view.selectedAsset] * scale / 100; $('#object-scale-value').textContent = `${scale} %`; view.draw(); });
function rotateObject(): void {
  view.rotation = (view.rotation + Math.PI / 4) % (Math.PI * 2);
  $('#object-rotation').textContent = `${Math.round(view.rotation * 180 / Math.PI)}°`;
  view.draw();
}
$('#rotate-object').addEventListener('click', rotateObject);
function filterAssets(): void {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const query = normalize(($('#asset-search') as Field).value);
  const family = assetFamily ?? DEFAULT_ASSET_FAMILY[map?.config.biome ?? DEFAULT_CONFIG.biome];
  ($('#asset-family') as Field).value = family;
  let found = 0;
  for (const asset of ASSETS) {
    const card = $(`[data-asset="${asset.id}"]`);
    const visible = query ? normalize(asset.name).includes(query) : ASSET_FAMILY_MEMBERSHIP[asset.id].includes(family);
    card.hidden = !visible;
    card.querySelector<HTMLElement>('.asset-groups')!.hidden = !query;
    if (visible) found++;
  }
  const label = ASSET_FAMILIES.find(item => item.id === family)!.name;
  $('#asset-results-label').textContent = query ? `${found} resultados en todas las familias` : `${label} · ${found} objetos`;
  $('#clear-asset-search').hidden = !query;
  $('#no-assets').hidden = found > 0;
}
$('#asset-search').addEventListener('input', filterAssets);
$('#clear-asset-search').addEventListener('click', () => { ($('#asset-search') as Field).value = ''; filterAssets(); $('#asset-search').focus(); });
$('#asset-family').addEventListener('change', () => {
  assetFamily = ($('#asset-family') as Field).value as AssetFamilyId;
  ($('#asset-search') as Field).value = '';
  $('.asset-results').scrollTop = 0;
  filterAssets();
});
$('#toggle-sidebar').addEventListener('click', () => {
  const open = !$('#editor-sidebar').classList.contains('mobile-open');
  setSidebarOpen(open);
  if (open) $('.panel-tab[aria-selected="true"]').focus();
});
$('#close-sidebar').addEventListener('click', () => { setSidebarOpen(false); $('#toggle-sidebar').focus(); });
compactLayout.addEventListener('change', () => {
  const focusedInside = $('#editor-sidebar').contains(document.activeElement);
  setSidebarOpen(false);
  if (compactLayout.matches && focusedInside) $('#toggle-sidebar').focus();
});
setSidebarOpen(false);
$('#dismiss-operation-error').addEventListener('click', () => { $('#operation-error').hidden = true; $('#map-canvas').focus(); });
$('#help-button').addEventListener('click', () => ($('#help-dialog') as HTMLDialogElement).showModal());
$('#close-help').addEventListener('click', () => ($('#help-dialog') as HTMLDialogElement).close());
$('#cancel-replace').addEventListener('click', () => { pendingConfirm = undefined; ($('#confirm-dialog') as HTMLDialogElement).close(); });
$('#confirm-replace').addEventListener('click', () => { ($('#confirm-dialog') as HTMLDialogElement).close(); const action = pendingConfirm; pendingConfirm = undefined; action?.(); });

function download(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
function filename(source: BattleMap = map): string { return source.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
$('#save-project').addEventListener('click', () => {
  if (!map) return;
  try {
    download(new Blob([serializeProject()], { type: 'application/json' }), `${filename()}.${map.config.theme}.rc.json`);
    toast('Proyecto guardado. Puedes volver a abrirlo para editarlo.');
  } catch (error) {
    showOperationError(error instanceof Error ? error.message : 'No se pudo guardar el proyecto.');
  }
});
$('#open-project').addEventListener('click', () => ($('#project-input') as HTMLInputElement).click());
$('#project-input').addEventListener('change', async () => {
  const input = $('#project-input') as HTMLInputElement, file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('El archivo supera el límite de 5 MB.');
    const loaded = parseMap(await file.text());
    const apply = () => { map = loaded; config = structuredClone(loaded.config); objectTheme = config.theme; edited = true; undoStack.length = 0; redoStack.length = 0; $('#operation-error').hidden = true; syncControls(); render(true); saveLocal(); toast('Proyecto abierto.'); };
    if (edited) confirmReplace(apply); else apply();
  } catch (error) { showOperationError(error instanceof Error ? error.message : 'No se pudo abrir el proyecto.'); }
  input.value = '';
});

let previewUrl: string | undefined;
let exportSnapshot: BattleMap | undefined;
let exportController: AbortController | undefined;
const exportDialog = $('#export-dialog') as HTMLDialogElement;
exportDialog.addEventListener('close', () => {
  exportSnapshot = undefined;
  exportController?.abort();
});
$('#open-export').addEventListener('click', async () => {
  if (!map || busy) return;
  if (renderTimer) render();

  const snapshot = structuredClone(map);
  const previewGrid = options.grid;
  exportSnapshot = snapshot;
  ($('#export-grid') as Toggle).selected = previewGrid;
  $('#export-error').hidden = true;
  if (snapshot.config.width * snapshot.config.height * Number(($('#export-resolution') as Field).value) ** 2 > 40_000_000) {
    ($('#export-resolution') as Field).value = '50';
  }
  const activeIndex = snapshot.activeLayer ?? 0;
  const activeName = activeIndex === 0 ? 'Planta baja' : snapshot.layers?.[activeIndex - 1]?.name ?? `Planta ${activeIndex + 1}`;
  $('#export-map-name').textContent = `${snapshot.name} · ${activeName}`;
  ($('#export-preview') as HTMLImageElement).removeAttribute('src');
  updateExportMeta();
  exportDialog.showModal();

  const preview = document.createElement('canvas');
  preview.width = 640;
  preview.height = Math.round(640 * mapImage.height / mapImage.width);
  preview.getContext('2d')!.drawImage(mapImage, 0, 0, preview.width, preview.height);
  const blob = await new Promise<Blob | null>(resolve => preview.toBlob(resolve));
  if (!blob || exportSnapshot !== snapshot || !exportDialog.open || ($('#export-grid') as Toggle).selected !== previewGrid) return;

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blob);
  const image = $('#export-preview') as HTMLImageElement;
  image.src = previewUrl;
  try { await image.decode(); } catch { /* The map can still be exported without its thumbnail. */ }
});
function updateExportMeta(): void {
  const source = exportSnapshot ?? map;
  if (!source) return;
  const size = Number(($('#export-resolution') as Field).value);
  const gif = ($('#export-format') as Field).value === 'gif';
  const dimensions = gif ? gifDimensions(source.config.width, source.config.height, size) : { tile: size, width: source.config.width * size, height: source.config.height * size, reduced: false };
  $('#export-dimensions').textContent = `${dimensions.width} × ${dimensions.height} px`;
  $('#gif-note').hidden = !gif;
  $('#gif-note').textContent = `Bucle de 2,4 s · 24 fotogramas · Paleta de 256 colores · ${dimensions.tile} px por casilla. ${dimensions.reduced ? 'Resolución ajustada automáticamente. ' : ''}Límite GIF: 1 megapíxel y 1600 px por lado. ${hasAnimation(source, options) ? 'Anima aunque la vista esté pausada.' : 'Sin elementos animables: esta planta no tendrá movimiento.'} ${options.bioluminescence ? 'Setas bioluminiscentes activadas. ' : ''}La miniatura es estática.`;
}
for (const id of ['export-resolution', 'export-format']) $(`#${id}`).addEventListener('change', () => { updateExportMeta(); $('#export-error').hidden = true; });
$('#export-grid').addEventListener('change', () => {
  const snapshot = exportSnapshot;
  if (!snapshot) return;
  const grid = ($('#export-grid') as Toggle).selected;
  const preview = renderMap(snapshot, 16, { ...options, grid });
  preview.toBlob(blob => {
    if (!blob || exportSnapshot !== snapshot || ($('#export-grid') as Toggle).selected !== grid) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    ($('#export-preview') as HTMLImageElement).src = previewUrl;
  });
});
for (const id of ['close-export', 'cancel-export']) $(`#${id}`).addEventListener('click', () => ($('#export-dialog') as HTMLDialogElement).close());
$('#download-image').addEventListener('click', async () => {
  if (exportController) return;
  const controller = new AbortController(); exportController = controller;
  const button = $('#download-image') as Field; button.disabled = true; $('#export-error').hidden = true;
  const fields = ['export-format', 'export-resolution', 'export-grid'].map(id => $(`#${id}`) as Field);
  fields.forEach(field => field.disabled = true);
  try {
    if (!exportSnapshot) throw new Error('Vuelve a abrir la exportación para capturar el mapa actual.');
    const tile = Number(($('#export-resolution') as Field).value), format = ($('#export-format') as Field).value;
    const exportOptions = { ...options, grid: ($('#export-grid') as Toggle).selected };
    const snapshot = structuredClone(exportSnapshot);
    const layerSuffix = (snapshot.activeLayer ?? 0) === 0 ? 'planta-baja' : `planta-${snapshot.activeLayer}`;
    const name = `${filename(snapshot)}-${layerSuffix}-${snapshot.config.theme}-${snapshot.config.width}x${snapshot.config.height}`;
    const pixels = snapshot.config.width * tile * snapshot.config.height * tile;
    if (format !== 'gif' && pixels > 40_000_000) throw new Error('Esta resolución es muy grande. Elige 100 o 50 px por casilla (máximo 40 megapíxeles).');
    button.textContent = format === 'gif' ? 'Preparando GIF…' : 'Preparando imagen…';
    await new Promise(resolve => setTimeout(resolve, 50)); controller.signal.throwIfAborted();
    let blob: Blob;
    if (format === 'gif') {
      $('#gif-progress').hidden = false;
      const { exportGif } = await import('./engine/export-gif');
      blob = await exportGif(snapshot, tile, exportOptions, controller.signal, (frame, total) => {
        ($('#gif-progress-bar') as HTMLProgressElement).value = frame;
        $('#gif-progress-text').textContent = `Creando GIF: ${frame} de ${total} fotogramas… Puedes cancelar cerrando esta ventana.`;
      });
    } else {
      const exported = renderMap(snapshot, tile, exportOptions);
      try { blob = await new Promise<Blob>((resolve, reject) => exported.toBlob(b => b ? resolve(b) : reject(new Error('El navegador no pudo exportar esta resolución. Prueba con una menor.')), `image/${format}`, .94)); }
      finally { exported.width = 1; exported.height = 1; }
    }
    controller.signal.throwIfAborted();
    download(blob, `${name}.${format === 'jpeg' ? 'jpg' : format}`);
    ($('#export-dialog') as HTMLDialogElement).close(); toast('Mapa exportado.');
  } catch (error) {
    if (!controller.signal.aborted) { $('#export-error').textContent = error instanceof Error ? error.message : 'No se pudo exportar la imagen.'; $('#export-error').hidden = false; }
  } finally {
    exportController = undefined; $('#gif-progress').hidden = true;
    fields.forEach(field => field.disabled = false);
    button.disabled = false; button.innerHTML = `${icon('download', 'button-icon')} Descargar imagen`;
  }
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });

for (const field of document.querySelectorAll<HTMLElement>('.scenario-options md-outlined-text-field[type="number"]')) {
  field.setAttribute('required', '');
  field.setAttribute('no-asterisk', '');
  field.setAttribute('aria-describedby', 'scenario-error');
}
for (const field of document.querySelectorAll<HTMLElement>('[id^="village-wealth-"]')) field.setAttribute('step', 'any');
for (const group of document.querySelectorAll<HTMLElement>('.scenario-fieldset')) group.setAttribute('aria-describedby', 'scenario-error');
for (const select of document.querySelectorAll<HTMLElement>('md-outlined-select')) {
  select.setAttribute('menu-positioning', 'fixed');
  select.addEventListener('opening', () => { openSelect = select; });
  select.addEventListener('closed', () => { if (openSelect === select) openSelect = undefined; });
}
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') {
    if (openSelect) return;
    if (!$('#brush-panel').hidden) { $('#brush-panel').hidden = true; $(`#tool-${view.tool}`).focus(); e.preventDefault(); }
    else if (compactLayout.matches && $('#editor-sidebar').classList.contains('mobile-open')) { setSidebarOpen(false); $('#toggle-sidebar').focus(); e.preventDefault(); }
    return;
  }
  if (busy) return;
  if (e.composedPath().some(el => el instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT', 'MD-SLIDER', 'MD-OUTLINED-SELECT', 'MD-OUTLINED-TEXT-FIELD'].includes(el.tagName) || el.isContentEditable))) return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); restoreHistory(e.shiftKey); return; }
  if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); restoreHistory(true); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (key === 'v') setTool('pan'); else if (key === 'b') setTool('brush'); else if (key === 'e') setTool('erase'); else if (key === 'g') toggleGrid(); else if (key === 'f') view.fit(); else if (key === 'r') { rotateObject(); toast(`Rotación: ${$('#object-rotation').textContent}`); } else if (key === '+' || key === '=') view.zoomBy(1.25); else if (key === '-') view.zoomBy(.8);
});

async function init(): Promise<void> {
  setBusy(true, 'Cargando ilustraciones…');
  filterAssets();
  try {
    await loadAssets(); assetsReady = true;
    let restored: BattleMap | undefined;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) restored = parseMap(saved);
    } catch (error) {
      skipNextLocalSave = true;
      const detail = error instanceof Error ? error.message : 'El almacenamiento del navegador no está disponible.';
      $('#save-status').textContent = 'No se pudo recuperar el proyecto local';
      showOperationError(`No se pudo recuperar el proyecto guardado: ${detail} Se abrirá un mapa nuevo sin sobrescribirlo.`);
    }
    if (restored) {
      map = restored; config = structuredClone(map.config); objectTheme = config.theme; edited = true;
      syncControls(); render(true); setBusy(false); saveLocal();
    } else { setBusy(true); worker.postMessage(config); }
  } catch { setBusy(false); $('#save-status').textContent = 'No se pudieron cargar las ilustraciones'; showOperationError('No se pudieron cargar las ilustraciones. Recarga la página para volver a intentarlo.'); }
}
void init();
