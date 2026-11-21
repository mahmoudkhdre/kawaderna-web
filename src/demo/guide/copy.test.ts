import { describe, expect, it } from 'vitest';
import { Persona } from '../../domain/leave/types';
import { DEMO_COPY } from '../copy';
import { GUIDE_COPY, HR_EMPTY_ACTION_LABEL, guideText, hrEmptyContent, managerEmptyContent, summaryContent } from './copy';
import { deriveGuide } from './derive';
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

const allText = () => {
  const out: string[] = [JSON.stringify(GUIDE_COPY)];
  for (const f of scenes) for (const persona of personas) {
    const model = deriveGuide(f?.requestId ?? null, f, persona);
    out.push(JSON.stringify(guideText(model, persona, { requestId: f?.requestId ?? null, employeeBalance: 3 })));
    const summary = summaryContent(model);
    if (summary) out.push(JSON.stringify(summary));
    for (const mode of ['guided', 'free', null] as const) {
      out.push(JSON.stringify(hrEmptyContent(mode, model, { body: 'b', hint: 'h' })));
      out.push(JSON.stringify(managerEmptyContent(mode, model, { body: 'b', hint: 'h' })));
    }
  }
  out.push(JSON.stringify(HR_EMPTY_ACTION_LABEL));
  return out.join('\n');
};

describe('guide copy guardrails', () => {
  const text = allText();
  it('never uses product-AI vocabulary or compliance/readiness claims', () => {
    expect(text).not.toMatch(/\bAI\b|\bLLM\b|ذكاء اصطناعي|الذكاء الاصطناعي|نموذج لغوي|وكيل ذكي/);
    expect(text).not.toMatch(/ISO|GDPR|نظام حماية البيانات|PDPL|متوافق مع|معتمد من|جاهز للإنتاج|جاهز للتشغيل الفعلي|آمن تمامًا/);
  });
  it('never describes the role switch as security or authentication', () => {
    expect(text).not.toMatch(/تسجيل دخول آمن|مصادقة|توثيق الهوية|صلاحيات حقيقية|تحقق من هويتك/);
  });
  it('never contains an identifier, name or credential', () => {
    expect(text).not.toMatch(/MGR-|HR-1|EMP-|Demo2026|manager-demo|hr-demo|employee-demo/);
    expect(text).not.toMatch(/فاطمة|هند|مريم/);
  });
  it('states the limits of the demo instead of hiding them', () => {
    expect(GUIDE_COPY.summary.limits).toContain('ليس نظامًا جاهزًا للتشغيل');
    expect(DEMO_COPY.fixedDates).toContain('ثابتة');
  });
});

describe('guide text is true of the state it is shown for', () => {
  it('uses the real employee balance and updates when it changes', () => {
    const model = deriveGuide(null, null, Persona.EMPLOYEE);
    const three = guideText(model, Persona.EMPLOYEE, { requestId: null, employeeBalance: 3 }).body;
    expect(three).toContain('٣ أيام');
    expect(three).toContain('٥ أيام');
    const seven = guideText(model, Persona.EMPLOYEE, { requestId: null, employeeBalance: 7 }).body;
    expect(seven).toContain('٧ أيام');
    expect(seven).toContain('٩ أيام');
    expect(seven).not.toContain('٣ أيام');
  });
  it('does not mention a balance to roles that have no balance of their own', () => {
    const model = deriveGuide(null, null, Persona.MANAGER);
    expect(guideText(model, Persona.MANAGER, { requestId: null }).body).not.toMatch(/رصيد/);
  });
  it('a routine request is never described as reaching HR', () => {
    const routine = [scenes[2], scenes[4]];
    for (const f of routine) for (const persona of personas) {
      const model = deriveGuide('LV-2026-107', f, persona);
      const joined = JSON.stringify(guideText(model, persona, { requestId: 'LV-2026-107' })) + JSON.stringify(summaryContent(model));
      expect(joined).not.toMatch(/يحتاج الآن إلى مراجعة الموارد البشرية|راجعت الاستثناء/);
    }
  });
  it('the manager rejection summary does not mention an HR review that never happened', () => {
    const summary = summaryContent(deriveGuide('LV-2026-107', scenes[6], Persona.EMPLOYEE))!;
    expect(summary.title).toBe('اكتمل مسار الرفض عند المدير');
    expect(summary.lines.join(' ')).toContain('لم ينتقل الطلب إلى الموارد البشرية');
    expect(summary.lines.join(' ')).not.toContain('راجعت');
  });
  it('the approval summary lists HR only when HR actually decided', () => {
    expect(summaryContent(deriveGuide('LV-2026-107', scenes[5], Persona.EMPLOYEE))!.lines.join(' ')).toContain('الموارد البشرية راجعت الاستثناء');
    expect(summaryContent(deriveGuide('LV-2026-107', scenes[4], Persona.EMPLOYEE))!.lines.join(' ')).not.toContain('راجعت الاستثناء');
  });
  it('titles match the approved wording', () => {
    expect(summaryContent(deriveGuide('x', scenes[5], Persona.EMPLOYEE))!.title).toBe('اكتملت رحلة الموافقة');
    expect(summaryContent(deriveGuide('x', scenes[7], Persona.EMPLOYEE))!.title).toBe('اكتمل مسار المراجعة بالرفض');
    expect(summaryContent(deriveGuide('x', scenes[3], Persona.EMPLOYEE))).toBeNull();
  });
});

