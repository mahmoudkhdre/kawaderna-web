import { useState } from 'react';
import { ArrowUpLeft, Check, CircleCheck, CircleSlash, TriangleAlert, X } from 'lucide-react';
import {
  AUDIENCES, CASE_STUDY, CREATOR, CTA, DESIGN_SYSTEM, ECOSYSTEM, GROUP_SHOTS, JOURNEY, JOURNEY_AVAILABILITY_LABEL, MODULE_GROUPS, PACKAGE,
  PROCESS, REGION, SHOTS, SPACING_SCALE, STATUS_LABEL, SWATCHES, TYPE_SCALE, VISION,
} from '../content';
import type { ModuleStatus } from '../content';
import { unitCount } from '../format';
import { DemoLink, ModuleIcon, Reveal, SectionHeading } from './primitives';
import { useTabKeys } from './Tabs';
import inboxM from '../assets/manager-inbox-m.jpg';
import inboxD from '../assets/manager-inbox-d.jpg';
import detailM from '../assets/manager-detail-m.jpg';
import rejectM from '../assets/manager-reject-m.jpg';
import hrM from '../assets/hr-m.jpg';
import attendanceImg from '../assets/figma-attendance.jpg';
import salaryImg from '../assets/figma-salary.jpg';
import performanceImg from '../assets/figma-performance.jpg';
import settingsImg from '../assets/figma-settings.jpg';

const SHOT_SRC: Record<string, string> = { inbox: inboxM, detail: detailM, reject: rejectM, hr: hrM };
/** Cropped Figma pages, all 1280 px wide (heights from the crop). */
const GROUP_IMG = {
  attendance: { src: attendanceImg, h: 200 },
  salary: { src: salaryImg, h: 260 },
  performance: { src: performanceImg, h: 330 },
  settings: { src: settingsImg, h: 165, w: 820 },
} as const;
const toArabic = (n: number) => n.toLocaleString('ar-SA');

const StatusPill = ({ status }: { status: ModuleStatus }) => (
  <span className={`ld-pill ld-pill--${status}`} data-status={status}>
    <span className="ld-pill__dot" aria-hidden="true" />{STATUS_LABEL[status]}
  </span>
);

/* ---------------------------------------------------------------- Vision (+ regional strip) */
export const Vision = () => (
  <section id="process" className="ld-section ld-vision" aria-labelledby="ld-vision-title">
    <div className="ld-container">
      <SectionHeading id="ld-vision-title" kicker={VISION.kicker} title={VISION.title} body={VISION.body} />
      <ol className="ld-principles">
        {VISION.principles.map((p, i) => (
          <Reveal as="li" key={p.title} className="ld-principle" delay={i * 80}>
            <h3 className="ld-h5">{p.title}</h3>
            <p>{p.body}</p>
          </Reveal>
        ))}
      </ol>
      <Reveal className="ld-region">
        <p className="ld-region__label">{PROCESS.label}</p>
        <ol className="ld-region__list ld-process" data-process="true">
          {PROCESS.steps.map((p, i) => (
            <li key={p.title}>
              <span className="ld-process__num" aria-hidden="true">{toArabic(i + 1)}</span>
              <strong>{p.title}</strong><span>{p.body}</span>
            </li>
          ))}
        </ol>
        <a className="ld-textlink" href={CASE_STUDY.href} target="_blank" rel="noopener noreferrer" data-case-study="process">
          {PROCESS.caseStudy}<ArrowUpLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="ld-sr">{CREATOR.newTab}</span>
        </a>
      </Reveal>
    </div>
  </section>
);

