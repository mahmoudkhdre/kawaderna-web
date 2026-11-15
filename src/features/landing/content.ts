/**
 * Kawaderna landing page — all product copy and the verified module inventory.
 *
 * Claim policy (every status below is traceable to project evidence):
 * - `demo`      : designed AND working in the React demo (Leave: Manager/HR flows, Gaps 1–4 closed).
 * - `designed`  : a full desktop page exists in the Figma file (page `web app` 196:4046, frames
 *                 inspected read-only 2026-11-07: e.g. salary 866:22812, attendance 811:21571,
 *                 health insurance 954:39097, settings 1343:40948). Module copy describes only what
 *                 those frames show; nothing here says a module works outside the Figma file.
 * - `vision`    : present in the design as a concept only; nothing works in the demo.
 * The AI assistant is `designed`: a full page (1213:33188) plus documented AI specs exist in Figma, but no AI runs anywhere.
 * No compliance, customer, metric, pricing or licensing claim is made anywhere in this file.
 * Unverified historical counts from the case study (26 modules, 80+ views, 250+ components) are deliberately not used;
 * see STAGE-2C-SPEC.md §4.
 *
 * Copy is deliberately short: one idea per line, details live in the product screens.
 */

export type ModuleStatus = 'demo' | 'designed' | 'vision';

export interface LandingModule {
  readonly id: string;
  readonly name: string;
  /** Lucide icon name as used in the Figma navigation. */
  readonly icon: string;
  readonly value: string;
  readonly status: ModuleStatus;
  /** Optional, evidence-backed note (spec section or Figma component). */
  readonly evidence?: string;
}

export type GroupShotId = 'attendance' | 'salary' | 'performance' | 'settings';

/**
 * Crops of real Figma pages (file 3vNsjBj9Gen1HSrtKrjd13, page `web app`). Every crop excludes the
 * on-canvas banners that state regulatory conformity, so the landing page never repeats that claim.
 */
export const GROUP_SHOTS: Record<GroupShotId, { readonly node: string; readonly caption: string; readonly alt: string }> = {
  attendance: { node: '811:21571', caption: 'صفحة الحضور والانصراف · من ملف التصميم',
    alt: 'بطاقات الحضور اليوم والغياب وحالات التأخير ومتوسط ساعات العمل من صفحة الحضور والانصراف في ملف التصميم' },
  salary: { node: '866:22812', caption: 'صفحة إدارة الرواتب · من ملف التصميم',
    alt: 'بطاقات إجمالي الرواتب ومتوسطها والمساهمات التأمينية والمدفوع من صفحة إدارة الرواتب في ملف التصميم' },
  performance: { node: '1067:29882', caption: 'صفحة إدارة الأداء · من ملف التصميم',
    alt: 'بطاقات تقييم الموظفين في صفحة إدارة الأداء من ملف التصميم: التقييم الإجمالي وإنجاز الأهداف والمهارات وموعد التقييم القادم' },
  settings: { node: '1343:40948', caption: 'صفحة الإعدادات · من ملف التصميم',
    alt: 'صفحة الإعدادات من ملف التصميم: إدارة صلاحيات الموظفين بأدوارهم، وقائمة أقسام الإعدادات من معلومات الشركة إلى طرق الدفع' },
};

export interface ModuleGroup {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** Key of a cropped Figma page shown with the group (see GROUP_SHOTS). */
  readonly shot: GroupShotId;
  readonly modules: readonly LandingModule[];
}

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  demo: 'مصمَّمة وتعمل في الديمو',
  designed: 'صفحة مصمَّمة في Figma',
  vision: 'مفهوم مصمَّم · لا يعمل',
};

export const CTA = {
  primary: 'جرّب الديمو التفاعلي',
  secondary: 'ما تحصل عليه',
} as const;

export const NAV_LINKS = [
  { href: '#ecosystem', label: 'الوحدات' },
  { href: '#design-system', label: 'نظام التصميم' },
  { href: '#ai', label: 'الذكاء الاصطناعي' },
  { href: '#architecture', label: 'البنية والتكامل' },
  { href: '#package', label: 'ما تحصل عليه' },
  { href: '#faq', label: 'أسئلة شائعة' },
  { href: '#creator', label: 'تواصل' },
] as const;

/** Published Behance case study, verified live 2026-11-09 (title «kawaderna - Enterprise HR Platform», owner mahmoud khdre). */
export const CASE_STUDY = {
  href: 'https://www.behance.net/gallery/253796199/kawaderna-Enterprise-HR-Platform',
  label: 'اقرأ دراسة الحالة كاملة على Behance',
} as const;

export const BRAND = {
  name: 'كوادرنا',
  descriptor: 'تصميم منتج متكامل للموارد البشرية',
  disclosure: 'نسخة تجريبية من كوادرنا — بيانات وحسابات افتراضية',
} as const;

