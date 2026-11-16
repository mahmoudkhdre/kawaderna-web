import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './index';
import { AI_SHOTS, AI_SPACE, AI_USE_CASES, ARCHITECTURE, ECOSYSTEM, CASE_STUDY, CREATOR, CTA, FAQ, FOOTER, HERO, INQUIRY_MESSAGE, JOURNEY, MODULE_GROUPS, NAV_LINKS, PACKAGE, SWATCHES, TOOLKIT, VALUE } from './content';
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

  it('every demo CTA is the secondary action «جرّب الديمو» and uses the default demo entry `/`', () => {
    const ctas = [...html.matchAll(/<a [^>]*data-demo-cta="([^"]+)"[^>]*>/g)];
    expect(ctas.map(m => m[1]).sort()).toEqual(['final', 'hero', 'journey', 'mobile-menu', 'nav']);
    for (const [tag] of ctas) { expect(tag).toContain('href="/"'); expect(tag).not.toContain('ld-btn--primary'); }
    expect(CTA.secondary).toBe('جرّب الديمو');
    expect(text.split(CTA.secondary).length - 1).toBe(5);
  });

  it('every inquiry CTA is the primary action «استفسر عن شراء الحزمة» and opens the owner WhatsApp with the prefilled message, with no checkout', () => {
    const ctas = [...html.matchAll(/<a [^>]*data-contact-cta="([^"]+)"[^>]*>/g)];
    expect(ctas.map(m => m[1]).sort()).toEqual(['final', 'hero', 'mobile-menu', 'nav']);
    for (const [tag] of ctas) {
      expect(tag).toContain(`href="${CREATOR.inquiryHref.replace(/&/g, '&amp;')}"`);
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    // each of the four CTAs tells screen-reader users that it opens WhatsApp in a new tab
    expect(html.split(CTA.opensWhatsApp)).toHaveLength(5);
    expect(CTA.primary).toBe('استفسر عن شراء الحزمة');
    expect(text.split(CTA.primary).length - 1).toBe(4);
    const hero = html.slice(html.indexOf('class="ld-hero__actions"'), html.indexOf('</div>', html.indexOf('class="ld-hero__actions"')));
    expect(hero.indexOf('data-contact-cta="hero"')).toBeLessThan(hero.indexOf('data-demo-cta="hero"'));
    expect(hero).toMatch(/data-contact-cta="hero"[^>]*>|ld-btn--primary/);
    expect(html).not.toMatch(/checkout|اشترِ الآن|Buy Now|سعر الحزمة|\$\s?\d/i);
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

  it('the ecosystem lists every module name in four groups, states no total or per-group count, and has no duplicated demo thumbnail', () => {
    const eco = html.slice(html.indexOf('id="ecosystem"'), html.indexOf('id="ai"'));
    expect(eco.match(/data-module="/g)).toHaveLength(MODULE_GROUPS.flatMap(g => g.modules).length);
    expect(eco.match(/data-group-tab="/g)).toHaveLength(4);
    expect(eco).not.toContain('ld-eco__tab-count');
    expect(eco.match(/ld-module__thumb/g)).toBeNull();
    expect(ECOSYSTEM.title).toBe('مجموعة متكاملة من مجالات إدارة الموارد البشرية المصمَّمة');
  });

  it('Dashboard, AI assistant and the admin design tracks are not counted as core domains, but stay discoverable', () => {
    const ids = MODULE_GROUPS.flatMap(g => g.modules).map(m => m.id);
    expect(ids).not.toContain('dashboard');
    expect(ids).not.toContain('assistant');
    const eco = html.slice(html.indexOf('id="ecosystem"'), html.indexOf('id="ai"'));
    expect(eco.match(/data-layer="/g)).toHaveLength(3);
    expect(eco).toContain('لوحة التحكم');
    expect(html).toContain('id="ai"');
    expect(AI_SHOTS.map(s => s.id)).toContain('assistant');
  });

  it('no visible text states a total module count (14, 26 or 12): the final inventory is not accepted yet', () => {
    const flat = text.replace(/\s+/g, ' ');
    expect(flat).not.toMatch(/١٤|\b14\b|أربع عشرة|الأربع عشرة|٢٦|\b26\b|ست وعشرين|١٢|\b12\b|اثنا عشر|اثني عشر|الاثنا عشر|الاثني عشر/);
    expect(flat).not.toMatch(/(\d|[٠-٩])+\s*(وحدة|وحدات|مجال|مجالًا|مجالات)\s*(أساسية|أساسيًا|مصمَّمة)/);
  });

  it('keeps copy short: no module description or FAQ answer runs past 160 characters', () => {
    for (const m of MODULE_GROUPS.flatMap(g => g.modules)) expect(m.value.length).toBeLessThanOrEqual(160);
    for (const f of FAQ.items) expect(f.a.length).toBeLessThanOrEqual(160);
  });
});

describe('Landing page — commercial integrity', () => {
  it('only Leave is marked as working in the demo; the AI is a designed space, not a working feature', () => {
    const all = MODULE_GROUPS.flatMap(g => g.modules);
    expect(all.filter(m => m.status === 'demo').map(m => m.id)).toEqual(['leave']);
    expect(new Set(all.map(m => m.id)).size).toBe(all.length);
    expect(AI_SPACE.status).toContain('غير متصل بنموذج ذكاء اصطناعي');
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

  it('the prefilled WhatsApp inquiry targets the page\'s own number and carries a neutral, claim-free message', () => {
    const url = new URL(CREATOR.inquiryHref);
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/201094097432');
    expect(CREATOR.channels.find(c => c.id === 'whatsapp')?.href).toBe('https://wa.me/201094097432');
    expect(CREATOR.channels.find(c => c.id === 'phone')?.href).toBe('tel:+201094097432');
    const message = url.searchParams.get('text') ?? '';
    expect(message).toBe(INQUIRY_MESSAGE);
    expect(message).toMatch(/شراء أو ترخيص حزمة كوادرنا/);
    // it only prefills the compose box: no personal data, price, readiness claim or protected-material wording
    expect(message).not.toMatch(/\d|@|ريال|سعر|جاهز للتشغيل|منصة جاهزة|Toolkit|Blueprint|برومبت|Prompt/i);
    expect(message.length).toBeLessThan(250);
  });

  it('a visible text link under the hero and final actions leads to the email and phone, as a quiet fallback', () => {
    const alts = [...html.matchAll(/<a [^>]*data-contact-alt="([^"]+)"[^>]*>([^<]*)<\/a>/g)];
    expect(alts.map(m => m[1]).sort()).toEqual(['final', 'hero']);
    for (const [tag, , label] of alts) { expect(tag).toContain('href="#creator"'); expect(label).toBe(CTA.altChannels); }
    // it is a text link, not a third button, and does not count as a purchase-inquiry CTA
    for (const [tag] of alts) expect(tag).not.toMatch(/data-contact-cta|ld-btn/);
    // it sits after the action row, outside it, so the primary/secondary pair is unchanged
    const hero = html.slice(html.indexOf('class="ld-hero__actions"'));
    expect(hero.indexOf('</div>')).toBeLessThan(hero.indexOf('data-contact-alt="hero"'));
  });

  it('a host-supplied mailto stays a same-tab link without the new-tab note or target', () => {
    const mail = renderToStaticMarkup(<LandingPage contactHref="mailto:team@example.test?subject=x" />);
    for (const [tag] of mail.matchAll(/<a [^>]*data-contact-cta="[^"]+"[^>]*>/g)) expect(tag).not.toMatch(/target=|rel=/);
    expect(mail).not.toContain(CTA.opensWhatsApp);
  });

  it('activates the purchase inquiry with the owner WhatsApp by default, and lets the host override it', () => {
    const buttons = html.match(/<a [^>]*data-contact-cta="final"[^>]*>/g);
    expect(buttons).toHaveLength(1);
    expect(buttons?.[0]).toContain(`href="${CREATOR.inquiryHref.replace(/&/g, '&amp;')}"`);
    expect(CREATOR.inquiryHref.startsWith('https://wa.me/201094097432?text=')).toBe(true);
    const withContact = renderToStaticMarkup(<LandingPage contactHref="https://example.test/inquiry" />);
    expect(withContact.match(/<a [^>]*data-contact-cta="[^"]+"[^>]*>/g)).toHaveLength(4);
    for (const [tag] of withContact.matchAll(/<a [^>]*data-contact-cta="[^"]+"[^>]*>/g)) expect(tag).toContain('href="https://example.test/inquiry"');
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
    // the inquiry is the primary CTA in the final section and the demo is the secondary one
    const final = html.slice(html.indexOf('id="ld-final-title"'));
    expect(final.indexOf('data-contact-cta="final"')).toBeLessThan(final.indexOf('data-demo-cta="final"'));
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
    expect(Object.keys(TOOLKIT).sort()).toEqual(['benefits', 'benefitsLabel', 'body', 'editions', 'editionsLabel', 'inquiry', 'specsCount', 'specsNote', 'title']);
    for (const protectedText of [
      'HR_REPORT_OVERVIEW_INSIGHT', 'Case ID', 'Trigger', 'Context Source', 'Conditions', 'Fallback', 'Language', 'Tone',
      'data-toolkit-spec', 'ld-spec', 'زر «تحليل التقرير»',
    ]) expect(text, protectedText).not.toContain(protectedText);
  });

  it('AI Space lists exactly the five designed use cases, grouped 3 dynamic + 2 educational, marked as not running', () => {
    const ai = section('ai');
    expect(AI_USE_CASES.groups.map(g => [g.kind, g.items.length])).toEqual([['dynamic', 3], ['educational', 2]]);
    const labels = AI_USE_CASES.groups.flatMap(g => g.items.map(i => i.title));
    expect(labels).toEqual(['نظرة عامة على الوضع المالي', 'نظرة عامة على الأداء', 'نظرة عامة على التقرير', 'شرح معدل الادخار', 'شرح درجة الأداء']);
    expect(ai.match(/data-usecase="/g)).toHaveLength(5);
    expect(ai.match(/data-usecase-group="/g)).toHaveLength(2);
    for (const l of labels) expect(ai).toContain(l);
    expect(ai).toContain('لا تعمل في الديمو');
    expect(labels.length).toBe(TOOLKIT.specsCount);
    // existing AI tabs and images are unchanged
    expect([...ai.matchAll(/data-ai-tab="([^"]+)"/g)].map(m => m[1])).toEqual(['assistant', 'report', 'financial']);
  });

  it('asset protection: no action IDs, prompt text, placeholders or internal bindings anywhere in the public page', () => {
    for (const id of ['HR_FW_OVERVIEW_INSIGHT', 'HR_FW_SAVING_EXPLAIN', 'HR_PERFORMANCE_OVERVIEW_INSIGHT', 'HR_PERFORMANCE_SCORE_EXPLAIN', 'HR_REPORT_OVERVIEW_INSIGHT'])
      expect(html).not.toContain(id);
    expect(html).not.toMatch(/HR_[A-Z_]{4,}|\{\{|\}\}|System Instruction|\[Task\]|saving_rate|goals_progress|attendance_rate|You are an/);
    expect(html).not.toMatch(/notion\.(so|com)|uE4G0jiXhcA65d6AxJljvO|3vNsjBj9Gen1HSrtKrjd13/);
  });

  it('Toolkit separates public preview, licensed buyer edition and protected internal sources, without an unconditional delivery promise', () => {
    expect(TOOLKIT.editions.map(e => e.id)).toEqual(['public', 'buyer', 'internal']);
    expect(TOOLKIT.editions.find(e => e.id === 'buyer')?.body).toContain('بعد اعتماد محتواها وترخيصها');
    expect(TOOLKIT.editions.find(e => e.id === 'internal')?.body).toContain('لا تُسلَّم');
    expect(TOOLKIT.specsNote).not.toMatch(/تُسلَّم ضمن الحزمة/);
    const ai = section('ai');
    expect(ai).toMatch(/data-ai-inquiry="true"[^>]*>|href="#creator"[^>]*data-ai-inquiry/);
    expect(ai).not.toMatch(/data-demo-cta|data-contact-cta/); // one secondary text link to #creator, no duplicate buttons
  });

  it('Financial Wellness, Performance and Reports link to the AI Space as designed interactions; no other domain does', () => {
    const eco = html.slice(html.indexOf('id="ecosystem"'), html.indexOf('id="ai"'));
    expect([...eco.matchAll(/data-module-ai="([^"]+)"/g)].map(m => m[1])).toEqual(['financial-health', 'performance', 'reports']);
    for (const a of eco.match(/<a [^>]*data-module-ai="[^"]+"[^>]*>/g) ?? []) expect(a).toContain('href="#ai"');
    for (const m of MODULE_GROUPS.flatMap(g => g.modules).filter(m => m.ai)) expect(m.ai).toMatch(/مصمَّم/);
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
    for (const x of ['برنامج جاهز للتشغيل', 'ذكاء اصطناعي عامل', 'موصّلات API', 'نسخ العمل الداخلية']) expect(pkg).toContain(x);
    // AI deliverables are split into UI designs, the five specs and the conditional Buyer Edition
    const ai = PACKAGE.groups.find(g => g.id === 'ai')?.items ?? [];
    expect(ai).toHaveLength(3);
    expect(ai[2]).toContain('اتفاقية الترخيص');
    expect(pkg).toContain('data-package-release="true"');
    expect(pkg).not.toMatch(/اشترِ الآن|Buy Now|سعر|checkout/i);
  });

  it('FAQ answers what a buyer needs about the five AI use cases, templates and exclusions', () => {
    const qs = FAQ.items.map(i => i.q);
    expect(qs).toContain('ما حالات الاستخدام الخمس المصمَّمة؟');
    expect(qs).toContain('ما علاقة مواصفات التصميم بمنظومة القوالب؟');
    const full = FAQ.items.find(i => i.q === 'هل تُسلَّم القوالب كاملة؟');
    expect(full?.a).toContain('بعد اعتماد محتواها');
    const notReady = FAQ.items.find(i => i.q.includes('جاهز للتشغيل'));
    for (const x of ['خادم', 'مصادقة', 'API', 'ذكاء اصطناعي عامل']) expect(notReady?.a).toContain(x);
    expect(FAQ.items.find(i => i.q.includes('يعمل في الديمو'))?.a).toContain('الموظف');
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

describe('Commercial V1 — positioning, value overview, license and Data Maps track', () => {
  it('the hero states the approved product message and the audience, without production-SaaS, certification or speed claims', () => {
    const h1 = html.slice(html.indexOf('<h1'), html.indexOf('</h1>')).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(h1).toContain('كوادرنا — أساس تصميم وتطوير منصات الموارد البشرية العربية');
    expect(HERO.lede).toMatch(/شركات البرمجيات/);
    const hero = html.slice(html.indexOf('ld-hero__copy'), html.indexOf('data-value-overview'));
    expect(hero).not.toMatch(/SaaS|مطابق|معتمد|شهادة|ISO|أسرع|أسرع من|ضعف|توفير\s+\d|خلال\s+(أيام|أسابيع)/);
  });

  it('the value overview near the hero covers the seven areas with a state each, before the vision section', () => {
    expect(VALUE.items.map(i => i.id)).toEqual(['hr', 'system', 'ai', 'data', 'handoff', 'toolkit', 'demo']);
    const overview = html.slice(html.indexOf('data-value-overview'), html.indexOf('id="ld-vision-title"'));
    expect(overview.match(/data-value-item="/g)).toHaveLength(7);
    for (const i of VALUE.items) expect(overview).toContain(i.title);
    // Data Maps, handoff and the Toolkit are not presented as accepted/delivered
    for (const id of ['data', 'handoff', 'toolkit']) expect(VALUE.items.find(i => i.id === id)?.state).toBe('pending');
    expect(VALUE.items.find(i => i.id === 'ai')?.body).toContain('لا تعمل في الديمو');
    expect(overview.match(/ld-value__chip--pending/g)).toHaveLength(3);
    expect(overview).not.toMatch(/\d+\s*(شاشة|شاشات|إطار|إطارات|عقدة)/);
  });

  it('licensing: the exact conditional sentence is used and no entitlement, term or price is invented', () => {
    expect(PACKAGE.release).toBe('تتوفر أصول التطوير والقوالب المتخصصة وفق محتويات الباقة والترخيص المعتمد.');
    expect(section('package')).toContain(PACKAGE.release);
    expect(FAQ.items.find(i => i.q.includes('فريق التطوير'))?.a).toContain('وفق الباقة المعتمدة'); // conditional: «قد يستلم … وفق الباقة»
    expect(text).not.toMatch(/ضمن الحزمة\s*،?\s*ولا تُعرض|تُسلَّم ضمن|ما يستلمه|ما تحصل عليه/);
    expect(text).not.toMatch(/إعادة التوزيع|حقوق (الاستخدام|النشر)|رخصة (دائمة|غير محدودة)|مدى الحياة/);
  });

  it('no internal Figma node ids, file keys or Notion links reach the public markup', () => {
    expect(html).not.toMatch(/\b\d{3,5}:\d{3,6}\b/); // Figma node-id shape; demo request ids such as LV-2026-102 use hyphens
    expect(html).not.toMatch(/figma\.com|notion\.(so|com)|uE4G0jiXhcA65d6AxJljvO|3vNsjBj9Gen1HSrtKrjd13/);
  });

  it('the shipped content data (bundled into the public JS) carries no Figma node ids, even in unrendered fields', async () => {
    const content = await import('./content');
    const serialized = JSON.stringify(content);
    expect(serialized).not.toMatch(/\b\d{3,5}:\d{3,6}\b/);
    expect(serialized).not.toMatch(/HR_[A-Z]{2,}_[A-Z_]+|uE4G0jiXhcA65d6AxJljvO|3vNsjBj9Gen1HSrtKrjd13/);
  });

  it('Data Maps & Integrations is a design track that separates existing references from pending final UI, with no live-integration claim', () => {
    const arch = section('architecture');
    expect(arch).toContain('data-dm-track="true"');
    expect(arch).toContain('data-dm-status="existing"');
    expect(arch).toContain('data-dm-status="pending"');
    expect(ARCHITECTURE.track.pending.title).toContain('قيد الاعتماد');
    expect(arch).toContain(ARCHITECTURE.providerNote);
    expect(arch).not.toMatch(/\b35\b|٣٥|\b569\b|٥٦٩|شراكة تجارية مع|موصّلات (جاهزة|فعلية متاحة)/);
    expect(arch).toContain('data-blueprint-boundary');
    expect(PACKAGE.groups.find(g => g.id === 'blueprint')?.label).toBe('خرائط البيانات والتكامل');
    expect(PACKAGE.groups.find(g => g.id === 'blueprint')?.items.join(' ')).toContain('تُحدَّد بعد الاعتماد');
  });

  it('page metadata sits in index.html and describes the commercial design product', async () => {
    const { readFileSync } = await import('node:fs');
    const idx = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
    expect(idx).toContain('<title>كوادرنا — أساس تصميم وتطوير منصات الموارد البشرية العربية</title>');
    for (const k of ['name="description"', 'property="og:title"', 'property="og:description"', 'property="og:locale" content="ar_SA"', 'name="twitter:card"']) expect(idx).toContain(k);
    expect(idx).not.toMatch(/\b14\b|\b26\b|\b12\b|١٤|٢٦|١٢/);
    expect(idx).toContain('ليست منصة جاهزة للتشغيل');
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
