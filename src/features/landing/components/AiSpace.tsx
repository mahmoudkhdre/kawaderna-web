import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { AI_SHOTS, AI_SPACE, TOOLKIT } from '../content';
import type { AiShotId } from '../content';
import { Reveal, SectionHeading } from './primitives';
import { useTabKeys } from './Tabs';
import assistantImg from '../assets/figma-ai-assistant.jpg';
import assistantMobileImg from '../assets/figma-ai-assistant-m.jpg';
import reportImg from '../assets/figma-ai-report.jpg';
import financialImg from '../assets/figma-ai-financial.jpg';

const AI_IMG: Record<AiShotId, string> = {
  assistant: assistantImg, report: reportImg, financial: financialImg,
};

/**
 * AI Space: real Figma frames (assistant page + analysis modals), the Prompt Toolkit field set and one real
 * AI spec. Labelled throughout as designed and documented — no AI runs in the demo.
 */
export const AiSpace = () => {
  const [active, setActive] = useState(0);
  const { onKeyDown, register } = useTabKeys(AI_SHOTS.length, active, setActive);
  const shot = AI_SHOTS[active];

  return (
    <section id="ai" className="ld-section ld-ai" aria-labelledby="ld-ai-title">
      <div className="ld-container">
        <SectionHeading id="ld-ai-title" kicker={AI_SPACE.kicker} title={AI_SPACE.title} body={AI_SPACE.body} />
        <p className="ld-ai__status" data-ai-status="designed">
          <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />{AI_SPACE.status}
        </p>

        <div className="ld-ai__viewer">
          <div className="ld-ai__tabs" role="tablist" aria-label="تصاميم الذكاء الاصطناعي">
            {AI_SHOTS.map((s, i) => (
              <button key={s.id} ref={register(i)} type="button" role="tab" id={`ld-ai-tab-${s.id}`}
                aria-selected={active === i} aria-controls="ld-ai-panel" tabIndex={active === i ? 0 : -1}
                className="ld-ai__tab" onClick={() => setActive(i)} onKeyDown={onKeyDown} data-ai-tab={s.id}>
                {s.tab}
              </button>
            ))}
          </div>
          <div id="ld-ai-panel" role="tabpanel" aria-labelledby={`ld-ai-tab-${shot.id}`} className="ld-ai__panel"
            data-ai-panel={shot.id}>
            <div className="ld-ai__text">
              <h3 className="ld-h4">{shot.title}</h3>
              <p>{shot.body}</p>
              <p className="ld-ai__caption">{AI_SPACE.caption}</p>
            </div>
            <figure className={`ld-ai__shot ld-ai__shot--${shot.id}`}>
              <picture key={shot.id}>
                {/* Phones: the full 1200 px page is unreadable at 340 px — show the chat panel crop instead. */}
                {shot.id === 'assistant' && <source media="(max-width: 639px)" srcSet={assistantMobileImg} width={535} height={252} />}
                <img src={AI_IMG[shot.id]} width={shot.w} height={shot.h} alt={shot.alt} loading="lazy" decoding="async" />
              </picture>
            </figure>
          </div>
        </div>

        <div className="ld-ai__flow" aria-label={AI_SPACE.flowLabel}>
          <p className="ld-ai__flow-label">{AI_SPACE.flowLabel}</p>
          <ol>
            {AI_SPACE.flow.map((step, i) => (
              <li key={step}>
                <span>{step}</span>
                {i < AI_SPACE.flow.length - 1 && <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>

        <div className="ld-toolkit ld-toolkit--single" data-toolkit="true">
          <Reveal className="ld-toolkit__intro">
            <h3 className="ld-h5">{TOOLKIT.title}</h3>
            <p>{TOOLKIT.body}</p>
            <ul className="ld-toolkit__fields" aria-label={TOOLKIT.benefitsLabel}>
              {TOOLKIT.benefits.map(b => (
                <li key={b}><span>{b}</span></li>
              ))}
            </ul>
            <p className="ld-toolkit__note">{TOOLKIT.specsNote}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
