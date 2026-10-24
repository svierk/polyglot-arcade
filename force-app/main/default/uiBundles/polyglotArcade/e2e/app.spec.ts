import { expect, test, type Page } from '@playwright/test';

// Runs against the static build without a Salesforce org: the lobby reports
// that games could not be loaded, the hub games are still playable.
test.describe('Polyglot Arcade hub', () => {
  const yourMove = (page: Page) => page.getByText('Your move');
  const roundOver = (page: Page) => page.getByText(/^(You win!|CPU wins|Draw)$/);

  /**
   * The hub renders zoneless, so right after a move the old "Your move" can
   * still be on screen. Wait until the turn has passed, then until it is back.
   */
  async function waitForTurn(page: Page): Promise<void> {
    await expect(yourMove(page)).toBeHidden();
    await expect(yourMove(page).or(roundOver(page))).toBeVisible();
  }

  test('lobby renders and reports missing org data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Polyglot Arcade lobby' })).toBeVisible();
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
    await expect(yourMove(page)).toBeVisible();
    const column = page.getByRole('button', { name: 'Drop disc in column 1' });
    // Six discs fill a column; the CPU may help fill it, so stop once disabled.
    for (let i = 0; i < 6 && (await column.isEnabled()); i++) {
      await column.click();
      await waitForTurn(page);
    }
    if (await yourMove(page).isVisible()) {
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

  test('a finished round shows its result on the machine', async ({ page }) => {
    await page.goto('/play/four-in-a-row');
    await page.getByRole('button', { name: 'easy' }).click();
    await expect(yourMove(page)).toBeVisible();
    await page.locator('app-four-in-a-row').focus();
    // Fill the board column by column with the number keys until the round ends.
    for (let i = 0; i < 42 && (await yourMove(page).isVisible()); i++) {
      const column = (i % 7) + 1;
      if (await page.getByRole('button', { name: `Drop disc in column ${column}` }).isDisabled()) {
        continue;
      }
      await page.keyboard.press(String(column));
      await waitForTurn(page);
    }
    const box = page.locator('.fr-box');
    await expect(box.getByRole('status')).toContainText('points');
    await box.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('button', { name: 'easy' })).toBeVisible();
  });

  test('marquee bar names the hub and leads back to the lobby', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Angular · Polyglot Arcade hub')).toBeVisible();
    await expect(page.getByRole('link', { name: '← Lobby' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Hall of fame' }).click();
    await page.getByRole('link', { name: '← Lobby' }).click();
    await expect(page.getByRole('heading', { name: 'Polyglot Arcade lobby' })).toBeVisible();
  });

  test('hall of fame and 404 pages render', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { name: 'Hall of fame' })).toBeVisible();
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
