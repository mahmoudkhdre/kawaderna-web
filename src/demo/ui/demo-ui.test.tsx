import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DemoLogin, DemoHeader, DemoMobileNav, DemoResetConfirmation, DemoShell, DemoSidebar, DemoToast } from './index';
import { DEMO_COPY } from '../copy';
import { getDemoNavigation } from '../navigation';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../session';
import { UNAVAILABLE_TOAST_BEHAVIOR } from '../ui-contract';

const noop = () => {};
const session = DEMO_ACCOUNTS[0];
const navigation = getDemoNavigation();
const toast = { notice: null, behavior: UNAVAILABLE_TOAST_BEHAVIOR, onDismiss: noop };

describe('Gap 5 presentation markup (static; behavior is covered in demo-ui.browser.test.ts)', () => {
  it('Login shows the approved labels, disclosure, fictional accounts and no Google/role picker', () => {
    const html = renderToStaticMarkup(<DemoLogin onLogin={vi.fn()} recoveryNotice={null} storageNotice={null} onDismissRecovery={noop} />);
    expect(html).toContain('معرّف المستخدم');
    expect(html).not.toContain('رقم الموظف');
    expect(html).toContain('كلمة المرور');
    expect(html).toContain(DEMO_COPY.disclosure);
    expect(html).toContain('manager-demo');
    expect(html).toContain('hr-demo');
    expect(html).toContain('employee-demo');
    expect(html).toContain(DEMO_PASSWORD);
    expect(html.match(/data-quick-fill=/g)).toHaveLength(3);
    expect(html).not.toMatch(/Google|role="radiogroup"|<select/i);
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('type="password"');
  });
  it('Login renders recovery and storage notices as polite status text', () => {
    const html = renderToStaticMarkup(<DemoLogin onLogin={vi.fn()} recoveryNotice={DEMO_COPY.recovery} storageNotice={DEMO_COPY.storageUnavailable} onDismissRecovery={noop} />);
    expect(html).toContain(DEMO_COPY.recovery);
    expect(html).toContain(DEMO_COPY.storageUnavailable);
    expect(html).toContain(`aria-label="${DEMO_COPY.close}"`);
    expect(html.match(/role="status"/g)).toHaveLength(2);
  });
  it('Header shows the typed identity and both controls; the bell is decorative and has no count', () => {
    const html = renderToStaticMarkup(<DemoHeader session={session} onLogout={noop} onRequestReset={noop} />);
    expect(html).toContain(session.displayIdentity);
    expect(html).toContain('تسجيل الخروج');
    expect(html).toContain('إعادة ضبط التجربة');
    expect(html).toMatch(/data-decorative-bell="true"[^>]*>|aria-hidden="true"[^>]*data-decorative-bell="true"/);
    expect(html).not.toMatch(/English|badge|>4</);
    expect(html).toContain('aria-haspopup="menu"');
  });
  it('Sidebar keeps the approved 14-item order and DV-13 corrections; only Leave is current/available', () => {
    const html = renderToStaticMarkup(<DemoSidebar navigation={navigation} onNotifyUnavailable={noop} />);
    const labels = [...html.matchAll(/data-nav-id="[^"]+"/g)].length;
    expect(labels).toBe(14);
    expect(html).toContain('طلبات الإجازة');
    expect(html).toContain('الإعدادات');
    expect(html).not.toMatch(/الأجازة|الإعدادت/);
    expect(html).toContain('المساعد الذكي');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(13);
  });
  it('Mobile navigation renders five RTL items with الإجازات active and four unavailable', () => {
    const html = renderToStaticMarkup(<DemoMobileNav navigation={navigation} onNotifyUnavailable={noop} />);
    const order = ['الرئيسية', 'الحضور', 'الإجازات', 'الراتب', 'مزاياي'].map(label => html.indexOf(label));
    expect(order.every((index, i) => index > -1 && (i === 0 || index > order[i - 1]))).toBe(true);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(4);
    expect(html).toContain('•');
  });
  it('Toast renders the approved copy in an RTL polite status region, and nothing when there is no notice', () => {
    expect(renderToStaticMarkup(<DemoToast {...toast} />)).not.toContain(DEMO_COPY.unavailableTitle);
    const html = renderToStaticMarkup(<DemoToast {...toast} notice={{ id: 1, title: DEMO_COPY.unavailableTitle, message: DEMO_COPY.unavailableMessage }} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(DEMO_COPY.unavailableTitle);
    expect(html).toContain(DEMO_COPY.unavailableMessage);
    expect(html).toContain(`aria-label="${DEMO_COPY.close}"`);
  });
  it('Reset confirmation renders nothing when closed and the approved copy when open', () => {
    expect(renderToStaticMarkup(<DemoResetConfirmation open={false} onConfirm={noop} onCancel={noop} />)).toBe('');
    const html = renderToStaticMarkup(<DemoResetConfirmation open onConfirm={noop} onCancel={noop} />);
    for (const text of [DEMO_COPY.resetTitle, DEMO_COPY.resetDescription, DEMO_COPY.resetCancel, DEMO_COPY.resetConfirm]) expect(html).toContain(text);
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
  });
  it('Shell hosts children without adding a second main landmark', () => {
    const html = renderToStaticMarkup(
      <DemoShell session={session} onLogout={noop} onRequestReset={noop} navigation={navigation} onNotifyUnavailable={noop} toast={toast} storageNotice={DEMO_COPY.storageUnavailable}>
        <main>صفحة</main>
      </DemoShell>);
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toContain(DEMO_COPY.storageUnavailable);
    expect(html).not.toMatch(/bAIb|data-ai|floating|chat/);
  });
});
