import { Persona } from '../../domain/leave/types';
import { formatDays } from '../../lib/format';
import type { GuideModel, GuidePhase } from './types';

/**
 * Guide copy (Arabic). Rules enforced by copy.test.ts: no product-AI vocabulary, no compliance or
 * readiness claims, no security wording for the role switch, no private data, nothing about balances
 * except the signed-in employee's own demo balance passed in by the caller.
 */
export const GUIDE_COPY = {
  regionLabel: 'الجولة الموجّهة',
  intro: {
    title: 'اكتشف كيف يدير كوادرنا طلبات الإجازات والموافقات',
    body: 'جرّب رحلة طلب إجازة بين الموظف والمدير والموارد البشرية، وشاهد كيف تُدار الاستثناءات وتُوثّق القرارات.',
    guidedTitle: 'ابدأ الجولة الموجّهة',
    guidedBody: 'اتبع سيناريو عملي خطوة بخطوة.',
    freeTitle: 'استكشف بنفسك',
    freeBody: 'استخدم الحسابات التجريبية وجرّب النظام بحرية.',
  },
  loginHint: {
    title: 'ابدأ بحساب الموظف',
    // D1: the public demo credentials are already filled when this hint is shown, so it must not ask for another fill.
    body: 'تمت تعبئة بيانات حساب الموظف التجريبي المعلنة. اضغط «تسجيل دخول» للمتابعة. لن يُنشأ أي طلب ولن يُسجَّل دخولك تلقائيًا.',
  },
  loginSwitch: {
    employee: 'الخطوة التالية: ادخل بحساب الموظف',
    manager: 'الخطوة التالية: ادخل بحساب المدير',
    hr: 'الخطوة التالية: ادخل بحساب الموارد البشرية',
    body: 'تمت تعبئة بيانات الحساب التجريبي المعلنة. راجعها ثم اضغط «تسجيل دخول».',
  },
  controls: {
    skip: 'تخطي الجولة',
    resumeBar: 'الجولة الموجّهة متوقفة',
    resume: 'استئناف الجولة',
    startBar: 'جرّب الجولة الموجّهة',
    collapse: 'إخفاء الشرح',
    expand: 'إظهار الشرح',
    trackedLabel: 'الطلب المتتبَّع',
    trackedPick: 'اختر الطلب الذي تتبعه الجولة',
    trackedNone: 'لا يوجد طلب متتبَّع بعد',
    showTracked: 'اعرض الطلب في القائمة',
    skipToTracked: 'تخطي إلى الطلب المتتبَّع',
    trackedNotShown: 'الطلب المتتبَّع غير ظاهر في القائمة الحالية.',
    // O-4: the filter is never cleared silently. When it is what hides the request, say so and offer the explicit action.
    trackedFiltered: 'التصفية الحالية تخفي الطلب المتتبَّع.',
    clearAndShow: 'إزالة التصفية وعرض الطلب',
    // O-2: phone layout shows a compact guide; the rest is one explicit toggle away.
    detailsShow: 'عرض التفاصيل',
    detailsHide: 'إخفاء التفاصيل',
    currentStage: 'المرحلة الحالية',
    otherDecided: 'تم تسجيل قرارك على طلب آخر. الطلب الذي تتبعه الجولة ما زال بانتظار قرارك.',
    why: 'لماذا يهم؟',
    stepsLabel: 'مراحل الطلب',
  },
  stages: { employee: 'الموظف', manager: 'المدير', hr: 'الموارد البشرية', result: 'النتيجة' },
  stageState: { completed: 'اكتملت', current: 'المرحلة الحالية', upcoming: 'قادمة', not_applicable: 'غير مطلوبة' },
  stageOutcome: { approved: 'بالموافقة', rejected: 'بالرفض' },
  switchLabel: { employee: 'تابع بحساب الموظف', manager: 'تابع بحساب المدير', hr: 'تابع بحساب الموارد البشرية' },
  restart: { label: 'ابدأ سيناريو جديد', explore: 'استكشاف الطلبات الموجودة' },
  summary: {
    reasonLabel: 'سبب الرفض المسجَّل',
    value: 'هذا ما يقدّمه كوادرنا: كل قرار موثّق بصاحبه وتاريخه وسببه، ومسار واضح للاستثناءات.',
    limits: 'الديمو عرض تجريبي ببيانات وحسابات افتراضية، وليس نظامًا جاهزًا للتشغيل.',
    cta: 'اطلب عرضًا توضيحيًا',
    ctaNewTab: '(يفتح في نافذة جديدة)',
    another: 'جرّب مسارًا آخر',
    explore: 'استكشف النظام',
    again: 'أعد التجربة',
  },
  missing: 'لم يعد الطلب المرتبط بهذه الجولة متاحًا. يمكنك بدء سيناريو جديد أو استكشاف الطلبات الموجودة.',
} as const;

