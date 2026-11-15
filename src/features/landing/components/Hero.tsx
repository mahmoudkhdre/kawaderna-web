import { ArrowDown, Check } from 'lucide-react';
import { CTA, HERO } from '../content';
import { DemoLink } from './primitives';
import dashboardImg from '../assets/figma-dashboard.jpg';
import employeeImg from '../assets/figma-employee-m.jpg';

/**
 * Product composition: two real frames from the Figma file — the desktop dashboard (254:1164, top crop)
 * behind the Employee «إجازتي» mobile screen (1374:26083, crop above the floating button).
 * Both are design frames with sample data, said so in the caption.
 */
const ProductStage = () => (
  <figure className="ld-hero__stage" data-hero-stage="true">
    <div className="ld-browser">
      <div className="ld-browser__bar" aria-hidden="true">
        <span className="ld-browser__dots"><i /><i /><i /></span>
        <span className="ld-browser__title">لوحة التحكم</span>
      </div>
      <img src={dashboardImg} width={1280} height={560} alt={HERO.desktopAlt} fetchPriority="high" decoding="async" />
    </div>
    <div className="ld-hero__phone">
      <img src={employeeImg} width={390} height={560} alt={HERO.mobileAlt} decoding="async" />
    </div>
    <figcaption className="ld-stage__caption">{HERO.proofCaption}</figcaption>
  </figure>
);

export const Hero = ({ demoHref, onStartDemo }: { demoHref: string; onStartDemo?: () => void }) => (
  <section className="ld-hero" aria-labelledby="ld-hero-title">
    <div className="ld-container ld-hero__inner">
      <div className="ld-hero__copy">
        <h1 id="ld-hero-title" className="ld-h1">
          <span className="ld-h1__lead">{HERO.titleLead}</span>{' '}
          <span className="ld-h1__accent">{HERO.titleAccent}</span>
        </h1>
        <p className="ld-hero__lede">{HERO.lede}</p>
        <div className="ld-hero__actions">
          <DemoLink href={demoHref} onStartDemo={onStartDemo} label={CTA.primary} size="lg" placement="hero" />
          <a className="ld-btn ld-btn--ghost ld-btn--lg" href="#package">
            <span>{CTA.secondary}</span>
            <ArrowDown size={18} aria-hidden="true" strokeWidth={1.5} />
          </a>
        </div>
      </div>
      <ProductStage />
      <div className="ld-deliver" data-hero-deliverables="true">
        <p className="ld-deliver__label">{HERO.deliverablesLabel}</p>
        <ul className="ld-deliver__stats">
          {HERO.stats.map(d => (
            <li key={d.label}><strong>{d.value}</strong><span>{d.label}</span></li>
          ))}
        </ul>
        <ul className="ld-deliver__list">
          {HERO.deliverables.map(d => <li key={d}><Check size={16} strokeWidth={1.5} aria-hidden="true" />{d}</li>)}
        </ul>
      </div>
    </div>
  </section>
);
