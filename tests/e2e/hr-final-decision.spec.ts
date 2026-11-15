import { expect, test } from '@playwright/test';
import { freshHrReview } from './demo-helpers';

for (const width of [320, 360, 375, 390, 430, 1440]) {
  test(`HR review fits RTL viewport ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await freshHrReview(page);
    await expect(page.getByRole('heading', { name: 'قرار الموارد البشرية النهائي' })).toBeVisible();
    await expect(page.getByText('سجل التحويل')).toBeVisible();
    expect(await page.locator('html').getAttribute('dir')).not.toBe('ltr');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test('HR approves an escalated request without a reason', async ({ page }) => {
  await freshHrReview(page);
  await page.getByRole('button', { name: 'موافقة نهائية' }).click();
  await page.getByRole('button', { name: 'تأكيد القرار' }).click();
  await expect(page.getByRole('heading', { name: 'تمت الموافقة النهائية' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'تأكيد القرار' })).toHaveCount(0);
});

test('HR rejects with a free-text reason and checks 500/501 code points', async ({ page }) => {
  await freshHrReview(page);
  await page.getByRole('button', { name: 'رفض الطلب' }).click();
  const reason = page.getByLabel('سبب الرفض للموظف');
  const confirm = page.getByRole('button', { name: 'تأكيد القرار' });
  await expect(confirm).toBeDisabled();
  await reason.fill('😀'.repeat(501));
  await expect(confirm).toBeDisabled();
  await reason.fill('😀'.repeat(500));
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole('heading', { name: 'تم الرفض النهائي' })).toBeVisible();
});

test('HR decision controls work with keyboard and announce validation', async ({ page }) => {
  await freshHrReview(page);
  const reject = page.getByRole('button', { name: 'رفض الطلب' });
  await reject.focus();
  await page.keyboard.press('Enter');
  const reason = page.getByLabel('سبب الرفض للموظف');
  await reason.focus();
  await page.keyboard.type('سبب واضح');
  await expect(page.getByRole('button', { name: 'تأكيد القرار' })).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'تأكيد القرار' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main').getByRole('status').last()).toContainText('تم الرفض النهائي');
});
