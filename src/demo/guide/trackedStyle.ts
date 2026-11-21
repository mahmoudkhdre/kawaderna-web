/**
 * CSS that marks the request the tour follows (006, fix D6).
 *
 * No background tint on purpose: the Manager table keeps its legacy label colours (#0D6EFD "بانتظار قرارك",
 * #DC3545 overdue), which are only ~4.5:1 on white and fall below 4.5:1 on any tint (4.14 on primary/50). The row is
 * marked by an accent outline plus a 4px edge bar instead, so text contrast stays exactly what the frozen table has.
 * The page is RTL, so the inline-start edge is the right one.
 *
 * `requestId` must already be validated (`LV-2026-<digits>`) by the caller; it is placed inside an attribute selector.
 */
export const trackedRowCss = (requestId: string): string =>
  `.kd-shell [data-request-id="${requestId}"] { outline: 2px solid var(--kd-accent); outline-offset: -2px; }
.kd-shell tr[data-request-id="${requestId}"] > :first-child { box-shadow: inset -4px 0 0 var(--kd-accent); }
.kd-shell li[data-request-id="${requestId}"] { box-shadow: inset -4px 0 0 var(--kd-accent), var(--kd-shadow-sm); }`;
