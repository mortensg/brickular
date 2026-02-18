import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Brickular Docs Table', () => {
  test('renders table examples and supports theme toggle', async ({ page }) => {
    await page.goto('table/examples');
    await expect(page.getByRole('heading', { name: 'Table Examples' })).toBeVisible();
    await expect(page.locator('b-table')).toBeVisible();

    const toggleButton = page.getByRole('button', { name: /theme/i });
    const shell = page.locator('.docs-shell');
    const initialDarkMode = await shell.evaluate((element) => element.classList.contains('brickular-theme-dark'));

    await toggleButton.click({ force: true });

    await expect
      .poll(async () => {
        return shell.evaluate((element) => element.classList.contains('brickular-theme-dark'));
      })
      .toBe(!initialDarkMode);
  });

  test('keeps header aligned during horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('table/examples');

    const hScrollbar = page.locator('.b-table__scrollbar-h');
    await expect(hScrollbar).toBeVisible();

    await expect
      .poll(async () => {
        return hScrollbar.evaluate((element) => element.scrollWidth > element.clientWidth);
      })
      .toBeTruthy();

    await hScrollbar.evaluate((element) => {
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
