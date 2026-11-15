import { expect, test } from '@playwright/test';
import { DEMO_COPY } from '../../src/demo/copy';
import { freshManager, sessionAction, snapshot } from './demo-helpers';

for (const width of [375, 1440]) {
  test(`Approve launches review without committing at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await freshManager(page);
    const layout = page.locator(`[data-layout="${width < 768 ? 'cards' : 'table'}"]`);
    const before = await snapshot(page);
    for (const id of ['101', '102', '103', '104']) {
      const row = layout.locator(`[data-request-id="LV-2026-${id}"]`);
      const launcher = row.locator('[data-action="review-approve"]');
      await expect(launcher).toHaveText('موافقة');
      await expect(row.locator('[data-action="reject"]')).toBeVisible();
      await launcher.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-detail]')).toBeVisible();
      await expect(page.locator('[data-detail] [data-action="approve"]')).toBeVisible();
      await expect(page.locator('[data-detail] [data-action="reject"]')).toHaveCount(0);
      expect(await snapshot(page)).toEqual(before);
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-detail]')).toHaveCount(0);
      await expect(launcher).toBeFocused();
    }
    for (const id of ['105', '106']) {
      const row = layout.locator(`[data-request-id="LV-2026-${id}"]`);
      await expect(row.locator('[data-action="review-approve"], [data-action="reject"]')).toHaveCount(0);
    }
    const low = layout.locator('[data-request-id="LV-2026-102"]');
    await low.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`approve-launcher-${width}.png`), fullPage: true });
    await low.locator('[data-action="review-approve"]').click();
    await page.screenshot({ path: testInfo.outputPath(`approve-drawer-${width}.png`), fullPage: true });
    await page.locator('[data-detail] [data-action="approve"]').click();
    await expect(page.locator('[data-detail]')).toContainText('تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    const after = await snapshot(page);
    const original = before.requests.find((r: { requestId: string }) => r.requestId === 'LV-2026-102');
    const changed = after.requests.find((r: { requestId: string }) => r.requestId === 'LV-2026-102');
    expect(changed).toMatchObject({ approvalStatus: 'pending', approvalStage: 'hr', version: original.version });
    expect(changed.auditHistory).toHaveLength(original.auditHistory.length + 1);
    await page.keyboard.press('Escape');
    await expect(low.locator('[data-action="review-approve"], [data-action="reject"]')).toHaveCount(0);
  });
}

test('375px Reset cancel paths restore the surviving avatar and keyboard menu behavior', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await freshManager(page);
  const before = await snapshot(page);
  const trigger = page.locator('[data-account-menu-trigger]');
  for (const cancel of ['button', 'escape', 'backdrop']) await test.step(cancel, async () => {
    await sessionAction(page, 'reset');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByRole('button', { name: DEMO_COPY.resetCancel, exact: true })).toBeFocused();
    if (cancel === 'button') await page.getByRole('button', { name: DEMO_COPY.resetCancel, exact: true }).click();
    else if (cancel === 'escape') await page.keyboard.press('Escape');
    else await page.locator('[data-reset-backdrop]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(await snapshot(page)).toEqual(before);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  });
});

test('Reset cancellation falls back to the visible control after a viewport change', async ({ page }) => {
  await freshManager(page);
  const before = await snapshot(page);
  for (const [from, to] of [[375, 1440], [1440, 375]]) {
    await page.setViewportSize({ width: from, height: 850 });
    await sessionAction(page, 'reset');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.setViewportSize({ width: to, height: 850 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.locator(to < 768 ? '[data-account-menu-trigger]' : '[data-demo-header="desktop"] [data-action="reset"]')).toBeFocused();
    expect(await snapshot(page)).toEqual(before);
  }
});

test('375px Toast leaves Reject reachable and unobscured while visible', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await freshManager(page);
  await page.clock.install();
  await page.locator('[data-demo-mobile-nav] [aria-disabled="true"]').first().click({ force: true });
  const toast = page.locator('[data-demo-toast]');
  await expect(toast).toBeVisible();
  const obscured = await page.locator('[data-layout="cards"] [data-action="reject"]').evaluateAll(buttons => {
    const notice = document.querySelector('[data-demo-toast]')!.getBoundingClientRect();
    return buttons.filter(button => {
      const box = button.getBoundingClientRect();
      const clip = button.closest('.kd-shell__content')!.getBoundingClientRect();
      const top = Math.max(box.top, clip.top);
      const bottom = Math.min(box.bottom, clip.bottom);
      return bottom > top && top < notice.bottom && bottom > notice.top && box.left < notice.right && box.right > notice.left;
    }).map(button => button.getAttribute('aria-label'));
  });
  expect(obscured, 'Toast does not cover a visible Reject control on initial activation').toEqual([]);
  for (const id of ['101', '102', '103', '104']) {
    const reject = page.locator(`[data-layout="cards"] [data-request-id="LV-2026-${id}"] [data-action="reject"]`);
    await reject.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const [control, notice, nav] = await Promise.all([reject.boundingBox(), toast.boundingBox(), page.locator('[data-demo-mobile-nav]').boundingBox()]);
    expect(control!.y + control!.height, `Reject ${id} stays above Toast`).toBeLessThanOrEqual(notice!.y);
    expect(notice!.y + notice!.height).toBeLessThanOrEqual(nav!.y - 15);
    await reject.click({ trial: true });
  }
  await page.screenshot({ path: testInfo.outputPath('toast-reject-375.png'), fullPage: true });
  await toast.getByRole('button', { name: 'إغلاق' }).focus();
  await page.clock.fastForward(6000);
  await expect(toast).toBeVisible();
  await page.locator('[data-account-menu-trigger]').focus();
  await page.clock.fastForward(5100);
  await expect(toast).toHaveCount(0);
  await page.locator('[data-layout="cards"] [data-request-id="LV-2026-101"] [data-action="reject"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('inactive mobile navigation meets text contrast', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await freshManager(page);
  const ratio = await page.locator('[data-demo-mobile-nav] [aria-disabled="true"]').first().evaluate(el => {
    const rgb = getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('Escape dismisses a hovered or focused sidebar tooltip without moving focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 850 });
  await freshManager(page);
  const item = page.locator('[data-demo-sidebar] [data-nav-id="dashboard"]');
  const tip = page.locator('#kd-tip-dashboard');
  await item.hover();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await page.mouse.move(500, 200);
  await item.focus();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(item).toBeFocused();
  await page.keyboard.press('Tab');
  await item.focus();
  await expect(tip).toBeVisible();
});
