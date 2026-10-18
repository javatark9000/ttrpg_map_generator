import { mkdir, writeFile } from 'node:fs/promises';

// Additive Vanilla originals. Never rewrite the 51 first-generation SVGs.
// Metadata and natural cell sizes: src/engine/new-assets.ts.
// All artwork is static. Openings face south; linear modules join along X.
const root = new URL('../public/assets/', import.meta.url);
const vanilla = new URL('vanilla/', root);
await mkdir(vanilla, { recursive: true });
const ink = '#45493d';
const n = value => Number(value.toFixed(2));
const path = (d, fill = 'none', stroke = ink, width = 1.8) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, fill, stroke = ink, radius = 2, width = 1.8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const circle = (x, y, r, fill, stroke = ink, width = 1.8) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const ellipse = (x, y, rx, ry, fill, stroke = ink, width = 1.8) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const group = (body, transform) => `<g transform="${transform}">${body}</g>`;
const defs = `<defs>
<linearGradient id="stone" x2=".7" y2="1"><stop stop-color="#b0b1a0"/><stop offset=".5" stop-color="#7f897f"/><stop offset="1" stop-color="#505e5b"/></linearGradient>
<linearGradient id="wood" x2="0" y2="1"><stop stop-color="#af8954"/><stop offset=".5" stop-color="#886640"/><stop offset="1" stop-color="#5a4430"/></linearGradient>
<linearGradient id="roof" x2="1" y2=".3"><stop stop-color="#ce9567"/><stop offset=".5" stop-color="#a85e43"/><stop offset="1" stop-color="#643e35"/></linearGradient>
<linearGradient id="cloth" x2=".5" y2="1"><stop stop-color="#c9be8c"/><stop offset=".5" stop-color="#92956e"/><stop offset="1" stop-color="#586a54"/></linearGradient>
<linearGradient id="metal" x2=".7" y2="1"><stop stop-color="#c3c7b5"/><stop offset=".45" stop-color="#818e89"/><stop offset="1" stop-color="#4e5c58"/></linearGradient>
<radialGradient id="water" cx="35%" cy="25%" r="80%"><stop stop-color="#91b8a2"/><stop offset=".55" stop-color="#568d85"/><stop offset="1" stop-color="#354f50"/></radialGradient>
<radialGradient id="coal"><stop stop-color="#efc575"/><stop offset=".45" stop-color="#dc8548"/><stop offset="1" stop-color="#723e2d"/></radialGradient>
</defs>`;
const made = [];
async function save(id, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${defs}${body}</svg>`;
  await Promise.all([writeFile(new URL(`${id}.svg`, root), svg), writeFile(new URL(`${id}.svg`, vanilla), svg)]);
  made.push(id);
}
const bolt = (x, y) => circle(x, y, 2, '#c7b98a', '#625b40', .8);
const stone = (x, y, s = 1) => group(path('M-14 -9L-3 -16 15 -10 18 5 7 15 -13 9Z', 'url(#stone)') + path('M-14 -9L1 -4 15 -10M1 -4L7 15', 'none', '#c2c2aa', 1), `translate(${x} ${y}) scale(${s})`);
const ingot = (x, y, s = 1) => group(path('M-15 -5L-9 -11 13 -11 19 -4 15 7 -14 7Z', 'url(#metal)') + path('M-15 -5H19M13 -11L10 -5 7 7', 'none', '#ced0b6', 1), `translate(${x} ${y}) scale(${s})`);
function coals(cx, cy, radius = 23) {
  let body = ellipse(cx, cy, radius, radius * .65, '#343831');
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = radius * (.2 + (i % 3) * .2);
    body += circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .65, 3 + i % 3, i % 3 ? 'url(#coal)' : '#5a4430', '#44372c', 1);
  }
  return body;
}
const mug = (x, y, s = 1) => group(ellipse(11, 0, 5, 6, 'none', '#9c9679', 3) + circle(0, 0, 10, 'url(#wood)', '#514d3c') + circle(0, 0, 7, '#8a6236', '#d3c9a6', 1.5) + path('M-5 -3Q-1 -7 5 -3', 'none', '#e5d6b5', 2), `translate(${x} ${y}) scale(${s})`);
const book = (x, y, color = '#855b4c', angle = 0) => group(rect(-10, -15, 20, 30, color, '#494536', 1) + path('M-6 -13v26M-3 -9H6M-3 9H6', 'none', '#c4a777', 1), `translate(${x} ${y}) rotate(${angle})`);

// Level transitions: the north end is the far landing. Descending stairs fade
// into a dark shaft, ascending stairs end at a raised pale landing.
for (const up of [true, false]) {
  let body = rect(16, 10, 96, 108, '#364139', '#45493d', 2, 2.4);
  body += rect(23, 14, 82, 100, '#25332e', 'none', 0);
  const shades = up ? ['#aeb29c', '#a2a891', '#959e88', '#89947f', '#7d8a77', '#74816f', '#6c7969'] : ['#35423b', '#435047', '#526052', '#657160', '#7d8671', '#969d84', '#b1b49a'];
  for (let i = 0; i < 7; i++) {
    const y = 22 + i * 12;
    body += rect(25, y, 78, 10, shades[i], '#3b4940', 0, 1);
    body += path(`M27 ${y + 1}H101`, 'none', up ? '#d1d0b0' : '#b9bea2', 1.2);
  }
  body += rect(13, 10, 10, 106, 'url(#stone)') + rect(105, 10, 10, 106, 'url(#stone)');
  body += path('M17 18v89M109 18v89', 'none', '#c2c2aa', 1.3);
  body += up ? rect(25, 13, 78, 14, '#c4c5aa') + path('M49 22L64 16 79 22', 'none', '#7a826c', 1) : path('M25 15H103V28H25Z', '#24312e', 'none');
  body += path('M26 111H102', 'none', '#d1c9a2', 2.5);
  await save(up ? 'stairs-up' : 'stairs-down', body);
}
let cave = path('M8 87L14 51 25 27 46 14 80 12 108 33 120 65 118 101 97 113 28 112Z', 'url(#stone)', '#3b4948', 2.5);
cave += path('M26 107L27 72Q30 44 59 39Q87 34 101 64L108 106Z', '#263632', '#4b5c54', 3);
cave += path('M36 107V77Q38 51 64 48Q86 48 95 77L99 107Z', '#192824', 'none');
cave += path('M14 64L28 70 39 51 27 30M44 17L49 40M79 16L76 39 94 51 108 36M102 66L118 62M15 89L28 84M99 87L116 95', 'none', '#c3c4ac', 1.6);
cave += path('M40 109L43 97 82 94 91 108Z', '#797b61', 'none') + stone(22, 105, .6) + stone(109, 105, .5);
cave += path('M17 71l8 -6m72 -33 8 7', 'none', '#617449', 3);
await save('cave-entrance', cave);
let sewer = circle(64, 66, 49, '#39473f') + circle(64, 62, 48, 'url(#stone)', '#45493d', 2.4);
sewer += circle(64, 62, 37, '#293a35', '#b0b1a0', 3) + circle(64, 62, 31, '#35423e', '#757e70', 2);
for (const x of [40, 52, 64, 76, 88]) {
  const half = Math.sqrt(29 ** 2 - (x - 64) ** 2);
  sewer += path(`M${x} ${n(62 - half)}V${n(62 + half)}`, 'none', '#838f80', 4);
  sewer += path(`M${x - 1} ${n(62 - half)}V${n(62 + half)}`, 'none', '#bdc1a8', 1);
}
sewer += path('M39 62H89', 'none', '#65746a', 3);
for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; sewer += bolt(n(64 + Math.cos(a) * 43), n(62 + Math.sin(a) * 43)); }
await save('sewer-entrance', sewer);
await save('secret-entrance', rect(12, 17, 104, 99, 'url(#stone)') + rect(24, 28, 78, 76, '#202f2b') + path('M24 102L51 87 93 87 102 104Z', '#65715f', 'none') + path('M26 96H99M39 91H96', 'none', '#adb298', 1) + path('M34 17L112 14 116 78 64 99 35 88Z', 'url(#stone)', '#424e43', 2.4) + path('M41 25L103 22 105 70 63 88 43 81Z', 'none', '#c4c5ac', 1.3) + path('M47 39l10 8 -4 9 8 14M83 58l11 -6', 'none', '#59675e', 1.5) + circle(82, 42, 5, 'none', '#59675e', 2));

// Distinct complete/broken monuments; the older statue asset remains intact.
const pedestal = rect(22, 24, 84, 86, '#3a4742') + rect(22, 17, 84, 86, 'url(#stone)', ink, 3, 2.5) + rect(29, 24, 70, 71, '#899486', '#c3c4ac', 1);
let statue = pedestal + path('M47 81L49 57 54 43 73 43 79 58 82 84 63 91Z', 'url(#stone)');
statue += path('M52 55L37 63 33 81M75 56L88 59 93 37', 'none', '#59675e', 7) + path('M52 53L37 61 33 79M75 54L88 57 93 35', 'none', '#bcc2ac', 4);
statue += circle(64, 38, 13, 'url(#stone)') + path('M55 35Q62 29 70 34M55 51L59 81M70 52L73 83M50 82L63 86 77 82', 'none', '#d0d0b6', 1.5);
statue += path('M92 29V80', 'none', '#939b87', 2) + circle(92, 28, 3, '#b9bea4');
await save('statue-complete', statue);
let broken = pedestal + path('M46 83L48 58 59 53 65 63 74 56 82 85 63 91Z', 'url(#stone)') + path('M48 58L59 66 65 63M60 67L57 84M71 68L76 85', 'none', '#c3c4ac', 1.5);
broken += circle(94, 108, 11, 'url(#stone)') + path('M88 101l6 4 -2 8', 'none', '#55645a', 1.5) + stone(17, 99, .55) + stone(109, 75, .45) + path('M31 35l11 8 -5 8M79 30l-7 9', 'none', '#59675e', 1.8);
await save('statue-broken', broken);

// Roofs retain a visible southern threshold. Families have differing geometry,
// material and physical size, rather than a CSS tint over one house silhouette.
function roofBase({ thatch = false, wealthy = false } = {}) {
  let body = rect(9, 14, 110, 101, 'url(#stone)', '#3e3a32', 2, 2.4);
  body += path('M10 20L64 11 118 20 118 102 64 114 10 102Z', thatch ? '#a99760' : 'url(#roof)', '#493e2e', 2.2);
  body += path('M64 11L118 20 118 102 64 114Z', thatch ? '#827849' : '#81523e', 'none');
  for (let y = 28; y < 102; y += thatch ? 7 : 11) {
    body += path(`M13 ${y}L61 ${y - 5}M67 ${y - 5}L115 ${y}`, 'none', thatch ? '#d1c18b' : '#d7ac7b', thatch ? 1.5 : 1.1);
    for (let x = 19; x < 114; x += thatch ? 9 : 17) body += path(`M${x} ${y}l${thatch ? 2 : 0} ${thatch ? 11 : 7}`, 'none', thatch ? '#70603c' : '#75432f', .8);
  }
  body += path('M64 13V111', 'none', '#4f4030', 6) + path('M64 13V111', 'none', thatch ? '#b9a16d' : '#d9ad78', 3.5);
  body += rect(48, 105, 32, 12, 'url(#wood)') + path('M51 109H77', 'none', '#d2b481', 1);
  if (!thatch) body += rect(88, 27, 17, 24, 'url(#stone)') + rect(91, 30, 11, 12, '#343c3b', '#b0b1a0', 0, 1);
  if (wealthy) {
    body += path('M12 63L34 48 55 64 55 88 12 88Z', 'url(#roof)', '#493e2e', 2);
    body += path('M14 66L34 54 52 66M34 54V88', 'none', '#d8ba88', 2) + rect(24, 70, 20, 13, '#496d67', '#d2b481', 2);
    body += path('M34 72V81', 'none', '#d2b481', 1.3);
    for (const x of [11, 117]) body += circle(x, 18, 3, '#c7b98a');
  }
  return body;
}
await save('roof-house-poor', roofBase({ thatch: true }) + path('M24 35l18 2 -3 20 -16 -3Z', '#9d8d58', '#635a3c', 1.3) + path('M26 40l13 2m-14 4 13 2m-13 4 12 2', 'none', '#c9b87f', 1));
await save('roof-house-common', roofBase() + path('M22 64L35 55 49 64 47 82H22Z', 'url(#wood)') + rect(28, 65, 13, 11, '#496d67', '#c3a06c', 1));
await save('roof-house-wealthy', roofBase({ wealthy: true }) + path('M80 81L99 68 115 81 115 97H80Z', 'url(#roof)') + path('M83 82L99 73 112 82M99 73V97', 'none', '#d8ba88', 1.8));
await save('roof-tavern', roofBase({ wealthy: true }) + rect(15, 91, 98, 14, 'url(#wood)') + path('M20 94H108', 'none', '#c8aa76', 1.5) + rect(82, 88, 25, 25, '#665438', '#ccb583', 2) + group(mug(0, 0, .7), 'translate(93 100)'));
let templeRoof = rect(19, 18, 90, 99, 'url(#stone)') + path('M29 30V21Q64 -2 99 21V30Z', 'url(#roof)', '#493e2e', 2);
templeRoof += path('M14 37L64 24 114 37 114 97 64 111 14 97Z', 'url(#roof)', '#493e2e', 2.5) + path('M64 24L114 37V97L64 111Z', '#81523e', 'none');
for (let y = 44; y < 98; y += 10) templeRoof += path(`M18 ${y}L61 ${y - 9}M67 ${y - 9}L110 ${y}`, 'none', '#d7ac7b', 1.2);
templeRoof += path('M64 26V110', 'none', '#d9bb88', 4) + rect(36, 98, 56, 21, 'url(#stone)') + path('M39 104H89M39 111H89', 'none', '#c3c4ac', 1.5);
templeRoof += circle(64, 51, 10, '#ac9360', '#4f5342', 1.5) + path('M64 44V58M57 51H71', 'none', '#e1d3a3', 1.8);
await save('roof-temple', templeRoof);
let ranch = roofBase({ thatch: true }) + rect(14, 86, 100, 25, 'url(#wood)') + rect(24, 90, 34, 21, '#35473c') + rect(70, 90, 34, 21, '#35473c');
ranch += path('M30 91L53 108M53 91L30 108M75 91L98 108M98 91L75 108', 'none', '#b49a64', 3) + ellipse(104, 109, 12, 7, '#b9ab72', '#70603c', 1.2);
await save('roof-ranch', ranch);
let market = rect(2, 18, 124, 63, 'url(#cloth)', '#534d38', 1, 2);
for (const x of [12, 42, 72, 102]) market += rect(x, 19, 14, 61, '#9e5c46', 'none', 0);
market += path('M1 18H127M1 80H127', 'none', '#dfc696', 3) + path('M2 80v9q7 8 14 0q7 8 14 0q7 8 14 0q7 8 14 0q7 8 14 0q7 8 14 0q7 8 14 0q7 8 14 0v-9Z', '#b2a479', '#736844', 1.2);
market += rect(0, 91, 128, 19, 'url(#wood)', '#493e2e', 0) + rect(2, 15, 6, 100, 'url(#wood)') + rect(120, 15, 6, 100, 'url(#wood)');
for (const [x, color] of [[24, '#a9ae68'], [48, '#b78956'], [80, '#668956'], [104, '#c5b581']]) market += ellipse(x, 99, 10, 7, color, '#625b40', 1.3);
await save('market-structure', market);
for (const gate of [false, true]) {
  let body = rect(0, 43, 128, 9, 'url(#wood)', '#534b33', 0) + rect(0, 77, 128, 9, 'url(#wood)', '#534b33', 0);
  body += path('M6 47L121 81', 'none', '#5a4430', 7) + path('M6 46L121 80', 'none', '#b29a65', 4);
  if (gate) body += path('M6 80L121 46', 'none', '#b29a65', 4) + rect(4, 37, 7, 55, '#6b5338') + rect(117, 37, 7, 55, '#6b5338') + rect(97, 57, 23, 7, 'url(#metal)', '#464e41', 1) + bolt(101, 60);
  else body += rect(0, 34, 9, 62, 'url(#wood)') + rect(119, 34, 9, 62, 'url(#wood)');
  for (const x of [5, 123]) for (const y of [47, 81]) body += bolt(x, y);
  await save(gate ? 'corral-gate' : 'corral', body);
}

// City modules end exactly on their cell edges, including the east/south corner.
let wall = rect(0, 40, 128, 52, 'url(#stone)', '#424e43', 0) + rect(0, 45, 128, 12, '#b5b7a0', '#59675e', 0, 1);
wall += path('M0 73H128M32 59V73M96 59V73M64 74V89', 'none', '#4e5c50', 1.6);
for (const x of [0, 32, 64, 96]) wall += rect(x + 2, 29, 23, 20, 'url(#stone)', '#454e40', 1) + path(`M${x + 5} 32h17`, 'none', '#c3c4ac', 1.2);
wall += path('M0 88H128', 'none', '#39473f', 3);
await save('city-wall', wall);
let corner = path('M42 42H128V88H88V128H42Z', 'url(#stone)', '#424e43', 2) + path('M48 128V48H128', 'none', '#c4c5ac', 5);
corner += path('M43 78H78V128M78 78H128M59 44v32M95 44v33M44 101H77', 'none', '#59675e', 1.6);
for (const [x, y] of [[35, 35], [68, 35], [101, 35], [35, 68], [35, 101]]) corner += rect(x, y, 21, 21, 'url(#stone)', '#454e40', 1);
await save('city-wall-corner', corner);
let gate = rect(7, 29, 30, 76, 'url(#stone)') + rect(91, 29, 30, 76, 'url(#stone)') + rect(9, 26, 110, 25, 'url(#stone)', ink, 1);
gate += rect(37, 38, 54, 14, '#343831', '#697565', 0);
for (const x of [43, 53, 64, 75, 85]) gate += path(`M${x} 37v31`, 'none', '#6f7b70', 3);
gate += path('M39 59H89M13 57H32M13 79H32M96 57H115M96 79H115', 'none', '#48584b', 2);
for (const x of [9, 29, 91, 111]) gate += rect(x, 21, 13, 18, 'url(#stone)', ink, 1);
gate += path('M40 101H88M43 107H85', 'none', '#9ca58b', 2) + bolt(21, 45) + bolt(105, 45);
await save('city-gate', gate);

// Domestic fittings. Windows are art only: no light, halo or solar caster.
let window = rect(6, 47, 116, 34, 'url(#wood)', '#493e2e', 1, 2) + rect(14, 51, 100, 25, '#3b6868', '#c3a06c', 0, 1.4);
for (const x of [16, 41, 66, 91]) window += path(`M${x} 53h19v20Z`, '#729889', 'none') + path(`M${x + 2} 54l10 17`, 'none', '#c1d4b8', 1.1);
window += path('M39 51V76M64 51V76M89 51V76M14 64H114', 'none', '#baa174', 3) + path('M6 82H122', 'none', '#cab786', 2);
await save('window', window);
let drinks = ellipse(64, 70, 48, 34, 'url(#wood)', '#534732', 2) + ellipse(64, 70, 43, 29, 'none', '#bca073', 1);
drinks += mug(42, 76, 1.2) + mug(88, 87, .85) + group(path('M-8 -12L-5 -18V-29H5V-18L9 -12 11 13Q0 20 -11 13Z', '#496d67', '#2e4a40', 2) + rect(-5, -32, 10, 8, '#b29b69', '#625b40', 1) + rect(-7, -4, 14, 13, '#d6c7a0', '#897958', 1) + path('M-6 -12v10', 'none', '#a7bba3', 2), 'translate(76 49) rotate(12)');
await save('drinks', drinks);
let bar = rect(0, 45, 128, 45, '#493e2e', '#3f3c2d', 0) + rect(0, 37, 128, 43, 'url(#wood)', '#493e2e', 0, 2);
bar += path('M0 41H128M0 67H128', 'none', '#d0ad72', 1.5) + path('M0 55H128', 'none', '#655034', 1);
bar += mug(29, 58, .63) + mug(91, 59, .63) + rect(55, 45, 18, 23, '#576e59', '#bca57b', 1) + path('M64 43v-9q0 -7 7 -7h5v6h-7v10', 'none', '#beaa70', 3);
await save('bar-counter', bar);
let reception = rect(8, 35, 112, 56, '#493e2e') + path('M8 27H120V79H92V47H8Z', 'url(#wood)', '#493e2e', 2.3);
reception += path('M12 31H115V75', 'none', '#d0ad72', 1.5) + rect(20, 38, 32, 26, '#d6c9a0', '#897958', 1);
reception += path('M36 39V62M24 44h8m-8 5h8m9 -5h8m-8 5h8m-8 5h8', 'none', '#9b8c68', 1.1);
reception += circle(77, 44, 9, '#b09d69', '#625b40', 1.4) + circle(75, 42, 4, '#ded0a4', '#988354', 1) + path('M62 62l14 9m-11 -7 -6 4', 'none', '#b9a779', 2);
reception += rect(23, 72, 47, 14, 'url(#wood)') + [31, 46, 61].map(x => circle(x, 78, 2, '#d2bb83', '#625b40', .7)).join('');
await save('inn-reception', reception);
let stove = rect(21, 21, 86, 92, 'url(#stone)', '#45493d', 3) + rect(29, 29, 70, 67, '#4e5c58', '#303d37', 4, 2.3);
stove += rect(53, 9, 22, 29, 'url(#metal)', '#3b4940', 1) + circle(49, 52, 13, '#303c35', '#9ba58f', 2) + circle(80, 50, 10, '#303c35', '#9ba58f', 2);
stove += circle(49, 52, 8, 'none', '#5b695b', 1) + circle(80, 50, 6, 'none', '#5b695b', 1) + rect(38, 74, 51, 21, '#25332d', '#9a9d82', 2);
stove += path('M43 79h40M43 88h40', 'none', '#8f7b54', 2) + coals(64, 88, 15) + path('M94 44v37M24 103H104', 'none', '#b9bda5', 2);
await save('wood-stove', stove);
let hearth = rect(15, 15, 98, 99, 'url(#stone)', '#45493d', 3) + path('M31 103V40Q64 17 97 40V103Z', '#293731', '#b0b1a0', 4);
hearth += path('M17 39H28M100 39H111M17 65H28M100 65H111M17 90H28M100 90H111M46 17V29M82 17V29', 'none', '#505e51', 2);
hearth += coals(64, 83, 25) + path('M42 77L84 94M44 95L84 76', 'none', '#3e3024', 8) + path('M42 77L84 94M44 95L84 76', 'none', '#8b5a31', 4);
hearth += rect(11, 107, 106, 10, 'url(#stone)', '#45493d', 1) + path('M15 109H113', 'none', '#c3c4ac', 1.4);
await save('fireplace', hearth);

// Military equipment remains separate from furniture for flexible placement.
let pack = path('M39 31Q35 12 49 14M89 31Q94 12 79 14', 'none', '#5f5038', 6);
pack += rect(29, 28, 70, 79, 'url(#cloth)', '#4e513c', 10, 2.3) + rect(21, 58, 14, 34, 'url(#wood)', '#554d36', 4) + rect(93, 58, 14, 34, 'url(#wood)', '#554d36', 4);
pack += path('M29 35Q64 16 99 35L91 61Q65 71 37 61Z', '#a9aa7e', '#4e513c', 2) + rect(38, 13, 52, 19, '#c2baa0', '#827f61', 8);
pack += path('M44 15v87M84 15v87', 'none', '#6b5338', 6) + rect(39, 55, 10, 12, '#baa771', '#615239', 1) + rect(79, 55, 10, 12, '#baa771', '#615239', 1);
pack += rect(47, 78, 31, 20, '#969a70', '#59654a', 3) + path('M52 82H72', 'none', '#c9c49a', 1.2);
await save('equipment-pack', pack);
let spears = '';
for (const [x, angle, y] of [[39, -14, 0], [79, 12, 5]]) {
  let body = path(`M${x} 39V117`, 'none', '#493e2e', 5) + path(`M${x - 1} 40V116`, 'none', '#b2935c', 2);
  body += path(`M${x} 6L${x - 8} 28 ${x - 3} 43 ${x + 3} 43 ${x + 8} 28Z`, 'url(#metal)', '#3f5047', 1.5) + path(`M${x} 8V39`, 'none', '#d3d5bd', 1.1) + path(`M${x - 3} 43h6m-6 4h6m-6 4h6`, 'none', '#c6b57c', 1.5);
  spears += group(body, `translate(0 ${y}) rotate(${angle} ${x} 64)`);
}
await save('spears', spears);
function sword(x, y, angle, scale = 1) {
  return group(path('M0 -49L-7 -37 -5 19 5 19 7 -37Z', 'url(#metal)', '#3f5047', 1.7) + path('M0 -46V18', 'none', '#d4d5bc', 1.2) + path('M-16 21Q0 15 16 21', 'none', '#8f8055', 6) + path('M-15 20Q0 14 15 20', 'none', '#c6b47c', 2) + rect(-4, 22, 8, 23, '#6f4d35', '#4a3c2c', 1) + path('M-3 28l6 -2m-6 8 6 -2m-6 8 6 -2', 'none', '#b09662', 1) + circle(0, 48, 5, '#c0aa74', '#615239', 1.5), `translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
}
await save('swords', sword(46, 62, -20) + sword(84, 64, 24, .85));
let bed = rect(34, 10, 60, 108, 'url(#wood)', '#493e2e', 2, 2.2) + rect(39, 16, 50, 96, '#b3ae8b', '#726d52', 2);
bed += rect(42, 20, 44, 21, '#d8cbaa', '#827f61', 6) + rect(39, 47, 50, 64, 'url(#cloth)', '#59654a', 2);
bed += path('M42 53H86M45 60v44M82 60v44', 'none', '#c3c69b', 1.3) + path('M40 96h48', 'none', '#596b55', 2);
bed += rect(30, 10, 68, 7, '#586257', '#343e32', 1) + rect(30, 111, 68, 7, '#586257', '#343e32', 1) + [34, 94].flatMap(x => [13, 114].map(y => bolt(x, y))).join('');
await save('barracks-bed', bed);

