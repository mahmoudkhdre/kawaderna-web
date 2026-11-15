/**
 * Gap 3-local colors taken from the Figma Gap 3 board (file 3vNsjBj9Gen1HSrtKrjd13,
 * frame 2177:21816; resolved with get_variable_defs on 2177:23414). The shared
 * `tokens` still hold legacy values; like the Gap 2 Drawer, this feature overrides
 * locally instead of editing shared tokens.
 */
export const REJECT_COLORS = {
  foreground: '#09090B', // Figma variable `foreground`
  border: '#D4D4D8', // Figma variable `border` (modal/summary/notice/fields)
  primary: '#0F172A', // Figma variable `primary` (selected radio, cancel text)
  card: '#EFF6FF', // Figma variable `card` (summary and notice surface)
  destructive: '#DC2626', // Figma variable `destructive`
} as const;
