import { describe, expect, it } from 'vitest';
import { generateMap, getRegions, walkable } from './generate';
import { ASSETS, BUILDING_TYPES, DEFAULT_CONFIG } from './types';
import type { Biome, BuildingType } from './types';
import { parseMap } from './storage';
import { THEME_IDS } from './themes';
import { SCENARIO_DEFAULTS, VILLAGE_LAYOUTS } from './scenario-options';

const formats=[[8,8],[8,120],[120,8],[24,18],[36,64],[80,80]];
const ids=new Set(ASSETS.map(a=>a.id));
function check(map:ReturnType<typeof generateMap>) {
  const {width,height}=map.config;
  expect(map.terrain).toHaveLength(width*height);
  expect(getRegions(map)).toHaveLength(1);
  expect(walkable(map.terrain[map.spawn.y*width+map.spawn.x])).toBe(true);
  expect(map.objects.every(o=>ids.has(o.asset)&&o.x>=0&&o.y>=0&&o.x<width&&o.y<height&&o.scale>0&&o.scale<=20)).toBe(true);
  expect(new Set(map.objects.map(o=>o.id)).size).toBe(map.objects.length);
  expect(parseMap(JSON.stringify(map))).toEqual(map);
}

describe.each(THEME_IDS)('expanded %s scenarios',theme=>{
  it.each(['ruins','village','mountain'] as const)('%s is connected, bounded and reproducible in all formats',biome=>{
    for(const [width,height] of formats)for(let i=0;i<3;i++) {
      const config={...DEFAULT_CONFIG,theme,biome,width,height,seed:`RC-EXPANDED-${i}`,complexity:i*50,density:i*50};
      const map=generateMap(config);check(map);expect(generateMap(config)).toEqual(map);
    }
  },20_000);
  it.each(Object.keys(BUILDING_TYPES) as BuildingType[])('%s interior supports the smallest and longest maps',buildingType=>{
    for(const [width,height]of formats)for(let i=0;i<2;i++) {
      const config={...DEFAULT_CONFIG,theme,biome:'building' as const,buildingType,width,height,seed:`RC-INTERIOR-${i}`,complexity:i*100};
      const map=generateMap(config);check(map);
      expect(map.terrain).not.toContain('water');expect(map.objects.some(o=>o.asset==='door')).toBe(true);
      expect(map.objects.some(o=>o.asset.startsWith('roof-'))).toBe(false);
      expect(generateMap(config)).toEqual(map);
    }
  },20_000);
});

describe('scenario controls and distinct identity',()=>{
  it('creates recognizable furnishing and floor plans for every building type',()=>{
    const expected:Record<BuildingType,string>={house:'bed',tavern:'counter',inn:'bed',smithy:'anvil',temple:'altar',library:'bookshelf',warehouse:'sacks',barracks:'weapon-rack'};
    const plans=new Set<string>();
    for(const buildingType of Object.keys(BUILDING_TYPES) as BuildingType[]) {
      const map=generateMap({...DEFAULT_CONFIG,biome:'building',buildingType,density:100});
      expect(map.objects.some(o=>o.asset===expected[buildingType]),buildingType).toBe(true);
      expect(map.name.startsWith(BUILDING_TYPES[buildingType].prefix)).toBe(true);
      plans.add(map.terrain.join(',')+'|'+map.objects.map(o=>`${o.asset}:${o.x}:${o.y}`).join(','));
    }
    expect(plans.size).toBe(8);
  });
  it('village layouts change streets and keep roofed buildings with accessible entrances',()=>{
    const shapes=[];
    for(const layout of VILLAGE_LAYOUTS)for(const [width,height]of [[40,30],[8,120],[120,8]]) {
      const map=generateMap({...DEFAULT_CONFIG,biome:'village',villageLayout:layout.id,width,height,density:100});check(map);
      expect(map.objects.some(o=>o.asset==='roof-house'||o.asset==='roof-shop')).toBe(true);
      if(width===40)shapes.push(map.terrain.join(','));
    }
    expect(new Set(shapes).size).toBe(3);
  });
  it('ruin decay changes walls and mountain snow is optional',()=>{
    const whole=generateMap({...DEFAULT_CONFIG,biome:'ruins',ruinDecay:0});
    const collapsed=generateMap({...DEFAULT_CONFIG,biome:'ruins',ruinDecay:100});
    expect(collapsed.terrain.filter(t=>t==='wall').length).toBeLessThan(whole.terrain.filter(t=>t==='wall').length);
    const summer=generateMap({...DEFAULT_CONFIG,biome:'mountain',mountainSnow:false});
    const winter=generateMap({...DEFAULT_CONFIG,biome:'mountain',mountainSnow:true});
    expect(summer.terrain).not.toContain('snow');expect(winter.terrain).toContain('snow');expect(summer.terrain).not.toEqual(winter.terrain);
  });
  it('water and landmark controls remain meaningful and density changes decoration',()=>{
    for(const biome of ['ruins','village','mountain','building'] as Biome[]) {
      const sparse=generateMap({...DEFAULT_CONFIG,biome,water:false,landmarks:false,density:0});check(sparse);
      expect(sparse.terrain).not.toContain('water');
      expect(sparse.objects.some(o=>['campfire','altar','statue','well','market-stall','torch','tent'].includes(o.asset))).toBe(false);
      const full=generateMap({...DEFAULT_CONFIG,biome,density:100});
      expect(full.objects.length).toBeGreaterThan(sparse.objects.length);
    }
  });
  it('migrates old version-2 settings without changing geometry or objects',()=>{
    const map=generateMap(DEFAULT_CONFIG),config={...map.config} as Record<string,unknown>;
    for(const key of ['buildingType','ruinDecay','villageLayout','mountainSnow'])delete config[key];
    const restored=parseMap(JSON.stringify({...map,config}));
    expect(restored.terrain).toEqual(map.terrain);expect(restored.objects).toEqual(map.objects);
    expect(restored.config.buildingType).toBe(SCENARIO_DEFAULTS.buildingType);
    expect(restored.config.mountainSnow).toBe(true);
  });
  it('validates the new config values and recognizes new editable terrains',()=>{
    for(const partial of [{buildingType:'castle'},{buildingType:'__proto__'},{ruinDecay:101},{ruinDecay:NaN},{villageLayout:'invalid'},{mountainSnow:'yes'}]) {
      expect(()=>generateMap({...DEFAULT_CONFIG,...partial} as never)).toThrow();
      expect(()=>parseMap(JSON.stringify({...generateMap(DEFAULT_CONFIG),config:{...DEFAULT_CONFIG,...partial}}))).toThrow();
    }
    const map=generateMap(DEFAULT_CONFIG);map.terrain[0]='wood';map.terrain[1]='snow';map.terrain[2]='gravel';
    expect(parseMap(JSON.stringify(map))).toEqual(map);
  });
});
