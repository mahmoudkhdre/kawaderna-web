import { describe, expect, it } from 'vitest';
import { countRequests } from './arabicPlural';

describe('countRequests (DF-01: Arabic singular/dual/plural)', () => {
  it.each([
    [0, 'لا توجد طلبات'],
    [1, 'طلب واحد'],
    [2, 'طلبان'],
    [3, '٣ طلبات'],
    [10, '١٠ طلبات'],
    [11, '١١ طلبًا'],
    [25, '٢٥ طلبًا'],
  ])('%i → %s', (count, expected) => expect(countRequests(count)).toBe(expected));
  it('never claims a number for invalid input', () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(countRequests(bad)).toBe('لا توجد طلبات');
  });
});
