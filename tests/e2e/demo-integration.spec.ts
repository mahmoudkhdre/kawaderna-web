import { expect, test, type Page } from '@playwright/test';
import { DEMO_COPY } from '../../src/demo/copy';
import { DEMO_ACCOUNTS } from '../../src/demo/session';
import { loadDemoSnapshot } from '../../src/demo/snapshot';
import { escalate, freshDemo, freshManager, login, sessionAction, snapshot, SNAPSHOT_KEY } from './demo-helpers';

const subject = (data: Awaited<ReturnType<typeof snapshot>>) => data.requests.find((r: { requestId: string }) => r.requestId === 'LV-2026-102');
const finalHeading = (decision: 'approve' | 'reject') => decision === 'approve' ? 'تمت الموافقة النهائية' : 'تم الرفض النهائي';
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

test('logged-out entry, Arabic quick-fill, invalid credentials and actor IDs', async ({ page }) => {
  await freshDemo(page);
  await expect(page.locator('[data-demo-shell], [data-request-id]')).toHaveCount(0);
  await expect(page.locator('[data-demo-disclosure]')).toHaveText(DEMO_COPY.disclosure);
  await expect(page.getByLabel('معرّف المستخدم', { exact: true })).toBeVisible();
  for (const [id, password] of [['manager-demo', 'wrong'], ['MGR-2001', 'Demo2026!'], ['HR-1', 'Demo2026!'], ['EMP-1201', 'Demo2026!'], ['unknown', 'Demo2026!']]) {
    await page.locator('#kd-login-id').fill(id);
    await page.locator('#kd-login-password').fill(password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByRole('alert')).toHaveText(DEMO_COPY.invalidLogin);
    await expect(page.locator('#kd-login-password')).toHaveValue('');
    await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
    expect(await page.evaluate(key => sessionStorage.getItem(key), SNAPSHOT_KEY)).toBeNull();
  }
  for (const account of DEMO_ACCOUNTS) {
    await page.locator(`[data-quick-fill="${account.loginId}"]`).click();
    await expect(page.locator('#kd-login-id')).toHaveValue(account.loginId);
    await expect(page.locator('#kd-login-password')).toHaveValue('Demo2026!');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('[data-demo-header="desktop"]')).toContainText(account.displayIdentity);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(account.persona === 'manager' ? 'طلبات الإجازات' : account.persona === 'hr' ? 'قرار الموارد البشرية النهائي' : 'طلبات إجازتي');
    expect((await snapshot(page)).session).toEqual({ persona: account.persona, loginId: account.loginId });
    expect(await page.evaluate(() => JSON.stringify({ session: Object.values(sessionStorage), local: Object.values(localStorage) }))).not.toContain('Demo2026!');
    await sessionAction(page, 'logout');
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    await expect(page.locator('#kd-login-password')).toHaveValue('');
  }
  await page.reload();
  await expect(page.locator('[data-demo-login]')).toBeVisible();
});

