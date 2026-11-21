import { ClipboardCheck, Inbox } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Persona } from '../../domain/leave/types';
import type { EmployeeBinding } from '../contracts';
import { DEMO_COPY } from '../copy';
import type { DemoEntry } from '../ui-contract';
import { EmptyState } from '../ui/EmptyState';
import { GUIDE_COPY, HR_EMPTY_ACTION_LABEL, PHASE_LABEL, guideText, hrEmptyContent, managerEmptyContent } from './copy';
import { deriveGuide, derivePhase, recommendedPersona } from './derive';
import { findGuideFacts, selectGuideReason, selectTrackable } from './facts';
import { GuideIntro, GuideLoginHint, GuideResumeBar } from './GuideEntry';
import { GuidePanel } from './GuidePanel';
import { trackedRowCss } from './trackedStyle';
import { useGuideStore } from './store';
import type { GuideStore } from './store';

export interface GuideLayerArgs {
  demo: DemoEntry;
  store: GuideStore;
  /** The one central contact source (resolved once in App). */
  contactHref: string;
  /** Public demo-account lookups come from the caller, so guide modules never touch authentication data. */
  demoEmployeeId: string;
  loginIdFor: (persona: Persona) => string;
}

const TRACKED_ID = /^LV-2026-\d{1,6}$/;

/**
 * Connects the guide to the demo WITHOUT changing the controller, the session or any page's contract.
 * Everything it renders is derived from `demo.requests` + the signed-in persona + the guide preference.
 */
