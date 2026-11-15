import { expect, test } from '@playwright/test';
import { freshManager } from './demo-helpers';

const row = (page: import('@playwright/test').Page, id = 'LV-2026-101') => page.locator(`[data-layout="table"] [data-request-id="${id}"]`);
const card = (page: import('@playwright/test').Page, id = 'LV-2026-101') => page.locator(`[data-layout="cards"] [data-request-id="${id}"]`);
const modal = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'رفض طلب الإجازة' });

test('desktop Inbox opens an empty modal and preserves Approve-only Drawer', async ({ page }) => {
  await freshManager(page);
  await expect(row(page).locator('[data-action="reject"]')).toBeVisible();
  await expect(row(page, 'LV-2026-105').locator('[data-action="reject"]')).toHaveCount(0);
  await row(page).locator('[data-open-detail]').click();
  await expect(page.locator('[data-detail]')).toBeVisible();
  await expect(page.locator('[data-detail] [data-action="approve"]')).toHaveCount(1);
  await expect(page.locator('[data-detail] [data-action="reject"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
  await row(page).locator('[data-action="reject"]').click();
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(modal(page).locator('#reject-details')).toHaveValue('');
  await expect(modal(page)).toContainText('سيظهر سبب الرفض');
  await expect(page.locator('[data-detail]')).toHaveCount(0);
  await expect(modal(page).locator('input[type="radio"]')).toHaveCount(5);
  await expect(modal(page).locator('input[type="radio"]').first()).toBeFocused();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
});

test('validation, cancel, Escape, backdrop and clean reopen do not decide', async ({ page }) => {
  await freshManager(page);
  await row(page).locator('[data-action="reject"]').click();
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).getByText('اختر سببًا واحدًا للرفض.')).toBeVisible();
  await expect(modal(page).locator('input[type="radio"]').first()).toBeFocused();
  await modal(page).getByLabel('أخرى', { exact: true }).check();
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).getByText('اكتب تفاصيل توضح سبب اختيار أخرى.')).toBeVisible();
  await modal(page).locator('#reject-details').fill('  ');
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).getByText('اكتب تفاصيل توضح سبب اختيار أخرى.')).toBeVisible();
  await modal(page).locator('#reject-details').fill('😀'.repeat(501));
  await expect(modal(page).locator('#reject-details-count')).toContainText('٥٠١');
  await expect(modal(page).getByText('يجب ألا تتجاوز التفاصيل ٥٠٠ حرف.')).toBeVisible();
  await page.locator('[data-reject-root]').click({ position: { x: 2, y: 2 } });
  await expect(modal(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal(page)).toHaveCount(0);
  await expect(row(page).locator('[data-action="reject"]')).toBeVisible();
  await row(page).locator('[data-action="reject"]').click();
  await expect(modal(page).locator('#reject-details')).toHaveValue('');
  await modal(page).getByRole('button', { name: 'إلغاء' }).click();
  await expect(modal(page)).toHaveCount(0);
});

