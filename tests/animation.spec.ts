import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GifReader } from 'omggif';

test.beforeEach(async ({page}) => {
  await page.goto('/');await expect(page.locator('#loading')).toBeHidden();
});

test('live animation can be paused and resumed without editing map data', async ({page}) => {
  const saved=await page.evaluate(()=>localStorage.getItem('rc-map-v2'));
  const capture=()=>page.locator('#map-canvas').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
  await expect(page.locator('#animation-toggle')).toHaveAttribute('aria-pressed','true');
  const before=await capture(); await page.waitForTimeout(350);expect(await capture()).not.toBe(before);
  await page.locator('#animation-toggle').click();await page.waitForTimeout(150);
  const paused=await capture();await page.waitForTimeout(350);expect(await capture()).toBe(paused);
  await page.locator('#animation-toggle').click();await page.waitForTimeout(350);expect(await capture()).not.toBe(paused);
  expect(await page.evaluate(()=>localStorage.getItem('rc-map-v2'))).toBe(saved);
});

test('reduced-motion preference starts paused but explicit playback remains available', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#animation-toggle')).toHaveAttribute('aria-pressed','false');
  await page.locator('#animation-toggle').click();await expect(page.locator('#animation-toggle')).toHaveAttribute('aria-pressed','true');
});

test('water and both fire sources move in all themes and close on exactly the same frame', async ({page}) => {
  const results=await page.evaluate(async()=>{
    const animationUrl='/src/engine/animation.ts', renderUrl='/src/engine/render.ts', typesUrl='/src/engine/types.ts';
    const {createAnimatedScene}=await import(animationUrl), {loadAssets}=await import(renderUrl), {DEFAULT_CONFIG}=await import(typesUrl);
    await loadAssets();
    return ['vanilla','dark','anime'].map(theme=>{
      const terrain=Array.from({length:64},(_,i)=>i%8>=3&&i%8<=5&&Math.floor(i/8)>=2&&Math.floor(i/8)<=6?'water':'grass');
      const map={version:2,name:'Motion test',config:{...DEFAULT_CONFIG,width:8,height:8,theme},spawn:{x:0,y:0},terrain,objects:[
        {id:'bridge',asset:'bridge',x:4.5,y:4.5,scale:4.2,rotation:0},
        {id:'fire',asset:'campfire',x:1.5,y:1.5,scale:1.5,rotation:.4},
        {id:'torch',asset:'torch',x:6.5,y:6.5,scale:1.5,rotation:-.4},
      ]};
      const scene=createAnimatedScene(map,40,{grid:true,gridOpacity:.22,atmosphere:false});
      const pixels=(time:number)=>scene.frame(time).getContext('2d').getImageData(0,0,320,320).data.slice();
      const a=pixels(0),b=pixels(600),end=pixels(2400);
      const changes=(x:number,y:number,w:number,h:number)=>{
        let count=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*320+xx)*4;if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])count++;}return count;
      };
      const result={theme,loop:a.every((v:number,i:number)=>v===end[i]),water:changes(130,85,100,25),fire:changes(35,35,50,50),torch:changes(235,225,50,50),bridge:changes(160,170,40,20),dry:changes(0,120,60,80)};
      scene.dispose();return result;
    });
  });
  for(const result of results){expect(result.loop,result.theme).toBe(true);expect(result.water).toBeGreaterThan(10);expect(result.fire).toBeGreaterThan(10);expect(result.torch).toBeGreaterThan(10);expect(result.bridge).toBe(0);expect(result.dry).toBe(0);}
});

test('exports genuine animated GIFs in all themes, including while the viewport is paused', async ({page}) => {
  test.setTimeout(90_000);
  await page.locator('#animation-toggle').click();
  await page.locator('#map-width').locator('input').fill('8');await page.locator('#map-height').locator('input').fill('8');
  await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
  for(const theme of ['vanilla','dark','anime']) {
    await page.locator(`.theme-card[data-theme="${theme}"]`).click();
    await page.locator('#open-export').click();
    await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
    await page.locator('#export-resolution').click();await page.locator('#export-resolution md-select-option[value="25"]').click();
    await expect(page.locator('#export-dimensions')).toHaveText('200 × 200 px');await expect(page.locator('#gif-note')).toBeVisible();
    const downloading=page.waitForEvent('download');await page.locator('#download-image').click();const download=await downloading;
    expect(download.suggestedFilename()).toMatch(new RegExp(`${theme}-8x8.gif$`));
    await download.saveAs(`test-results/rc-${theme}-animated.gif`);
    const bytes=await readFile((await download.path())!);const gif=new GifReader(bytes);
    expect(gif.width).toBe(200);expect(gif.height).toBe(200);expect(gif.numFrames()).toBe(24);expect(gif.loopCount()).toBe(0);
    const first=new Uint8Array(200*200*4),later=new Uint8Array(first.length);
    gif.decodeAndBlitFrameRGBA(0,first);for(let frame=0;frame<=6;frame++)gif.decodeAndBlitFrameRGBA(frame,later);expect(later).not.toEqual(first);
    expect(later.filter((_,i)=>i%4===3).every(alpha=>alpha===255)).toBe(true);
    for(let i=0;i<24;i++)expect(gif.frameInfo(i).delay).toBe(10);
    await expect(page.locator('#export-dialog')).toBeHidden();
  }
});

test('GIF resolution is bounded, cancellation stops download, and controls recover', async ({page}) => {
  let downloads=0;page.on('download',()=>downloads++);
  await page.locator('#open-export').click();await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
  await expect(page.locator('#export-dimensions')).toHaveText('1120 × 840 px');
  await page.locator('#download-image').click();await expect(page.locator('#gif-progress')).toBeVisible();
  await expect(page.locator('#export-format')).toHaveJSProperty('disabled',true);
  await page.locator('#cancel-export').click();await expect(page.locator('#export-dialog')).toBeHidden();
  await page.waitForTimeout(800);expect(downloads).toBe(0);
  await page.locator('#open-export').click();await expect(page.locator('#download-image')).toHaveJSProperty('disabled',false);
  await expect(page.locator('#export-format')).toHaveJSProperty('disabled',false);await expect(page.locator('#gif-progress')).toBeHidden();
  await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="png"]').click();
  await expect(page.locator('#gif-note')).toBeHidden();await expect(page.locator('#export-dimensions')).toHaveText('4000 × 3000 px');
});

test('worker failure is visible and does not leave export controls locked', async ({page}) => {
  await page.context().route('**/*gif.worker*',route=>route.abort());
  await page.locator('#open-export').click();await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
  await page.locator('#download-image').click();await expect(page.locator('#export-error')).toBeVisible();
  await expect(page.locator('#download-image')).toHaveJSProperty('disabled',false);
  await expect(page.locator('#gif-progress')).toBeHidden();
});

test('GIF controls remain usable in the mobile export dialog', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.locator('#open-export').click();await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
  await expect(page.locator('#gif-note')).toContainText('28 px por casilla');
  await expect(page.locator('#export-format md-select-option[value="gif"]')).toBeHidden();
  await page.locator('#download-image').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/rc-mobile-gif-dialog.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#download-image').click();await expect(page.locator('#gif-progress')).toBeVisible();
  await page.locator('#cancel-export').click();await expect(page.locator('#export-dialog')).toBeHidden();
});