export const HERO = {
  titleLead: 'منظومة موارد بشرية',
  titleAccent: 'صُمِّمت بالعربية',
  lede:
    'لشركات البرمجيات والمنشآت التي تريد منتج موارد بشرية عربيًا من البداية، لا ترجمة لاحقة. كل وحدة لها صفحة مصمَّمة، والذكاء الاصطناعي والبنية موثَّقان، ورحلة الإجازة تعمل فعلًا.',
  proofCaption: 'شاشات من ملف التصميم · بيانات نموذجية',
  desktopAlt: 'لوحة تحكم كوادرنا من ملف التصميم: ترحيب بالتاريخ الهجري، وشريط مواقيت الصلاة في الرياض، وبطاقات الطلبات المعلقة والموافقات والموظفين، وشريط التنقل الجانبي بكل الوحدات',
  mobileAlt: 'شاشة «إجازتي» للموظف على الجوال من ملف التصميم: أرصدة الإجازة السنوية والمرضية والطارئة، وطلبات بحالات موافق عليها وقيد المراجعة ومرفوض',
  meta: 'Figma · نظام تصميم · مواصفات ذكاء اصطناعي · مخططات مرجعية · ديمو React',
  /** Visible deliverable strip under the hero actions (verified counts only: STAGE-2C-SPEC.md §4). */
  deliverablesLabel: 'في الحزمة',
  stats: [
    { value: '١٤', label: 'وحدة مصمَّمة في Figma' },
    { value: '٥', label: 'مواصفات ذكاء اصطناعي موثَّقة' },
  ],
  deliverables: ['نظام تصميم بمتغيرات ومكوّنات', 'مخططات مرجعية للبنية والتكامل', 'ديمو تفاعلي لرحلة الإجازة'],
} as const;

export const VISION = {
  kicker: 'كيف صُمِّم',
  title: 'أنظمة الموارد البشرية لا ينقصها عدد الشاشات، ينقصها الوضوح',
  body: 'كثير من الأنظمة تُبنى بالإنجليزية ثم تُترجم. كوادرنا بدأ بالعربية، وبمراجعة مكتوبة قبل أول شاشة.',
  principles: [
    { title: 'عربي من الأساس', body: 'تخطيط وطباعة وأرقام مصمَّمة للقراءة من اليمين.' },
    { title: 'تجربة واحدة لكل الأدوار', body: 'الموظف والمدير والموارد البشرية يرون الطلب نفسه، كلٌّ بما يخصه.' },
    { title: 'حالة واضحة لكل طلب', body: 'الحالة والمرحلة والمخاطر والمسؤول الحالي، كلٌّ في موضعه.' },
  ],
} as const;

/**
 * Process steps, each backed by a file in the project folder (described, not quoted):
 * Initial_HR_Product_Audit_Findings.pdf · تدفق_طلبات_وموافقات_الموارد_البشرية.pdf ·
 * Kawaderna_Design_System.docx + Figma `Design System` page · Gap Pass v2 PDF + specs/001–002.
 */
export const PROCESS = {
  label: 'مراحل العمل',
  caseStudy: CASE_STUDY.label,
  steps: [
    { title: 'تدقيق قبل التصميم', body: 'مراجعة مكتوبة للمواصفات وشاشات المرجع وقوالب الذكاء الاصطناعي قبل تعديل أي شاشة.' },
    { title: 'تدفقات عربية للأدوار', body: 'مواصفة بالعربية لمسار الطلب بين الموظف والمدير والموارد البشرية، بالمسؤول والمخاطر.' },
    { title: 'نظام تصميم ثم صفحات', body: 'رموز ومكوّنات أولًا، ثم صفحة ديسكتوب لكل وحدة وشاشات للجوال.' },
    { title: 'معايير قبول لكل مرحلة', body: 'كل مرحلة في رحلة الإجازة لها مواصفة ومعايير قبول، ثم تُنفَّذ في الديمو وتُختبر.' },
  ],
} as const;

export const ECOSYSTEM = {
  kicker: 'وحدات المنتج',
  title: 'أربع عشرة وحدة، لكلٍّ منها صفحتها المصمَّمة',
  body: 'كل وحدة في التنقل لها صفحة ديسكتوب كاملة في ملف Figma. الإجازات وحدها تعمل في الديمو.',
} as const;

