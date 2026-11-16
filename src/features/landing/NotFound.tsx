import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';
import { useLandingTheme } from './components/useTheme';

const TITLE = 'الصفحة غير موجودة — كوادرنا';

/**
 * Minimal unknown-route page. Cloudflare Pages serves the SPA shell with HTTP 200 for any path
 * (a top-level 404.html would turn that fallback off and break /demo deep links), so the status
 * cannot be a real 404. Search engines are told not to index it with a robots meta tag instead.
 * Both are removed when the visitor leaves.
 */
export const NotFound = () => {
  const { theme } = useLandingTheme();
  useEffect(() => {
    const previousTitle = document.title;
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    document.title = TITLE;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    canonical?.remove();
    return () => { document.title = previousTitle; robots.remove(); if (canonical) document.head.appendChild(canonical); };
  }, []);

  return (
    <div className="ld" dir="rtl" lang="ar-SA" data-theme={theme} data-not-found="true">
      <main className="ld-notfound" id="ld-main" tabIndex={-1}>
        <p className="ld-notfound__brand">كوادرنا</p>
        <h1 className="ld-notfound__title">الصفحة غير موجودة</h1>
        <p className="ld-notfound__text">قد يكون الرابط قديمًا أو مكتوبًا بشكل غير صحيح. يمكنك العودة إلى العرض التعريفي أو تجربة الديمو.</p>
        <div className="ld-notfound__actions">
          <Link className="ld-btn ld-btn--primary ld-btn--lg" to="/">العودة إلى العرض التعريفي</Link>
          <Link className="ld-btn ld-btn--ghost ld-btn--lg" to="/demo">جرّب الديمو</Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
