import type { AssetId, BattleMap } from '../types';
import { fbm, hashString, Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';

export function generateMountain(map:BattleMap,rng:Random,place:PlaceObject):void {
  const p=painter(map,place),{w,h}=p,c=map.config,seed=hashString(c.seed),portrait=h>w;
  const length=portrait?h:w,span=portrait?w:h;
  const route=(long:number)=>span*.5+Math.sin(long/length*(4+c.complexity*.04)+seed%6)*span*(.06+c.complexity*.0014);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const n=fbm(x*.16,y*.16,seed),long=portrait?y:x,short=portrait?x:y,distance=Math.abs(short-route(long));
    let terrain:typeof map.terrain[number]=n>.49?'rock':n<.4?'grass':'gravel';
    if(c.mountainSnow&&n>.57)terrain='snow';
    if(distance<1.15+n*.35)terrain='path';
    p.set(x,y,terrain);
  }
  map.spawn=portrait?{x:Math.round(route(0)),y:0}:{x:0,y:Math.round(route(0))};
  if(c.water) {
    const lx=portrait?Math.max(2,Math.min(w-3,route(h*.7)+3)):Math.floor(w*.7),ly=portrait?Math.floor(h*.7):Math.max(2,Math.min(h-3,route(w*.7)+3));
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(Math.hypot((x-lx)/1.3,y-ly)<Math.min(2.4,span*.16)&&p.at(x,y)!=='path')p.set(x,y,'water');
  }
  for(let i=0;i<w*h*c.density/1100;i++) {
    const x=rng.int(1,w-2),y=rng.int(1,h-2),t=p.at(x,y);
    if(t==='grass'||t==='gravel')p.object(rng.pick<AssetId>(['rock','rock','tree-pine','bush']),x+.5,y+.5,.6+rng.next()*.5,rng.next()*6.28);
    else if(t==='rock'&&rng.next()<.3)p.object('rock',x+.5,y+.5,.85);
  }
  if(c.landmarks) {
    for(let long=5;long<length-3;long+=Math.max(7,Math.floor(length/6))) {
      const x=portrait?route(long)+1.8:long,y=portrait?long:route(long)+1.8;
      if(p.open(x,y))p.object('cairn',x+.3,y+.3,.7);
    }
    const long=Math.floor(length*.32),short=Math.max(2,Math.min(span-3,Math.round(route(long)+2)));
    const x=portrait?short:long,y=portrait?long:short;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(p.at(x+dx,y+dy)!=='path')p.set(x+dx,y+dy,'gravel');
    p.object('tent',x+.5,y+.5,.7);p.object('campfire',x+1.6,y+.5,.65);
  }
}
