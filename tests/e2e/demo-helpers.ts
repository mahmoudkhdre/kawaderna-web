import { expect, type Page } from '@playwright/test';

export const SNAPSHOT_KEY = 'kawaderna.demo.snapshot.v1';

// Playwright supplies a fresh browser context per test. Clear only at explicit test start,
// never through an init script that would also clear persistence on reload/navigation.
export async function freshDemo(page: Page) {
  await page.goto('/demo');
  await page.evaluate(key => sessionStorage.removeItem(key), SNAPSHOT_KEY);
  await page.reload();
  await expect(page.locator('[data-demo-login]')).toBeVisible();
}

export async function login(page: Page, persona: 'employee' | 'manager' | 'hr') {
  await page.locator(`[data-quick-fill="${persona}-demo"]`).click();
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('[data-demo-shell]')).toBeVisible();
}

export async function sessionAction(page: Page, action: 'logout' | 'reset') {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  if (mobile) await page.locator('[data-account-menu-trigger]').click();
  await page.locator(`[data-demo-header="${mobile ? 'mobile' : 'desktop'}"] [data-action="${action}"]`).click();
}

export async function escalate(page: Page) {
  const layout = (page.viewportSize()?.width ?? 1440) < 768 ? 'cards' : 'table';
  const row = page.locator(`[data-layout="${layout}"] [data-request-id="LV-2026-102"]`);
  await expect(row.locator('[data-action="reject"]')).toBeVisible();
  await row.locator('[data-open-detail]').click();
  await expect(page.locator('[data-detail] [data-action="reject"]')).toHaveCount(0);
  await page.locator('[data-detail] [data-action="approve"]').click();
  await expect(page.locator('[data-detail]')).toContainText('تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
  await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
}

export async function freshManager(page: Page) {
  await freshDemo(page);
  await login(page, 'manager');
}

export async function freshHrReview(page: Page) {
  await freshManager(page);
  await escalate(page);
  await sessionAction(page, 'logout');
  await login(page, 'hr');
  await expect(page.locator('main')).toContainText('LV-2026-102');
}

export async function snapshot(page: Page) {
  return page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!), SNAPSHOT_KEY);
}
