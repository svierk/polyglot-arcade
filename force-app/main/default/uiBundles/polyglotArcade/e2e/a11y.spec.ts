import { expect, test } from '@playwright/test';
import { expectAccessible } from './fixtures/a11y';
import { mockOrg } from './fixtures/org';

// axe checks every page of the hub against WCAG 2.1 AA, in the states a
// player sees: the lobby with and without the Tech X-ray, the machines before
// and during a round (app.spec.ts checks the result screen).
test.describe('Accessibility of the hub', () => {
  test.beforeEach(async ({ page }) => {
    await mockOrg(page);
  });

  test('lobby, with and without the Tech X-ray', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Block Drop' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Tech X-ray' }).click();
    await page.getByRole('button', { name: /Polyglot Arcade hub/ }).click();
    await expect(page.getByRole('heading', { name: 'Native Angular UI bundle' })).toBeVisible();
    await expectAccessible(page);
  });

  test('hall of fame', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('tab', { name: 'Block Drop' })).toBeVisible();
    await expectAccessible(page);
  });

  test('Four in a Row, before and during a round', async ({ page }) => {
    await page.goto('/play/four-in-a-row');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'easy' }).click();
    await page.getByRole('button', { name: /column 4/ }).click();
    await expect(page.getByText('Your move')).toBeVisible();
    await expectAccessible(page);
  });

  test('Brick Breaker, ready and paused', async ({ page }) => {
    await page.goto('/play/brick-breaker');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Press start' }).click();
    await page.keyboard.press('p');
    await expect(page.getByText('Paused')).toBeVisible();
    await expectAccessible(page);
  });

  test('the hall of fame tabs follow the arrow keys', async ({ page }) => {
    await page.goto('/leaderboard');
    const first = page.getByRole('tab', { name: 'Block Drop' });
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Pellet Chase' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Pellet Chase' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Snake' })).toBeFocused();
  });

  test('a Four in a Row column tells what is in it', async ({ page }) => {
    await page.goto('/play/four-in-a-row');
    await page.getByRole('button', { name: 'easy' }).click();
    await page.getByRole('button', { name: /column 4/ }).click();
    await expect(page.getByText('Your move')).toBeVisible();
    await expect(page.getByRole('button', { name: /column 4/ })).toHaveAccessibleName(
      /yours(, CPU)? from the bottom, [45] free/,
    );
  });
});
