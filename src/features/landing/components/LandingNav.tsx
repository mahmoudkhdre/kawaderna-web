import { useEffect, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { BRAND, CTA, NAV_LINKS } from '../content';
import { BrandMark, DemoLink } from './primitives';
import type { LandingTheme } from './useTheme';

export const LandingNav = ({ demoHref, onStartDemo, theme, onToggleTheme }: {
  demoHref: string; onStartDemo?: () => void; theme: LandingTheme; onToggleTheme: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 1180) setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [open]);

  return (
    <header className={`ld-nav ${scrolled || open ? 'is-solid' : ''}`} data-landing-nav="true">
      <div className="ld-container ld-nav__bar">
        <a className="ld-nav__brand" href="#top" aria-label={`${BRAND.name} — العودة إلى أعلى الصفحة`}>
          <BrandMark size={36} />
          <span className="ld-nav__name">{BRAND.name}</span>
        </a>
        <nav className="ld-nav__links" aria-label="أقسام الصفحة">
          <ul>
            {NAV_LINKS.map(link => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}
          </ul>
        </nav>
        <button type="button" className="ld-theme" onClick={onToggleTheme} data-theme-toggle={theme}
          aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}>
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.5} aria-hidden="true" /> : <Moon size={18} strokeWidth={1.5} aria-hidden="true" />}
        </button>
        <div className="ld-nav__cta">
          <DemoLink href={demoHref} onStartDemo={onStartDemo} label={CTA.primary} placement="nav" />
        </div>
        <button ref={toggleRef} type="button" className="ld-nav__toggle" aria-expanded={open}
          aria-controls="ld-mobile-menu" onClick={() => setOpen(v => !v)}>
          {open ? <X size={18} strokeWidth={1.5} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.5} aria-hidden="true" />}
          <span className="ld-sr">{open ? 'إغلاق القائمة' : 'فتح القائمة'}</span>
        </button>
      </div>
      <div id="ld-mobile-menu" className="ld-nav__panel" hidden={!open} data-mobile-menu="true">
        <nav aria-label="أقسام الصفحة — الجوال" className="ld-container">
          <ul>
            {NAV_LINKS.map(link => (
              <li key={link.href}><a href={link.href} onClick={() => setOpen(false)}>{link.label}</a></li>
            ))}
          </ul>
          <DemoLink href={demoHref} onStartDemo={onStartDemo} label={CTA.primary} placement="mobile-menu" size="lg" />
        </nav>
      </div>
    </header>
  );
};
