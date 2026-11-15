import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './index';
import { AI_SHOTS, ARCHITECTURE, CASE_STUDY, CREATOR, CTA, FAQ, FOOTER, JOURNEY, MODULE_GROUPS, NAV_LINKS, PACKAGE, SWATCHES, TOOLKIT } from './content';
import { unitCount } from './format';

const html = renderToStaticMarkup(<LandingPage />);
const text = html.replace(/<[^>]+>/g, ' ');
const section = (id: string) => {
  const start = html.indexOf(`id="${id}"`);
  return html.slice(start, html.indexOf('</section>', start));
};

describe('Landing page — structure and CTA contract', () => {
  it('renders one h1, Arabic RTL root and the landmark structure', () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar-SA"');
    expect(html).toMatch(/<header[^>]*data-landing-nav/);
    expect(html).toMatch(/<main id="ld-main"/);
    expect(html).toContain('<footer');
  });

  it('theme: renders Light by default with one accessible toggle that offers the dark mode', () => {
    expect(html).toContain('data-theme="light"');
    expect(html.match(/data-theme-toggle=/g)).toHaveLength(1);
    expect(html).toContain('aria-label="التبديل إلى الوضع الداكن"');
  });

  it('every demo CTA uses the approved label and the default demo entry `/`', () => {
    const ctas = [...html.matchAll(/<a [^>]*data-demo-cta="([^"]+)"[^>]*>/g)];
    expect(ctas.map(m => m[1]).sort()).toEqual(['final', 'hero', 'journey', 'mobile-menu', 'nav']);
    for (const [tag] of ctas) expect(tag).toContain('href="/"');
    expect(text.split(CTA.primary).length - 1).toBe(5);
  });

  it('honours a custom demoHref from the integrator', () => {
    const custom = renderToStaticMarkup(<LandingPage demoHref="/demo" onStartDemo={() => {}} />);
    const ctas = [...custom.matchAll(/<a [^>]*data-demo-cta="[^"]+"[^>]*>/g)];
    expect(ctas).toHaveLength(5);
    for (const [tag] of ctas) expect(tag).toContain('href="/demo"');
  });

  it('ids referenced by aria-controls / aria-labelledby exist exactly once', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const refs = [...html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)].map(m => m[1]);
    for (const ref of refs) expect(ids).toContain(ref);
  });

  it('every image has non-empty Arabic alt text and intrinsic size', () => {
    const imgs = [...html.matchAll(/<img [^>]*>/g)].map(m => m[0]);
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    for (const img of imgs) {
      expect(img).toMatch(/alt="[^"]*[؀-ۿ][^"]*"/);
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
    }
  });
});

