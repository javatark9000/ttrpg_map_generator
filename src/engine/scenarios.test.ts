import { describe, expect, it } from 'vitest';
import { generateMap, getRegions } from './generate';
import { DEFAULT_CONFIG } from './types';
import { PATH_LAYOUTS, SCENARIO_DEFAULTS, maxRoomCount, scenarioOptionsError } from './scenario-options';
import { buildForestPaths } from './forest-paths';
import { parseMap } from './storage';
import { THEME_IDS } from './themes';

describe('exact dungeon room counts', () => {
  it.each(THEME_IDS)('honors every feasible request across seeds and formats in %s', theme => {
    for (const [width,height] of [[8,8],[8,120],[120,8],[24,18],[40,30],[36,64],[80,80]]) {
      const max=maxRoomCount(width,height);
      for (const count of [...new Set([1, Math.min(6,max), Math.min(13,max), max])]) for(let i=0;i<3;i++) {
        const config={...DEFAULT_CONFIG,biome:'dungeon' as const,theme,width,height,roomCount:count,complexity:i*50,seed:`RC-ROOMS-${i}`};
        const map=generateMap(config);
        expect(map.rooms,`${theme}/${width}x${height}/${count}/${i}`).toHaveLength(count);
        expect(getRegions(map)).toHaveLength(1);
        for (const a of map.rooms!) {
          expect(a.w).toBeGreaterThanOrEqual(4);expect(a.h).toBeGreaterThanOrEqual(4);
          expect(a.x).toBeGreaterThanOrEqual(1);expect(a.y).toBeGreaterThanOrEqual(1);
          expect(a.x+a.w).toBeLessThan(width);expect(a.y+a.h).toBeLessThan(height);
          for(const b of map.rooms!)if(a!==b)expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y).toBe(true);
        }
        expect(parseMap(JSON.stringify(map))).toEqual(map);
      }
    }
  });
  it('keeps automatic mode and deterministic manual generation', () => {
    const auto=generateMap({...DEFAULT_CONFIG,biome:'dungeon',roomCount:0});
    expect(auto.rooms!.length).toBeGreaterThan(0);
    const config={...DEFAULT_CONFIG,biome:'dungeon' as const,roomCount:9};
    expect(generateMap(config)).toEqual(generateMap(config));
    expect(generateMap({...config,landmarks:false}).rooms).toHaveLength(9);
  });
  it('rejects impossible, fractional, negative and nonnumeric counts rather than silently reducing them', () => {
    for(const count of [-1, 1.5, NaN, Infinity, 41])expect(()=>generateMap({...DEFAULT_CONFIG,biome:'dungeon',roomCount:count})).toThrow();
    expect(()=>generateMap({...DEFAULT_CONFIG,biome:'dungeon',width:8,height:8,roomCount:2})).toThrow(/caben hasta 1/);
    expect(maxRoomCount(40,30)).toBe(30);expect(maxRoomCount(80,80)).toBe(40);
  });
});