for (const width of [1440, 375]) {
  for (const decision of ['approve', 'reject'] as const) {
    test(`same Manager → HR request, ${decision}, reload and confirmed reset at ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await freshDemo(page);
      await login(page, 'hr');
      await expect(page.getByText(DEMO_COPY.hrEmpty, { exact: true })).toBeVisible();
      await expect(page.locator('main button')).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText('LV-2026-106');
      await sessionAction(page, 'logout');
      await login(page, 'manager');
      const baseline = await snapshot(page);
      await escalate(page);
      const escalated = await snapshot(page);
      const before = subject(baseline);
      const after = subject(escalated);
      expect(after.version).toBe(before.version);
      expect(after.approvalStatus).toBe('pending');
      expect(after.approvalStage).toBe('hr');
      expect(after.auditHistory.slice(0, before.auditHistory.length)).toEqual(before.auditHistory);
      expect(after.auditHistory).toHaveLength(before.auditHistory.length + 1);
      expect(after.auditHistory.at(-1)).toMatchObject({ eventType: 'escalation', actor: 'MGR-2001', actorRole: 'manager', timestamp: '2026-01-18T07:00:00.000Z' });
      await page.reload();
      await expect(page.locator('[data-demo-shell]')).toBeVisible();
      expect((await snapshot(page)).requests).toEqual(escalated.requests);
      await sessionAction(page, 'logout');
      expect((await snapshot(page)).requests).toEqual(escalated.requests);
      await page.reload();
      await expect(page.locator('[data-demo-login]')).toBeVisible();
      await login(page, 'hr');
      await expect(page.locator('main')).toContainText('LV-2026-102');
      await expect(page.locator('main')).toContainText('MGR-2001');
      await expect(page.locator('main')).not.toContainText('LV-2026-001');
      await expect(page.getByText('سجل التحويل', { exact: true })).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`hr-review-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: decision === 'approve' ? 'موافقة نهائية' : 'رفض الطلب', exact: true }).click();
      const confirm = page.getByRole('button', { name: 'تأكيد القرار', exact: true });
      const reason = 'تعذّر توفير التغطية خلال الفترة المطلوبة 😀';
      if (decision === 'reject') {
        await expect(confirm).toBeDisabled();
        await page.getByLabel('سبب الرفض للموظف').fill('   ');
        await expect(confirm).toBeDisabled();
        await page.getByLabel('سبب الرفض للموظف').fill(reason);
      }
      await confirm.dblclick();
      await expect(page.getByRole('heading', { name: finalHeading(decision), exact: true })).toBeVisible();
      await expect(page.locator('main button')).toHaveCount(0);
      if (decision === 'reject') await expect(page.locator('main')).toContainText(reason);
      const decided = await snapshot(page);
      const final = subject(decided);
      expect(final.version).toBe(before.version);
      expect(final.auditHistory).toHaveLength(after.auditHistory.length + 1);
      expect(final.auditHistory.at(-1)).toMatchObject({ eventType: 'decision', actor: 'HR-1', actorRole: 'hr', timestamp: '2026-01-18T07:00:00.000Z' });
      const decoded = loadDemoSnapshot({ getItem: () => JSON.stringify(decided), setItem: () => {}, removeItem: () => {} });
      expect(decoded.source).toBe('snapshot');
      const restored = decoded.state.requests.find(r => r.requestId === 'LV-2026-102')!;
      expect(restored.auditHistory.at(-1)!.timestamp).toBeInstanceOf(Date);
      expect(restored.approvalPath.find(step => step.ownerRole === 'hr')!.decidedAt).toBeInstanceOf(Date);
      await page.reload();
      await expect(page.getByRole('heading', { name: finalHeading(decision), exact: true })).toBeVisible();
      await expect(page.locator('main button')).toHaveCount(0);
      expect((await snapshot(page)).requests).toEqual(decided.requests);
      await sessionAction(page, 'reset');
      await expect(page.getByRole('alertdialog')).toContainText(DEMO_COPY.resetDescription);
      await expect(page.getByRole('button', { name: DEMO_COPY.resetCancel, exact: true })).toBeFocused();
      await page.getByRole('button', { name: DEMO_COPY.resetCancel, exact: true }).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      expect(await snapshot(page)).toEqual(decided);
      const focusReturned = await page.locator(width < 768 ? '[data-account-menu-trigger]' : '[data-demo-header="desktop"] [data-action="reset"]')
        .evaluate(el => el === document.activeElement);
      await sessionAction(page, 'reset');
      await page.getByRole('button', { name: DEMO_COPY.resetConfirm, exact: true }).click();
      await expect(page.locator('[data-demo-login]')).toBeVisible();
      expect((await snapshot(page)).session).toBeNull();
      expect((await snapshot(page)).requests).toEqual(baseline.requests);
      await page.reload();
      await expect(page.locator('[data-demo-login]')).toBeVisible();
      await login(page, 'hr');
      await expect(page.getByText(DEMO_COPY.hrEmpty, { exact: true })).toBeVisible();
      // Assert after completing the remaining journey so the known presentation defect
      // cannot hide reset/baseline regressions. It remains a failing acceptance gate.
      expect(focusReturned, 'Reset cancellation returns focus to its surviving trigger').toBe(true);
    });
  }
}

