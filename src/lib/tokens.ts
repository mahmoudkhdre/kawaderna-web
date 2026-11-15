/**
 * Kawaderna Design System Tokens
 *
 * TOKEN SOURCE CLASSIFICATION:
 * [A] = Explicitly documented in specification
 * [B] = Present in current specification (HR Product.md, Gap Pass v2)
 * [C] = Necessary implementation default (standard web/accessibility baseline)
 * [D] = Unknown / needs Figma verification
 *
 * IMPORTANT: Category [C] and [D] tokens are centralized here for future
 * replacement when exact Figma tokens become available.
 */

export const tokens = {
  // Typography
  fonts: {
    primary: "'Tajawal', sans-serif", // [A] Explicitly specified: Tajawal
    mono: "ui-monospace, 'Courier New', monospace", // [C] Standard monospace for IDs
  },

  fontSizes: {
    xs: '0.75rem',    // [C] Implementation default
    sm: '0.875rem',   // [C] Implementation default
    base: '1rem',     // [C] Implementation default
    lg: '1.125rem',   // [C] Implementation default
    xl: '1.25rem',    // [C] Implementation default
    '2xl': '1.5rem',  // [C] Implementation default
    '3xl': '1.875rem', // [C] Implementation default
    '4xl': '2.25rem', // [C] Implementation default
  },

  fontWeights: {
    light: 300,      // [A] Tajawal weight 300
    regular: 400,    // [A] Tajawal weight 400
    medium: 500,     // [A] Tajawal weight 500
    bold: 700,       // [A] Tajawal weight 700
    extrabold: 800,  // [A] Tajawal weight 800
  },

  // Spacing (4px grid system - standard practice)
  spacing: {
    '0': '0',
    '1': '0.25rem',   // [C] 4px grid
    '2': '0.5rem',    // [C] 8px
    '3': '0.75rem',   // [C] 12px
    '4': '1rem',      // [C] 16px
    '5': '1.25rem',   // [C] 20px
    '6': '1.5rem',    // [C] 24px
    '8': '2rem',      // [C] 32px
    '10': '2.5rem',   // [C] 40px
    '12': '3rem',     // [C] 48px
    '16': '4rem',     // [C] 64px
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '0.125rem',   // [C] 2px
    base: '0.25rem',  // [C] 4px
    md: '0.375rem',   // [C] 6px
    lg: '0.5rem',     // [C] 8px
    xl: '0.75rem',    // [C] 12px
    '2xl': '1rem',    // [C] 16px
    full: '9999px',   // [C] Full rounded
  },

  // Colors - MINIMAL semantic tokens for Leave MVP
  // [D] All color values need Figma verification
  colors: {
    // Surfaces
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#F1F3F5',
    },

    // Text
    text: {
      primary: '#212529',
      secondary: '#495057',
      tertiary: '#868E96',
      disabled: '#ADB5BD',
      inverse: '#FFFFFF',
    },

    // Borders
    border: {
      light: '#E9ECEF',
      base: '#DEE2E6',
      strong: '#CED4DA',
    },

    // Interactive (Primary action color needs Figma verification)
    primary: {
      base: '#0D6EFD',
      hover: '#0B5ED7',
      active: '#0A58CA',
      disabled: '#B8DAFF',
    },

    secondary: {
      base: '#6C757D',
      hover: '#5C636A',
      active: '#565E64',
      disabled: '#E2E3E5',
    },

    destructive: {
      base: '#DC3545',
      hover: '#BB2D3B',
      active: '#B02A37',
      disabled: '#F8D7DA',
    },
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',   // [C] Standard elevation
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',   // [C] Standard easing
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Breakpoints
  breakpoints: {
    mobile: '768px',    // [B] Referenced in spec: < 768px = mobile
    tablet: '1024px',   // [B] Referenced in spec: tablet range
    desktop: '1280px',  // [C] Desktop width
  },
} as const;

export type Tokens = typeof tokens;
