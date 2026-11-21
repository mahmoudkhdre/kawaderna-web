import { expect, test, type Page } from '@playwright/test';
import { freshDemo, login, sessionAction, snapshot } from './demo-helpers';

/**
 * Gap 006 — Guided Commercial Demo. Every step is derived from real request state; the tour never signs anyone in,
 * never creates a request by itself and never picks "the latest" request.
 */
const GUIDE_KEY = 'kawaderna.demo.guide.v1';
const guideKey = (page: Page) => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? 'null'), GUIDE_KEY);
const phase = (page: Page) => page.locator('[data-guide]').first().getAttribute('data-guide-phase');
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const row = (page: Page, id: string) => page.locator(`[data-layout="${isMobile(page) ? 'cards' : 'table'}"] [data-request-id="${id}"]`);
const demoEmployeeRequests = (page: Page) => snapshot(page).then(s => (s?.requests ?? []).filter((r: { employeeId: string }) => r.employeeId === 'EMP-1201'));

async function startGuided(page: Page) {
  await page.locator('[data-guide-choice="guided"]').click();
  await expect(page.locator('[data-guide-login-hint="employee"]')).toBeVisible();
}
async function signInSuggested(page: Page) {
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('[data-demo-shell]')).toBeVisible();
}
async function switchViaGuide(page: Page, persona: 'employee' | 'manager' | 'hr') {
  await page.locator('[data-guide-switch]').first().click();
  await expect(page.locator('[data-demo-login]')).toBeVisible();
  await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
  await expect(page.locator('#kd-login-id')).toHaveValue(`${persona}-demo`);
  await signInSuggested(page);
}
async function submit(page: Page, start: string, end: string, days: number, acknowledge: boolean) {
  await page.fill('#employee-start', start);
  await page.fill('#employee-end', end);
  await page.fill('#employee-duration', String(days));
  if (acknowledge) await page.locator('.employee-warning input[type=checkbox]').check();
  await page.locator('.employee-submit').click();
  const id = await page.locator('.employee-success bdi').textContent();
  expect(id).toMatch(/^LV-2026-\d+$/);
  return id!;
}
async function managerApproves(page: Page, id: string, message: string) {
  await row(page, id).locator('[data-open-detail]').click();
  await page.locator('[data-detail] [data-action="approve"]').click();
  await expect(page.locator('[data-detail]')).toContainText(message);
  await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
}
async function managerRejects(page: Page, id: string) {
  await row(page, id).locator('[data-action="reject"]').click();
  await page.locator('[data-reject-root] input[type=radio]').first().check();
  await page.locator('[data-action="confirm-reject"]').click();
  await expect(page.locator('[data-rejection-notice]')).toContainText('تم رفض الطلب');
}

test.describe('entry', () => {
  test('first visit shows the choice without blocking sign-in, creating a request or signing in', async ({ page }) => {
    await freshDemo(page);
    await expect(page.locator('[data-guide-intro]')).toContainText('اكتشف كيف يدير كوادرنا طلبات الإجازات والموافقات');
    await expect(page.locator('[data-guide-choice]')).toHaveCount(2);
    await expect(page.locator('#kd-login-id')).toBeVisible();
    expect(await guideKey(page)).toBeNull();
    await startGuided(page);
    await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
    expect(await guideKey(page)).toEqual({ v: 1, mode: 'guided', requestId: null, collapsed: false });
    expect(await demoEmployeeRequests(page)).toHaveLength(0);
    await expect(page.locator('[data-demo-account="employee-demo"]')).toHaveAttribute('data-recommended', 'true');
    await expect(page.locator('#kd-login-id')).toHaveValue('employee-demo');
  });

  test('free exploration keeps the current behaviour (no guide panel) and the HR empty action starts the tour', async ({ page }) => {
    await freshDemo(page);
    await page.locator('[data-guide-choice="free"]').click();
    await login(page, 'hr');
    await expect(page.locator('[data-guide]')).toHaveCount(0);
    await expect(page.locator('[data-empty-state="hr"]')).toContainText('لا توجد طلبات بانتظار مراجعتك حاليًا');
    await page.locator('[data-empty-state="hr"] button').click();
    await expect(page.locator('[data-guide]')).toHaveCount(1);
    await expect(page.locator('[data-demo-shell]')).toBeVisible(); // no automatic sign-out or sign-in
  });

  test('a corrupted guide key falls back to the entry choice', async ({ page }) => {
    await freshDemo(page);
    await page.evaluate(key => sessionStorage.setItem(key, '{bad'), GUIDE_KEY);
    await page.reload();
    await expect(page.locator('[data-guide-intro]')).toBeVisible();
  });
});

