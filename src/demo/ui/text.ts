export const NAV_LABEL = 'التنقل الرئيسي'; // derived landmark name, not Figma copy

/** Derived (not Figma/owner-quoted) copy: labels the two visible demo accounts and their quick-fill. */
export const LOGIN_TEXT = {
  title: 'تسجيل دخول',
  product: 'كوادرنا لإدارة الموارد البشرية',
  userId: 'معرّف المستخدم',
  userIdPlaceholder: 'مثال: manager-demo',
  password: 'كلمة المرور',
  passwordPlaceholder: '********',
  submit: 'تسجيل دخول',
  accounts: 'حسابات تجريبية',
  password_label: 'كلمة المرور:',
  userId_label: 'معرّف المستخدم:',
  quickFill: { employee: 'تعبئة حساب الموظف', manager: 'تعبئة حساب المدير', hr: 'تعبئة حساب الموارد البشرية' },
} as const;

/** Figma header text (570:16570) plus derived control labels (DV-15, approved Reset title). */
export const HEADER_TEXT = {
  product: 'كوادرنا لإدارة الموارد البشرية',
  city: 'الرياض',
  tagline: 'إدارة طلبات الموظفين',
  logout: 'تسجيل الخروج',
  reset: 'إعادة ضبط التجربة',
} as const;

