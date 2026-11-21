import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Persona } from '../../domain/leave/types';
import { GUIDE_COPY, guideText } from './copy';
import { deriveGuide } from './derive';
import { GuidePanel } from './GuidePanel';
import { COMPACT_QUERY } from './useCompactViewport';
import type { GuideFacts } from './types';

const facts = (patch: Partial<GuideFacts>): GuideFacts => ({
  requestId: 'LV-2026-107', status: 'pending', stage: 'manager', terminalReason: null,
  hasHrStep: true, managerStep: 'pending', hrStep: 'pending', ...patch,
});
const scenes: (GuideFacts | null)[] = [
  null,
  facts({}),
  facts({ hasHrStep: false, hrStep: 'none' }),
  facts({ stage: 'hr', managerStep: 'approved' }),
  facts({ status: 'approved', stage: 'none', hasHrStep: false, hrStep: 'none', managerStep: 'approved' }),
  facts({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' }),
  facts({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' }),
  facts({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_hr', managerStep: 'approved', hrStep: 'rejected' }),
  facts({ stage: 'escalated' }),
];
const personas = [Persona.EMPLOYEE, Persona.MANAGER, Persona.HR];
const noop = () => {};
const render = (persona: Persona, f: GuideFacts | null, extra: Partial<Parameters<typeof GuidePanel>[0]> = {}) => {
  const model = deriveGuide(f?.requestId ?? null, f, persona);
  return renderToStaticMarkup(<GuidePanel persona={persona} model={model} text={guideText(model, persona, { requestId: f?.requestId ?? null, employeeBalance: 3 })}
    trackedId={f?.requestId ?? null} candidates={[]} collapsed={false} switchLabel={null} reason={null} contactHref="https://wa.me/0?text=x"
    onSwitch={noop} onRestart={noop} onExplore={noop} onSkip={noop} onToggle={noop} onTrack={noop} onTryAnother={noop} onResetDemo={noop} {...extra} />);
};

describe('O-2: the one-line instruction of the compact guide', () => {
  it('exists for every state and role, is a real sentence shorter than the full explanation, and holds no identifier', () => {
    for (const f of scenes) for (const persona of personas) {
      const model = deriveGuide(f?.requestId ?? null, f, persona);
      const text = guideText(model, persona, { requestId: f?.requestId ?? null, employeeBalance: 3 });
      const label = `${model.phase}/${persona}`;
      expect(text.short.trim().length, label).toBeGreaterThan(8);
      expect(text.short.length, label).toBeLessThanOrEqual(80);
      expect(text.short.length, label).toBeLessThan(text.body.length);
      expect(text.short, label).not.toMatch(/LV-2026|MGR-|HR-1|EMP-/);
    }
  });
  it('only the Employee\'s own demo balance appears, and only on the Employee\'s first step', () => {
    for (const f of scenes) for (const persona of [Persona.MANAGER, Persona.HR]) {
      const model = deriveGuide(f?.requestId ?? null, f, persona);
      expect(guideText(model, persona, { requestId: f?.requestId ?? null, employeeBalance: 3 }).short).not.toMatch(/\d|[٠-٩]/);
    }
    const first = guideText(deriveGuide(null, null, Persona.EMPLOYEE), Persona.EMPLOYEE, { requestId: null, employeeBalance: 3 });
    expect(first.short).toContain('٣ أيام');
  });
  it('states nothing the full text does not (routine vs exceptional wording matches the real path)', () => {
    const routine = guideText(deriveGuide('LV-2026-107', facts({ hasHrStep: false, hrStep: 'none' }), Persona.MANAGER), Persona.MANAGER, { requestId: 'LV-2026-107' });
    expect(routine.short).toContain('ضمن الرصيد');
    expect(routine.short).not.toMatch(/الموارد البشرية/);
    const exceptional = guideText(deriveGuide('LV-2026-107', facts({}), Persona.MANAGER), Persona.MANAGER, { requestId: 'LV-2026-107' });
    expect(exceptional.short).not.toContain('ضمن الرصيد');
  });
});

describe('O-2: markup and breakpoint', () => {
  it('server/static render is the full layout: collapse toggle, full text, no details toggle (compact is decided in the browser)', () => {
    const html = render(Persona.MANAGER, facts({}));
    expect(html).not.toContain('data-compact');
    expect(html).not.toContain('data-guide-details-toggle');
    expect(html).toContain('data-guide-text');
    expect(html).not.toContain('data-guide-short');
    expect(html).toContain(GUIDE_COPY.controls.collapse);
  });
  it('uses the same breakpoint as the stylesheet and the app\'s md: switch', () => {
    expect(COMPACT_QUERY).toBe('(max-width: 767px)');
    const css = readFileSync(new URL('../ui/guide.css', import.meta.url), 'utf8');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toMatch(/\.kd-guide \[hidden\] \{ display: none !important; \}/); // `hidden` wins over list/button display rules
    expect(css).toContain('.kd-guide[data-compact="true"]');
  });
  it('contains no timers or frame callbacks in the new hook (event driven)', () => {
    const source = readFileSync(new URL('./useCompactViewport.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    expect(source).toContain("addEventListener('change'");
  });
});

describe('O-4: the not-shown message and its explicit action', () => {
  const tracked = facts({});
  it('a filter that hides the request is named, with the explicit action', () => {
    const onClearAndShow = vi.fn();
    const html = render(Persona.MANAGER, tracked, { trackedNotShown: true, trackedFiltered: true, onClearAndShow });
    expect(html).toContain('data-guide-not-shown="filtered"');
    expect(html).toContain(GUIDE_COPY.controls.trackedFiltered);
    expect(html).toMatch(/<button[^>]*data-guide-clear-show[^>]*>إزالة التصفية وعرض الطلب<\/button>/);
    expect(html.match(/<button[^>]*data-guide-clear-show/g)).toHaveLength(1);
    // announced once, with the title, inside the single live region only
    const announcer = /<p class="kd-sr" role="status"[^>]*data-guide-announcer="true">([^<]*)<\/p>/.exec(html)![1];
    expect(announcer).toContain(GUIDE_COPY.controls.trackedFiltered);
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html.match(/aria-live=/g)).toHaveLength(1);
  });
  it('without a filter the message is the generic one and there is no clear action', () => {
    const html = render(Persona.MANAGER, tracked, { trackedNotShown: true, trackedFiltered: false, onClearAndShow: vi.fn() });
    expect(html).toContain(GUIDE_COPY.controls.trackedNotShown);
    expect(html).not.toContain('data-guide-clear-show');
    expect(html).not.toContain('data-guide-not-shown="filtered"');
  });
  it('is only ever shown for a request that really waits for the Manager', () => {
    for (const f of [facts({ stage: 'hr', managerStep: 'approved' }), facts({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' })]) {
      const html = render(Persona.MANAGER, f, { trackedNotShown: true, trackedFiltered: true, onClearAndShow: vi.fn() });
      expect(html).not.toContain('data-guide-not-shown');
      expect(html).not.toContain('data-guide-clear-show');
    }
  });
  it('copy: the action is exactly the announced wording and the message makes no claim beyond the filter', () => {
    expect(GUIDE_COPY.controls.clearAndShow).toBe('إزالة التصفية وعرض الطلب');
    expect(GUIDE_COPY.controls.trackedFiltered).toBe('التصفية الحالية تخفي الطلب المتتبَّع.');
    expect(GUIDE_COPY.controls.trackedNotShown).not.toMatch(/غيّر التصفية|تغيير التصفية/); // the generic message is for the non-filter case
  });
});
