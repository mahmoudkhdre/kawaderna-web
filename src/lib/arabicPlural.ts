import { formatNumber } from './format';

/**
 * Arabic count phrase for "request(s)" following the grammatical number classes:
 * 0 → none, 1 → singular, 2 → dual, 3–10 → plural (جمع قلة), 11+ → singular accusative (تمييز).
 * Negative or non-integer input is treated as 0 so a bad value never produces a wrong claim.
 */
export const countRequests = (count: number): string => {
  const n = Number.isInteger(count) && count > 0 ? count : 0;
  if (n === 0) return 'لا توجد طلبات';
  if (n === 1) return 'طلب واحد';
  if (n === 2) return 'طلبان';
  if (n <= 10) return `${formatNumber(n)} طلبات`;
  return `${formatNumber(n)} طلبًا`;
};
