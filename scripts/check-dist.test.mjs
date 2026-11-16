import { describe, expect, it } from 'vitest';
import { checkSourceBoundary, scanText, selfTest } from './check-dist.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

describe('post-build guard', () => {
  it('every detector fires on a synthetic marker assembled at run time', () => {
    const failed = selfTest().filter((r) => !r.ok).map((r) => r.label);
    expect(failed).toEqual([]);
  });

  it('does not reject harmless numeric constants or ordinary words', () => {
    expect(scanText('x.js', 'const a="1:1",b="2026:10",c="12:30:45";const NAME_ONLY=1;')).toEqual([]);
  });

  it('the current source tree respects the import boundary', () => {
    const src = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
    expect(checkSourceBoundary(src)).toEqual([]);
  });
});
