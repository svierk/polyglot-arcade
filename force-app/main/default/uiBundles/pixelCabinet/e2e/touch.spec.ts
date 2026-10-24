import { expect, test } from '@playwright/test';
import { fitsWidth } from './fixtures/a11y';

// Runs in the mobile project: a 412 px phone with touch, and 375 px for the
// narrowest layout the arcade supports.
test.describe('Touch and small screens @touch', () => {
  for (const path of ['/play/block-drop', '/play/pellet-chase', '/embed']) {
    test(`${path} fits a 375 px screen`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 740 });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      expect(await fitsWidth(page)).toBe(true);
    });
  }

  test('Block Drop is played with the handheld keys', async ({ page }) => {
    await page.goto('/play/block-drop');
    await page.getByRole('button', { name: 'Start or pause' }).tap();
    const score = page.locator('[data-hud="score"] .bd-seg-on');
    await page.getByRole('button', { name: 'Rotate' }).tap();
    await page.getByRole('button', { name: 'Move left' }).tap();
    await page.getByRole('button', { name: 'Hard drop' }).tap();
    await expect(score).not.toHaveText('0');
  });

  test('Pellet Chase is steered with the joystick', async ({ page }) => {
    await page.goto('/play/pellet-chase');
    await page.getByRole('button', { name: 'Press start' }).tap();
    await page.getByRole('button', { name: 'Left', exact: true }).tap();
    // After the ready freeze the player runs into the first pellets.
    await expect(page.locator('[data-hud="score"]')).not.toHaveText('0');
    await page.getByRole('button', { name: 'Pause' }).tap();
    await expect(page.getByText('Paused')).toBeVisible();
  });
});