for (const corruption of ['json', 'date', 'persona', 'version', 'empty'] as const) {
  test(`snapshot ${corruption} corruption recovers atomically with dismissible notice`, async ({ page }) => {
    await freshManager(page);
    const baseline = await snapshot(page);
    await escalate(page);
    const broken = await snapshot(page);
    if (corruption === 'date') subject(broken).auditHistory.at(-1).timestamp = 'not-a-date';
    if (corruption === 'persona') broken.session = { persona: 'hr', loginId: 'manager-demo' };
    if (corruption === 'version') broken.schemaVersion = 999;
    if (corruption === 'empty') broken.requests = [];
    await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), { key: SNAPSHOT_KEY, value: corruption === 'json' ? '{broken' : JSON.stringify(broken) });
    await page.reload();
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    await expect(page.locator('[data-recovery-notice]')).toContainText(DEMO_COPY.recovery);
    await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
    await page.locator('[data-recovery-notice]').getByRole('button', { name: 'إغلاق' }).click();
    await expect(page.locator('[data-recovery-notice]')).toHaveCount(0);
    await login(page, 'hr');
    await expect(page.getByText(DEMO_COPY.hrEmpty, { exact: true })).toBeVisible();
    expect((await snapshot(page)).requests).toEqual(baseline.requests);
    await page.reload();
    await expect(page.locator('[data-recovery-notice]')).toHaveCount(0);
  });
}

for (const failure of ['read', 'write'] as const) {
  test(`storage ${failure} failure discloses memory-only mode and preserves live workflow`, async ({ page }) => {
    await page.addInitScript(mode => {
      const method = mode === 'read' ? 'getItem' : 'setItem';
      Storage.prototype[method] = () => { throw new DOMException('Test storage failure', 'SecurityError'); };
    }, failure);
    await page.goto('/demo');
    if (failure === 'read') await expect(page.locator('[data-storage-notice]')).toHaveText(DEMO_COPY.storageUnavailable);
    await login(page, 'manager');
    await expect(page.locator('[data-storage-notice]')).toHaveText(DEMO_COPY.storageUnavailable);
    await escalate(page);
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    await expect(page.locator('main')).toContainText('LV-2026-102');
    await page.getByRole('button', { name: 'موافقة نهائية', exact: true }).click();
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'تمت الموافقة النهائية', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-demo-login]')).toBeVisible();
  });
}

test('desktop shell retains approved navigation and cannot mutate requests through unavailable modules', async ({ page }, testInfo) => {
  await freshManager(page);
  const before = await snapshot(page);
  const url = page.url();
  const sidebar = page.locator('[data-demo-sidebar]');
  expect(await sidebar.locator('button').evaluateAll(els => els.map(el => el.getAttribute('aria-label')))).toEqual(['لوحة التحكم', 'الموظفين', 'الموظفين', 'طلبات الإجازة', 'المهام', 'الرواتب', 'نظام حماية الاجور', 'القروض والسلف', 'التأمين الصحي', 'الصحة المالية', 'الأداء', 'التقارير', 'المساعد الذكي', 'الإعدادات']);
  await expect(sidebar.locator('button[aria-current="page"]')).toHaveAttribute('data-nav-id', 'leave');
  await expect(sidebar.locator('button[aria-disabled="true"]')).toHaveCount(13);
  await expect(sidebar.locator('[data-nav-id="assistant"]')).toHaveAttribute('aria-disabled', 'true');
  await page.clock.install();
  await sidebar.locator('[data-nav-id="assistant"]').focus();
  await page.keyboard.press('Enter');
  const toast = page.locator('[data-demo-toast]');
  await expect(toast).toContainText(DEMO_COPY.unavailableTitle);
  await expect(toast).toContainText(DEMO_COPY.unavailableMessage);
  expect(page.url()).toBe(url);
  expect(await snapshot(page)).toEqual(before);
  await expect(sidebar.locator('[data-nav-id="assistant"]')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'طلبات الإجازات' })).toBeVisible();
  await expect(page.locator('[data-demo-header="desktop"] [data-decorative-bell]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-decorative-bell] button, [data-decorative-bell] [tabindex]')).toHaveCount(0);
  const bell = page.locator('[data-demo-header="desktop"] [data-decorative-bell]');
  expect(await bell.textContent()).toBe('');
  await bell.click();
  expect(await snapshot(page)).toEqual(before);
  const box = (await toast.boundingBox())!;
  expect(box.x).toBeLessThan(100);
  expect(box.y).toBeGreaterThan(500);
  await page.screenshot({ path: testInfo.outputPath('shell-desktop-toast.png'), fullPage: true });
  await page.clock.fastForward(5100);
  await expect(toast).toHaveCount(0);
});