describe('forest path networks', () => {
  it.each(PATH_LAYOUTS)('$name has distinct, deterministic geometry in every theme', layout => {
    for (const theme of THEME_IDS) {
      const config={...DEFAULT_CONFIG,theme,forestPathLayout:layout.id,water:false,landmarks:false};
      const a=generateMap(config), b=generateMap(config);
      expect(a).toEqual(b);expect(a.terrain).toContain('path');
      const roads={...a,terrain:a.terrain.map(t=>t==='path'?'floor' as const:'wall' as const)};
      expect(getRegions(roads),layout.id).toHaveLength(1);
      expect(parseMap(JSON.stringify(a))).toEqual(a);
    }
  });
  it('has seven different networks, and complexity and seed affect the curves', () => {
    const maps=PATH_LAYOUTS.map(l=>generateMap({...DEFAULT_CONFIG,forestPathLayout:l.id,water:false,landmarks:false}).terrain.join(','));
    expect(new Set(maps).size).toBe(7);
    expect(buildForestPaths(DEFAULT_CONFIG)).not.toEqual(buildForestPaths({...DEFAULT_CONFIG,seed:'RC-OTRO'}));
    expect(buildForestPaths({...DEFAULT_CONFIG,complexity:0})).not.toEqual(buildForestPaths({...DEFAULT_CONFIG,complexity:100}));
  });
  it('respects horizontal and vertical edge choices without auto-transposing portrait maps', () => {
    const vertical=buildForestPaths({...DEFAULT_CONFIG,width:24,height:48,forestPathLayout:'vertical'})[0].points;
    const horizontal=buildForestPaths({...DEFAULT_CONFIG,width:24,height:48,forestPathLayout:'meander'})[0].points;
    expect(vertical[0].y).toBe(.5);expect(vertical.at(-1)!.y).toBe(47.5);
    expect(horizontal[0].x).toBe(.5);expect(horizontal.at(-1)!.x).toBe(23.5);
  });
  it('adds independent alternate routes and interior dead ends without changing the primary route', () => {
    for(const layout of PATH_LAYOUTS) {
      const base={...DEFAULT_CONFIG,forestPathLayout:layout.id,water:false,landmarks:false};
      const main=buildForestPaths(base);
      const all=buildForestPaths({...base,forestBranches:true,forestDeadEnds:true});
      expect(all.filter(r=>r.kind==='main')).toEqual(main);
      expect(all.filter(r=>r.kind==='alternate')).toHaveLength(1);
      expect(all.filter(r=>r.kind==='dead-end')).toHaveLength(2);
      for (const route of all.filter(r=>r.kind==='dead-end')) {
        expect(main.some(r=>r.points.some(p=>p.x===route.points[0].x&&p.y===route.points[0].y))).toBe(true);
        const end=route.points.at(-1)!;
        expect(end.x).toBeGreaterThan(0);expect(end.x).toBeLessThan(base.width);
        expect(end.y).toBeGreaterThan(0);expect(end.y).toBeLessThan(base.height);
        expect(Math.min(...main.flatMap(r=>r.points.map(p=>Math.hypot(p.x-end.x,p.y-end.y))))).toBeGreaterThan(2);
      }
      const count=(c:typeof base)=>generateMap(c).terrain.filter(t=>t==='path').length;
      expect(count({...base,forestBranches:true})).toBeGreaterThan(count(base));
      expect(count({...base,forestDeadEnds:true})).toBeGreaterThan(count(base));
    }
  });
  it('disabling paths removes all roads and bridges, even with secondary options and landmarks selected', () => {
    for(const water of [false,true]) {
      const config={...DEFAULT_CONFIG,water,forestPaths:false,forestBranches:true,forestDeadEnds:true};
      const map=generateMap(config);
      expect(buildForestPaths(config)).toEqual([]);expect(map.terrain).not.toContain('path');
      expect(map.objects.some(o=>o.asset==='bridge')).toBe(false);expect(getRegions(map)).toHaveLength(1);
    }
  });
  it('keeps bounds and connectivity for narrow formats and every path layout', () => {
    for(const [width,height] of [[8,8],[8,120],[120,8],[36,64]])for(const layout of PATH_LAYOUTS) {
      const map=generateMap({...DEFAULT_CONFIG,width,height,forestPathLayout:layout.id,forestBranches:true,forestDeadEnds:true});
      expect(getRegions(map)).toHaveLength(1);
      expect(map.objects.every(o=>o.x>=0&&o.y>=0&&o.x<width&&o.y<height)).toBe(true);
    }
  });
});

describe('scenario settings migration and validation', () => {
  it('adds defaults to pre-feature version-2 files without changing their content', () => {
    const map=generateMap(DEFAULT_CONFIG);
    const oldConfig={...map.config} as Record<string,unknown>;
    for(const key of Object.keys(SCENARIO_DEFAULTS))delete oldConfig[key];
    const migrated=parseMap(JSON.stringify({...map,config:oldConfig}));
    expect(migrated.terrain).toEqual(map.terrain);expect(migrated.objects).toEqual(map.objects);
    for(const [key,value]of Object.entries(SCENARIO_DEFAULTS))expect(migrated.config[key as keyof typeof SCENARIO_DEFAULTS]).toBe(value);
  });
  it('rejects invalid option values and malformed room metadata', () => {
    expect(scenarioOptionsError({...DEFAULT_CONFIG,forestPathLayout:'invalid' as never})).toBeTruthy();
    const map=generateMap(DEFAULT_CONFIG);
    for(const key of ['forestPaths','forestBranches','forestDeadEnds'])expect(()=>parseMap(JSON.stringify({...map,config:{...map.config,[key]:'false'}}))).toThrow();
    expect(()=>parseMap(JSON.stringify({...map,rooms:[{x:0,y:0,w:200,h:200}]}))).toThrow();
    expect(()=>parseMap(JSON.stringify({...map,config:{...map.config,roomCount:-10}}))).toThrow();
  });
});
