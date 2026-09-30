import type { AssetId, BattleMap } from './types';
import { fbm, hashString, Random } from './random';
import { painter } from './scenario-painter';
import type { PlaceObject } from './scenario-painter';

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

export function generateVillage(map:BattleMap,rng:Random,place:PlaceObject):void {
  const p=painter(map,place),{w,h}=p,c=map.config;
  map.terrain.fill('grass');
  const block=c.complexity>65?8:10,cols=Math.max(1,Math.floor(w/block)),rows=Math.max(1,Math.floor(h/block));
  const pw=Math.floor(w/cols),ph=Math.floor(h/rows),centralCol=Math.floor(cols/2),centralRow=Math.floor(rows/2);
  const linear=c.villageLayout==='linear',wide=w>=h;
  const street=wide?Math.min(h-1,(Math.floor((rows-1)/2)+1)*ph):Math.min(w-1,(Math.floor((cols-1)/2)+1)*pw);
  if(linear) { if(wide)p.line(0,street,w-1,street);else p.line(street,0,street,h-1); }
  else {
    for(let col=0;col<=cols;col++)p.line(Math.min(w-1,col*pw),0,Math.min(w-1,col*pw),h-1);
    for(let row=0;row<=rows;row++)p.line(0,Math.min(h-1,row*ph),w-1,Math.min(h-1,row*ph));
  }
  let buildings=0;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
    const radius=pw>=10&&ph>=10&&rng.next()<.25?3:2;
    const cx=Math.min(w-radius-2,rng.int(col*pw+radius+1,(col+1)*pw-radius-2));
    const cy=Math.min(h-radius-2,rng.int(row*ph+radius+1,(row+1)*ph-radius-2));
    const plaza=c.villageLayout==='square'&&cols*rows>1&&col===centralCol&&row===centralRow;
    const besideStreet=c.villageLayout!=='linear'||(w>=h?row===Math.floor((rows-1)/2):col===Math.floor((cols-1)/2));
    if(plaza) {p.rect({x:col*pw+1,y:row*ph+1,w:pw-1,h:ph-1},'floor');continue;}
    if(c.water&&cols*rows>2&&col===0&&row===rows-1)continue;
    if(!besideStreet||((buildings>0)&&rng.next()>.3+c.density/145))continue;
    const r={x:cx-radius,y:cy-radius,w:radius*2+1,h:radius*2+1};p.rect(r,'floor');p.border(r);
    if(linear&&!wide){p.set(cx+radius,cy,'path');p.line(cx+radius+1,cy,street,cy);}
    else {p.set(cx,cy+radius,'path');p.line(cx,cy+radius+1,cx,linear?street:Math.min(h-1,(row+1)*ph));}
    p.object(rng.next()<.35?'roof-shop':'roof-house',cx+.5,cy+.5,(radius*2+1)/5,rng.pick([0,Math.PI/2,Math.PI,Math.PI*1.5]));
    p.object('door',linear&&!wide?cx+radius+.5:cx+.5,linear&&!wide?cy+.5:cy+radius+.5,.8,linear&&!wide?Math.PI/2:0);
    if(rng.next()<c.density/200)p.object('fence',cx+.5,cy-radius-.7,.9);
    buildings++;
    if(c.landmarks&&rng.next()<.5)p.object('cart',Math.max(.8,cx-radius-1),cy+radius+1.2,.65,rng.next()<.5?Math.PI/2:0);
  }
  const px=Math.min(w-2,centralCol*pw+Math.floor(pw/2))+.5,py=Math.min(h-2,centralRow*ph+Math.floor(ph/2))+.5;
  if(c.landmarks) {
    if(c.villageLayout==='square'&&cols*rows>1){p.object('well',px,py,.9);p.object('market-stall',px-2.8,py+1.8,.85);p.object('market-stall',px+2.7,py-1.8,.85,Math.PI);}
    else {p.object('well',1.2,1.2,.65);p.object('market-stall',Math.min(w-1.5,3.5),1.2,.6);}
  }
  if(c.water&&cols*rows>2) {
    // A reserved green plot guarantees room for a pond without flooding roofs.
    const lx=Math.floor(pw/2),ly=(rows-1)*ph+Math.floor(ph/2),radius=Math.min(2.8,pw*.22,ph*.22);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(p.at(x,y)==='grass'&&Math.hypot(x-lx,y-ly)<radius)p.set(x,y,'water');
    if(c.landmarks)p.object('bench',lx+.5,ly-radius-1,.85);
    if(c.density>20){p.object('lilies',lx+.5,ly+.5,.65);p.object('reeds',lx+radius,ly+.5,.75);}
  }
  for(let i=0;i<w*h*c.density/1700;i++) {
    const x=rng.int(1,w-2),y=rng.int(1,h-2);
    if(p.at(x,y)==='grass'&&[p.at(x-1,y),p.at(x+1,y),p.at(x,y-1),p.at(x,y+1)].every(t=>t==='grass'))p.object(rng.pick<AssetId>(['tree-oak','bush','flowers']),x+.5,y+.5,.7,rng.next()*6.28);
  }
  map.spawn=linear?(wide?{x:0,y:street}:{x:street,y:0}):{x:0,y:0};
}

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
