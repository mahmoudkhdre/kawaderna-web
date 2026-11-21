import type { ReactNode } from 'react';
import type { DemoState, EmployeeBinding, HrDecisionBinding, ManagerInboxBinding } from './contracts';
import type { DemoSession, LoginResult } from './session';
import type { SnapshotLoadResult } from './snapshot';
import type { getDemoNavigation } from './navigation';

/** T011a presentation contract. Claude owns components; Codex alone composes them in T011b.
 * Login owns its field drafts/quick-fill. onLogin failure must keep the session logged out and announce
 * DEMO_COPY.invalidLogin with role="alert". Owner decision O-5 (2026-11-17) replaces the earlier rule that cleared the
 * password draft: the typed values are kept so they can be corrected (focus returns to the password, text selected).
 * No controller/snapshot ever receives a stored password. */
export interface DemoLoginProps {
  onLogin: (loginId: string, password: string) => LoginResult;
  recoveryNotice: string | null;
  storageNotice: string | null;
  onDismissRecovery: () => void;
  /** 006: optional guide content shown above the sign-in card (never replaces it). */
  intro?: ReactNode;
  /** 006: account the tour suggests next. Pre-fills the public demo credentials; signing in stays the user's action. */
  suggestedLoginId?: string;
}
export interface DemoSessionControlsProps {
  session: DemoSession;
  onLogout: () => void;
  onRequestReset: () => void;
}
export interface DemoNavigationProps {
  navigation: ReturnType<typeof getDemoNavigation>;
  onNotifyUnavailable: (itemId: string) => void;
}
export interface UnavailableNotice { id: number; title: string; message: string }
/** Presentation implements the timer. A new notice.id replaces the old toast and resets it.
 * Pause while hovered OR focus-within; resume only when both are false.
 * Never steal focus; role=status, aria-live=polite, dir=rtl, non-modal, close label=إغلاق.
 * Desktop: visual bottom-left of main area (RTL inline-end), clear of Header/right rail.
 * Mobile: above 74px bottom navigation + >=16px token gap + env(safe-area-inset-bottom),
 * inside 16px margins. Verify it never obscures essential controls in rendering.
 * No new dependency, measurements or token system. */
export const UNAVAILABLE_TOAST_BEHAVIOR = {
  autoDismissMs: 5000, pauseOnHover: true, pauseOnFocusWithin: true,
  role: 'status', ariaLive: 'polite', dir: 'rtl', dismissible: true,
  desktopPlacement: 'visual-bottom-left', mobilePlacement: 'above-bottom-navigation',
} as const;
export interface DemoToastProps {
  notice: UnavailableNotice | null;
  behavior: typeof UNAVAILABLE_TOAST_BEHAVIOR;
  onDismiss: (noticeId: number) => void;
}
/** T015 will implement the actual confirmation dialog after Claude's triggers exist.
 * Escape, backdrop and Cancel call onCancel; focus trap/return remain dialog responsibilities. */
export interface DemoResetConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export interface DemoShellProps extends DemoSessionControlsProps, DemoNavigationProps {
  children: ReactNode;
  /** 006: optional non-modal guide rendered above the page content. */
  guide?: ReactNode;
  /** 006: the one central contact link (resolved in App). Shown as a quiet link under the page, never as a modal. */
  contactHref?: string;
  /** 006: Manager only, while the tracked request waits: a skip link from the page start straight to its action. */
  skipToTracked?: { label: string; onActivate: () => void };
  toast: DemoToastProps;
  storageNotice: string | null;
}
export interface DemoEntry extends DemoState {
  hydration: Pick<SnapshotLoadResult, 'source' | 'recoveryReason'>;
  recoveryNotice: string | null;
  storageNotice: string | null;
  persistence: 'available' | 'saved' | 'memory-only';
  login: DemoLoginProps['onLogin'];
  logout: () => void;
  requestReset: () => void;
  cancelReset: () => void;
  confirmReset: () => void;
  resetRequested: boolean;
  dismissRecovery: () => void;
  navigation: ReturnType<typeof getDemoNavigation>;
  notifyUnavailable: DemoNavigationProps['onNotifyUnavailable'];
  toast: DemoToastProps;
  /** Exactly one authorized role binding is present. Stale callbacks recheck the live session. */
  manager: ManagerInboxBinding | null;
  hr: HrDecisionBinding | null;
  employee: EmployeeBinding | null;
}
