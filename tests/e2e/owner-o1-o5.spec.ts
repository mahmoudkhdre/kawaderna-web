import { expect, test, type Page } from '@playwright/test';
import { DEMO_COPY } from '../../src/demo/copy';
import { createBaselineRequests } from '../../src/demo/state';
import { escalate, freshDemo, login, snapshot, SNAPSHOT_KEY } from './demo-helpers';

/**
 * Owner decisions O-1..O-5 (2026-11-17) for Gap 006. Real browser, real state. No test logs or captures a typed password:
 * the only passwords used are the public demo password (kept in a constant, never printed) and the literal "wrong".
 */
const GUIDE_KEY = 'kawaderna.demo.guide.v1';
const DEMO_PASSWORD = 'Demo2026!';
const guideKey = (page: Page) => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? 'null'), GUIDE_KEY);
const phase = (page: Page) => page.locator('[data-guide]').first().getAttribute('data-guide-phase');
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const row = (page: Page, id: string) => page.locator(`[data-layout="${isMobile(page) ? 'cards' : 'table'}"] [data-request-id="${id}"]`);
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

async function startGuided(page: Page) {
  await page.locator('[data-guide-choice="guided"]').click();
  await expect(page.locator('[data-guide-login-hint="employee"]')).toBeVisible();
}
async function signInSuggested(page: Page) {
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('[data-demo-shell]')).toBeVisible();
}
async function switchViaGuide(page: Page) {
  await page.locator('[data-guide-switch]').first().click();
  await expect(page.locator('[data-demo-login]')).toBeVisible();
  await signInSuggested(page);
}
async function submitRequest(page: Page, start = '2026-02-01', end = '2026-02-05', days = 5, acknowledge = true) {
  await page.fill('#employee-start', start); await page.fill('#employee-end', end); await page.fill('#employee-duration', String(days));
  if (acknowledge) await page.locator('.employee-warning input[type=checkbox]').check();
  await page.locator('.employee-submit').click();
  const id = await page.locator('.employee-success bdi').textContent();
  expect(id).toMatch(/^LV-2026-\d+$/);
  return id!;
}
async function openFilters(page: Page) { if (isMobile(page)) await page.locator('[data-filter-toggle]').click(); }
const lum = (rgb: string) => { const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/* ------------------------------------------------------------------------------------------------ O-1 */
test.describe('O-1: an invalid field keeps the red border AND shows the blue focus outline', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) {
    test(`at ${width}px (border, outline, contrast, clipping, aria-invalid, linked message)`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await freshDemo(page);
      await login(page, 'employee');
      await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
      await page.locator('.employee-submit').click();
      const duration = page.locator('#employee-duration');
      await expect(duration).toHaveAttribute('aria-invalid', 'true');
      await expect(duration).toBeFocused();
      await page.waitForTimeout(260); // the 150 ms border transition
      const m = await duration.evaluate(el => {
        const s = getComputedStyle(el); const r = el.getBoundingClientRect(); const reach = (parseFloat(s.outlineOffset) || 0) + (parseFloat(s.outlineWidth) || 0);
        let clipped = false;
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = getComputedStyle(n); if (!/(hidden|auto|scroll|clip)/.test(o.overflowX + o.overflowY)) continue;
          const c = n.getBoundingClientRect(); const scrollsY = /(auto|scroll)/.test(o.overflowY);
          if (r.left - reach < c.left - 0.5 || r.right + reach > c.right + 0.5 || (!scrollsY && (r.top - reach < c.top - 0.5 || r.bottom + reach > c.bottom + 0.5))) { clipped = true; break; }
        }
        const described = (el.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent ?? '');
        return { border: s.borderTopColor, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, clipped, described };
      });
      expect(m.border).toBe('rgb(220, 38, 38)'); // --kd-destructive: the error
      expect(m.outline).toBe('solid 2px rgb(29, 78, 216)'); // --kd-accent: the focus
      expect(ratio(m.border, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3);
      expect(ratio('rgb(29, 78, 216)', 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3);
      expect(ratio('rgb(29, 78, 216)', m.border)).toBeGreaterThan(1); // the two cues are different colours
      expect(m.clipped).toBe(false);
      expect(m.described[0]).toContain('الحد الأقصى لهذه الفترة'); // the message the field is described by is the one shown
      expect(m.described.every(text => text.length > 0)).toBe(true); // every referenced id exists
    });
  }
});