export const MODULE_GROUPS: readonly ModuleGroup[] = [
  {
    id: 'people',
    title: 'الأفراد والعمل اليومي',
    summary: 'ما يمرّ على الموظف ومديره كل يوم',
    shot: 'attendance',
    modules: [
      { id: 'leave', name: 'الإجازات', icon: 'calendar', status: 'demo',
        value: 'طلب الإجازة ومراجعته والموافقة أو الرفض بسبب، وتحويل ما يتجاوز الرصيد إلى الموارد البشرية.',
        evidence: 'منفّذة في الديمو: صندوق المدير، التفاصيل، الرفض بسبب، وقرار الموارد البشرية.' },
      { id: 'employees', name: 'الموظفون', icon: 'users', status: 'designed',
        value: 'دليل للموظفين، وملف شخصي يجمع البيانات الشخصية والوظيفية والمالية والوثائق.' },
      { id: 'attendance', name: 'الحضور والوقت', icon: 'clock', status: 'designed',
        value: 'تسجيل الحضور والانصراف، وملخص يومي للحضور والغياب والتأخير، وسجل لكل موظف.' },
      { id: 'tasks', name: 'المهام', icon: 'list-todo', status: 'designed',
        value: 'مهام ومشاريع الفريق بأولوياتها ومواعيدها ونسبة إنجاز كل مهمة.' },
    ],
  },
  {
    id: 'money',
    title: 'المال والمزايا',
    summary: 'الأجر والمزايا في المنظومة نفسها، بالمكوّنات نفسها',
    shot: 'salary',
    modules: [
      { id: 'payroll', name: 'الرواتب', icon: 'dollar-sign', status: 'designed',
        value: 'كشف رواتب شهري يفصّل الأساسي والبدلات والاستقطاعات وطريقة الدفع، مع تصدير CSV.' },
      { id: 'wage-protection', name: 'حماية الأجور', icon: 'shield-check', status: 'designed',
        value: 'صفحة لنظام حماية الأجور: بيانات المنشأة وتقرير ملف الرواتب لكل شهر.' },
      { id: 'loans', name: 'القروض والسلف', icon: 'credit-card', status: 'designed',
        value: 'طلبات القروض والسلف بأنواعها، والخصم الشهري، ونموذج لطلب قرض جديد.' },
      { id: 'insurance', name: 'التأمين الصحي', icon: 'heart-pulse', status: 'designed',
        value: 'المؤمَّن عليهم والأقساط والمطالبات ومعدل الاستخدام، ووثيقة التأمين لكل موظف.' },
      { id: 'financial-health', name: 'الصحة المالية', icon: 'wallet', status: 'designed',
        value: 'أهداف ادخار ومؤشر للصحة المالية يساعدان الموظف على فهم وضعه.' },
    ],
  },
  {
    id: 'insight',
    title: 'الأداء والقرار',
    summary: 'من التقييم إلى القرار',
    shot: 'performance',
    modules: [
      { id: 'dashboard', name: 'لوحة التحكم', icon: 'layout-dashboard', status: 'designed',
        value: 'ملخص يومي للمدير: الطلبات المعلقة، والحضور الأسبوعي، ومواقيت الصلاة في مدينة المنشأة.' },
      { id: 'performance', name: 'الأداء', icon: 'target', status: 'designed',
        value: 'تقييمات الموظفين ومهاراتهم، مع صفحة للأداء الفردي وأخرى للأهداف (OKRs).' },
      { id: 'reports', name: 'التقارير', icon: 'chart-column-increasing', status: 'designed',
        value: 'تقارير تفصيلية وتحليلات للحضور والتأخير والموظفين، قابلة للتصدير.' },
    ],
  },
  {
    id: 'platform',
    title: 'المنصّة',
    summary: 'ما يجعل المنتج قابلًا للضبط حسب سياسات المنشأة',
    shot: 'settings',
    modules: [
      { id: 'settings', name: 'الإعدادات', icon: 'settings', status: 'designed',
        value: 'معلومات الشركة، وصلاحيات المستخدمين، وسياسات الإجازات، وإعداد الرواتب وطرق الدفع.' },
      { id: 'assistant', name: 'المساعد الذكي', icon: 'sparkles', status: 'designed',
        value: 'صفحة محادثة وإجراءات سريعة وسجل نشاط. مصمَّمة وموثَّقة، ولا يعمل فيها ذكاء اصطناعي في الديمو.' },
    ],
  },
];

export type JourneyAvailability = 'available' | 'integrating';

export interface JourneyStep {
  readonly id: 'employee' | 'manager' | 'hr';
  readonly role: string;
  readonly title: string;
  readonly body: string;
  readonly condition?: string;
  /** `integrating` is kept for a step whose demo integration is not yet verified; every step is `available` since the 2026-11-12 acceptance. */
  readonly demo: JourneyAvailability;
}

export const JOURNEY_AVAILABILITY_LABEL: Record<JourneyAvailability, string> = {
  available: 'متاح في الديمو',
  integrating: 'قيد الربط في الديمو',
};

export const JOURNEY = {
  kicker: 'رحلة الإجازة',
  title: 'طلب واحد يمرّ بين الأدوار دون أن يضيع',
  body: 'في الديمو طلب واحد تتغير حالته بقرار كل دور: وافق عليه كمدير، ثم افتحه كموارد بشرية.',
  steps: [
    { id: 'employee', role: 'الموظف', title: 'يرفع الطلب',
      body: 'يختار التواريخ ويرى رصيده.', demo: 'available' },
    { id: 'manager', role: 'المدير', title: 'يراجع ويقرّر',
      body: 'يوافق، أو يرفض بسبب يظهر للموظف.', demo: 'available' },
    { id: 'hr', role: 'الموارد البشرية', title: 'تحسم الاستثناء',
      body: 'القرار النهائي على الطلب المحوَّل إليها.',
      condition: 'فقط عندما يتجاوز الطلب الرصيد المتاح.', demo: 'available' },
  ] satisfies readonly JourneyStep[],
  note: 'ليست كل الطلبات تصل إلى الموارد البشرية: الطلب الاعتيادي يُحسم عند المدير.',
} as const;

