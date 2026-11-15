import { describe, expect, it } from 'vitest';
import { getDemoNavigation } from './navigation';
import { UNAVAILABLE_TOAST_BEHAVIOR } from './ui-contract';

describe('T011a Figma navigation contract', () => {
  it('retains fourteen original labels/icons/order with exactly DV-13 substitutions', () => {
    const { sidebar } = getDemoNavigation();
    const original = ['لوحة التحكم', 'الموظفين', 'الموظفين', 'طلبات الأجازة', 'المهام', 'الرواتب', 'نظام حماية الاجور', 'القروض والسلف', 'التأمين الصحي', 'الصحة المالية', 'الأداء', 'التقارير', 'المساعد الذكي', 'الإعدادت'];
    expect(sidebar).toHaveLength(14);
    expect(sidebar.filter((item, index) => item.label !== original[index]).map(item => item.label)).toEqual(['طلبات الإجازة', 'الإعدادات']);
    expect(sidebar.map(item => item.icon)).toEqual(['layout-dashboard', 'users', 'clock-5', 'calendar', 'list-todo', 'dollar-sign', 'shield-check', 'credit-card', 'heart-pulse', 'wallet', 'target', 'chart-column-increasing', 'sparkles', 'settings']);
    expect(new Set(sidebar.map(item => item.id)).size).toBe(14);
  });
  it('retains five mobile labels/icons in RTL order, with only Leave functional and active', () => {
    const navigation = getDemoNavigation();
    expect(navigation.mobile.map(item => item.label)).toEqual(['الرئيسية', 'الحضور', 'الإجازات', 'الراتب', 'مزاياي']);
    expect(navigation.mobile.map(item => item.icon)).toEqual(['house', 'clock', 'calendar', 'dollar-sign', 'shield']);
    for (const items of [navigation.sidebar, navigation.mobile]) expect(items.filter(item => item.available).map(item => item.id)).toEqual(['leave']);
    expect(navigation.activeId).toBe('leave');
  });
  it('hands off approved Toast timing, pause, semantics and placement without creating presentation', () => {
    expect(UNAVAILABLE_TOAST_BEHAVIOR).toMatchObject({ autoDismissMs: 5000, pauseOnHover: true, pauseOnFocusWithin: true, role: 'status', ariaLive: 'polite', dir: 'rtl', dismissible: true, desktopPlacement: 'visual-bottom-left', mobilePlacement: 'above-bottom-navigation' });
  });
});
