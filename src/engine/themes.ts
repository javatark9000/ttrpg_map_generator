import type { Terrain, Theme } from './types';
export const THEME_IDS: Theme[] = ['vanilla', 'dark', 'anime'];
type RGB = [number, number, number];
type Ramp = [RGB, RGB];
interface ThemeDefinition {
  name: string;
  description: string;
  subtitle: string;
  terrain: Record<Terrain, Ramp>;
  caveFloor: Ramp;
  caveWater: Ramp;
  swatches: Record<Terrain, string>;
  suffixes: string[];
}
export const THEMES: Record<Theme, ThemeDefinition> = {
  vanilla: {
    name: 'Vanilla', description: 'El mundo original', subtitle: 'Fantasía natural',
    terrain: {
      grass: [[66,85,51],[137,149,91]], path: [[136,124,82],[187,169,114]],
      sand: [[134,132,86],[176,169,112]], water: [[45,93,87],[99,149,119]],
      floor: [[98,103,88],[158,152,124]], wall: [[41,46,39],[83,86,70]], rock: [[35,49,49],[87,105,98]],
    },
    caveFloor: [[69,84,79],[124,133,109]], caveWater: [[31,76,81],[75,146,145]],
    swatches: { grass:'#778456', path:'#b4a273', water:'#568d85', floor:'#939381', wall:'#42483e', rock:'#53645e', sand:'#aba16a' },
    suffixes: ['de los susurros','del último guardián','de la luna velada','del alba olvidada','de las raíces antiguas','de la estrella caída'],
  },
  dark: {
    name: 'Dark', description: 'Hierro, ceniza y ruinas', subtitle: 'Fantasía medieval cruda',
    terrain: {
      grass: [[34,39,35],[86,86,61]], path: [[62,53,44],[119,104,77]],
      sand: [[67,64,55],[109,104,84]], water: [[19,32,36],[52,75,74]],
      floor: [[59,59,61],[110,103,91]], wall: [[24,24,29],[57,55,56]], rock: [[23,29,32],[65,68,67]],
    },
    caveFloor: [[47,48,51],[91,86,79]], caveWater: [[19,25,38],[52,64,86]],
    swatches: { grass:'#4d5140', path:'#74644e', water:'#30474a', floor:'#686360', wall:'#2d2b30', rock:'#3c4242', sand:'#706b55' },
    suffixes: ['de los juramentos rotos','del rey sin sepultura','de la peste gris','de las cenizas','del hierro maldito','de los condenados'],
  },
  anime: {
    name: 'Anime', description: 'Reinos de otro mundo', subtitle: 'Fantasía isekai',
    terrain: {
      grass: [[67,127,91],[177,204,116]], path: [[171,149,106],[235,214,158]],
      sand: [[181,178,132],[239,228,178]], water: [[46,137,166],[121,211,215]],
      floor: [[145,144,167],[221,213,213]], wall: [[63,65,90],[111,117,144]], rock: [[48,62,92],[99,113,153]],
    },
    caveFloor: [[92,103,139],[166,169,198]], caveWater: [[53,79,155],[126,175,238]],
    swatches: { grass:'#85b878', path:'#d6be86', water:'#64c0d0', floor:'#bab3c7', wall:'#636785', rock:'#606f98', sand:'#d4cca0' },
    suffixes: ['del reino celeste','de la promesa estelar','del portal del alba','de los cerezos eternos','de la corona de cristal','del gremio olvidado'],
  },
};
export function assetUrl(id: string, theme: Theme): string {
  return `${import.meta.env.BASE_URL}assets/${theme}/${id}.svg`;
}
