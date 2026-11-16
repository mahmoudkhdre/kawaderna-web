import { Check, Network, Server } from 'lucide-react';
import { ARCHITECTURE } from '../content';
import { Reveal, SectionHeading } from './primitives';

const MODE_ICON = { standalone: Server, connected: Network } as const;

/**
 * Two equal concept panels from docs/enterprise-blueprint/commercial-handoff.md. Each panel shows who owns what as a
 * documented design choice. No vendor names, logos, connection lines or sync indicators appear inside the panels, so
 * neither can be mistaken for a connected customer environment. Vendor studies sit below in ordinary text.
 */
const ModePanel = ({ mode }: { mode: (typeof ARCHITECTURE.modes)[number] }) => {
  const Icon = MODE_ICON[mode.id];
  return (
    <figure className={`ld-bp ld-bp--${mode.id}`} data-bp-mode={mode.id}>
      <div className="ld-bp__head">
        <span className="ld-arch__icon"><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></span>
        <span><h3 className="ld-h5">{mode.title}</h3><span className="ld-bp__body">{mode.body}</span></span>
      </div>
      <dl className="ld-bp__owners">
        {mode.owners.map(o => (
          <div key={o.owns} className={`ld-bp__owner${o.system === 'كوادرنا' ? ' is-core' : ''}`}>
            <dt>{o.system}</dt>
            <dd>{o.owns}</dd>
          </div>
        ))}
      </dl>
      {'caption' in mode && <figcaption className="ld-bp__caption">{mode.caption}</figcaption>}
    </figure>
  );
};

export const Architecture = () => (
  <section id="architecture" className="ld-section ld-arch" aria-labelledby="ld-arch-title">
    <div className="ld-container">
      <SectionHeading id="ld-arch-title" kicker={ARCHITECTURE.kicker} title={ARCHITECTURE.title} body={ARCHITECTURE.body} />
      <div className="ld-track" data-dm-track="true">
        <div className="ld-track__main">
          <h3 className="ld-h5">{ARCHITECTURE.track.label}</h3>
          <p>{ARCHITECTURE.track.purpose}</p>
          <p className="ld-track__value">{ARCHITECTURE.track.value}</p>
        </div>
        <dl className="ld-track__status">
          <div data-dm-status="existing"><dt>{ARCHITECTURE.track.existing.title}</dt><dd>{ARCHITECTURE.track.existing.body}</dd></div>
          <div data-dm-status="pending"><dt>{ARCHITECTURE.track.pending.title}</dt><dd>{ARCHITECTURE.track.pending.body}</dd></div>
        </dl>
      </div>
      <div className="ld-arch__modes">
        {ARCHITECTURE.modes.map((m, i) => (
          <Reveal key={m.id} delay={i * 80}><ModePanel mode={m} /></Reveal>
        ))}
      </div>

      <div className="ld-arch__lower">
        <div className="ld-studies" data-bp-studies="true">
          <h3 className="ld-arch__docs-title">{ARCHITECTURE.studiesLabel}</h3>
          <p>{ARCHITECTURE.studies}</p>
          <p className="ld-arch__note">{ARCHITECTURE.providerNote}</p>
        </div>
        <div>
          <h3 className="ld-arch__docs-title">{ARCHITECTURE.docsTitle}</h3>
          <ul className="ld-arch__names" data-blueprints="true">
            {ARCHITECTURE.docs.map(d => <li key={d}><Check size={16} strokeWidth={1.5} aria-hidden="true" />{d}</li>)}
          </ul>
          <p className="ld-arch__note">{ARCHITECTURE.docsNote}</p>
        </div>
      </div>
      <p className="ld-disclaimer" data-blueprint-boundary="true">{ARCHITECTURE.boundary}</p>
    </div>
  </section>
);
