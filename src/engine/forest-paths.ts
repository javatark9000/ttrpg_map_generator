import type { ForestPathLayout, MapConfig } from './types';
import { Random } from './random';
export interface Point { x: number; y: number }
export interface ForestRoute { kind: 'main' | 'alternate' | 'dead-end'; points: Point[] }
type Anchor = [number, number];
const layouts: Record<ForestPathLayout, Anchor[][]> = {
  meander: [[[0,.65],[.22,.5],[.4,.3],[.66,.57],[.83,.44],[1,.35]]],
  vertical: [[[.43,0],[.52,.22],[.64,.42],[.48,.7],[.44,1]]],
  diagonal: [[[0,.16],[.24,.25],[.46,.48],[.65,.62],[.82,1]]],
  bend: [[[0,.75],[.25,.75],[.53,.73],[.68,.5],[.7,.25],[.71,0]]],
  fork: [[[0,.55],[.27,.48],[.48,.52],[.66,.3],[.84,0]], [[.48,.52],[.72,.74],[.89,1]]],
  crossroads: [[[0,.58],[.25,.43],[.49,.52],[.76,.59],[1,.39]], [[.41,0],[.54,.25],[.49,.52],[.44,.77],[.58,1]]],
  loop: [[[.24,.53],[.3,.23],[.5,.17],[.73,.27],[.8,.53],[.7,.8],[.45,.83],[.27,.72],[.24,.53]], [[0,.53],[.12,.53],[.24,.53]]],
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min,n));
function smooth(points: Point[], width: number, height: number): Point[] {
  const result: Point[] = [];
  for (let i=0; i<points.length-1; i++) {
    const p0=points[Math.max(0,i-1)], p1=points[i], p2=points[i+1], p3=points[Math.min(points.length-1,i+2)];
    const steps=Math.max(8,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)*5));
    for(let j=0;j<steps;j++) {
      const t=j/steps, t2=t*t, t3=t2*t;
      const coordinate=(a:number,b:number,c:number,d:number)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
      result.push({ x:clamp(coordinate(p0.x,p1.x,p2.x,p3.x),.5,width-.5), y:clamp(coordinate(p0.y,p1.y,p2.y,p3.y),.5,height-.5) });
    }
  }
  result.push(points[points.length-1]);
  return result;
}
export function buildForestPaths(config: MapConfig): ForestRoute[] {
  if (!config.forestPaths) return [];
  const { width:w, height:h }=config, rng=new Random(`${config.seed}-paths-${config.forestPathLayout}`);
  const cache=new Map<string,Point>();
  const jitter=.015+config.complexity/100*.11;
  const anchor=([x,y]:Anchor):Point=>{
    const key=`${x},${y}`; const saved=cache.get(key); if(saved) return saved;
    const edgeX=x===0||x===1, edgeY=y===0||y===1;
    const point={ x:.5+(edgeX?x:clamp(x+(rng.next()-.5)*jitter*2,.08,.92))*(w-1), y:.5+(edgeY?y:clamp(y+(rng.next()-.5)*jitter*2,.08,.92))*(h-1) };
    cache.set(key,point); return point;
  };
  const routes:ForestRoute[]=layouts[config.forestPathLayout].map(anchors=>({kind:'main',points:smooth(anchors.map(anchor),w,h)}));
  const primary=routes[0].points;
  const distance=(p:Point,route:ForestRoute)=>Math.min(...route.points.filter((_,i)=>i%4===0).map(q=>Math.hypot(p.x-q.x,p.y-q.y)));
  const interior=(p:Point)=>({x:clamp(p.x,1.5,w-1.5),y:clamp(p.y,1.5,h-1.5)});
  if(config.forestBranches) {
    const a=primary[Math.floor(primary.length*.2)], b=primary[Math.floor(primary.length*.68)];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    const offset=Math.max(2,Math.min(w,h)*.26);
    const candidates=[-1,1].map(sign=>interior({x:(a.x+b.x)/2-dy/len*offset*sign,y:(a.y+b.y)/2+dx/len*offset*sign}));
    candidates.sort((a,b)=>distance(b,routes[0])-distance(a,routes[0]));
    routes.push({kind:'alternate',points:smooth([a,candidates[0],b],w,h)});
  }
  if(config.forestDeadEnds) {
    const branches=new Random(`${config.seed}-dead-ends`);
    for (const fraction of [.36,.78]) {
      const start=primary[Math.floor(primary.length*fraction)];
      const candidates:Point[]=[];
      for(let i=0;i<24;i++) {
        const angle=i*Math.PI/12+branches.next()*.12, length=Math.max(2,Math.min(w,h)*(.2+branches.next()*.11));
        candidates.push(interior({x:start.x+Math.cos(angle)*length,y:start.y+Math.sin(angle)*length}));
      }
      const score=(point:Point)=>Math.min(...routes.map(route=>distance(point,route)));
      candidates.sort((a,b)=>score(b)-score(a));
      const end=candidates[0], middle={x:start.x+(end.x-start.x)*.55,y:start.y+(end.y-start.y)*.55};
      routes.push({kind:'dead-end',points:smooth([start,middle,end],w,h)});
    }
  }
  return routes;
}
