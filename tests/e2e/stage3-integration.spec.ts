import { expect, test } from '@playwright/test';
import { login, sessionAction } from './demo-helpers';

for (const width of [320, 360, 375, 390, 430, 1440]) {
  test(`unified entry, return and font independence at ${width}`, async ({ page }, testInfo) => {
    const externalFonts: string[] = [];
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => {
      externalFonts.push(route.request().url());
      return route.abort();
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-landing-page]')).toBeVisible();
    for (const link of await page.locator('[data-demo-cta]').all()) await expect(link).toHaveAttribute('href', '/demo');
    await page.locator('[data-demo-cta="hero"]').click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    await page.goBack();
    await expect(page.locator('[data-landing-page]')).toBeVisible();
    await page.goto('/demo');
    await login(page, 'employee');
    await page.reload();
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px Tajawal'))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`demo-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('link', { name: 'العودة إلى العرض التعريفي' }).click();
    await expect(page.locator('[data-landing-page]')).toBeVisible();
    await page.locator('[data-demo-cta="hero"]').click();
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
    await sessionAction(page, 'logout');
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    expect(externalFonts).toEqual([]);
  });
}

test('new tab entry, unknown path and visitor isolation', async ({ browser, page, baseURL }) => {
  await page.goto('/demo');
  await login(page, 'manager');
  await page.getByRole('link', { name: 'العودة إلى العرض التعريفي' }).click();
  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    page.locator('[data-demo-cta="hero"]').click({ modifiers: ['Control'] }),
  ]);
  await expect(popup).toHaveURL(/\/demo$/);
  // Native new-tab navigation has its own sessionStorage; never promise cross-tab login.
  await expect(popup.locator('[data-demo-login]')).toBeVisible();
  await popup.close();
  await page.goto('/demo');
  await expect(page.locator('[data-demo-shell]')).toBeVisible();
  const visitor = await browser.newContext();
  const other = await visitor.newPage();
  await other.goto(new URL('/demo', baseURL).href);
  await expect(other.locator('[data-demo-login]')).toBeVisible();
  await other.goto(new URL('/unknown', baseURL).href);
  await expect(other.locator('[data-landing-page]')).toBeVisible();
  await visitor.close();
});
