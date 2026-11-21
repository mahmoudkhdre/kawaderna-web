/** Approved Gap 5 copy, including the owner's Chain A R1 decision. */
export const DEMO_COPY = {
  disclosure: 'نسخة تجريبية من كوادرنا — بيانات وحسابات افتراضية',
  // Owner decision O-8 (2026-11-17) replaced the approved sentence: still one generic message that never says which of the
  // two was wrong, now with a way forward.
  invalidLogin: 'معرّف المستخدم أو كلمة المرور غير صحيحة. راجع الحقلين ثم أعد المحاولة.',
  recovery: 'تعذّر استعادة الجلسة السابقة. بدأت تجربة جديدة بالبيانات الافتراضية.',
  storageUnavailable: 'تعذّر حفظ بيانات التجربة في هذه الجلسة. يمكنك متابعة الاستخدام، لكن قد لا تُستعاد التغييرات بعد تحديث الصفحة.',
  // Owner-approved wording (006, 2026-11-17). `hrEmpty` is the title; the rest is supporting text.
  hrEmpty: 'لا توجد طلبات بانتظار مراجعتك حاليًا',
  hrEmptyBody: 'تظهر هنا طلبات الإجازة التي تحتاج مراجعة الموارد البشرية بعد استيفاء مراحل الموافقة السابقة.',
  hrEmptyHint: 'لتجربة هذا المسار، ادخل بحساب الموظف وقدّم طلبًا يتجاوز الرصيد، ثم وافق عليه من حساب المدير.',
  hrEmptyAction: 'ابدأ تجربة مسار الموافقات',
  employeeEmptyTitle: 'لم تقدّم أي طلب إجازة بعد',
  employeeEmptyBody: 'ستظهر هنا طلباتك مع حالة كل طلب ومسار موافقته وسجل قراراته.',
  employeeEmptyAction: 'قدّم طلبك الأول',
  // Owner decision E (2026-11-17): default Manager empty-state title.
  managerEmpty: 'لا توجد طلبات بانتظار قرارك حاليًا',
  managerEmptyBody: 'تظهر هنا طلبات الإجازة المسندة إليك والتي تنتظر قرارك.',
  managerEmptyHint: 'عند وصول طلب جديد يظهر في هذه القائمة، ويمكنك عندها الموافقة عليه أو رفضه مع تسجيل السبب.',
  unavailableTitle: 'ميزة خارج نطاق التجربة',
  unavailableMessage: 'هذه الميزة غير متاحة في النسخة التجريبية الحالية. يعرض الديمو جزءًا من تجربة كوادرنا، بينما يشمل تصميم المنتج الكامل وحدات ووظائف إضافية.',
  close: 'إغلاق',
  fixedDates: 'التواريخ والأوقات في هذا الديمو ثابتة لأغراض العرض، وليست توقيتًا حقيقيًا.',
  // Owner decision C: a quiet, always-available path to the central contact channel (no modal, no request data).
  contactLink: 'تواصل معنا بخصوص كوادرنا',
  contactLinkNewTab: '(يفتح في نافذة جديدة)',
  resetTitle: 'إعادة ضبط التجربة؟',
  resetDescription: 'سيتم استعادة بيانات الطلبات التجريبية إلى حالتها الأصلية وتسجيل خروجك.',
  resetCancel: 'إلغاء',
  resetConfirm: 'إعادة الضبط',
} as const;