/* ---------------------------------------------------------------- Ecosystem */
export const Ecosystem = () => {
  const [active, setActive] = useState(0);
  const { onKeyDown, register } = useTabKeys(MODULE_GROUPS.length, active, setActive);

  return (
    <section id="ecosystem" className="ld-section ld-eco" aria-labelledby="ld-eco-title">
      <div className="ld-container">
        <SectionHeading id="ld-eco-title" kicker={ECOSYSTEM.kicker} title={ECOSYSTEM.title} body={ECOSYSTEM.body} />
        <div className="ld-eco__explorer">
          <div className="ld-eco__tabs" role="tablist" aria-label="مجموعات الوحدات" aria-orientation="vertical">
            {MODULE_GROUPS.map((g, i) => (
              <button key={g.id} ref={register(i)} type="button" role="tab" id={`ld-tab-${g.id}`}
                aria-selected={active === i} aria-controls={`ld-panel-${g.id}`} tabIndex={active === i ? 0 : -1}
                className="ld-eco__tab" onClick={() => setActive(i)} onKeyDown={onKeyDown} data-group-tab={g.id}>
                <span className="ld-eco__tab-num" aria-hidden="true">{toArabic(g.modules.length)}</span>
                <span className="ld-eco__tab-text">
                  <span className="ld-eco__tab-title">{g.title}</span>
                  <span className="ld-eco__tab-count">{unitCount(g.modules.length)}</span>
                </span>
              </button>
            ))}
          </div>

          {MODULE_GROUPS.map((g, i) => (
            <div key={g.id} role="tabpanel" id={`ld-panel-${g.id}`} aria-labelledby={`ld-tab-${g.id}`}
              hidden={active !== i} tabIndex={0} className="ld-eco__panel" data-group-panel={g.id}>
              <p className="ld-eco__summary">{g.summary}</p>
              <figure className="ld-eco__shot" data-group-shot={g.shot}>
                <div className="ld-eco__frame">
                  <img src={GROUP_IMG[g.shot].src} width={'w' in GROUP_IMG[g.shot] ? (GROUP_IMG[g.shot] as { w: number }).w : 1280} height={GROUP_IMG[g.shot].h} alt={GROUP_SHOTS[g.shot].alt}
                    loading="lazy" decoding="async" />
                </div>
                <figcaption className="ld-stage__caption">{GROUP_SHOTS[g.shot].caption}</figcaption>
              </figure>
              <ul className="ld-modules">
                {g.modules.map(m => (
                  <li key={m.id} className={`ld-module ld-module--${m.status}`} data-module={m.id}>
                    <span className="ld-module__icon"><ModuleIcon name={m.icon} /></span>
                    <div className="ld-module__body">
                      <div className="ld-module__head">
                        <h3 className="ld-h6">{m.name}</h3>
                        <StatusPill status={m.status} />
                      </div>
                      <p className="ld-module__value">{m.value}</p>
                      {m.evidence && <p className="ld-module__evidence">{m.evidence}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- Journey */
export const Journey = ({ demoHref, onStartDemo }: { demoHref: string; onStartDemo?: () => void }) => {
  const [active, setActive] = useState(0);
  const { onKeyDown, register } = useTabKeys(SHOTS.length, active, setActive);
  const shot = SHOTS[active];

  return (
    <section id="journey" className="ld-section ld-journey" aria-labelledby="ld-journey-title">
      <div className="ld-container">
        <SectionHeading id="ld-journey-title" kicker={JOURNEY.kicker} title={JOURNEY.title} body={JOURNEY.body} />

        <ol className="ld-flow" aria-label="مراحل رحلة طلب الإجازة">
          {JOURNEY.steps.map((step, i) => (
            <Reveal as="li" key={step.id} delay={i * 90}
              className={`ld-flow__step ${step.condition ? 'ld-flow__step--conditional' : ''}`}>
              <div className="ld-flow__top">
                <span className="ld-flow__role">{step.role}</span>
                <span className={`ld-avail ld-avail--${step.demo}`} data-journey-availability={step.demo}>
                  {JOURNEY_AVAILABILITY_LABEL[step.demo]}
                </span>
              </div>
              <h3 className="ld-h5">{step.title}</h3>
              <p className="ld-flow__body">{step.body}</p>
              {step.condition && <p className="ld-flow__condition">{step.condition}</p>}
            </Reveal>
          ))}
        </ol>
        <p className="ld-journey__note">{JOURNEY.note}</p>

        <div className="ld-viewer">
          <div className="ld-viewer__tabs" role="tablist" aria-label="لقطات من الديمو">
            {SHOTS.map((s, i) => (
              <button key={s.id} ref={register(i)} type="button" role="tab" id={`ld-shot-tab-${s.id}`}
                aria-selected={active === i} aria-controls="ld-shot-panel" tabIndex={active === i ? 0 : -1}
                className="ld-viewer__tab" onClick={() => setActive(i)} onKeyDown={onKeyDown} data-shot-tab={s.id}>
                <span className="ld-viewer__tab-num" aria-hidden="true">{toArabic(i + 1)}</span>
                <span className="ld-viewer__tab-text">
                  <span className="ld-viewer__tab-title">{s.tab}</span>
                  <span className="ld-viewer__tab-who">{s.who}</span>
                </span>
              </button>
            ))}
          </div>
          <div id="ld-shot-panel" role="tabpanel" aria-labelledby={`ld-shot-tab-${shot.id}`} className="ld-viewer__panel"
            data-shot-panel={shot.id}>
            <div className="ld-viewer__text">
              <h3 className="ld-h4">{shot.title}</h3>
              <p>{shot.body}</p>
              <DemoLink href={demoHref} onStartDemo={onStartDemo} label={CTA.primary} placement="journey" />
              <p className="ld-viewer__caption">لقطة حقيقية من الديمو العامل · بيانات افتراضية</p>
            </div>
            <div className={`ld-viewer__stage${shot.desktopAlt ? ' ld-viewer__stage--desk' : ''}`}>
              {shot.desktopAlt && (
                <div className="ld-browser ld-viewer__desk">
                  <div className="ld-browser__bar" aria-hidden="true"><span className="ld-browser__dots"><i /><i /><i /></span>
                    <span className="ld-browser__title">ديمو كوادرنا · المدير</span></div>
                  <img src={inboxD} width={1400} height={836} alt={shot.desktopAlt} loading="lazy" decoding="async" />
                </div>
              )}
              <div className="ld-phone">
                <img key={shot.id} src={SHOT_SRC[shot.id]} width={780} height={1688} alt={shot.alt} loading="lazy" decoding="async" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- Design system (bento) */
export const DesignSystemShowcase = () => (
  <section id="design-system" className="ld-section ld-ds" aria-labelledby="ld-ds-title">
    <div className="ld-container">
      <SectionHeading id="ld-ds-title" kicker={DESIGN_SYSTEM.kicker} title={DESIGN_SYSTEM.title} body={DESIGN_SYSTEM.body} align="center" />
      <div className="ld-ds__board">
        <Reveal className="ld-tile ld-tile--colors">
          <h3 className="ld-tile__title">{DESIGN_SYSTEM.colorsTitle}</h3>
          <ul className="ld-swatches">
            {SWATCHES.map(s => (
              <li key={s.token} className="ld-swatch">
                <span className="ld-swatch__chip" style={{ background: s.hex }} aria-hidden="true" />
                <span className="ld-swatch__role">{s.role}</span>
                <span className="ld-swatch__meta" dir="ltr">{s.hex}<br />{s.name}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="ld-tile ld-tile--type" delay={60}>
          <h3 className="ld-tile__title">{DESIGN_SYSTEM.typeTitle}</h3>
          <ul className="ld-typescale">
            {TYPE_SCALE.map(t => (
              <li key={t.label}>
                <span className="ld-typescale__meta" dir="ltr">{t.label}</span>
                <span className={`ld-type ${t.className}`}>{t.sample}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="ld-tile ld-tile--components" delay={60}>
          <h3 className="ld-tile__title">{DESIGN_SYSTEM.componentsTitle}</h3>
          <div className="ld-specimen" aria-hidden="true">
            <div className="ld-specimen__row">
              <span className="ld-sbtn ld-sbtn--primary"><Check size={18} strokeWidth={1.5} /> موافقة</span>
              <span className="ld-sbtn ld-sbtn--danger"><X size={18} strokeWidth={1.5} /> رفض</span>
              <span className="ld-sbtn ld-sbtn--outline">إلغاء</span>
            </div>
            <div className="ld-specimen__row">
              <span className="ld-srisk"><CircleCheck size={18} strokeWidth={1.5} /> لا توجد مشكلة</span>
              <span className="ld-srisk"><TriangleAlert size={18} strokeWidth={1.5} /> يحتاج مراجعة • معلومات ناقصة</span>
            </div>
            <div className="ld-sfield">
              <span className="ld-sfield__label">معرّف المستخدم</span>
              <span className="ld-sfield__input">مثال: manager-demo</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="ld-tile ld-tile--rtl" delay={120}>
          <h3 className="ld-tile__title">{DESIGN_SYSTEM.rtlTitle}</h3>
          <p className="ld-rtl-sample">طلب سارة خالد رقم <bdi className="ld-ltr-id" dir="ltr">LV-2026-102</bdi> بانتظار قرار الموارد البشرية.</p>
          <p className="ld-tile__note">{DESIGN_SYSTEM.rtlBody}</p>
          <ul className="ld-spacing" aria-label="مقياس المسافات بالبكسل">
            {SPACING_SCALE.slice(0, 6).map(px => (
              <li key={px}><span className="ld-spacing__bar" style={{ inlineSize: px * 2 }} aria-hidden="true" />
                <span dir="ltr" className="ld-spacing__val">{px}px</span></li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="ld-tile ld-tile--handoff" delay={60}>
          <div className="ld-handoff__foundation">
            <h3 className="ld-tile__title">{DESIGN_SYSTEM.foundationTitle}</h3>
            <p>{DESIGN_SYSTEM.foundation}</p>
          </div>
          <div className="ld-handoff__list" data-handoff="true">
            <h3 className="ld-tile__title">{DESIGN_SYSTEM.handoffTitle}</h3>
            <ul>{DESIGN_SYSTEM.handoff.map(h => <li key={h}><Check size={16} strokeWidth={1.5} aria-hidden="true" />{h}</li>)}</ul>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ---------------------------------------------------------------- Package (audiences + deliverable classes) */
export const Package = () => (
  <section id="package" className="ld-section ld-package" aria-labelledby="ld-package-title">
    <div className="ld-container">
      <SectionHeading id="ld-package-title" kicker={PACKAGE.kicker} title={PACKAGE.title} align="center" />
      <div className="ld-audience">
        <p className="ld-audience__label">{PACKAGE.audienceLabel}</p>
        <ul>{AUDIENCES.map(a => <li key={a.title}><strong>{a.title}</strong><span>{a.body}</span></li>)}</ul>
      </div>
      <div className="ld-package__grid">
        {PACKAGE.groups.map((g, i) => (
          <Reveal key={g.id} className={`ld-package__col ld-package__col--${g.id}`} delay={i * 60}>
            <h3 className="ld-package__title" data-deliverable={g.id}>
              <CircleCheck size={18} strokeWidth={1.5} aria-hidden="true" />{g.label}
            </h3>
            <ul>{g.items.map(item => <li key={item}>{item}</li>)}</ul>
          </Reveal>
        ))}
        <Reveal className="ld-package__col ld-package__col--excluded" delay={PACKAGE.groups.length * 60}>
          <h3 className="ld-package__title" data-deliverable="excluded">
            <CircleSlash size={18} strokeWidth={1.5} aria-hidden="true" />{PACKAGE.excludedLabel}
          </h3>
          <ul>{PACKAGE.excluded.map(item => <li key={item}>{item}</li>)}</ul>
        </Reveal>
      </div>
      <p className="ld-package__licensing" data-licensing="true">
        {PACKAGE.licensing} <a className="ld-textlink" href="#creator">{PACKAGE.licensingLink}</a>
      </p>
      <p className="ld-disclaimer" data-compliance-disclaimer="true">{REGION.disclaimer}</p>
    </div>
  </section>
);
