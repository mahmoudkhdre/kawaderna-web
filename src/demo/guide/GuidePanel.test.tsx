import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Persona } from '../../domain/leave/types';
import { guideText } from './copy';
import { deriveGuide } from './derive';
import { GuideIntro, GuideLoginHint, GuideResumeBar } from './GuideEntry';
import { GuidePanel } from './GuidePanel';
import type { GuideFacts } from './types';

const noop = () => {};
const facts = (patch: Partial<GuideFacts>): GuideFacts => ({
  requestId: 'LV-2026-107', status: 'pending', stage: 'manager', terminalReason: null,
  hasHrStep: true, managerStep: 'pending', hrStep: 'pending', ...patch,
});
const render = (persona: Persona, f: GuideFacts | null, extra: Partial<Parameters<typeof GuidePanel>[0]> = {}) => {
  const model = deriveGuide(f?.requestId ?? null, f, persona);
  return renderToStaticMarkup(<GuidePanel persona={persona} model={model} text={guideText(model, persona, { requestId: f?.requestId ?? null, employeeBalance: 3 })}
    trackedId={f?.requestId ?? null} candidates={[]} collapsed={false} switchLabel={null} reason={null} contactHref="https://wa.me/0?text=x"
    onSwitch={noop} onRestart={noop} onExplore={noop} onSkip={noop} onToggle={noop} onTrack={noop} onTryAnother={noop} onResetDemo={noop} {...extra} />);
};

