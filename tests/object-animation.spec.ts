import { expect, test } from '@playwright/test';
import { GifReader } from 'omggif';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({page}) => {
  await page.goto('/'); await expect(page.locator('#loading')).toBeHidden();
});

test('all new animated assets move and loop in all themes, while roots stay fixed', async ({page}) => {
  const results = await page.evaluate(async () => {
    const a='/src/engine/animation.ts', r='/src/engine/render.ts', t='/src/engine/types.ts';
    const {createAnimatedScene}=await import(a),{loadAssets}=await import(r),{DEFAULT_CONFIG}=await import(t);
    await loadAssets();
    const results=[];
    for(const theme of ['vanilla','dark','anime'])for(const asset of ['crystal','altar','lilies','reeds','tree-oak','tree-pine','tree-gold','bush','flowers','mushrooms']) {
      const map={version:2,name:asset,config:{...DEFAULT_CONFIG,width:8,height:8,theme},terrain:Array(64).fill('grass'),spawn:{x:0,y:0},objects:[{id:asset,asset,x:4,y:4,scale:4,rotation:0}]};
      const scene=createAnimatedScene(map,32,{grid:false,gridOpacity:.22,atmosphere:false,bioluminescence:true});
      const pixels=(time:number)=>scene.frame(time).getContext('2d').getImageData(0,0,256,256).data.slice();
      const first=pixels(0),other=pixels(700),end=pixels(2400);
      let rootChanges=0;
      for(let y=164;y<180;y++)for(let x=108;x<148;x++){const i=(y*256+x)*4;for(let c=0;c<3;c++)if(first[i+c]!==other[i+c])rootChanges++;}
      results.push({theme,asset,changed:first.some((v:number,i:number)=>v!==other[i]),closed:first.every((v:number,i:number)=>v===end[i]),rootChanges});scene.dispose();
    }
    return results;
  });
  for(const result of results) {
    expect(result.changed,`${result.theme}/${result.asset}`).toBe(true);
    expect(result.closed,`${result.theme}/${result.asset}`).toBe(true);
    if(result.asset.startsWith('tree')||['reeds','bush','flowers'].includes(result.asset))expect(result.rootChanges,`${result.theme}/${result.asset} roots`).toBe(0);
  }
});

test('solid props stay static and mushroom bioluminescence is opt-in', async ({page}) => {
  const result=await page.evaluate(async()=>{
    const a='/src/engine/animation.ts',t='/src/engine/types.ts';const {createAnimatedScene,hasAnimation}=await import(a),{DEFAULT_CONFIG}=await import(t);
    const map={version:2,name:'Still objects',config:{...DEFAULT_CONFIG,width:8,height:8},terrain:Array(64).fill('grass'),spawn:{x:0,y:0},objects:[{id:'mushrooms',asset:'mushrooms',x:4,y:4,scale:3,rotation:0}]};
    const results=[];
    for(const asset of ['mushrooms','rock','chest','door','bridge','table','pillar','bones','crates','stalagmite','log','barrels','books','stairs','bedroll','rug']) {
      map.objects[0].asset=asset;
      const scene=createAnimatedScene(map,24,{grid:false,gridOpacity:.22,atmosphere:true});
      const first=scene.frame(0).toDataURL();results.push({asset,still:scene.frame(700).toDataURL()===first,has:hasAnimation(map)});scene.dispose();
    }
    map.objects[0].asset='mushrooms';
    return {results,enabled:hasAnimation(map,{bioluminescence:true}),disabled:hasAnimation(map,{bioluminescence:false})};
  });
  for(const item of result.results){expect(item.still,item.asset).toBe(true);expect(item.has,item.asset).toBe(false);}
  expect(result.enabled).toBe(true);expect(result.disabled).toBe(false);
});

test('magic and fire are occluded by objects above them instead of floating over structures', async ({page}) => {
  const result=await page.evaluate(async()=>{
    const a='/src/engine/animation.ts',t='/src/engine/types.ts';const {createAnimatedScene}=await import(a),{DEFAULT_CONFIG}=await import(t);
    const results=[];
    for(const asset of ['crystal','altar','torch','campfire','mushrooms']) {
      const map={version:2,name:'Occlusion',config:{...DEFAULT_CONFIG,width:8,height:8},terrain:Array(64).fill('floor'),spawn:{x:0,y:0},objects:[
        {id:'under',asset,x:4,y:4,scale:1,rotation:0}, {id:'cover',asset:'table',x:4,y:4.1,scale:5,rotation:0},
      ]};
      const scene=createAnimatedScene(map,28,{grid:false,gridOpacity:.22,atmosphere:false,bioluminescence:true});
      const first=scene.frame(0).toDataURL(),same=scene.frame(700).toDataURL()===first;scene.dispose();results.push({asset,same});
    }
    return results;
  });
  for(const item of result)expect(item.same,item.asset).toBe(true);
});

