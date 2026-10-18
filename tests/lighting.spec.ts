import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GifReader } from 'omggif';
import type { Page } from '@playwright/test';

async function setSlider(page: Page, key: string, value: number, commit = true) {
  await page.locator(`#lighting-${key}`).evaluate((el: HTMLElement & { value: number }, args) => {
    el.value = args.value; el.dispatchEvent(new Event('input', { bubbles: true }));
    if (args.commit) el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { value, commit });
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/'); await expect(page.locator('#loading')).toBeHidden();
});

test('lighting tab, keyboard navigation, grouped undo and independent controls', async ({ page }) => {
  const old = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  await page.locator('#tab-world').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-lighting')).toBeFocused(); await expect(page.locator('#lighting-panel')).toBeVisible();
  await expect(page.locator('#world-panel')).toBeHidden(); await expect(page.locator('#assets-panel')).toBeHidden();
  const before = await page.locator('#map-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await setSlider(page, 'direction', 100, false); await setSlider(page, 'direction', 180, false); await setSlider(page, 'direction', 270);
  await expect(page.locator('#lighting-direction-value')).toHaveText('270°');
  const after = await page.locator('#map-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL()); expect(after).not.toBe(before);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.terrain).toEqual(old.terrain); expect(saved.objects).toEqual(old.objects); expect(saved.config).toEqual(old.config);
  await page.locator('#undo').click(); await expect(page.locator('#lighting-direction')).toHaveJSProperty('value', 315);
  await expect(page.locator('#undo')).toHaveJSProperty('disabled', true);
  await page.locator('#redo').click(); await expect(page.locator('#lighting-direction')).toHaveJSProperty('value', 270);
  await page.locator('#lighting-sun').click(); await expect(page.locator('#lighting-intensity')).toHaveJSProperty('disabled', true);
  await expect(page.locator('#lighting-halos')).toHaveJSProperty('disabled', false);
  await page.locator('#light-toggle').click(); await expect(page.locator('#lighting-enabled')).toHaveJSProperty('selected', false);
  await expect(page.locator('#lighting-halos')).toHaveJSProperty('disabled', true);
  await page.locator('#lighting-enabled').click(); await expect(page.locator('#lighting-direction')).toHaveJSProperty('value', 270);
  await page.locator('#lighting-reset').click(); await expect(page.locator('#lighting-direction')).toHaveJSProperty('value', 315);
  await page.locator('#tab-lighting').focus(); await page.keyboard.press('Home'); await expect(page.locator('#tab-world')).toBeFocused();
});

test('lighting travels with JSON, reload, regeneration and switching scenarios', async ({ page }) => {
  await page.locator('#tab-lighting').click(); await setSlider(page, 'direction', 90); await setSlider(page, 'vignette', 0); await setSlider(page, 'halos', 27);
  const downloadEvent = page.waitForEvent('download'); await page.locator('#save-project').click(); const download = await downloadEvent;
  const text = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(text).lighting).toMatchObject({ direction: 90, vignette: 0, halos: 27 });
  await page.reload(); await expect(page.locator('#loading')).toBeHidden(); await page.locator('#tab-lighting').click();
  await expect(page.locator('#lighting-halos')).toHaveJSProperty('value', 27);
  await page.locator('#tab-world').click(); await page.locator('[data-biome="building"]').click(); await page.locator('#generate').click(); await page.locator('#confirm-replace').click(); await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#tab-lighting').click(); await expect(page.locator('#lighting-sun')).toHaveJSProperty('disabled', true);
  await expect(page.locator('#lighting-context')).toContainText('Interior'); await expect(page.locator('#lighting-halos')).toHaveJSProperty('value', 27);
  await page.locator('#project-input').setInputFiles({ name: 'lighting.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#lighting-sun')).toHaveJSProperty('disabled', false); await expect(page.locator('#lighting-direction')).toHaveJSProperty('value', 90);
});

test('directional shadows, masked beams, zero controls and theme-aware static animation parity', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const lightUrl = '/src/engine/lighting.ts', settingsUrl = '/src/engine/lighting-settings.ts', typesUrl = '/src/engine/types.ts', renderUrl = '/src/engine/render.ts', animationUrl = '/src/engine/animation.ts';
    const { drawSunlight } = await import(lightUrl), { DEFAULT_LIGHTING } = await import(settingsUrl), { DEFAULT_CONFIG } = await import(typesUrl), { renderMap } = await import(renderUrl), { createAnimatedScene } = await import(animationUrl);
    const map = { version: 2, name: 'Light test', config: { ...DEFAULT_CONFIG, width: 12, height: 12 }, terrain: Array(144).fill('grass'), objects: [], spawn: { x: 0, y: 0 }, lighting: { ...DEFAULT_LIGHTING, intensity: 100, beams: false, vignette: 0, halos: 0, shadowLength: 100, shadowStrength: 100, softness: 0 } };
    const options = { grid: false, gridOpacity: .2, atmosphere: true };
    const sample = () => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 240; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#aaa'; ctx.fillRect(0, 0, 240, 240); drawSunlight(ctx, map, 20, options); return ctx.getImageData(0, 0, 240, 240).data; };
    map.terrain[5 * 12 + 5] = 'wall';
    const directions = [];
    for (const [direction, x, y, oppositeX, oppositeY] of [[0, 5.5, 8, 5.5, 2], [90, 2, 5.5, 8, 5.5], [180, 5.5, 2, 5.5, 8], [270, 8, 5.5, 2, 5.5]]) {
      map.lighting.direction = direction; map.lighting.shadows = false; const a = sample(); map.lighting.shadows = true; const b = sample();
      const diff = (xx: number, yy: number) => { const i = (Math.floor(yy * 20) * 240 + Math.floor(xx * 20)) * 4; return Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); };
      directions.push({ forward: diff(x, y), backward: diff(oppositeX, oppositeY) });
    }
    map.lighting.shadows = false; map.lighting.beamStrength = 100; map.lighting.beamDensity = 100;
    const noBeams = sample(); map.lighting.beams = true; const beams = sample();
    const inside = (5 * 20 + 10) * 240 * 4 + (5 * 20 + 10) * 4;
    const blocked = noBeams.slice(inside, inside + 4).every((n: number, i: number) => n === beams[inside + i]);
    const beamChange = noBeams.some((n: number, i: number) => n !== beams[i]);
    map.lighting.enabled = false; const off = sample(); map.lighting.enabled = true; map.lighting.intensity = 0; const zero = sample();
    const zeroSame = off.every((n: number, i: number) => n === zero[i]);
    const parity = [];
    for (const theme of ['vanilla', 'dark', 'anime']) for (const biome of ['forest', 'ruins', 'village', 'mountain', 'building']) {
      map.config.theme = theme; map.config.biome = biome; map.lighting.intensity = 80;
      const plain = renderMap(map, 20, options), scene = createAnimatedScene(map, 20, options);
      parity.push(plain.toDataURL() === scene.frame(0).toDataURL() && plain.toDataURL() === scene.frame(600).toDataURL()); scene.dispose();
    }
    map.config.biome = 'village'; map.lighting.beams = false; const villageOff = sample(); map.lighting.beams = true; const villageOn = sample();
    return { directions, blocked, beamChange, zeroSame, parity, villageNoBeams: villageOff.every((n: number, i: number) => n === villageOn[i]) };
  });
  for (const direction of result.directions) { expect(direction.forward).toBeGreaterThan(30); expect(direction.backward).toBe(0); }
  expect(result.blocked).toBe(true); expect(result.beamChange).toBe(true); expect(result.zeroSame).toBe(true); expect(result.parity.every(Boolean)).toBe(true); expect(result.villageNoBeams).toBe(true);
});

