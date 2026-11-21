import { expect, test } from '@playwright/test';

// Landing-owned spec: exercises the isolated preview harness only (no App.tsx, no demo state).
const PREVIEW = '/src/features/landing/preview/index.html';

test.describe('Landing page — isolated preview', () => {
  // The preview imports the shared src/index.css, whose first line pulls Tajawal from fonts.googleapis.com. A third-party CDN
  // is not part of what this spec verifies, and an unreachable CDN (offline CI, firewall) would otherwise surface as a console
  // error (fail-fast network) or stall the `load` event (packet-dropping network). Answer those two hosts locally; the landing
  // page itself ships its own Tajawal faces, so nothing visual depends on the stub. Every other request and console error is still asserted.
  test.beforeEach(async ({ page }) => {
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route =>
      route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' }));
  });

  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440]) {
    test(`no horizontal overflow and no console errors at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(e.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PREVIEW);
      await expect(page.locator('h1')).toContainText('كوادرنا — أساس تصميم وتطوير منصات الموارد البشرية العربية');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.locator('[data-demo-cta="hero"]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('ecosystem tabs switch panels by click and by RTL arrow keys', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW);
    const people = page.locator('[data-group-tab="people"]');
    const money = page.locator('[data-group-tab="money"]');
    await expect(page.locator('[data-group-panel="people"]')).toBeVisible();
    await expect(page.locator('[data-group-panel="money"]')).toBeHidden();
    await money.click();
    await expect(money).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-group-panel="money"]')).toBeVisible();
    await expect(page.locator('[data-group-panel="money"] [data-group-shot="salary"] img')).toBeVisible();
    await expect(page.locator('[data-group-panel="money"] [data-module="loans"]')).toContainText('القروض والسلف');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-group-tab="insight"]')).toBeFocused();
    await expect(page.locator('[data-group-panel="insight"]')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(people).toBeFocused();
    await expect(people).toHaveAttribute('aria-selected', 'true');
    // Only Leave is shown as working in the demo.
    await expect(page.locator('[data-module] [data-status="demo"]')).toHaveCount(1);
  });

  test('screenshot viewer changes the shown product shot', async ({ page }) => {
    await page.goto(PREVIEW);
    const panel = page.locator('[data-shot-panel]');
    await expect(panel).toHaveAttribute('data-shot-panel', 'inbox');
    await page.locator('[data-shot-tab="hr"]').click();
    await expect(panel).toHaveAttribute('data-shot-panel', 'hr');
    await expect(panel.locator('img')).toHaveAttribute('alt', /القرار النهائي للموارد البشرية/);
    await expect(panel.locator('img')).toHaveCount(1); // only the inbox tab has a desktop capture
    await expect(panel.locator('img')).toHaveJSProperty('complete', true);
    expect(await panel.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  for (const width of [375, 1440]) {
    test(`hero shows real design frames, loaded and inside the viewport, at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' }); // measure final geometry, not a frame of the entrance animation
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PREVIEW);
      // desktop + phone frames from 640px up; under 640px only the phone frame (a 1440px dashboard would be unreadable)
      const imgs = page.locator('[data-hero-stage] img:visible');
      await expect(imgs).toHaveCount(width < 640 ? 1 : 2);
      for (const img of await imgs.all()) {
        await expect(img).toBeVisible();
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
        const box = await img.boundingBox();
        expect(box && box.x >= 0 && box.x + box.width <= width + 0.5).toBe(true);
      }
      // the stage never overlaps the hero copy/actions above it
      const actions = await page.locator('.ld-hero__actions').boundingBox();
      const stage = await page.locator('[data-hero-stage]').boundingBox();
      if (width < 1200) expect(actions && stage && stage.y >= actions.y + actions.height).toBe(true);
      const phoneBox = await page.locator('.ld-hero__phone').boundingBox();
      expect(phoneBox && stage && phoneBox.y >= stage.y - 0.5).toBe(true);
      // the caption never sits under the phone frame
      const cap = await page.locator('[data-hero-stage] figcaption').boundingBox();
      const phone = await page.locator('.ld-hero__phone').boundingBox();
      expect(cap && phone && (cap.x >= phone.x + phone.width || cap.x + cap.width <= phone.x || cap.y >= phone.y + phone.height)).toBe(true);
    });
  }

  test('mobile menu opens, closes with Escape and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PREVIEW);
    const toggle = page.locator('.ld-nav__toggle');
    const panel = page.locator('[data-mobile-menu]');
    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await panel.getByRole('link', { name: 'أسئلة شائعة' }).click();
    await expect(panel).toBeHidden();
    await expect(page.locator('#faq')).toBeInViewport();
  });

  test('FAQ items expand and collapse', async ({ page }) => {
    await page.goto(PREVIEW);
    const item = page.locator('[data-faq-item]').first();
    await item.locator('summary').click();
    await expect(item).toHaveAttribute('open', '');
    await expect(item.locator('p')).toBeVisible();
    await item.locator('summary').click();
    await expect(item).not.toHaveAttribute('open', '');
  });

  test('content is visible with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PREVIEW);
    const opacities = await page.locator('.ld-reveal').evaluateAll(els => els.map(el => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(0);
    expect(opacities.every(o => o === '1')).toBe(true);
    await page.locator('#package').scrollIntoViewIfNeeded();
    await expect(page.locator('.ld-package__col--demo')).toBeVisible();
    await expect(page.locator('[data-deliverable="excluded"]')).toBeVisible();
  });

  test('AI Space tabs switch real design frames by click and by RTL arrow keys', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW);
    const panel = page.locator('[data-ai-panel]');
    await panel.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-ai-status]')).toContainText('غير متصل بنموذج ذكاء اصطناعي');
    await expect(panel).toHaveAttribute('data-ai-panel', 'assistant');
    await page.locator('[data-ai-tab="report"]').click();
    await expect(panel).toHaveAttribute('data-ai-panel', 'report');
    await expect(page.locator('[data-ai-tab="report"]')).toHaveAttribute('aria-selected', 'true');
    const img = panel.locator('img');
    await expect(img).toHaveAttribute('alt', /تحليل تقرير الحضور/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await page.keyboard.press('ArrowLeft'); // RTL: next tab
    await expect(page.locator('[data-ai-tab="financial"]')).toBeFocused();
    await expect(panel).toHaveAttribute('data-ai-panel', 'financial');
    // Toolkit is a protected paid asset: marketing description only, no field names or example spec.
    await expect(page.locator('[data-toolkit]')).toContainText('منظومة القوالب');
    await expect(page.locator('[data-toolkit] .ld-spec')).toHaveCount(0);
    for (const protectedText of ['HR_REPORT_OVERVIEW_INSIGHT', 'Context Source', 'Fallback', 'Case ID']) {
      await expect(page.locator('body')).not.toContainText(protectedText);
    }
  });

  test('blueprints and package are reachable from the navigation and state their boundary', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PREVIEW);
    await page.locator('[data-landing-nav]').getByRole('link', { name: 'البنية والتكامل' }).click();
    await expect(page.locator('#architecture')).toBeInViewport();
    await expect(page.locator('[data-blueprint-boundary]')).toContainText('غير منفَّذة');
    await expect(page.locator('[data-blueprints] li')).toHaveCount(6); // buyer-only deliverables, named only
    await expect(page.locator('[data-bp-mode]')).toHaveCount(2);
    await expect(page.locator('[data-bp-mode="connected"] figcaption')).toHaveText('مثال لتوزيع المسؤوليات');
    await expect(page.locator('[data-bp-studies]')).toContainText('امتداد مؤسسي لنظام SAP SuccessFactors');
  });

  for (const width of [320, 1440]) {
    test(`creator section lists the owner contact links, keyboard-reachable and inside the viewport, at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PREVIEW);
      const creator = page.locator('#creator');
      await creator.scrollIntoViewIfNeeded();
      await expect(creator.getByRole('heading', { level: 2 })).toHaveText('محمود خضر');
      const expected: Record<string, string> = {
        email: 'mailto:mahmoudkhdre9@gmail.com',
        whatsapp: 'https://wa.me/201094097432',
        phone: 'tel:+201094097432',
        behance: 'https://www.behance.net/gallery/253796199/kawaderna-Enterprise-HR-Platform',
      };
      for (const [id, href] of Object.entries(expected)) {
        const link = creator.locator(`[data-contact="${id}"]`);
        await expect(link).toHaveAttribute('href', href);
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box && box.x >= 0 && box.x + box.width <= width + 0.5 && box.height >= 44).toBe(true);
      }
      await expect(creator.getByRole('link', { name: /واتساب.*يفتح في نافذة جديدة/ })).toHaveAttribute('target', '_blank');
      // keyboard: the email link takes focus with a visible outline
      const email = creator.locator('[data-contact="email"]');
      await email.focus();
      await expect(email).toBeFocused();
      expect(await email.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
      // the nav / mobile-menu «تواصل» link reaches this section
      if (width < 1180) { await page.locator('.ld-nav__toggle').click(); await page.locator('[data-mobile-menu]').getByRole('link', { name: 'تواصل' }).click(); }
      else await page.locator('[data-landing-nav]').getByRole('link', { name: 'تواصل' }).click();
      await expect(creator.getByRole('heading', { level: 2 })).toBeInViewport();
      // the process section links the verified Behance case study
      await expect(page.locator('[data-case-study="process"]')).toHaveAttribute('href', expected.behance);
      // every purchase-inquiry CTA (nav, mobile menu, hero, final) is active: it opens the owner WhatsApp in a new tab
      // with the prefilled message (the visitor still presses send)
      const inquiry = page.locator('[data-contact-cta]');
      await expect(inquiry).toHaveCount(4);
      for (const cta of await inquiry.all()) {
        await expect(cta).toHaveAttribute('href', /^https:\/\/wa\.me\/201094097432\?text=/);
        await expect(cta).toHaveAttribute('target', '_blank');
        await expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
      }
      // the visible fallback under the hero and final actions leads to the contact section
      await expect(page.locator('[data-contact-alt]')).toHaveCount(2);
      for (const alt of await page.locator('[data-contact-alt]').all()) await expect(alt).toHaveAttribute('href', '#creator');
    });
  }

  for (const width of [390, 1440]) {
    test(`every image on the page loads at ${width}px (no missing assets)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PREVIEW);
      await page.evaluate(() => document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }));
      const imgs = page.locator('img');
      const n = await imgs.count();
      expect(n).toBeGreaterThan(4);
      for (let i = 0; i < n; i++) {
        await expect.poll(() => imgs.nth(i).evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      }
    });
  }

  test('keyboard: skip link is first and focus is visible', async ({ page }) => {
    await page.goto(PREVIEW);
    await page.keyboard.press('Tab');
    const skip = page.locator('.ld-skip');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
    expect(outline).toBe('solid');
  });

  // Owner-approved visual refinement 2026-11-17: hero 35px with only «كوادرنا» in Primary, 32px section headings,
  // Primary value-card titles with a shadow, AI band on Primary/700 in both themes, pure-white analysis-flow borders.
  for (const theme of ['light', 'dark'] as const) {
    test(`visual refinement styles hold in ${theme} theme`, async ({ page }) => {
      const primary = theme === 'light' ? 'rgb(29, 78, 216)' : 'rgb(96, 165, 250)';
      const ink = theme === 'light' ? 'rgb(9, 9, 11)' : 'rgb(250, 250, 250)';
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(PREVIEW);
        await page.evaluate(t => window.localStorage.setItem('ld-theme', t), theme);
        await page.reload();
        await expect(page.locator('[data-landing-page]')).toHaveAttribute('data-theme', theme);

        const css = (sel: string, prop: string) => page.locator(sel).first().evaluate(
          (el, p) => getComputedStyle(el).getPropertyValue(p), prop);
        const brand = page.locator('[data-hero-brand]');
        await expect(brand).toHaveCount(1);
        await expect(brand).toHaveText('كوادرنا');
        expect(await css('[data-hero-brand]', 'color')).toBe(primary);
        for (const sel of ['.ld-h1__lead', '.ld-h1__accent']) {
          expect(await css(sel, 'font-size')).toBe('35px');
          expect(await css(sel, 'color')).toBe(ink);
        }

        const headings = await page.locator('h2.ld-h2, h2.ld-final__title').evaluateAll(els => els.map(el => ({
          id: el.id, size: getComputedStyle(el).fontSize, color: getComputedStyle(el).color,
          onBand: !!el.closest('.ld-ai, .ld-final'),
        })));
        expect(headings.length).toBeGreaterThanOrEqual(9);
        for (const h of headings) {
          expect(h.size, h.id).toBe('32px');
          expect(h.color, h.id).toBe(h.onBand ? 'rgb(255, 255, 255)' : primary);
        }

        const cards = await page.locator('[data-value-item]').evaluateAll(els => els.map(el => ({
          title: getComputedStyle(el.querySelector('.ld-value__item-title')!).color,
          shadow: getComputedStyle(el).boxShadow,
        })));
        expect(cards).toHaveLength(7);
        for (const c of cards) { expect(c.title).toBe(primary); expect(c.shadow).not.toBe('none'); }

        expect(await css('#ai', 'background-color')).toBe('rgb(29, 78, 216)');
        const borders = await page.locator('.ld-ai__flow li span').evaluateAll(els => els.map(el => getComputedStyle(el).borderTopColor));
        expect(borders.length).toBeGreaterThan(0);
        for (const b of borders) expect(b).toBe('rgb(255, 255, 255)');
      }
      await page.evaluate(() => window.localStorage.removeItem('ld-theme'));
    });
  }

  test('theme toggle switches Light/Dark, remembers the choice and never overflows', async ({ page }) => {
    const root = page.locator('[data-landing-page]');
    const toggle = page.locator('[data-theme-toggle]');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PREVIEW);
      await page.evaluate(() => window.localStorage.removeItem('ld-theme'));
      await page.reload();
      await expect(root).toHaveAttribute('data-theme', 'light');
      expect(await root.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
      await expect(toggle).toHaveAttribute('aria-label', 'التبديل إلى الوضع الداكن');

      await toggle.click();
      await expect(root).toHaveAttribute('data-theme', 'dark');
      // Design System dark `background` = Primary/950 #111520; foreground = Zinc/50 #FAFAFA
      expect(await root.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(17, 21, 32)');
      expect(await page.locator('h1').evaluate(el => getComputedStyle(el).color)).toBe('rgb(250, 250, 250)');
      await expect(toggle).toHaveAttribute('aria-label', 'التبديل إلى الوضع الفاتح');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

      await page.reload();
      await expect(root).toHaveAttribute('data-theme', 'dark');

      await toggle.click();
      await expect(root).toHaveAttribute('data-theme', 'light');
      await page.evaluate(() => window.localStorage.removeItem('ld-theme'));
    }
  });

  test('theme choice does not touch the page outside the landing root', async ({ page }) => {
    await page.goto(PREVIEW);
    await page.locator('[data-theme-toggle]').click();
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme') || document.body.hasAttribute('data-theme'))).toBe(false);
  });

  test('hero CTA reaches the current demo entry (preview harness, default demoHref "/")', async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.locator('[data-demo-cta]').first()).toHaveAttribute('href', '/');
    await page.locator('[data-demo-cta="hero"]').click();
    await expect(page).toHaveURL(/\/$/);
    // Before Stage 3, `/` is the demo login. After Codex mounts the landing at `/` (with its own demoHref, e.g. `/demo`),
    // `/` is the integrated landing: follow its hero CTA one step further. Either way the visitor must reach the login.
    const login = page.locator('[data-demo-login]');
    const integratedCta = page.locator('[data-landing-page] [data-demo-cta="hero"]');
    await expect(login.or(integratedCta)).toBeVisible();
    if (await integratedCta.isVisible()) {
      await integratedCta.click();
      await expect(login).toBeVisible();
    }
  });
});
