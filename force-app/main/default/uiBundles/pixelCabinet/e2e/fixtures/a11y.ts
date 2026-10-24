import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.1 A and AA, the baseline every surface of the arcade keeps. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG)
    .analyze();
  const report = violations.map(
    v =>
      `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(', ')}`
  );
  expect(report).toEqual([]);
}

/** True when the page fits the viewport without scrolling sideways. */
export async function fitsWidth(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth
  );
}