// One-cell shelving modules: no empty side margins. Rotation pi/2 makes rows
// vertical. Cargo is inside the footprint, leaving narrow aisles legible.
function shelfBase() {
  return rect(0, 30, 128, 70, 'url(#wood)', '#4d4430', 0) + rect(5, 37, 118, 23, '#504633', '#a98f5e', 0, 1) + rect(5, 67, 118, 24, '#504633', '#a98f5e', 0, 1) + path('M0 34H128M0 63H128M0 95H128', 'none', '#c6a16a', 3) + rect(0, 29, 6, 72, '#7e6340', '#4d4430', 0, 1) + rect(122, 29, 6, 72, '#7e6340', '#4d4430', 0, 1);
}
await save('shelf-empty', shelfBase() + path('M10 43H114M10 72H114', 'none', '#806c48', .8));
let loadedShelf = shelfBase();
for (const [x, y, w, color] of [[14, 40, 23, '#af8954'], [43, 40, 28, '#92956e'], [78, 39, 33, '#a18c61'], [15, 70, 34, '#9b8054'], [60, 70, 23, '#b1aa7b']]) {
  loadedShelf += rect(x, y, w, 17, color, '#3f432f', 1) + path(`M${x + 3} ${y + 2}l${w - 6} 13M${x + w - 3} ${y + 2}l${-w + 6} 13`, 'none', '#c4ad78', 1.2);
}
loadedShelf += ellipse(102, 79, 11, 10, '#b5a477', '#625b40', 1.2) + path('M99 70l3 -4 3 4', 'none', '#d6c69b', 1.5);
await save('shelf-full', loadedShelf);

