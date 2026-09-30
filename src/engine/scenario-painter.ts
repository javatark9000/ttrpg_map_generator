import type { AssetId, BattleMap, Terrain } from './types';
export type PlaceObject = (asset: AssetId, x: number, y: number, scale?: number, rotation?: number) => void;
export interface Rect { x: number; y: number; w: number; h: number }
export function painter(map: BattleMap, place: PlaceObject) {
  const {width:w,height:h}=map.config;
  const at=(x:number,y:number):Terrain|undefined=>x>=0&&y>=0&&x<w&&y<h?map.terrain[Math.floor(y)*w+Math.floor(x)]:undefined;
  const set=(x:number,y:number,t:Terrain)=>{if(x>=0&&y>=0&&x<w&&y<h)map.terrain[Math.floor(y)*w+Math.floor(x)]=t;};
  const rect=(r:Rect,t:Terrain)=>{for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)set(x,y,t);};
  const border=(r:Rect,t:Terrain='wall')=>{for(let x=r.x;x<r.x+r.w;x++){set(x,r.y,t);set(x,r.y+r.h-1,t);}for(let y=r.y;y<r.y+r.h;y++){set(r.x,y,t);set(r.x+r.w-1,y,t);}};
  const line=(x:number,y:number,tx:number,ty:number,t:Terrain='path')=>{x=Math.floor(x);y=Math.floor(y);tx=Math.floor(tx);ty=Math.floor(ty);while(true){set(x,y,t);if(x===tx&&y===ty)break;if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);}};
  const object:PlaceObject=(asset,x,y,scale=1,rotation=0)=>{if(x>=.5&&y>=.5&&x<w&&y<h)place(asset,x,y,scale,rotation);};
  const open=(x:number,y:number)=>{const t=at(x,y);return t!==undefined&&t!=='wall'&&t!=='rock'&&t!=='water';};
  return {w,h,at,set,rect,border,line,object,open};
}