test('lighting settings affect PNG and GIF exports without changing geometry', async ({ page }) => {
  test.setTimeout(60_000);
  await page.locator('#map-width').locator('input').fill('8'); await page.locator('#map-height').locator('input').fill('8'); await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#tab-lighting').click(); await setSlider(page, 'direction', 120); await setSlider(page, 'intensity', 90);
  const saved = await page.evaluate(() => localStorage.getItem('rc-map-v2'));
  for (const format of ['png', 'gif']) {
    await page.locator('#open-export').click(); await page.locator('#export-format').click(); await page.locator(`#export-format md-select-option[value="${format}"]`).click();
    await page.locator('#export-resolution').click(); await page.locator('#export-resolution md-select-option[value="25"]').click();
    const pending = page.waitForEvent('download'); await page.locator('#download-image').click(); const download = await pending;
    const bytes = await readFile((await download.path())!);
    if (format === 'gif') { const reader = new GifReader(bytes); expect(reader.numFrames()).toBe(24); expect(reader.width).toBe(200); expect(reader.loopCount()).toBe(0); }
    else { expect(bytes.readUInt32BE(16)).toBe(200); expect(bytes.readUInt32BE(20)).toBe(200); }
  }
  expect(await page.evaluate(() => localStorage.getItem('rc-map-v2'))).toBe(saved);
});

test('lighting panel fits mobile and supports all controls without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.locator('#toggle-sidebar').click(); await page.locator('#tab-lighting').click();
  await expect(page.locator('#lighting-panel')).toBeVisible(); await page.locator('#lighting-beams').click();
  await expect(page.locator('#lighting-beamWidth')).toHaveJSProperty('disabled', true);
  await page.locator('#lighting-reset').click(); await page.locator('#lighting-enabled').scrollIntoViewIfNeeded();
  expect(await page.locator('.sidebar').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.locator('#lighting-panel').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/rc-mobile-lighting.png' });
});
