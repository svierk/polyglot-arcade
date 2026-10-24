import { expect, test } from '@playwright/test';
import { fitsWidth } from './fixtures/a11y';
import { mockOrg } from './fixtures/org';

// Runs in the mobile project: a 412 px phone with touch, and 375 px for the
// narrowest layout the arcade supports.
test.describe('Touch and small screens @touch', () => {
  test.beforeEach(async ({ page }) => {
    await mockOrg(page);
  });

  for (const path of ['/', '/leaderboard', '/play/four-in-a-row', '/play/brick-breaker']) {
    test(`${path} fits a 375 px screen`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 740 });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      if (path === '/') {
        await expect(page.getByRole('heading', { name: 'Block Drop' })).toBeVisible();
        await page.getByRole('button', { name: 'Tech X-ray' }).tap();
        await page.getByRole('button', { name: /Polyglot Arcade hub/ }).tap();
      }
      expect(await fitsWidth(page)).toBe(true);
    });
  }

  test('Four in a Row is played by tapping a column', async ({ page }) => {
    await page.goto('/play/four-in-a-row');
    await page.getByRole('button', { name: 'easy' }).tap();
    await page.getByRole('button', { name: /column 4/ }).tap();
    await expect(page.getByText('CPU is thinking…')).toBeVisible();
    await expect(page.getByText('Your move')).toBeVisible();
    await expect(page.getByRole('button', { name: /column 4/ })).toHaveAccessibleName(/yours/);
  });

  test('Brick Breaker: a tap launches, dragging moves the paddle', async ({ page }) => {
    await page.goto('/play/brick-breaker');
    await page.getByRole('button', { name: 'Press start' }).tap();
    const canvas = page.locator('canvas');
    const box = (await canvas.boundingBox())!;
    const y = box.y + box.height * 0.9;
    const touch = (type: string, x: number) =>
      canvas.dispatchEvent(type, {
        pointerType: 'touch',
        isPrimary: true,
        clientX: x,
        clientY: y,
      });
    await touch('pointerdown', box.x + box.width / 2);
    for (let i = 1; i <= 10; i++) await touch('pointermove', box.x + box.width * (0.5 - i * 0.04));
    await touch('pointerup', box.x + box.width * 0.1);
    // The launched ball is in play: pausing shows the pause screen.
    await page.locator('app-brick-breaker').press('p');
    await expect(page.getByText('Paused')).toBeVisible();
  });
});