/** `short` is the one-line instruction shown by the compact (phone) guide; `body` stays the full explanation. */
export interface GuideText { title: string; short: string; body: string; why: string; routineHint?: string }

interface TextContext { requestId: string | null; employeeBalance?: number }

const why = {
  start: 'الطلب الذي يتجاوز الرصيد يمرّ بمراجعة المدير ثم الموارد البشرية، ويُوثَّق كل قرار على الطريق.',
  manager: 'كل طلب يبدأ بمراجعة المدير المباشر، فلا يضيع طلب بين الأقسام.',
  hr: 'الاستثناءات لا تُحسم عند المدير وحده؛ تنتقل إلى الموارد البشرية بقرار موثّق.',
  approved: 'القرار النهائي محفوظ بصاحبه وتاريخه، فيسهل الرجوع إليه عند الحاجة.',
  rejected: 'يُسجَّل الرفض مع سببه ويراه الموظف، فلا يبقى القرار غامضًا.',
} as const;

const id = (ctx: TextContext) => ctx.requestId ?? '';

/** Role- and state-specific wording. Every sentence is true of the real state it is shown for. */
export const guideText = (model: GuideModel, persona: Persona, ctx: TextContext): GuideText => {
  const phase: GuidePhase = model.phase;
  const exceptional = model.path === 'exceptional';
  switch (phase) {
    case 'no_request':
      if (persona === Persona.EMPLOYEE) {
        const balance = ctx.employeeBalance;
        const body = typeof balance === 'number'
          ? `لنجرب طلب إجازة يحتاج مراجعة إضافية. رصيدك التجريبي الحالي ${formatDays(balance)}؛ اختر مدة تتجاوز الرصيد، مثل ${formatDays(balance + 2)}.`
          : 'لنجرب طلب إجازة يحتاج مراجعة إضافية. اختر مدة تتجاوز رصيدك التجريبي.';
        const short = typeof balance === 'number'
          ? `قدّم طلبًا يتجاوز رصيدك (${formatDays(balance)})، مثل ${formatDays(balance + 2)}.`
          : 'قدّم طلبًا يتجاوز رصيدك التجريبي.';
        return {
          title: 'الخطوة ١ — قدّم طلب إجازة يتجاوز الرصيد', short, body, why: why.start,
          routineHint: 'اختر تاريخ بداية ونهاية يغطيان المدة. لتجربة المسار الروتيني اختر مدة ضمن الرصيد.',
        };
      }
      return { title: 'ابدأ من حساب الموظف', short: 'قدّم طلبًا من حساب الموظف أولًا.', body: 'لم يُقدَّم بعد طلب تتبعه الجولة. قدّم طلبًا من حساب الموظف أولًا ثم عد لمراجعته.', why: why.start };
    case 'awaiting_manager':
      if (persona === Persona.EMPLOYEE) {
        return { title: `أُرسل الطلب ${id(ctx)}`, short: 'تابع بحساب المدير لتجرّب الموافقة أو الرفض.', body: 'انتقل الطلب إلى مراجعة المدير. تابع بحساب المدير لتجرّب الموافقة أو الرفض.', why: why.manager };
      }
      if (persona === Persona.MANAGER) {
        return {
          title: 'مراجعة المدير',
          short: exceptional ? 'جرّب الموافقة أو الرفض على الطلب المتتبَّع.' : 'طلب ضمن الرصيد: يكتمل بقرار المدير وحده.',
          body: exceptional
            ? 'الطلب الذي أرسلته جاهز لمراجعة المدير. جرّب الموافقة لمعرفة كيف ينتقل الاستثناء إلى الموارد البشرية، أو الرفض لمشاهدة توثيق القرار.'
            : 'الطلب الذي أرسلته جاهز لمراجعة المدير. هذا طلب ضمن الرصيد، لذلك يكتمل بقرار المدير وحده دون الموارد البشرية. جرّب الموافقة أو الرفض.',
          why: why.manager,
        };
      }
      return { title: 'الطلب ما زال عند المدير', short: 'الطلب بانتظار قرار المدير.', body: 'الطلب المتتبَّع ما زال بانتظار قرار المدير. بعد موافقته، سيظهر هنا إذا كان يتطلب مراجعة الموارد البشرية.', why: why.manager };
    case 'awaiting_hr':
      if (persona === Persona.HR) {
        return { title: 'مراجعة الموارد البشرية', short: 'اتخذ القرار النهائي وسيُوثَّق.', body: 'وصل الطلب إلى الموارد البشرية بعد موافقة المدير، ويمكن الآن اتخاذ القرار النهائي وتوثيقه.', why: why.hr };
      }
      if (persona === Persona.MANAGER) {
        return { title: 'انتقل الطلب إلى الموارد البشرية', short: 'وافقت على الطلب وهو الآن عند الموارد البشرية.', body: 'وافق المدير على الطلب. وبما أنه يتجاوز الرصيد، يحتاج الآن إلى مراجعة الموارد البشرية.', why: why.hr };
      }
      return { title: 'الطلب عند الموارد البشرية', short: 'تابع بحساب الموارد البشرية للقرار النهائي.', body: 'وافق المدير على طلبك، وبقي قرار الموارد البشرية النهائي. تابع بحساب الموارد البشرية لاتخاذه.', why: why.hr };
    case 'approved_routine':
      return {
        title: 'اكتمل الطلب الروتيني',
        short: 'اكتمل بقرار المدير لأنه ضمن الرصيد.',
        body: persona === Persona.MANAGER
          ? 'تمت الموافقة على الطلب. لأنه ضمن الرصيد، لم يحتج إلى مراجعة الموارد البشرية.'
          : 'تمت الموافقة على الطلب من المدير دون الحاجة إلى الموارد البشرية، لأنه ضمن الرصيد.',
        why: why.approved,
        routineHint: 'لتجربة تصعيد الاستثناء إلى الموارد البشرية، قدّم طلبًا جديدًا يتجاوز الرصيد.',
      };
    case 'approved_after_hr':
      return {
        title: 'اكتملت مراجعة الطلب',
        short: 'سُجّلت الموافقة النهائية.',
        body: persona === Persona.HR ? 'اكتملت مراجعة الطلب وتم تسجيل الموافقة النهائية.' : 'تم تسجيل الموافقة النهائية على الطلب بعد مراجعة الموارد البشرية.',
        why: why.approved,
      };
    case 'rejected_manager':
      return {
        title: 'سُجّل رفض المدير',
        short: 'لم ينتقل الطلب إلى الموارد البشرية.',
        body: persona === Persona.MANAGER
          ? 'تم تسجيل قرار الرفض وسببه. لم ينتقل الطلب إلى الموارد البشرية.'
          : 'رفض المدير الطلب وسُجّل السبب. لم ينتقل الطلب إلى الموارد البشرية.',
        why: why.rejected,
      };
    case 'rejected_hr':
      return {
        title: 'سُجّل رفض الموارد البشرية',
        short: 'سُجّل الرفض مع السبب.',
        body: persona === Persona.HR ? 'تم تسجيل قرار الرفض وسببه، ويمكن للموظف الاطلاع على النتيجة.' : 'رفضت الموارد البشرية الطلب بعد موافقة المدير، وسُجّل السبب.',
        why: why.rejected,
      };
    case 'missing':
      return { title: 'تعذّر العثور على الطلب', short: 'الطلب المرتبط بالجولة لم يعد متاحًا.', body: GUIDE_COPY.missing, why: why.start };
    default:
      return { title: 'تعذّر تحديد مرحلة الطلب', short: 'تعذّر تحديد المرحلة.', body: 'لا تتوفر معلومات كافية لشرح هذه المرحلة. يمكنك متابعة الاستكشاف بحرية.', why: why.start };
  }
};

