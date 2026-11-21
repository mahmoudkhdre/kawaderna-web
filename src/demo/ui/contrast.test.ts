import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trackedRowCss } from '../guide/trackedStyle';
import { tokens } from '../../lib/tokens';

/**
 * T-A11Y-01: numeric contrast of every foreground/background pair the 006 refresh introduces.
 * Text ≥ 4.5:1 (the owner's AA target for normal text); icons and meaningful graphics ≥ 3:1.
 * Token values are read from demo-ui.css so the test cannot drift from the real tokens.
 */
const css = readFileSync(join(__dirname, 'demo-ui.css'), 'utf8');
const token = (name: string): string => {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match) throw new Error(`token --${name} not found`);
  return match[1];
};
const channel = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const T = {
  white: '#ffffff', page: token('kd-page'), info: token('kd-surface-info'), muted: token('kd-surface-muted'),
  fg: token('kd-foreground'), text2: token('kd-text-2'), accent: token('kd-accent'),
  destructive: token('kd-destructive'), success: token('kd-success'),
};

describe('contrast of the colours used by the guide and the refresh', () => {
  const text: [string, string, string][] = [
    ['foreground on white', T.fg, T.white], ['foreground on page', T.fg, T.page], ['foreground on info', T.fg, T.info], ['foreground on muted', T.fg, T.muted],
    ['secondary text on white', T.text2, T.white], ['secondary text on page', T.text2, T.page], ['secondary text on info', T.text2, T.info], ['secondary text on muted', T.text2, T.muted],
    ['accent text on white', T.accent, T.white], ['accent text on info', T.accent, T.info],
    ['white on accent (primary button, primary choice)', T.white, T.accent],
    ['destructive text on white', T.destructive, T.white],
  ];
  it.each(text)('text: %s ≥ 4.5:1', (_name, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));

  const graphics: [string, string, string][] = [
    ['success/600 icon on white', T.success, T.white], ['success/600 icon on page', T.success, T.page],
    ['destructive icon on white', T.destructive, T.white], ['accent icon on white', T.accent, T.white],
    ['secondary icon on white', T.text2, T.white],
  ];
  it.each(graphics)('graphic: %s ≥ 3:1', (_name, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3));

  it('documents why success/600 (not the semantic success #22c55e) is used, and that it never carries text', () => {
    expect(ratio('#22c55e', T.white)).toBeLessThan(3);
    expect(ratio(T.success, T.white)).toBeLessThan(4.5); // therefore success is icon-only
  });
});

describe('the new CSS introduces no new colour values', () => {
  const read = (name: string) => readFileSync(join(__dirname, name), 'utf8');
  it.each(['guide.css', 'refresh.css'])('%s uses only tokens, white and neutral black shadows', name => {
    const hex = (read(name).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map(value => value.toLowerCase());
    expect(hex.filter(value => value !== '#fff' && value !== '#ffffff')).toEqual([]);
  });
});

describe('colour guard also covers the base stylesheets (review 2026-11-17)', () => {
  const read = (name: string) => readFileSync(join(__dirname, name), 'utf8');
  const hexOf = (text: string) => (text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map(value => value.toLowerCase());
  it('demo-ui.css: every hex outside the --kd-* token definitions is white, the Figma logo gradient, or a token fallback', () => {
    const outside = read('demo-ui.css').split('\n').filter(line => !/^\s*--kd-[\w-]+:/.test(line)).join('\n');
    const allowed = new Set(['#fff', '#ffffff', '#7c3aed', '#1e3a8a', '#1d4ed8']);
    expect(hexOf(outside).filter(value => !allowed.has(value))).toEqual([]);
  });
  it('employee.css uses no colour value except white', () => {
    expect(hexOf(readFileSync(join(__dirname, '../../pages/EmployeeLeave/employee.css'), 'utf8')).filter(value => value !== '#fff')).toEqual([]);
  });
});

describe('D6: the tracked row keeps the contrast of the frozen Manager table', () => {
  const legacy = { actionable: tokens.colors.primary.base, overdue: tokens.colors.destructive.base, secondary: tokens.colors.text.secondary, primary: tokens.colors.text.primary };
  it('the "بانتظار قرارك" label is ≥ 4.5:1 on the white row it keeps (measured, not estimated)', () => {
    expect(ratio(legacy.actionable, T.white)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(legacy.overdue, T.white)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(legacy.secondary, T.white)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(legacy.primary, T.white)).toBeGreaterThanOrEqual(4.5);
  });
  it('documents why the row is not tinted: the same label falls below 4.5:1 on the info tint and on the page grey', () => {
    expect(ratio(legacy.actionable, T.info)).toBeLessThan(4.5);
    expect(ratio(legacy.actionable, T.page)).toBeLessThan(4.5);
    expect(ratio(legacy.overdue, T.info)).toBeLessThan(4.5);
  });
  it('the row marker has no background (no tint) and uses only the accent token', () => {
    const css = trackedRowCss('LV-2026-107');
    expect(css).not.toMatch(/background/i);
    expect(css).toContain('var(--kd-accent)');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
  it('the hover cue of the table is an outline, not a tint', () => {
    const refresh = readFileSync(join(__dirname, 'refresh.css'), 'utf8');
    const hover = /\[data-layout="table"\] tbody tr:hover \{[^}]*\}/.exec(refresh)?.[0] ?? '';
    expect(hover).toContain('outline');
    expect(hover).not.toMatch(/background/);
  });
});

describe('the reject button hover keeps its destructive text readable', () => {
  it('destructive text on the page grey (the hover background) is ≥ 4.5:1, unlike on the muted grey (< 4.5:1)', () => {
    expect(ratio(T.destructive, T.page)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(T.destructive, T.muted)).toBeLessThan(4.5);
    const refresh = readFileSync(join(__dirname, 'refresh.css'), 'utf8');
    const hover = /button\[data-action="reject"\]:hover[^{]*\{[^}]*\}/.exec(refresh)?.[0] ?? '';
    expect(hover).toContain('var(--kd-page)');
    expect(hover).not.toContain('var(--kd-surface-muted)');
  });
});
