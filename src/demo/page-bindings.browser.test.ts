import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium, expect as browserExpect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import type { DemoEntry } from './ui-contract';
import type { HrDecisionBinding } from './contracts';

declare global {
  interface Window {
    chainA: DemoEntry;
    chainAReady: boolean;
    chainARenderHr: (binding: HrDecisionBinding) => void;
  }
}

// This virtual test entry exercises the real pages/useDemo without adding a product shell.
const virtualId = '\0chain-a-pages';
const harness = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { useDemo } from '/src/demo/useDemo.ts';
import { ManagerInboxPage } from '/src/pages/ManagerInbox/ManagerInboxPage.tsx';
import { HRFinalDecisionPage } from '/src/pages/HRFinalDecision/HRFinalDecisionPage.tsx';
import '/src/index.css';
const root = createRoot(document.getElementById('root'));
window.chainAReady = false;
function Harness() {
  const entry = useDemo(); window.chainA = entry; window.chainAReady = true;
  return entry.manager ? React.createElement(ManagerInboxPage, {binding: entry.manager})
    : entry.hr ? React.createElement(HRFinalDecisionPage, {binding: entry.hr}) : null;
}
window.chainARenderHr = binding => root.render(React.createElement(HRFinalDecisionPage, {binding}));
root.render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
`;

describe('Chain A rendered bindings without Login/shell composition', () => {
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;
  let errors: string[];
  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('../../', import.meta.url)), server: { host: '127.0.0.1', port: 0 },
      // Isolate the optimizer from the concurrently running presentation harness.
      cacheDir: fileURLToPath(new URL('../../node_modules/.vite-chain-a-tests', import.meta.url)),
      plugins: [{
        name: 'chain-a-pages-test', resolveId: id => id === '/__chain_a.js' ? virtualId : undefined,
        load: id => id === virtualId ? harness : undefined,
        configureServer(instance) {
          instance.middlewares.use(async (req, res, next) => {
            if (req.url !== '/__chain_a') return next();
            const html = await instance.transformIndexHtml('/__chain_a', '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__chain_a.js"></script></body></html>');
            res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
          });
        },
      }],
    });
    await server.listen();
    const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    browser = await chromium.launch({ executablePath: process.env.KAWADERNA_BROWSER ?? (existsSync(chrome) ? chrome : undefined), headless: true });
  }, 45000);
  afterAll(async () => { try { await browser?.close(); } finally { await server?.close(); } }, 45000);
  beforeEach(async () => {
    errors = []; page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${server.resolvedUrls!.local[0]}__chain_a`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.chainAReady);
  }, 45000);
  afterEach(async () => { await page?.close(); expect(errors).toEqual([]); }, 15000);
  const escalate = async () => {
    await page.evaluate(() => window.chainA.login('manager-demo', 'Demo2026!'));
    await page.locator('[data-layout="table"] [data-request-id="LV-2026-102"] [data-open-detail]').click();
    await browserExpect(page.locator('[data-detail] [data-action="reject"]')).toHaveCount(0);
    await page.locator('[data-detail] [data-action="approve"]').click();
    await browserExpect(page.locator('[data-detail]')).toContainText('تمت موافقتك على الطلب وتحويله إلى الموارد البشرية');
    await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
    await page.evaluate(() => { window.chainA.logout(); window.chainA.login('hr-demo', 'Demo2026!'); });
    await browserExpect(page.getByRole('button', { name: 'موافقة نهائية', exact: true })).toBeVisible();
    await browserExpect(page.locator('main')).toContainText('LV-2026-102');
    await browserExpect(page.locator('main')).not.toContainText('LV-2026-001');
    await browserExpect(page.locator('main')).not.toContainText('LV-2026-106');
  };
  it('renders baseline HR empty with no controls or overflow at six RTL widths', async () => {
    await page.evaluate(() => window.chainA.login('hr-demo', 'Demo2026!'));
    for (const width of [320, 360, 375, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      await browserExpect(page.getByText('لا توجد طلبات بانتظار مراجعتك حاليًا', { exact: true })).toBeVisible();
      await browserExpect(page.locator('main button')).toHaveCount(0);
      await browserExpect(page.locator('main')).toHaveAttribute('dir', 'rtl');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }, 30000);
  it.each(['approve', 'reject'] as const)('keeps the shared request and read-only HR %s outcome after reload', async decision => {
    await escalate();
    const before = await page.evaluate(() => window.chainA.requests[1].auditHistory.length);
    await page.getByRole('button', { name: decision === 'approve' ? 'موافقة نهائية' : 'رفض الطلب', exact: true }).click();
    const confirm = page.getByRole('button', { name: 'تأكيد القرار', exact: true });
    if (decision === 'reject') {
      await browserExpect(confirm).toBeDisabled();
      await page.getByLabel('سبب الرفض للموظف').fill('😀'.repeat(501));
      await browserExpect(confirm).toBeDisabled();
      await page.getByLabel('سبب الرفض للموظف').fill('سبب واضح');
    }
    await confirm.click();
    const heading = decision === 'approve' ? 'تمت الموافقة النهائية' : 'تم الرفض النهائي';
    await browserExpect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await browserExpect(page.locator('main button')).toHaveCount(0);
    expect(await page.evaluate(() => ({ id: window.chainA.hr!.requestId, version: window.chainA.requests[1].version, count: window.chainA.requests[1].auditHistory.length, actor: window.chainA.requests[1].auditHistory.at(-1)!.actor, at: window.chainA.requests[1].auditHistory.at(-1)!.timestamp.toISOString() }))).toEqual({ id: 'LV-2026-102', version: 1, count: before + 1, actor: 'HR-1', at: '2026-01-18T07:00:00.000Z' });
    await page.reload();
    await page.waitForFunction(() => window.chainAReady && window.chainA.session?.persona === 'hr');
    await browserExpect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await browserExpect(page.locator('main button')).toHaveCount(0);
    expect(await page.evaluate(() => window.chainA.requests[1].auditHistory.at(-1)!.timestamp instanceof Date)).toBe(true);
    await page.evaluate(() => { window.chainA.requestReset(); window.chainA.cancelReset(); });
    expect(await page.evaluate(() => window.chainA.hr!.requestId)).toBe('LV-2026-102');
    await page.evaluate(() => { window.chainA.requestReset(); window.chainA.confirmReset(); });
    await page.waitForFunction(() => window.chainA.session === null);
    expect(await page.evaluate(() => window.chainA.requests[1].approvalStage)).toBe('manager');
    await page.reload(); await page.waitForFunction(() => window.chainAReady);
    expect(await page.evaluate(() => window.chainA.session)).toBeNull();
  }, 30000);
  it('discards rejection drafts when HR selection, version or actor changes', async () => {
    await escalate();
    await page.getByRole('button', { name: 'رفض الطلب', exact: true }).click();
    await page.getByLabel('سبب الرفض للموظف').fill('مسودة لا تنتقل إلى طلب آخر');
    await page.evaluate(() => window.chainARenderHr({ ...window.chainA.hr!, requestId: null }));
    await browserExpect(page.getByText('لا توجد طلبات بانتظار مراجعتك حاليًا', { exact: true })).toBeVisible();
    await page.evaluate(() => window.chainARenderHr(window.chainA.hr!));
    await page.getByRole('button', { name: 'رفض الطلب', exact: true }).click();
    await browserExpect(page.getByLabel('سبب الرفض للموظف')).toHaveValue('');
    await page.getByLabel('سبب الرفض للموظف').fill('مسودة نسخة قديمة');
    await page.evaluate(() => window.chainARenderHr({ ...window.chainA.hr!, requests: window.chainA.requests.map(request => request.requestId === 'LV-2026-102' ? { ...request, version: 2 } : request) }));
    await browserExpect(page.getByRole('button', { name: 'تأكيد القرار', exact: true })).toHaveCount(0);
    await page.evaluate(() => window.chainARenderHr({ ...window.chainA.hr!, actor: { id: 'MGR-2001', role: 'manager' } }));
    await browserExpect(page.getByText('لا توجد طلبات بانتظار مراجعتك حاليًا', { exact: true })).toBeVisible();
    await browserExpect(page.locator('main button')).toHaveCount(0);
  }, 30000);
});