test.describe('exceptional request: Employee → Manager → HR', () => {
  test('approval journey, with real validation, reload at every stage and the final CTA', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    await expect(page.locator('[data-guide-text]')).toContainText('رصيدك التجريبي الحالي ٣ أيام');
    await expect(page.locator('[data-guide-text]')).toContainText('٥ أيام');
    // real validation still applies and the tour does not advance
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
    await page.locator('.employee-submit').click();
    await expect(page.locator('.employee-error')).toBeVisible();
    expect(await phase(page)).toBe('no_request');
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-ack-error')).toContainText('أكّد اطلاعك');
    expect(await phase(page)).toBe('no_request');
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    expect(await phase(page)).toBe('awaiting_manager');
    expect((await guideKey(page)).requestId).toBe(id);
    expect(Object.keys(await guideKey(page)).sort()).toEqual(['collapsed', 'mode', 'requestId', 'v']);
    await page.reload();
    await expect(page.locator('[data-guide]')).toHaveAttribute('data-guide-phase', 'awaiting_manager');
    expect(await demoEmployeeRequests(page)).toHaveLength(1); // reload never re-creates the request

    await switchViaGuide(page, 'manager');
    await expect(page.locator('[data-guide-tracked-style]')).toHaveCount(1);
    await expect(row(page, id).first()).toHaveCSS('outline-style', 'solid');
    await managerApproves(page, id, 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    await expect(page.locator('[data-guide]')).toHaveAttribute('data-guide-phase', 'awaiting_hr');
    await page.reload();
    await expect(page.locator('[data-guide]')).toHaveAttribute('data-guide-phase', 'awaiting_hr');

    await switchViaGuide(page, 'hr');
    await expect(page.locator('main')).toContainText(id);
    await expect(page.locator('main')).not.toContainText(/MGR-2001|HR-1/); // DF-02
    await page.getByRole('button', { name: 'موافقة نهائية', exact: true }).click();
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'تمت الموافقة النهائية' })).toBeVisible();
    const stored = (await snapshot(page)).requests.find((r: { requestId: string }) => r.requestId === id);
    expect(stored).toMatchObject({ approvalStatus: 'approved', approvalStage: 'none' });
    await expect(page.locator('[data-guide-summary="approved"]')).toContainText('اكتملت رحلة الموافقة');
    await page.reload();
    await expect(page.locator('[data-guide]')).toHaveAttribute('data-guide-phase', 'approved_after_hr');

    await switchViaGuide(page, 'employee');
    await expect(page.locator('[data-guide-summary]')).toContainText('الموارد البشرية راجعت الاستثناء ووافقت');
    await expect(page.locator('.employee-requests')).toContainText('تمت الموافقة');
    const cta = page.locator('[data-guide-cta]');
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/201094097432\?text=/);
    expect(decodeURIComponent(href!)).not.toMatch(/LV-2026|MGR|EMP|سبب/);
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('manager rejection ends the path at the manager and never asks for HR; the reason is visible to the employee', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await switchViaGuide(page, 'manager');
    await managerRejects(page, id);
    await expect(page.locator('[data-guide-summary="rejected"]')).toContainText('اكتمل مسار الرفض عند المدير');
    await expect(page.locator('[data-guide]')).not.toContainText('تابع بحساب الموارد البشرية');
    await expect(page.locator('[data-stage="hr"]')).toHaveAttribute('data-state', 'not_applicable');
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    await expect(page.locator('[data-empty-state="hr"]')).toContainText('انتهى هذا الطلب بالرفض في مرحلة المدير');
    await expect(page.locator('[data-guide-reason]')).toHaveCount(0); // HR is not shown the manager's reason
    await sessionAction(page, 'logout');
    await login(page, 'employee');
    await expect(page.locator('[data-guide-reason]')).toHaveCount(1);
    await expect(page.locator('.employee-requests')).toContainText('سبب الرفض');
  });

  test('HR rejection keeps the reason and is never presented as an approval', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await switchViaGuide(page, 'manager');
    await managerApproves(page, id, 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    await switchViaGuide(page, 'hr');
    await page.getByRole('button', { name: 'رفض الطلب', exact: true }).click();
    await page.getByLabel('سبب الرفض للموظف').fill('تعذّر توفير التغطية خلال الفترة');
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    await expect(page.locator('[data-guide-summary="rejected"]')).toContainText('اكتمل مسار المراجعة بالرفض');
    await expect(page.locator('[data-guide]')).not.toContainText('اكتملت رحلة الموافقة');
    await switchViaGuide(page, 'employee');
    await expect(page.locator('[data-guide-reason]')).toContainText('تعذّر توفير التغطية');
  });

  test('HR sees an honest empty state while the tracked request waits for the manager', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    const empty = page.locator('[data-empty-state="hr"]');
    await expect(empty).toContainText('ما زال بانتظار قرار المدير');
    await expect(empty).not.toContainText('LV-2026');
    await empty.locator('button').click();
    await expect(page.locator('[data-demo-login]')).toBeVisible(); // signs out only; no automatic sign-in
    await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
  });
});

test.describe('routine request', () => {
  test('manager approval is final: no HR stage, no escalation claim', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const id = await submit(page, '2026-03-01', '2026-03-02', 2, false);
    await expect(page.locator('[data-stage="hr"]')).toHaveAttribute('data-state', 'not_applicable');
    await switchViaGuide(page, 'manager');
    await managerApproves(page, id, 'تمت الموافقة على الطلب');
    const stored = (await snapshot(page)).requests.find((r: { requestId: string }) => r.requestId === id);
    expect(stored).toMatchObject({ approvalStatus: 'approved', approvalStage: 'none' });
    await sessionAction(page, 'logout');
    await login(page, 'hr');
    await expect(page.locator('[data-empty-state="hr"]')).toContainText('لا يحتاج مسار الاستثناء الخاص بالموارد البشرية');
    await sessionAction(page, 'logout');
    await login(page, 'employee');
    await expect(page.locator('[data-guide-summary]')).toContainText('اكتمل مسار الطلب الروتيني');
    await expect(page.locator('[data-guide-summary]')).not.toContainText('راجعت الاستثناء');
  });
});

test.describe('several requests, skipping, missing request and reset', () => {
  test('a second request never steals the tour; picking another is explicit; requests are never mixed', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const first = await submit(page, '2026-03-01', '2026-03-02', 2, false);
    const second = await submit(page, '2026-04-01', '2026-04-05', 5, true);
    expect((await guideKey(page)).requestId).toBe(first);
    await page.locator('[data-guide-picker]').selectOption(second);
    expect((await guideKey(page)).requestId).toBe(second);
    await switchViaGuide(page, 'manager');
    await managerRejects(page, second);
    const stored = (await snapshot(page)).requests;
    expect(stored.find((r: { requestId: string }) => r.requestId === first).approvalStatus).toBe('pending');
    expect(stored.find((r: { requestId: string }) => r.requestId === second).approvalStatus).toBe('rejected');
  });

  test('skip keeps data and resume returns to the same request; "try another path" keeps requests', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    const before = await snapshot(page);
    await page.locator('[data-guide-skip]').first().click();
    await expect(page.locator('[data-guide]')).toHaveCount(0);
    expect(await snapshot(page)).toEqual(before);
    expect((await guideKey(page)).requestId).toBe(id);
    await page.locator('[data-guide-start]').click();
    await expect(page.locator('[data-guide-request-id]')).toHaveText(id);
  });

  test('a missing tracked request is explained and never replaced by another request', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ v: 1, mode: 'guided', requestId: 'LV-2026-199', collapsed: false })), GUIDE_KEY);
    await page.reload();
    await expect(page.locator('[data-guide]')).toContainText('لم يعد الطلب المرتبط بهذه الجولة متاحًا');
    expect((await guideKey(page)).requestId).toBe('LV-2026-199');
    await page.locator('[data-guide-restart]').click();
    expect((await guideKey(page)).requestId).toBeNull();
  });

  test('reset: cancel changes nothing; confirm removes the guide key and restores baseline data', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await sessionAction(page, 'reset');
    await page.getByRole('button', { name: 'إلغاء' }).click();
    expect((await guideKey(page)).requestId).toBe(id);
    expect((await snapshot(page)).requests.some((r: { requestId: string }) => r.requestId === id)).toBe(true);
    await sessionAction(page, 'reset');
    await page.getByRole('button', { name: 'إعادة الضبط' }).click();
    await expect(page.locator('[data-demo-login]')).toBeVisible();
    expect(await guideKey(page)).toBeNull();
    await expect(page.locator('[data-guide-intro]')).toBeVisible();
    expect((await snapshot(page).catch(() => null))?.requests.some((r: { requestId: string }) => r.requestId === id) ?? false).toBe(false);
  });
});