// Complete smithy set; the furnace's loading mouth is on its southern side.
let furnace = rect(14, 15, 100, 101, 'url(#stone)', '#424d42', 3, 2.4) + rect(45, 8, 38, 26, 'url(#stone)', ink, 1);
furnace += rect(52, 13, 24, 11, '#293731', '#b0b1a0', 0) + path('M28 101V56Q29 29 64 29Q99 29 100 56V101Z', '#4b5748', '#b0b1a0', 5);
furnace += path('M38 102V60Q39 40 64 39Q89 40 90 60V102Z', '#29322b', '#6e7963', 2) + coals(64, 84, 27);
furnace += path('M39 94H90M43 73V99M55 68V99M67 68V99M79 73V99', 'none', '#777a5c', 3);
furnace += path('M16 39H29M99 39H112M16 65H26M102 65H112M16 91H26M102 91H112', 'none', '#535f50', 2) + rect(27, 105, 74, 12, 'url(#stone)', ink, 1);
await save('forge-furnace', furnace);
let tools = path('M27 99L46 32', 'none', '#443729', 9) + path('M27 99L46 32', 'none', '#a5824f', 5);
tools += group(rect(-20, -10, 40, 20, 'url(#metal)', '#3e4b41', 2, 2) + path('M-16 -6H14', 'none', '#d0d0b6', 1.5), 'translate(45 31) rotate(15)');
tools += path('M66 108L80 66 96 36M89 109L78 66 66 35', 'none', '#3b4940', 5) + path('M66 108L80 66 96 36M89 109L78 66 66 35', 'none', '#9aa691', 2);
tools += circle(79, 66, 4, '#c3c7b5', '#4e5c58', 1) + path('M96 36l-5 -10M66 35l6 -10', 'none', '#818e89', 4) + path('M22 69L105 84', 'none', '#3f4a3d', 5) + path('M22 68L105 83', 'none', '#b8bd9f', 2);
await save('smith-tools', tools);
let armor = rect(41, 90, 46, 19, 'url(#wood)', '#4d4430', 2) + path('M64 28V106M31 48H98', 'none', '#6e5539', 6);
armor += path('M46 41L54 34 74 34 84 43 82 71 91 90 65 99 37 90 46 71Z', 'url(#metal)', '#3f5047', 2.4);
armor += path('M46 41L30 39 22 55 39 62 46 55M83 41L98 39 107 55 90 62 82 55Z', 'url(#metal)', '#3f5047', 2);
armor += path('M64 38V92M47 71Q64 81 82 71M41 88Q64 96 86 88', 'none', '#c7ccb5', 1.5) + path('M52 49l7 11m17 -11 -7 11', 'none', '#56675b', 1.5);
armor += path('M49 31V22Q50 7 64 7Q79 7 80 22V31L72 38 56 38Z', 'url(#metal)', '#3f5047', 2) + path('M52 24H76M64 11V35', 'none', '#4e5c58', 2) + path('M52 27h9m6 0h9', 'none', '#273b32', 2);
await save('armor', armor);
let castings = rect(18, 76, 44, 30, '#695941', '#4d4430', 1) + rect(24, 81, 32, 18, '#3b4134', '#b09a68', 1);
castings += ingot(40, 83, .75) + ingot(78, 56, 1.15) + ingot(73, 39, 1.15) + ingot(69, 24, 1.15) + ingot(96, 93, .7);
castings += circle(28, 43, 13, 'url(#metal)', '#3f5047', 1.5) + circle(28, 43, 7, '#3b4134', '#aeb79f', 1) + path('M91 71l12 -5 8 6 -2 11 -13 2Z', '#ad8a56', '#5d563c', 1.5);
await save('cast-metal', castings);
let orders = shelfBase() + ingot(24, 50, .52) + ingot(52, 50, .5) + book(94, 48, '#496d67', 90) + rect(12, 73, 23, 16, '#9b8054', '#4d4430', 1);
orders += path('M17 75L31 86M31 75L17 86', 'none', '#c4ad78', 1) + group(path('M-8 -14H8L12 13H-12Z', 'url(#metal)') + path('M-6 -8H6', 'none', '#c3c7b5', 1), 'translate(54 78) scale(.65)');
orders += path('M77 69L112 73 109 96 74 92Z', '#d6c9a0', '#897958', 1) + path('M82 77l22 3m-23 3 16 2m-17 3 20 2', 'none', '#9b8c68', 1);
await save('order-shelf', orders);