/* ------------------------------------------------------------------------------------------------ O-2 */
test.describe('O-2: Guided Demo starts compact on a phone and the details are one explicit toggle away', () => {
  for (const [width, height] of [[320, 640], [390, 844]] as const) {
    test.describe(`at ${width}px`, () => {
      test.use({ viewport: { width, height } });

      test('Employee first screen: stage, real progress, one short instruction; details hidden; the form stays reachable', async ({ page }) => {
        await freshDemo(page); await startGuided(page); await signInSuggested(page);
        const guide = page.locator('[data-guide]');
        await expect(guide).toHaveAttribute('data-compact', 'true');
        await expect(guide).toHaveAttribute('data-details', 'closed');
        await expect(page.locator('[data-guide-stage="employee"]')).toContainText('المرحلة الحالية');
        await expect(page.locator('[data-guide-progress]')).toContainText('٠ من ٤'); // the real progress, not a placeholder
        await expect(page.locator('[data-guide-short]')).toBeVisible();
        await expect(page.locator('[data-guide-stepper]')).toBeHidden();
        await expect(page.locator('[data-guide-text]')).toHaveCount(0);
        await expect(page.locator('.kd-guide__why')).toBeHidden();
        const box = (await guide.boundingBox())!;
        expect(box.height, 'the guide must not take most of the first screen').toBeLessThanOrEqual(height * 0.45);
        await expect(page.getByRole('heading', { name: 'طلب إجازة جديد' })).toBeInViewport(); // the user's own action starts on the first screen
        await noOverflow(page);
        expect(await phase(page)).toBe('no_request');
      });

      test('the details toggle is a real disclosure (aria-expanded, aria-controls, keyboard) and never advances the tour', async ({ page }) => {
        await freshDemo(page); await startGuided(page); await signInSuggested(page);
        const toggle = page.locator('[data-guide-details-toggle]');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toContainText('عرض التفاصيل');
        const controlled = (await toggle.getAttribute('aria-controls'))!.split(' ');
        expect(controlled.length).toBeGreaterThan(0);
        for (const id of controlled) expect(await page.locator(`[id="${id}"]`).count(), `aria-controls id ${id} exists`).toBe(1);
        const before = await guideKey(page);
        await toggle.focus(); await page.keyboard.press('Enter');
        await expect(page.locator('[data-guide]')).toHaveAttribute('data-details', 'open');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(toggle).toContainText('إخفاء التفاصيل');
        await expect(page.locator('[data-guide-stepper]')).toBeVisible();
        await expect(page.locator('[data-guide-text]')).toContainText('رصيدك التجريبي الحالي ٣ أيام');
        await expect(page.locator('.kd-guide__why')).toBeVisible();
        await expect(page.locator('[data-guide-short]')).toHaveCount(0);
        await noOverflow(page);
        expect(await phase(page)).toBe('no_request');
        expect(await guideKey(page)).toEqual(before); // a view toggle writes nothing and advances nothing
        await toggle.focus(); await page.keyboard.press('Space');
        await expect(page.locator('[data-guide]')).toHaveAttribute('data-details', 'closed');
        await expect(page.locator('[data-guide-stepper]')).toBeHidden();
      });

      test('the tour advances only after the real action succeeds; the next action is visible without opening details', async ({ page }) => {
        await freshDemo(page); await startGuided(page); await signInSuggested(page);
        await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
        await page.locator('.employee-submit').click(); // refused
        expect(await phase(page)).toBe('no_request');
        await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
        await page.locator('.employee-submit').click(); // refused: acknowledgement
        expect(await phase(page)).toBe('no_request');
        const id = await submitRequest(page);
        expect(await phase(page)).toBe('awaiting_manager');
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page.locator('[data-guide-stage="manager"]')).toBeVisible();
        await expect(page.locator('[data-guide-progress]')).toContainText('١ من ٤');
        await expect(page.locator('[data-guide-switch]')).toBeVisible(); // next action, still compact
        await expect(page.locator('[data-guide]')).toHaveAttribute('data-details', 'closed');
        expect((await guideKey(page)).requestId).toBe(id);
      });

      test('Manager first screen: stage, short instruction and «اعرض الطلب في القائمة» are visible without opening details', async ({ page }) => {
        await freshDemo(page); await startGuided(page); await signInSuggested(page);
        await submitRequest(page); await switchViaGuide(page);
        await expect(page.locator('[data-guide]')).toHaveAttribute('data-details', 'closed');
        await expect(page.locator('[data-guide-stage="manager"]')).toBeVisible();
        await expect(page.locator('[data-guide-show-tracked]')).toBeVisible();
        await expect(page.locator('[data-guide-stepper]')).toBeHidden();
        const box = (await page.locator('[data-guide]').boundingBox())!;
        expect(box.height).toBeLessThanOrEqual(height * 0.45);
        await expect(page.locator('[data-filter-toggle]')).toBeVisible(); // the Manager's own list controls are reachable
        await noOverflow(page);
      });
    });
  }

  test('terminal summary on a phone: result and the main call to action first; the rest behind the same toggle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    const id = await submitRequest(page); await switchViaGuide(page);
    await row(page, id).locator('[data-open-detail]').click();
    await page.locator('[data-detail] [data-action="approve"]').click();
    await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
    await switchViaGuide(page);
    await page.getByRole('button', { name: 'موافقة نهائية', exact: true }).click();
    await page.getByRole('button', { name: 'تأكيد القرار', exact: true }).click();
    const summary = page.locator('[data-guide-summary="approved"]');
    await expect(summary).toBeVisible();
    await expect(page.locator('[data-guide]')).toHaveAttribute('data-details', 'closed');
    await expect(page.locator('[data-guide-progress]')).toContainText('٤ من ٤');
    await expect(page.locator('[data-guide-cta]')).toBeVisible();
    for (const hidden of ['[data-guide-another]', '[data-guide-explore]', '[data-guide-reset]', '.kd-guide__limits', '.kd-guide__lines']) await expect(page.locator(hidden)).toBeHidden();
    await page.locator('[data-guide-details-toggle]').click();
    for (const shown of ['[data-guide-another]', '[data-guide-explore]', '[data-guide-reset]', '.kd-guide__limits', '.kd-guide__lines', '[data-guide-stepper]']) await expect(page.locator(shown)).toBeVisible();
    await noOverflow(page);
  });

  test('the layout follows the viewport (event driven): resizing from a phone to a desktop shows the full guide', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    await expect(page.locator('[data-guide]')).toHaveAttribute('data-compact', 'true');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('[data-guide]')).not.toHaveAttribute('data-compact', 'true');
    await expect(page.locator('[data-guide-stepper]')).toBeVisible();
    await expect(page.locator('[data-guide-details-toggle]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'إخفاء الشرح' })).toBeVisible(); // the desktop collapse control is unchanged
  });

  test('desktop is unchanged: full guide, no details toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    await expect(page.locator('[data-guide-stepper]')).toBeVisible();
    await expect(page.locator('[data-guide-text]')).toBeVisible();
    await expect(page.locator('[data-guide-short]')).toHaveCount(0);
  });

  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) test(`Free Exploration never shows the tour by itself; the saved choice is respected on reload and sign-in at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await freshDemo(page);
    await page.locator('[data-guide-choice="free"]').click();
    expect((await guideKey(page)).mode).toBe('free');
    await login(page, 'employee');
    await expect(page.locator('[data-guide]')).toHaveCount(0);
    await expect(page.locator('[data-guide-resume]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-guide]')).toHaveCount(0);
    expect((await guideKey(page)).mode).toBe('free');
    // a guided choice is also kept across a reload
    await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ v: 1, mode: 'guided', requestId: null, collapsed: false })), GUIDE_KEY);
    await page.reload();
    if (width < 768) await expect(page.locator('[data-guide]')).toHaveAttribute('data-compact', 'true');
    else { await expect(page.locator('[data-guide]')).not.toHaveAttribute('data-compact', 'true'); await expect(page.locator('[data-guide-stepper]')).toBeVisible(); }
    expect((await guideKey(page)).mode).toBe('guided');
  });
});

/* ------------------------------------------------------------------------------------------------ O-3 */
test.describe('O-3: validation messages sit next to the field they are about', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) {
    test(`at ${width}px: message under its field, visible, not covered, linked, focused`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await freshDemo(page); await login(page, 'employee');
      await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
      await page.locator('.employee-submit').click();
      const message = page.locator('#employee-duration-error');
      await expect(message).toBeVisible();
      await expect(message).toBeInViewport();
      const field = (await page.locator('#employee-duration').boundingBox())!;
      const box = (await message.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(field.y + field.height - 1); // directly under its field
      expect(box.y - (field.y + field.height)).toBeLessThanOrEqual(12);
      // nothing (the mobile navigation, a banner) covers the message
      const covered = await message.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(hit && (el === hit || el.contains(hit))); });
      expect(covered).toBe(false);
      await expect(page.locator('#employee-duration')).toBeFocused();
      await noOverflow(page);
      // the text is readable (foreground colour on white) and the icon is decorative
      const text = await message.locator('span').evaluate(el => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el.closest('.employee-card')!).backgroundColor }));
      expect(ratio(text.color, text.bg)).toBeGreaterThanOrEqual(4.5);
      await expect(message.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  }

  test('one polite announcement per refusal: field messages are not live; only the short summary is, once per submit', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.evaluate(() => {
      const log: string[] = []; (window as unknown as { __alerts: string[] }).__alerts = log;
      new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(node => {
        const el = node instanceof Element ? node : node.parentElement;
        const live = el?.closest('[role="alert"], [aria-live]');
        if (live && (node.textContent ?? '').trim()) log.push(`${live.getAttribute('role') ?? live.getAttribute('aria-live')}:${(node.textContent ?? '').trim().slice(0, 40)}`);
      }))).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-duration-error')).toBeVisible();
    await page.locator('.employee-submit').click(); // the same refusal again
    await expect(page.locator('#employee-duration-error')).toBeVisible();
    const alerts = await page.evaluate(() => (window as unknown as { __alerts: string[] }).__alerts);
    expect(alerts.filter(entry => entry.startsWith('alert:')).length, 'exactly one summary per refused submit').toBe(2);
    expect(alerts.filter(entry => !entry.startsWith('alert:')).length, 'no other live region is written').toBe(0);
    await expect(page.locator('#employee-duration-error')).not.toHaveAttribute('role', /./);
    await expect(page.locator('#employee-duration-error')).not.toHaveAttribute('aria-live', /./);
  });

  test('summary and field never contradict; each field is flagged only for its own message', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.locator('.employee-submit').click(); // empty form
    await expect(page.locator('#employee-start-error')).toContainText('أدخل تاريخ البداية');
    await expect(page.locator('#employee-end-error')).toContainText('أدخل تاريخ النهاية');
    await expect(page.locator('#employee-duration-error')).toHaveCount(0); // the dates are refused first (rule order unchanged)
    await expect(page.locator('#employee-start')).toBeFocused(); // first field in form order
    await expect(page.locator('#employee-error')).toHaveText('لم يُرسل الطلب. راجع رسالة الخطأ تحت الحقل المعني.');
    for (const id of ['employee-start', 'employee-end']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
      expect(await page.locator(`#${id}`).getAttribute('aria-describedby')).toBe(`${id}-error`);
    }
    await expect(page.locator('#employee-duration')).not.toHaveAttribute('aria-invalid', 'true');
    await page.fill('#employee-end', '2026-02-05'); // fixing one field removes only its own message
    await expect(page.locator('#employee-end-error')).toHaveCount(0);
    await expect(page.locator('#employee-start-error')).toBeVisible();
    expect((await snapshot(page)).requests.filter((r: { employeeId: string }) => r.employeeId === 'EMP-1201').length).toBe(0);
  });

  test('the acknowledgement checkbox gets an invalid state: message under it, danger border on its box, focus and link', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
    await page.locator('.employee-submit').click();
    const box = page.locator('.employee-warning');
    await expect(box).toHaveClass(/employee-warning--invalid/);
    expect(await box.evaluate(el => getComputedStyle(el).borderTopColor)).toBe('rgb(220, 38, 38)');
    const ack = page.locator('.employee-warning input[type=checkbox]');
    await expect(ack).toBeFocused();
    expect(await ack.getAttribute('aria-describedby')).toBe('employee-ack-error employee-balance-warning-text');
    await ack.check();
    await expect(box).not.toHaveClass(/employee-warning--invalid/);
  });

  test('the guide does not read form errors, and a refused submit does not move the tour', async ({ page }) => {
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    const announcer = page.locator('[data-guide-announcer]');
    const before = await announcer.textContent();
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-duration-error')).toBeVisible();
    expect(await announcer.textContent()).toBe(before);
    expect(await phase(page)).toBe('no_request');
  });
});

