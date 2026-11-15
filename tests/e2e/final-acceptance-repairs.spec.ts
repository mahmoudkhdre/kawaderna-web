import { expect, test } from '@playwright/test';
import { escalate, freshDemo, freshManager, login, sessionAction } from './demo-helpers';

// Regression cover for defects found in the final demo acceptance review (2026-11-12).

for (const width of [1440, 375]) {
  test(`Manager detail drawer contains keyboard focus at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    const layout = width < 768 ? 'cards' : 'table';
    await page.locator(`[data-layout="${layout}"] [data-request-id="LV-2026-102"] [data-open-detail]`).click();
    const drawer = page.locator('[data-detail]');
    await expect(page.getByRole('button', { name: 'إغلاق التفاصيل' })).toBeFocused();
    const inside = () => page.evaluate(() => !!document.activeElement?.closest('[data-detail]'));
    await page.keyboard.press('Shift+Tab');
    expect(await inside()).toBe(true);
    await expect(drawer.locator('[data-action="approve"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'إغلاق التفاصيل' })).toBeFocused();
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); expect(await inside()).toBe(true); }
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(page.locator(`[data-layout="${layout}"] [data-request-id="LV-2026-102"] [data-open-detail]`)).toBeFocused();
  });

  test(`closing the drawer after approval returns focus to the Inbox heading at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    const layout = width < 768 ? 'cards' : 'table';
    // The row action that opened the drawer disappears once the request is decided.
    await page.locator(`[data-layout="${layout}"] [data-request-id="LV-2026-101"] [data-action="review-approve"]`).click();
    await page.locator('[data-detail] [data-action="approve"]').click();
    await expect(page.locator('[data-approval-result="success"]')).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-detail]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-detail]')).toHaveCount(0);
    await expect(page.locator('main h1')).toBeFocused();
  });
}

for (const width of [1440, 375]) {
  test(`a long unbroken HR reason wraps and keeps its line breaks at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    await escalate(page);
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    const reason = `${'س'.repeat(480)}\nسطر ثانٍ`;
    await page.getByRole('button', { name: 'رفض الطلب' }).click();
    await page.locator('#hr-reason').fill(reason);
    await page.getByRole('button', { name: 'تأكيد القرار' }).click();
    // The confirming control is gone: focus continues from the recorded outcome, not the page start.
    await expect(page.getByRole('heading', { name: 'تم الرفض النهائي' })).toBeFocused();
    const shown = page.getByText('سبب الرفض:');
    await expect(shown).toHaveText(`سبب الرفض: ${reason}`);
    await expect(shown).toHaveCSS('white-space', 'pre-wrap');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const box = await shown.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });
}

test('the return link adds no page scroll to the desktop shell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshDemo(page);
  await login(page, 'employee');
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBe(0);
  await expect(page.getByRole('link', { name: 'العودة إلى العرض التعريفي' })).toBeInViewport();
});

test('submitted requests do not make the mobile page scroll behind the fixed navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await freshDemo(page);
  await login(page, 'employee');
  for (const [start, end, days] of [['2026-03-01', '2026-03-02', '2'], ['2026-04-05', '2026-04-05', '1']]) {
    await page.getByLabel('تاريخ البداية').fill(start);
    await page.getByLabel('تاريخ النهاية').fill(end);
    await page.getByLabel('عدد أيام الإجازة المطلوبة').fill(days);
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
  }
  await expect(page.locator('.employee-request')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBe(0);
});

test('a multi-line Manager rejection reason is shown to the Employee as written', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshDemo(page);
  await login(page, 'employee');
  await page.getByLabel('تاريخ البداية').fill('2026-03-01');
  await page.getByLabel('تاريخ النهاية').fill('2026-03-02');
  await page.getByLabel('عدد أيام الإجازة المطلوبة').fill('2');
  await page.getByRole('button', { name: 'إرسال الطلب' }).click();
  await expect(page.locator('.employee-request__head')).toContainText('LV-2026-107');
  await sessionAction(page, 'logout');
  await login(page, 'manager');
  await page.locator('[data-layout="table"] [data-request-id="LV-2026-107"] [data-action="reject"]').click();
  await page.locator('input[name="rejection-category"][value="other"]').check();
  const details = 'السطر الأول\nالسطر الثاني';
  await page.locator('#reject-details').fill(details);
  await page.locator('[data-action="confirm-reject"]').click();
  await expect(page.locator('[data-reject-modal]')).toHaveCount(0);
  await sessionAction(page, 'logout');
  await login(page, 'employee');
  const reason = page.locator('.employee-reason');
  await expect(reason).toHaveText(`سبب الرفض: أخرى: ${details}`);
  await expect(reason).toHaveCSS('white-space', 'pre-wrap');
});