// Five distinct temple traditions. Architectural forms and ceremonial objects
// are drawn directly, without generic fantasy emblems or shared altar recolors.
let roman = rect(17, 25, 94, 82, 'url(#stone)', ink, 2, 2.4) + rect(23, 29, 82, 69, '#b0b1a0', '#c3c4ac', 1);
roman += rect(29, 38, 70, 49, '#ded0a4', '#8b8f74', 1) + path('M42 39V87M86 39V87', 'none', '#aa9564', 2);
roman += book(63, 57, '#744b42', 90) + circle(37, 36, 5, '#c7b98a', '#625b40', 1.1) + circle(91, 36, 5, '#c7b98a', '#625b40', 1.1);
roman += circle(37, 36, 2, '#eee0b6', 'none') + circle(91, 36, 2, '#eee0b6', 'none') + path('M27 102H101M31 108H97', 'none', '#c3c4ac', 1.5);
await save('altar-roman', roman);
let mihrab = rect(19, 13, 90, 102, 'url(#stone)', ink, 2, 2.3) + path('M32 103V58Q32 38 64 21Q96 38 96 58V103Z', '#496d67', '#c7b98a', 3);
mihrab += path('M42 102V61Q42 46 64 33Q86 46 86 61V102Z', '#354f47', '#94aa89', 1.5) + path('M50 100V64Q50 52 64 43Q78 52 78 64V100', 'none', '#758d73', 1.2);
for (const x of [25, 103]) for (const y of [35, 55, 75, 95]) mihrab += path(`M${x} ${y - 4}l4 4 -4 4 -4 -4Z`, '#b9aa72', 'none');
mihrab += rect(27, 105, 74, 9, '#b0b1a0', '#5f6d58', 1) + path('M32 108H96', 'none', '#d3cdb4', 1);
await save('mihrab', mihrab);
// Minbar: elevated wooden pulpit with its own southern stair and side rails.
let minbar = rect(32, 21, 64, 96, '#493e2e', '#4d4430', 1) + rect(39, 24, 50, 31, 'url(#wood)', '#bda473', 1);
for (let i = 0; i < 6; i++) {
  const y = 57 + i * 9;
  minbar += rect(39, y, 50, 8, 'url(#wood)', '#4d4430', 0, 1) + path(`M41 ${y + 1}H87`, 'none', '#ceb17d', 1.3);
}
minbar += path('M30 111V31M98 111V31', 'none', '#493e2e', 7) + path('M30 110V30M98 110V30', 'none', '#b99c66', 4);
for (const x of [30, 98]) for (const y of [44, 65, 86, 108]) minbar += circle(x, y, 3, '#c7b98a', '#625b40', 1);
minbar += path('M24 32L36 20 52 15 64 7 76 15 92 20 104 32Z', 'url(#wood)', '#4d4430', 2) + path('M29 30H99', 'none', '#d2b783', 2);
minbar += rect(44, 33, 40, 18, '#79613e', '#ccb583', 1) + path('M64 35l8 7 -8 7 -8 -7Z', 'none', '#d2b783', 1.2) + path('M38 112H90', 'none', '#c3a06c', 2);
await save('minbar', minbar);
let bimah = path('M29 20H99L111 32V99L99 111H29L17 99V32Z', 'url(#wood)', '#4d4430', 2.4) + rect(29, 32, 70, 65, '#a78e60', '#ccb583', 1);
bimah += path('M36 40H92M36 53H92M36 66H92M36 79H92', 'none', '#796040', 1);
bimah += path('M24 94V29H104V94', 'none', '#4d4430', 6) + path('M24 92V28H104V92', 'none', '#c3a06c', 3);
bimah += rect(38, 49, 52, 36, 'url(#wood)', '#4d4430', 2) + path('M44 52Q54 47 64 52Q74 47 84 52V78Q74 73 64 78Q54 73 44 78Z', '#ded0a4', '#897958', 1.2);
bimah += path('M64 53V76M49 57h10m-10 5h10m-10 5h10m10 -10h10m-10 5h10m-10 5h10', 'none', '#a39269', 1);
for (const x of [41, 87]) bimah += path(`M${x} 47V82`, 'none', '#7e6240', 3) + circle(x, 46, 2, '#b69a69');
bimah += rect(45, 103, 38, 11, 'url(#wood)', '#4d4430', 1);
await save('bimah', bimah);
let mandir = rect(13, 21, 102, 94, 'url(#stone)', ink, 2, 2.4) + rect(22, 30, 84, 75, '#b39b75', '#d1c49b', 1);
mandir += path('M29 85V44L40 35V28L51 22V15L64 8 77 15V22L88 28V35L99 44V85Z', '#b78f58', '#635940', 2);
mandir += path('M33 45H95M42 35H86M53 24H75M64 10V84', 'none', '#e0ca91', 2) + path('M40 87V60Q64 36 88 60V87Z', '#594b37', '#d3b679', 2.5);
mandir += rect(31, 87, 66, 12, '#c5ad7b', '#756343', 1) + ellipse(64, 81, 22, 8, '#a9845c', '#d6ba85', 1.5);
for (let i = 0; i < 8; i++) mandir += group(ellipse(64, 73, 5, 10, '#d3b276', '#8d734b', 1), `rotate(${i * 45} 64 81)`);
mandir += circle(64, 79, 8, '#e3c992', '#8d734b', 1.2) + path('M34 107H94M39 113H89', 'none', '#d3cdb4', 1.5);
await save('mandir-shrine', mandir);
let pagoda = rect(21, 77, 86, 34, 'url(#stone)', ink, 1) + rect(33, 43, 62, 56, 'url(#wood)', '#4d4430', 1);
pagoda += rect(44, 49, 40, 42, '#504537', '#c7b98a', 1) + rect(35, 42, 7, 53, '#a55740', '#563f30', 1) + rect(86, 42, 7, 53, '#a55740', '#563f30', 1);
pagoda += path('M12 50Q28 47 34 37L64 28 94 37Q100 47 116 50L108 57 20 57Z', '#566e60', '#354b40', 2) + path('M25 29Q38 28 43 18L64 12 85 18Q90 28 103 29L97 35 31 35Z', '#647b68', '#354b40', 2);
pagoda += path('M16 49Q64 40 112 49M29 29Q64 22 99 29', 'none', '#b2b58d', 1.5) + path('M64 5V13', 'none', '#b9a779', 3) + circle(64, 5, 3, '#c7b98a');
pagoda += ellipse(64, 83, 14, 6, '#c4a475', '#796345', 1.5) + path('M55 79Q51 69 57 61Q64 51 71 61Q77 69 73 79Z', '#b89b69', '#796345', 1.5) + circle(64, 59, 6, '#d2bb83', '#796345', 1.2) + path('M29 103H99M34 110H94', 'none', '#c3c4ac', 1.5);
await save('pagoda-shrine', pagoda);
let fountain = path('M40 12H88L116 40V88L88 116H40L12 88V40Z', 'url(#stone)', ink, 2.5) + path('M44 23H84L105 44V84L84 105H44L23 84V44Z', '#3b6868', '#c3c4ac', 2);
fountain += circle(64, 64, 31, 'url(#water)', '#47695b', 1) + circle(64, 64, 21, 'none', '#b3ccb2', 1.3) + circle(64, 64, 12, 'url(#stone)', '#d1c9a2', 1.5) + circle(64, 64, 5, 'url(#water)', '#496d60', 1);
for (const [x, y, angle] of [[64, 20, 0], [108, 64, 90], [64, 108, 180], [20, 64, 270]]) fountain += group(rect(-3, -2, 6, 14, '#c7b98a', '#625b40', 1, 1) + path('M0 12v7', 'none', '#b4d7c1', 1.5), `translate(${x} ${y}) rotate(${angle})`);
await save('ablution-fountain', fountain);
let brazier = path('M39 41L26 103M89 41L102 103M64 43V114', 'none', '#514b35', 5) + circle(64, 58, 38, '#6b684b', '#424d3d', 2.5) + circle(64, 58, 31, '#998658', '#c7b98a', 2);
brazier += coals(64, 59, 27) + path('M33 56L95 65M36 74L92 47', 'none', '#52523c', 3) + circle(64, 58, 34, 'none', '#d1b782', 1.2);
await save('ritual-brazier', brazier);
let ark = rect(19, 17, 90, 96, 'url(#wood)', '#4d4430', 2, 2.4) + path('M19 25L64 9 109 25Z', 'url(#wood)', '#4d4430', 2);
ark += rect(31, 34, 66, 65, '#744b42', '#b9a779', 1, 2) + path('M64 36V97M38 37q4 28 0 59M89 37q-4 28 0 59', 'none', '#a48360', 1.5);
ark += path('M43 52Q52 44 60 51V71H43ZM68 51Q76 44 85 52V71H68Z', '#c7b98a', '#65573e', 1.2);
ark += path('M47 55h9m-9 5h9m-9 5h9m16 -10h9m-9 5h9m-9 5h9', 'none', '#89774f', 1);
ark += rect(17, 101, 94, 12, 'url(#wood)', '#4d4430', 1) + [25, 103].map(x => path(`M${x} 30V98`, 'none', '#ccb583', 3)).join('');
await save('torah-ark', ark);
let bell = path('M24 103V24H104V103', 'none', '#493e2e', 9) + path('M24 101V23H104V101', 'none', '#af8954', 5) + path('M64 25V38', 'none', '#a89567', 3);
bell += path('M42 74Q46 65 46 53Q46 36 64 36Q82 36 82 53Q82 65 86 74L91 82Q64 93 37 82Z', '#ab9463', '#625b40', 2.2) + path('M49 51Q52 41 62 41M48 70H80M41 80Q64 88 87 80', 'none', '#d4bd86', 1.8) + circle(64, 88, 5, '#6d6041', '#45493d', 1.5);
bell += path('M64 94V117', 'none', '#b8a477', 2) + bolt(25, 26) + bolt(103, 26);
await save('temple-bell', bell);
let prayerRug = rect(28, 11, 72, 105, '#496d67', '#b9a779', 1, 2.5) + rect(33, 17, 62, 92, '#5f7a67', '#c9bc88', 1, 1.2);
prayerRug += path('M42 101V54Q42 37 64 25Q86 37 86 54V101Z', '#354f47', '#b9aa72', 1.6) + path('M50 98V57Q50 45 64 36Q78 45 78 57V98', 'none', '#8d9e7b', 1.1);
for (let x = 31; x < 99; x += 6) prayerRug += path(`M${x} 7v4m0 105v5`, 'none', '#b6a27b', 1.5);
await save('prayer-rug', prayerRug);
let templeBench = rect(0, 48, 128, 32, 'url(#wood)', '#4d4430', 0, 2) + path('M0 53H128M0 69H128', 'none', '#c7a36c', 1.5);
templeBench += rect(5, 46, 8, 36, '#6b5338', '#4d4430', 1) + rect(115, 46, 8, 36, '#6b5338', '#4d4430', 1) + [9, 119].map(x => bolt(x, 51) + bolt(x, 77)).join('');
await save('temple-bench', templeBench);

console.log(`Created ${made.length} expanded-world Vanilla originals in public/assets/ and public/assets/vanilla/: ${made.join(', ')}`);
