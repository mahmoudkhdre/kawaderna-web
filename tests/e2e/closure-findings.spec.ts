import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { escalate, freshDemo, freshHrReview, freshManager, login, sessionAction, snapshot } from './demo-helpers';

// Regression cover for the final demo findings closure (2026-11-14): Inbox filters, readability,
// buyer-facing polish, Landing accuracy and the smaller accessibility findings.

const IDS = ['LV-2026-101', 'LV-2026-102', 'LV-2026-103', 'LV-2026-104', 'LV-2026-105', 'LV-2026-106'];
const layoutOf = (page: Page) => ((page.viewportSize()?.width ?? 1440) < 768 ? 'cards' : 'table');
const rowIds = (page: Page) =>
  page.locator(`[data-layout="${layoutOf(page)}"] [data-request-id]`).evaluateAll((els) => els.map((el) => el.getAttribute('data-request-id')));
const visibleIds = async (page: Page) => (await rowIds(page)) as string[];

async function openFilters(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) >= 768) return;
  const toggle = page.locator('[data-filter-toggle]');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}
const filter = (page: Page, name: 'search' | 'status' | 'risk' | 'sla') => page.locator(`[data-filter="${name}"]`);

for (const width of [1440, 375]) {
  test.describe(`Inbox filters at ${width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await freshManager(page);
      await openFilters(page);
    });

    test('shows all six requests by default and filtering changes nothing in stored state', async ({ page }) => {
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(page.locator('[data-filter-summary]')).toHaveText('');
      const before = JSON.stringify(await snapshot(page));
      await filter(page, 'search').fill('سارة');
      await filter(page, 'sla').selectOption('overdue');
      await filter(page, 'sla').selectOption('all');
      await filter(page, 'search').fill('');
      expect(JSON.stringify(await snapshot(page))).toBe(before);
      expect(await visibleIds(page)).toEqual(IDS);
    });

    test('search matches name and request ID, ignoring hamza and Arabic-Indic digits', async ({ page }) => {
      await filter(page, 'search').fill('سارة');
      expect(await visibleIds(page)).toEqual(['LV-2026-102']);
      await expect(page.locator('[data-filter-summary]')).toHaveText('النتائج: ١ من ٦');
      await filter(page, 'search').fill('احمد');
      expect(await visibleIds(page)).toEqual(['LV-2026-101']);
      await filter(page, 'search').fill('LV-٢٠٢٦-١٠٥');
      expect(await visibleIds(page)).toEqual(['LV-2026-105']);
    });

    test('status, risk and SLA filters work alone and together', async ({ page }) => {
      await filter(page, 'status').selectOption('pending:requester_clarification');
      expect(await visibleIds(page)).toEqual(['LV-2026-105']);
      await filter(page, 'status').selectOption('pending:escalated');
      expect(await visibleIds(page)).toEqual(['LV-2026-106']);
      await filter(page, 'status').selectOption('all');

      await filter(page, 'risk').selectOption('LEAVE_LOW_BALANCE');
      expect(await visibleIds(page)).toEqual(['LV-2026-102']);
      await filter(page, 'risk').selectOption('none');
      expect(await visibleIds(page)).toEqual(['LV-2026-101', 'LV-2026-103', 'LV-2026-104', 'LV-2026-106']);

      await filter(page, 'sla').selectOption('overdue');
      expect(await visibleIds(page)).toEqual(['LV-2026-104']);
      await filter(page, 'sla').selectOption('not_overdue');
      expect(await visibleIds(page)).toEqual(['LV-2026-101', 'LV-2026-103', 'LV-2026-106']);
    });

    test('an empty result explains itself and one action restores the full list', async ({ page }) => {
      await filter(page, 'search').fill('نورة');
      await filter(page, 'sla').selectOption('not_overdue');
      await expect(page.locator('[data-filter-empty]')).toHaveText('لا توجد طلبات مطابقة للتصفية الحالية');
      await expect(page.locator('[data-layout]')).toHaveCount(0);
      await expect(page.locator('[data-filter-summary]')).toHaveText('النتائج: ٠ من ٦');
      await page.locator('[data-filter-clear]').click();
      expect(await visibleIds(page)).toEqual(IDS);
      await expect(filter(page, 'search')).toHaveValue('');
      await expect(filter(page, 'status')).toHaveValue('all');
      await expect(filter(page, 'risk')).toHaveValue('all');
      await expect(filter(page, 'sla')).toHaveValue('all');
      await expect(page.locator('[data-filter-clear]')).toHaveCount(0);
    });

    test('is keyboard operable and every control has a visible label and a name', async ({ page }) => {
      await filter(page, 'search').focus();
      await page.keyboard.type('العتيبي');
      expect(await visibleIds(page)).toEqual(['LV-2026-103']);
      for (const name of ['search', 'status', 'risk', 'sla'] as const) {
        const box = await filter(page, name).boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        const labelText = await filter(page, name).evaluate((el) => document.querySelector(`label[for="${el.id}"]`)!.textContent!);
        await expect(page.getByLabel(labelText, { exact: true })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });

    test('a decision made while filtered keeps the filter, appends one audit event and refreshes the options', async ({ page }) => {
      await filter(page, 'risk').selectOption('LEAVE_LOW_BALANCE');
      expect(await visibleIds(page)).toEqual(['LV-2026-102']);
      await page.locator(`[data-layout="${layoutOf(page)}"] [data-request-id="LV-2026-102"] [data-open-detail]`).click();
      await page.locator('[data-detail] [data-action="approve"]').click();
      await expect(page.locator('[data-detail]')).toContainText('تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
      await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
      await openFilters(page);
      await expect(filter(page, 'risk')).toHaveValue('LEAVE_LOW_BALANCE');
      expect(await visibleIds(page)).toEqual(['LV-2026-102']);
      await expect(filter(page, 'status').locator('option')).toContainText(['الكل', 'قيد المراجعة • الموارد البشرية']);
      const request = (await snapshot(page)).requests.find((r: { requestId: string }) => r.requestId === 'LV-2026-102');
      expect(request.approvalStage).toBe('hr');
      expect(request.auditHistory.filter((e: { eventType: string }) => e.eventType === 'escalation')).toHaveLength(1);
    });
  });
}

test('filters are screen state only: a reload returns the complete Inbox', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshManager(page);
  await filter(page, 'search').fill('سارة');
  expect(await visibleIds(page)).toEqual(['LV-2026-102']);
  await page.reload();
  expect(await visibleIds(page)).toEqual(IDS);
});

test('mobile: «تصفية وبحث» is the only visible filter entry and reports its state and active count', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await freshManager(page);
  const toggle = page.locator('[data-filter-toggle]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('تصفية وبحث');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(filter(page, 'search')).toBeHidden();
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await filter(page, 'sla').selectOption('overdue');
  await expect(page.locator('[data-filter-count]')).toHaveText('١');
});

test('desktop: the toggle button is not shown and the four controls are visible together', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshManager(page);
  await expect(page.locator('[data-filter-toggle]')).toBeHidden();
  for (const name of ['search', 'status', 'risk', 'sla'] as const) await expect(filter(page, name)).toBeVisible();
});

// ------------------------------------------------------------------ P2: readability

const contrast = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) => {
    const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = (rgb: number[]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    return els.map((el) => {
      let opacity = 1;
      for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      const fg = getComputedStyle(el).color.match(/\d+(\.\d+)?/g)!.map(Number);
      const mixed = [0, 1, 2].map((i) => Math.round(fg[i] * opacity + 255 * (1 - opacity)));
      const [a, b] = [lum(mixed) + 0.05, 1.05];
      return { opacity, ratio: Math.round((b / a) * 100) / 100 };
    });
  });

for (const width of [1440, 768, 375]) {
  test(`request IDs and non-actionable rows meet 4.5:1 without opacity dimming at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    const layout = layoutOf(page);
    const ids = await contrast(page, `[data-layout="${layout}"] .ltr-isolated`);
    expect(ids).toHaveLength(6);
    for (const item of ids) { expect(item.opacity).toBe(1); expect(item.ratio).toBeGreaterThanOrEqual(4.5); }
    const muted = page.locator(`[data-layout="${layout}"] [data-muted="true"]`);
    await expect(muted).toHaveCount(2); // clarification and escalated/HR fixtures
    for (const id of ['LV-2026-105', 'LV-2026-106']) {
      const cells = await contrast(page, `[data-layout="${layout}"] [data-request-id="${id}"], [data-layout="${layout}"] [data-request-id="${id}"] *`);
      for (const item of cells) { expect(item.opacity).toBe(1); expect(item.ratio).toBeGreaterThanOrEqual(4.5); }
    }
  });
}

