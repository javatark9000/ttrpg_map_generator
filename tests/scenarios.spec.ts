import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
});

test('dungeon controls generate the exact requested rooms and persist through project export and reload', async ({ page }) => {
  await page.locator('[data-biome="dungeon"]').click();
  await expect(page.locator('#dungeon-options')).toBeVisible();
  await expect(page.locator('#forest-options')).toBeHidden();
  await page.locator('#rooms-auto').click();
  await expect(page.locator('#room-count')).toHaveJSProperty('disabled', false);
  await page.locator('#room-count').locator('input').fill('9');
  await page.locator('#generate').click();
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#scenario-summary')).toHaveText('9 cuartos');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.config.roomCount).toBe(9); expect(saved.rooms).toHaveLength(9);
  await page.locator('#dungeon-options').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/rc-nine-rooms.png' });
  const downloading = page.waitForEvent('download'); await page.locator('#save-project').click(); const download = await downloading;
  const project = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(project.config.roomCount).toBe(9); expect(project.rooms).toHaveLength(9);
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#room-count').locator('input')).toHaveValue('9');
  await expect(page.locator('#rooms-auto')).toHaveJSProperty('selected', false);
  await expect(page.locator('#scenario-summary')).toHaveText('9 cuartos');
});

test('room constraints react to resized maps and switching back to automatic mode', async ({ page }) => {
  await page.locator('[data-biome="dungeon"]').click(); await page.locator('#rooms-auto').click();
  await page.locator('#room-count').locator('input').fill('9');
  await page.locator('#map-width').locator('input').fill('8'); await page.locator('#map-height').locator('input').fill('8');
  await expect(page.locator('#room-error')).toContainText('caben hasta 1');
  await expect(page.locator('#generate')).toHaveJSProperty('disabled', true);
  await page.locator('#room-count').locator('input').fill('1.5');
  await expect(page.locator('#room-error')).toContainText('entero');
  await page.locator('#room-count').locator('input').fill('');
  await expect(page.locator('#generate')).toHaveJSProperty('disabled', true);
  await page.locator('#rooms-auto').click();
  await expect(page.locator('#room-error')).toBeHidden();
  await expect(page.locator('#generate')).toHaveJSProperty('disabled', false);
  await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#scenario-summary')).toHaveText('1 cuarto');
});

test('thumbnail selection, optional side roads and dead ends change generated geometry and survive reload', async ({ page }) => {
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  await expect(page.locator('[data-path-layout]')).toHaveCount(7);
  await page.locator('[data-path-layout="fork"]').click();
  await expect(page.locator('[data-path-layout="fork"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#forest-branches').click(); await page.locator('#forest-dead-ends').click();
  await expect(page.locator('#forest-branches')).toHaveJSProperty('checked', true);
  await expect(page.locator('#forest-dead-ends')).toHaveJSProperty('checked', true);
  await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.config.forestPathLayout).toBe('fork'); expect(saved.config.forestBranches).toBe(true); expect(saved.config.forestDeadEnds).toBe(true);
  expect(saved.terrain).not.toEqual(original.terrain);
  await page.locator('#forest-options').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/rc-fork-side-roads.png' });
  await page.reload(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('[data-path-layout="fork"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#forest-branches')).toHaveJSProperty('checked', true);
  await expect(page.locator('#forest-dead-ends')).toHaveJSProperty('checked', true);
  await page.locator('[data-path-layout="fork"]').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-path-layout="crossroads"]')).toHaveAttribute('aria-pressed', 'true');
});

test('disabling all paths disables dependent controls and generates a genuinely roadless forest', async ({ page }) => {
  await page.locator('#forest-branches').click(); await page.locator('#forest-dead-ends').click();
  await page.locator('#forest-paths').click();
  await expect(page.locator('[data-path-layout="loop"]')).toBeDisabled();
  await expect(page.locator('#forest-branches')).toHaveJSProperty('disabled', true);
  await expect(page.locator('#forest-dead-ends')).toHaveJSProperty('disabled', true);
  await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.config.forestPaths).toBe(false); expect(saved.terrain).not.toContain('path');
  expect(saved.objects.some((o: { asset: string }) => o.asset === 'bridge')).toBe(false);
  await page.locator('#forest-paths').click();
  await expect(page.locator('#forest-branches')).toHaveJSProperty('disabled', false);
  await expect(page.locator('#forest-branches')).toHaveJSProperty('checked', true);
});

test('every thumbnail generates a different layout, including portrait vertical and loop maps', async ({ page }) => {
  const networks: string[] = [];
  for (const layout of ['meander','vertical','diagonal','bend','fork','crossroads','loop']) {
    await page.locator(`[data-path-layout="${layout}"]`).click();
    await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
    networks.push(await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!).terrain.join(',')));
  }
  expect(new Set(networks).size).toBe(7);
  await page.locator('#forest-options').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'test-results/rc-loop-path.png' });
  await page.locator('[data-path-layout="vertical"]').click();
  await page.locator('#map-width').locator('input').fill('24'); await page.locator('#map-height').locator('input').fill('48');
  await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.config.forestPathLayout).toBe('vertical');expect(saved.spawn.y).toBe(0);
  await expect(page.locator('#map-dimensions')).toHaveText('24 × 48 casillas');
});

test('new options are usable in the mobile drawer without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await page.locator('#toggle-sidebar').click();
  await page.locator('[data-path-layout="crossroads"]').click(); await page.locator('#forest-dead-ends').click();
  await page.locator('#forest-options').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/rc-mobile-path-options.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#generate').click(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('.sidebar')).toBeHidden();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rc-map-v2')!));
  expect(saved.config.forestPathLayout).toBe('crossroads');expect(saved.config.forestDeadEnds).toBe(true);
});