describe('guide markup', () => {
  it('is a non-modal complementary region: no dialog role, no aria-modal, no autofocus, no tabindex trap', () => {
    const html = render(Persona.EMPLOYEE, null);
    expect(html).toContain('<aside');
    expect(html).not.toMatch(/role="(alert)?dialog"|aria-modal|autofocus|tabindex="[1-9]/i);
  });
  it('announces step changes politely and exposes progress as text', () => {
    const html = render(Persona.MANAGER, facts({}));
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-guide-progress');
    expect(html).toContain('aria-current="step"');
  });
  it('every stage has an icon (aria-hidden) AND a visible text state', () => {
    const html = render(Persona.EMPLOYEE, facts({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' }));
    expect(html.match(/class="kd-step__state"/g)).toHaveLength(4);
    for (const word of ['اكتملت', 'غير مطلوبة']) expect(html).toContain(word);
    expect(html).toContain('بالرفض');
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)!.length).toBeGreaterThanOrEqual(4);
  });
  it('shows the collapsed state through aria-expanded and hides the body', () => {
    const html = render(Persona.EMPLOYEE, null, { collapsed: true });
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/class="kd-guide__body"[^>]*hidden/);
  });
  it('terminal summary: CTA opens safely, other actions are buttons, limits are stated', () => {
    const html = render(Persona.EMPLOYEE, facts({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' }));
    expect(html).toMatch(/<a[^>]*data-guide-cta[^>]*href="https:\/\/wa\.me\/0\?text=x"/);
    expect(html).toMatch(/rel="noopener noreferrer"/);
    for (const label of ['اطلب عرضًا توضيحيًا', 'جرّب مسارًا آخر', 'استكشف النظام', 'أعد التجربة']) expect(html).toContain(label);
    expect(html).toContain('ليس نظامًا جاهزًا للتشغيل');
  });
  it('never renders a request id for a missing request or an unknown stage', () => {
    expect(render(Persona.EMPLOYEE, null, { trackedId: null })).not.toContain('LV-2026');
  });
  it('the picker only appears when there is something to choose', () => {
    expect(render(Persona.EMPLOYEE, facts({}), { candidates: [{ requestId: 'LV-2026-107', label: 'x' }] })).not.toContain('data-guide-picker');
    expect(render(Persona.EMPLOYEE, facts({}), { candidates: [{ requestId: 'LV-2026-107', label: 'a' }, { requestId: 'LV-2026-108', label: 'b' }] })).toContain('data-guide-picker');
  });
});

describe('final recovery: D7 part 2, D9, D10', () => {
  it('D9: a missing or unprovable request shows no stepper, no progress count and no generic "why it matters"', () => {
    const view = (trackedId: string, f: GuideFacts | null) => {
      const model = deriveGuide(trackedId, f, Persona.EMPLOYEE);
      return renderToStaticMarkup(<GuidePanel persona={Persona.EMPLOYEE} model={model} text={guideText(model, Persona.EMPLOYEE, { requestId: trackedId })} trackedId={trackedId}
        candidates={[]} collapsed={false} switchLabel={null} reason={null} contactHref="https://wa.me/0?text=x"
        onSwitch={noop} onRestart={noop} onExplore={noop} onSkip={noop} onToggle={noop} onTrack={noop} onTryAnother={noop} onResetDemo={noop} />);
    };
    const cases: [string, GuideFacts | null, string][] = [['LV-2026-999', null, 'missing'], ['LV-2026-107', facts({ status: 'approved', stage: 'none', hasHrStep: false, managerStep: 'pending' }), 'unknown']];
    for (const [trackedId, f, phase] of cases) {
      const html = view(trackedId, f);
      expect(html).toContain(`data-guide-phase="${phase}"`);
      expect(html).not.toContain('data-guide-stepper');
      expect(html).not.toContain('data-guide-progress');
      expect(html).not.toContain('kd-guide__why');
    }
    expect(render(Persona.EMPLOYEE, facts({}))).toContain('kd-guide__why'); // a real request keeps all three
    expect(render(Persona.EMPLOYEE, null, { trackedId: null })).toContain('data-guide-stepper'); // "no request yet" is a real first step
  });
  it('D10: the region has one stable name and the step title is not a heading (the page h1 stays first)', () => {
    const names = [Persona.EMPLOYEE, Persona.MANAGER].map(persona => render(persona, facts({})).match(/<aside[^>]*aria-label="([^"]+)"/)?.[1]);
    expect(names).toEqual(['الجولة الموجّهة', 'الجولة الموجّهة']);
    for (const html of [render(Persona.MANAGER, facts({})), render(Persona.EMPLOYEE, facts({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' }))]) {
      expect(html).not.toMatch(/<h[1-6]/);
      expect(html).not.toContain('aria-labelledby="_r_');
    }
  });
  it('D7: the reminder appears only for the Manager, only while the tracked request still waits, and only when flagged', () => {
    const mgr = (extra: object, persona: Persona = Persona.MANAGER, f = facts({})) => render(persona, f, extra);
    expect(mgr({ otherDecided: true })).toContain('data-guide-other-hint');
    expect(mgr({})).not.toContain('data-guide-other-hint');
    expect(mgr({ otherDecided: true }, Persona.EMPLOYEE)).not.toContain('data-guide-other-hint');
    expect(mgr({ otherDecided: true }, Persona.MANAGER, facts({ stage: 'hr', managerStep: 'approved' }))).not.toContain('data-guide-other-hint');
  });
});

describe('aria-live review (2026-11-17): one concise announcer, nothing else is live', () => {
  const scenes: [string, Persona, GuideFacts | null][] = [
    ['employee, no request', Persona.EMPLOYEE, null],
    ['manager, awaiting', Persona.MANAGER, facts({})],
    ['hr, awaiting', Persona.HR, facts({ stage: 'hr', managerStep: 'approved' })],
    ['employee, approved', Persona.EMPLOYEE, facts({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' })],
    ['manager, rejected', Persona.MANAGER, facts({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' })],
  ];
  it.each(scenes)('%s: exactly one live region, outside the step/summary blocks, without buttons or the "why" paragraph', (_n, persona, f) => {
    const html = render(persona, f);
    expect(html.match(/aria-live=/g)).toHaveLength(1);
    expect(html.match(/role="status"/g)).toHaveLength(1);
    const announcer = html.match(/<p class="kd-sr"[^>]*data-guide-announcer="true">([^<]*)<\/p>/);
    expect(announcer).not.toBeNull();
    expect(announcer![1].length).toBeGreaterThan(0);
    expect(announcer![1]).not.toContain('لماذا يهم');
    expect(html).toMatch(/aria-atomic="true"/);
  });
  it('the announcer carries the title plus only the two transient messages, and never when they do not apply', () => {
    const base = render(Persona.MANAGER, facts({}));
    expect(base).not.toMatch(/data-guide-announcer="true">[^<]*ما زال بانتظار قرارك/);
    const withOther = render(Persona.MANAGER, facts({}), { otherDecided: true });
    expect(withOther).toMatch(/data-guide-announcer="true">مراجعة المدير\. تم تسجيل قرارك على طلب آخر/);
    const hidden = render(Persona.MANAGER, facts({}), { trackedNotShown: true });
    expect(hidden).toMatch(/data-guide-announcer="true">[^<]*غير ظاهر في القائمة الحالية/);
    // an Employee never gets the Manager reminder, even if the flag is passed
    expect(render(Persona.EMPLOYEE, facts({}), { otherDecided: true })).not.toMatch(/data-guide-announcer="true">[^<]*قرارك على طلب آخر/);
  });
  it('the announcer is outside the collapsible body, so folding the guide never removes or re-announces it', () => {
    const html = render(Persona.MANAGER, facts({}), { collapsed: true });
    expect(html.indexOf('data-guide-announcer')).toBeLessThan(html.indexOf('class="kd-guide__body"'));
  });
});

describe('guide entry markup', () => {
  it('offers exactly the two approved choices with their approved wording', () => {
    const html = renderToStaticMarkup(<GuideIntro onGuided={vi.fn()} onFree={vi.fn()} />);
    for (const text of ['اكتشف كيف يدير كوادرنا طلبات الإجازات والموافقات', 'ابدأ الجولة الموجّهة', 'اتبع سيناريو عملي خطوة بخطوة.', 'استكشف بنفسك', 'استخدم الحسابات التجريبية وجرّب النظام بحرية.']) {
      expect(html).toContain(text);
    }
    expect(html.match(/data-guide-choice=/g)).toHaveLength(2);
    expect(html).not.toMatch(/role="dialog"|aria-modal/);
  });
  it('D10/focus: entry titles are not headings; the hint title can receive programmatic focus', () => {
    const intro = renderToStaticMarkup(<GuideIntro onGuided={vi.fn()} onFree={vi.fn()} />);
    const hint = renderToStaticMarkup(<GuideLoginHint nextPersona="employee" firstStep onSkip={noop} />);
    expect(intro + hint).not.toMatch(/<h[1-6]/);
    expect(hint).toMatch(/id="kd-hint-title"[^>]*tabindex="-1"/i);
  });
  it('login hint says nothing is signed in automatically', () => {
    expect(renderToStaticMarkup(<GuideLoginHint nextPersona="employee" firstStep onSkip={noop} />)).toContain('لن يُنشأ أي طلب ولن يُسجَّل دخولك تلقائيًا');
  });
  it('resume bar distinguishes "never started" from "paused"', () => {
    expect(renderToStaticMarkup(<GuideResumeBar paused={false} onStart={noop} />)).toContain('جرّب الجولة الموجّهة');
    expect(renderToStaticMarkup(<GuideResumeBar paused onStart={noop} />)).toContain('استئناف الجولة');
  });
});