describe('HR empty state cases A–G', () => {
  const base = { body: 'عام', hint: 'مساعدة' };
  const model = (f: GuideFacts | null, id: string | null) => deriveGuide(id, f, Persona.HR);
  it('A/F: not following a request → neutral message and a start action, no claim about a request', () => {
    expect(hrEmptyContent(null, null, base)).toEqual({ body: 'عام', hint: 'مساعدة', action: 'start' });
    expect(hrEmptyContent('free', model(scenes[1], 'LV-2026-107'), base).action).toBe('start');
    expect(hrEmptyContent('free', model(scenes[1], 'LV-2026-107'), base).body).toBe('عام');
  });
  it('guided with no request, a missing request or an unknown stage stays neutral (never guesses)', () => {
    for (const m of [model(null, null), model(null, 'LV-2026-107'), model(scenes[8], 'LV-2026-107')]) {
      expect(hrEmptyContent('guided', m, base)).toEqual({ body: 'عام', hint: 'مساعدة', action: null });
    }
  });
  it('B: waiting for the manager', () => {
    const c = hrEmptyContent('guided', model(scenes[1], 'LV-2026-107'), base);
    expect(c.body).toContain('ما زال بانتظار قرار المدير');
    expect(c.action).toBe('switch-manager');
  });
  it('C: rejected by the manager is not shown as a pending HR request', () => {
    const c = hrEmptyContent('guided', model(scenes[6], 'LV-2026-107'), base);
    expect(c.body).toContain('انتهى هذا الطلب بالرفض في مرحلة المدير');
    expect(c.action).toBe('new-path');
  });
  it('D: already decided by HR', () => {
    for (const i of [5, 7]) expect(hrEmptyContent('guided', model(scenes[i], 'LV-2026-107'), base).body).toContain('تم تسجيل القرار لهذا الطلب');
  });
  it('E: a routine request', () => {
    const c = hrEmptyContent('guided', model(scenes[4], 'LV-2026-107'), base);
    expect(c.body).toContain('لا يحتاج مسار الاستثناء');
    expect(c.hint).toContain('يتجاوز الرصيد');
  });
  it('exposes no request details in any case', () => {
    for (const f of scenes) {
      const c = hrEmptyContent('guided', model(f, f?.requestId ?? null), base);
      expect(JSON.stringify(c)).not.toMatch(/LV-2026|سبب الرفض:/);
    }
  });
});