test.describe('responsive', () => {
  for (const width of [320, 360, 375, 390, 430]) {
    test(`no horizontal overflow and 44px guide targets at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await freshDemo(page);
      const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth);
      expect(await noOverflow()).toBe(true);
      await startGuided(page);
      expect(await noOverflow()).toBe(true);
      await signInSuggested(page);
      expect(await noOverflow()).toBe(true);
      const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
      expect(await noOverflow()).toBe(true);
      const small = await page.evaluate(() => [...document.querySelectorAll('.kd-guide button, .kd-guide select, .kd-guide a')]
        .filter(el => el.getClientRects().length).map(el => Math.round(el.getBoundingClientRect().height)).filter(h => h < 44));
      expect(small).toEqual([]);
      await switchViaGuide(page, 'manager');
      expect(await noOverflow()).toBe(true);
      await expect(row(page, id).first()).toBeVisible();
    });
  }
});

/**
 * Owner approval 2026-11-17 — fixes D1–D6 and decisions A, C. Measurements are taken in the real browser
 * (rects, computed colours, focus), never from source.
 */
const ratioInPage = (page: Page, selector: string) => page.evaluate((sel: string) => {
  const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(s => parseFloat(s)); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }: { r: number; g: number; b: number }) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el: Element) => { for (let n: Element | null = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.99) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const out: { text: string; ratio: number }[] = [];
  for (const root of Array.from(document.querySelectorAll(sel)).filter(n => n.getClientRects().length)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement!; const text = (t.textContent ?? '').trim();
      if (!text || seen.has(el) || !el.getClientRects().length) continue;
      seen.add(el);
      const fg = parse(getComputedStyle(el).color)!; const [hi, lo] = [lum(fg), lum(bgOf(el))].sort((a, b) => b - a);
      out.push({ text: text.slice(0, 20), ratio: (hi + 0.05) / (lo + 0.05) });
    }
  }
  return out;
}, selector);
const box = (page: Page, selector: string) => page.evaluate((sel: string) => {
  const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect();
  const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return { top: b.top, bottom: b.bottom, height: b.height, width: b.width, vh: innerHeight, reachable: !!hit && (hit === el || el.contains(hit)) };
}, selector);

test.describe('owner approval 2026-11-17: D1–D6', () => {
  test('D1: the first sign-in hint matches the real state (already filled, press sign in)', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    const hint = page.locator('[data-guide-login-hint="employee"]');
    await expect(hint).toContainText('تمت تعبئة بيانات حساب الموظف التجريبي المعلنة');
    await expect(hint).not.toContainText('اضغط «تعبئة');
    await expect(page.locator('#kd-login-id')).toHaveValue('employee-demo');
    await expect(page.locator('#kd-login-password')).not.toHaveValue('');
    await expect(page.locator('[data-demo-shell]')).toHaveCount(0); // still no auto sign-in
  });

  test('D2: signing in lands on the start of the page with the header and the guide in view (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshDemo(page);
    await startGuided(page);
    await page.mouse.wheel(0, 304);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await signInSuggested(page);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const guide = await box(page, '[data-guide]');
    expect(guide!.top).toBeGreaterThanOrEqual(0);
    expect(guide!.top).toBeLessThan(guide!.vh / 2);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await switchViaGuide(page, 'manager');
    expect(await page.evaluate(() => scrollY)).toBe(0); // no automatic jump to the row either
    expect((await box(page, '[data-guide]'))!.top).toBeGreaterThanOrEqual(0);
    // the tracked row is reachable on request: scrolled into view and its own action focused
    await page.locator('[data-guide-show-tracked]').click();
    const target = await page.evaluate(i => { const e = [...document.querySelectorAll(`[data-layout="table"] [data-request-id="${i}"]`)].find(n => n.getClientRects().length)!; const b = e.getBoundingClientRect(); return { visible: b.top >= 0 && b.bottom <= innerHeight, focused: e.contains(document.activeElement) && document.activeElement?.hasAttribute('data-open-detail') }; }, id);
    expect(target).toEqual({ visible: true, focused: true });
  });

  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) {
    test(`D3: the manager step is reachable right under the success message at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await freshDemo(page);
      await startGuided(page);
      await signInSuggested(page);
      await submit(page, '2026-02-01', '2026-02-05', 5, true);
      const next = page.locator('[data-guide-next="manager"]');
      await expect(next).toBeVisible();
      await expect(next).toHaveText('تابع بحساب المدير');
      const b = (await box(page, '[data-guide-next]'))!;
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(b.vh);
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.reachable).toBe(true); // not covered by the bottom navigation or the toast
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-guide-next]')!.parentElement!).position)).not.toMatch(/fixed|sticky|absolute/);
      await next.click();
      await expect(page.locator('[data-demo-login]')).toBeVisible();
      await expect(page.locator('#kd-login-id')).toHaveValue('manager-demo');
      await expect(page.locator('[data-demo-shell]')).toHaveCount(0); // a role switch is never an automatic sign-in
    });
  }

  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) {
    test(`D4: the acknowledgement target is at least 44px high and the whole row toggles it at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await freshDemo(page);
      await login(page, 'employee');
      await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
      const label = page.locator('.employee-warning label');
      await label.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.querySelector('.employee-warning label')!.scrollIntoView({ block: 'center' }));
      const b = (await label.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
      await page.mouse.click(b.x + b.width - 6, b.y + b.height / 2); // far from the 20px box
      await expect(page.locator('.employee-warning input[type=checkbox]')).toBeChecked();
      await page.mouse.click(b.x + b.width - 6, b.y + 6); // top edge of the row
      await expect(page.locator('.employee-warning input[type=checkbox]')).not.toBeChecked();
    });
  }

  test('D5 + O-3: each message sits under its own field, names the real limit, is linked to that field, and focus goes there', async ({ page }) => {
    await freshDemo(page);
    await login(page, 'employee');
    const summary = page.locator('#employee-error');
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
    await page.locator('.employee-submit').click(); // over balance, not acknowledged (the duration rule is checked first, so the period must allow 5 days)
    const ack = page.locator('.employee-warning input[type=checkbox]');
    await expect(page.locator('#employee-ack-error')).toContainText('أكّد اطلاعك');
    await expect(ack).toHaveAttribute('aria-invalid', 'true');
    await expect(ack).toBeFocused();
    expect(await ack.getAttribute('aria-describedby')).toContain('employee-ack-error');
    await expect(summary).toContainText('لم يُرسل الطلب');
    await expect(summary).not.toContainText('أكّد اطلاعك'); // the summary never repeats (or contradicts) a field message
    await ack.check();
    await expect(ack).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#employee-ack-error')).toHaveCount(0); // fixing the field removes its own message
    await page.fill('#employee-end', '2026-02-03');
    await page.locator('.employee-submit').click(); // 5 days in a 3-day period
    const durationError = page.locator('#employee-duration-error');
    await expect(durationError).toContainText('الحد الأقصى لهذه الفترة هو ٣ أيام');
    const duration = page.locator('#employee-duration');
    await expect(duration).toHaveAttribute('aria-invalid', 'true');
    await expect(duration).toBeFocused();
    expect(await duration.getAttribute('aria-describedby')).toBe('employee-duration-error employee-duration-hint');
    await expect(page.locator('#employee-start')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#employee-end')).not.toHaveAttribute('aria-invalid', 'true');
    await page.fill('#employee-duration', '0');
    await page.locator('.employee-submit').click();
    await expect(durationError).toContainText('من يوم واحد إلى ٣ أيام');
    await page.fill('#employee-end', '');
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-end-error')).toContainText('أدخل تاريخ النهاية');
    await expect(page.locator('#employee-end')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#employee-end')).toBeFocused();
    expect(await page.locator('#employee-end').getAttribute('aria-describedby')).toBe('employee-end-error');
    await expect(page.locator('#employee-start-error')).toHaveCount(0); // only the field that is wrong is flagged
    await page.fill('#employee-end', '2026-01-30'); // before the start date
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-end-error')).toContainText('يسبق تاريخ البداية');
    expect((await demoEmployeeRequests(page)).length).toBe(0); // none of the refusals created a request
    // the rule itself is unchanged: exactly the limit is accepted
    await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '3');
    await page.locator('.employee-submit').click();
    await expect(page.locator('.employee-success')).toBeVisible();
    await expect(page.locator('#employee-error')).toHaveCount(0);
    await expect(page.locator('[data-field-error]')).toHaveCount(0);
  });

  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) {
    test(`D6: every text in the tracked Manager row is at least 4.5:1 and the row is still marked at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await freshDemo(page);
      await startGuided(page);
      await signInSuggested(page);
      const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
      await switchViaGuide(page, 'manager');
      const tracked = row(page, id).first();
      await expect(tracked).toBeVisible();
      await page.mouse.move(1, 1); // no hover tint while measuring
      const sel = `[data-request-id="${id}"]`;
      const ratios = await ratioInPage(page, sel);
      expect(ratios.length).toBeGreaterThan(5);
      expect(ratios.find(item => item.text.includes('بانتظار قرارك'))).toBeTruthy();
      for (const item of ratios) expect(item.ratio, `${item.text}`).toBeGreaterThanOrEqual(4.5);
      const style = await tracked.evaluate(el => ({ outline: getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth, bg: getComputedStyle(el).backgroundColor }));
      expect(style.outline).toBe('solid 2px'); // distinction kept
      expect(['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)']).toContain(style.bg); // and no tint behind legacy label colours
    });
  }
});

