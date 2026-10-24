import { expect, test } from '@playwright/test';

// Runs against the static build without a Salesforce org: games are playable,
// saving a score fails gracefully.
test.describe('Pixel Cabinet', () => {
  test('has no lobby of its own', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('Pick a game in the Polyglot Arcade lobby')
    ).toBeVisible();
    await expect(
      page.getByText('React · Pixel Cabinet UI bundle')
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Block Drop' })).toHaveCount(0);
  });

  test.describe('inside an org', () => {
    // What the platform injects when it serves the cabinet from *.salesforce.app.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        (globalThis as { SFDC_ENV?: unknown }).SFDC_ENV = {
          basePath: '/app/c__pixelCabinet',
          appName: 'pixelCabinet',
        };
      });
    });

    test('the marquee bar leads back to the hub lobby', async ({ page }) => {
      await page.goto('/app/c__pixelCabinet/play/block-drop');
      await expect(
        page.getByRole('button', { name: 'Press start' })
      ).toBeVisible();
      await expect(page.getByRole('link', { name: '← Lobby' })).toHaveAttribute(
        'href',
        '/app/c__polyglotArcade'
      );
    });

    test('opening the cabinet itself sends the player to the hub', async ({
      page,
    }) => {
      await page.goto('/app/c__pixelCabinet');
      await expect(page).toHaveURL(/\/app\/c__polyglotArcade$/);
    });
  });

  test('a Block Drop round can be played to the end', async ({ page }) => {
    await page.goto('/play/block-drop');
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByText('Score').first()).toBeVisible();
    for (let i = 0; i < 60; i++) await page.keyboard.press(' ');
    // The result screen shows on the handheld's LCD.
    const lcd = page.locator('.bd-overlay');
    await expect(lcd.getByText('Game over')).toBeVisible();
    await expect(lcd.locator('.round-result')).toContainText('points');
    await lcd.getByRole('button', { name: 'Play again' }).click();
    await expect(
      page.getByRole('button', { name: 'Press start' })
    ).toBeVisible();
  });

  test('the handheld buttons play Block Drop without a keyboard', async ({
    page,
  }) => {
    await page.goto('/play/block-drop');
    await page.getByRole('button', { name: 'Start or pause' }).click();
    const score = page.locator('[data-hud="score"] .bd-seg-on');
    await page.getByRole('button', { name: 'Rotate' }).click();
    await page.getByRole('button', { name: 'Move left' }).click();
    await page.getByRole('button', { name: 'Hard drop' }).click();
    // A hard drop scores two points per row the piece falls.
    await expect(score).not.toHaveText('0');
    await page.getByRole('button', { name: 'Start or pause' }).click();
    await expect(page.getByText('Paused')).toBeVisible();
  });

  test('a Pellet Chase round starts, pauses and resumes', async ({ page }) => {
    await page.goto('/play/pellet-chase');
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('ArrowUp');
    const score = page.locator('[data-hud="score"]');
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
    await expect(
      page.getByRole('button', { name: '← All games' })
    ).toBeVisible();
    // The slim tag names the bundle that runs inside the Lightning frame.
    await expect(
      page.getByText('React · Pixel Cabinet UI bundle')
    ).toBeVisible();
  });

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