test('collects rendered evidence for the read-only presentation handoff', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await freshDemo(page);
  const loginFontPx = await page.locator('#kd-login-id').evaluate(el => getComputedStyle(el).fontSize);
  await login(page, 'manager');
  const inactiveColor = await page.locator('[data-demo-mobile-nav] [aria-disabled="true"]').first().evaluate(el => getComputedStyle(el).color);
  const rgb = (inactiveColor.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);
  const channels = rgb.map(c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  const contrastOnWhite = 1.05 / (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] + 0.05);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.press('Tab');
  await page.locator('[data-demo-sidebar] [data-nav-id="dashboard"]').focus();
  const tooltip = page.locator('#kd-tip-dashboard');
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  const tooltipVisibleAfterEscape = await tooltip.isVisible();
  const evidence = { loginFontPx, inactiveColor, contrastOnWhite: Number(contrastOnWhite.toFixed(2)), tooltipVisibleAfterEscape };
  await testInfo.attach('presentation-observations.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  console.log('Presentation observations:', JSON.stringify(evidence));
});

for (const width of [320, 360, 375, 390, 430, 1440]) {
  test(`integrated RTL Login, Manager, HR and shell fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await freshDemo(page);
    await noOverflow(page);
    expect(Math.round((await page.locator('.kd-card').boundingBox())!.width)).toBe(Math.min(400, width - 32));
    await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`), fullPage: true });
    await login(page, 'manager');
    await expect(page.locator('[data-demo-shell]')).toHaveAttribute('dir', 'rtl');
    await noOverflow(page);
    if (width < 768) {
      const nav = page.locator('[data-demo-mobile-nav]');
      await expect(nav.locator('button')).toHaveCount(5);
      await expect(nav.locator('[aria-current="page"]')).toHaveText(/الإجازات/);
      await expect(nav.locator('[data-nav-id="assistant"]')).toHaveCount(0);
      const before = await snapshot(page);
      // These buttons intentionally announce unavailable yet accept activation to explain why.
      // Playwright treats aria-disabled as disabled; force only bypasses that actionability gate.
      await nav.locator('[aria-disabled="true"]').first().click({ force: true });
      const toast = page.locator('[data-demo-toast]');
      await expect(toast).toContainText(DEMO_COPY.unavailableMessage);
      const [toastBox, navBox] = await Promise.all([toast.boundingBox(), nav.boundingBox()]);
      expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(navBox!.y - 15);
      expect(await snapshot(page)).toEqual(before);
      await page.screenshot({ path: testInfo.outputPath(`shell-toast-${width}.png`), fullPage: true });
      await toast.getByRole('button', { name: 'إغلاق' }).click();
    }
    await sessionAction(page, 'reset');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: DEMO_COPY.resetConfirm, exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: DEMO_COPY.resetCancel, exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await noOverflow(page);
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    await expect(page.getByText(DEMO_COPY.hrEmpty, { exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`hr-empty-${width}.png`), fullPage: true });
  });
}
