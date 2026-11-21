import { Check, CheckCircle2, ChevronDown, ChevronUp, CircleDot, Circle, Compass, ExternalLink, MinusCircle, RotateCcw, XCircle } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Persona } from '../../domain/leave/types';
import '../ui/guide.css';
import { formatNumber } from '../../lib/format';
import { GUIDE_COPY, summaryContent } from './copy';
import type { GuideText } from './copy';
import type { GuideModel, GuideStageView } from './types';
import { useCompactViewport } from './useCompactViewport';

const PERSONA_LABEL = { employee: 'الموظف', manager: 'المدير', hr: 'الموارد البشرية' } as const;

/** Icon + text for every state: colour is never the only signal. Green is reserved for a CONFIRMED final approval. */
const StageIcon = ({ stage }: { stage: GuideStageView }) => {
  if (stage.state === 'completed' && stage.outcome === 'rejected') return <XCircle size={24} className="kd-step__icon kd-step__icon--rejected" aria-hidden="true" />;
  if (stage.state === 'completed' && stage.id === 'result' && stage.outcome === 'approved') return <CheckCircle2 size={24} className="kd-step__icon kd-step__icon--approved" aria-hidden="true" />;
  if (stage.state === 'completed') return <CheckCircle2 size={24} className="kd-step__icon kd-step__icon--done" aria-hidden="true" />;
  if (stage.state === 'current') return <CircleDot size={24} className="kd-step__icon kd-step__icon--current" aria-hidden="true" />;
  if (stage.state === 'not_applicable') return <MinusCircle size={24} className="kd-step__icon kd-step__icon--muted" aria-hidden="true" />;
  return <Circle size={24} className="kd-step__icon kd-step__icon--muted" aria-hidden="true" />;
};

export const GuideStepper = ({ stages }: { stages: GuideStageView[] }) => (
  <ol className="kd-steps" aria-label={GUIDE_COPY.controls.stepsLabel} data-guide-stepper="true">
    {stages.map(stage => {
      const stateText = stage.state === 'completed' && stage.outcome
        ? `${GUIDE_COPY.stageState.completed} ${GUIDE_COPY.stageOutcome[stage.outcome]}`
        : GUIDE_COPY.stageState[stage.state];
      return (
        <li key={stage.id} className="kd-step" data-stage={stage.id} data-state={stage.state} data-outcome={stage.outcome ?? undefined}
          aria-current={stage.state === 'current' ? 'step' : undefined}>
          <StageIcon stage={stage} />
          <span className="kd-step__label">{GUIDE_COPY.stages[stage.id]}</span>
          <span className="kd-step__state">{stateText}</span>
        </li>
      );
    })}
  </ol>
);

export interface GuideCandidate { requestId: string; label: string }

export interface GuidePanelProps {
  persona: Persona;
  model: GuideModel;
  text: GuideText;
  trackedId: string | null;
  candidates: GuideCandidate[];
  collapsed: boolean;
  /** Persona label of the next account, when the action is a role switch. */
  switchLabel: string | null;
  reason: string | null;
  contactHref: string;
  /** Manager only, while the tracked request waits for them: scrolls it into view and focuses its action. */
  onShowTracked?: () => void;
  /** D7: the Manager just decided a different request while the tracked one still waits for them. */
  otherDecided?: boolean;
  /** The reveal action found no visible row (filtered out or covered): say so instead of doing nothing. */
  trackedNotShown?: boolean;
  /** O-4: the reveal action found no visible row AND a filter is active, so the filter is what hides it. */
  trackedFiltered?: boolean;
  /** O-4: explicit, announced action: clears the filter the user can see, then reveals the request. Never runs by itself. */
  onClearAndShow?: () => void;
  onSwitch: () => void;
  onRestart: () => void;
  onExplore: () => void;
  onSkip: () => void;
  onToggle: () => void;
  onTrack: (requestId: string) => void;
  onTryAnother: () => void;
  onResetDemo: () => void;
  /** Extra content under the text (kept for the fixed-date note). */
  children?: ReactNode;
}

/**
 * Non-modal guide (006 P4). It sits above the page inside the shell, takes no focus, traps nothing, and covers no
 * action row. Everything shown is derived from the tracked request's real state.
 */