test('500 code points and explicit rejection update only the selected queue row', async ({ page }) => {
  await freshManager(page);
  await row(page).locator('[data-action="reject"]').click();
  await modal(page).getByLabel('عدم توفر تغطية العمل', { exact: true }).check();
  await modal(page).locator('#reject-details').fill('😀'.repeat(500));
  await expect(modal(page).locator('#reject-details-count')).toContainText('٥٠٠');
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('[data-rejection-notice]')).toContainText('تم رفض الطلب وتسجيل السبب.');
  await expect(row(page)).toContainText('مرفوض');
  await expect(row(page).locator('[data-action="reject"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'طلبات الإجازات' })).toBeFocused();
  await expect(row(page, 'LV-2026-102').locator('[data-action="reject"]')).toHaveCount(1);
  await row(page).locator('[data-open-detail]').click();
  await expect(page.locator('[data-detail]')).toContainText('للقراءة فقط');
  await expect(page.locator('[data-detail] [data-action="approve"]')).toHaveCount(0);
  await expect(page.locator('[data-detail] [data-action="reject"]')).toHaveCount(0);
  await expect(page.locator('[data-detail]')).not.toContainText('إعادة تقديم');
});

test('low-balance selection alone does not reject; approval still escalates to HR', async ({ page }) => {
  await freshManager(page);
  await row(page, 'LV-2026-102').locator('[data-action="reject"]').click();
  await modal(page).getByLabel('عدم كفاية رصيد الإجازات', { exact: true }).check();
  await page.keyboard.press('Escape');
  await expect(row(page, 'LV-2026-102')).toContainText('قيد المراجعة');
  await row(page, 'LV-2026-102').locator('[data-open-detail]').click();
  await page.locator('[data-detail] [data-action="approve"]').click();
  await expect(page.locator('[data-detail]')).toContainText('تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
  await expect(row(page, 'LV-2026-102')).toContainText('قيد المراجعة • الموارد البشرية');
  await expect(row(page, 'LV-2026-102').locator('[data-action="reject"]')).toHaveCount(0);
});

for (const width of [320, 360, 375, 390, 430, 1440]) {
  test(`RTL modal remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await freshManager(page);
    const launcher = width < 768 ? card(page).locator('[data-action="reject"]') : row(page).locator('[data-action="reject"]');
    await launcher.click();
    await expect(modal(page)).toBeVisible();
    await expect(modal(page)).toHaveAttribute('dir', 'rtl');
    await expect(modal(page).locator('[data-action="confirm-reject"]')).toBeVisible();
    const buttonBox = await modal(page).locator('[data-action="confirm-reject"]').boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(740);
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    if (width === 320) {
      for (const target of [modal(page).getByRole('button', { name: 'إغلاق نافذة الرفض' }), modal(page).getByRole('button', { name: 'إلغاء' }), modal(page).locator('label').first()]) {
        const box = await target.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await modal(page).getByLabel('أخرى', { exact: true }).check();
      await modal(page).locator('#reject-details').fill('سبب واضح');
      const detailsBox = await modal(page).locator('#reject-details').boundingBox();
      expect(detailsBox).not.toBeNull();
      expect(detailsBox!.y).toBeLessThan(740);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await modal(page).getByLabel('تعارض مع جدول العمل', { exact: true }).check();
    await modal(page).locator('[data-action="confirm-reject"]').click();
    await expect(page.locator('[data-rejection-notice]')).toContainText('تم رفض الطلب');
  });
}

test('busy state blocks duplicate submits and dismissal; known failure retains draft', async ({ page }) => {
  await page.goto('/tests/e2e/rejection-harness.html?mode=delayed');
  await page.getByRole('button', { name: 'فتح الرفض' }).click();
  await modal(page).getByLabel('عدم توفر تغطية العمل', { exact: true }).check();
  await modal(page).locator('#reject-details').fill('تفاصيل محفوظة');
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).locator('[role="status"]')).toContainText('جارٍ تسجيل الرفض…');
  await expect(modal(page).locator('[data-action="confirm-reject"]')).toBeDisabled();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(modal(page)).toBeVisible();
  await expect(page.locator('[data-call-count]')).toHaveText('1');
  await expect(modal(page).getByText('ينقص الطلب إقرار تنبيه الرصيد ولا يمكن رفضه الآن.')).toBeVisible();
  await expect(modal(page).locator('#reject-details')).toHaveValue('تفاصيل محفوظة');
  await expect(modal(page).locator('[data-action="confirm-reject"]')).toBeEnabled();
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(page.locator('[data-call-count]')).toHaveText('2');
});

test('stale response discards draft and requires fresh review', async ({ page }) => {
  await page.goto('/tests/e2e/rejection-harness.html?mode=stale');
  await page.getByRole('button', { name: 'فتح الرفض' }).click();
  await modal(page).getByLabel('أخرى', { exact: true }).check();
  await modal(page).locator('#reject-details').fill('سبب قديم');
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).getByText(/تغيّرت نسخة الطلب/)).toBeVisible();
  await expect(modal(page).locator('#reject-details')).toHaveValue('');
  await expect(modal(page).locator('[data-action="confirm-reject"]')).toHaveCount(0);
  await modal(page).getByRole('button', { name: 'أغلق النافذة وراجع الطلب من جديد.' }).click();
  await expect(modal(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'فتح الرفض' }).click();
  await expect(modal(page).locator('input[type="radio"]:checked')).toHaveCount(0);
});

test('unknown outcome reconciles state before retry', async ({ page }) => {
  await page.goto('/tests/e2e/rejection-harness.html?mode=generic_changed');
  await page.getByRole('button', { name: 'فتح الرفض' }).click();
  await modal(page).getByLabel('عدم توفر تغطية العمل', { exact: true }).check();
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).getByText('تعذر تسجيل الرفض. راجع حالة الطلب ثم أعد المحاولة.')).toBeVisible();
  await expect(modal(page).locator('[data-action="confirm-reject"]')).toHaveCount(0);
  await expect(page.locator('[data-call-count]')).toHaveText('1');
});

test('unauthorized outcome blocks retry and does not expose reason', async ({ page }) => {
  await page.goto('/tests/e2e/rejection-harness.html?mode=unauthorized');
  await page.getByRole('button', { name: 'فتح الرفض' }).click();
  await modal(page).getByLabel('عدم توفر تغطية العمل', { exact: true }).check();
  await modal(page).locator('[data-action="confirm-reject"]').click();
  await expect(modal(page).getByText('ليست لديك صلاحية رفض هذا الطلب.')).toBeVisible();
  await expect(modal(page).locator('[data-action="confirm-reject"]')).toHaveCount(0);
  await expect(page.locator('[data-call-count]')).toHaveText('1');
});

test('changed request context discards the old draft', async ({ page }) => {
  await page.goto('/tests/e2e/rejection-harness.html?mode=context');
  await page.getByRole('button', { name: 'فتح الرفض' }).click();
  await modal(page).getByLabel('أخرى', { exact: true }).check();
  await modal(page).locator('#reject-details').fill('سبب الطلب الأول');
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('main button:nth-of-type(2)')?.click());
  await expect(modal(page)).toContainText('LV-2026-103');
  await expect(modal(page).locator('#reject-details')).toHaveValue('');
  await expect(modal(page).locator('input[type="radio"]:checked')).toHaveCount(0);
});

test('focus wraps, restores to opener, and remains reachable at short mobile height', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto('/tests/e2e/rejection-harness.html');
  const opener = page.getByRole('button', { name: 'فتح الرفض' });
  await opener.click();
  await expect(modal(page).locator('input[type="radio"]').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal(page).getByRole('button', { name: 'إغلاق نافذة الرفض' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal(page).getByRole('button', { name: 'إلغاء' })).toBeFocused();
  await expect(modal(page).getByRole('button', { name: 'إلغاء' })).toBeVisible();
  await modal(page).getByRole('button', { name: 'إلغاء' }).click();
  await expect(opener).toBeFocused();
});

test('Figma-sourced colors apply and a focused control is never hidden under the sticky actions', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  await freshManager(page);
  await card(page).locator('[data-action="reject"]').click();
  const dialog = modal(page);
  await expect(dialog).toHaveCSS('color', 'rgb(9, 9, 11)');
  await expect(dialog.locator('[data-action="confirm-reject"]')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect(dialog.getByText('ملخص الطلب')).toBeVisible();
  expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(520);
  const barTop = await dialog.locator('[data-action="confirm-reject"]').evaluate((el) => el.parentElement!.getBoundingClientRect().top);
  for (const control of await dialog.locator('input, textarea').all()) {
    await control.focus();
    const bottom = await control.evaluate((el) => el.getBoundingClientRect().bottom);
    expect(bottom).toBeLessThanOrEqual(barTop + 1);
  }
});

for (const width of [320, 360, 375, 390, 430]) {
  test(`mobile bottom sheet at ${width}px: full width, stacked actions, errors and scrolling usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await freshManager(page);
    await card(page).locator('[data-action="reject"]').click();
    const dialog = modal(page);
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBe(0);
    expect(Math.round(box.width)).toBe(width);
    expect(Math.round(box.y + box.height)).toBe(700);
    const confirm = dialog.locator('[data-action="confirm-reject"]');
    const cancel = dialog.getByRole('button', { name: 'إلغاء' });
    const [cb, xb] = [(await confirm.boundingBox())!, (await cancel.boundingBox())!];
    expect(cb.y).toBeLessThan(xb.y);
    expect(Math.round(cb.width)).toBe(Math.round(xb.width));
    expect(cb.width).toBeGreaterThan(width - 40);
    expect(cb.height).toBeGreaterThanOrEqual(44);
    expect(xb.height).toBeGreaterThanOrEqual(44);
    await confirm.click();
    const error = dialog.getByText('اختر سببًا واحدًا للرفض.');
    await expect(error).toBeVisible();
    const [eb, bar] = await Promise.all([error.boundingBox(), confirm.evaluate((el) => el.parentElement!.getBoundingClientRect().top)]);
    expect(eb!.y + eb!.height).toBeLessThanOrEqual(bar + 1);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(card(page).locator('[data-action="reject"]')).toBeFocused();
  });
}

test('mobile sheet keeps actions side by side on a short viewport; desktop stays a centered dialog', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await freshManager(page);
  await card(page).locator('[data-action="reject"]').click();
  const confirm = modal(page).locator('[data-action="confirm-reject"]');
  const cancel = modal(page).getByRole('button', { name: 'إلغاء' });
  const [cb, xb] = [(await confirm.boundingBox())!, (await cancel.boundingBox())!];
  expect(Math.abs(cb.y - xb.y)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/demo');
  await row(page).locator('[data-action="reject"]').click();
  const box = (await modal(page).boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(520);
  expect(box.x).toBeGreaterThan(0);
  const [dc, dx] = [(await modal(page).locator('[data-action="confirm-reject"]').boundingBox())!, (await modal(page).getByRole('button', { name: 'إلغاء' }).boundingBox())!];
  expect(Math.abs(dc.y - dx.y)).toBeLessThan(2);
});

test('rendered text contrast meets 4.5:1 (3:1 for large text) on actual backgrounds', async ({ page }) => {
  for (const [width, mobile] of [[1440, false], [375, true]] as const) {
    await page.setViewportSize({ width, height: 800 });
    await freshManager(page);
    await (mobile ? card(page) : row(page)).locator('[data-action="reject"]').click();
    await modal(page).getByRole('radio').last().check();
    const results = await modal(page).evaluate((root) => {
      const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
      const channel = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      const backgroundOf = (el: Element): number[] => {
        for (let node: Element | null = el; node; node = node.parentElement) {
          const [r, g, b, a = 1] = parse(getComputedStyle(node).backgroundColor);
          if (a === 1) return [r, g, b];
        }
        return [255, 255, 255];
      };
      const out: { text: string; ratio: number; large: boolean }[] = [];
      for (const el of Array.from(root.querySelectorAll('*'))) {
        const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => n.textContent!.trim()).join(' ');
        if (!own) continue;
        const style = getComputedStyle(el);
        const fg = parse(style.color).slice(0, 3);
        const bg = backgroundOf(el);
        const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
        const size = parseFloat(style.fontSize);
        out.push({ text: own.slice(0, 24), ratio: Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100, large: size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) });
      }
      return out;
    });
    expect(results.length).toBeGreaterThan(10);
    for (const item of results) expect(item.ratio, `${width}px "${item.text}"`).toBeGreaterThanOrEqual(item.large ? 3 : 4.5);
  }
});

test('capture rendered RTL modal and validation states for design review', async ({ page }, testInfo) => {
  for (const width of [320, 360, 375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await freshManager(page);
    await (width < 768 ? card(page) : row(page)).locator('[data-action="reject"]').click();
    await page.screenshot({ path: testInfo.outputPath(`modal-${width}.png`), fullPage: true });
    await modal(page).locator('[data-action="confirm-reject"]').click();
    await expect(modal(page).getByText('اختر سببًا واحدًا للرفض.')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`modal-error-${width}.png`), fullPage: true });
  }
});