/* ------------------------------------------------------------------------------------------------ O-4 */
test.describe('O-4: «اعرض الطلب» never clears a filter silently', () => {
  async function trackedManager(page: Page) {
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    const id = await submitRequest(page); await switchViaGuide(page);
    return id;
  }
  const requestsOf = async (page: Page) => JSON.stringify((await snapshot(page)).requests);

  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]] as const) {
    test(`filtered out at ${width}px: says so, offers the explicit action, applies exactly that change and reveals the right request`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const id = await trackedManager(page);
      await openFilters(page);
      await page.locator('[data-filter="search"]').fill('لا يوجد اسم بهذا النص');
      await expect(page.locator('[data-filter-empty]')).toBeVisible();
      await expect(row(page, id)).toHaveCount(0);
      const stateBefore = await requestsOf(page);
      const keyBefore = await guideKey(page);
      await page.locator('[data-guide-show-tracked]').click();
      const notice = page.locator('[data-guide-not-shown="filtered"]');
      await expect(notice).toContainText('التصفية الحالية تخفي الطلب المتتبَّع');
      await expect(page.locator('[data-guide-clear-show]')).toHaveText('إزالة التصفية وعرض الطلب');
      // nothing was cleared, selected or decided by itself
      expect(await page.locator('[data-filter="search"]').inputValue()).toBe('لا يوجد اسم بهذا النص');
      await expect(row(page, id)).toHaveCount(0);
      expect(await requestsOf(page)).toBe(stateBefore);
      expect(await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && (!!a.closest('[data-guide]') || a.tagName === 'H1'); })).toBe(true); // focus stays on a real element, never <body>
      // the announcer carries the same sentence once
      expect(await page.locator('[data-guide-announcer]').textContent()).toContain('التصفية الحالية تخفي الطلب المتتبَّع');
      // the explicit action
      await page.locator('[data-guide-clear-show]').click();
      await expect(row(page, id)).toBeVisible();
      await expect(row(page, id)).toBeInViewport();
      expect(await page.locator('[data-filter="search"]').inputValue()).toBe('');
      await expect(page.locator('[data-filter-empty]')).toHaveCount(0);
      await expect(page.locator('[data-guide-not-shown]')).toHaveCount(0);
      const focused = await page.evaluate(requestId => { const a = document.activeElement; return { inRow: !!a?.closest(`[data-request-id="${requestId}"]`), tag: a?.tagName }; }, id);
      expect(focused.inRow, 'focus lands on the request\'s own action').toBe(true);
      expect(await requestsOf(page)).toBe(stateBefore); // the request and every other request are untouched
      expect(await guideKey(page)).toEqual(keyBefore); // no other request was chosen
      expect(await phase(page)).toBe('awaiting_manager');
      await noOverflow(page);
    });
  }

  test('a status/risk filter that hides it is handled the same way, and only the announced filter change is applied', async ({ page }) => {
    const id = await trackedManager(page);
    await openFilters(page);
    const options = await page.locator('[data-filter="risk"] option').evaluateAll(list => list.map(o => (o as HTMLOptionElement).value));
    expect(options.filter(value => value !== 'all' && value !== '').length, 'the risk filter must offer a value other than all').toBeGreaterThan(0);
    // find a risk value that hides the tracked row
    let hidden = false;
    for (const value of options.filter(v => v !== 'all' && v !== '')) {
      await page.locator('[data-filter="risk"]').selectOption(value);
      if ((await row(page, id).count()) === 0) { hidden = true; break; }
    }
    expect(hidden, 'some risk value must hide the tracked request, otherwise this test proves nothing').toBe(true);
    await page.locator('[data-guide-show-tracked]').click();
    await expect(page.locator('[data-guide-not-shown="filtered"]')).toBeVisible();
    await page.locator('[data-guide-clear-show]').click();
    await expect(row(page, id)).toBeVisible();
    expect(await page.locator('[data-filter="risk"]').inputValue()).toBe('all');
  });

  test('visible request: scrolls to it, focuses its action, no message, and scrolling is instant (also with Reduced Motion)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    const id = await trackedManager(page);
    const result = await page.evaluate(requestId => {
      const button = document.querySelector<HTMLElement>('[data-guide-show-tracked]')!;
      button.click(); // synchronous: an instant scroll has already happened when this returns
      const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-request-id="${requestId}"]`)).find(node => node.getClientRects().length > 0)!;
      const r = target.getBoundingClientRect();
      return { inView: r.top >= 0 && r.bottom <= innerHeight, focusedInRow: !!document.activeElement?.closest(`[data-request-id="${requestId}"]`), smooth: getComputedStyle(document.documentElement).scrollBehavior };
    }, id);
    expect(result.inView).toBe(true);
    expect(result.focusedInRow).toBe(true);
    expect(result.smooth).not.toBe('smooth');
    await expect(page.locator('[data-guide-not-shown]')).toHaveCount(0);
  });

  test('the user changing the filter themselves removes the stale message', async ({ page }) => {
    const id = await trackedManager(page);
    await openFilters(page);
    await page.locator('[data-filter="search"]').fill('لا يوجد اسم بهذا النص');
    await page.locator('[data-guide-show-tracked]').click();
    await expect(page.locator('[data-guide-not-shown="filtered"]')).toBeVisible();
    await page.locator('[data-filter="search"]').fill('');
    await expect(page.locator('[data-guide-not-shown]')).toHaveCount(0);
    await expect(row(page, id)).toBeVisible();
  });

  test('the Manager\'s permissions are untouched: only requests waiting for the Manager are revealed, and nothing is decided', async ({ page }) => {
    const id = await trackedManager(page);
    const before = await requestsOf(page);
    await openFilters(page);
    await page.locator('[data-filter="search"]').fill('zzz');
    await page.locator('[data-guide-show-tracked]').click();
    await page.locator('[data-guide-clear-show]').click();
    await expect(row(page, id)).toBeVisible();
    expect(await requestsOf(page)).toBe(before);
    await expect(row(page, id).locator('[data-action="reject"]')).toBeVisible(); // the same actions the page already offered
  });
});

/* ------------------------------------------------------------------------------------------------ O-5 */
test.describe('O-5: a failed login keeps what was typed and never doubles a sign-in', () => {
  const idField = '#kd-login-id';
  const passwordField = '#kd-login-password';
  const submitButton = 'form button[type="submit"]';

  for (const [width, height] of [[1440, 900], [390, 844]] as const) {
    test(`at ${width}px: failed attempt, kept values, generic message, focus, correction, success`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await freshDemo(page);
      await page.fill(idField, 'manager-demo'); await page.fill(passwordField, 'wrong');
      await page.locator(submitButton).click();
      const alert = page.locator('#kd-login-error');
      await expect(alert).toHaveText(DEMO_COPY.invalidLogin);
      await expect(page.getByRole('alert')).toHaveCount(1);
      expect(await page.locator(idField).inputValue()).toBe('manager-demo');
      expect(await page.locator(passwordField).inputValue()).toBe('wrong'); // kept
      for (const field of [idField, passwordField]) {
        await expect(page.locator(field)).toHaveAttribute('aria-invalid', 'true');
        expect(await page.locator(field).getAttribute('aria-describedby')).toBe('kd-login-error');
      }
      await expect(page.locator(passwordField)).toBeFocused();
      expect(await page.locator(passwordField).evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 5]); // selected: typing replaces it
      // the message names no detail (which of the two was wrong, which accounts exist)
      expect(await alert.textContent()).not.toMatch(/manager-demo|موجود|غير موجود|لا يوجد حساب|كلمة المرور فقط|المعرّف فقط/);
      // no session, no snapshot, no credential stored anywhere
      await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
      expect(await page.evaluate(key => sessionStorage.getItem(key), SNAPSHOT_KEY)).toBeNull();
      expect(await page.evaluate(() => JSON.stringify({ s: Object.entries(sessionStorage), l: Object.entries(localStorage) }))).not.toMatch(/wrong|manager-demo|Demo2026/);
      // correct by typing over the selected text; editing clears the error state
      await page.keyboard.type(DEMO_PASSWORD);
      await expect(page.locator('#kd-login-error')).toHaveCount(0);
      await expect(page.locator(passwordField)).not.toHaveAttribute('aria-invalid', 'true');
      await page.keyboard.press('Enter'); // Enter submits
      await expect(page.locator('[data-demo-shell]')).toBeVisible();
      const snap = await snapshot(page);
      expect(snap.session).toEqual({ persona: 'manager', loginId: 'manager-demo' });
      expect(await page.evaluate(() => JSON.stringify({ s: Object.values(sessionStorage), l: Object.values(localStorage) }))).not.toContain('Demo2026');
    });
  }

  test('a wrong id with the right password is refused the same way and can be corrected', async ({ page }) => {
    await freshDemo(page);
    await page.fill(idField, 'unknown'); await page.fill(passwordField, DEMO_PASSWORD);
    await page.locator(submitButton).click();
    await expect(page.locator('#kd-login-error')).toHaveText(DEMO_COPY.invalidLogin);
    expect(await page.locator(idField).inputValue()).toBe('unknown');
    await page.fill(idField, 'hr-demo');
    await expect(page.locator('#kd-login-error')).toHaveCount(0);
    await page.locator(submitButton).click();
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
    expect((await snapshot(page)).session).toEqual({ persona: 'hr', loginId: 'hr-demo' });
  });

  // The guard is structural: the controller refuses a second login while a session exists (src/demo/controller.ts) and the sign-in
  // screen unmounts at the first success. Later clicks land on whatever the shell paints there, so this test also asserts that no
  // request, tour state or second write resulted.
  test('rapid repeated clicks and Enter presses sign in exactly once: one session, one write, no duplicated requests or tour state', async ({ page }) => {
    await freshDemo(page); await startGuided(page);
    await page.evaluate(key => {
      const writes: string[] = []; (window as unknown as { __writes: string[] }).__writes = writes;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name: string, value: string) { if (name === key) writes.push(value); return original.call(this, name, value); };
    }, SNAPSHOT_KEY);
    const baselineCount = createBaselineRequests().length; // signing in creates no request: the snapshot only gains the session
    const keyBefore = await guideKey(page);
    await page.locator('[data-quick-fill="employee-demo"]').click();
    await page.locator(submitButton).click({ clickCount: 6, delay: 5 });
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
    await expect(page.locator('[data-demo-login]')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0); // a stale second attempt must not surface an error on the signed-in screen
    const writes = await page.evaluate(() => (window as unknown as { __writes: string[] }).__writes);
    const sessions = writes.filter(value => JSON.parse(value).session);
    expect(sessions.length, 'one persisted sign-in').toBe(1);
    const snap = await snapshot(page);
    expect(snap.session).toEqual({ persona: 'employee', loginId: 'employee-demo' });
    expect(snap.requests.length).toBe(baselineCount);
    expect(await guideKey(page)).toEqual(keyBefore);
    await expect(page.locator('[data-demo-shell]')).toHaveCount(1);
  });

  test('repeated Enter presses on the keyboard behave the same', async ({ page }) => {
    await freshDemo(page);
    await page.locator('[data-quick-fill="manager-demo"]').click();
    await page.locator(passwordField).focus();
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
    expect((await snapshot(page)).session).toEqual({ persona: 'manager', loginId: 'manager-demo' });
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('rapid repeated clicks on a FAILED login show one message and keep the values', async ({ page }) => {
    await freshDemo(page);
    await page.fill(idField, 'manager-demo'); await page.fill(passwordField, 'wrong');
    await page.locator(submitButton).click({ clickCount: 5, delay: 5 });
    await expect(page.getByRole('alert')).toHaveCount(1);
    expect(await page.locator(passwordField).inputValue()).toBe('wrong');
    await expect(page.locator('[data-demo-shell]')).toHaveCount(0);
  });

  test('the public demo accounts still fill the form, and a failed login does not change the tour state', async ({ page }) => {
    await freshDemo(page); await startGuided(page);
    const before = await guideKey(page);
    await page.fill(passwordField, 'wrong');
    await page.locator(submitButton).click();
    await expect(page.locator('#kd-login-error')).toBeVisible();
    expect(await guideKey(page)).toEqual(before);
    expect(Object.keys(await guideKey(page)).sort()).toEqual(['collapsed', 'mode', 'requestId', 'v']); // no credential field in the tour state
    await page.locator('[data-quick-fill="hr-demo"]').click();
    await expect(page.locator('#kd-login-error')).toHaveCount(0);
    expect(await page.locator(idField).inputValue()).toBe('hr-demo');
    expect(await page.locator(passwordField).inputValue()).toBe(DEMO_PASSWORD);
    await page.locator(submitButton).click();
    await expect(page.locator('[data-demo-shell]')).toBeVisible();
  });
});

/* ------------------------------------------------------------------------------------------------ review fixes */
test.describe('O-3/O-4/O-5 review fixes (independent review 2026-11-17)', () => {
  test('the summary never outlives the field messages, and the acknowledgement message never outlives its box', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.locator('.employee-submit').click(); // empty form: start + end flagged
    await expect(page.locator('#employee-error')).toBeVisible();
    await page.fill('#employee-start', '2026-02-01');
    await page.fill('#employee-end', '2026-02-05');
    await expect(page.locator('[data-field-error]')).toHaveCount(0);
    await expect(page.locator('#employee-error')).toHaveCount(0); // no banner without a message under a field
    await page.fill('#employee-duration', '5');
    await page.locator('.employee-submit').click(); // acknowledgement missing
    await expect(page.locator('#employee-ack-error')).toBeVisible();
    await page.fill('#employee-duration', '2'); // within balance: the box disappears, so does its message and the summary
    await expect(page.locator('.employee-warning')).toHaveCount(0);
    await expect(page.locator('#employee-ack-error')).toHaveCount(0);
    await expect(page.locator('#employee-error')).toHaveCount(0);
    await page.fill('#employee-duration', '5'); // the box returns clean
    await expect(page.locator('.employee-warning')).not.toHaveClass(/employee-warning--invalid/);
    await expect(page.locator('#employee-ack-error')).toHaveCount(0);
    expect(await page.locator('.employee-warning input[type=checkbox]').getAttribute('aria-invalid')).toBeNull();
  });

  test('changing a date drops the messages that were computed from it', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-duration-error')).toBeVisible();
    await page.fill('#employee-end', '2026-02-20'); // the limit changed, the old limit message is stale
    await expect(page.locator('#employee-duration-error')).toHaveCount(0);
    await expect(page.locator('#employee-error')).toHaveCount(0);
  });

  test('the acknowledgement checkbox is described by its warning text only (the error is not read twice)', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
    await page.locator('.employee-submit').click();
    const described = await page.locator('.employee-warning input[type=checkbox]').evaluate(el => (el.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent?.trim() ?? ''));
    expect(described).toHaveLength(2);
    expect(described[0]).toContain('أكّد اطلاعك');
    expect(described[1]).toContain('المدة المطلوبة تتجاوز الرصيد');
    expect(described[1]).not.toContain('أكّد اطلاعك');
    expect(described[1]).not.toContain('أقرّ باطلاعي');
  });

  test('320px: the field focused after a refused submit is not covered by the sticky header', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await freshDemo(page); await login(page, 'employee');
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-03'); await page.fill('#employee-duration', '9');
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-duration')).toBeFocused();
    const covered = await page.locator('#employee-duration').evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(hit && (hit === el || el.contains(hit))); });
    expect(covered, 'the focused field must be the element at its own centre').toBe(false);
  });

  test('a second identical failed login is announced again (the alert is re-inserted per attempt)', async ({ page }) => {
    await freshDemo(page);
    await page.fill('#kd-login-id', 'manager-demo'); await page.fill('#kd-login-password', 'wrong');
    await page.evaluate(() => {
      const log: number[] = []; (window as unknown as { __n: number[] }).__n = log;
      new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(node => { if ((node as Element).id === 'kd-login-error') log.push(1); }))).observe(document.body, { childList: true, subtree: true });
    });
    await page.locator('#kd-login-password').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#kd-login-error')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { __n: number[] }).__n.length)).toBe(3);
    await expect(page.getByRole('alert')).toHaveCount(1);
  });

  test('desktop: a collapsed guide opens for the "filter hides it" notice and the saved preference is untouched', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    await submitRequest(page); await switchViaGuide(page);
    await page.getByRole('button', { name: 'إخفاء الشرح' }).click();
    await expect(page.locator('.kd-guide__body')).toBeHidden();
    await page.locator('[data-filter="search"]').fill('لا يوجد اسم بهذا النص');
    await page.locator('button[data-skip-tracked]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-guide-not-shown="filtered"]')).toBeVisible();
    await expect(page.locator('[data-guide-clear-show]')).toBeVisible();
    expect((await guideKey(page)).collapsed).toBe(true);
  });
});

/* ------------------------------------------------------------------------------------------------ O-7 / O-8 (final closure, 2026-11-17) */
test.describe('O-7: 320×640 is a supported target (readable, reachable, no overflow, focus never hidden)', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  // Measures the live page: horizontal overflow, text below 12px, controls below the 44px target (a checkbox is judged by its label row),
  // and anything painted outside the viewport width.
  const audit = (page: Page) => page.evaluate(() => {
    const visible = (el: Element) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !el.closest('[hidden],[aria-hidden="true"]'); };
    const targets: string[] = [], tinyText: string[] = [], outside: string[] = [];
    document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button]').forEach(el => {
      if (!visible(el) || el.closest('.employee-sr,.sr-only')) return;
      const box = (el as HTMLInputElement).type === 'checkbox' ? (el.closest('label') ?? el) : el; const r = box.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) targets.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)} ${(el.textContent ?? '').trim().slice(0, 20)}`);
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement; if (!node.textContent?.trim() || !parent || !visible(parent) || parent.closest('script,style,.employee-sr,.sr-only')) continue;
      const size = parseFloat(getComputedStyle(parent).fontSize); if (size < 12) tinyText.push(`${size}px ${node.textContent.trim().slice(0, 20)}`);
    }
    document.querySelectorAll('body *').forEach(el => { if (!visible(el)) return; const r = el.getBoundingClientRect(); if (r.right > innerWidth + 0.5 || r.left < -0.5) outside.push(`${el.tagName}.${String(el.className).slice(0, 24)}`); });
    return { scrollWidth: document.documentElement.scrollWidth, targets, tinyText, outside };
  });
  const expectSupported = async (page: Page) => {
    const found = await audit(page);
    expect(found.scrollWidth, 'no horizontal scroll').toBeLessThanOrEqual(320);
    expect(found.tinyText, 'no text below 12px').toEqual([]);
    expect(found.targets, 'every control is a 44px target').toEqual([]);
    expect(found.outside, 'nothing painted outside the viewport width').toEqual([]);
  };
  // A control reached by Tab must be the element at its own centre (not under the sticky header or the bottom bar).
  const tabbedControlsAreNotCovered = async (page: Page, count: number) => {
    for (let step = 0; step < count; step += 1) {
      await page.keyboard.press('Tab');
      const covered = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null; if (!el || el === document.body) return 'body';
        const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
        return hit && (hit === el || el.contains(hit) || hit.contains(el) || el.closest('label')?.contains(hit)) ? null : `${el.tagName} covered by ${hit?.tagName}.${String(hit?.className).slice(0, 30)}`;
      });
      expect(covered, `Tab stop ${step + 1}`).toBeNull();
    }
  };

  test('sign-in, hint, Employee form and its success state', async ({ page }) => {
    await freshDemo(page); await expectSupported(page);
    await startGuided(page); await expectSupported(page);
    await signInSuggested(page); await expectSupported(page);
    await page.fill('#employee-start', '2026-02-01'); await page.fill('#employee-end', '2026-02-05'); await page.fill('#employee-duration', '5');
    await expectSupported(page); // the over-balance warning and the acknowledgement row are present
    await page.locator('#employee-start').focus(); await tabbedControlsAreNotCovered(page, 4);
    await page.locator('.employee-warning input[type=checkbox]').check(); await page.locator('.employee-submit').click();
    await expect(page.locator('.employee-success')).toBeVisible(); await expectSupported(page);
  });

  test('the first form field is reachable by one scroll and an error leaves the message and field visible', async ({ page }) => {
    await freshDemo(page); await login(page, 'employee');
    await page.locator('#employee-start').scrollIntoViewIfNeeded();
    const start = await page.locator('#employee-start').boundingBox();
    expect(start!.y).toBeGreaterThanOrEqual(0); expect(start!.y + start!.height).toBeLessThanOrEqual(640);
    await page.locator('.employee-submit').click();
    await expect(page.locator('#employee-start')).toBeFocused();
    for (const id of ['#employee-start', '#employee-start-error']) {
      const box = await page.locator(id).boundingBox();
      expect(box!.y, `${id} below the sticky header`).toBeGreaterThanOrEqual(96); expect(box!.y + box!.height).toBeLessThanOrEqual(640);
    }
    await expectSupported(page);
  });

  test('Manager inbox with the guide, filters open, and the hand-off to HR', async ({ page }) => {
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    await submitRequest(page); await switchViaGuide(page);
    await expectSupported(page);
    await openFilters(page); await expectSupported(page);
    await escalate(page);
    await expectSupported(page);
  });

  test('console stays clean through the 320px journey', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) problems.push(message.text().slice(0, 160)); });
    page.on('pageerror', error => problems.push(String(error).slice(0, 160)));
    await freshDemo(page); await startGuided(page); await signInSuggested(page);
    await submitRequest(page); await switchViaGuide(page); await openFilters(page);
    expect(problems).toEqual([]);
  });
});

test.describe('O-8: a failed sign-in says what to do next without revealing which field was wrong', () => {
  test('the message carries a recovery step and is identical for a wrong id and a wrong password', async ({ page }) => {
    await freshDemo(page);
    const alert = page.locator('#kd-login-error');
    await page.fill('#kd-login-id', 'manager-demo'); await page.fill('#kd-login-password', 'wrong');
    await page.locator('form button[type="submit"]').click();
    await expect(alert).toHaveText(DEMO_COPY.invalidLogin);
    expect(DEMO_COPY.invalidLogin).toContain('أعد المحاولة');
    const wrongPassword = await alert.textContent();
    await page.fill('#kd-login-id', 'unknown'); await page.fill('#kd-login-password', DEMO_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(alert).toHaveText(wrongPassword!);
    expect(wrongPassword).not.toMatch(/manager-demo|unknown|موجود|لا يوجد حساب|كلمة المرور فقط|المعرّف فقط/);
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.locator('#kd-login-password')).toBeFocused();
  });
});
