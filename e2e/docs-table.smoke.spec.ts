import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Brickular Docs Table', () => {
  test('renders table examples and supports theme toggle', async ({ page }) => {
    await page.goto('table/examples');
    await expect(page.getByRole('heading', { name: 'Table Examples' })).toBeVisible();
    await expect(page.locator('b-table')).toBeVisible();

    const toggleButton = page.getByRole('button', { name: /theme/i });
    const shell = page.locator('.docs-shell');
    const initialClass = await shell.getAttribute('class');
    await toggleButton.click();
    const nextClass = await shell.getAttribute('class');

    expect(nextClass).not.toBe(initialClass);
  });

  test('keeps header aligned during horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('table/examples');

    const viewport = page.locator('.b-table__viewport');
    await expect(viewport).toBeVisible();

    await expect
      .poll(async () => {
        return viewport.evaluate((element) => element.scrollWidth > element.clientWidth);
      })
      .toBeTruthy();

    await viewport.evaluate((element) => {
      element.scrollLeft = 120;
      element.dispatchEvent(new Event('scroll'));
    });

    const headScrollLeft = await page.locator('.b-table__head-scroller').evaluate((element) => element.scrollLeft);
    expect(headScrollLeft).toBe(120);
  });

  test('has no serious accessibility violations on examples page', async ({ page }) => {
    await page.goto('table/examples');
    const analysis = await new AxeBuilder({ page }).analyze();
    const seriousOrWorse = analysis.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical');

    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
