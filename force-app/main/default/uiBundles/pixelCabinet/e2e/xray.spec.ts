import { expect, test } from '@playwright/test';

test('the badge explains the cabinet as pattern 2', async ({ page }) => {
  await page.goto('/play/block-drop');
  const badge = page.getByRole('button', { name: /Pixel Cabinet UI bundle/ });
  await expect(badge).toHaveAttribute('aria-expanded', 'false');
  await badge.click();
  const panel = page.getByRole('region', { name: 'Native React UI bundle' });
  await expect(panel).toContainText('Pattern 2');
  await expect(panel).toContainText('Data SDK GraphQL');
  await expect(panel.getByRole('link', { name: /README/ })).toHaveAttribute(
    'href',
    /#integration-patterns$/
  );
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();
  await expect(badge).toBeFocused();
});