describe('Landing page — whole-product presentation', () => {
  it('the hero shows real design frames (desktop + mobile), labelled as design frames with sample data', () => {
    const hero = html.slice(html.indexOf('data-hero-stage'), html.indexOf('</figure>'));
    expect(hero.match(/<img /g)).toHaveLength(2);
    expect(hero).toContain('ملف التصميم');
    expect(hero).toContain('بيانات نموذجية');
  });

  it('every product group shows a real Figma page crop', () => {
    const eco = html.slice(html.indexOf('id="ecosystem"'), html.indexOf('id="ai"'));
    expect([...eco.matchAll(/data-group-shot="([^"]+)"/g)].map(m => m[1])).toEqual(['attendance', 'salary', 'performance', 'settings']);
  });
});

describe('Landing page — sections', () => {
  it('renders the eleven sections in narrative order, each with its own heading', () => {
    const order = ['ld-hero-title', 'ld-vision-title', 'ld-eco-title', 'ld-ds-title', 'ld-ai-title', 'ld-arch-title', 'ld-journey-title', 'ld-package-title', 'ld-faq-title', 'ld-creator-title', 'ld-final-title'];
    const positions = order.map(id => html.indexOf(`id="${id}"`));
    expect(positions.every(p => p > -1)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
  });

  it('every navigation link points to a section that exists', () => {
    for (const link of NAV_LINKS) expect(html).toContain(`id="${link.href.slice(1)}"`);
  });

  it('the ecosystem lists all 14 modules in four groups, with no duplicated demo thumbnail', () => {
    const eco = html.slice(html.indexOf('id="ecosystem"'), html.indexOf('id="ai"'));
    expect(eco.match(/data-module="/g)).toHaveLength(14);
    expect(eco.match(/data-group-tab="/g)).toHaveLength(4);
    expect(eco.match(/ld-module__thumb/g)).toBeNull();
  });

  it('keeps copy short: no module description or FAQ answer runs past 160 characters', () => {
    for (const m of MODULE_GROUPS.flatMap(g => g.modules)) expect(m.value.length).toBeLessThanOrEqual(160);
    for (const f of FAQ.items) expect(f.a.length).toBeLessThanOrEqual(160);
  });
});

describe('Landing page — commercial integrity', () => {
  it('only Leave is marked as working in the demo; the AI assistant is a designed page, not a working feature', () => {
    const all = MODULE_GROUPS.flatMap(g => g.modules);
    expect(all).toHaveLength(14);
    expect(all.filter(m => m.status === 'demo').map(m => m.id)).toEqual(['leave']);
    expect(all.find(m => m.id === 'assistant')?.status).toBe('designed');
    expect(all.find(m => m.id === 'assistant')?.value).toContain('لا يعمل فيها ذكاء اصطناعي');
    expect(new Set(all.map(m => m.id)).size).toBe(all.length);
  });

  it('the Employee step is labelled available now that the Employee → Manager → HR journey is verified end to end', () => {
    // Evidence: tests/e2e/employee-journey.spec.ts and the 2026-11-12 acceptance journey.
    const employee = JOURNEY.steps.find(s => s.id === 'employee');
    expect(employee?.demo).toBe('available');
    const hr = JOURNEY.steps.find(s => s.id === 'hr');
    expect(hr?.condition).toBeTruthy(); // HR is conditional, not every request
  });

  it('makes no fabricated compliance, customer, award, metric or pricing claims', () => {
    // the approved Blueprint headline/copy (commercial-handoff.md) says «العميل» generically; it is not a customer claim
    const claimText = text.replace(ARCHITECTURE.title, '').replace(ARCHITECTURE.body, '');
    for (const banned of [/متوافق مع/, /عملاء/, /عميل/, /جائزة/, /شهادة/, /معتمد من/, /ISO/, /PDPL/, /ريال/, /\d+\s?%/, /أفضل نظام/, /الأول في/]) {
      expect(claimText).not.toMatch(banned);
    }
    expect(text).toContain('لا يدّعيان مطابقة أي نظام أو لائحة');
    // image alt text and captions must not repeat the conformity banners that exist on some Figma frames
    expect(html).not.toMatch(/متوافق|رؤية 2030|وفقاً للنظام|وفقًا للنظام/);
  });

  it('presents AI as designed and documented, never as working', () => {
    expect(text).not.toMatch(/\b(LLM|GPT|RAG|Agent|ChatGPT|OpenAI)\b/i);
    expect(text).toContain('غير متصل بنموذج ذكاء اصطناعي في الديمو');
    expect(text).not.toMatch(/ذكاء اصطناعي (يعمل|عامل) (الآن|فعليًا)/);
    const aiFaq = FAQ.items.find(i => i.q.includes('الذكاء الاصطناعي'));
    expect(aiFaq?.a.startsWith('لا.')).toBe(true);
  });

  it('uses Kawaderna Design System colour values only', () => {
    const allowed = new Set(['#1D4ED8', '#7C3AED', '#1E3A8A', '#09090B', '#EFF6FF', '#22C55E', '#71717A', '#E2E8F0']);
    for (const s of SWATCHES) expect(allowed.has(s.hex)).toBe(true);
  });

  it('FAQ answers the licensing question without inventing terms, and points to the creator section', () => {
    const licensing = FAQ.items.find(i => i.q.includes('الترخيص'));
    expect(licensing?.a).toContain('ولا تُعرض هنا');
    expect(licensing?.a).toContain('«صاحب المشروع»');
    expect(licensing?.a).not.toMatch(/@|\d{6,}/); // no contact details repeated in the FAQ
  });

  it('shows only the owner-supplied contact details, once each, inside the creator section', () => {
    const creator = section('creator');
    // exact owner-supplied destinations; the owner confirmed 01094097432 for both phone and WhatsApp
    expect(creator).toContain('href="mailto:mahmoudkhdre9@gmail.com"');
    expect(creator).toContain('href="tel:+201094097432"');
    expect(creator).toContain('href="https://wa.me/201094097432"');
    expect(creator).toContain('href="https://www.behance.net/gallery/253796199/kawaderna-Enterprise-HR-Platform"');
    expect(creator.match(/data-contact="/g)).toHaveLength(4);
    // visible addresses appear exactly once on the page, and only in this section
    const flat = html.replace(/<wbr\/?>/g, '').replace(/<[^>]+>/g, ' ');
    expect(flat.split('mahmoudkhdre9@gmail.com')).toHaveLength(2);
    expect(flat.split('+20 109 409 7432')).toHaveLength(2);
    expect(creator.replace(/<wbr\/?>/g, '')).toContain('>mahmoudkhdre9@gmail.com<');
    // external links open safely and say so to screen readers
    for (const a of creator.match(/<a [^>]*target="_blank"[^>]*>/g) ?? []) expect(a).toContain('rel="noopener noreferrer"');
    expect(creator.match(/target="_blank"/g)).toHaveLength(2);
    expect(creator.split(CREATOR.newTab)).toHaveLength(3);
    // attribution: name, ownership and the four disciplines, with no invented company, title or endorsement
    for (const s of [CREATOR.name, CREATOR.role, ...CREATOR.roles]) expect(creator).toContain(s);
    expect(creator).not.toMatch(/شركة|مؤسسة|معتمد|خبير|سنوات خبرة|عملاء/);
  });

  it('activates the purchase inquiry with the owner mailto by default, and lets the host override it', () => {
    const buttons = html.match(/<a [^>]*data-contact-cta="true"[^>]*>/g);
    expect(buttons).toHaveLength(1);
    expect(buttons?.[0]).toContain(`href="${CREATOR.inquiryHref.replace(/&/g, '&amp;')}"`);
    expect(CREATOR.inquiryHref.startsWith('mailto:mahmoudkhdre9@gmail.com?subject=')).toBe(true);
    const withContact = renderToStaticMarkup(<LandingPage contactHref="https://example.test/inquiry" />);
    expect(withContact.match(/<a [^>]*data-contact-cta="true"[^>]*>/g)).toHaveLength(1);
    expect(withContact).toContain('href="https://example.test/inquiry"');
    // licensing, footer credit and navigation all lead to the single contact section, without repeating details
    expect(section('package')).toMatch(/data-licensing="true"[\s\S]*href="#creator"/);
    expect(html.slice(html.indexOf('<footer'))).toContain(`href="#creator">${FOOTER.credit}<`);
    expect(NAV_LINKS.some(l => l.href === '#creator')).toBe(true);
    // the verified Behance case study is linked from the process section, opening safely in a new tab
    const cs = html.match(/<a [^>]*data-case-study="process"[^>]*>/)?.[0] ?? '';
    expect(cs).toContain(`href="${CASE_STUDY.href}"`);
    expect(cs).toContain('rel="noopener noreferrer"');
    expect(CREATOR.channels.find(c => c.id === 'behance')?.href).toBe(CASE_STUDY.href);
    // the demo stays the primary CTA in the final section
    const final = html.slice(html.indexOf('id="ld-final-title"'));
    expect(final.indexOf('data-demo-cta="final"')).toBeLessThan(final.indexOf('data-contact-cta'));
  });
});

describe('Stage 2C — complete project coverage', () => {

  it('AI Space shows real Figma frames for the assistant and the analysis modals, captioned as designs', () => {
    const ai = section('ai');
    expect([...ai.matchAll(/data-ai-tab="([^"]+)"/g)].map(m => m[1])).toEqual(AI_SHOTS.map(s => s.id));
    expect(ai.match(/<img /g)).toHaveLength(1); // one tab panel at a time
    expect(ai).toContain('من ملف التصميم');
    expect(ai).toContain('بيانات نموذجية');
    expect(AI_SHOTS.filter(s => s.id !== 'assistant').length).toBeGreaterThanOrEqual(2);
  });

  it('Prompt Toolkit is a marketing description only: no field structure, example spec or template content', () => {
    const ai = section('ai');
    expect(ai).toContain(TOOLKIT.title);
    expect(ai).toContain(TOOLKIT.body);
    for (const b of TOOLKIT.benefits) expect(ai).toContain(b);
    expect(TOOLKIT.specsCount).toBe(5);
    expect(Object.keys(TOOLKIT).sort()).toEqual(['benefits', 'benefitsLabel', 'body', 'specsCount', 'specsNote', 'title']);
    for (const protectedText of [
      'HR_REPORT_OVERVIEW_INSIGHT', 'Case ID', 'Trigger', 'Context Source', 'Conditions', 'Fallback', 'Language', 'Tone',
      'data-toolkit-spec', 'ld-spec', 'زر «تحليل التقرير»',
    ]) expect(text, protectedText).not.toContain(protectedText);
  });

  it('blueprints are reference documents in the package, with no temporary wording and no live-integration claim', () => {
    const arch = section('architecture');
    expect(arch).not.toMatch(/قريبًا|قريباً|قيد الإعداد|قيد التحضير|coming soon/i);
    for (const v of ['Odoo', 'جسر', 'ZenHR', 'SAP SuccessFactors']) expect(arch).toContain(v);
    expect(arch).toContain('امتداد مؤسسي لنظام SAP SuccessFactors'); // SAP qualifier stays attached
    expect(arch).toContain('data-blueprint-boundary');
    expect(ARCHITECTURE.boundary).toContain('غير منفَّذة');
    expect(text).not.toMatch(/تكامل (مباشر|فوري) مع/);
  });

  // The internal "release gate" test (blueprint documents exist in the delivered package) lives only in the
  // private development project. It reads documents that are not part of this deployment package.

  it('asset protection: the architecture section shows the concept, not ERDs, endpoints or field mappings', () => {
    const arch = section('architecture');
    expect(arch).not.toMatch(/erDiagram|POST |GET |\/odata\/|\/json\/2|employee_id|externalCode|T[1-6]\b/i);
    expect(arch).toContain('data-bp-mode="standalone"');
    expect(arch).toContain('data-bp-mode="connected"');
    // brief: no vendor names, connection lines or sync indicators inside the two panels; no authority-matrix table
    for (const id of ['standalone', 'connected']) {
      const start = arch.indexOf(`data-bp-mode="${id}"`);
      const panel = arch.slice(start, arch.indexOf('</figure>', start));
      expect(panel).not.toMatch(/Odoo|جسر|Jisr|ZenHR|SAP|مزامنة|ربط/);
    }
    expect(arch).not.toContain('<table');
    expect(arch).toContain('مثال لتوزيع المسؤوليات');
  });

  it('does not publish unverified historical counts from the case study', () => {
    expect(text).not.toMatch(/(^|\s)(26|٢٦)\s|80\+|٨٠\+|250\+|٢٥٠\+/);
  });

  it('the package separates the deliverable classes and states what is not included', () => {
    expect(PACKAGE.groups.map(g => g.id)).toEqual(['figma', 'system', 'ai', 'blueprint', 'demo']);
    const pkg = section('package');
    expect(pkg).toContain('data-deliverable="excluded"');
    for (const x of ['برنامج جاهز للتشغيل', 'ذكاء اصطناعي عامل', 'موصّلات API']) expect(pkg).toContain(x);
  });

  it('the process and buyer audiences are present', () => {
    expect(html).toContain('data-process="true"');
    expect(section('package')).toContain('لمن هذا المشروع');
  });

  it('FAQ covers the AI, integration and developer-handoff questions', () => {
    const qs = FAQ.items.map(i => i.q).join(' ');
    for (const k of ['الذكاء الاصطناعي', 'Odoo', 'فريق التطوير', 'الترخيص']) expect(qs).toContain(k);
  });
});

describe('Arabic agreement helper', () => {
  it('uses dual and plural forms correctly', () => {
    expect(unitCount(1)).toBe('وحدة واحدة');
    expect(unitCount(2)).toBe('وحدتان');
    expect(unitCount(3)).toBe('٣ وحدات');
    expect(unitCount(11)).toBe('١١ وحدة');
  });
});
