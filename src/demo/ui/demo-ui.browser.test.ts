import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chromium, expect as browserExpect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

vi.setConfig({ testTimeout: 30000 });

declare global {
  interface Window { calls: string[]; ready: boolean }
}

// Virtual harness: mounts ONLY the presentation components with recording callbacks (no controller, no App).
const virtualId = '\0gap5-ui-harness';
const harness = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoLogin, DemoShell, DemoResetConfirmation } from '/src/demo/ui/index.ts';
import { getDemoNavigation } from '/src/demo/navigation.ts';
import { UNAVAILABLE_TOAST_BEHAVIOR } from '/src/demo/ui-contract.ts';
import { DEMO_COPY } from '/src/demo/copy.ts';
import { authenticateDemoPersona, DEMO_ACCOUNTS } from '/src/demo/session.ts';
import '/src/index.css';
const view = new URLSearchParams(location.search).get('view');
window.calls = []; window.ready = false;
let nextId = 0;
function Shell() {
  const [notice, setNotice] = useState(null);
  const [reset, setReset] = useState(false);
  const notify = id => { window.calls.push('notify:' + id); setNotice({ id: ++nextId, title: DEMO_COPY.unavailableTitle, message: DEMO_COPY.unavailableMessage }); };
  const toast = { notice, behavior: UNAVAILABLE_TOAST_BEHAVIOR, onDismiss: id => { window.calls.push('dismiss:' + id); setNotice(c => c && c.id === id ? null : c); } };
  return React.createElement(React.Fragment, null,
    React.createElement(DemoShell, { session: DEMO_ACCOUNTS[0], navigation: getDemoNavigation(), onNotifyUnavailable: notify, toast,
      storageNotice: view === 'shell-storage' ? DEMO_COPY.storageUnavailable : null,
      onLogout: () => window.calls.push('logout'), onRequestReset: () => { window.calls.push('request-reset'); setReset(true); } },
      React.createElement('main', null, React.createElement('h1', null, 'صفحة تجريبية'), React.createElement('button', { id: 'page-btn' }, 'زر الصفحة'))),
    React.createElement(DemoResetConfirmation, { open: reset, onCancel: () => { window.calls.push('reset-cancel'); setReset(false); }, onConfirm: () => { window.calls.push('reset-confirm'); setReset(false); } }));
}
function Login() {
  const [recovery, setRecovery] = useState(view === 'login-notices' ? DEMO_COPY.recovery : null);
  return React.createElement(DemoLogin, { onLogin: (id, pw) => { window.calls.push('login:' + id); return authenticateDemoPersona(id, pw); },
    recoveryNotice: recovery, storageNotice: view === 'login-notices' ? DEMO_COPY.storageUnavailable : null, onDismissRecovery: () => { window.calls.push('dismiss-recovery'); setRecovery(null); } });
}
createRoot(document.getElementById('root')).render(view && view.startsWith('login') ? React.createElement(Login) : React.createElement(Shell));
window.ready = true;
`;

const COPY = {
  title: 'ميزة خارج نطاق التجربة',
  message: 'هذه الميزة غير متاحة في النسخة التجريبية الحالية. يعرض الديمو جزءًا من تجربة كوادرنا، بينما يشمل تصميم المنتج الكامل وحدات ووظائف إضافية.',
};
const SIDEBAR_ORDER = ['لوحة التحكم', 'الموظفين', 'الموظفين', 'طلبات الإجازة', 'المهام', 'الرواتب', 'نظام حماية الاجور', 'القروض والسلف', 'التأمين الصحي', 'الصحة المالية', 'الأداء', 'التقارير', 'المساعد الذكي', 'الإعدادات'];

describe('Gap 5 presentation components rendered in Chromium (no App composition)', () => {
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;
  let errors: string[];
  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('../../../', import.meta.url)), server: { host: '127.0.0.1', port: 0 },
      plugins: [{
        name: 'gap5-ui-harness', resolveId: id => id === '/__gap5.js' ? virtualId : undefined,
        load: id => id === virtualId ? harness : undefined,
        configureServer(instance) {
          instance.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__gap5') return next();
            const html = await instance.transformIndexHtml('/__gap5', '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__gap5.js"></script></body></html>');
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
  const open = async (view: string, width = 1440, height = 900, clock = false) => {
    errors = [];
    page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(6000);
    page.on('pageerror', error => errors.push(error.message));
    if (clock) await page.clock.install();
    await page.goto(`${server.resolvedUrls!.local[0]}__gap5?view=${view}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.ready);
    if (clock) await page.clock.pauseAt(new Date(Date.now() + 2000)); // deterministic: time moves only via runFor
  };
  beforeEach(() => { errors = []; });
  afterEach(async () => { await page?.close(); expect(errors).toEqual([]); }, 15000);
  const calls = () => page.evaluate(() => window.calls);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  describe('Login (T012)', () => {
    it('shows only User ID + Password, approved disclosure and visible demo accounts', async () => {
      await open('login');
      await browserExpect(page.getByLabel('معرّف المستخدم', { exact: true })).toBeVisible();
      await browserExpect(page.getByLabel('كلمة المرور', { exact: true })).toBeVisible();
      await browserExpect(page.getByText('نسخة تجريبية من كوادرنا — بيانات وحسابات افتراضية')).toBeVisible();
      await browserExpect(page.locator('[data-demo-account]')).toHaveCount(3);
      await browserExpect(page.locator('[data-demo-account="manager-demo"]')).toContainText('Demo2026!');
      await browserExpect(page.locator('[data-demo-account="hr-demo"]')).toContainText('hr-demo');
      await browserExpect(page.locator('[data-demo-account="employee-demo"]')).toContainText('employee-demo');
      expect(await page.locator('body').innerText()).not.toMatch(/Google|رقم الموظف/);
      await browserExpect(page.locator('input:visible')).toHaveCount(2);
    });
    it.each([['manager-demo'], ['hr-demo'], ['employee-demo']])('quick-fill fills %s and Demo2026! without submitting', async id => {
      await open('login');
      await page.locator(`[data-quick-fill="${id}"]`).click();
      await browserExpect(page.getByLabel('معرّف المستخدم', { exact: true })).toHaveValue(id);
      await browserExpect(page.getByLabel('كلمة المرور', { exact: true })).toHaveValue('Demo2026!');
      expect(await calls()).toEqual([]);
    });
    it('invalid credentials announce the approved alert, clear the password, keep focus and stay recoverable', async () => {
      await open('login');
      await page.getByLabel('معرّف المستخدم', { exact: true }).fill('manager-demo');
      await page.getByLabel('كلمة المرور', { exact: true }).fill('wrong');
      await page.keyboard.press('Enter');
      await browserExpect(page.getByRole('alert')).toHaveText('معرّف المستخدم أو كلمة المرور غير صحيحة');
      await browserExpect(page.getByLabel('كلمة المرور', { exact: true })).toHaveValue('');
      await browserExpect(page.getByLabel('كلمة المرور', { exact: true })).toBeFocused();
      await browserExpect(page.getByLabel('معرّف المستخدم', { exact: true })).toHaveValue('manager-demo');
      await page.getByLabel('كلمة المرور', { exact: true }).fill('D');
      await browserExpect(page.getByRole('alert')).toHaveCount(0);
      expect(await calls()).toEqual(['login:manager-demo']);
    });
    it('valid submit calls onLogin once with the typed id; actor IDs are not special-cased by the UI', async () => {
      await open('login');
      await page.locator('[data-quick-fill="hr-demo"]').click();
      await page.getByRole('button', { name: 'تسجيل دخول', exact: true }).click();
      expect(await calls()).toEqual(['login:hr-demo']);
    });
    it('is keyboard operable in a logical order', async () => {
      await open('login');
      await page.getByLabel('معرّف المستخدم', { exact: true }).focus();
      await page.keyboard.press('Tab');
      await browserExpect(page.getByLabel('كلمة المرور', { exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await browserExpect(page.getByRole('button', { name: 'تسجيل دخول', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      // Accounts are listed in journey order (Employee first), final findings R-10.
      await browserExpect(page.locator('[data-quick-fill="employee-demo"]')).toBeFocused();
      await page.keyboard.press('Enter');
      await browserExpect(page.getByLabel('معرّف المستخدم', { exact: true })).toHaveValue('employee-demo');
    });
    it('keeps card width = min(400, viewport - 32) with no horizontal overflow at the six required widths', async () => {
      await open('login');
      for (const width of [320, 360, 375, 390, 430, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        const box = await page.locator('main.kd-card').boundingBox();
        expect(Math.round(box!.width)).toBe(Math.min(400, width - 32));
        expect(await overflow()).toBe(true);
        await browserExpect(page.getByRole('button', { name: 'تسجيل دخول', exact: true })).toBeVisible();
      }
    });
    it('renders the recovery notice (dismissible) and storage notice as status text', async () => {
      await open('login-notices');
      await browserExpect(page.locator('[data-recovery-notice]')).toContainText('تعذّر استعادة الجلسة السابقة');
      await browserExpect(page.locator('[data-storage-notice]')).toContainText('تعذّر حفظ بيانات التجربة');
      await page.getByRole('button', { name: 'إغلاق' }).click();
      await browserExpect(page.locator('[data-recovery-notice]')).toHaveCount(0);
      await browserExpect(page.locator('[data-storage-notice]')).toHaveCount(1);
      expect(await calls()).toEqual(['dismiss-recovery']);
    });
  });

  describe('Desktop shell (T013)', () => {
    it('shows the typed identity, decorative bell, no language control, Logout and Reset', async () => {
      await open('shell');
      const header = page.locator('[data-demo-header="desktop"]');
      await browserExpect(header).toContainText('فاطمة علي');
      await browserExpect(header.locator('[data-decorative-bell]')).toHaveAttribute('aria-hidden', 'true');
      expect(await header.locator('[data-decorative-bell]').evaluate(el => ({ tab: (el as HTMLElement).tabIndex, button: !!el.closest('button,a'), text: el.textContent }))).toEqual({ tab: -1, button: false, text: '' });
      expect(await page.locator('body').innerText()).not.toContain('English');
      await header.getByRole('button', { name: 'تسجيل الخروج' }).click();
      await header.getByRole('button', { name: 'إعادة ضبط التجربة' }).click();
      expect(await calls()).toEqual(['logout', 'request-reset']);
    });
    it('renders the 14 original sidebar items in order; only Leave is current and AI is unavailable', async () => {
      await open('shell');
      const items = page.locator('[data-demo-sidebar] .kd-rail__item');
      expect(await items.evaluateAll(els => els.map(el => el.getAttribute('aria-label')))).toEqual(SIDEBAR_ORDER);
      await browserExpect(page.locator('[data-demo-sidebar] [aria-current="page"]')).toHaveAttribute('data-nav-id', 'leave');
      await browserExpect(page.locator('[data-demo-sidebar] [data-unavailable]')).toHaveCount(13);
      await browserExpect(page.locator('[data-nav-id="assistant"]')).toHaveAttribute('aria-disabled', 'true');
      expect(await page.locator('body').innerText()).not.toMatch(/الأجازة|الإعدادت/);
      const sidebarBox = await page.locator('[data-demo-sidebar]').boundingBox();
      expect(Math.round(sidebarBox!.width)).toBe(48);
      expect(sidebarBox!.x + sidebarBox!.width).toBeGreaterThan(1430); // RTL: rail on the right edge
    });
    it('activating an unavailable item shows the approved Toast without navigating, stealing focus or changing state', async () => {
      await open('shell');
      const item = page.locator('[data-nav-id="payroll"]');
      await item.focus();
      await page.keyboard.press('Enter');
      const toast = page.locator('[data-demo-toast]');
      await browserExpect(toast).toContainText(COPY.title);
      await browserExpect(toast).toContainText(COPY.message);
      await browserExpect(item).toBeFocused();
      await browserExpect(page.locator('[data-demo-sidebar] [aria-current="page"]')).toHaveAttribute('data-nav-id', 'leave');
      await browserExpect(page.locator('h1')).toHaveText('صفحة تجريبية');
      expect(page.url()).toContain('__gap5?view=shell');
      await page.keyboard.press('Space'); // Space also activates (replaces, never stacks)
      await browserExpect(page.locator('[data-demo-toast]')).toHaveCount(1);
      expect(await calls()).toEqual(['notify:payroll', 'notify:payroll']);
    });
    it('Leave (current) does not trigger the unavailable notice', async () => {
      await open('shell');
      await page.locator('[data-demo-sidebar] [data-nav-id="leave"]').click();
      await browserExpect(page.locator('[data-demo-toast]')).toHaveCount(0);
      expect(await calls()).toEqual([]);
    });
    it('shows a tooltip with the label and unavailable title on hover and keyboard focus', async () => {
      await open('shell');
      const tip = page.locator('#kd-tip-assistant');
      await browserExpect(tip).toBeHidden();
      await page.locator('[data-nav-id="assistant"]').hover();
      await browserExpect(tip).toBeVisible();
      await browserExpect(tip).toContainText('المساعد الذكي');
      await browserExpect(tip).toContainText(COPY.title);
      await page.mouse.move(700, 400);
      await page.locator('[data-nav-id="reports"]').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await browserExpect(page.locator('#kd-tip-reports')).toBeVisible();
    });
    it('Toast: dismiss button, 5 s auto-dismiss, pause on hover and on focus, replacement restarts, bottom-left clear of header/rail', async () => {
      await open('shell', 1440, 900, true);
      await page.locator('[data-nav-id="tasks"]').click({ force: true });
      const toast = page.locator('[data-demo-toast]');
      await browserExpect(toast).toBeVisible();
      const box = (await toast.boundingBox())!;
      expect(box.x + box.width / 2).toBeLessThan(720);           // visual left (RTL inline-end)
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      expect(box.y).toBeGreaterThan(108);                          // clear of the header
      expect(await page.locator('[data-demo-sidebar]').boundingBox().then(b => b!.x)).toBeGreaterThan(box.x + box.width);
      await page.clock.runFor(4900);
      await browserExpect(toast).toBeVisible();
      await page.clock.runFor(200);
      await browserExpect(toast).toHaveCount(0);

      await page.locator('[data-nav-id="tasks"]').click({ force: true });           // hover pause
      await toast.hover();
      await page.clock.runFor(8000);
      await browserExpect(toast).toBeVisible();
      await page.mouse.move(700, 150);
      await page.clock.runFor(5100);
      await browserExpect(toast).toHaveCount(0);

      await page.locator('[data-nav-id="tasks"]').click({ force: true });           // focus pause (keyboard)
      await page.locator('[data-action="dismiss-toast"]').focus();
      await page.clock.runFor(9000);
      await browserExpect(toast).toBeVisible();
      await page.locator('#page-btn').focus();
      await page.clock.runFor(5100);
      await browserExpect(toast).toHaveCount(0);

      await page.locator('[data-nav-id="tasks"]').click({ force: true });           // replacement restarts the timer
      await page.clock.runFor(4000);
      await page.locator('[data-nav-id="reports"]').click({ force: true });
      await page.clock.runFor(4000);
      await browserExpect(toast).toBeVisible();
      await page.clock.runFor(1200);
      await browserExpect(toast).toHaveCount(0);

      await page.locator('[data-nav-id="tasks"]').click({ force: true });           // manual dismiss
      await page.getByRole('button', { name: 'إغلاق' }).click();
      await browserExpect(toast).toHaveCount(0);
    });
    it('Toast live region is a polite RTL status that exists before any notice', async () => {
      await open('shell');
      const region = page.locator('[data-demo-toast-region]');
      await browserExpect(region).toHaveAttribute('role', 'status');
      await browserExpect(region).toHaveAttribute('aria-live', 'polite');
      await browserExpect(region).toHaveAttribute('dir', 'rtl');
    });
    it('renders the storage-unavailable notice inside the shell', async () => {
      await open('shell-storage');
      await browserExpect(page.locator('[data-storage-notice]')).toContainText('تعذّر حفظ بيانات التجربة في هذه الجلسة');
    });
  });

  describe('Mobile shell (T014)', () => {
    it('shows the five-item bottom bar, الإجازات active, others unavailable; desktop chrome is hidden', async () => {
      await open('shell', 390, 844);
      const nav = page.locator('[data-demo-mobile-nav]');
      expect(await nav.locator('.kd-nav__item span:first-of-type').allTextContents()).toEqual(['الرئيسية', 'الحضور', 'الإجازات', 'الراتب', 'مزاياي']);
      await browserExpect(nav.locator('[aria-current="page"]')).toContainText('الإجازات');
      await browserExpect(nav.locator('[aria-current="page"]')).toContainText('•');
      await browserExpect(nav.locator('[aria-disabled="true"]')).toHaveCount(4);
      await browserExpect(page.locator('[data-demo-sidebar]')).toBeHidden();
      await browserExpect(page.locator('[data-demo-header="desktop"]')).toBeHidden();
      const box = (await nav.boundingBox())!;
      expect(Math.round(box.height)).toBe(74);
      expect(Math.round(box.y + box.height)).toBe(844);
      const xs = await nav.locator('.kd-nav__item').evaluateAll(els => els.map(el => el.getBoundingClientRect().x));
      expect([...xs].sort((a, b) => b - a)).toEqual(xs); // RTL: first item rightmost
    });
    it('tapping an unavailable item shows the Toast above the bar, keeps الإجازات active and does not navigate', async () => {
      await open('shell', 390, 844);
      await page.locator('[data-demo-mobile-nav] [data-nav-id="salary"]').click({ force: true });
      const toast = page.locator('[data-demo-toast]');
      await browserExpect(toast).toContainText(COPY.title);
      const toastBox = (await toast.boundingBox())!;
      const navBox = (await page.locator('[data-demo-mobile-nav]').boundingBox())!;
      expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(navBox.y - 16 + 0.5);
      expect(toastBox.x).toBeGreaterThanOrEqual(16 - 0.5);
      expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(390 - 16 + 0.5);
      await browserExpect(page.locator('[data-demo-mobile-nav] [aria-current="page"]')).toContainText('الإجازات');
      await browserExpect(page.locator('h1')).toHaveText('صفحة تجريبية');
      await page.locator('[data-demo-mobile-nav] [data-nav-id="leave"]').click();
      expect(await calls()).toEqual(['notify:salary']);
    });
    it('avatar menu holds Logout and Reset: labelled trigger, keyboard, Escape returns focus, outside click closes', async () => {
      await open('shell', 390, 844);
      const trigger = page.locator('[data-account-menu-trigger]');
      await browserExpect(trigger).toHaveAttribute('aria-label', 'فاطمة علي');
      await browserExpect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      await browserExpect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      await browserExpect(trigger).toHaveAttribute('aria-expanded', 'true');
      const items = page.getByRole('menuitem');
      await browserExpect(items).toHaveText(['تسجيل الخروج', 'إعادة ضبط التجربة']);
      await browserExpect(items.first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await browserExpect(items.nth(1)).toBeFocused();
      const menuBox = (await page.locator('[data-account-menu]').boundingBox())!;
      expect(menuBox.x).toBeGreaterThanOrEqual(0);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);
      await page.keyboard.press('Escape');
      await browserExpect(page.getByRole('menu')).toHaveCount(0);
      await browserExpect(trigger).toBeFocused();
      await trigger.click();
      await page.mouse.click(150, 400);
      await browserExpect(page.getByRole('menu')).toHaveCount(0);
      await trigger.click();
      await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();
      await browserExpect(page.getByRole('menu')).toHaveCount(0);
      expect(await calls()).toEqual(['logout']);
    });
    it('Reset from the mobile menu opens the confirmation; Logout/Reset never overlap page content or the bar', async () => {
      await open('shell', 390, 844);
      await page.locator('[data-account-menu-trigger]').click();
      await page.getByRole('menuitem', { name: 'إعادة ضبط التجربة' }).click();
      await browserExpect(page.getByRole('alertdialog')).toBeVisible();
      expect(await calls()).toEqual(['request-reset']);
    });
    it('page content stays clear of the fixed bottom bar and nothing overflows at 320/360/375/390/430', async () => {
      await open('shell', 390, 844);
      for (const width of [320, 360, 375, 390, 430]) {
        await page.setViewportSize({ width, height: 700 });
        expect(await overflow()).toBe(true);
        const nav = (await page.locator('[data-demo-mobile-nav]').boundingBox())!;
        const content = (await page.locator('.kd-shell__pad').boundingBox())!;
        expect(content.y + content.height).toBeLessThanOrEqual(nav.y + nav.height + 1);
        const items = await page.locator('.kd-nav__item').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, h: r.height, clip: el.scrollWidth > el.clientWidth }; }));
        expect(items.every(i => i.left >= 0 && i.right <= width && i.h >= 44 && !i.clip)).toBe(true);
        await browserExpect(page.locator('[data-account-menu-trigger]')).toBeVisible();
      }
    });
  });

  describe('Reset confirmation (T015 presentation)', () => {
    const openDialog = async () => {
      await open('shell');
      await page.locator('[data-demo-header="desktop"] [data-action="reset"]').click();
      await browserExpect(page.getByRole('alertdialog')).toBeVisible();
    };
    it('shows the approved copy, focuses Cancel, and Cancel returns focus to the opener without confirming', async () => {
      await openDialog();
      const dialog = page.getByRole('alertdialog');
      await browserExpect(dialog).toContainText('إعادة ضبط التجربة؟');
      await browserExpect(dialog).toContainText('سيتم استعادة بيانات الطلبات التجريبية إلى حالتها الأصلية وتسجيل خروجك.');
      await browserExpect(dialog.getByRole('button')).toHaveText(['إلغاء', 'إعادة الضبط']);
      await browserExpect(dialog.getByRole('button', { name: 'إلغاء' })).toBeFocused();
      await dialog.getByRole('button', { name: 'إلغاء' }).click();
      await browserExpect(dialog).toHaveCount(0);
      await browserExpect(page.locator('[data-demo-header="desktop"] [data-action="reset"]')).toBeFocused();
      expect(await calls()).toEqual(['request-reset', 'reset-cancel']);
    });
    it('Escape and backdrop cancel; confirm calls onConfirm once', async () => {
      await openDialog();
      await page.keyboard.press('Escape');
      await browserExpect(page.getByRole('alertdialog')).toHaveCount(0);
      await page.locator('[data-demo-header="desktop"] [data-action="reset"]').click();
      await page.mouse.click(10, 10);
      await browserExpect(page.getByRole('alertdialog')).toHaveCount(0);
      await page.locator('[data-demo-header="desktop"] [data-action="reset"]').click();
      await page.getByRole('button', { name: 'إعادة الضبط' }).click();
      await browserExpect(page.getByRole('alertdialog')).toHaveCount(0);
      expect(await calls()).toEqual(['request-reset', 'reset-cancel', 'request-reset', 'reset-cancel', 'request-reset', 'reset-confirm']);
    });
    it('traps Tab inside the dialog and makes the page inert', async () => {
      await openDialog();
      await page.keyboard.press('Tab');
      await browserExpect(page.getByRole('button', { name: 'إعادة الضبط' })).toBeFocused();
      await page.keyboard.press('Tab');
      await browserExpect(page.getByRole('button', { name: 'إلغاء' })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await browserExpect(page.getByRole('button', { name: 'إعادة الضبط' })).toBeFocused();
      expect(await page.locator('#root').evaluate(el => (el as HTMLElement).inert)).toBe(true);
      await page.getByRole('button', { name: 'إلغاء' }).click();
      expect(await page.locator('#root').evaluate(el => (el as HTMLElement).inert)).toBe(false);
    });
    it('fits a 320 px viewport without overflow', async () => {
      await open('shell', 320, 568);
      await page.locator('[data-account-menu-trigger]').click();
      await page.getByRole('menuitem', { name: 'إعادة ضبط التجربة' }).click();
      const box = (await page.locator('[data-reset-dialog]').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      expect(await overflow()).toBe(true);
    });
  });
});
