import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
// Targeted additions: --variants-only --ids=stairs-up,stairs-down leaves Vanilla and other SVGs untouched.
const { values: args } = parseArgs({ options: { 'variants-only': { type: 'boolean', default: false }, ids: { type: 'string' } } });
const root = new URL('../public/assets/', import.meta.url);
const available = (await readdir(root)).filter(f => f.endsWith('.svg')).sort();
const requested = args.ids === undefined ? null : [...new Set(args.ids.split(',').map(id => id.trim()))];
if (requested?.some(id => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !available.includes(`${id}.svg`))) {
  throw new Error('Every --ids entry must name an existing SVG in public/assets/.');
}
const files = requested ? available.filter(file => requested.includes(file.slice(0, -4))) : available;
const copyVanilla = !args['variants-only'];
for (const theme of copyVanilla ? ['vanilla', 'dark', 'anime'] : ['dark', 'anime']) await mkdir(new URL(`${theme}/`, root), { recursive: true });
const num = n => Number(n.toFixed(2));
const path = (d, fill = 'none', stroke = '#303344', width = 1.6) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x,y,r,fill,stroke='none',width=1) => `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const group = (body, transform) => `<g transform="${transform}">${body}</g>`;
const star = (x,y,r,color) => path(`M${x} ${y-r}Q${x+1} ${y-1} ${x+r} ${y}Q${x+1} ${y+1} ${x} ${y+r}Q${x-1} ${y+1} ${x-r} ${y}Q${x-1} ${y-1} ${x} ${y-r}Z`,color,'none');
function randomFor(key) { let s = [...key].reduce((a,c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 1234); return () => { s = (Math.imul(s,1664525)+1013904223) >>> 0; return s/4294967296; }; }
const materialColors = {
  dark: {
    '#af8954':'#887257','#886640':'#564639','#5a4430':'#2e2825',
    '#b0b1a0':'#a4a19b','#7f897f':'#68686b','#505e5b':'#393e44',
    '#d4f8e1':'#e4bac7','#75d1c6':'#9e6686','#3b737e':'#432e4e','#bef2d5':'#bc8b9d','#c8f2df':'#e1bbc5',
    '#fff5bf':'#ffe1ad','#efc575':'#ecac59','#dc8548':'#be632e','#b04e29':'#723629',
    '#744b42':'#542c32','#84544a':'#6c363d','#9f805b':'#8a7357',
    '#a55740':'#716355','#e5d6b5':'#b9b099',
    '#ce9567':'#9d8870','#a85e43':'#654e43','#643e35':'#302c2d','#698a8c':'#525d64','#415f69':'#313b45',
  },
  anime: {
    '#af8954':'#ebbb78','#886640':'#c08b58','#5a4430':'#866044',
    '#b0b1a0':'#e4e5f1','#7f897f':'#a8b5d1','#505e5b':'#7283a4',
    '#d4f8e1':'#faf5ff','#75d1c6':'#b59de9','#3b737e':'#6755a5','#bef2d5':'#d8c1fa','#c8f2df':'#fff6ff',
    '#fff5bf':'#fffbe0','#efc575':'#ffda89','#dc8548':'#ff9e69','#b04e29':'#d9716e',
    '#744b42':'#65518f','#84544a':'#8f75bc','#9f805b':'#eed39a',
    '#79846a':'#91b4ce','#9c9971':'#c5d5e0','#c2baa0':'#f5e9db',
    '#ce9567':'#f0b997','#a85e43':'#cb7783','#643e35':'#8a5f79','#698a8c':'#879fd5','#415f69':'#536fb1',
    '#a55740':'#dc7897','#e5d6b5':'#fff0dc','#496d67':'#7b95ce','#855b4c':'#be85bd',
  },
};
function recolor(svg, theme) {
  return svg.replace(/#[0-9a-f]{6}\b/gi, original => {
    const key = original.toLowerCase();
    if (materialColors[theme][key]) return materialColors[theme][key];
    const rgb = [1,3,5].map(i => parseInt(key.slice(i,i+2),16));
    const lum = rgb[0]*.3+rgb[1]*.55+rgb[2]*.15;
    const next = theme === 'dark'
      ? rgb.map((v,i) => lum*.46 + v*.26 + [5,3,6][i])
      : lum < 85 ? rgb.map((v,i) => v*.48 + [34,38,58][i]) : rgb.map((v,i) => v*.85 + [36,39,49][i]);
    return '#'+next.map(v => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
  }).replace(/hsl\(76 9% ([\d.]+)%\)/g, (_,l) => theme === 'dark' ? `hsl(225 5% ${Number(l)*.7}%)` : `hsl(235 20% ${Number(l)*.8+24}%)`);
}
function lobe(cx,cy,r,fill,stroke,rand,sharp=false) {
  const pts = Array.from({length:16}, (_,i) => { const a=i*Math.PI/8, rr=r*(.85+rand()*.25); return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]; });
  if (sharp) return path('M'+pts.map(p=>p.map(num).join(' ')).join('L')+'Z',fill,stroke,1.7);
  let d=`M${num((pts[15][0]+pts[0][0])/2)} ${num((pts[15][1]+pts[0][1])/2)}`;
  pts.forEach((p,i)=>{const q=pts[(i+1)%16];d+=`Q${num(p[0])} ${num(p[1])} ${num((p[0]+q[0])/2)} ${num((p[1]+q[1])/2)}`;});
  return path(d+'Z',fill,stroke,1.5);
}
function tree(id,theme,rand) {
  let body='';
  if(theme==='dark') {
    body+=path('M62 115L57 89 45 71 31 65 19 45 30 53 45 55 32 31 40 35 55 53 52 25 60 12 60 41 69 58 80 47 84 22 92 14 89 42 108 35 97 51 76 66 74 84 84 107 70 96Z','#665c4d','#24262a',3);
    for(let j=0;j<9;j++) {
      const a=j*6.28/9, x=64+Math.cos(a)*32, y=57+Math.sin(a)*32;
      if(id==='tree-gold' && j%3!==0) continue;
      body+=lobe(x,y,id==='tree-pine'?23:18, id==='tree-gold'?'#645a42':id==='tree-pine'?'#34494b':'#454f3d','#20272a',rand,true);
      body+=path(`M${num(x-10)} ${num(y)}l7 -8 8 3 4 -5`,'none',id==='tree-gold'?'#a29267':'#6e7b64',1);
    }
    body+=path('M64 99L64 69 45 49 28 43M64 72L80 61 98 52M63 61L66 40 77 25M44 49L40 34M80 61L92 72M65 85L51 89','none','#25292a',6);
    body+=path('M63 99L62 70 44 49 28 43M64 73L81 60 98 52M63 62L66 40 77 25','none','#958b70',2);
    body+=path('M66 83l9 -5m-11 -2 8 -5m-18 -18 -9 5m35 3 3 -9','none','#aba188',.8);
  } else {
    const pink=id==='tree-gold';
    const shades=pink?['#a96d9e','#db95b3','#f5bdcb','#ffe0db']:id==='tree-pine'?['#376d73','#509a98','#79beb0','#bbe0ca']:['#487c5f','#74ad70','#a6cd83','#d7e7aa'];
    body+=path('M55 81L44 108 59 97 68 118 76 94 92 105 80 74Z','#b3906e','#5f5360',2);
    body+=lobe(64,65,53,shades[0],'#3c4f5a',rand);
    for(let i=0;i<9;i++) {
      const a=i*6.28/9, x=64+Math.cos(a)*32,y=59+Math.sin(a)*32;
      body+=lobe(x,y,23,shades[1],'#475865',rand);
      body+=lobe(x-3,y-5,18,shades[2],'none',rand);
      body+=path(`M${num(x-12)} ${num(y-6)}q2 -8 12 -8`,'none',shades[3],3);
    }
    body+=lobe(60,52,25,shades[1],'#536478',rand);
    body+=lobe(57,46,20,shades[2],'none',rand);
    for(let i=0;i<16;i++) {
      const a=rand()*6.28,r=rand()*43,x=num(61+Math.cos(a)*r),y=num(54+Math.sin(a)*r);
      if(pink) { for(let p=0;p<5;p++) body+=circle(x+Math.cos(p*6.28/5)*2.8,y+Math.sin(p*6.28/5)*2.8,2.8,'#ffeddf');body+=circle(x,y,1.5,'#d892ab'); }
      else body+=path(`M${x} ${y}q3 -4 6 -2`,'none',shades[3],1.5);
    }
  }
  return body;
}
function groupSwordDetail(x,y,angle,scale,dark) {
  const detail = dark
    ? path('M-3 -26l5 3 -3 6M-3 30l6 -1','none','#a28e77',1.2)
    : path('M-3 -31v28M-11 20h7m8 0h7','none','#e6e6f7',1.5)+circle(0,20,2,'#b3a0dd','#e7d3a0',.8);
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${detail}</g>`;
}
function details(id,theme,rand) {
  const dark=theme==='dark', ink=dark?'#29252b':'#565a89', metal=dark?'#8a8376':'#f1d594';
  const rune=dark?'#b09c8c':'#e5d4ff';
  const crack=(x,y)=>path(`M${x} ${y}l6 7 -3 6 7 9m-4 -15 9 1`,'none',ink,dark?1.9:1.0);
  const crest=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M-10 -12L0 -9 10 -12 9 3Q8 11 0 15Q-8 11 -9 3Z',dark?'#5d3839':'#6d82bd',metal,1.6)}${path('M0 -7V8M-5 0H5','none',metal,1.4)}</g>`;
  const band=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${dark?'#444348':'#d2b275'}" stroke="${ink}" stroke-width="1.2"/>`;
  switch(id) {
    // Expanded worlds: details stay on their material, leaving doorways and
    // modular joins unobstructed. Ritual objects keep their own iconography.
    case 'stairs-up': case 'stairs-down':
      return dark ? path('M16 44l4 7 -3 7 3 8M108 73l4 6 -3 7 3 9','none',ink,1.5)
        : path('M17 22v77M109 22v77','none','#e2d9f5',2)+path('M29 111h70','none','#f4e7cb',1.4);
    case 'cave-entrance':
      return dark ? path('M21 47l8 8 -5 10M88 23l-7 10 6 9M102 86l10 -4','none',ink,2)+path('M37 55l3 12 5 -18M84 49l5 14 3 -9','#555953',ink,1)
        : path('M18 63l7 -13m-6 19 8 -7M98 31l7 6','none','#b2d7b0',3)+path('M108 80l-5 -10 -4 12 6 9Z','#b4a3dd','#72799b',1.2);
    case 'sewer-entrance':
      return dark ? circle(64,62,43,'none','#857559',1)+path('M45 26l-5 5m51 50 -4 8M21 59l1 9','none','#826047',2)
        : circle(64,62,43,'none','#e4d3a0',1.4)+path('M46 25q18 -8 36 0','none','#edf3fc',2);
    case 'secret-entrance':
      return dark ? crack(47,31)+path('M88 68l12 -5','none','#b6afa0',1)
        : path('M46 29l51 -3 1 39 -32 14 -17 -7Z','none','#ded2ee',1.2)+circle(82,42,3,'none','#e9d199',1);
    case 'statue-complete':
      return dark ? crack(31,76)+path('M94 31l-3 8m-50 42 8 2','none','#9b9583',1)
        : path('M32 31h11m-11 0v11M95 89H84m11 0V78','none',metal,1.8)+path('M54 28q9 -5 18 1','none','#f7eff2',1.5);
    case 'statue-broken':
      return dark ? crack(33,36)+crack(74,78)
        : path('M32 29h15m-15 0v14','none','#e8d8b1',1.8)+path('M90 102l5 -3 5 4','none','#f0e8fa',1.4);
    case 'roof-house-poor':
      return dark ? path('M78 64l21 4 -3 16 -20 -4Z','#625a44',ink,1.2)+path('M80 68l15 3m-16 3 15 3','none','#9b8a63',1)
        : path('M21 32l9 -2m42 26 15 3m-66 28 12 -3M80 87l20 4','none','#ecd8a0',2);
    case 'roof-house-common':
      return dark ? path('M77 64l10 6 -4 7 7 5M21 91l12 -3','none',ink,2)+band(59,48,10,5)
        : path('M17 23l43 -7M69 16l44 8M68 102l42 -9','none','#f6d6ac',1.8)+path('M29 66l4 8','none','#c6eced',1.2);
    case 'roof-house-wealthy':
      return dark ? crack(75,54)+band(59,37,10,5)+path('M15 85h36','none','#8d7962',1.4)
        : path('M13 23l46 -8M69 15l44 9M15 86h37M83 95h29','none','#f4db9c',2)+circle(64,18,3,'#b9a0db',metal,1);
    case 'roof-tavern':
      return dark ? path('M75 55l12 8 -5 7 7 5M28 94l11 4 9 -3','none',ink,1.8)+band(84,90,4,21)
        : path('M17 94H78M15 87h37M69 15l43 8','none','#f3d796',2)+path('M90 98q3 -4 7 0','none','#fff1cb',1.5);
    case 'roof-temple':
      return dark ? crack(24,60)+crack(92,75)+path('M33 23q27 -15 57 -1','none','#9b8b73',1)
        : path('M18 39l42 -11M68 28l42 11M40 102h48','none','#eed69a',2)+circle(64,51,12,'none','#f5e5b5',1.2);
    case 'roof-ranch':
      return dark ? path('M77 53l17 4 -3 15 -16 -4Z','#66604a',ink,1)+path('M78 57l12 3m-13 3 12 3M35 94l8 8','none','#aa9a74',1.2)
        : path('M16 87h96M16 32l22 -3M77 59l29 5','none','#e3d5a0',2)+path('M30 94l18 12','none','#f0d6a3',1);
    case 'market-structure':
      return dark ? path('M58 38l15 3 -2 22 -15 -3Z','#766958',ink,1)+path('M58 43l14 2m-15 10 14 2M30 24l4 15 -3 13','none','#b1a182',1.3)
        : path('M18 84q7 8 14 0m14 0q7 8 14 0m14 0q7 8 14 0m14 0q7 8 14 0','none','#f8dfb7',1.6)+path('M34 35l4 5 -4 5 -4 -5ZM64 35l4 5 -4 5 -4 -5ZM94 35l4 5 -4 5 -4 -5Z','#eed4c6','none');
    case 'corral': case 'corral-gate':
      return dark ? band(20,43,5,9)+band(102,77,5,9)+path('M43 46l13 2m-13 33 13 -1','none',ink,1.3)
        : path('M11 46h106M11 80h106','none','#f0d5a1',1.3)+[21,106].map(x=>circle(x,47,1.7,metal)).join('');
    case 'city-wall':
      return dark ? crack(45,59)+path('M103 79l11 3','none','#969586',1)
        : path('M4 48h120M6 33h14m17 0h14m18 0h14m18 0h14','none','#e3ddef',1.6)+path('M9 82h17m75 0h17','none','#c0b3d2',1.2);
    case 'city-wall-corner':
      return dark ? crack(60,60)+path('M95 62l14 3 -4 7','none',ink,1.7)
        : path('M51 120V51H120','none','#e6dff3',1.6)+path('M39 39h13m20 0h13m20 0h13M39 72h13m-13 33h13','none','#ddd0b0',1.2);
    case 'city-gate':
      return dark ? crack(14,66)+crack(100,66)+band(49,28,30,5)
        : path('M13 32h15M96 32h19M14 94h16m68 0h16','none','#e8d4a0',1.7)+path('M49 30h30','none','#e2e2f5',2);
    case 'window':
      return dark ? path('M21 54l7 6 -4 7m48 -10 6 7 -4 8','none','#38434b',1.3)+band(9,49,5,27)
        : path('M21 55l11 15M72 55l10 15M98 55l9 13','none','#d5f2f5',2)+path('M8 79h112','none','#f1d9a6',1.4);
    case 'drinks':
      return dark ? path('M23 72l4 5 -3 7M74 33l5 -1','none','#a59678',1.3)+path('M81 59l5 3','none',ink,1.3)
        : path('M36 69q6 -5 12 0M84 82q4 -4 8 0','none','#ffedcc',1.7)+path('M77 34l2 7','none','#c9e8f3',2);
    case 'bar-counter':
      return dark ? path('M39 71l13 3 -4 4M105 49l10 4','none',ink,1.5)+band(7,39,5,38)
        : path('M2 75h124','none','#ecd59b',1.6)+path('M56 47h15m-15 2v10','none','#c5d9ef',1.1);
    case 'inn-reception':
      return dark ? path('M11 37l10 -2m82 1 8 4 -3 3','none',ink,1.5)+band(100,62,15,4)
        : path('M11 34h102v39','none','#efdaa1',1.5)+path('M72 39q4 -3 8 1','none','#fff0ce',1.5)+circle(29,78,1,'#dfc3ee');
    case 'wood-stove':
      return dark ? crack(23,52)+path('M34 38l9 -3m35 53 7 -2','none','#a18d73',1.2)
        : path('M58 14v15M33 34v29M94 35v27','none','#dbe2f5',1.7)+circle(49,52,11,'none','#a6bfdf',1.1);
    case 'fireplace':
      return dark ? path('M19 43l7 7 -3 6 5 9M104 75l5 7 -4 6 4 11','none',ink,1.7)
        : path('M36 37q27 -18 55 0M18 111h92','none','#f1dfbf',1.7)+path('M20 45v12m88 -12v12','none','#e3d7ed',1.2);
    case 'equipment-pack':
      return dark ? path('M53 83l9 6 9 -5m-14 -3 -3 7m13 -5 1 7','none','#b5a37d',1.5)
        : path('M35 42q28 -14 57 0M49 95h25','none','#dce1b6',1.6)+path('M62 47l4 4 -4 4 -4 -4Z','#d6bbe4','#8282a2',1);
    case 'spears':
      return dark ? group(path('M35 27l7 4m-5 19h5m-6 4h5','none','#a68b68',1.4),'rotate(-14 39 64)')+group(path('M75 27l6 3','none',ink,1),'translate(0 5) rotate(12 79 64)')
        : group(path('M39 14l-3 12m1 19h5','none','#ecf0ff',1.6),'rotate(-14 39 64)')+group(path('M79 14l-3 12m1 19h5','none','#ecf0ff',1.6),'translate(0 5) rotate(12 79 64)');
    case 'swords':
      return [[46,62,-20,1],[84,64,24,.85]].map(([x,y,a,s])=>groupSwordDetail(x,y,a,s,dark)).join('');
    case 'shelf-empty': case 'shelf-full': case 'order-shelf':
      return dark ? band(15,60,6,6)+band(108,92,6,6)+path('M42 32l15 2','none',ink,1.2)
        : path('M7 33h114M7 63h114M7 95h114','none','#efdab0',1.1)+[10,117].map(x=>circle(x,63,1.4,'#dfc7ef')).join('');
    case 'barracks-bed':
      return dark ? path('M51 78l9 4 9 -5m-14 0 -3 6m12 -5 3 5','none','#b6a681',1.4)+path('M47 28l12 -1','none','#bab19c',1)
        : path('M43 55h42M43 100h42','none','#d9dec2',1.5)+path('M55 64l4 4 4 -4 4 4 4 -4','none','#d8d0e7',1.2);
    case 'forge-furnace':
      return dark ? path('M18 65l6 7 -3 6 4 9M104 76l6 6 -4 7 4 9','none',ink,1.7)+path('M47 38q18 -7 35 3','none','#82755f',1.5)
        : path('M34 48q8 -14 22 -14m16 0q14 0 22 14M31 109h62','none','#ead8b1',1.6)+path('M55 15h17','none','#c4d0e9',1.3);
    case 'smith-tools':
      return dark ? path('M32 28l9 2 -2 5m-8 54 -2 7','none',ink,1.3)+path('M76 65l5 -3','none','#ab9b83',1)
        : path('M30 23l20 5M31 86l5 -17M70 40l5 12','none','#e5e9f8',1.5);
    case 'armor':
      return dark ? path('M51 50l6 7 -3 7M75 83l9 -2M29 49l6 4','none',ink,1.5)+path('M55 82h18','none','#9f8f77',1.1)
        : path('M48 45l-3 24m34 -24 3 24M44 87q20 7 40 0','none','#e9d79f',1.6)+path('M64 48l5 7 -5 7 -5 -7Z','#b4a0df','#707796',1.2)+path('M54 17q7 -7 15 -2','none','#f2edff',1.6);
    case 'cast-metal':
      return dark ? path('M60 20l8 4 -2 5M69 51l8 3M26 40l4 -2','none','#504c48',1.3)
        : path('M59 18h18M63 33h18M68 50h18M91 88h11','none','#e6edf9',1.5)+path('M20 41q1 -6 7 -7','none','#ead8ab',1.5);
    case 'altar-roman':
      return dark ? crack(18,65)+path('M30 91l16 2M92 48v13','none','#afa58d',1)
        : path('M26 32h75M27 94h74','none','#eee0b4',1.5)+path('M33 44v30m62 -30v30','none','#e0cda5',1.2);
    case 'mihrab':
      return dark ? path('M23 17l7 8 -3 6M99 76l6 8 -4 7','none',ink,1.4)
        : path('M35 101V58Q35 40 64 25Q93 40 93 58V101','none','#e7d69d',1.2)+path('M25 45l3 3 -3 3 -3 -3ZM103 45l3 3 -3 3 -3 -3Z','#e0d6f1','none');
    case 'minbar':
      return dark ? path('M44 29l9 3 -3 6M81 88l5 4','none',ink,1.4)+band(27,72,6,5)
        : path('M33 37v63M95 37v63M42 53h44M35 27l29 -15 29 15','none','#eddaa6',1.3)+path('M64 37l5 5 -5 5 -5 -5Z','none','#dbc8ed',1);
    case 'bimah':
      return dark ? path('M33 84l8 2 -2 4M92 39l5 3','none',ink,1.5)+band(20,73,7,5)
        : path('M29 27h70M30 94v8h11M98 94v8H87','none','#efdbab',1.5)+path('M48 55q7 -3 12 0m8 0q7 -3 12 0','none','#fff1d9',1);
    case 'mandir-shrine':
      return dark ? path('M19 63l6 7 -3 8M99 91l7 4 -2 7','none',ink,1.5)+path('M44 39h12m17 0h11','none','#b0a087',1.1)
        : path('M36 47h56M45 33h38M55 22h18','none','#f7dba1',1.7)+path('M39 63q6 -10 15 -13m20 0q9 3 15 13','none','#e6c4cc',1.4)+path('M51 82q12 7 26 0','none','#ffe9bc',1.4);
    case 'pagoda-shrine':
      return dark ? path('M37 24l8 2 -2 5M82 45l10 4M25 89l5 6','none',ink,1.4)
        : path('M20 51q44 -10 88 0M32 30q32 -10 64 0','none','#bdd9da',1.8)+path('M37 62v23m52 -23v23','none','#edbfaf',1.2)+path('M54 86q10 4 20 0','none','#f6d7a0',1.2);
    case 'ablution-fountain':
      return dark ? path('M52 14l4 4 -3 4M103 86l8 4 -5 6','none',ink,1.5)+path('M24 48l4 -7M96 85l-5 9','none','#75877e',1.4)
        : path('M43 18h42l24 25M18 44v39l25 26','none','#e7d9ad',1.6)+path('M43 49q20 -17 42 0M45 81q18 13 36 0','none','#c6edf1',1.3);
    case 'ritual-brazier':
      return dark ? path('M39 38l7 -4M84 77l7 -6','none','#ad916b',1.6)+path('M30 89l-2 9','none',ink,1.3)
        : path('M36 42q13 -16 35 -14','none','#f5deb0',1.6)+circle(64,58,36,'none','#e4c5a7',1)+path('M61 111h6','none','#ead6a1',1.4);
    case 'torah-ark':
      return dark ? path('M23 76l6 7 -2 8M83 20l12 5','none',ink,1.4)+path('M37 85l8 3 5 -4','none','#aa9682',1)
        : path('M25 25l39 -11 39 11M34 37v57m60 -57v57M22 108h84','none','#eed8a1',1.5)+path('M43 84q20 7 42 0','none','#d6bddc',1.3);
    case 'temple-bell':
      return dark ? path('M49 67l8 4 -3 7M100 39l2 7','none',ink,1.4)+path('M74 46l4 6','none','#baa27c',1)
        : path('M51 54q1 -10 8 -12M47 73h34M42 83q22 7 44 0','none','#f2dca7',1.8)+path('M28 27h72','none','#d9c8bb',1.2);
    case 'prayer-rug':
      return dark ? path('M32 79l6 3 -4 7m52 11 7 3','none','#b3a482',1.2)
        : path('M37 22v82M91 22v82M45 101V55Q45 39 64 28Q83 39 83 55V101','none','#e4d5aa',1.1);
    case 'temple-bench':
      return dark ? band(24,49,5,29)+path('M54 57l13 3 -4 4','none',ink,1.5)
        : path('M17 52h94M17 75h94','none','#efdaa6',1.4)+path('M50 61h28','none','#ddc5bd',1);
    case 'rubble': case 'broken-pillar': case 'archway': case 'statue': case 'cairn': return crack(46,38)+crack(74,75)+(dark?path('M29 84l7 -5 11 3','none','#768068',2):star(77,43,4,'#f6eddd'));
    case 'roof-house': case 'roof-shop': return dark?path('M24 49l13 4 -4 8 10 4M79 71l17 -6 -4 9','none','#302a2b',2)+band(56,38,15,5):crest(41,75,.55)+path('M19 17Q64 6 109 17','none','#f2d69d',2)+star(86,30,4,'#fff0c7');
    case 'well': return dark?crack(31,53)+band(27,23,74,5):path('M46 70q13 -9 29 0','none','#caf5f1',2)+star(62,54,4,'#fff1d8');
    case 'market-stall': return dark?path('M34 30l3 13 -3 7 8 9M81 25l7 7 -4 12','none','#483c39',2):crest(64,45,.65)+path('M23 75q8 12 16 0t16 0 16 0 16 0 16 0','none','#f2d496',2);
    case 'cart': case 'fence': case 'bookshelf': case 'counter': case 'bench': return dark?band(22,40,83,5)+path('M41 62l13 3 -5 8','none','#292b2b',2):path('M23 35h19m-19 0v12','none','#f2d397',2)+crest(91,76,.4);
    case 'bed': case 'tent': return dark?path('M44 57l14 8 11 -8m-18 1 -3 7m14 -5 2 6','none','#b6a681',2):crest(64,73,.7)+star(46,46,3,'#ffe5ca');
    case 'anvil': case 'forge': case 'weapon-rack': return dark?crack(47,39)+band(29,84,69,5):crest(65,87,.45)+star(85,45,4,'#ebf0ff');
    case 'sacks': return dark?path('M28 44l12 6 8 -5m-10 -3 -3 9','none','#786849',2):crest(82,71,.6);
    case 'tree-oak': case 'tree-pine': case 'tree-gold': return '';
    case 'bush': return dark?path('M20 73l16 -13 17 5 19 -19 21 9 12 -13M36 60l-5 -10m21 15 2 10m18 -29 -3 -12m24 21 6 11','none','#918a6c',2):[star(43,43,4,'#ffecd3'),star(85,57,3,'#f9e2ea'),star(69,82,4,'#ffecd3')].join('');
    case 'rock': case 'stalagmite': return crack(48,28)+crack(68,70)+(dark?path('M34 84l8 2 4 8M71 42l9 2','none','#93907a',1):path('M49 34l-6 8m11 -12 7 -1','none','#f4efff',2.4));
    case 'crystal': return dark?path('M59 45l9 10 -6 14 5 7M33 76l8 -4 6 6','none','#5f365e',2)+circle(62,52,2,'#eec5d4'):[star(56,26,7,'#fff4fb'),star(93,56,5,'#f8edff'),star(39,78,3,'#fff6ed')].join('');
    case 'flowers': return dark?path('M30 94l8 -31 9 4 3 -24m-12 33 -10 -7m21 -15 9 -4M80 103l-4 -30 9 -14','none','#9a9270',1.4):[star(22,42,4,'#fff1be'),star(104,73,4,'#fff1ec')].join('');
    case 'mushrooms': return dark?path('M32 44l8 -10 7 5M69 66l7 -7m-33 31 6 -5','none','#d0b995',1.5):circle(45,41,5,'#ffe5ed')+circle(78,63,4,'#ffe5ed')+star(99,45,5,'#fff5e8');
    case 'log': return dark?path('M47 48l9 6 -8 6 12 4 -4 11M89 51l-12 5 9 8','none','#242629',2.4):path('M49 46q7 -13 13 -5q-10 3 -13 5M77 48q-3 -13 7 -14q4 9 -7 14','#90c493','#4f7480',1.4);
    case 'lilies': return dark?path('M31 45l9 6 -5 8M73 71l10 9 -4 7','none','#293d3b',2):star(87,59,5,'#fff4fd')+path('M82 67l-3 -12 7 6 7 -4 -3 13Z','#fbd6e5','#ab88b7',1);
    case 'reeds': return dark?path('M34 100l5 -31 -13 -7M85 94l-2 -35 11 -13','none','#847d5c',2):path('M34 92Q24 52 40 41M86 94Q102 62 93 48','none','#d0dfa0',2);
    case 'chest': return band(25,39,75,5)+crest(64,67,.65)+(dark?band(23,77,79,7):star(91,39,5,'#ffedba'));
    case 'barrels': return dark?band(21,43,39,6)+band(69,82,25,5):crest(40,57,.7)+path('M77 25q7 -4 12 0','none','#fff0cc',2);
    case 'table': return dark?path('M75 37l8 26 -4 2 -8 -25Z','#b1adb0','#383641',1)+path('M74 63l13 -4m-8 3 3 12','none','#604431',3):`<ellipse cx="82" cy="68" rx="9" ry="12" fill="#9ccadf" stroke="#575e94" stroke-width="1.5"/><rect x="78" y="50" width="8" height="8" fill="#b29971"/>${star(81,67,4,'#f0ebff')}`;
    case 'books': return dark?band(28,62,70,6)+circle(65,66,4,'#7e373b'):crest(49,62,.7)+star(81,69,7,'#fae3c7');
    case 'bones': return dark?crack(61,25)+path('M53 78l14 -11 12 9 -15 10Z','#6e5750','#302c2c',1):path('M60 27q8 -5 13 1','none','#fff2e3',2)+circle(73,35,2,'#c5b9df');
    case 'pillar': return dark?crack(33,27)+crack(74,72):path('M29 26h14m-14 0v14M99 93H85m14 0V79','none','#f3d79b',2.4)+circle(64,60,15,'none','#dad9f4',1.7);
    case 'campfire': case 'torch': return dark?path('M56 38l-2 -10m19 0 4 -9m-14 -4 2 -7','none','#cd935f',1.8):star(43,30,4,'#ffe4a5')+star(83,36,5,'#fff4c4');
    case 'bedroll': return dark?path('M41 58l11 4 8 -7m-15 2 -3 7m10 -5 -2 6m7 -8 3 5M68 88l10 6','none','#c1b799',1.5):crest(61,69,.6)+path('M43 94h25','none','#f9dfcf',2);
    case 'stairs': return dark?crack(79,28)+crack(42,75):path('M26 26v76m76 -76v76','none','#e7d8f4',2)+star(28,37,4,'#eaf7ff');
    case 'rug': return dark?path('M20 51l13 4 -13 8m88 18 -13 4 13 9','#29252c','none')+crest(64,64,1.2):path('M64 33Q43 49 49 67L64 90 79 67Q85 49 64 33Z','none','#f2d596',2)+star(64,60,12,'#f3d49c');
    case 'door': return band(19,48,6,26)+band(79,48,6,26)+(dark?path('M29 69l8 -8 -2 -9','none','#282729',2):crest(58,62,.5));
    case 'bridge': return dark?path('M36 43l2 12 -2 9 3 14M77 45l4 7 -4 12m28 -14 -3 25','none','#30292a',2)+band(45,34,6,53):path('M10 30Q64 11 118 30M10 92Q64 113 118 92','none','#e7c589',3)+[12,40,86,115].map(x=>circle(x,33,3,'#f8e1ae','#967294')).join('');
    case 'crates': return dark?band(14,34,52,5)+path('M24 18l10 9 -4 15','none','#30292a',2):crest(40,42,.75)+crest(88,83,.55);
    case 'altar': return dark?crack(17,25)+path('M63 45v30m-13 -15h27','none','#ba8b8b',2)+circle(64,61,9,'none','#b98692',1):circle(64,61,31,'none','#dcc7fa',1.4)+star(64,61,12,'#f5d7ff')+star(31,38,5,'#fff4d6');
  }
  return '';
}
for(const file of files) {
  if (copyVanilla) await copyFile(new URL(file,root),new URL(`vanilla/${file}`,root));
  const original=await readFile(new URL(file,root),'utf8'), id=file.slice(0,-4);
  for(const theme of ['dark','anime']) {
    const rand=randomFor(`${theme}-${id}`);
    let content=recolor(original,theme);
    let defs=content.match(/<defs>([\s\S]*?)<\/defs>/)?.[1] ?? '';
    let body=content.replace(/^<svg[^>]*>/,'').replace(/<defs>[\s\S]*?<\/defs>/,'').replace(/<\/svg>\s*$/,'');
    // Flat bands, rather than a whole-image tint, give Anime materials cel shading.
    if(theme==='anime') defs=defs.replace(/(<(?:linear|radial)Gradient[^>]*>)([\s\S]*?)(<\/(?:linear|radial)Gradient>)/g,(_,open,stops,close)=>{
      const colors=[...stops.matchAll(/stop-color="([^"]+)"/g)].map(m=>m[1]);
      if(colors.length<3)return open+stops+close;
      return open+`<stop stop-color="${colors[0]}"/><stop offset=".42" stop-color="${colors[0]}"/><stop offset=".42" stop-color="${colors[1]}"/><stop offset=".78" stop-color="${colors[1]}"/><stop offset=".78" stop-color="${colors.at(-1)}"/><stop offset="1" stop-color="${colors.at(-1)}"/>`+close;
    });
    if(id.startsWith('tree-')) body=tree(id,theme,rand);
    body+=details(id,theme,rand);
    let finish='';
    if(id.startsWith('terrain-')) {
      for(let i=0;i<(theme==='dark'?32:10);i++) {
        const x=num(8+rand()*107),y=num(8+rand()*107);
        finish+=theme==='dark'?path(`M${x} ${y}l3 -1 2 3`,'none','#1d2228',.5):id==='terrain-water'?star(x,y,1.8,'#f2f8ff'):circle(x,y,1.2,id==='terrain-grass'?'#f8d3e0':'#f2e6dd');
      }
      finish=`<g opacity=".38">${finish}</g>`;
    } else if(theme==='dark') {
      // Wear follows the object's alpha silhouette; no opaque rectangular filter backgrounds.
      for(let i=0;i<95;i++) {const x=num(rand()*128),y=num(rand()*128);finish+=path(`M${x} ${y}l${num(1+rand()*4)} ${num(rand()*2-1)}`,'none',i%3?'#1e2026':'#b4aa92',.6);}
      finish=`<g mask="url(#wear)" opacity=".42">${finish}</g>`;
    }
    const mask=`<filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter><g id="art">${body}</g><mask id="wear" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128"><use href="#art" filter="url(#white)"/></mask>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><title>${theme} — ${id}</title><defs>${defs}${mask}</defs><use href="#art"/>${finish}</svg>`;
    await writeFile(new URL(`${theme}/${file}`,root),svg);
  }
}
console.log(`${copyVanilla ? `Copied ${files.length} Vanilla assets` : 'Left Vanilla untouched'}; created ${files.length} Dark and ${files.length} Anime variants.`);
