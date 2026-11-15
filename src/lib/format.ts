/** Single ar-SA formatting utility (Gregorian calendar, Riyadh display zone). */

const DISPLAY_TIME_ZONE = 'Asia/Riyadh';

const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});

export const formatDate = (date: Date): string => dateFormatter.format(date);

export const formatDateRange = (start: Date, end: Date): string =>
  start.getTime() === end.getTime()
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;

const numberFormatter = new Intl.NumberFormat('ar-SA');

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const formatDays = (days: number): string => {
  const n = numberFormatter.format(days);
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومان';
  if (days >= 3 && days <= 10) return `${n} أيام`;
  return `${n} يومًا`;
};

const dateTimeFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: DISPLAY_TIME_ZONE,
});

export const formatDateTime = (date: Date): string => dateTimeFormatter.format(date);
