import type { AssetId, BattleMap } from '../types';
import { fbm, hashString, Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';

export function generateRuins(map:BattleMap,rng:Random,place:PlaceObject):void {
  const p=painter(map,place),{w,h}=p,c=map.config,seed=hashString(c.seed);
  map.terrain.fill('grass');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(fbm(x*.15,y*.15,seed)>.58)p.set(x,y,'gravel');
  const step=c.complexity>60?9:13,cols=Math.max(1,Math.floor(w/step)),rows=Math.max(1,Math.floor(h/step));
  const sites=[];
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++) {
    const pw=Math.floor(w/cols),ph=Math.floor(h/rows);
    const rw=Math.min(pw-3,rng.int(6,10)),rh=Math.min(ph-3,rng.int(6,10));
    const r={x:gx*pw+Math.max(1,Math.floor((pw-rw)/2)),y:gy*ph+Math.max(1,Math.floor((ph-rh)/2)),w:rw,h:rh};
    p.rect(r,'floor');p.border(r);
    for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++) {
      const wear=fbm(x*.48,y*.48,seed+31);
      if(p.at(x,y)==='wall'&&wear<.18+c.ruinDecay*.006)p.set(x,y,wear<.4?'gravel':'grass');
      else if(p.at(x,y)==='floor'&&fbm(x*.4,y*.4,seed+71)>.7-c.ruinDecay*.0024)p.set(x,y,'grass');
    }
    const door={x:r.x+Math.floor(r.w/2),y:r.y+r.h-1};p.set(door.x,door.y,'floor');
    if(r.w>=6)p.object('archway',door.x+.5,door.y+.5,.8);
    sites.push(r);
    if(c.landmarks) {
      p.object('broken-pillar',r.x+1.6,r.y+1.6,.85,rng.next());
      if(r.w>7)p.object('broken-pillar',r.x+r.w-1.6,r.y+1.6,.85);
    }
    for(let i=0;i<r.w*r.h*c.density/650;i++) {
      const x=r.x+rng.next()*r.w,y=r.y+rng.next()*r.h;
      if(Math.hypot(x-door.x-.5,y-door.y-.5)>1.2)p.object('rubble',x,y,.55+rng.next()*.35,rng.next()*6.28);
    }
  }
  const first=sites[0];map.spawn={x:first.x+Math.floor(first.w/2),y:first.y+first.h-1};
  if(c.landmarks){const last=sites.at(-1)!;p.object(c.theme==='anime'?'altar':'statue',last.x+last.w/2,last.y+last.h/2,.8);}
  if(c.water) for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(Math.hypot((x-w*.79)/1.4,y-h*.77)<Math.min(w,h)*.12&&['grass','gravel'].includes(p.at(x,y)!))p.set(x,y,'water');
  for(let i=0;i<w*h*c.density/1100;i++) {
    const x=rng.int(1,w-2),y=rng.int(1,h-2);
    if(p.at(x,y)==='grass'&&Math.hypot(x-map.spawn.x,y-map.spawn.y)>2)p.object(rng.pick<AssetId>(c.theme==='dark'?['bush','tree-oak','bones','log']:['bush','tree-oak','flowers','flowers']),x+.5,y+.5,.65+rng.next()*.3,rng.next()*6.28);
  }
}