export interface ProductShot {
  readonly id: string;
  /** Alt text of the desktop capture, when the running demo was also captured at 1440. */
  readonly desktopAlt?: string;
  readonly tab: string;
  /** Whose screen it is; shown under the tab title in the desktop side rail (>=1280px) only. */
  readonly who: string;
  readonly title: string;
  readonly body: string;
  readonly alt: string;
}

export const SHOTS: readonly ProductShot[] = [
  { id: 'inbox', tab: 'صندوق المدير', who: 'شاشة المدير', title: 'كل الطلبات، مرتّبة بما يحتاج قرارًا',
    body: 'المخاطر والمرحلة والإجراء التالي ظاهرة لكل طلب.',
    alt: 'صندوق طلبات الإجازة لدى المدير في ديمو كوادرنا على الجوال، يعرض بطاقات الطلبات بحالاتها ومخاطرها وأزرار الموافقة والرفض',
    desktopAlt: 'جدول طلبات الإجازات لدى المدير في ديمو كوادرنا على الديسكتوب: الموظف ونوع الإجازة والتواريخ والمدة والحالة والمرحلة والمسؤول والإجراء التالي والمخاطر، مع زري الموافقة والرفض' },
  { id: 'detail', tab: 'تفاصيل الطلب', who: 'شاشة المدير', title: 'قرار مبني على صورة كاملة',
    body: 'بيانات الطلب والمخاطر ومسار الموافقة قبل الاعتماد.',
    alt: 'لوحة تفاصيل الطلب في ديمو كوادرنا لطلب يتجاوز الرصيد، مع زر الموافقة' },
  { id: 'reject', tab: 'الرفض بسبب', who: 'شاشة المدير', title: 'رفض محترم وواضح للموظف',
    body: 'أسباب محددة وتنبيه بأن السبب سيظهر للموظف.',
    alt: 'نافذة رفض طلب الإجازة في ديمو كوادرنا، تعرض ملخص الطلب وخيارات سبب الرفض' },
  { id: 'hr', tab: 'قرار الموارد البشرية', who: 'شاشة الموارد البشرية', title: 'الطلب نفسه، عند صاحب القرار النهائي',
    body: 'مسار الموافقة وسجل التحويل، ثم القرار النهائي.',
    alt: 'شاشة القرار النهائي للموارد البشرية في ديمو كوادرنا، تعرض الطلب المحوَّل ومسار الموافقة وسجل التحويل' },
];

export const DESIGN_SYSTEM = {
  kicker: 'نظام التصميم',
  title: 'من زر «موافقة» إلى كل وحدة قادمة، بنفس النظام',
  body: 'الوحدات الأربع عشرة مبنية بالمكوّنات والرموز نفسها، فأي وحدة جديدة أو تعديل للهوية يبدأ من النظام، لا من كل شاشة على حدة.',
  colorsTitle: 'ألوان دلالية',
  typeTitle: 'طباعة عربية — Tajawal',
  spacingTitle: 'مقياس المسافات',
  componentsTitle: 'مكوّنات بحالاتها',
  rtlTitle: 'أسس RTL',
  rtlBody: 'المعرّفات والتواريخ اللاتينية معزولة الاتجاه داخل النص العربي.',
  pillars: [
    { title: 'رموز دلالية', body: 'الألوان تُستخدم بمعناها: إجراء رئيسي، نجاح، تحذير، خطأ. لا ألوان عشوائية.' },
    { title: 'مكوّنات قابلة لإعادة الاستخدام', body: 'أزرار وحقول وبطاقات ونوافذ وتنقل، بحالاتها المختلفة.' },
    { title: 'سطح مكتب وجوال', body: 'جدول على الشاشات الواسعة، وبطاقات مصمَّمة للجوال، وتنقل سفلي.' },
    { title: 'جاهز للتسليم للتطوير', body: 'جزء من التصميم منفَّذ فعليًا كواجهات React تعمل، فيرى فريقك كيف يتحول النظام إلى كود.' },
  ],
  foundationTitle: 'الأساس',
  foundation: 'مكتبة مكوّنات في Figma مبنية على أسس shadcn/ui، بمتغيرات للألوان والمسافات والزوايا والشبكة.',
  handoffTitle: 'ما يستلمه فريق التطوير',
  handoff: [
    'متغيرات Figma للألوان والمسافات والزوايا والشبكة',
    'مكتبة مكوّنات بحالاتها وصفحة لنظام التصميم',
    'مواصفات رحلة الإجازة بمعايير قبول',
    'كود الديمو المبني بـ React مع اختباراته',
  ],
} as const;

/* ------------------------------------------------------------------ AI Space (Figma + case study ch. 5) */

export type AiShotId = 'assistant' | 'report' | 'financial';

