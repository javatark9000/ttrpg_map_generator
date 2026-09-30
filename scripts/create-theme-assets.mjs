import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const root = new URL('../public/assets/', import.meta.url);
const files = (await readdir(root)).filter(f => f.endsWith('.svg')).sort();
for (const theme of ['vanilla', 'dark', 'anime']) await mkdir(new URL(`${theme}/`, root), { recursive: true });
const num = n => Number(n.toFixed(2));
const path = (d, fill = 'none', stroke = '#303344', width = 1.6) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x,y,r,fill,stroke='none',width=1) => `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
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
function details(id,theme,rand) {
  const dark=theme==='dark', ink=dark?'#29252b':'#565a89', metal=dark?'#8a8376':'#f1d594';
  const rune=dark?'#b09c8c':'#e5d4ff';
  const crack=(x,y)=>path(`M${x} ${y}l6 7 -3 6 7 9m-4 -15 9 1`,'none',ink,dark?1.9:1.0);
  const crest=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M-10 -12L0 -9 10 -12 9 3Q8 11 0 15Q-8 11 -9 3Z',dark?'#5d3839':'#6d82bd',metal,1.6)}${path('M0 -7V8M-5 0H5','none',metal,1.4)}</g>`;
  const band=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${dark?'#444348':'#d2b275'}" stroke="${ink}" stroke-width="1.2"/>`;
  switch(id) {
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
  await copyFile(new URL(file,root),new URL(`vanilla/${file}`,root));
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
console.log(`Preserved ${files.length} Vanilla assets; created ${files.length} Dark and ${files.length} Anime variants.`);
