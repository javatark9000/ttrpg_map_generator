import type { AssetId, BattleMap } from './types';
import { ASSET_SIZES } from './types';
import { buildForestPaths } from './forest-paths';
import { fbm, hashString, Random } from './random';
type Place = (asset: AssetId, x: number, y: number, scale?: number, rotation?: number) => void;
export function generateForest(map: BattleMap, rng: Random, object: Place): void {
  const config=map.config, {width:w,height:h}=config, s=hashString(config.seed), variation=config.complexity/100;
  const at=(x:number,y:number)=>map.terrain[y*w+x];
  const set=(x:number,y:number,t:'path'|'water'|'sand')=>{if(x>=0&&y>=0&&x<w&&y<h)map.terrain[y*w+x]=t;};
  const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));
  const riverX=(y:number)=>w*.67+Math.sin(y/h*(3+variation*3.6)+s%4)*Math.min(w,h*1.6)*(.02+variation*.064);
  if(config.water) for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const n=fbm(x*.12,y*.12,s),d=Math.abs(x-riverX(y));
    if(d<2+n*.4)set(x,y,'sand'); if(d<1.35+n*.3)set(x,y,'water');
  }
  const original=map.terrain.slice(), routes=buildForestPaths(config), road=new Uint8Array(w*h);
  for(const route of routes) {
    for(const p of route.points) {
      const radius=route.kind==='main'?1.15+fbm(p.x*.1,p.y*.1,s)*.25:.87;
      for(let y=Math.floor(p.y-radius);y<=Math.ceil(p.y+radius);y++)for(let x=Math.floor(p.x-radius);x<=Math.ceil(p.x+radius);x++) {
        if(x>=0&&y>=0&&x<w&&y<h&&Math.hypot(x+.5-p.x,y+.5-p.y)<=radius) {set(x,y,'path');road[y*w+x]=1;}
      }
    }
    // Bridges follow the actual angle of each river crossing, including diagonal trails.
    let start=-1;
    for(let i=0;i<=route.points.length;i++) {
      const point=route.points[i], wet=point&&original[Math.floor(point.y)*w+Math.floor(point.x)]==='water';
      if(wet&&start<0)start=i;
      if(!wet&&start>=0) {
        const a=route.points[Math.max(0,start-3)],b=route.points[Math.min(route.points.length-1,i+2)];
        const length=Math.hypot(b.x-a.x,b.y-a.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
        if(length>1&&length<11&&!map.objects.some(o=>o.asset==='bridge'&&Math.hypot(o.x-x,o.y-y)<3)) {
          object('bridge',x,y,Math.max(4.5,length+1.4)/ASSET_SIZES.bridge,Math.atan2(b.y-a.y,b.x-a.x));
        }
        start=-1;
      }
    }
  }
  const main=routes[0]?.points;
  let camp={x:Math.round(w*.33),y:Math.round(h*.45)};
  if(main) {
    const target=main[Math.floor(main.length*.32)];
    const dry=main.filter(p=>original[Math.floor(p.y)*w+Math.floor(p.x)]!=='water'&&p.x>=3&&p.y>=3&&p.x<w-3&&p.y<h-3&&!map.objects.some(o=>o.asset==='bridge'&&Math.hypot(o.x-p.x,o.y-p.y)<o.scale/2+2.5));
    dry.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));
    camp={x:Math.floor((dry[0]??target).x),y:Math.floor((dry[0]??target).y)};
  }
  camp={x:clamp(camp.x,3,w-4),y:clamp(camp.y,3,h-4)};
  if(config.landmarks) {
    for(let y=camp.y-2;y<=camp.y+2;y++)for(let x=camp.x-2;x<=camp.x+2;x++) if(Math.hypot(x-camp.x,y-camp.y)<2.6) set(x,y,config.forestPaths?'path':'sand');
    object('campfire',camp.x+.5,camp.y+.5,1.05);
    object('bedroll',camp.x-1,camp.y+.8,1,-.3); object('bedroll',camp.x+1.4,camp.y-.7,1,.6);
    object('log',camp.x+.1,camp.y-1.3,.9,.12);object('barrels',camp.x+1.5,camp.y+1.5,.7);
  }
  // Clearance comes from the rasterized network, not a single horizontal equation.
  const nearRoad=(x:number,y:number)=>{
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
      const xx=Math.floor(x)+dx,yy=Math.floor(y)+dy;
      if(xx>=0&&yy>=0&&xx<w&&yy<h&&road[yy*w+xx]&&Math.hypot(xx+.5-x,yy+.5-y)<1.8)return true;
    }
    return false;
  };
  const trees:{x:number;y:number}[]=[],count=Math.floor(w*h*config.density/650);
  for(let i=0;i<count*14&&trees.length<count;i++) {
    const x=rng.next()*(w-1)+.5,y=rng.next()*(h-1)+.5;
    if(at(Math.floor(x),Math.floor(y))!=='grass'||nearRoad(x,y))continue;
    if(config.landmarks&&Math.hypot(x-camp.x,y-camp.y)<4.1)continue;
    if(trees.some(t=>Math.hypot(t.x-x,t.y-y)<1.7))continue;
    trees.push({x,y});
    object(rng.pick<AssetId>(['tree-oak','tree-oak','tree-pine','tree-gold']),x,y,.8+rng.next()*.45,rng.next()*Math.PI*2);
  }
  for(let i=0;i<w*h*config.density/370;i++) {
    const x=rng.int(1,w-2),y=rng.int(1,h-2);
    if(at(x,y)==='grass'&&!trees.some(t=>Math.hypot(t.x-x,t.y-y)<1)&&(!config.landmarks||Math.hypot(x-camp.x,y-camp.y)>3)) {
      object(rng.pick<AssetId>(config.theme==='dark'?['bush','rock','rock','bones','mushrooms','log','log']:config.theme==='anime'?['bush','flowers','flowers','flowers','crystal','mushrooms','rock']:['bush','bush','rock','flowers','flowers','mushrooms','log']),x+rng.next(),y+rng.next(),.65+rng.next()*.5,rng.next()*6.28);
    } else if(at(x,y)==='water'&&rng.next()<.45)object('lilies',x+.5,y+.5,.8);
    else if(at(x,y)==='sand')object('reeds',x+.5,y+.5);
  }
  if(main)map.spawn={x:Math.floor(main[0].x),y:Math.floor(main[0].y)};
  else {
    const index=map.terrain.findIndex(t=>t!=='water');map.spawn={x:index%w,y:Math.floor(index/w)};
  }
}
