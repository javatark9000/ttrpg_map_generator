import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
});

test('themes apply immediately to the scene, library, editor preview and history', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  await expect(page.locator('#seed').locator('input')).toHaveValue('RC-7429');
  const screenshots: string[] = [];
  for (const theme of ['vanilla', 'dark', 'anime']) {
    await page.locator(`.theme-card[data-theme="${theme}"]`).click();
    await expect(page.locator('#map-style')).toContainText(theme === 'vanilla' ? 'Vanilla' : theme === 'dark' ? 'Dark' : 'Anime');
    await expect(page.locator('[data-asset="tree-oak"] img')).toHaveAttribute('src', `/assets/${theme}/tree-oak.svg`);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
    expect(saved.config.theme).toBe(theme); expect(saved.objects).toEqual(original.objects); expect(saved.terrain).toEqual(original.terrain);
    await page.screenshot({ path: `test-results/rc-${theme}-forest.png` });
    screenshots.push(await page.locator('#map-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL()));
  }
  expect(new Set(screenshots).size).toBe(3);
  await page.locator('#undo').click();
  await expect(page.locator('.theme-card[data-theme="dark"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#redo').click();
  await expect(page.locator('.theme-card[data-theme="anime"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#tab-assets').click();
  await page.locator('[data-asset="chest"]').click();
  const box = (await page.locator('#map-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#object-count')).toHaveText(`${original.objects.length + 1} objetos`);
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#map-style')).toContainText('Anime');
  await expect(page.locator('[data-asset="chest"] img')).toHaveAttribute('src', '/assets/anime/chest.svg');
  expect(errors).toEqual([]);
});

test('all themed SVGs load and render with non-empty, distinct pixels', async ({ page }) => {
  const results = await page.evaluate(async () => {
    const names = [...document.querySelectorAll<HTMLElement>('[data-asset]')].map(e => e.dataset.asset!);
    names.push('terrain-grass', 'terrain-soil', 'terrain-stone', 'terrain-water');
    const result: Record<string, string[]> = {};
    for (const id of names) {
      result[id] = [];
      for (const theme of ['vanilla', 'dark', 'anime']) {
        const image = new Image(); image.src = `/assets/${theme}/${id}.svg`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
        if (!ctx.getImageData(0,0,128,128).data.some((v,i) => i % 4 === 3 && v > 0)) throw new Error(`Empty ${theme}/${id}`);
        result[id].push(canvas.toDataURL());
      }
    }
    return Object.entries(result).map(([id, data]) => ({ id, variants: new Set(data).size }));
  });
  expect(results).toHaveLength(51);
  expect(results.every(r => r.variants === 3)).toBe(true);
});

test('custom dimensions, actual aspect ratio, portrait generation and theme-aware PNG export', async ({ page }) => {
  await page.locator('.theme-card[data-theme="dark"]').click();
  await page.locator('#map-width').locator('input').fill('24');
  await page.locator('#map-height').locator('input').fill('40');
  await expect(page.locator('#aspect-ratio')).toHaveText('3:5');
  await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#map-dimensions')).toHaveText('24 × 40 casillas');
  await expect(page.locator('#map-style')).toHaveText('Dark · 3:5');
  await page.screenshot({ path: 'test-results/rc-dark-portrait.png' });
  await page.locator('#open-export').click();
  await page.locator('#export-resolution').click(); await page.locator('#export-resolution md-select-option[value="50"]').click();
  await expect(page.locator('#export-dimensions')).toHaveText('1200 × 2000 px');
  const downloading = page.waitForEvent('download'); await page.locator('#download-image').click(); const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/-dark-24x40\.png$/);
  const data = await readFile((await download.path())!);
  expect([data.readUInt32BE(16), data.readUInt32BE(20)]).toEqual([1200,2000]);
  await page.locator('#map-width').locator('input').fill('120');
  await page.locator('#map-height').locator('input').fill('120');
  await expect(page.locator('#size-error')).toBeVisible();
  await expect(page.locator('#generate')).toHaveJSProperty('disabled', true);
  await page.locator('#map-height').locator('input').fill('8');
  await expect(page.locator('#size-error')).toBeHidden();
  await page.locator('#swap-dimensions').click();
  await expect(page.locator('#map-width').locator('input')).toHaveValue('8');
  await expect(page.locator('#map-height').locator('input')).toHaveValue('120');
  await expect(page.locator('#aspect-ratio')).toHaveText('1:15');
});

test('legacy local projects are recovered as Vanilla and migrated without losing edits', async ({ page }) => {
  const old = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem('rc-map-v2')!);
    map.version = 1; delete map.config.theme; map.config.seed = 'ASTRA-CONSERVAR'; map.terrain[12] = 'water';
    localStorage.removeItem('rc-map-v2'); localStorage.setItem('astra-map-v1', JSON.stringify(map));
    return map;
  });
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  const recovered = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(recovered.version).toBe(2); expect(recovered.config.theme).toBe('vanilla'); expect(recovered.config.seed).toBe('ASTRA-CONSERVAR');
  expect(recovered.terrain).toEqual(old.terrain); expect(recovered.objects).toEqual(old.objects);
  await expect(page.locator('#map-style')).toContainText('Vanilla');
  await page.locator('#random-seed').click();
  await expect(page.locator('#seed').locator('input')).toHaveValue(/^RC-/);
});

test('all biomes can be generated in Dark and Anime; new projects retain their theme', async ({ page }) => {
  for (const theme of ['dark', 'anime']) {
    await page.locator(`.theme-card[data-theme="${theme}"]`).click();
    for (const biome of ['forest', 'dungeon', 'cave']) {
      await page.locator(`[data-biome="${biome}"]`).click();
      await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
      expect(saved.config.theme).toBe(theme); expect(saved.config.biome).toBe(biome);
      await page.screenshot({ path: `test-results/rc-generated-${theme}-${biome}.png` });
    }
  }
  const downloading = page.waitForEvent('download'); await page.locator('#save-project').click(); const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/\.anime\.rc\.json$/);
  const project = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(project.config.theme).toBe('anime'); expect(project.version).toBe(2);
});
