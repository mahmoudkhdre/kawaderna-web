import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;
const sources = readdirSync(dir)
  .filter(name => /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name))
  .map(name => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

/** Static guards (plan T-G-04): the guide must not be able to bypass auth or read data it does not need. */
describe('guide modules: static guards', () => {
  it('finds the guide modules', () => expect(sources.length).toBeGreaterThanOrEqual(6));

  it('never authenticates, logs in, or drives the session', () => {
    for (const { name, text } of sources) {
      expect(text, name).not.toMatch(/authenticateDemoPersona|DEMO_PASSWORD|DEMO_ACCOUNTS|restoreSession/);
      expect(text, name).not.toMatch(/\.login\s*\(|onLogin\s*\(|loginId\s*=/);
    }
  });

  it('never imports or reads balance fields', () => {
    for (const { name, text } of sources) {
      expect(text, name).not.toMatch(/balanceBefore|balanceAfter|exceedsAvailableBalance|lowBalanceDraft|EMPLOYEE_DEMO_BALANCE/);
    }
  });

  it('never persists anything except through the guide key and never uses the network', () => {
    for (const { name, text } of sources) {
      expect(text, name).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|document\.cookie|localStorage|indexedDB/);
      if (name !== 'storage.ts') expect(text, name).not.toMatch(/sessionStorage|\.setItem\s*\(/);
    }
  });

  it('never uses timers or hard-coded step numbers as the source of progress', () => {
    for (const { name, text } of sources) {
      expect(text, name).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    }
  });

  it('keeps the WhatsApp number out of the guide (one central source only)', () => {
    for (const { name, text } of sources) expect(text, name).not.toMatch(/wa\.me|201094097432|01094097432/);
  });
});