/** Real Figma frames (page `web app`). All are designs with sample data; nothing here runs. */
export const AI_SHOTS: readonly { readonly id: AiShotId; readonly tab: string; readonly node: string; readonly title: string; readonly body: string; readonly alt: string; readonly w: number; readonly h: number }[] = [
  { id: 'assistant', tab: 'المساعد الذكي', node: '1213:33188', w: 1200, h: 252,
    title: 'مساعد داخل المنتج، لا نافذة دردشة منفصلة',
    body: 'إجراءات سريعة للإجازة والحضور والرواتب، وبطاقات بسياق الموظف بجانب المحادثة.',
    alt: 'جزء من صفحة المساعد الذكي في ملف التصميم: إجراءات سريعة للإجازة والحضور والرواتب، وبطاقات رصيد الإجازة وآخر حضور وموعد الراتب والطلبات المعلقة، ورأس نافذة المحادثة' },
  { id: 'report', tab: 'تحليل التقارير', node: '1771:33760', w: 800, h: 520,
    title: 'زر «تحليل» بجانب التقرير',
    body: 'ملخص، وأبرز الملاحظات، وتوصية واحدة، مع تنبيه بأن التحليل إرشادي ولا يمثّل قرارًا إداريًا.',
    alt: 'نافذة تحليل تقرير الحضور والانصراف من ملف التصميم: تنبيه بأن التحليل إرشادي، وملخص الحضور مع مؤشر دائري، وأبرز الملاحظات' },
  { id: 'financial', tab: 'الصحة المالية', node: '1743:32590', w: 818, h: 500,
    title: 'ملخص مالي للموظف بلغة بسيطة',
    body: 'مؤشر للصحة المالية ومعدل الادخار في جمل قصيرة، مع تنبيه بأن النتائج تتأثر باكتمال البيانات.',
    alt: 'نافذة التحليل الذكي للصحة المالية من ملف التصميم: تنبيه بأن النتائج قد تختلف حسب اكتمال البيانات، وملخص مالي مع مؤشر دائري من مئة' },
];

export const AI_SPACE = {
  kicker: 'مساحة الذكاء الاصطناعي',
  title: 'ذكاء اصطناعي مصمَّم داخل سير العمل، وموثَّق قبل أن يُبنى',
  body: 'مساعد في صفحة خاصة، وزر تحليل داخل التقارير والأداء والصحة المالية. كل تحليل له مواصفة مكتوبة تحدد مدخلاته ومخرجاته.',
  status: 'مصمَّم وموثَّق · غير متصل بنموذج ذكاء اصطناعي في الديمو',
  caption: 'مقتطف من ملف التصميم · بيانات نموذجية · نص التحليل مموَّه عمدًا',
  flowLabel: 'كيف يعمل التحليل كما صُمِّم',
  flow: ['طلب المستخدم', 'جمع البيانات', 'اختيار القالب', 'التحليل', 'عرض النتيجة'],
} as const;

/**
 * Prompt Toolkit: marketing description only (owner decision, 2026-11-14).
 * The Toolkit is a protected paid asset, so the page shows its value and nothing of its content:
 * no field names, no example spec, no template or mapping. The complete Toolkit stays in the
 * protected source location and is delivered with the paid package.
 */
export const TOOLKIT = {
  title: 'منظومة القوالب (Prompt Toolkit)',
  body: 'كل تحليل مبني على قالب موثَّق، فيبقى الناتج متّسقًا ويمكن مراجعته وتطويره.',
  benefitsLabel: 'ما تضيفه المنظومة',
  benefits: ['ناتج متّسق', 'قابل للمراجعة', 'قابل للتطوير'],
  specsCount: 5,
  specsNote: 'خمس حالات استخدام موثَّقة للتقارير والأداء والصحة المالية. القوالب نفسها تُسلَّم ضمن الحزمة ولا تُعرض هنا.',
} as const;

/* ------------------------------------------------------------------ Architecture & reference blueprints */

/**
 * Public copy and two-panel brief from docs/enterprise-blueprint/commercial-handoff.md («Public Visual Brief»).
 * Panels show documented design choices only: no vendor names, logos, connection lines or sync indicators inside them.
 * Buyer-only material (ERDs, authority matrix, mappings, contracts, acceptance scenarios) is named, never shown.
 */
