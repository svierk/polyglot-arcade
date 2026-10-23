import { expect, test } from '@playwright/test';

// Runs against the static build without a Salesforce org: games are playable,
// saving a score fails gracefully.
test.describe('Pixel Cabinet', () => {
  test('lobby lists the cabinet games', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Insert coin' })
    ).toBeVisible();
    for (const name of ['Block Drop', 'Pellet Chase']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`${name}.*Play`) })
      ).toBeVisible();
    }
    await expect(page.getByText('Coming soon')).toHaveCount(0);
  });

  test('a Block Drop round can be played to the end', async ({ page }) => {
    await page.goto('/play/block-drop');
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByText('Score').first()).toBeVisible();
    for (let i = 0; i < 60; i++) await page.keyboard.press(' ');
    await expect(page.getByText('Game over')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play again' })
    ).toBeVisible();
  });

  test('a Pellet Chase round starts, pauses and resumes', async ({ page }) => {
    await page.goto('/play/pellet-chase');
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('ArrowUp');
    const score = page
      .locator('.arcade-stat', { hasText: 'Score' })
      .locator('strong');
    // After the ready freeze the player runs into the first pellets.
    await expect(score).not.toHaveText('0');

    await page.keyboard.press('p');
    await expect(page.getByText('Paused')).toBeVisible();
    const pausedScore = await score.textContent();
    await page.waitForTimeout(500);
    await expect(score).toHaveText(pausedScore!);

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByText('Paused')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Paused')).toBeVisible();
  });

  test('embed route offers a game picker without host props', async ({
    page,
  }) => {
    await page.goto('/embed');
    await page.getByRole('button', { name: /Block Drop/ }).click();
    await expect(
      page.getByRole('button', { name: 'Press start' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '← Lobby' })).toBeVisible();
  });

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
