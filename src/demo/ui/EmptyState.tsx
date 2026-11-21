import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import './demo-ui.css';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Short demo-only help. Rendered as supporting text, never as a status claim. */
  hint?: string;
  /** One action, only when it does something real. No dead buttons. */
  action?: { label: string; onClick: () => void };
  /** Extra content such as a secondary action (kept out of the contract above on purpose). */
  children?: ReactNode;
  testId?: string;
  /** Heading level of the title; use 3 when the empty state sits inside a section that already has an h2. */
  level?: 2 | 3;
}

/**
 * Shared empty state for Employee, Manager and HR (006 P2). A heading, one honest sentence,
 * optional help and at most one action. It never explains *why* a list is empty unless the caller
 * can prove it from real state; that logic lives in the caller, not here.
 */
export const EmptyState = ({ icon: Icon, title, body, hint, action, children, testId, level = 2 }: EmptyStateProps) => {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
  <section className="kd kd-empty" dir="rtl" data-empty-state={testId ?? 'true'}>
    <span className="kd-empty__icon" aria-hidden="true"><Icon size={24} /></span>
    <Heading className="kd-empty__title">{title}</Heading>
    <p className="kd-empty__body">{body}</p>
    {hint && <p className="kd-empty__hint">{hint}</p>}
    {(action || children) && (
      <div className="kd-empty__actions">
        {action && <button type="button" className="kd-btn kd-btn--primary kd-btn--inline" onClick={action.onClick}>{action.label}</button>}
        {children}
      </div>
    )}
  </section>
  );
};
