import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GifReader } from 'omggif';

test.beforeEach(async({page})=>{await page.goto('/');await expect(page.locator('#loading')).toBeHidden();});

test('new outdoor worlds generate in every theme with their own controls and artwork',async({page})=>{
  test.setTimeout(90_000);
  await expect(page.locator('[data-biome]')).toHaveCount(7);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const theme of ['vanilla','dark','anime'])for(const biome of ['ruins','village','mountain']) {
    await page.locator(`.theme-card[data-theme="${theme}"]`).click();await page.locator(`[data-biome="${biome}"]`).click();
    await expect(page.locator(`#${biome}-options`)).toBeVisible();await expect(page.locator('#forest-options')).toBeHidden();
    await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
    const map=await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!));
    expect(map.config.biome).toBe(biome);expect(map.config.theme).toBe(theme);expect(map.objects.length).toBeGreaterThan(0);
    await page.locator(`[data-biome="${biome}"]`).scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/rc-${theme}-${biome}.png`});
  }
  expect(errors).toEqual([]);
});

test('all eight roofless building types generate different furnishings and survive project export',async({page})=>{
  test.setTimeout(90_000);
  await page.locator('[data-biome="building"]').click();
  await expect(page.locator('#building-options')).toBeVisible();await expect(page.locator('#water')).toHaveJSProperty('disabled',true);
  await expect(page.locator('#building-type md-select-option')).toHaveCount(8);
  const types=['house','tavern','inn','smithy','temple','library','warehouse','barracks'];
  const furniture=['bed','counter','bed','anvil','altar','bookshelf','sacks','weapon-rack'];
  for(const [i,type]of types.entries()) {
    await page.locator('#building-type').click();await page.locator(`#building-type md-select-option[value="${type}"]`).click();
    await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
    const map=await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!));
    expect(map.config.buildingType).toBe(type);expect(map.objects.some((o:{asset:string})=>o.asset===furniture[i])).toBe(true);
    expect(map.objects.some((o:{asset:string})=>o.asset.startsWith('roof-'))).toBe(false);
    await page.locator('#building-options').scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/rc-building-${type}.png`});
  }
  const downloading=page.waitForEvent('download');await page.locator('#save-project').click();const download=await downloading;
  const project=JSON.parse(await readFile((await download.path())!,'utf8'));expect(project.config.buildingType).toBe('barracks');
  await page.reload();await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#building-type')).toHaveJSProperty('value','barracks');await expect(page.locator('#map-biome')).toContainText('CUARTEL');
});

test('decay, village layout and snow controls affect terrain and are restored on reload',async({page})=>{
  await page.locator('[data-biome="ruins"]').click();
  await page.locator('#ruin-decay').evaluate((el:HTMLElement&{value:number})=>{el.value=100;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(page.locator('#decay-value')).toHaveText('100%');await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!).config.ruinDecay)).toBe(100);
  await page.locator('[data-biome="village"]').click();await page.locator('#village-layout').click();await page.locator('#village-layout md-select-option[value="linear"]').click();
  await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!).config.villageLayout)).toBe('linear');
  await page.locator('[data-biome="mountain"]').click();await page.locator('#mountain-snow').click();await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
  const map=await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!));expect(map.config.mountainSnow).toBe(false);expect(map.terrain).not.toContain('snow');
  await page.reload();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#mountain-snow')).toHaveJSProperty('selected',false);
  await expect(page.locator('#village-layout')).toHaveJSProperty('value','linear');await expect(page.locator('#ruin-decay')).toHaveJSProperty('value',100);
});

test('new terrain brushes and architecture props participate in editing and history',async({page})=>{
  await page.locator('#tool-brush').click();await expect(page.locator('[data-terrain]')).toHaveCount(10);
  const box=(await page.locator('#map-canvas').boundingBox())!;
  for(const terrain of ['wood','snow','gravel']) {
    await page.locator(`[data-terrain="${terrain}"]`).click();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    await expect.poll(()=>page.evaluate(t=>JSON.parse(localStorage.getItem('rc-map-v2')!).terrain.includes(t),terrain)).toBe(true);
  }
  await page.locator('#tab-assets').click();await page.locator('.asset-filters [data-category="architecture"]').click();
  await expect(page.locator('[data-asset="bed"]')).toBeVisible();await page.locator('[data-asset="bed"]').click();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!).objects.at(-1).asset)).toBe('bed');
  await page.locator('#undo').click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!).objects.at(-1).asset)).not.toBe('bed');
  await page.locator('#redo').click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!).objects.at(-1).asset)).toBe('bed');
});

test('new scenarios export full PNGs and the smithy retains its fire in GIF',async({page})=>{
  test.setTimeout(90_000);
  await page.locator('#map-width').locator('input').fill('16');await page.locator('#map-height').locator('input').fill('12');
  for(const biome of ['ruins','village','mountain','building']) {
    await page.locator(`[data-biome="${biome}"]`).click();
    if(biome==='building'){await page.locator('#building-type').click();await page.locator('#building-type md-select-option[value="smithy"]').click();}
    await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
    await page.locator('#open-export').click();await page.locator('#export-resolution').click();await page.locator('#export-resolution md-select-option[value="25"]').click();
    const downloading=page.waitForEvent('download');await page.locator('#download-image').click();const download=await downloading;
    const bytes=await readFile((await download.path())!);expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(400);expect(bytes.readUInt32BE(20)).toBe(300);
  }
  await page.locator('#open-export').click();await page.locator('#export-format').click();await page.locator('#export-format md-select-option[value="gif"]').click();
  const downloading=page.waitForEvent('download');await page.locator('#download-image').click();const download=await downloading;
  await download.saveAs('test-results/rc-smithy-animated.gif');const gif=new GifReader(await readFile((await download.path())!));
  expect(gif.numFrames()).toBe(24);expect(gif.loopCount()).toBe(0);
  const a=new Uint8Array(400*300*4),b=new Uint8Array(a.length);gif.decodeAndBlitFrameRGBA(0,a);for(let i=0;i<=7;i++)gif.decodeAndBlitFrameRGBA(i,b);expect(b).not.toEqual(a);
});

test('building type controls and the expanded scenario selector fit the mobile drawer',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.locator('#toggle-sidebar').click();await page.locator('[data-biome="building"]').click();
  await page.locator('#building-type').click();await page.locator('#building-type md-select-option[value="temple"]').click();
  await expect(page.locator('#building-type md-select-option[value="temple"]')).toBeHidden();
  await page.locator('#compact-building').click();
  await expect(page.locator('#map-width').locator('input')).toHaveValue('24');
  await expect(page.locator('#map-height').locator('input')).toHaveValue('18');
  await page.locator('#building-options').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/rc-mobile-building-options.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#generate').click();await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#map-biome')).toContainText('TEMPLO');await expect(page.locator('#map-dimensions')).toHaveText('24 × 18 casillas');await expect(page.locator('.sidebar')).toBeHidden();
});