export const ARCHITECTURE = {
  kicker: 'البنية والتكامل',
  title: 'كيف تُدار الإجازات إذا كان لدى العميل نظام موارد بشرية بالفعل؟',
  body: 'يوثّق مخطط كوادرنا خيارين: إدارة الإجازات بشكل مستقل، أو تصميمها لتعمل إلى جانب نظام الموارد البشرية لدى العميل. ويساعد فرق البرمجيات على تحديد مصدر بيانات الموظفين والجهة المسؤولة عن قرارات الإجازة قبل تقدير نطاق التنفيذ.',
  modes: [
    { id: 'standalone', title: 'تشغيل مستقل',
      body: 'الموارد البشرية تُدخل بيانات الإجازات وتديرها داخل كوادرنا.',
      owners: [{ system: 'الموارد البشرية داخل كوادرنا', owns: 'سجلات الموظفين وأرصدة الإجازات' }, { system: 'كوادرنا', owns: 'قرارات الإجازة' }] },
    { id: 'connected', title: 'مع نظام الموارد البشرية القائم',
      body: 'النظام القائم يبقى في مكانه، وكوادرنا يعمل إلى جانبه.',
      owners: [{ system: 'نظام الموارد البشرية القائم', owns: 'سجلات الموظفين' }, { system: 'كوادرنا', owns: 'قرارات الإجازة' }],
      caption: 'مثال لتوزيع المسؤوليات' },
  ],
  studiesLabel: 'دراسات مرجعية',
  studies: 'دراسات مرجعية لأنظمة Odoo وجسر و ZenHR، ودراسة لتصميم امتداد مؤسسي لنظام SAP SuccessFactors.',
  docsTitle: 'ما يستلمه فريق التطوير',
  docs: [
    'المتطلبات وحدود النطاق',
    'نموذج البيانات المنطقي',
    'مصفوفة الصلاحيات وسياسات المزامنة والاستعادة',
    'مراجع الأنظمة ومقارنة التوثيق الرسمي',
    'عقود طبقة الربط وحزم العمل وسيناريوهات القبول',
    'نتائج المراجعة وحدود التحقق',
  ],
  docsNote: 'تُسلَّم للمشتري ضمن الحزمة، ولا تُعرض محتوياتها هنا.',
  boundary: 'هذه وثائق بنية مرجعية ودراسات تكامل. موصّلات API الفعلية وقواعد بيانات الإنتاج والربط بالأنظمة غير منفَّذة، وتقييم بيئة المنشأة يحدد العمليات الممكنة.',
} as const;

export interface SwatchSpec {
  readonly name: string;
  readonly token: string;
  readonly hex: string;
  readonly role: string;
  readonly dark?: boolean;
}

/** Values copied from the Kawaderna Design System (docx) and Figma variables recorded in CLAUDE.md §9. */
export const SWATCHES: readonly SwatchSpec[] = [
  { name: 'Primary / 700', token: 'primary/700', hex: '#1D4ED8', role: 'الإجراء الرئيسي', dark: true },
  { name: 'Logo gradient', token: 'logo', hex: '#7C3AED', role: 'تدرّج الهوية: الشعار والبطاقات البارزة', dark: true },
  { name: 'Logo gradient end', token: 'logo-end', hex: '#1E3A8A', role: 'نهاية تدرّج الهوية', dark: true },
  { name: 'Foreground', token: 'foreground', hex: '#09090B', role: 'النص الأساسي', dark: true },
  { name: 'Primary / 50', token: 'primary/50', hex: '#EFF6FF', role: 'خلفيات ملوّنة خفيفة' },
  { name: 'Success / 500', token: 'success', hex: '#22C55E', role: 'النجاح والاعتماد' },
  { name: 'Zinc / 500', token: 'muted-foreground', hex: '#71717A', role: 'النص الثانوي', dark: true },
  { name: 'Border', token: 'border', hex: '#E2E8F0', role: 'الحدود والفواصل' },
];

export const TYPE_SCALE = [
  { label: 'H1 · 52/64', sample: 'كوادرنا', className: 'ld-type--h1' },
  { label: 'H4 · 32/40', sample: 'طلبات الإجازات', className: 'ld-type--h4' },
  { label: 'Body · 18/28', sample: 'طلبات تحتاج إلى مراجعتك', className: 'ld-type--body' },
  { label: 'Small · 16/24', sample: 'يحتاج مراجعة • يتجاوز الرصيد المتاح', className: 'ld-type--small' },
] as const;

export const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const REGION = {
  kicker: 'مصمَّم للمنطقة',
  title: 'تفاصيل يلاحظها المستخدم العربي من أول نظرة',
  points: [
    { title: 'تنسيق عربي في الديمو', body: 'الديمو يعرض التواريخ والأرقام بتنسيق ar-SA وبتوقيت الرياض، مع صيغ صحيحة للمدد مثل «يومان» و«٥ أيام».' },
    { title: 'وحدات تعكس واقع المنطقة', body: 'حماية الأجور والقروض والتأمين الصحي ضمن الهيكل.' },
    { title: 'نبرة عمل محترمة', body: 'لغة مباشرة ومهنية دون ترجمة حرفية.' },
  ],
  disclaimer:
    'التصميم والديمو لا يدّعيان مطابقة أي نظام أو لائحة. التحقق من المتطلبات النظامية جزء من مرحلة التنفيذ لدى المشتري.',
} as const;

/** Real microcopy from the working demo (source file in each comment). */
export const TONE_SAMPLES = [
  { context: 'بعد موافقة المدير على طلب يتجاوز الرصيد', text: 'تمت موافقتك على الطلب وتحويله إلى الموارد البشرية. القرار النهائي لدى الموارد البشرية.' }, // pages/ManagerInbox/labels.ts
  { context: 'قبل تأكيد الرفض', text: 'سيظهر سبب الرفض والتفاصيل التي تكتبها للموظف.' }, // pages/ManagerInbox/rejectionLabels.ts
  { context: 'عند فتح وحدة غير متاحة في الديمو', text: 'ميزة خارج نطاق التجربة' }, // demo/copy.ts
  { context: 'حين لا يوجد ما يُراجَع', text: 'لا توجد طلبات بانتظار مراجعة الموارد البشرية' }, // demo/copy.ts
] as const;