export interface SummaryContent { title: string; lines: string[]; note?: string }

/** The summary only lists stages that really happened. */
export const summaryContent = (model: GuideModel): SummaryContent | null => {
  switch (model.phase) {
    case 'approved_after_hr':
      return { title: 'اكتملت رحلة الموافقة', lines: ['الموظف قدّم الطلب.', 'المدير راجعه ووافق.', 'الموارد البشرية راجعت الاستثناء ووافقت.', 'تم تسجيل القرار.'] };
    case 'approved_routine':
      return {
        title: 'اكتمل مسار الطلب الروتيني',
        lines: ['الموظف قدّم الطلب.', 'المدير راجعه ووافق.', 'لأن الطلب ضمن الرصيد، لم يحتج إلى مراجعة الموارد البشرية.', 'تم تسجيل القرار.'],
        note: 'هذا طلب روتيني وليس استثناءً. لتجربة مسار الاستثناء، قدّم طلبًا جديدًا يتجاوز الرصيد.',
      };
    case 'rejected_manager':
      return { title: 'اكتمل مسار الرفض عند المدير', lines: ['الموظف قدّم الطلب.', 'المدير راجعه ورفضه.', 'سُجّل القرار وسببه.', 'لم ينتقل الطلب إلى الموارد البشرية.'] };
    case 'rejected_hr':
      return { title: 'اكتمل مسار المراجعة بالرفض', lines: ['الموظف قدّم الطلب.', 'المدير راجعه ووافق.', 'الموارد البشرية راجعت الاستثناء وانتهت بقرار رفض مسبَّب.', 'سُجّل القرار وسببه.'] };
    default:
      return null;
  }
};

