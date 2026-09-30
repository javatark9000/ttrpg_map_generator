import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
});

test('initial illustrated forest, controls and no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page).toHaveTitle('RC map generator — Mundos para tus aventuras');
  await expect(page.locator('#map-title')).toContainText('El bosque');
  await expect(page.locator('#save-status')).toHaveText('Guardado en este navegador');
  await expect(page.locator('#map-canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/rc-vanilla-forest.png' });
  await page.locator('#grid-toggle').click();
  await expect(page.locator('#grid-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('g');
  await expect(page.locator('#grid-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#zoom-in').click();
  await page.locator('#fit-map').click();
  expect(errors).toEqual([]);
});

test('generates all scenarios and changes size through Material Web', async ({ page }) => {
  for (const biome of ['dungeon', 'cave']) {
    await page.locator(`[data-biome="${biome}"]`).click();
    await page.locator('#generate').click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#map-biome')).toHaveText(biome === 'dungeon' ? 'MAZMORRA' : 'CAVERNA');
    await page.screenshot({ path: `test-results/rc-vanilla-${biome}.png` });
  }
  await page.locator('#map-size').click();
  await page.locator('#map-size md-select-option[value="24x18"]').click();
  await page.locator('#seed').locator('input').fill('PRUEBA-DE-MESA');
  await page.locator('#generate').click();
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#map-dimensions')).toHaveText('24 × 18 casillas');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.config.seed).toBe('PRUEBA-DE-MESA');
  await page.reload();
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#map-dimensions')).toHaveText('24 × 18 casillas');
});

test('places objects, undo/redo, terrain painting and restoring the project', async ({ page }) => {
  const getMap = () => page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  const initial = await getMap();
  await page.locator('#tab-assets').click();
  await page.locator('[data-asset="chest"]').click();
  const canvas = page.locator('#map-canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#object-count')).toHaveText(`${initial.objects.length + 1} objetos`);
  await page.locator('#undo').click();
  await expect(page.locator('#object-count')).toHaveText(`${initial.objects.length} objetos`);
  await page.locator('#redo').click();
  await expect(page.locator('#object-count')).toHaveText(`${initial.objects.length + 1} objetos`);
  await page.locator('#tool-brush').click();
  await page.locator('[data-terrain="water"]').click();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const painted = await getMap();
  expect(painted.terrain).not.toEqual(initial.terrain);
  await page.locator('#tool-pan').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#save-project').click();
  const download = await downloadPromise;
  const path = (await download.path())!;
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(painted);
  await page.locator('#project-input').setInputFiles(path);
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await page.locator('#confirm-replace').click();
  expect(await getMap()).toEqual(painted);
  await page.reload();
  await expect(page.locator('#loading')).toBeHidden();
  expect(await getMap()).toEqual(painted);
});

test('exports a real PNG and JPEG at the requested resolution', async ({ page }) => {
  for (const format of ['png', 'jpeg']) {
    await page.locator('#open-export').click();
    await expect(page.locator('#export-dialog')).toBeVisible();
    await page.locator('#export-resolution').click();
    await page.locator('#export-resolution md-select-option[value="50"]').click();
    await page.locator('#export-format').click();
    await page.locator(`#export-format md-select-option[value="${format}"]`).click();
    await expect(page.locator('#export-dimensions')).toHaveText('2000 × 1500 px');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-image').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(format === 'png' ? /\.png$/ : /\.jpg$/);
    const data = await readFile((await download.path())!);
    expect(data.byteLength).toBeGreaterThan(50_000);
    const dimensions = await page.evaluate(async ({ data, format }) => { const image = new Image(); image.src = `data:image/${format};base64,${data}`; await image.decode(); return [image.naturalWidth, image.naturalHeight]; }, { data: data.toString('base64'), format });
    expect(dimensions).toEqual([2000, 1500]);
    await expect(page.locator('#export-dialog')).toBeHidden();
  }
});

test('handles invalid project files and keyboard shortcuts safely', async ({ page }) => {
  await page.locator('#project-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('#toast')).toContainText('no es un proyecto RC válido');
  await page.locator('#seed').locator('input').fill('bbbbgggeee');
  await expect(page.locator('#tool-pan')).toHaveClass(/active/);
  await expect(page.locator('#grid-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#help-button').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
});

test('mobile viewport, configuration drawer and touch-size actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#fit-map').click();
  await expect(page.locator('.sidebar')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/rc-mobile.png' });
  await page.locator('#toggle-sidebar').click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.locator('#tab-assets').click();
  await page.locator('[data-asset="tree-oak"]').click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.locator('#open-export').click();
  await expect(page.locator('#export-dialog')).toBeVisible();
  await page.screenshot({ path: 'test-results/rc-mobile-export.png' });
});
