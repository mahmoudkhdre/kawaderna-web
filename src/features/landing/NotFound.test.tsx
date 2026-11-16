import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotFound } from './NotFound';

const html = renderToStaticMarkup(<MemoryRouter><NotFound /></MemoryRouter>);

describe('Unknown-route page', () => {
  it('is an accessible Arabic RTL page with one h1 and a focusable main landmark', () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('الصفحة غير موجودة');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar-SA"');
    expect(html).toMatch(/<main[^>]*id="ld-main"[^>]*tabindex="-1"/);
  });

  it('offers the way back to the Landing and the demo, with no other destination', () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    expect(hrefs).toEqual(['/', '/demo']);
  });

  it('makes no commercial, price or availability claim', () => {
    const text = html.replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\d|ريال|سعر|متاح الآن|جاهز للتشغيل/);
  });
});
