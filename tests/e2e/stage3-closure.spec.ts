import { expect, test } from '@playwright/test';
import { login, sessionAction, snapshot } from './demo-helpers';

test('mounted Landing preserves the initial skip link keyboard entry', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'تخطَّ إلى المحتوى' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

for (const width of [320, 360, 375, 390, 430]) {
  test(`return link and mobile shell share the viewport at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demo');
    await login(page, 'employee');
    await page.evaluate(() => window.scrollTo(0, 0));
    const content = await page.locator('.kd-shell__content').boundingBox();
    const nav = await page.locator('[data-demo-mobile-nav]').boundingBox();
    expect(content!.y + content!.height).toBeLessThanOrEqual(nav!.y);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(900);
    await page.getByLabel('تاريخ البداية').fill('2026-02-02');
    await page.getByLabel('تاريخ النهاية').fill('2026-02-06');
    await page.getByLabel('عدد أيام الإجازة المطلوبة').fill('5');
    const submit = page.getByRole('button', { name: 'إرسال الطلب' });
    await submit.click();
    await expect(page.locator('#employee-ack-error')).toContainText('أكّد اطلاعك'); // O-3: the message is under its field
    await expect(page.getByRole('alert')).toContainText('لم يُرسل الطلب');
    await submit.focus();
    const button = await submit.boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
  });
}

for (const width of [375, 1440]) {
  for (const storage of ['available', 'blocked'] as const) {
    test(`Landing round trip retains a submitted request with storage ${storage} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      if (storage === 'blocked') await page.addInitScript(() => {
        Storage.prototype.setItem = () => { throw new DOMException('Blocked storage', 'SecurityError'); };
      });
      await page.goto('/demo');
      await login(page, 'employee');
      await page.getByLabel('تاريخ البداية').fill('2026-02-02');
      await page.getByLabel('تاريخ النهاية').fill('2026-02-06');
      await page.getByLabel('عدد أيام الإجازة المطلوبة').fill('2');
      await page.getByRole('button', { name: 'إرسال الطلب' }).click();
      await expect(page.locator('.employee-request__head')).toContainText('LV-2026-107');
      const before = storage === 'available' ? await snapshot(page) : null;
      await page.getByRole('link', { name: 'العودة إلى العرض التعريفي' }).click();
      await expect(page.locator('[data-landing-page]')).toBeVisible();
      await expect(page.locator('main')).toBeFocused();
      await page.goBack();
      await expect(page.locator('.employee-request__head')).toContainText('LV-2026-107');
      await page.goForward();
      await expect(page.locator('[data-landing-page]')).toBeVisible();
      await page.locator('[data-demo-cta="final"]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-demo-shell]')).toBeVisible();
      await expect(page.locator('main')).toBeFocused();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.locator('.employee-request__head')).toContainText('LV-2026-107');
      if (before) expect(await snapshot(page)).toEqual(before);
      else await expect(page.locator('[data-storage-notice]')).toBeVisible();
      await sessionAction(page, 'logout');
      await login(page, 'manager');
      const layout = width < 768 ? 'cards' : 'table';
      await expect(page.locator(`[data-layout="${layout}"] [data-request-id="LV-2026-107"]`)).toBeVisible();
      await page.reload();
      if (storage === 'available') await expect(page.locator('[data-demo-shell]')).toBeVisible();
      else await expect(page.locator('[data-demo-login]')).toBeVisible();
    });
  }
}

for (const placement of ['nav', 'mobile-menu', 'hero', 'journey', 'final']) {
  test(`mounted ${placement} CTA opens the demo and restores history`, async ({ page }) => {
    // The secondary demo link joins the desktop nav only from 1600px (Commercial V1: the purchase inquiry is the sole nav action below that).
    await page.setViewportSize({ width: placement === 'mobile-menu' ? 375 : placement === 'nav' ? 1600 : 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    if (placement === 'mobile-menu') await page.getByRole('button', { name: 'فتح القائمة' }).click();
    const link = page.locator(`[data-demo-cta="${placement}"]`);
    await expect(link).toHaveAttribute('href', '/demo');
    await link.click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    await page.goBack();
    await expect(page.locator('[data-landing-page]')).toBeVisible();
    await page.goForward();
    await expect(page.locator('[data-demo-login]')).toBeVisible();
  });
}