export const GuidePanel = (props: GuidePanelProps) => {
  const { persona, model, text, trackedId, candidates, collapsed, switchLabel, reason, contactHref } = props;
  const titleId = useId();
  const bodyId = useId();
  const stepsId = useId();
  const moreId = useId();
  const pickId = useId();
  // O-2: on a phone the guide opens COMPACT (stage, progress, one short instruction, next action); the stepper, full
  // explanation, "why" and the request picker are one explicit toggle away. Per-screen state, never persisted.
  const compact = useCompactViewport();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const closed = compact && !detailsOpen;
  const currentStage = model.stages.find(stage => stage.state === 'current');
  const summary = summaryContent(model);
  const total = model.progress.total;
  const showPicker = candidates.length > 1 || (candidates.length === 1 && candidates[0].requestId !== trackedId);
  // D9: a request that no longer exists (or whose stage cannot be proven) has no meaningful stages, progress or "why it matters".
  const hasStages = model.phase !== 'missing' && model.phase !== 'unknown';
  // The details toggle controls only the elements that exist for this state.
  const controlled = [hasStages && stepsId, (summary || hasStages) && moreId, showPicker && pickId].filter(Boolean).join(' ');
  const showOther = !!props.otherDecided && persona === Persona.MANAGER && model.phase === 'awaiting_manager';
  const showNotShown = !!props.trackedNotShown && model.phase === 'awaiting_manager';
  // A collapsed desktop guide opens for the not-shown notice: it answers an explicit click and holds the action (the saved preference is untouched).
  const bodyHidden = !compact && collapsed && !showNotShown;
  // One persistent, concise live region (title + the two transient messages) instead of making the whole step block live:
  // it is mounted with the panel (so nothing is announced on load), is not atomic-noisy with buttons/"why", and is never
  // inside the collapsible body. The visible text stays readable by normal navigation. Real screen-reader behaviour: UNVERIFIED.
  const notShownText = props.trackedFiltered ? GUIDE_COPY.controls.trackedFiltered : GUIDE_COPY.controls.trackedNotShown;
  const announcement = [summary ? summary.title : text.title, showOther ? GUIDE_COPY.controls.otherDecided : '', showNotShown ? notShownText : ''].filter(Boolean).join('. ');
  return (
    // D10: the region keeps one stable name; the changing step title is a plain paragraph, not a heading, so the
    // page <h1> that follows in the DOM stays the first heading a screen-reader user meets.
    <aside className="kd kd-guide" dir="rtl" aria-label={GUIDE_COPY.regionLabel} data-guide="true" data-guide-phase={model.phase} data-collapsed={bodyHidden ? 'true' : undefined}
      data-compact={compact ? 'true' : undefined} data-details={compact ? (detailsOpen ? 'open' : 'closed') : undefined}>
      <p className="kd-sr" role="status" aria-live="polite" aria-atomic="true" data-guide-announcer="true">{announcement}</p>
      <div className="kd-guide__bar">
        <span className="kd-guide__badge"><Compass size={16} aria-hidden="true" />{GUIDE_COPY.regionLabel}</span>
        <span className="kd-guide__role">أنت الآن: <strong>{PERSONA_LABEL[persona]}</strong></span>
        {hasStages && <span className="kd-guide__progress" data-guide-progress="true">{`${formatNumber(model.progress.done)} من ${formatNumber(total)} مراحل`}<span className="kd-sr"> مكتملة</span></span>}
        <div className="kd-guide__tools">
          {compact ? (
            <button type="button" className="kd-guide__tool" data-guide-details-toggle="true" aria-expanded={detailsOpen}
              aria-controls={controlled || undefined} onClick={() => setDetailsOpen(open => !open)}>
              {detailsOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              <span>{detailsOpen ? GUIDE_COPY.controls.detailsHide : GUIDE_COPY.controls.detailsShow}</span>
            </button>
          ) : (
            <button type="button" className="kd-guide__tool" aria-expanded={!collapsed} aria-controls={bodyId} onClick={props.onToggle}>
              {collapsed ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
              <span>{collapsed ? GUIDE_COPY.controls.expand : GUIDE_COPY.controls.collapse}</span>
            </button>
          )}
          <button type="button" className="kd-guide__tool" data-guide-skip="true" onClick={props.onSkip}>{GUIDE_COPY.controls.skip}</button>
        </div>
      </div>
      <div id={bodyId} className="kd-guide__body" hidden={bodyHidden}>
        {hasStages && <div id={stepsId} className="kd-guide__more" hidden={closed}><GuideStepper stages={model.stages} /></div>}
        {summary ? (
          <section className="kd-guide__summary" data-guide-summary={model.outcome ?? undefined} aria-labelledby={titleId}>
            <div className="kd-guide__summary-head">
              {model.outcome === 'rejected'
                ? <XCircle size={24} className="kd-step__icon--rejected" aria-hidden="true" />
                : <CheckCircle2 size={24} className="kd-step__icon--approved" aria-hidden="true" />}
              <p id={titleId} className="kd-guide__title" data-guide-title="true" tabIndex={-1}>{summary.title}</p>
            </div>
            <ul id={moreId} className="kd-guide__lines" hidden={closed}>{summary.lines.map(line => <li key={line}><Check size={16} aria-hidden="true" />{line}</li>)}</ul>
            {reason && <p className="kd-guide__reason" data-guide-reason="true"><strong>{GUIDE_COPY.summary.reasonLabel}:</strong> <span>{reason}</span></p>}
            {summary.note && <p className="kd-guide__note" hidden={closed}>{summary.note}</p>}
            <p className="kd-guide__value" hidden={closed}>{GUIDE_COPY.summary.value}</p>
            <div className="kd-guide__actions">
              {switchLabel && <button type="button" className="kd-btn kd-btn--secondary kd-btn--inline" data-guide-switch="true" onClick={props.onSwitch}>{switchLabel}</button>}
              <a className="kd-btn kd-btn--primary kd-btn--inline" data-guide-cta="true" href={contactHref} target="_blank" rel="noopener noreferrer">
                {GUIDE_COPY.summary.cta}<ExternalLink size={16} aria-hidden="true" /><span className="kd-sr"> {GUIDE_COPY.summary.ctaNewTab}</span>
              </a>
              <button type="button" className="kd-btn kd-btn--secondary kd-btn--inline" data-guide-another="true" hidden={closed} onClick={props.onTryAnother}>{GUIDE_COPY.summary.another}</button>
              <button type="button" className="kd-btn kd-btn--ghost kd-btn--inline" data-guide-explore="true" hidden={closed} onClick={props.onSkip}>{GUIDE_COPY.summary.explore}</button>
              <button type="button" className="kd-btn kd-btn--ghost kd-btn--inline" data-guide-reset="true" hidden={closed} onClick={props.onResetDemo}><RotateCcw size={16} aria-hidden="true" />{GUIDE_COPY.summary.again}</button>
            </div>
            <p className="kd-guide__limits" hidden={closed}>{GUIDE_COPY.summary.limits}</p>
          </section>
        ) : (
          <div className="kd-guide__step">
            {closed && currentStage && ( // the stepper below already says it once the details are open
              <p className="kd-guide__stage" data-guide-stage={currentStage.id}>{GUIDE_COPY.controls.currentStage}: <strong>{GUIDE_COPY.stages[currentStage.id]}</strong></p>
            )}
            <p id={titleId} className="kd-guide__title" data-guide-title="true" tabIndex={-1}>{text.title}</p>
            {closed
              ? <p className="kd-guide__text" data-guide-short="true">{text.short}</p>
              : <p className="kd-guide__text" data-guide-text="true">{text.body}</p>}
            {text.routineHint && <p className="kd-guide__hint" hidden={closed}>{text.routineHint}</p>}
            {showOther && (
              <p className="kd-guide__hint kd-guide__hint--other" data-guide-other-hint="true">{GUIDE_COPY.controls.otherDecided}</p>
            )}
            {showNotShown && (
              <div className="kd-guide__hint kd-guide__hint--other" data-guide-not-shown={props.trackedFiltered ? 'filtered' : 'true'}>
                <p className="kd-guide__hint-text">{notShownText}</p>
                {props.trackedFiltered && props.onClearAndShow && (
                  <button type="button" className="kd-btn kd-btn--primary kd-btn--inline" data-guide-clear-show="true" onClick={props.onClearAndShow}>{GUIDE_COPY.controls.clearAndShow}</button>
                )}
              </div>
            )}
            {hasStages && <p id={moreId} className="kd-guide__why" hidden={closed}><strong>{GUIDE_COPY.controls.why}</strong> {text.why}</p>}
            <div className="kd-guide__actions">
              {switchLabel && <button type="button" className="kd-btn kd-btn--primary kd-btn--inline" data-guide-switch="true" onClick={props.onSwitch}>{switchLabel}</button>}
              {model.action.kind === 'restart' && <>
                <button type="button" className="kd-btn kd-btn--primary kd-btn--inline" data-guide-restart="true" onClick={props.onRestart}>{GUIDE_COPY.restart.label}</button>
                <button type="button" className="kd-btn kd-btn--secondary kd-btn--inline" data-guide-explore="true" onClick={props.onExplore}>{GUIDE_COPY.restart.explore}</button>
              </>}
            </div>
          </div>
        )}
        <div className="kd-guide__track" data-guide-tracked-id={trackedId ?? undefined}>
          <span className="kd-guide__track-label">{GUIDE_COPY.controls.trackedLabel}:</span>
          {trackedId ? <bdi className="kd-ltr" data-guide-request-id="true">{trackedId}</bdi> : <span className="kd-guide__muted">{GUIDE_COPY.controls.trackedNone}</span>}
          {props.onShowTracked && <button type="button" className="kd-guide__tool" data-guide-show-tracked="true" onClick={props.onShowTracked}>{GUIDE_COPY.controls.showTracked}</button>}
          {showPicker && (
            <label id={pickId} className="kd-guide__pick" hidden={closed}>
              <span className="kd-sr">{GUIDE_COPY.controls.trackedPick}</span>
              <select className="kd-select" data-guide-picker="true" value={trackedId ?? ''} onChange={event => event.target.value && props.onTrack(event.target.value)}>
                {!trackedId && <option value="">{GUIDE_COPY.controls.trackedPick}</option>}
                {candidates.map(item => <option key={item.requestId} value={item.requestId}>{item.label}</option>)}
              </select>
            </label>
          )}
        </div>
        {props.children}
      </div>
    </aside>
  );
};
