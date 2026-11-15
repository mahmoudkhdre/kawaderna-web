import { expect, test } from '@playwright/test';
import { freshDemo, login, sessionAction, snapshot } from './demo-helpers';

const request = (data: Awaited<ReturnType<typeof snapshot>>, id: string) =>
  data.requests.find((item: { requestId: string }) => item.requestId === id);

for (const width of [1440, 375]) {
  test(`new Employee request travels through Manager Drawer and HR at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await freshDemo(page);
    await login(page, 'employee');
    await expect(page.getByText('لا توجد طلبات مقدّمة بعد.')).toBeVisible();
    await page.getByLabel('تاريخ البداية').fill('2026-02-02');
    await page.getByLabel('تاريخ النهاية').fill('2026-02-06');
    await page.getByLabel('عدد أيام الإجازة المطلوبة').fill('5');
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
    await expect(page.getByRole('alert')).toContainText('أكّد اطلاعك');
    if (width === 375) await page.screenshot({ path: testInfo.outputPath('employee-warning-error-375.png'), fullPage: true });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
    await expect(page.locator('.employee-request__head')).toContainText('LV-2026-107');
    if (width === 375) {
      await page.locator('.employee-request').scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('employee-history-375.png'), fullPage: true });
    }
    const created = request(await snapshot(page), 'LV-2026-107');
    expect(created).toMatchObject({ version: 1, employeeId: 'EMP-1201', managerId: 'MGR-2001', approvalStatus: 'pending', approvalStage: 'manager' });
    expect(created.auditHistory.map((event: { eventType: string }) => event.eventType)).toEqual(['submission', 'low_balance_acknowledgement']);
    await page.reload();
    await expect(page.locator('.employee-request__head')).toContainText('LV-2026-107');
    await page.screenshot({ path: testInfo.outputPath(`employee-${width}.png`), fullPage: true });
    await sessionAction(page, 'logout');
    await login(page, 'manager');
    const layout = width < 768 ? 'cards' : 'table';
    const row = page.locator(`[data-layout="${layout}"] [data-request-id="LV-2026-107"]`);
    await expect(row).toBeVisible();
    await row.locator('[data-open-detail]').click();
    await expect(page.locator('[data-detail]')).toContainText('LV-2026-107');
    await page.locator('[data-detail] [data-action="approve"]').click();
    await expect(page.locator('[data-detail]')).toContainText('تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
    const escalated = request(await snapshot(page), 'LV-2026-107');
    expect(escalated).toMatchObject({ version: 1, approvalStatus: 'pending', approvalStage: 'hr' });
    expect(escalated.auditHistory).toHaveLength(3);
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    await expect(page.getByLabel('اختر طلبًا للمراجعة')).toHaveValue('LV-2026-107');
    await page.getByRole('button', { name: 'رفض الطلب' }).click();
    await page.getByLabel('سبب الرفض للموظف').fill('تعذّر توفير التغطية في الفترة المطلوبة');
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'تم الرفض النهائي' })).toBeVisible();
    const decided = request(await snapshot(page), 'LV-2026-107');
    expect(decided.auditHistory).toHaveLength(4);
    expect(decided.version).toBe(1);
    await sessionAction(page, 'logout');
    await login(page, 'employee');
    await expect(page.locator('.employee-reason')).toContainText('تعذّر توفير التغطية في الفترة المطلوبة');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`employee-decided-${width}.png`), fullPage: true });
    await sessionAction(page, 'reset');
    await page.getByRole('button', { name: 'إعادة الضبط', exact: true }).click();
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    expect(request(await snapshot(page), 'LV-2026-107')).toBeUndefined();
  });
}

test('HR explicitly selects one of two new requests', async ({ page }) => {
  await freshDemo(page);
  await login(page, 'employee');
  for (const [start, end] of [['2026-02-02', '2026-02-06'], ['2026-02-09', '2026-02-13']]) {
    await page.getByLabel('تاريخ البداية').fill(start);
    await page.getByLabel('تاريخ النهاية').fill(end);
    await page.getByLabel('عدد أيام الإجازة المطلوبة').fill('5');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
  }
  await sessionAction(page, 'logout');
  await login(page, 'manager');
  for (const requestId of ['LV-2026-107', 'LV-2026-108']) {
    await page.locator(`[data-layout="table"] [data-request-id="${requestId}"] [data-open-detail]`).click();
    await page.locator('[data-detail] [data-action="approve"]').click();
    await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
  }
  await sessionAction(page, 'logout');
  await login(page, 'hr');
  await expect(page.getByLabel('اختر طلبًا للمراجعة').locator('option')).toHaveCount(2);
  await page.getByLabel('اختر طلبًا للمراجعة').selectOption('LV-2026-108');
  await expect(page.locator('main')).toContainText('LV-2026-108');
  await page.getByRole('button', { name: 'موافقة نهائية' }).click();
  await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
  expect(request(await snapshot(page), 'LV-2026-108').approvalStatus).toBe('approved');
  expect(request(await snapshot(page), 'LV-2026-107').approvalStatus).toBe('pending');
});

for (const width of [320, 360, 390, 430]) {
  test(`Employee form and request history fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await freshDemo(page);
    await login(page, 'employee');
    await expect(page.getByRole('heading', { name: 'طلبات إجازتي' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByLabel('تاريخ البداية').fill('2026-02-02');
    await page.getByLabel('تاريخ النهاية').fill('2026-02-06');
    await page.getByLabel('عدد أيام الإجازة المطلوبة').fill('5');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'إرسال الطلب' }).click();
    await expect(page.locator('.employee-request')).toBeVisible();
    const submit = page.getByRole('button', { name: 'إرسال الطلب' });
    await submit.focus();
    await expect(submit).toBeFocused();
    const buttonBox = await submit.boundingBox();
    const navBox = await page.locator('[data-demo-mobile-nav]').boundingBox();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
