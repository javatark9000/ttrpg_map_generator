import type { AssetId, BattleMap, Terrain } from './types';
import { Random } from './random';
import { painter } from './scenario-painter';
import type { PlaceObject } from './scenario-painter';

/** Roofless interiors with purpose-specific circulation, not re-skinned dungeons. */
export function generateBuilding(map:BattleMap,rng:Random,place:PlaceObject):void {
  const p=painter(map,place),{w,h}=p,c=map.config,type=c.buildingType;
  const floor:Terrain=['smithy','temple','warehouse'].includes(type)?'floor':'wood';
  map.terrain.fill('wall');p.rect({x:1,y:1,w:w-2,h:h-2},floor);
  const entrance=Math.floor(w/2);p.set(entrance,h-1,floor);p.object('door',entrance+.5,h-.5,.9);
  map.spawn={x:entrance,y:h-2};
  const door=(x:number,y:number,vertical=false)=>{p.set(x,y,floor);p.object('door',x+.5,y+.5,.85,vertical?Math.PI/2:0);};
  const wallV=(x:number,y1:number,y2:number,opening:number)=>{for(let y=y1;y<=y2;y++)p.set(x,y,'wall');door(x,opening,true);};
  const wallH=(y:number,x1:number,x2:number,opening:number)=>{for(let x=x1;x<=x2;x++)p.set(x,y,'wall');door(opening,y);};
  const furniture=(asset:AssetId,x:number,y:number,scale=1,rotation=0,required=false)=>{
    if(p.open(x,y)&&(required||rng.next()*100<c.density)){p.object(asset,x,y,scale,rotation);return true;}
    return false;
  };
  const feature=(asset:AssetId,x:number,y:number,scale=1,rotation=0)=>{if(c.landmarks)furniture(asset,x,y,scale,rotation,true);};
  // Shared service wing for a home, tavern or workshop, with distinct fittings.
  let wing=w-1;
  if(['house','tavern','smithy'].includes(type)) {
    if(w>=14) {
      wing=Math.max(6,Math.min(w-6,Math.floor(w*((type==='tavern'?.66:.57)+c.complexity*.0006+(rng.next()-.5)*.1))));
      wallV(wing,1,h-3,Math.floor(h*.7));
      if(h>=13)wallH(Math.floor(h*.48),wing+1,w-2,Math.floor(wing+(w-wing)*(type==='house'&&w-wing>=12?.25:.5)));
    } else if(h>=14)wallH(Math.floor(h*.4),1,w-2,entrance);
  }
  if(type==='house') {
    if(wing>=12&&h>=15) {
      const top=Math.floor(h*.38),study=Math.floor(wing*.5);
      wallH(top,1,wing-1,Math.max(3,Math.floor(wing*.65)));
      wallV(study,1,top-1,Math.floor(top*.6));
      feature('table',study*.5+1,top*.5,.85);
      feature('bookshelf',study+(wing-study)*.5,2.5,.95);
      furniture('rug',study+(wing-study)*.5,top*.5,1);
      furniture('bench',study+(wing-study)*.5,top*.5,.85);
    }
    const splitBedrooms=wing<w-1&&w-wing>=12&&h>=13;
    if(splitBedrooms)wallV(wing+Math.floor((w-wing)/2),1,Math.floor(h*.48)-1,Math.floor(h*.22));
    feature('table',Math.max(3,wing*.45),h*.65,.9);
    furniture('bench',Math.max(3,wing*.45),h*.65+1.8,.8);
    const bx=wing<w-1?wing+(w-wing)*(splitBedrooms?.25:.5):w*.65;
    if(splitBedrooms){feature('bed',wing+(w-wing)*.75,Math.max(2.5,h*.22),.95);furniture('chest',w-2.5,Math.max(2.5,h*.28),.8);}
    feature('bed',bx,Math.max(2.5,h*.22),.95);
    furniture('chest',Math.min(w-2,bx+1.8),Math.max(2,h*.22),.8);
    feature('counter',bx,h*.75,.85);
    furniture('barrels',bx,h-2.6,.65);
    furniture('rug',Math.max(3,wing*.45),h*.65,1);
    for(let y=Math.ceil(h*.58);y<h-3;y+=5){furniture('bookshelf',2.3,y,.85,Math.PI/2);furniture('sacks',w-2.4,y,.75);}
  } else if(type==='tavern') {
    const barX=Math.max(2.5,wing-2.2);
    feature('counter',barX,h*.32,.95,Math.PI/2);
    feature('barrels',wing<w-1?(wing+w)/2:w-2.2,h*.22,.8);
    const spacing=c.complexity>60?4:5;
    for(let y=3;y<h-3;y+=spacing)for(let x=3;x<wing-3;x+=spacing) {
      if(furniture('table',x,y,.9)){furniture('bench',x,y+1.6,.7,0,true);if(c.density>70)furniture('bench',x,y-1.6,.7,0,true);}
    }
    feature('table',Math.max(2.8,wing*.4),h*.65,.9);
    furniture('books',barX,h*.32,.5);
    if(wing<w-1){
      feature('counter',(wing+w)/2,h*.67,.85);
      for(let y=3;y<h-3;y+=4){furniture('barrels',w-2.5,y,.8);furniture('sacks',wing+2.5,y,.8);}
    }
  } else if(type==='inn') {
    const end=h>=19?h-6:h-2,step=c.complexity>60?6:9;
    if(w>=16) {
      const left=Math.floor(w/2)-1,right=left+3;
      for(let y=1;y<end;y++){p.set(left,y,'wall');p.set(right,y,'wall');}
      for(let y=1;y<end;y+=step) {
        const bottom=Math.min(end,y+step),mid=Math.floor((y+bottom)/2);
        if(y>1){for(let x=1;x<left;x++)p.set(x,y,'wall');for(let x=right+1;x<w-1;x++)p.set(x,y,'wall');}
        door(left,mid,true);door(right,mid,true);
        feature('bed',Math.max(2.5,left*.5),mid+.5,.9);feature('bed',Math.min(w-2.5,(right+w)/2),mid+.5,.9);
        furniture('chest',left-1.5,Math.min(bottom-1.2,mid+1.8),.65);
        furniture('table',3,mid+.5,.75);furniture('table',w-3,mid+.5,.75);
        furniture('rug',Math.max(2.5,left*.5),mid+.5,.85);furniture('rug',Math.min(w-2.5,(right+w)/2),mid+.5,.85);
        furniture('bookshelf',left*.5,y+1.2,.8);furniture('bookshelf',(right+w)/2,y+1.2,.8);
        furniture('chest',right+1.6,Math.min(bottom-1.2,mid+1.8),.65);
      }
    } else {
      for(let y=step;y<end-2;y+=step)wallH(y,1,w-2,entrance);
      for(let y=3;y<end-1;y+=step){feature('bed',2.5,y,.85);furniture('chest',w-2,y,.65);}
    }
    if(h>=19)feature('counter',w*.35,h-3,.85);
  } else if(type==='temple') {
    if(h>=16)wallH(6,1,w-2,entrance);
    feature('altar',w/2,Math.min(3.4,h*.3),Math.min(1.1,(w-3)/4));
    const start=h>=16?9:Math.max(4,Math.floor(h*.5));
    for(let y=start;y<h-3;y+=4) {
      if(w>=12){for(let x=5;x<w-3;x+=3.5)if(Math.abs(x-w/2)>2)furniture('bench',x,y,.95);}
      else furniture('bench',2.6,y,.6);
    }
    if(w>=12)for(let y=start-1;y<h-3;y+=6){feature('pillar',2.5,y,.8);feature('pillar',w-2.5,y,.8);}
    feature('statue',w-2.5,3,.8);
    if(w>18){feature('statue',w*.28,3.2,.9);feature('statue',w*.72,3.2,.9);}
  } else if(type==='library') {
    if(h>=16)wallH(h-7,1,w-2,entrance);
    const end=h>=16?h-9:h-3;
    const spacing=c.complexity>60?3:4;
    for(let y=3;y<end;y+=spacing)for(let x=3;x<w-2;x+=spacing)if(Math.abs(x-entrance)>1.5)furniture('bookshelf',x,y,.9);
    feature('bookshelf',2.6,2.5,.8);
    feature('table',w/2,h-4,.9);feature('books',w/2+.3,h-4,.6);
    furniture('rug',w/2,h-4,1.1);
  } else if(type==='warehouse') {
    if(w>=16){const divider=Math.floor(w*(.65+rng.next()*.13));wallV(divider,1,h-2,Math.floor(h*.75));}
    for(let y=3;y<h-3;y+=3)for(let x=2.5;x<w-2;x+=3)if(Math.abs(x-entrance)>1.8)furniture(rng.pick<AssetId>(['crates','barrels','sacks']),x,y,.8,rng.next()*.2);
    feature('cart',Math.max(2.5,w*.25),h-3,.8);
    feature('sacks',w-2.5,2.5,.85);
  } else if(type==='barracks') {
    if(h>=16)wallH(6,1,w-2,entrance);
    const start=h>=16?9:3;
    for(let y=start;y<h-3;y+=4)for(let x=2.5;x<w-2;x+=3.5)if(Math.abs(x-entrance)>1.4)furniture('bed',x,y,.85);
    feature('weapon-rack',w-2.5,3,.85);feature('table',Math.max(2.6,w*.3),3,.9);
    if(h>=16)feature('bed',2.5,start,.9);
  } else if(type==='smithy') {
    const fx=Math.max(2.6,wing*.4);
    feature('forge',fx,3.4,.95);feature('campfire',fx,3.55,.42);
    for(let y=7;y<h-3;y+=5)furniture('anvil',Math.max(2.8,wing*.5),y,.95);
    feature('anvil',Math.max(2.7,wing*.45),Math.min(h-2.3,6.4),.9);
    feature('weapon-rack',wing<w-1?(wing+w)/2:w-2.2,Math.max(2.5,h*.23),.85);
    furniture('sacks',wing<w-1?(wing+w)/2:w-2.3,h-3,.8);
    furniture('counter',Math.max(2.7,wing*.4),h-3,.8);
  }
  // Reserve the entrance landing even when a seeded partition aligns with it.
  p.set(map.spawn.x,map.spawn.y,floor);
  if(['house','tavern','smithy','warehouse'].includes(type)&&rng.next()<.5) {
    const original=map.terrain.slice();
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)p.set(x,y,original[y*w+w-1-x]);
    for(const obj of map.objects){obj.x=w-obj.x;obj.rotation=Math.PI-obj.rotation;}
    map.spawn.x=w-1-map.spawn.x;
  }
  if(c.landmarks) {
    p.object('torch',1.6,Math.min(h-2.5,3.5),.65,-Math.PI/2);
    if(w>14)p.object('torch',w-1.6,h-3.5,.65,Math.PI/2);
  }
}