export type HrEmptyAction = 'start' | 'switch-manager' | 'new-path' | null;
export interface HrEmptyContent { body: string; hint?: string; action: HrEmptyAction }

/**
 * Cases A–G of the HR empty state. The title never changes. Anything that cannot be proven from the real
 * state falls back to the neutral message (case F/G): the guide never guesses where a request is.
 */
export const hrEmptyContent = (mode: 'guided' | 'free' | null, model: GuideModel | null, base: { body: string; hint: string }): HrEmptyContent => {
  if (mode !== 'guided' || !model) return { body: base.body, hint: base.hint, action: 'start' }; // A / F: not following a request
  const neutral: HrEmptyContent = { body: base.body, hint: base.hint, action: null }; // the guide above already says what to do
  switch (model.phase) {
    case 'awaiting_manager':
      return { body: 'الطلب المتتبَّع ما زال بانتظار قرار المدير. بعد موافقته، سيظهر هنا إذا كان يتطلب مراجعة الموارد البشرية.', action: 'switch-manager' }; // B
    case 'rejected_manager':
      return { body: 'انتهى هذا الطلب بالرفض في مرحلة المدير، ولذلك لم ينتقل إلى الموارد البشرية.', action: 'new-path' }; // C
    case 'approved_after_hr':
    case 'rejected_hr':
      return { body: 'تم تسجيل القرار لهذا الطلب، ولا يحتاج إلى مراجعة إضافية من الموارد البشرية.', action: 'new-path' }; // D
    case 'approved_routine':
      return { body: 'هذا الطلب لا يحتاج مسار الاستثناء الخاص بالموارد البشرية وفق قواعد الديمو الحالية.', hint: 'لتجربة هذا المسار، قدّم من حساب الموظف طلبًا يتجاوز الرصيد.', action: 'new-path' }; // E
    default:
      return neutral; // A / F / G: no tracked request, missing, unknown
  }
};

export type ManagerEmptyAction = 'start' | 'new-path' | null;
export interface ManagerEmptyContent { body: string; hint?: string; action: ManagerEmptyAction }

/**
 * Manager empty state (owner decision E). The title never changes. A sentence about the tracked request is shown
 * only when the real state proves it and this role may already see it (its own decision, or the hand-off to HR
 * that the guide text already tells the Manager). Anything else keeps the neutral message: the guide never guesses
 * where a request is, and a decided request is never described as pending.
 */
export const managerEmptyContent = (mode: 'guided' | 'free' | null, model: GuideModel | null, base: { body: string; hint: string }): ManagerEmptyContent => {
  if (mode !== 'guided' || !model) return { body: base.body, hint: base.hint, action: 'start' };
  const neutral: ManagerEmptyContent = { body: base.body, hint: base.hint, action: null };
  switch (model.phase) {
    case 'awaiting_hr':
      return { body: 'وافقت على الطلب المتتبَّع وهو الآن عند الموارد البشرية، لذلك لا يظهر هنا بانتظار قرارك.', action: null };
    case 'rejected_manager':
      return { body: 'سُجّل رفضك للطلب المتتبَّع ولم يعد بانتظار قرارك.', action: 'new-path' };
    case 'approved_routine':
      return { body: 'تمت الموافقة على الطلب المتتبَّع ولم يعد بانتظار قرارك.', action: 'new-path' };
    case 'approved_after_hr':
    case 'rejected_hr':
      return { body: 'تم حسم الطلب المتتبَّع بعد مراجعة الموارد البشرية، ولم يعد بانتظار قرارك.', action: 'new-path' };
    default:
      return neutral;
  }
};

export const HR_EMPTY_ACTION_LABEL: Record<Exclude<HrEmptyAction, null>, string> = {
  start: 'ابدأ تجربة مسار الموافقات',
  'switch-manager': 'العودة لمسار المدير',
  'new-path': 'جرّب مسارًا جديدًا',
};

/** Short state label used next to a request id in the picker. */
export const PHASE_LABEL: Record<GuidePhase, string> = {
  no_request: '',
  missing: 'غير متاح',
  awaiting_manager: 'بانتظار المدير',
  awaiting_hr: 'بانتظار الموارد البشرية',
  approved_routine: 'تمت الموافقة',
  approved_after_hr: 'تمت الموافقة',
  rejected_manager: 'مرفوض',
  rejected_hr: 'مرفوض',
  unknown: '',
};
