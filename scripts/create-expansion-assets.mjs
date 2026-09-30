import { mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../public/assets/', import.meta.url);
await mkdir(root, {recursive:true});
const path = (d, fill='none', stroke='#45493d', width=2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const rect = (x,y,w,h,fill,stroke='#45493d',r=2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const circle = (x,y,r,fill,stroke='#45493d',width=2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const defs = `<defs><linearGradient id="stone" x2=".7" y2="1"><stop stop-color="#b0b1a0"/><stop offset=".5" stop-color="#7f897f"/><stop offset="1" stop-color="#505e5b"/></linearGradient><linearGradient id="wood" x2="0" y2="1"><stop stop-color="#af8954"/><stop offset=".5" stop-color="#886640"/><stop offset="1" stop-color="#5a4430"/></linearGradient><linearGradient id="roof" x2="1" y2=".3"><stop stop-color="#ce9567"/><stop offset=".5" stop-color="#a85e43"/><stop offset="1" stop-color="#643e35"/></linearGradient><linearGradient id="cloth" x2=".5" y2="1"><stop stop-color="#c9be8c"/><stop offset=".5" stop-color="#92956e"/><stop offset="1" stop-color="#586a54"/></linearGradient></defs>`;
const save = async (id,body) => writeFile(new URL(`${id}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${defs}${body}</svg>`);
const stone = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})">${path('M-14 -9L-3 -16 15 -10 18 5 7 15 -13 9Z','url(#stone)')}${path('M-14 -9L1 -4 15 -10M1 -4L7 15','none','#c2c2aa',1)}</g>`;
await save('rubble',[[30,34,.8],[72,30,.7],[92,64,1],[36,82,1.2],[68,95,.7],[64,59,1],[104,96,.4]].map(p=>stone(...p)).join('')+path('M43 87l9 -7m17 -26 5 8M84 61l8 -9','none','#4f5348',2));
await save('broken-pillar',rect(25,24,68,78,'url(#stone)')+circle(59,58,29,'#65746a')+path('M35 46L43 31 68 29 81 42 70 49 75 65 63 70 42 64Z','url(#stone)')+path('M43 31L50 49 70 49M50 49L42 64','none','#ced0b6',2)+stone(95,86,.6)+stone(91,107,.35));
await save('archway',rect(10,30,27,71,'url(#stone)')+rect(91,30,27,71,'url(#stone)')+path('M24 36Q26 9 64 9Q100 10 105 36L87 39Q84 27 67 27L61 20 56 29Q40 28 39 40Z','url(#stone)')+path('M14 48H34M14 67H34M14 87H34M94 48H114M94 67H114M94 87H114M42 18l5 11M80 17l-4 11','none','#4e5a53',2)+stone(60,72,.45));
await save('statue',rect(25,27,78,77,'url(#stone)')+rect(33,33,62,62,'#879488')+path('M45 81L43 57 50 41 77 41 87 67 80 84 62 89Z','url(#stone)')+circle(63,40,13,'url(#stone)')+path('M51 58L34 66 31 77M78 57L91 59 99 38M52 78L60 57 69 80','none','#cad0b9',4)+path('M39 97l7 -6 7 2','none','#4b5c54',2));
for (const id of ['roof-house','roof-shop']) {
  const shop=id==='roof-shop';
  let body=rect(14,14,100,100,'#6b5a42','#3e3a32',3);
  body+=path('M14 18L64 30 64 99 14 112Z',shop?'#698a8c':'url(#roof)');
  body+=path('M114 18L64 30 64 99 114 112Z',shop?'#415f69':'#81523e');
  body+=path('M14 18L64 30 114 18Z',shop?'#a3b9ac':'#caa172')+path('M14 112L64 99 114 112Z',shop?'#42585b':'#674532');
  for(let y=34;y<100;y+=10) {
    body+=path(`M16 ${y}L62 ${y+3}M66 ${y+3}L112 ${y}`,'none',shop?'#b2c4b4':'#d7ac7b',1.3);
    for(let x=24;x<110;x+=15) body+=path(`M${x} ${y}v7`,'none',shop?'#344e57':'#75432f',1);
  }
  body+=path('M64 29V100','none',shop?'#c3c6aa':'#e0b77e',5);
  body+=rect(83,29,18,23,'url(#stone)')+rect(87,32,10,12,'#343c3b');
  body+=shop?rect(22,88,32,17,'url(#cloth)')+path('M29 89v14m9 -14v14m9 -14v14','none','#d2c493',3):path('M27 69L37 61 49 68 48 82 27 82Z','url(#wood)')+rect(32,70,12,9,'#374f50');
  await save(id,body);
}
await save('well',circle(64,67,39,'#56665c')+circle(64,63,37,'url(#stone)')+circle(64,63,25,'#3b6868','#424d43',3)+path('M46 65q9 -6 17 0t13 -2','none','#91b8a2',2)+[0,1,2,3,4,5,6,7].map(i=>path(`M${64+Math.cos(i*Math.PI/4)*26} ${63+Math.sin(i*Math.PI/4)*26}L${64+Math.cos(i*Math.PI/4)*37} ${63+Math.sin(i*Math.PI/4)*37}`)).join('')+rect(23,23,9,69,'url(#wood)')+rect(96,23,9,69,'url(#wood)')+rect(25,24,78,9,'url(#wood)')+path('M64 28V61','none','#cdbb89',2)+rect(56,54,16,15,'url(#wood)'));
await save('market-stall',rect(17,30,94,75,'url(#wood)')+rect(23,22,82,52,'url(#cloth)')+[28,48,68,88].map(x=>rect(x,22,10,52,'#9e5c46','none',0)).join('')+path('M20 23H109M20 75H109','none','#e0c391',3)+[32,52,73,94].map((x,i)=>circle(x,91,7,['#b7b267','#b48358','#668956','#cfb98a'][i])).join('')+rect(14,72,6,38,'url(#wood)')+rect(109,72,6,38,'url(#wood)'));
await save('cart',rect(24,30,78,70,'url(#wood)')+rect(17,41,8,47,'#393c34')+rect(103,41,8,47,'#393c34')+path('M33 31V97M48 31V97M63 31V97M78 31V97M94 31V97','none','#bf9a60',2)+path('M44 99v24m38 -24v24','none','#886640',5)+rect(21,30,84,7,'#6b5035')+rect(21,92,84,7,'#6b5035')+rect(34,42,24,26,'#a28f64')+circle(82,70,13,'#9eaa70'));
await save('fence',[13,62,111].map(x=>rect(x,27,8,73,'url(#wood)')).join('')+rect(10,40,111,8,'url(#wood)')+rect(10,78,111,8,'url(#wood)')+path('M16 38L65 84M64 40L113 85','none','#aa8854',4)+[17,66,115].map(x=>circle(x,44,1.6,'#d5be87')).join(''));
await save('bed',rect(30,13,68,103,'url(#wood)')+rect(35,19,58,91,'#b3ae8b')+rect(37,24,54,22,'#e2d5b4')+rect(35,50,58,57,'url(#cloth)')+path('M40 54H88M42 60v40m41 -40v40','none','#cad0a6',2)+rect(27,11,74,9,'url(#wood)')+rect(27,107,74,9,'url(#wood)'));
await save('bench',rect(17,41,94,44,'#493e2e')+rect(14,34,100,39,'url(#wood)')+path('M20 45H108M20 60H108','none','#c6a16a',2)+rect(22,29,7,61,'#6b5338')+rect(99,29,7,61,'#6b5338'));
let shelf=rect(12,27,104,76,'url(#wood)');
for(let row=0;row<2;row++){shelf+=rect(19,34+row*32,90,26,'#493d30');for(let i=0;i<11;i++)shelf+=rect(22+i*8,37+row*32,5,20-(i%3)*2,['#855b4c','#496d67','#aaa17a','#6a6481'][i%4],'none',0);shelf+=path(`M18 ${61+row*32}H110`,'none','#c6a16a',3);}
await save('bookshelf',shelf);
await save('counter',rect(12,38,104,61,'#443c2f')+rect(12,29,104,57,'url(#wood)')+path('M17 46H111M17 68H111','none','#634a31',2)+path('M17 34H111','none','#d1ad72',2)+[29,75,99].map(x=>circle(x,58,6,'#d1c0a0')+circle(x,58,3,'#65503b')).join('')+rect(43,37,16,22,'#7b927d'));
await save('anvil',path('M29 30L94 30 100 92 28 92Z','url(#wood)')+path('M40 36L71 36 107 52 74 59 73 77 91 84 89 94 35 94 34 84 51 78 48 59 24 57 20 47Z','#818e89','#363e3e',3)+path('M24 47L71 44 99 51 69 55 28 53Z','#c2c5ae')+path('M55 61v18m9 -20v20','none','#4e5c58',2));
await save('forge',rect(16,13,96,103,'url(#stone)')+rect(26,23,76,78,'#3a403a')+path('M31 94V50Q64 12 97 50V94Z','#282f2e','#acaf94',6)+[39,52,65,78,90].map((x,i)=>stone(x,78+(i%2)*9,.38)).join('')+path('M34 97H96M34 104H96M18 35H28M100 35H110M18 60H25M103 60H111','none','#444f46',3));
await save('weapon-rack',rect(17,32,94,73,'url(#wood)')+rect(20,40,88,8,'#b59c65')+rect(20,84,88,8,'#b59c65')+[32,54,77,97].map((x,i)=>path(`M${x} 94V31`,'none','#55442f',5)+path(`M${x} 64V${i%2?18:11}`,'none','#c3c7b5',4)+path(`M${x-7} 65H${x+7}`,'none','#c7ac73',3)).join(''));
await save('sacks',[[43,42,23],[83,70,25],[42,94,17]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.8}" fill="#b5a477" stroke="#625b40" stroke-width="2"/>`+path(`M${x-r*.6} ${y-2}q${r*.6} ${-r*.7} ${r*1.2} 0M${x} ${y-r*.8}l-4 -7 9 0 -3 7`,'none','#e0cea1',2)).join(''));
await save('cairn',stone(65,90,1.6)+stone(65,71,1.2)+stone(65,54,.9)+stone(64,38,.65)+stone(63,24,.45));
await save('tent',path('M13 102L35 31 93 31 117 102Z','url(#cloth)')+path('M35 31L64 13 93 31 64 43Z','#c9be8c')+path('M64 43L117 102 13 102Z','#9aa17a')+path('M64 43L87 102 42 102Z','#334b40')+path('M35 31L13 102M93 31L117 102M64 13V43','none','#ded4a4',2)+path('M13 102L6 112M117 102L124 112','none','#a89a70',2));
console.log('Created 20 original architecture, furniture and landscape assets.');