test.describe('owner approval 2026-11-17: decisions A and C', () => {
  test('A: guided shows the guide, free hides it, folding is remembered and never touches the request', async ({ page }) => {
    await freshDemo(page);
    await page.locator('[data-guide-choice="free"]').click();
    await login(page, 'employee');
    await expect(page.locator('[data-guide]')).toHaveCount(0);
    await expect(page.locator('[data-guide-resume]')).toBeVisible();
    await page.locator('[data-guide-start]').click();
    await expect(page.locator('[data-guide]')).toBeVisible();
    await expect(page.locator('.kd-guide__body')).toBeVisible();
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    const before = await demoEmployeeRequests(page);
    await page.locator('.kd-guide__tool[aria-expanded]').click();
    await expect(page.locator('.kd-guide__body')).toBeHidden();
    expect((await guideKey(page)).collapsed).toBe(true);
    await page.reload();
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
    await expect(page.locator('[data-guide]')).toBeVisible();
    await expect(page.locator('.kd-guide__body')).toBeHidden(); // the saved preference is respected
    expect((await guideKey(page)).requestId).toBe(id);
    await page.locator('.kd-guide__tool[aria-expanded]').click();
    await expect(page.locator('.kd-guide__body')).toBeVisible();
    expect(await demoEmployeeRequests(page)).toEqual(before); // folding and opening changed no request
  });

  test('C: the contact link is quiet, uses the one central source, and carries no request data', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page);
    await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    const link = page.locator('[data-demo-contact]');
    await expect(link).toBeVisible();
    const href = (await link.getAttribute('href'))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+/);
    expect(href).not.toContain(id);
    expect(decodeURIComponent(href)).not.toMatch(/LV-2026|Demo2026|employee-demo/);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(page.locator('[role="dialog"], [aria-modal="true"]')).toHaveCount(0); // never a marketing modal
    await switchViaGuide(page, 'manager');
    await managerRejects(page, id);
    await expect(page.locator('[data-guide-cta]')).toHaveAttribute('href', href); // the completed path uses the same source
    await expect(page.locator('[data-guide-cta]')).toHaveClass(/kd-btn--primary/); // and is the prominent action
  });
});

