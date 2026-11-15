import type { ElementType, MouseEvent, ReactNode } from 'react';
import {
  ArrowLeft, Calendar, ChartColumnIncreasing, Clock, CreditCard, Crown, DollarSign, HeartPulse, LayoutDashboard,
  ListTodo, Settings, ShieldCheck, Sparkles, Target, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useReveal } from './useReveal';

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar, users: Users, clock: Clock, 'list-todo': ListTodo, 'dollar-sign': DollarSign,
  'shield-check': ShieldCheck, 'credit-card': CreditCard, 'heart-pulse': HeartPulse, wallet: Wallet,
  'layout-dashboard': LayoutDashboard, target: Target, 'chart-column-increasing': ChartColumnIncreasing,
  settings: Settings, sparkles: Sparkles,
};

export const ModuleIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const Icon = ICONS[name];
  return Icon ? <Icon size={size} aria-hidden="true" focusable="false" strokeWidth={1.5} /> : null;
};

/** Brand mark as drawn in the Figma header/login (`#7c3aed → #1e3a8a` tile, crown icon). */
export const BrandMark = ({ size = 40 }: { size?: number }) => (
  <span className="ld-mark" style={{ width: size, height: size }} aria-hidden="true">
    <Crown size={Math.round(size * 0.6)} strokeWidth={1.5} />
  </span>
);

export interface DemoLinkProps {
  readonly href: string;
  readonly onStartDemo?: () => void;
  readonly label: string;
  readonly variant?: 'primary' | 'onDark';
  readonly size?: 'md' | 'lg';
  readonly placement: string;
}

/**
 * The single demo CTA. It is a real link (works without JS and in new tabs). When the integrator
 * passes `onStartDemo`, a plain left click is handed to it instead of navigating.
 */
export const DemoLink = ({ href, onStartDemo, label, variant = 'primary', size = 'md', placement }: DemoLinkProps) => {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onStartDemo || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onStartDemo();
  };
  return (
    <a className={`ld-btn ld-btn--${variant} ld-btn--${size}`} href={href} onClick={onClick} data-demo-cta={placement}>
      <span>{label}</span>
      <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" focusable="false" className="ld-btn__icon" />
    </a>
  );
};

export const Reveal = ({ as: Tag = 'div', className = '', children, delay = 0 }: {
  as?: ElementType; className?: string; children: ReactNode; delay?: number;
}) => {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <Tag ref={ref} className={`ld-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
};

export const SectionHeading = ({ id, kicker, title, body, align = 'start', tone = 'light' }: {
  id: string; kicker: string; title: string; body?: string; align?: 'start' | 'center'; tone?: 'light' | 'dark';
}) => (
  <Reveal className={`ld-heading ld-heading--${align} ld-heading--${tone}`}>
    <p className="ld-kicker">{kicker}</p>
    <h2 id={id} className="ld-h2">{title}</h2>
    {body && <p className="ld-lede">{body}</p>}
  </Reveal>
);
