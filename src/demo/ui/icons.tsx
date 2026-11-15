import {
  Calendar, ChartColumnIncreasing, Clock, Clock5, CreditCard, DollarSign, HeartPulse, House, LayoutDashboard,
  ListTodo, Settings, Shield, ShieldCheck, Sparkles, Target, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Maps the stable icon names in demo/navigation.ts (Lucide, as in Figma) to components. */
const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard, users: Users, 'clock-5': Clock5, calendar: Calendar, 'list-todo': ListTodo,
  'dollar-sign': DollarSign, 'shield-check': ShieldCheck, 'credit-card': CreditCard, 'heart-pulse': HeartPulse,
  wallet: Wallet, target: Target, 'chart-column-increasing': ChartColumnIncreasing, sparkles: Sparkles,
  settings: Settings, house: House, clock: Clock, shield: Shield,
};
export const NavIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = ICONS[name];
  return Icon ? <Icon size={size} aria-hidden="true" focusable="false" /> : null;
};
