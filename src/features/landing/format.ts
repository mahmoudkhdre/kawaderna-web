/** Arabic dual/plural agreement for «وحدة». */
export const unitCount = (n: number): string => {
  if (n === 1) return 'وحدة واحدة';
  if (n === 2) return 'وحدتان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-SA')} وحدات`;
  return `${n.toLocaleString('ar-SA')} وحدة`;
};