test.describe('final recovery 2026-11-17: D7, D9, D10, D11 and keyboard / focus', () => {
  const focused = (page: Page) => page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName ?? null, id: a?.id ?? '', attrs: a?.getAttributeNames().filter(n => n.startsWith('data-')) ?? [] }; });
  const luminance = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

  for (const width of [1440, 390]) {
    test.describe(`at ${width}px`, () => {
      test.use({ viewport: { width, height: width > 700 ? 900 : 844 } });

      test('focus: "ابدأ الجولة" moves focus to the new hint title, never to <body>; skip and resume keep focus on a real control', async ({ page }) => {
        await freshDemo(page);
        await page.locator('[data-guide-choice="guided"]').click();
        expect(await focused(page)).toMatchObject({ tag: 'P', id: 'kd-hint-title' });
        await expect(page.locator('#kd-hint-title')).toBeFocused();
        expect(await page.evaluate(() => scrollY)).toBe(0); // focus must not scroll the page
        await page.locator('[data-guide-login-hint] [data-guide-skip]').click();
        expect((await focused(page)).attrs).toContain('data-guide-start');
        await page.locator('[data-guide-start]').click();
        expect(await focused(page)).toMatchObject({ id: 'kd-hint-title' });
        await page.evaluate(key => sessionStorage.removeItem(key), GUIDE_KEY); // the entry choice is offered again
        await page.reload();
        await page.locator('[data-guide-choice="free"]').click();
        expect((await focused(page)).tag).not.toBe('BODY');
        await page.keyboard.press('Tab'); // logical order afterwards: the next Tab reaches a real control
        expect((await focused(page)).tag).not.toBe('BODY');
      });

      test('focus: restoring a saved session on load never takes focus', async ({ page }) => {
        await freshDemo(page);
        await page.locator('[data-guide-choice="guided"]').click();
        await page.reload();
        await expect(page.locator('[data-guide-login-hint]')).toBeVisible();
        expect((await focused(page)).tag).toBe('BODY');
      });

      test('keyboard: a skip link reaches the tracked request action within 3 Tab presses and the action is in view', async ({ page }) => {
        await freshDemo(page);
        await startGuided(page); await signInSuggested(page);
        const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
        await switchViaGuide(page, 'manager');
        await page.reload();
        await expect(page.locator('[data-demo-shell]')).toBeVisible();
        await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
        let presses = 0;
        for (; presses < 10;) {
          await page.keyboard.press('Tab'); presses++;
          if ((await focused(page)).attrs.includes('data-skip-tracked')) break;
        }
        expect(presses).toBeLessThanOrEqual(3);
        await expect(page.locator('[data-skip-tracked]')).toBeVisible(); // visible while focused
        await page.keyboard.press('Enter');
        const target = row(page, id).locator('[data-open-detail]').first();
        await expect(target).toBeFocused();
        await expect(target).toBeInViewport();
        await page.keyboard.press('Tab'); // not a trap
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
      });

      test('keyboard: the skip link exists only for a Manager whose tracked request still waits', async ({ page }) => {
        await freshDemo(page);
        await startGuided(page); await signInSuggested(page);
        await expect(page.locator('[data-skip-tracked]')).toHaveCount(0); // employee
        const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
        await switchViaGuide(page, 'manager');
        await expect(page.locator('[data-skip-tracked]')).toHaveCount(1);
        await managerApproves(page, id, 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
        await expect(page.locator('[data-skip-tracked]')).toHaveCount(0);
      });

      test('D7: a decision on another row gets a reminder that clears when the tracked request is decided; the revealed row stays in view', async ({ page }) => {
        await freshDemo(page);
        await startGuided(page); await signInSuggested(page);
        const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
        await switchViaGuide(page, 'manager');
        await expect(page.locator('[data-guide-other-hint]')).toHaveCount(0);
        await page.locator('[data-guide-show-tracked]').click(); // part 1: the whole row is inside the viewport
        const bounds = await row(page, id).first().evaluate(node => { const b = node.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, vh: innerHeight }; });
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.bottom).toBeLessThanOrEqual(bounds.vh);
        await page.evaluate(() => window.scrollTo(0, 0));
        const otherId = await page.locator(`[data-layout="${isMobile(page) ? 'cards' : 'table'}"] [data-request-id]:not([data-request-id="${id}"])`).filter({ has: page.locator('[data-action="reject"]') }).first().getAttribute('data-request-id');
        expect(otherId).not.toBeNull();
        await managerRejects(page, otherId!); // part 2: decide a different row
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.locator('[data-guide-other-hint]')).toContainText('الطلب الذي تتبعه الجولة ما زال بانتظار قرارك');
        expect(await phase(page)).toBe('awaiting_manager'); // the tour did not advance
        await managerApproves(page, id, 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
        await expect(page.locator('[data-guide-other-hint]')).toHaveCount(0);
        await expect(page.locator('[data-guide]')).toHaveAttribute('data-guide-phase', 'awaiting_hr');
      });

      test('review fixes: the reveal never fails silently, the skip control is a button, and empty-state actions keep focus', async ({ page }) => {
        await freshDemo(page);
        await startGuided(page); await signInSuggested(page);
        await submit(page, '2026-02-01', '2026-02-05', 5, true);
        await switchViaGuide(page, 'manager');
        await expect(page.locator('button[data-skip-tracked]')).toHaveCount(1); // a button, not a link to a missing anchor
        if (isMobile(page)) await page.locator('[data-filter-toggle]').click(); // phones keep the filters behind one button
        await page.locator('[data-filter="search"]').fill('zzz-no-match');
        await expect(row(page, 'LV-2026-107')).toHaveCount(0);
        await page.locator('[data-guide-show-tracked]').click();
        // O-4: a filter that hides the request is named, the filter is left as the user set it, and the explicit action is offered.
        await expect(page.locator('[data-guide-not-shown]')).toContainText('التصفية الحالية تخفي الطلب المتتبَّع');
        await expect(page.locator('[data-guide-clear-show]')).toBeVisible();
        expect(await page.locator('[data-filter="search"]').inputValue()).toBe('zzz-no-match');
        expect((await focused(page)).tag).not.toBe('BODY');
      });

      test('review fixes: the HR empty-state action replaces itself without dropping focus on <body>', async ({ page }) => {
        await freshDemo(page);
        await page.locator('[data-guide-choice="free"]').click();
        await login(page, 'hr');
        const action = page.locator('[data-empty-state="hr"] button').first();
        await expect(action).toBeVisible();
        await action.click();
        await expect(page.locator('aside[data-guide]')).toBeVisible();
        expect((await focused(page)).tag).not.toBe('BODY');
      });

      test('D9: a missing tracked request shows the explanation only (no stepper, no progress count, no "why it matters")', async ({ page }) => {
        await freshDemo(page);
        await page.evaluate(() => sessionStorage.setItem('kawaderna.demo.guide.v1', JSON.stringify({ v: 1, mode: 'guided', requestId: 'LV-2026-999', collapsed: false })));
        await page.reload();
        await signInSuggested(page);
        const guide = page.locator('aside[data-guide]');
        await expect(guide).toHaveAttribute('data-guide-phase', 'missing');
        if (isMobile(page)) { // O-2: a phone shows the one-line instruction first; the full explanation is behind the details toggle
          await expect(guide.locator('[data-guide-short]')).toContainText('لم يعد متاحًا');
          await guide.locator('[data-guide-details-toggle]').click();
        }
        await expect(guide.locator('[data-guide-text]')).toContainText('لم يعد الطلب المرتبط بهذه الجولة متاحًا');
        await expect(guide.locator('[data-guide-stepper]')).toHaveCount(0);
        await expect(guide.locator('[data-guide-progress]')).toHaveCount(0);
        await expect(guide.locator('.kd-guide__why')).toHaveCount(0);
        await expect(guide.locator('[data-guide-restart]')).toBeVisible(); // the recovery action stays
        await page.locator('[data-guide-restart]').click(); // and a real first step keeps all three
        await expect(guide.locator('[data-guide-stepper]')).toHaveCount(1);
        await expect(guide.locator('.kd-guide__why')).toHaveCount(1);
      });

      test('D10: the page h1 is the first heading and the guide region keeps one stable name', async ({ page }) => {
        await freshDemo(page);
        await startGuided(page); await signInSuggested(page);
        const firstHeading = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(h => h.getClientRects().length)?.tagName);
        expect(firstHeading).toBe('H1');
        await expect(page.getByRole('complementary', { name: 'الجولة الموجّهة' })).toHaveCount(1);
        await submit(page, '2026-02-01', '2026-02-05', 5, true);
        await expect(page.getByRole('complementary', { name: 'الجولة الموجّهة' })).toHaveCount(1); // unchanged after the step changed
        expect(await page.evaluate(() => document.querySelectorAll('aside[data-guide] h1, aside[data-guide] h2, aside[data-guide] h3').length)).toBe(0);
      });

      test('D11: the return link uses the accent token (≥ 4.5:1 on its own background), 44px high, with a visible focus ring', async ({ page }) => {
        await freshDemo(page);
        const style = () => page.locator('.demo-return').evaluate(node => { const s = getComputedStyle(node); return { color: s.color, bg: s.backgroundColor, font: s.fontFamily, h: node.getBoundingClientRect().height, outline: s.outlineStyle, outlineColor: s.outlineColor, outlineWidth: s.outlineWidth }; });
        const rest = await style();
        expect(rest.color).toBe('rgb(29, 78, 216)'); // --kd-accent (primary/700); no longer the legacy rgb(13, 110, 253)
        expect(rest.bg).toBe('rgb(250, 250, 250)'); // --kd-page
        expect(rest.font).toContain('Tajawal');
        expect(rest.h).toBeGreaterThanOrEqual(44);
        expect(ratio(rest.color, rest.bg)).toBeGreaterThanOrEqual(4.5);
        await page.locator('.demo-return').focus();
        await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); // keyboard modality, so :focus-visible applies
        const focus = await style();
        expect(focus.outline).toBe('solid');
        expect(focus.outlineWidth).toBe('2px');
        expect(focus.outlineColor).toBe('rgb(29, 78, 216)');
        await startGuided(page); await signInSuggested(page);
        expect((await style()).color).toBe('rgb(29, 78, 216)'); // same on the shell screen
      });
    });
  }
});

