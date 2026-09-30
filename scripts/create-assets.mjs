import { mkdir, writeFile } from 'node:fs/promises';
const dir = new URL('../public/assets/', import.meta.url);
await mkdir(dir, { recursive: true });
let state = 731;
const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
const range = (a, b) => a + random() * (b - a);
const f = n => n.toFixed(2);
const circle = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const path = (d, fill, stroke = '#233629', width = 1.4) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const defs = `<defs>
  <radialGradient id="leaf" cx="35%" cy="25%" r="78%"><stop stop-color="#77915b"/><stop offset=".48" stop-color="#4a7047"/><stop offset="1" stop-color="#2c503b"/></radialGradient>
  <radialGradient id="gold" cx="32%" cy="20%" r="80%"><stop stop-color="#c4bc72"/><stop offset=".5" stop-color="#909c57"/><stop offset="1" stop-color="#576941"/></radialGradient>
  <radialGradient id="pine" cx="30%" cy="24%" r="80%"><stop stop-color="#72947a"/><stop offset=".5" stop-color="#437763"/><stop offset="1" stop-color="#244e45"/></radialGradient>
  <linearGradient id="stone" x2=".7" y2="1"><stop stop-color="#b0b1a0"/><stop offset=".5" stop-color="#7f897f"/><stop offset="1" stop-color="#505e5b"/></linearGradient>
  <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#af8954"/><stop offset=".45" stop-color="#886640"/><stop offset="1" stop-color="#5a4430"/></linearGradient>
  <linearGradient id="crystal" x2=".8" y2="1"><stop stop-color="#d4f8e1"/><stop offset=".4" stop-color="#75d1c6"/><stop offset="1" stop-color="#3b737e"/></linearGradient>
  <radialGradient id="flame"><stop stop-color="#fff5bf"/><stop offset=".35" stop-color="#efc575"/><stop offset=".7" stop-color="#dc8548"/><stop offset="1" stop-color="#b04e29"/></radialGradient>
</defs>`;
const save = async (name, body) => writeFile(new URL(`${name}.svg`, dir), `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${defs}${body}</svg>`);
function blob(cx, cy, r, points = 16, fill = 'url(#leaf)', stroke = '#294633') {
  const coords = Array.from({ length: points }, (_, i) => { const a = i * Math.PI * 2 / points, rr = r * range(.85, 1.13); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  let d = `M${f((coords[0][0] + coords.at(-1)[0]) / 2)} ${f((coords[0][1] + coords.at(-1)[1]) / 2)}`;
  for (let i = 0; i < points; i++) { const p = coords[i], q = coords[(i + 1) % points]; d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`; }
  return path(d + 'Z', fill, stroke, 1.2);
}
for (const [id, fill, light] of [['tree-oak', 'leaf', '#a7b979'], ['tree-gold', 'gold', '#e0d393'], ['tree-pine', 'pine', '#9ab89a']]) {
  let art = path('M53 65L38 95 53 85 62 109 70 86 94 94 79 71Z', '#665638', '#3b422b', 2);
  art += blob(65, 67, 51, 26, '#274735', '#1f382b');
  for (let ring = 0; ring < 2; ring++) {
    const count = ring ? 6 : 10;
    for (let j = 0; j < count; j++) {
      const a = j / count * Math.PI * 2 + ring * .4;
      const x = 63 + Math.cos(a) * (ring ? 17 : 33), y = 59 + Math.sin(a) * (ring ? 17 : 33);
      art += blob(x, y, ring ? 24 : 20, id === 'tree-pine' ? 10 : 16, `url(#${fill})`);
      art += `<path d="M${f(x - 11)} ${f(y - 3)}q-1 -10 10 -12m-5 2q8 -5 14 2" fill="none" stroke="${light}" opacity=".45" stroke-width="1.4" stroke-linecap="round"/>`;
    }
  }
  art += blob(59, 51, 20, 18, `url(#${fill})`);
  for (let i = 0; i < 85; i++) { const a = random() * 6.28, r = Math.sqrt(random()) * 45, x = 61 + Math.cos(a) * r, y = 57 + Math.sin(a) * r; art += `<path d="M${f(x)} ${f(y)}l3 -2" stroke="${light}" opacity="${f(range(.15, .48))}" stroke-width="${f(range(.7, 1.7))}" stroke-linecap="round"/>`; }
  await save(id, art);
}
let bush = '';
for (let i = 0; i < 9; i++) bush += blob(range(33, 92), range(35, 86), range(15, 24));
for (let i = 0; i < 18; i++) bush += circle(range(35, 92), range(35, 86), range(1, 2.6), '#b4a66b');
await save('bush', bush);
let rocks = '';
for (const [x, y, s] of [[75, 79, .75], [38, 78, .57], [58, 49, 1]]) {
  rocks += `<g transform="translate(${x} ${y}) scale(${s})">${path('M-31 -16L-10 -33 17 -28 33 -7 26 21 0 31 -27 14Z', 'url(#stone)', '#3c4a43', 2)}${path('M-31 -16L-7 -18 10 -9 17 -28M-7 -18L-14 10 0 31M-14 10L13 13 33 -7', 'none', '#c3c4ac', 1.3)}${path('M13 13L26 21 0 31 -14 10Z', '#59675e', 'none')}${path('M-10 -28L-23 -15M-26 2L-22 10', 'none', '#d3cdb4', 1.4)}</g>`;
}
await save('rock', rocks);
let flowers = '';
for (let i = 0; i < 15; i++) { const x = range(23, 105), y = range(25, 100); flowers += path(`M${f(x)} ${f(y)}q-10 10 -4 16m4 -11q8 -5 12 -1`, 'none', '#526b43', 2); for (let k = 0; k < 5; k++) flowers += circle(x + Math.cos(k * 6.28 / 5) * 3.7, y + Math.sin(k * 6.28 / 5) * 3.7, 3, i % 3 ? '#d6c99e' : '#b2a6c4'); flowers += circle(x, y, 2.2, '#d5a958'); }
await save('flowers', flowers);
let shrooms = '';
for (const [x, y, r] of [[48, 45, 21], [82, 65, 16], [47, 88, 13], [89, 34, 9]]) {
  shrooms += circle(x + 1, y + 4, r, '#354238');
  shrooms += circle(x, y, r, '#a55740', 'stroke="#543e2d" stroke-width="1.5"');
  shrooms += `<path d="M${x - r * .7} ${y}Q${x - r * .5} ${y - r * .8} ${x + r * .3} ${y - r * .6}" fill="none" stroke="#d69a70" stroke-width="2"/>`;
  for (let i = 0; i < 6; i++) shrooms += circle(x + range(-r * .65, r * .65), y + range(-r * .5, r * .5), range(1, 2.6), '#e5d6b5');
}
await save('mushrooms', shrooms);
await save('log', `${path('M19 48L105 45 111 74 23 82Z', 'url(#wood)', '#3e3b29', 2)}${path('M29 54L99 51M31 64L91 58 104 61M32 72L106 67M71 47L76 34 83 37 79 48', 'none', '#493e2d', 2)}<ellipse cx="25" cy="65" rx="10" ry="17" fill="#c0a375" stroke="#524630" stroke-width="2"/><ellipse cx="25" cy="65" rx="5" ry="11" fill="none" stroke="#897147"/><ellipse cx="25" cy="65" rx="2" ry="5" fill="none" stroke="#897147"/>${blob(91, 69, 11, 9, '#617449')}`);
let lilies = '';
for (const [x, y, r] of [[44, 43, 20], [81, 73, 24], [37, 88, 13]]) {
  lilies += path(`M${x} ${y}l${r} -2a${r} ${r} 0 1 1 -5 -12Z`, '#70945d', '#355f4d', 1.4);
  lilies += path(`M${x - r * .6} ${y - 2}q1 -9 9 -11`, 'none', '#adbc7e', 1.4);
}
for (let i = 0; i < 7; i++) lilies += `<ellipse cx="83" cy="65" rx="4" ry="10" fill="#e1c7bb" transform="rotate(${i * 51} 83 74)"/>`;
lilies += circle(83, 74, 5, '#e3b960');
await save('lilies', lilies);
let reeds = '';
for (let i = 0; i < 24; i++) { const x = range(35, 92), y = range(55, 93), dx = range(-20, 20), dy = range(-42, -15); reeds += path(`M${f(x)} ${f(y)}q${f(dx / 2)} ${f(dy)} ${f(dx)} ${f(dy)}`, 'none', i % 3 ? '#6f8450' : '#afa05f', range(1, 2.7)); if (i % 4 === 0) reeds += `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="2.5" ry="6" fill="#715b36"/>`; }
await save('reeds', reeds);
await save('chest', `${path('M24 38L99 38 104 87 22 87Z', 'url(#wood)', '#302e25', 3)}${path('M24 56H101M26 65H102M29 78H99', 'none', '#4b3a2a', 2)}<path d="M34 39v46m53 -46v46" stroke="#b8a773" stroke-width="7"/><path d="M34 39v46m53 -46v46" stroke="#665c42" stroke-width="1"/><rect x="57" y="55" width="12" height="19" rx="2" fill="#bdaa6a" stroke="#554932" stroke-width="2"/>${circle(63, 63, 2, '#343831')}${path('M26 43H96', 'none', '#d0ad6f', 2)}`);
let barrels = '';
for (const [x, y, r] of [[82, 77, 24], [40, 56, 28], [84, 34, 19]]) {
  barrels += circle(x, y, r, 'url(#wood)', 'stroke="#38362a" stroke-width="3"');
  for (let xx = -r + 8; xx < r - 4; xx += 8) { const yy = Math.sqrt((r - 3) ** 2 - xx ** 2); if (yy) barrels += path(`M${x + xx} ${y - yy}v${yy * 2}`, 'none', '#59432d', 1); }
  barrels += circle(x, y, r - 5, 'none', 'stroke="#b1a17b" stroke-width="3"'); barrels += circle(x - 5, y + 3, 3, '#4f402b');
}
await save('barrels', barrels);
await save('table', `<rect x="12" y="30" width="103" height="72" rx="5" fill="#34352b"/><rect x="17" y="24" width="94" height="72" rx="3" fill="url(#wood)" stroke="#42382a" stroke-width="3"/>${[39, 53, 67, 81].map(y => path(`M20 ${y}H109`, 'none', '#4f402c', 1.4)).join('')}${path('M22 28H106M29 33H51M69 47H98M26 75H58M77 87H102', 'none', '#c3a06c', 1)}${circle(96, 40, 8, '#c3bba1', 'stroke="#514d3c" stroke-width="2"')}${circle(96, 40, 4, '#665b45')}<path d="M34 52l23 -4 7 31 -26 3Z" fill="#ded0a4" stroke="#897958"/>${path('M40 58L54 55M42 63L56 60M43 68L54 66', 'none', '#9d8c64', 1)}`);
await save('books', `<g transform="rotate(-18 64 64)"><rect x="29" y="35" width="39" height="54" rx="3" fill="#496d67" stroke="#2c403c" stroke-width="3"/><path d="M37 36v51" stroke="#aab39a" stroke-width="2"/><rect x="62" y="44" width="38" height="52" rx="3" fill="#855b4c" stroke="#443c31" stroke-width="3"/><path d="M69 45v49m4 -40h18v30H74Z" fill="none" stroke="#c4a777" stroke-width="1.5"/></g>`);
await save('bones', `${path('M30 35L95 92M30 92L91 32', 'none', '#4d5145', 8)}${path('M30 35L95 92M30 92L91 32', 'none', '#c4bd9f', 5)}${[[28, 33], [31, 37], [94, 89], [96, 94], [28, 90], [32, 94], [89, 31], [94, 34]].map(([x,y]) => circle(x,y,4,'#d3c9ac')).join('')}${path('M46 39Q44 21 61 21 81 22 80 42L73 54 52 54Z', '#d5cdb0', '#6c6d5a', 2)}${circle(54, 38, 5, '#4b5046')}${circle(71, 38, 5, '#4b5046')}${path('M59 47L64 42 67 48M56 51v6m6 -6v7m6 -7v6', 'none', '#6b6b55', 2)}`);
let crystals = '';
for (const [x, y, angle, scale] of [[37, 73, -38, .75], [91, 76, 35, .8], [64, 63, 5, 1.2], [67, 101, 75, .55]]) {
  crystals += `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${path('M-12 11L-15 -21 0 -48 14 -22 11 11 0 20Z', 'url(#crystal)', '#365b63', 1.5)}${path('M0 -48L-2 -19 0 20M-15 -21L-2 -19 14 -22M-2 -19L11 11', 'none', '#c8f2df', 1.5)}${path('M-15 -21L0 -48 -2 -19 0 20 -12 11Z', '#bef2d5', 'none')}</g>`;
}
await save('crystal', crystals);
await save('stalagmite', `${blob(65, 68, 43, 11, '#566463', '#303e40')}${path('M26 82L53 31 76 20 101 78 76 107Z', 'url(#stone)', '#3b4948', 2)}${path('M53 31L60 70 26 82M76 20L60 70 76 107M60 70L101 78', 'none', '#a4b0a2', 2)}${path('M76 20L83 71 76 107 101 78Z', '#586766', 'none')}`);
await save('pillar', `<rect x="24" y="28" width="80" height="80" rx="4" fill="#3a4742"/><rect x="24" y="20" width="80" height="80" rx="4" fill="url(#stone)" stroke="#444e42" stroke-width="3"/>${circle(64, 60, 34, '#737e70', 'stroke="#c3c5ae" stroke-width="2"')}${circle(64, 60, 27, 'url(#stone)', 'stroke="#4a584d" stroke-width="2"')}${circle(64, 60, 21, 'none', 'stroke="#b5bba5" stroke-width="1.5"')}${path('M31 29L43 37M88 85L94 92', 'none', '#485548', 2)}`);
let fire = '';
for (let i = 0; i < 11; i++) fire += blob(64 + Math.cos(i * 6.28 / 11) * 37, 64 + Math.sin(i * 6.28 / 11) * 33, 9, 7, 'url(#stone)', '#3d4438');
fire += circle(64, 64, 28, '#444033');
fire += path('M40 47L88 81M39 82L89 46', 'none', '#382e23', 12) + path('M40 47L88 81M39 82L89 46', 'none', '#8b5a31', 7);
fire += path('M50 83Q31 66 51 40Q46 58 60 54Q72 43 68 28Q99 59 84 79Q68 100 50 83Z', 'url(#flame)', '#a56738', 1.2);
fire += path('M58 82Q46 72 60 58Q56 72 71 58Q84 85 66 88Z', '#ffdf91', 'none');
await save('campfire', fire);
await save('bedroll', `<g transform="rotate(8 64 64)"><rect x="37" y="19" width="56" height="93" rx="9" fill="#3e4437"/><rect x="31" y="14" width="56" height="93" rx="9" fill="#9c9971" stroke="#434936" stroke-width="2"/><rect x="35" y="36" width="48" height="67" rx="4" fill="#79846a" stroke="#abb18a"/><rect x="34" y="17" width="50" height="22" rx="9" fill="#c2baa0" stroke="#827f61" stroke-width="2"/>${path('M43 43v52M76 42v53M42 70q14 5 34 -1', 'none', '#596b55', 1.5)}</g>`);
let stairs = `<rect x="17" y="16" width="94" height="96" rx="2" fill="#2b3330" stroke="#6c7567" stroke-width="4"/>`;
for (let i = 0; i < 7; i++) stairs += `<rect x="22" y="${21 + i * 12}" width="84" height="10" fill="hsl(76 9% ${27 + i * 5}%)" stroke="#303c34"/><path d="M24 ${22 + i * 12}h80" stroke="#bcc0a1" opacity=".55"/>`;
await save('stairs', stairs);
await save('rug', `<path d="M20 16H108V112H20Z" fill="#744b42" stroke="#a98b5c" stroke-width="3"/><path d="M27 23H101V105H27Z" fill="none" stroke="#c0a170" stroke-width="2"/><path d="M34 30H94V98H34Z" fill="#84544a" stroke="#493f35" stroke-width="2"/>${path('M64 36L86 64 64 92 42 64Z', '#9f805b', '#c0a477', 1.5)}${path('M64 48L76 64 64 80 52 64Z', '#604c41', '#b69a69', 1)}${Array.from({length: 14}, (_,i) => path(`M${24 + i * 6} 12v5m0 95v5`, 'none', '#b6a27b', 2)).join('')}`);
await save('door', `<rect x="8" y="44" width="112" height="40" rx="2" fill="#3e3d30"/><rect x="16" y="47" width="96" height="29" fill="url(#wood)" stroke="#b29b69" stroke-width="2"/>${path('M39 49v25m24 -25v25m24 -25v25', 'none', '#59432c', 2)}${circle(98, 60, 4, '#ceb477')}`);
let bridge = `<path d="M7 45L121 45 121 85 7 85Z" fill="#364334"/>`;
for (let i = 0; i < 13; i++) bridge += `<rect x="${9 + i * 8.4}" y="${39 + Math.sin(i) * 1.2}" width="8" height="44" rx=".8" fill="${i % 3 ? '#a58b60' : '#b0996f'}" stroke="#514f36" stroke-width="1"/><path d="M${12 + i * 8.4} 44v31" stroke="#d4bf8c" opacity=".45"/>`;
bridge += path('M9 35H118M9 86H118', 'none', '#444b33', 4) + path('M9 34H118M9 85H118', 'none', '#bdab7f', 2);
for (const x of [12, 40, 86, 115]) for (const y of [33, 86]) bridge += circle(x,y,3.5,'#bba67b','stroke="#59593b" stroke-width="1.5"');
await save('bridge', bridge);
await save('torch', `${circle(64, 77, 17, '#41473d', 'stroke="#8e977b" stroke-width="3"')}${path('M64 95V48', 'none', '#352c23', 13)}${path('M64 92V45', 'none', '#9b7544', 8)}${path('M56 61H73M56 68H73', 'none', '#b9a779', 3)}${path('M51 61Q35 43 54 25L55 39Q72 29 69 12Q98 41 77 61Z', 'url(#flame)', '#985f31', 1.5)}${path('M57 57Q49 44 62 36Q59 48 72 35Q81 59 63 62Z', '#ffe1a0', 'none')}`);
let crates = '';
for (const [x,y,s,a] of [[39,43,.95,-8],[87,81,.75,10]]) crates += `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><rect x="-30" y="-30" width="60" height="60" rx="2" fill="url(#wood)" stroke="#3b3929" stroke-width="3"/>${path('M-18 -28v56M-6 -28v56M6 -28v56M18 -28v56', 'none', '#56472e', 1.5)}${path('M-25 -25L25 25M25 -25L-25 25', 'none', '#50412b', 8)}${path('M-25 -25L25 25M25 -25L-25 25', 'none', '#b89b68', 5)}${[[-24,-24],[24,-24],[-24,24],[24,24]].map(([px,py]) => circle(px,py,2,'#4f4931')).join('')}</g>`;
await save('crates', crates);
await save('altar', `<rect x="12" y="27" width="105" height="81" rx="4" fill="#303c36"/><rect x="12" y="21" width="105" height="81" rx="4" fill="url(#stone)" stroke="#353e32" stroke-width="3"/><rect x="19" y="28" width="91" height="67" rx="2" fill="#5f7369" stroke="#b7b79a" stroke-width="2"/>${circle(64,61,24,'#354f47','stroke="#a8c4a0" stroke-width="1.5"')}${path('M64 39L83 73 45 73ZM64 83L83 49 45 49Z','none','#acbf94',1.3)}${circle(64,61,6,'#b4d7b3','stroke="#e2e8bb"')}${[[29,39],[99,39],[29,83],[99,83]].map(([x,y]) => circle(x,y,6,'#c7b98a','stroke="#535744" stroke-width="1.5"') + circle(x,y,2.5,'#ffe4a0')).join('')}`);
// Seamless transparent terrain textures, also available as reusable SVG assets.
for (const kind of ['grass', 'soil', 'stone', 'water']) {
  let art = '';
  for (let i = 0; i < (kind === 'water' ? 12 : 95); i++) {
    const x = range(5, 120), y = range(5, 120);
    if (kind === 'grass') art += path(`M${f(x)} ${f(y)}l-2 -5m2 5l3 -3`, 'none', i % 3 ? '#263d29' : '#d0c698', .65);
    else if (kind === 'water') art += path(`M${f(x)} ${f(y)}q5 -2 12 0`, 'none', '#c0d8c2', .7);
    else art += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(range(.3, 1.7))}" ry="${f(range(.2, 1))}" fill="${i % 2 ? '#d5c6a3' : '#353f35'}"/>`;
  }
  await save(`terrain-${kind}`, `<g opacity=".45">${art}</g>`);
}
await writeFile(new URL('../public/favicon.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1b2624"/><path d="M32 7l7 18 18 7-18 7-7 18-7-18-18-7 18-7Z" fill="#ceac76"/><path d="M32 19l4 13-4 13-4-13Z" fill="#1b2624"/></svg>`);
console.log('Created 27 original props, 4 terrain textures and favicon.');
