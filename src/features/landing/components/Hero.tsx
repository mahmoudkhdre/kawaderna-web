import { CTA, HERO, VALUE } from '../content';
import { AltChannelsLink, DemoLink, InquiryLink, ModuleIcon } from './primitives';
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

/** Commercial value near the hero: seven areas, each with a non-colour-only state (filled vs hollow marker + text). */
const ValueOverview = () => (
  <div className="ld-value" data-value-overview="true" role="group" aria-labelledby="ld-value-title">
    <div className="ld-value__head">
      <h2 id="ld-value-title" className="ld-value__title">{VALUE.label}</h2>
    </div>
    <ul className="ld-value__grid">
      {VALUE.items.map(it => (
        <li key={it.id} className="ld-value__item" data-value-item={it.id} data-value-state={it.state}>
          <span className="ld-value__icon"><ModuleIcon name={it.icon} size={20} /></span>
          <h3 className="ld-value__item-title">{it.title}</h3>
          <p>{it.body}</p>
          <span className={`ld-value__chip ld-value__chip--${it.state}`}>{VALUE.legend[it.state]}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const Hero = ({ demoHref, onStartDemo, contactHref }: { demoHref: string; onStartDemo?: () => void; contactHref: string }) => (
  <section className="ld-hero" aria-labelledby="ld-hero-title">
    <div className="ld-container ld-hero__inner">
      <div className="ld-hero__copy">
        <h1 id="ld-hero-title" className="ld-h1">
          <span className="ld-h1__lead">{HERO.titleLead}</span>{' '}
          <span className="ld-h1__accent">{HERO.titleAccent}</span>
        </h1>
        <p className="ld-hero__lede">{HERO.lede}</p>
        <div className="ld-hero__actions">
          <InquiryLink href={contactHref} label={CTA.primary} size="lg" placement="hero" />
          <DemoLink href={demoHref} onStartDemo={onStartDemo} label={CTA.secondary} variant="ghost" size="lg" placement="hero" />
        </div>
        <AltChannelsLink placement="hero" />
        <p className="ld-hero__note">{HERO.note}</p>
      </div>
      <ProductStage />
      <ValueOverview />
    </div>
  </section>
);