test.describe('owner decision D8 (2026-11-17): «النتيجة» completes for every role once a real final decision exists', () => {
  const result = (page: Page) => page.evaluate(() => {
    const stage = document.querySelector('aside[data-guide] [data-stage="result"]');
    return { state: stage?.getAttribute('data-state') ?? null, outcome: stage?.getAttribute('data-outcome') ?? null, hr: document.querySelector('aside[data-guide] [data-stage="hr"]')?.getAttribute('data-state') ?? null, progress: (document.querySelector('[data-guide-progress]')?.textContent ?? '').replace(/\s+/g, ' ').trim() };
  });
  const asRole = async (page: Page, persona: 'employee' | 'manager' | 'hr') => { await sessionAction(page, 'logout'); await login(page, persona); await expect(page.locator('aside[data-guide]')).toBeVisible(); };

  test('exceptional approval: not complete while pending; complete as HR, Manager and Employee after HR approves', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page); await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    expect((await result(page)).state).toBe('upcoming'); // Employee, pending at Manager
    await switchViaGuide(page, 'manager');
    expect((await result(page)).state).toBe('upcoming');
    await managerApproves(page, id, 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    expect((await result(page)).state).toBe('upcoming'); // Manager, pending at HR: never shown as complete
    await switchViaGuide(page, 'hr');
    expect((await result(page)).state).toBe('upcoming');
    await page.getByRole('button', { name: 'موافقة نهائية', exact: true }).click();
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    await expect(page.locator('[data-guide-summary="approved"]')).toBeVisible();
    expect(await result(page)).toMatchObject({ state: 'completed', outcome: 'approved', hr: 'completed' }); // HR, immediately, without the employee opening anything
    expect((await result(page)).progress).toContain('٤ من ٤');
    await asRole(page, 'manager');
    expect(await result(page)).toMatchObject({ state: 'completed', outcome: 'approved', hr: 'completed' });
    expect((await result(page)).progress).toContain('٤ من ٤');
    await asRole(page, 'employee');
    expect(await result(page)).toMatchObject({ state: 'completed', outcome: 'approved' });
    await expect(page.locator('aside[data-guide]')).not.toContainText(/اطلع الموظف|شاهد الموظف|تم الاطلاع/);
  });

  test('HR rejection completes the rejection path for HR, Manager and Employee (never as an approval)', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page); await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await switchViaGuide(page, 'manager');
    await managerApproves(page, id, 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    await switchViaGuide(page, 'hr');
    await page.getByRole('button', { name: 'رفض الطلب', exact: true }).click();
    await page.getByLabel('سبب الرفض للموظف').fill('تعذّر توفير التغطية خلال الفترة');
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    for (const persona of ['hr', 'manager', 'employee'] as const) {
      if (persona !== 'hr') await asRole(page, persona);
      expect(await result(page), persona).toMatchObject({ state: 'completed', outcome: 'rejected', hr: 'completed' });
      expect((await result(page)).progress, persona).toContain('٤ من ٤');
      await expect(page.locator('aside[data-guide]'), persona).not.toContainText('اكتملت رحلة الموافقة');
    }
  });

  test('Manager rejection completes at the Manager for Manager, HR and Employee; HR is never a phantom stage', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page); await signInSuggested(page);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await switchViaGuide(page, 'manager');
    await managerRejects(page, id);
    for (const persona of ['manager', 'hr', 'employee'] as const) {
      if (persona !== 'manager') await asRole(page, persona);
      expect(await result(page), persona).toMatchObject({ state: 'completed', outcome: 'rejected', hr: 'not_applicable' });
      expect((await result(page)).progress, persona).toContain('٣ من ٣');
    }
  });

  test('routine request completes at its approved final state for Manager, HR and Employee', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page); await signInSuggested(page);
    const id = await submit(page, '2026-03-01', '2026-03-02', 2, false);
    expect((await result(page)).state).toBe('upcoming');
    await switchViaGuide(page, 'manager');
    expect((await result(page)).state).toBe('upcoming');
    await managerApproves(page, id, 'تمت الموافقة على الطلب');
    for (const persona of ['manager', 'hr', 'employee'] as const) {
      if (persona !== 'manager') await asRole(page, persona);
      expect(await result(page), persona).toMatchObject({ state: 'completed', outcome: 'approved', hr: 'not_applicable' });
      expect((await result(page)).progress, persona).toContain('٣ من ٣');
    }
  });

  test('a request that no longer exists is never shown as complete', async ({ page }) => {
    await freshDemo(page);
    await page.evaluate(() => sessionStorage.setItem('kawaderna.demo.guide.v1', JSON.stringify({ v: 1, mode: 'guided', requestId: 'LV-2026-999', collapsed: false })));
    await page.reload();
    await signInSuggested(page);
    expect((await result(page)).state).toBeNull(); // stepper is hidden for a missing request (D9)
    await expect(page.locator('[data-guide-summary]')).toHaveCount(0);
  });
});

