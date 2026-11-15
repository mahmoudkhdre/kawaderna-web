/** Figma map + DV-13 only. Stable IDs disambiguate the two deliberately repeated employee labels. */
export interface DemoNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly available: boolean;
}
export const DEMO_SIDEBAR = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: 'layout-dashboard', available: false },
  { id: 'employees', label: 'الموظفين', icon: 'users', available: false },
  { id: 'employees-clock', label: 'الموظفين', icon: 'clock-5', available: false },
  { id: 'leave', label: 'طلبات الإجازة', icon: 'calendar', available: true },
  { id: 'tasks', label: 'المهام', icon: 'list-todo', available: false },
  { id: 'payroll', label: 'الرواتب', icon: 'dollar-sign', available: false },
  { id: 'wage-protection', label: 'نظام حماية الاجور', icon: 'shield-check', available: false },
  { id: 'loans', label: 'القروض والسلف', icon: 'credit-card', available: false },
  { id: 'insurance', label: 'التأمين الصحي', icon: 'heart-pulse', available: false },
  { id: 'financial-health', label: 'الصحة المالية', icon: 'wallet', available: false },
  { id: 'performance', label: 'الأداء', icon: 'target', available: false },
  { id: 'reports', label: 'التقارير', icon: 'chart-column-increasing', available: false },
  { id: 'assistant', label: 'المساعد الذكي', icon: 'sparkles', available: false },
  { id: 'settings', label: 'الإعدادات', icon: 'settings', available: false },
] as const satisfies readonly DemoNavigationItem[];
export const DEMO_MOBILE_NAVIGATION = [
  { id: 'home', label: 'الرئيسية', icon: 'house', available: false },
  { id: 'attendance', label: 'الحضور', icon: 'clock', available: false },
  { id: 'leave', label: 'الإجازات', icon: 'calendar', available: true },
  { id: 'salary', label: 'الراتب', icon: 'dollar-sign', available: false },
  { id: 'benefits', label: 'مزاياي', icon: 'shield', available: false },
] as const satisfies readonly DemoNavigationItem[];
export const getDemoNavigation = () => ({ sidebar: DEMO_SIDEBAR, mobile: DEMO_MOBILE_NAVIGATION, activeId: 'leave' as const });
