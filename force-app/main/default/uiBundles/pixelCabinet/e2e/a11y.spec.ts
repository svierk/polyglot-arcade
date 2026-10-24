import { expect, test } from '@playwright/test';
import { expectAccessible } from './fixtures/a11y';

// axe checks the cabinet against WCAG 2.1 AA: both machines before, during
// and after a round, the X-ray behind the badge and the /embed route.
test.describe('Accessibility of the cabinet', () => {
  test('Block Drop, from the attract screen to the result', async ({
    page,
  }) => {
    await page.goto('/play/block-drop');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('p');
    await expect(page.locator('.bd-overlay')).toContainText('Paused');
    await expectAccessible(page);
    await page.keyboard.press('p');
    for (let i = 0; i < 60; i++) await page.keyboard.press(' ');
    await expect(page.locator('.bd-overlay')).toContainText('Game over');
    // Screen readers hear the end of the round from a live region.
    await expect(page.getByRole('status')).toContainText(
      /Game over\. \d+ points\./
    );
    await expectAccessible(page);
  });

  test('Pellet Chase, ready and paused', async ({ page }) => {
    await page.goto('/play/pellet-chase');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('p');
    await expect(page.getByText('Paused')).toBeVisible();
    await expectAccessible(page);
  });

  test('the X-ray behind the badge', async ({ page }) => {
    await page.goto('/play/pellet-chase');
    await page.getByRole('button', { name: /Pixel Cabinet UI bundle/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Native React UI bundle' })
    ).toBeVisible();
    await expectAccessible(page);
  });

  test('the embed route', async ({ page }) => {
    await page.goto('/embed');
    await expectAccessible(page);
    await page.getByRole('button', { name: /Pellet Chase/ }).click();
    await expect(
      page.getByRole('button', { name: 'Press start' })
    ).toBeVisible();
    await expectAccessible(page);
  });
});