test.describe('owner decision D12 (2026-11-17): field boundary and focus indicator', () => {
  const lum = (rgb: string) => { const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const state = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => {
    const s = getComputedStyle(el);
    const bgOf = (n: Element | null): string => { while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg; n = n.parentElement; } return 'rgb(255, 255, 255)'; };
    const r = el.getBoundingClientRect(); const reach = (parseFloat(s.outlineOffset) || 0) + (parseFloat(s.outlineWidth) || 0);
    let clipped = false; for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n); if (!/(hidden|auto|scroll|clip)/.test(o.overflowX + o.overflowY)) continue;
      const c = n.getBoundingClientRect(); const scrollsY = /(auto|scroll)/.test(o.overflowY);
      if (r.left - reach < c.left - 0.5 || r.right + reach > c.right + 0.5 || (!scrollsY && (r.top - reach < c.top - 0.5 || r.bottom + reach > c.bottom + 0.5))) { clipped = true; break; }
    }
    return { border: s.borderTopColor, bw: s.borderTopWidth, bg: bgOf(el.parentElement), outlineStyle: s.outlineStyle, outlineW: s.outlineWidth, outlineColor: s.outlineColor, shadow: s.boxShadow, clipped };
  });
  const settle = (page: Page) => page.waitForTimeout(260); // border-color transition is 150 ms

  for (const width of [1440, 390, 320]) {
    test.describe(`at ${width}px`, () => {
      test.use({ viewport: { width, height: width > 700 ? 900 : 640 } });

      async function check(page: Page, selector: string, label: string) {
        const loc = page.locator(selector).first();
        await loc.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0); await settle(page);
        const rest = await state(page, selector);
        expect(ratio(rest.border, rest.bg), `${label} resting boundary ≥ 3:1`).toBeGreaterThanOrEqual(3);
        expect(rest.bw, label).toBe('1px');
        await loc.hover(); await settle(page);
        const hover = await state(page, selector);
        expect(ratio(hover.border, hover.bg), `${label} hover boundary`).toBeGreaterThan(ratio(rest.border, rest.bg)); // hover is distinguishable from rest
        await page.mouse.move(0, 0);
        await page.keyboard.press('Tab'); await loc.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); // keyboard modality
        await expect(loc).toBeFocused(); await settle(page);
        const focus = await state(page, selector);
        expect(focus.outlineStyle, label).toBe('solid');
        expect(focus.outlineW, label).toBe('2px');
        expect(focus.outlineColor, label).toBe('rgb(29, 78, 216)'); // --kd-accent
        expect(ratio(focus.outlineColor, focus.bg), `${label} focus indicator ≥ 3:1`).toBeGreaterThanOrEqual(3);
        expect(focus.clipped, `${label} focus outline is not clipped by an overflow ancestor`).toBe(false);
        expect(focus.shadow, `${label} no legacy glow`).toBe('none');
      }

      test('login fields: boundary, hover, focus, error', async ({ page }) => {
        await freshDemo(page);
        await check(page, '#kd-login-id', 'login id');
        await check(page, '#kd-login-password', 'login password');
        await page.fill('#kd-login-id', 'wrong'); await page.locator('form button[type="submit"]').click();
        await expect(page.locator('#kd-login-error')).toBeVisible();
        await settle(page);
        const err = await state(page, '#kd-login-id');
        expect(err.border).toBe('rgb(220, 38, 38)'); // --kd-destructive, distinct from rest (zinc) and focus (accent)
        expect(ratio(err.border, err.bg)).toBeGreaterThanOrEqual(3);
      });

      test('employee form: boundary, hover, focus; an invalid focused field keeps the error border and shows the outline', async ({ page }) => {
        await freshDemo(page);
        await login(page, 'employee');
        for (const id of ['#employee-start', '#employee-end', '#employee-duration']) await check(page, id, `employee ${id}`);
        await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
        await page.locator('.employee-submit').click();
        await expect(page.locator('#employee-duration')).toHaveAttribute('aria-invalid', 'true');
        await expect(page.locator('#employee-duration')).toBeFocused(); await settle(page);
        const bad = await state(page, '#employee-duration');
        expect(bad.border).toBe('rgb(220, 38, 38)');
        expect(bad.outlineStyle).toBe('solid');
        expect(bad.outlineColor).toBe('rgb(29, 78, 216)');
        expect(bad.clipped).toBe(false);
      });

      test('manager filters: boundary, hover, focus on every control', async ({ page }) => {
        await freshDemo(page);
        await login(page, 'manager');
        if (isMobile(page)) await page.locator('[data-filter-toggle]').click();
        for (const f of ['search', 'status', 'risk', 'sla']) await check(page, `[data-filter="${f}"]`, `filter ${f}`);
      });
    });
  }
});