for (const width of [768, 1024, 1280]) {
  test(`tablet table keeps each request ID on one line and does not overflow at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    const lines = await page.locator('[data-layout="table"] .ltr-isolated').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))));
    expect(lines).toEqual([1, 1, 1, 1, 1, 1]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

// ------------------------------------------------------------------ P4 / P5: buyer-facing accuracy

test('tab title, description and favicon identify Kawaderna, not the scaffold', async ({ page }) => {
  await page.goto('/');
  // Commercial V1 metadata: the Landing positions the design and development foundation, and says it is not a ready-to-run platform.
  await expect(page).toHaveTitle('كوادرنا — أساس تصميم وتطوير منصات الموارد البشرية العربية');
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toContain('ديمو الإجازات');
  expect(description).toContain('ليست منصة جاهزة للتشغيل');
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  const svg = await (await page.request.get(href!)).text();
  expect(svg).toContain('كوادرنا');
  expect(svg).not.toContain('#863bff'); // the Vite logo colour
});

test('the Landing describes the Employee step as available, and the step really works', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const employee = page.locator('#journey li, #journey article').filter({ hasText: 'يرفع الطلب' }).first();
  await expect(employee).toContainText('متاح في الديمو');
  await expect(page.locator('body')).not.toContainText('قيد الربط');
  await freshDemo(page);
  await login(page, 'employee');
  await expect(page.locator('main')).toContainText('الرصيد التجريبي المتاح');
});

// ------------------------------------------------------------------ P6: smaller findings

test('login lists the accounts in journey order with 44px quick-fill buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshDemo(page);
  const order = await page.locator('[data-demo-account]').evaluateAll((els) => els.map((el) => el.getAttribute('data-demo-account')));
  expect(order).toEqual(['employee-demo', 'manager-demo', 'hr-demo']);
  for (const box of await page.locator('[data-quick-fill]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
});

test('signing in and out moves focus to the new screen instead of leaving it on the page body', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshDemo(page);
  await login(page, 'manager');
  await expect(page.locator('[data-demo-shell] main h1')).toBeFocused();
  await sessionAction(page, 'logout');
  await expect(page.locator('#kd-login-title')).toBeFocused();
  await page.reload();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY'); // a reload must not steal focus
});

for (const width of [1440, 375]) {
  test(`the shell has a skip link that appears on focus and moves focus to the content at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await freshManager(page);
    const skip = page.locator('[data-skip-link]');
    await expect(skip).toHaveText('تخطي إلى المحتوى الرئيسي');
    expect((await skip.boundingBox())!.y).toBeLessThan(0); // hidden until focused
    await skip.focus();
    const box = (await skip.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('MAIN');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true);
  });
}

