import { expect, test } from '@playwright/test';

// Runs against the static build without a Salesforce org: the lobby reports
// that games could not be loaded, the hub games are still playable.
test.describe('Polyglot Arcade hub', () => {
  test('lobby renders and reports missing org data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Insert coin' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Could not load games');
  });

  test('Four in a Row: the CPU answers a move', async ({ page }) => {
    await page.goto('/play/four-in-a-row');
    await page.getByRole('button', { name: 'easy' }).click();
    await expect(page.getByText('Your move')).toBeVisible();
    await page.getByRole('button', { name: 'Drop disc in column 4' }).click();
    await expect(page.getByText('CPU is thinking…')).toBeVisible();
    await expect(page.getByText('Your move')).toBeVisible();
  });

  test('full columns cannot be played', async ({ page }) => {
    await page.goto('/play/four-in-a-row');
    await page.getByRole('button', { name: 'easy' }).click();
    const column = page.getByRole('button', { name: 'Drop disc in column 1' });
    // Six discs fill a column; the CPU may help fill it, so stop once disabled.
    for (let i = 0; i < 6 && (await column.isEnabled()); i++) {
      await column.click();
      await expect(
        page.getByText('Your move').or(page.getByText(/You win|CPU wins|Draw/)),
      ).toBeVisible();
    }
    if (await page.getByText('Your move').isVisible()) {
      await expect(column).toBeDisabled();
    }
  });

  test('Brick Breaker: start, launch, pause and resume', async ({ page }) => {
    await page.goto('/play/brick-breaker');
    await expect(page.getByRole('heading', { name: 'Brick Breaker' })).toBeVisible();
    await page.getByRole('button', { name: 'Press start' }).click();
    await expect(page.getByLabel('3 lives left')).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('p');
    await expect(page.getByText('Paused')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByText('Paused')).toBeHidden();
  });

  test('hall of fame and 404 pages render', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { name: 'Hall of fame' })).toBeVisible();
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