/** What each role sees of the same request — CLAUDE.md §28 visibility rule and the Gap 2–4 screens. */
export const ROLE_VIEWS = [
  { role: 'الموظف', sees: 'حالة طلبه، وسبب القرار كما كتبه صاحب القرار' },
  { role: 'المدير', sees: 'كفاية الرصيد («يتجاوز الرصيد المتاح») دون الرقم الدقيق' },
  { role: 'الموارد البشرية', sees: 'مسار الموافقة وسجل التحويل، ثم القرار النهائي' },
] as const;

/** Separate fields shown for one request in the Manager detail drawer (Gap 2). */
export const STATE_FIELDS = [
  { label: 'حالة الموافقة', value: 'قيد المراجعة' },
  { label: 'مرحلة الموافقة', value: 'المدير' },
  { label: 'المسؤول الحالي', value: 'المدير' },
  { label: 'المخاطر', value: 'يحتاج مراجعة • يتجاوز الرصيد المتاح' },
  { label: 'الإجراء التالي', value: 'مراجعة الطلب' },
] as const;

/** Stage 2B three-column package, kept only for the unmounted `archive/scroll-story` prototype (deletion = owner decision). */
export const PACKAGE_STAGE2B_COLUMNS = [
  { id: 'ready', title: 'متاح الآن', items: ['ملف Figma بصفحات ديسكتوب لكل الوحدات، وشاشات جوال، ونظام التصميم', 'ديمو React لوحدة الإجازات ببيانات افتراضية', 'مواصفات الطلبات والموافقات والصلاحيات'] },
  { id: 'demo', title: 'يمكن تجربته مباشرة', items: ['صندوق المدير على الديسكتوب والجوال', 'الموافقة أو الرفض بسبب يظهر للموظف', 'تحويل ما يتجاوز الرصيد وقرار الموارد البشرية'] },
  { id: 'future', title: 'خارج النطاق الحالي', items: ['مصادقة حقيقية وإدارة مستخدمين', 'خادم وربط بأنظمة أخرى، وبقية الوحدات بالكود', 'التحقق النظامي وأي ميزة ذكاء اصطناعي عاملة'] },
] as const;

export const AUDIENCES = [
  { title: 'شركات البرمجيات وتطوير المنتجات', body: 'بداية جاهزة لمنتج موارد بشرية عربي، بدل البدء من شاشات فارغة.' },
  { title: 'منشآت تفكّر في منصة خاصة بها', body: 'رؤية شكل المنتج وتجربته قبل تمويل البناء.' },
  { title: 'فرق تقنية تقيّم أصول تصميم', body: 'رموز ومكوّنات ومواصفات منظَّمة يمكن البناء عليها.' },
] as const;

export type DeliverableClass = 'figma' | 'system' | 'ai' | 'blueprint' | 'demo';

export const PACKAGE = {
  kicker: 'ما تحصل عليه',
  title: 'حزمة تصميم كاملة، وكل جزء موصوف كما هو',
  audienceLabel: 'لمن هذا المشروع',
  groups: [
    { id: 'figma', label: 'تصميم Figma',
      items: ['صفحة ديسكتوب لكل وحدة من الوحدات الأربع عشرة', 'شاشات جوال للموظف والمدير'] },
    { id: 'system', label: 'نظام التصميم',
      items: ['متغيرات الألوان والمسافات والزوايا والشبكة', 'مكتبة مكوّنات بحالاتها'] },
    { id: 'ai', label: 'أصول الذكاء الاصطناعي',
      items: ['تصاميم المساعد ونوافذ التحليل', 'مواصفات خمس حالات استخدام وهيكل منظومة القوالب'] },
    { id: 'blueprint', label: 'مخططات مرجعية',
      items: ['التشغيل المستقل والتشغيل مع نظام قائم', 'نموذج البيانات والدراسات المرجعية'] },
    { id: 'demo', label: 'يعمل في الديمو',
      items: ['رحلة الإجازة بين المدير والموارد البشرية', 'كود الديمو واختباراته ومواصفات كل مرحلة'] },
  ] satisfies readonly { id: DeliverableClass; label: string; items: readonly string[] }[],
  licensing: 'الترخيص ونقل الملكية يُتفق عليهما مع مالك المشروع مباشرة.',
  licensingLink: 'تواصل مع المالك',
  excludedLabel: 'غير مشمول',
  excluded: [
    'برنامج جاهز للتشغيل بخادم وقاعدة بيانات',
    'مصادقة حقيقية وإدارة مستخدمين',
    'ذكاء اصطناعي عامل أو ربط بنموذج',
    'موصّلات API فعلية بأنظمة أخرى',
    'تحقق نظامي أو شهادات',
  ],
} as const;