test('mobile cards: targets are at least 44px and every row action has its own accessible name', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await freshManager(page);
  const sizes = await page.locator('[data-layout="cards"] button').evaluateAll((els) =>
    els.map((el) => ({ name: el.getAttribute('aria-label'), h: el.getBoundingClientRect().height })));
  expect(sizes.length).toBeGreaterThan(6);
  for (const item of sizes) expect(item.h).toBeGreaterThanOrEqual(44);
  const names = sizes.map((item) => item.name);
  expect(new Set(names).size).toBe(names.length);
  expect(names.every((name) => /LV-2026-\d{3}/.test(name!))).toBe(true);
});

test('the Employee validation message has room above the submit button', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshDemo(page);
  await login(page, 'employee');
  await page.getByRole('button', { name: 'إرسال الطلب' }).click();
  const gap = await page.evaluate(() => {
    const error = document.querySelector('.employee-error')!.getBoundingClientRect();
    const submit = document.querySelector('.employee-submit')!.getBoundingClientRect();
    return submit.top - error.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(8);
});

for (const [width, height] of [[1440, 900], [375, 812]] as const) {
  test(`opening the HR rejection form brings the Confirm button into view at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await freshHrReview(page);
    await page.getByRole('button', { name: 'رفض الطلب' }).click();
    const confirm = page.getByRole('button', { name: 'تأكيد القرار' });
    await expect(confirm).toBeVisible();
    const bottom = await confirm.evaluate((el) => el.getBoundingClientRect().bottom);
    const limit = await page.evaluate(() => {
      const nav = document.querySelector('[data-demo-mobile-nav]')?.getBoundingClientRect();
      return nav && nav.height > 0 ? nav.top : window.innerHeight; // the mobile nav is hidden on desktop
    });
    expect(bottom).toBeLessThanOrEqual(limit);
  });
}

// ---------------------------------------------------------------------------------------------
// Owner decisions of 2026-11-14 (final closure): R-2 date, R-4 tablet acceptance, no unspecified
// sorting / due-soon controls.
// ---------------------------------------------------------------------------------------------

test('R-2: all six baseline requests were submitted 17 January 09:00 Riyadh, and the audit trail agrees', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshManager(page);
  const state = (await snapshot(page)).requests as Array<{
    requestId: string; submittedAt: string; createdAt: string;
    auditHistory: Array<{ eventType: string; timestamp: string }>;
  }>;
  const inbox = state.filter((r) => IDS.includes(r.requestId));
  expect(inbox.map((r) => r.requestId)).toEqual(IDS);
  for (const r of inbox) {
    expect(r.submittedAt, r.requestId).toBe('2026-01-17T06:00:00.000Z');
    const submissions = r.auditHistory.filter((e) => e.eventType === 'submission');
    expect(submissions, r.requestId).toHaveLength(1);
    expect(submissions[0].timestamp, r.requestId).toBe(r.submittedAt);
    const times = r.auditHistory.map((e) => Date.parse(e.timestamp));
    expect(times, r.requestId).toEqual([...times].sort((a, b) => a - b));
    expect(Date.parse(r.createdAt), r.requestId).toBeLessThanOrEqual(Date.parse(r.submittedAt));
  }
});

test('R-2: the request detail shows the same 17 January submission time in the summary and the timeline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshManager(page);
  await page.getByRole('button', { name: /رقم LV-2026-101/ }).first().click();
  const body = page.locator('main');
  await expect(body).toContainText('تاريخ التقديم');
  const text = await body.innerText();
  const day = /(١٧|17)/;
  // The summary field puts the label and its value on separate lines; read the value that follows the label.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const value = lines[lines.findIndex((l) => l === 'تاريخ التقديم') + 1];
  expect(value).toMatch(day);
  expect(value).not.toMatch(/(١٥|15)\s*(يناير|\/)/);
  // The timeline entry for the submission carries the same formatted instant.
  expect(lines.filter((l) => l.includes(value.replace('تاريخ التقديم', '').trim())).length).toBeGreaterThanOrEqual(2);
});

for (const width of [768, 1024]) {
  test(`R-4 acceptance: at ${width}px the Inbox is usable, readable, unclipped and has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    // No horizontal page overflow.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // All four filter controls are visible, enabled and inside the viewport.
    for (const name of ['search', 'status', 'risk', 'sla'] as const) {
      const control = filter(page, name);
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
    // Table cells: nothing clipped, nothing smaller than 12px.
    const cells = await page.locator('[data-layout="table"] td, [data-layout="table"] th').evaluateAll((els) =>
      els.map((el) => {
        const c = el as HTMLElement;
        const style = getComputedStyle(c);
        return {
          clipped: c.scrollWidth - c.clientWidth > 1,
          font: parseFloat(style.fontSize),
          right: c.getBoundingClientRect().right,
          left: c.getBoundingClientRect().left,
        };
      }));
    expect(cells.length).toBeGreaterThan(6);
    for (const cell of cells) {
      expect(cell.clipped).toBe(false);
      expect(cell.font).toBeGreaterThanOrEqual(12);
      expect(cell.left).toBeGreaterThanOrEqual(-1);
      expect(cell.right).toBeLessThanOrEqual(width + 1);
    }
    // Every row action is visible and is the element that receives a click at its centre (nothing overlaps it).
    const actions = await page.locator('[data-layout="table"] tbody button').evaluateAll((els) =>
      els.map((el) => {
        el.scrollIntoView({ block: 'center' }); // elementFromPoint only sees the viewport
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { visible: r.width > 0 && r.height > 0, reachable: !!top && (top === el || el.contains(top)), inView: r.left >= 0 && r.right <= window.innerWidth };
      }));
    expect(actions.length).toBeGreaterThan(6);
    for (const a of actions) expect(a).toEqual({ visible: true, reachable: true, inView: true });
  });
}

for (const width of [1440, 768, 375]) {
  test(`no Inbox control promises sorting or a due-soon choice at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await freshManager(page);
    await openFilters(page);
    // No sortable column headers and no sort wording anywhere in the screen.
    await expect(page.locator('[aria-sort]')).toHaveCount(0);
    await expect(page.locator('[data-layout="table"] th button, [data-layout="table"] th [role="button"]')).toHaveCount(0);
    const main = await page.locator('main').innerText();
    for (const word of ['ترتيب', 'فرز', 'قريب الاستحقاق', 'قريب من الاستحقاق', 'سيستحق']) expect(main).not.toContain(word);
    // The SLA filter offers exactly the two real choices plus «all».
    const sla = await filter(page, 'sla').locator('option').allInnerTexts();
    expect(sla).toEqual(['الكل', 'متأخر', 'غير متأخر']);
    // Every visible native control in the filter bar is one of the four documented filters (plus clear).
    const names = await page.locator('[data-filters] select, [data-filters] input, [data-filters] button').evaluateAll((els) =>
      els.filter((el) => (el as HTMLElement).offsetParent !== null).map((el) => el.getAttribute('data-filter') ?? el.getAttribute('data-filter-toggle') ?? el.getAttribute('data-filter-clear') ?? 'unknown'));
    expect(names.filter((n) => n === 'unknown')).toEqual([]);
  });
}

// The escalate helper is re-exported here so the HR spec above can rely on a single import list.
void escalate;