test.describe('aria-live review (2026-11-17): the guide announces each real change once, and nothing else', () => {
  const watch = (page: Page) => page.evaluate(() => {
    const el = document.querySelector('[data-guide-announcer]')!;
    const w = window as unknown as { __live: string[] };
    w.__live = [];
    new MutationObserver(() => w.__live.push((el.textContent ?? '').trim())).observe(el, { childList: true, characterData: true, subtree: true });
  });
  const log = (page: Page) => page.evaluate(() => (window as unknown as { __live: string[] }).__live);

  test('one live region; no announcement on load, toggle or unrelated actions; one per real step change; reminder joins the same region', async ({ page }) => {
    await freshDemo(page);
    await startGuided(page); await signInSuggested(page);
    expect(await page.locator('aside[data-guide] [aria-live]').count()).toBe(1);
    expect(await page.locator('aside[data-guide] [role="status"]').count()).toBe(1);
    expect(await page.locator('[data-guide-announcer] button, [data-guide-announcer] a').count()).toBe(0);
    await watch(page);
    // collapsing / expanding and typing in the form are not announcements
    await page.getByRole('button', { name: 'إخفاء الشرح' }).click();
    await page.getByRole('button', { name: 'إظهار الشرح' }).click();
    await page.fill('#employee-start', '2026-02-01');
    expect(await log(page)).toEqual([]);
    const id = await submit(page, '2026-02-01', '2026-02-05', 5, true);
    await expect.poll(() => log(page).then(l => l.length)).toBeGreaterThanOrEqual(1);
    const afterSubmit = await log(page);
    expect(afterSubmit.every((entry, i) => i === 0 || entry !== afterSubmit[i - 1])).toBe(true); // never the same text written twice in a row
    expect(afterSubmit.at(-1)).toContain(id);
    await switchViaGuide(page, 'manager');
    await watch(page);
    const otherId = await page.locator('[data-layout="table"] [data-request-id]:not([data-request-id="' + id + '"])').filter({ has: page.locator('[data-action="reject"]') }).first().getAttribute('data-request-id');
    await managerRejects(page, otherId!);
    await expect.poll(() => log(page).then(l => l.at(-1) ?? '')).toContain('قرارك على طلب آخر');
    const text = (await page.locator('[data-guide-announcer]').textContent()) ?? '';
    expect(text).toContain('مراجعة المدير');
    expect(text).not.toContain('لماذا يهم');
    expect((await log(page)).filter(entry => entry.includes('قرارك على طلب آخر')).length).toBeLessThanOrEqual(2); // one DOM write per change (React may split text node + update)
  });
});

test.describe('D12 review fix (2026-11-17): the reject modal is portalled outside .kd and must get the same field tokens', () => {
  for (const width of [1440, 390, 320]) {
    test(`reject textarea: tokens resolve, boundary ≥ 3:1, accent 2px focus outline, radios and buttons use the accent ring at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width > 700 ? 900 : 700 });
      await freshDemo(page);
      await login(page, 'manager');
      const layout = isMobile(page) ? 'cards' : 'table';
      await page.locator(`[data-layout="${layout}"] [data-action="reject"]`).first().click();
      const root = page.locator('[data-reject-root]');
      await expect(root).toBeVisible();
      expect(await root.evaluate(el => !el.closest('.kd'))).toBe(true); // really outside .kd: that is the case under test
      const tokens = await root.evaluate(el => { const s = getComputedStyle(el); return { accent: s.getPropertyValue('--kd-accent').trim(), muted: s.getPropertyValue('--kd-muted').trim(), field: s.getPropertyValue('--kd-field-border').trim() }; });
      expect(tokens).toEqual({ accent: '#1d4ed8', muted: '#71717a', field: '#71717a' });
      await root.locator('input[type=radio]').last().check();
      const area = root.locator('textarea');
      await expect(area).toBeVisible();
      await page.mouse.move(0, 0); await page.waitForTimeout(260);
      const rest = await area.evaluate(el => getComputedStyle(el).borderTopColor);
      expect(rest).not.toBe('rgb(9, 9, 11)'); // was `currentcolor` (undefined variable) before the fix
      expect(rest).toBe('rgb(113, 113, 122)'); // Zinc/500, 4.83:1 on white
      await area.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      await expect(area).toBeFocused(); await page.waitForTimeout(260);
      const focus = await area.evaluate(el => { const s = getComputedStyle(el); return { outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, border: s.borderTopColor }; });
      expect(focus.outline).toBe('solid 2px rgb(29, 78, 216)');
      expect(focus.border).toBe('rgb(29, 78, 216)');
      // radios and buttons inside the modal also use the accent ring, not the legacy blue
      await root.locator('input[type=radio]').first().focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; });
      expect(ring).toBe('solid 2px rgb(29, 78, 216)');
    });
  }
});