export const useGuideLayer = ({ demo, store, contactHref, demoEmployeeId, loginIdFor }: GuideLayerArgs) => {
  const guide = useGuideStore(store);
  const session = demo.session;
  const persona = session?.persona ?? null;
  const guided = guide.mode === 'guided';
  const facts = findGuideFacts(demo.requests, guide.requestId);
  const phase = derivePhase(guide.requestId, facts);
  const model = persona ? deriveGuide(guide.requestId, facts, persona) : null;
  const trackedRequest = guide.requestId ? demo.requests.find(item => item.requestId === guide.requestId) : undefined;

  // Row/Card highlight for the tracked request, as a style rule: no DOM mutation of page-owned nodes.
  const trackedStyle = guided && guide.requestId && TRACKED_ID.test(guide.requestId) && persona !== null
    ? <style data-guide-tracked-style="true">{trackedRowCss(guide.requestId)}</style>
    : null;

  // Bring the tracked request into view ON REQUEST (a button in the guide), never automatically: signing in must land on
  // the start of the page with the guide in view (fix D2). Instant, never animated (so Reduced Motion is respected by
  // construction); focus moves to the row's own action.
  // O-4: the Manager's filters are NEVER cleared silently. When a filter hides the request the guide says so and offers the
  // explicit action «إزالة التصفية وعرض الطلب»; only that click applies the announced change.
  const [trackedHidden, setTrackedHidden] = useState<null | 'filtered' | 'other'>(null);
  const focusGuideTitle = () => {
    const title = document.querySelector<HTMLElement>('[data-guide-title]') ?? document.querySelector<HTMLElement>('[data-demo-shell] main h1');
    title?.focus({ preventScroll: true });
  };
  const findTrackedRow = () => Array.from(document.querySelectorAll<HTMLElement>(`[data-request-id="${guide.requestId}"]`))
    .find(node => node.getClientRects().length > 0);
  const reveal = (target: HTMLElement) => {
    setTrackedHidden(null);
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    target.querySelector<HTMLElement>('[data-open-detail], button')?.focus({ preventScroll: true });
  };
  const showTracked = () => {
    const target = findTrackedRow();
    if (target) { reveal(target); return; }
    // Not in the list: say why, and keep focus on a real element (never silent). A visible filter is the explicit cause
    // only when the page's own "clear filter" control exists (it is rendered only while a filter is active).
    setTrackedHidden(document.querySelector('[data-filter-clear]') ? 'filtered' : 'other');
    focusGuideTitle();
  };
  const clearFilterAndShow = () => {
    // The same state change the user would make with the page's own «مسح التصفية» control, flushed so the row exists next.
    const clear = document.querySelector<HTMLElement>('[data-filter-clear]');
    if (clear) flushSync(() => clear.click());
    const target = findTrackedRow();
    if (target) { reveal(target); return; }
    setTrackedHidden('other');
    focusGuideTitle();
  };
  // A stale "the filter hides it" message must not outlive the user's own filter change.
  useEffect(() => {
    if (trackedHidden === null) return;
    const dismiss = (event: Event) => {
      const node = event.target as Element | null;
      if (event.type === 'click' ? node?.closest('[data-filter-clear]') : node?.closest('[data-filters]')) setTrackedHidden(null);
    };
    document.addEventListener('input', dismiss);
    document.addEventListener('change', dismiss);
    document.addEventListener('click', dismiss);
    return () => { document.removeEventListener('input', dismiss); document.removeEventListener('change', dismiss); document.removeEventListener('click', dismiss); };
  }, [trackedHidden]);

  // HR page: open on the tracked request when it is one HR may see (uses the page's own selection callback).
  const selectedForHr = useRef<string | null>(null);
  const hr = demo.hr;
  useEffect(() => {
    if (!hr) { selectedForHr.current = null; return; }
    if (!guided || !guide.requestId) return;
    const visible = hr.selectableRequests?.some(option => option.requestId === guide.requestId);
    if (!visible || hr.requestId === guide.requestId || selectedForHr.current === guide.requestId) return;
    selectedForHr.current = guide.requestId;
    hr.onSelectRequest?.(guide.requestId);
  }, [guided, guide.requestId, hr]);

  // Focus hand-off: a guide control that is replaced by the next state (the intro choice, "skip", "resume", the summary
  // buttons) would otherwise drop focus on <body>. After such an action, and only then, focus moves to the new
  // content's own title/control. Nothing runs on load or on unrelated renders, so restoring a session never takes focus.
  const handoff = useRef<Element | null>(null);
  const withHandoff = <A extends unknown[]>(action: (...args: A) => void) => (...args: A) => { handoff.current = document.activeElement; action(...args); };
  useEffect(() => {
    const origin = handoff.current;
    if (!origin) return;
    handoff.current = null;
    // Only when the control that held focus was replaced by the action. A no-op action leaves it connected, so nothing moves.
    if (origin.isConnected && document.activeElement === origin) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const target = ['#kd-hint-title', '[data-guide-title]', '[data-guide-start]', '#kd-login-title', '[data-demo-shell] main h1']
      .map(selector => document.querySelector<HTMLElement>(selector))
      .find(node => node && node.getClientRects().length > 0);
    if (!target) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });

  // D7 (part 2): the Manager decided a DIFFERENT request while the tracked one still waits. Derived from the change in
  // "which requests wait for the Manager"; kept in memory only, cleared as soon as the tracked request moves on.
  const managerPending = persona === Persona.MANAGER
    ? demo.requests.filter(item => item.approvalStatus === 'pending' && item.approvalStage === 'manager').map(item => item.requestId)
    : null;
  const trackable = managerPending !== null && guide.requestId !== null && model?.phase === 'awaiting_manager';
  const pendingKey = `${managerPending?.join('|') ?? '-'}#${guide.requestId ?? '-'}#${trackable}`;
  const [seen, setSeen] = useState<{ key: string; pending: string[] | null; tracked: string | null; other: boolean }>({ key: '', pending: null, tracked: null, other: false });
  // Derived during render (no effect): the previous pending set lives in state and is compared with the current one.
  const removedOther = trackable && seen.pending !== null && seen.pending.some(requestId => requestId !== guide.requestId && !managerPending.includes(requestId));
  const otherDecided = trackable && ((seen.tracked === guide.requestId && seen.other) || removedOther);
  if (seen.key !== pendingKey) setSeen({ key: pendingKey, pending: managerPending, tracked: guide.requestId, other: otherDecided });

  const switchTo = () => demo.logout(); // sign out only; the account is chosen and confirmed on the sign-in screen

  const employee: EmployeeBinding | null = demo.employee && {
    ...demo.employee,
    onSubmit: input => {
      const result = demo.employee!.onSubmit(input);
      if (result.ok) store.captureSubmitted(result.request.requestId);
      return result;
    },
  };

  const labelFor = (requestId: string) => {
    const facts = findGuideFacts(demo.requests, requestId);
    const state = PHASE_LABEL[derivePhase(requestId, facts)];
    return state ? `${requestId} — ${state}` : requestId;
  };
  const candidates = selectTrackable(demo.requests, session && { persona: session.persona, actorId: session.actorId }, demoEmployeeId)
    .map(requestId => ({ requestId, label: labelFor(requestId) }));

  // ---- signed-out screen ----
  const nextPersona = recommendedPersona(phase);
  const loginIntro: ReactNode = guide.mode === null
    ? <GuideIntro onGuided={withHandoff(store.start)} onFree={withHandoff(store.skip)} />
    : guided
      ? <GuideLoginHint nextPersona={nextPersona} firstStep={guide.requestId === null} onSkip={withHandoff(store.skip)} />
      : <GuideResumeBar paused={guide.requestId !== null} onStart={withHandoff(store.start)} />;
  const suggestedLoginId = guided ? loginIdFor(nextPersona) : undefined;

  // ---- signed-in shell ----
  const canShowTracked = guided && persona === Persona.MANAGER && model?.phase === 'awaiting_manager' && !!trackedRequest && TRACKED_ID.test(trackedRequest.requestId);
  let shellGuide: ReactNode = null;
  if (session && model) {
    if (!guided) {
      shellGuide = <GuideResumeBar paused={guide.requestId !== null} onStart={withHandoff(store.start)} />;
    } else {
      const employeeBalance = demo.employee?.balance;
      const text = guideText(model, session.persona, { requestId: guide.requestId, employeeBalance });
      const reason = model.outcome === 'rejected'
        ? session.persona === Persona.EMPLOYEE
          ? demo.employee?.requests.find(item => item.requestId === guide.requestId)?.rejectionReason ?? null
          : selectGuideReason(trackedRequest, session.persona)
        : null;
      const target = model.action.kind === 'switch' ? model.action.target : null;
      shellGuide = (
        <GuidePanel
          persona={session.persona} model={model} text={text} trackedId={guide.requestId} candidates={candidates}
          collapsed={guide.collapsed} reason={reason} contactHref={contactHref}
          switchLabel={target ? GUIDE_COPY.switchLabel[target] : null}
          onShowTracked={canShowTracked ? showTracked : undefined}
          onSwitch={switchTo} onRestart={withHandoff(store.clearTracking)} onExplore={withHandoff(store.skip)} onSkip={withHandoff(store.skip)}
          otherDecided={otherDecided} trackedNotShown={trackedHidden !== null} trackedFiltered={trackedHidden === 'filtered'}
          onClearAndShow={trackedHidden === 'filtered' ? clearFilterAndShow : undefined}
          onToggle={() => store.setCollapsed(!guide.collapsed)} onTrack={store.track}
          onTryAnother={withHandoff(store.clearTracking)} onResetDemo={demo.requestReset}
        />
      );
    }
  }

  // ---- keyboard: a skip link straight to the tracked request's action (the guide button, reachable from page start) ----
  const skipToTracked = canShowTracked ? { label: GUIDE_COPY.controls.skipToTracked, onActivate: showTracked } : undefined;

  // ---- next step right under the Employee's success message (D3): same action as the guide button, no floating element ----
  const employeeNextStep: ReactNode = guided && session?.persona === Persona.EMPLOYEE && model?.action.kind === 'switch' && model.action.target === Persona.MANAGER
    ? <button type="button" className="kd-btn kd-btn--primary" data-guide-next="manager" onClick={switchTo}>{GUIDE_COPY.switchLabel.manager}</button>
    : null;

  // ---- Manager empty state (owner decision E) ----
  const managerCase = managerEmptyContent(guide.mode, model, { body: DEMO_COPY.managerEmptyBody, hint: DEMO_COPY.managerEmptyHint });
  const managerAction = managerCase.action;
  const managerEmpty: ReactNode = (
    <EmptyState icon={ClipboardCheck} title={DEMO_COPY.managerEmpty} body={managerCase.body} hint={managerCase.hint} testId="manager"
      action={managerAction ? {
        label: managerAction === 'start' ? HR_EMPTY_ACTION_LABEL.start : HR_EMPTY_ACTION_LABEL['new-path'],
        onClick: withHandoff(managerAction === 'start' ? store.start : store.clearTracking),
      } : undefined} />
  );

  // ---- HR empty state (cases A–G) ----
  const hrCase = hrEmptyContent(guide.mode, model, { body: DEMO_COPY.hrEmptyBody, hint: DEMO_COPY.hrEmptyHint });
  const hrAction = hrCase.action;
  const hrEmpty: ReactNode = (
    <EmptyState icon={Inbox} title={DEMO_COPY.hrEmpty} body={hrCase.body} hint={hrCase.hint} testId="hr"
      action={hrAction ? {
        label: HR_EMPTY_ACTION_LABEL[hrAction],
        onClick: hrAction === 'switch-manager' ? switchTo : withHandoff(hrAction === 'start' ? store.start : store.clearTracking),
      } : undefined} />
  );

  return {
    guide, loginIntro, suggestedLoginId, shellGuide, employee, employeeNextStep, hrEmpty, managerEmpty, trackedStyle, skipToTracked,
    /** Call only after the demo reset was CONFIRMED. */
    onResetConfirmed: store.reset,
  };
};
