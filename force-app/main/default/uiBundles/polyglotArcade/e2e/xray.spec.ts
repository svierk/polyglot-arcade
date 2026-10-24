import { expect, test } from '@playwright/test';
import { mockOrg } from './fixtures/org';

test.describe('Tech X-ray', () => {
  test.beforeEach(async ({ page }) => {
    await mockOrg(page);
  });

  test('shows how every game is built and stays on', async ({ page }) => {
    await page.goto('/');
    const card = (name: string) => page.locator('article').filter({ hasText: name });
    await expect(card('Block Drop')).toBeVisible();
    await expect(page.locator('.lobby-xray')).toHaveCount(0);

    const toggle = page.getByRole('button', { name: 'Tech X-ray' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(card('Four in a Row')).toContainText('1 Native Angular UI bundle');
    await expect(card('Pellet Chase')).toContainText('3 Internally hosted microfrontend');
    await expect(card('Snake')).toContainText('4 Externally hosted microfrontend');

    // Remembered on the way to a machine and back.
    await page.getByRole('link', { name: 'Play', exact: true }).first().click();
    await page.getByRole('link', { name: '← Lobby' }).click();
    await expect(page.locator('.lobby-xray')).toHaveCount(5);
  });

  test('the badge explains the surface on every page', async ({ page }) => {
    await page.goto('/play/brick-breaker');
    const badge = page.getByRole('button', { name: /Polyglot Arcade hub/ });
    await badge.click();
    await expect(badge).toHaveAttribute('aria-expanded', 'true');
    const panel = page.getByRole('region', { name: 'Native Angular UI bundle' });
    await expect(panel).toContainText('Data SDK GraphQL');
    await expect(panel.getByRole('link', { name: /README/ })).toHaveAttribute(
      'href',
      /#integration-patterns$/,
    );
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(badge).toBeFocused();
  });
});
