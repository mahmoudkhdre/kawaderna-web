import './landing.css';
import { LandingNav } from './components/LandingNav';
import { Hero } from './components/Hero';
import { DesignSystemShowcase, Ecosystem, Journey, Package, Vision } from './components/Sections';
import { Creator, Faq, FinalCta, LandingFooter } from './components/Closing';
import { CREATOR } from './content';
import { AiSpace } from './components/AiSpace';
import { Architecture } from './components/Architecture';
import { useLandingTheme } from './components/useTheme';

export interface LandingPageProps {
  /**
   * Where every «جرّب الديمو» link points. Must be a real, navigable URL so the CTA
   * works without JavaScript and when opened in a new tab. Default `/` = current demo entry.
   */
  readonly demoHref?: string;
  /**
   * Optional in-app handoff. When provided, a plain left click on any demo CTA calls this
   * instead of navigating (modifier clicks still follow `demoHref`).
   */
  readonly onStartDemo?: () => void;
  /**
   * Inquiry destination for every «استفسر عن شراء الحزمة» button (the primary CTA). Defaults to the owner-supplied
   * `mailto:` (CREATOR.inquiryHref). A host may pass another owner-approved URL (for example a form).
   */
  readonly contactHref?: string;
}

export const LandingPage = ({ demoHref = '/', onStartDemo, contactHref = CREATOR.inquiryHref }: LandingPageProps) => {
  const { theme, toggle } = useLandingTheme();
  return (
  <div className="ld" dir="rtl" lang="ar-SA" id="top" data-landing-page="true" data-theme={theme}>
    <a className="ld-skip" href="#ld-main">تخطَّ إلى المحتوى</a>
    <LandingNav demoHref={demoHref} onStartDemo={onStartDemo} contactHref={contactHref} theme={theme} onToggleTheme={toggle} />
    <main id="ld-main" tabIndex={-1}>
      <Hero demoHref={demoHref} onStartDemo={onStartDemo} contactHref={contactHref} />
      <Vision />
      <Ecosystem />
      <DesignSystemShowcase />
      <AiSpace />
      <Architecture />
      <Journey demoHref={demoHref} onStartDemo={onStartDemo} />
      <Package />
      <Faq />
      <Creator />
      <FinalCta demoHref={demoHref} onStartDemo={onStartDemo} contactHref={contactHref} />
    </main>
    <LandingFooter />
  </div>
  );
};

export default LandingPage;