export const FAQ = {
  kicker: 'أسئلة المشترين',
  title: 'قبل أن تقرّر',
  items: [
    { q: 'ما الذي أشتريه تحديدًا؟',
      a: 'مشروع تصميم: ملف Figma لأربع عشرة وحدة ونظام تصميمها، وأصول ذكاء اصطناعي موثَّقة، ومخططات مرجعية، وديمو React لرحلة الإجازة.' },
    { q: 'هل كوادرنا منتج جاهز للتشغيل؟',
      a: 'لا. هو تصميم مع ديمو محدود ببيانات وحسابات افتراضية، دون مصادقة حقيقية أو خادم أو قاعدة بيانات إنتاج.' },
    { q: 'ما الذي يعمل في الديمو؟',
      a: 'رحلة طلب الإجازة بين المدير والموارد البشرية. بقية الوحدات تظهر في التنقل وتوضّح أنها خارج نطاق التجربة.' },
    { q: 'هل الذكاء الاصطناعي يعمل؟',
      a: 'لا. المساعد ونوافذ التحليل مصمَّمة، ولكل تحليل مواصفة مكتوبة. الربط بنموذج ذكاء اصطناعي جزء من التنفيذ.' },
    { q: 'هل يعمل مع Odoo أو جسر أو ZenHR؟',
      a: 'الحزمة تتضمن دراسات مرجعية لها، ودراسة لتصميم امتداد مؤسسي لنظام SAP SuccessFactors. لا توجد موصّلات منفَّذة، والتنفيذ يتطلب بيئة المشتري.' },
    { q: 'هل يمكن تخصيص التصميم لهويتنا؟',
      a: 'النظام مبني على رموز دلالية، فتغيير الألوان أو الطباعة يتم من مستوى الرموز. حجم التخصيص يُقدَّر عند الاطلاع على الملف.' },
    { q: 'ماذا يستلم فريق التطوير؟',
      a: 'متغيرات Figma ومكتبة المكوّنات، ومواصفات الإجازة بمعايير قبول، وكود الديمو بالاختبارات، والمخططات المرجعية.' },
    { q: 'ماذا عن المتطلبات النظامية في السعودية؟',
      a: 'لا نقدّم أي ادعاء بالمطابقة النظامية. التحقق يتم أثناء التنفيذ مع مختصين.' },
    { q: 'كيف أستفسر عن الشراء أو الترخيص؟',
      a: 'تواصل مع محمود خضر، مالك المشروع، عبر قسم «صاحب المشروع» أسفل هذه الأسئلة. شروط الترخيص ونقل الملكية تُناقَش معه مباشرة ولا تُعرض هنا.' },
  ],
} as const;

export const FINAL = {
  title: 'حزمة تصميم كاملة، وجزء منها يعمل الآن',
  /** Label for the purchase-inquiry link (default `contactHref` = CREATOR.inquiryHref, the owner mailto). */
  contact: 'استفسر عن الشراء',
  body: 'جرّب رحلة الإجازة كمدير ثم كموارد بشرية، وراجع ما تتضمنه الحزمة قبل أن تقرّر.',
  note: 'حسابات وبيانات افتراضية — لا حاجة لإنشاء حساب.',
} as const;

/**
 * Owner-supplied creator attribution and contact details (owner brief, 2026-11-07). The owner confirmed one number,
 * 01094097432, for both phone and WhatsApp. These details appear only in the creator section. The final CTA reuses
 * `inquiryHref` as its default `contactHref`.
 */
const OWNER_EMAIL = 'mahmoudkhdre9@gmail.com';
export const CREATOR = {
  kicker: 'صاحب المشروع',
  name: 'محمود خضر',
  nameLatin: 'Mahmoud Khdre',
  role: 'مبتكر كوادرنا ومالكه',
  body: 'كوادرنا مشروع محمود من الفكرة حتى التسليم، وهو صاحب القرار فيه.',
  rolesLabel: 'تولّى بنفسه',
  roles: ['تخطيط المنتج', 'تجربة المستخدم والواجهات', 'نظام التصميم', 'دراسة الحالة'],
  contactTitle: 'تواصل مباشرة',
  contactBody: 'للاستفسار عن الشراء أو الترخيص، تواصل مع محمود مباشرة.',
  inquiryHref: `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent('استفسار عن شراء كوادرنا')}`,
  channels: [
    { id: 'email', label: 'البريد الإلكتروني', value: OWNER_EMAIL, ltr: true, href: `mailto:${OWNER_EMAIL}` },
    { id: 'whatsapp', label: 'واتساب', value: 'مراسلة مباشرة', ltr: false, href: 'https://wa.me/201094097432', external: true },
    { id: 'phone', label: 'اتصال هاتفي', value: '+20 109 409 7432', ltr: true, href: 'tel:+201094097432' },
    { id: 'behance', label: 'Behance', value: 'دراسة الحالة كاملة', ltr: false, href: CASE_STUDY.href, external: true },
  ],
  newTab: '(يفتح في نافذة جديدة)',
} as const;

export const FOOTER = {
  line: 'كوادرنا — تصميم منتج للموارد البشرية، عربي أولًا.',
  credit: 'تخطيط وتصميم: محمود خضر',
} as const;
