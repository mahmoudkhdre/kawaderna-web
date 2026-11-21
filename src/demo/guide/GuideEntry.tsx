import { Compass, MousePointerClick, PlayCircle } from 'lucide-react';
import '../ui/guide.css';
import { GUIDE_COPY } from './copy';

/** First-visit choice on the sign-in screen. Not a modal: the sign-in form stays reachable and nothing is forced. */
export const GuideIntro = ({ onGuided, onFree }: { onGuided: () => void; onFree: () => void }) => (
  <section className="kd kd-intro" dir="rtl" aria-labelledby="kd-intro-title" data-guide-intro="true">
    <span className="kd-intro__icon" aria-hidden="true"><Compass size={24} /></span>
    <p id="kd-intro-title" className="kd-intro__title">{GUIDE_COPY.intro.title}</p>
    <p className="kd-intro__body">{GUIDE_COPY.intro.body}</p>
    <div className="kd-intro__choices">
      <button type="button" className="kd-choice kd-choice--primary" data-guide-choice="guided" onClick={onGuided}>
        <PlayCircle size={24} aria-hidden="true" />
        <span className="kd-choice__text"><strong>{GUIDE_COPY.intro.guidedTitle}</strong><span>{GUIDE_COPY.intro.guidedBody}</span></span>
      </button>
      <button type="button" className="kd-choice" data-guide-choice="free" onClick={onFree}>
        <MousePointerClick size={24} aria-hidden="true" />
        <span className="kd-choice__text"><strong>{GUIDE_COPY.intro.freeTitle}</strong><span>{GUIDE_COPY.intro.freeBody}</span></span>
      </button>
    </div>
  </section>
);

/** Shown on the sign-in screen while the tour is on: says which account comes next. Signing in stays the user's action. */
export const GuideLoginHint = ({ nextPersona, firstStep, onSkip }: { nextPersona: 'employee' | 'manager' | 'hr'; firstStep: boolean; onSkip: () => void }) => (
  <section className="kd kd-intro kd-intro--hint" dir="rtl" aria-labelledby="kd-hint-title" data-guide-login-hint={nextPersona}>
    <span className="kd-intro__icon" aria-hidden="true"><Compass size={24} /></span>
    <p id="kd-hint-title" className="kd-intro__title" tabIndex={-1}>{firstStep ? GUIDE_COPY.loginHint.title : GUIDE_COPY.loginSwitch[nextPersona]}</p>
    <p className="kd-intro__body">{firstStep ? GUIDE_COPY.loginHint.body : GUIDE_COPY.loginSwitch.body}</p>
    <button type="button" className="kd-guide__tool" data-guide-skip="true" onClick={onSkip}>{GUIDE_COPY.controls.skip}</button>
  </section>
);

/** Slim reminder shown when the guide is off (free exploration or skipped). One button; nothing else changes. */
export const GuideResumeBar = ({ paused, onStart }: { paused: boolean; onStart: () => void }) => (
  <div className="kd kd-resume" dir="rtl" data-guide-resume="true">
    <Compass size={16} aria-hidden="true" />
    <span>{paused ? GUIDE_COPY.controls.resumeBar : GUIDE_COPY.controls.startBar}</span>
    <button type="button" className="kd-guide__tool" data-guide-start="true" onClick={onStart}>
      {paused ? GUIDE_COPY.controls.resume : GUIDE_COPY.intro.guidedTitle}
    </button>
  </div>
);