describe('owner decisions of 2026-11-17', () => {
  it('D1: the first sign-in hint no longer asks for a fill that is already done', () => {
    expect(GUIDE_COPY.loginHint.body).not.toContain('تعبئة حساب');
    expect(GUIDE_COPY.loginHint.body).toContain('تمت تعبئة بيانات حساب الموظف');
    expect(GUIDE_COPY.loginHint.body).toContain('تسجيل دخول');
    expect(GUIDE_COPY.loginHint.body).toContain('لن يُنشأ أي طلب');
  });

  const byPhase = (patch: Partial<GuideFacts>) => summaryContent(deriveGuide('LV-2026-107', facts(patch), Persona.EMPLOYEE));
  it('B: every completion title names the real outcome', () => {
    expect(byPhase({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' })?.title).toBe('اكتمل مسار الرفض عند المدير');
    expect(byPhase({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' })?.title).toBe('اكتملت رحلة الموافقة');
    expect(byPhase({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_hr', managerStep: 'approved', hrStep: 'rejected' })?.title).toBe('اكتمل مسار المراجعة بالرفض');
  });
  it('B: the routine title does not claim the request went through HR', () => {
    const routine = byPhase({ status: 'approved', stage: 'none', hasHrStep: false, hrStep: 'none', managerStep: 'approved' });
    expect(routine?.title).not.toMatch(/الموارد البشرية|رحلة الموافقة/);
    expect(routine?.lines.join(' ')).toContain('لم يحتج إلى مراجعة الموارد البشرية');
  });
  it('B: no completion title for a request that is still pending, missing or unknown', () => {
    for (const persona of personas) {
      for (const f of [null, facts({}), facts({ stage: 'hr', managerStep: 'approved' }), facts({ stage: 'escalated' })]) {
        expect(summaryContent(deriveGuide(f?.requestId ?? null, f, persona))).toBeNull();
      }
      expect(summaryContent(deriveGuide('LV-2026-999', null, persona))).toBeNull();
    }
  });

  const base = { body: DEMO_COPY.managerEmptyBody, hint: DEMO_COPY.managerEmptyHint };
  const manager = (patch: Partial<GuideFacts> | null, mode: 'guided' | 'free' | null = 'guided') =>
    managerEmptyContent(mode, patch === null ? null : deriveGuide('LV-2026-107', facts(patch), Persona.MANAGER), base);
  it('E: the title is the owner wording and the default body/hint are kept when nothing is provable', () => {
    expect(DEMO_COPY.managerEmpty).toBe('لا توجد طلبات بانتظار قرارك حاليًا');
    expect(manager(null, 'free')).toEqual({ ...base, action: 'start' });
    expect(manager(null, null)).toEqual({ ...base, action: 'start' });
    expect(manager({}, 'free')).toEqual({ ...base, action: 'start' });
    expect(manager({ stage: 'escalated' })).toEqual({ ...base, action: null });
  });
  it('E: states only what the real phase proves, and never calls a decided request pending', () => {
    expect(manager({ stage: 'hr', managerStep: 'approved' }).body).toContain('عند الموارد البشرية');
    expect(manager({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' }).body).toContain('سُجّل رفضك');
    expect(manager({ status: 'approved', stage: 'none', hasHrStep: false, hrStep: 'none', managerStep: 'approved' }).body).toContain('تمت الموافقة');
    const decided = [
      manager({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_manager', managerStep: 'rejected' }),
      manager({ status: 'approved', stage: 'none', managerStep: 'approved', hrStep: 'approved' }),
      manager({ status: 'rejected', stage: 'none', terminalReason: 'rejected_by_hr', managerStep: 'approved', hrStep: 'rejected' }),
    ];
    for (const content of decided) {
      expect(content.body).toContain('لم يعد بانتظار قرارك');
      expect(content.action).toBe('new-path');
      expect(content.body).not.toMatch(/ما زال|بانتظار قرار المدير/);
    }
  });
  it('E: never says the request is at the employee, and never gives a decision-related action on a pending phase', () => {
    for (const mode of ['guided', 'free', null] as const) {
      for (const f of scenes) {
        const content = managerEmptyContent(mode, f ? deriveGuide(f.requestId, f, Persona.MANAGER) : null, base);
        expect(content.body).not.toMatch(/عند الموظف|لدى الموظف/);
      }
    }
  });
});
