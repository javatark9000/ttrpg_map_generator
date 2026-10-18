import type { AssetId, BattleMap } from '../types';
import type { Random } from '../random';
import { painter } from '../scenario-painter';
import type { PlaceObject } from '../scenario-painter';
import { connectRegions } from './connectivity';

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
  connectRegions(map, 'path');
}