test('optional mushroom glow changes the viewport and GIF without editing the project', async ({page}) => {
  await page.evaluate(()=>{
    const map=JSON.parse(localStorage.getItem('rc-map-v2')!);
    map.config.width=8;map.config.height=8;map.terrain=Array(64).fill('grass');map.spawn={x:0,y:0};
    map.objects=[{id:'optional-mushrooms',asset:'mushrooms',x:4,y:4,scale:3,rotation:.3}];localStorage.setItem('rc-map-v2',JSON.stringify(map));
  });
  await page.reload();await expect(page.locator('#loading')).toBeHidden();
  const saved=await page.evaluate(()=>localStorage.getItem('rc-map-v2'));
  const capture=()=>page.locator('#map-canvas').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
  await page.waitForTimeout(150);const first=await capture();await page.waitForTimeout(400);expect(await capture()).toBe(first);
  await page.locator('#bioluminescence').click();await expect(page.locator('#bioluminescence')).toHaveJSProperty('selected',true);
  const animated=await capture();await page.waitForTimeout(600);expect(await capture()).not.toBe(animated);
  expect(await page.evaluate(()=>localStorage.getItem('rc-map-v2'))).toBe(saved);
  await page.locator('#open-export').click();await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
  await page.locator('#export-resolution').click();await page.locator('#export-resolution md-select-option[value="25"]').click();
  await expect(page.locator('#gif-note')).toContainText('Setas bioluminiscentes activadas');
  const downloading=page.waitForEvent('download');await page.locator('#download-image').click();const download=await downloading;
  const gif=new GifReader(await readFile((await download.path())!));expect(gif.numFrames()).toBe(24);expect(gif.loopCount()).toBe(0);
  const start=new Uint8Array(gif.width*gif.height*4),end=new Uint8Array(start.length);gif.decodeAndBlitFrameRGBA(0,start);
  for(let i=0;i<=7;i++)gif.decodeAndBlitFrameRGBA(i,end);expect(end).not.toEqual(start);
  await page.locator('#bioluminescence').click();await page.waitForTimeout(150);const paused=await capture();await page.waitForTimeout(400);expect(await capture()).toBe(paused);
});

test('GIF export preserves movement of crystals, runes, plants and floating lilies', async ({page}) => {
  await page.evaluate(()=>{
    const map=JSON.parse(localStorage.getItem('rc-map-v2')!);
    map.config.width=16;map.config.height=12;map.terrain=Array(192).fill('grass');map.spawn={x:0,y:0};
    map.objects=['crystal','altar','lilies','reeds','tree-oak','tree-pine','tree-gold','bush','flowers'].map((asset,i)=>({id:asset,asset,x:3+i%3*5,y:2+Math.floor(i/3)*4,scale:2.4,rotation:0}));
    localStorage.setItem('rc-map-v2',JSON.stringify(map));
  });
  await page.reload();await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#animation-toggle').click(); // Export still animates even when the editor is paused.
  await page.locator('#light-toggle').click();
  await page.locator('#open-export').click();await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
  await page.locator('#export-resolution').click();await page.locator('#export-resolution md-select-option[value="25"]').click();
  const downloading=page.waitForEvent('download');await page.locator('#download-image').click();const download=await downloading;
  await download.saveAs('test-results/rc-animated-object-catalog.gif');
  const gif=new GifReader(await readFile((await download.path())!));
  expect(gif.width).toBe(400);expect(gif.height).toBe(300);
  const start=new Uint8Array(400*300*4),end=new Uint8Array(start.length);gif.decodeAndBlitFrameRGBA(0,start);
  for(let i=0;i<=7;i++)gif.decodeAndBlitFrameRGBA(i,end);
  for(let i=0;i<9;i++) {
    const cx=(3+i%3*5)*25,cy=(2+Math.floor(i/3)*4)*25;let changes=0;
    for(let y=cy-35;y<cy+35;y++)for(let x=cx-35;x<cx+35;x++){const at=(y*400+x)*4;if(start[at]!==end[at]||start[at+1]!==end[at+1]||start[at+2]!==end[at+2])changes++;}
    expect(changes,`object ${i}`).toBeGreaterThan(5);
  }
});
