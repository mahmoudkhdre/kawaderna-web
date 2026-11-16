import { BookOpen, Check, Mail, MessageCircle, Phone, Plus } from 'lucide-react';
import { BRAND, CREATOR, CTA, FAQ, FINAL, FOOTER } from '../content';
import { BrandMark, DemoLink, InquiryLink, Reveal, SectionHeading } from './primitives';

export const Faq = () => (
  <section id="faq" className="ld-section ld-faq" aria-labelledby="ld-faq-title">
    <div className="ld-container ld-faq__inner">
      <SectionHeading id="ld-faq-title" kicker={FAQ.kicker} title={FAQ.title} />
      <div className="ld-faq__list">
        {FAQ.items.map(item => (
          <details key={item.q} className="ld-faq__item" data-faq-item="true">
            <summary>
              <span>{item.q}</span>
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="ld-faq__icon" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const CHANNEL_ICON = { email: Mail, whatsapp: MessageCircle, phone: Phone, behance: BookOpen } as const;

/** Owner attribution and the page's single list of contact channels. */
export const Creator = () => (
  <section id="creator" className="ld-section ld-creator" aria-labelledby="ld-creator-title">
    <div className="ld-container ld-creator__inner">
      <Reveal className="ld-creator__who">
        <p className="ld-kicker">{CREATOR.kicker}</p>
        <h2 id="ld-creator-title" className="ld-h2">{CREATOR.name}</h2>
        <p className="ld-creator__latin" lang="en" dir="ltr">{CREATOR.nameLatin}</p>
        <p className="ld-creator__role">{CREATOR.role}</p>
        <p className="ld-creator__body">{CREATOR.body}</p>
        <h3 className="ld-arch__docs-title">{CREATOR.rolesLabel}</h3>
        <ul className="ld-creator__roles" data-creator-roles="true">
          {CREATOR.roles.map(r => <li key={r}><Check size={16} strokeWidth={1.5} aria-hidden="true" />{r}</li>)}
        </ul>
      </Reveal>
      <Reveal className="ld-creator__contact" delay={80}>
        <h3 className="ld-h5">{CREATOR.contactTitle}</h3>
        <p className="ld-creator__body">{CREATOR.contactBody}</p>
        <ul className="ld-contacts">
          {CREATOR.channels.map(c => {
            const Icon = CHANNEL_ICON[c.id];
            const external = 'external' in c && c.external;
            return (
              <li key={c.id}>
                <a className="ld-contact" href={c.href} data-contact={c.id}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  <span className="ld-contact__icon"><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></span>
                  <span className="ld-contact__text">
                    <span className="ld-contact__label">{c.label}</span>
                    <span className="ld-contact__value" dir={c.ltr ? 'ltr' : undefined}>
                      {/* a wrap opportunity after «@» so a narrow screen never splits the address mid-word */}
                      {c.value.includes('@') ? <>{c.value.split('@')[0]}@<wbr />{c.value.split('@')[1]}</> : c.value}
                    </span>
                  </span>
                  {external && <span className="ld-sr">{CREATOR.newTab}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </div>
  </section>
);

interface FinalCtaProps { demoHref: string; onStartDemo?: () => void; contactHref: string }

export const FinalCta = ({ demoHref, onStartDemo, contactHref }: FinalCtaProps) => (
  <section className="ld-final" aria-labelledby="ld-final-title">
    <div className="ld-container ld-final__inner">
      <span className="ld-final__mark"><BrandMark size={48} /></span>
      <h2 id="ld-final-title" className="ld-final__title">{FINAL.title}</h2>
      <p className="ld-final__body">{FINAL.body}</p>
      <div className="ld-final__actions">
        <InquiryLink href={contactHref} label={CTA.primary} variant="onDark" size="lg" placement="final" />
        <DemoLink href={demoHref} onStartDemo={onStartDemo} label={CTA.secondary} variant="outlineDark" size="lg" placement="final" />
      </div>
      <p className="ld-final__note">{FINAL.note}</p>
    </div>
  </section>
);

export const LandingFooter = () => (
  <footer className="ld-footer">
    <div className="ld-container ld-footer__inner">
      <span className="ld-footer__brand"><BrandMark size={28} />{BRAND.name}</span>
      <p>{FOOTER.line} <a className="ld-footer__credit" href="#creator">{FOOTER.credit}</a></p>
      <p className="ld-footer__disclosure">{BRAND.disclosure}</p>
    </div>
  </footer>
);
