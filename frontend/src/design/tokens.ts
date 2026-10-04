/**
 * SkillBridge AI — Design Token System
 * 
 * A complete, typed design system for a premium futuristic AI career platform.
 * All tokens are centralized here so every component consumes the same scale.
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // --- Base surfaces (deep near-black / navy) ---
  surface: {
    base: '#03050c',        // Pure deep black base
    elevated: '#0a0f1e',    // Slightly elevated panels
    overlay: '#11182c',     // Modals, dropdowns, popovers
    inset: '#070a16',       // Inset / recessed areas
    border: '#1e293b',      // Subtle borders
    borderStrong: '#334155', // Stronger borders for focus
  },

  // --- Brand / Accent ---
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',   // Primary brand
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // --- Cyan / Electric accent ---
  cyan: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',   // Primary cyan
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // --- Violet / Purple accent ---
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',   // Primary violet
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // --- Plasma (magenta-violet) for highlights ---
  plasma: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',   // Primary plasma
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },

  // --- Semantic ---
  success: {
    light: '#34d399',
    DEFAULT: '#22c55e',
    dark: '#16a34a',
    bg: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 0.2)',
  },
  warning: {
    light: '#fbbf24',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.2)',
  },
  danger: {
    light: '#fb7185',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.2)',
  },

  // --- Text ---
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    subtle: '#64748b',
    inverse: '#0f172a',
    link: '#818cf8',
    linkHover: '#a5b4fc',
  },

  // --- Gradients ---
  gradients: {
    brand: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
    brandSubtle: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(6, 182, 212, 0.15) 100%)',
    cyan: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
    violet: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    plasma: 'linear-gradient(135deg, #d946ef 0%, #e879f9 100%)',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
    surfaceStrong: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
    mesh: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.1), transparent), radial-gradient(ellipse 50% 30% at 10% 60%, rgba(6,182,212,0.08), transparent)',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fonts: {
    display: 'var(--font-display, "Space Grotesk", "Inter", system-ui, sans-serif)',
    sans: 'var(--font-sans, "Inter", system-ui, sans-serif)',
    mono: 'var(--font-mono, "JetBrains Mono", "Space Grotesk", monospace)',
  },

  sizes: {
    // Fluid type scale using clamp
    xs: 'clamp(0.625rem, 0.6rem + 0.125vw, 0.6875rem)',     // 10-11px - labels, timestamps
    sm: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',         // 12-14px - body small
    base: 'clamp(0.875rem, 0.825rem + 0.25vw, 1rem)',        // 14-16px - body
    lg: 'clamp(1rem, 0.925rem + 0.375vw, 1.125rem)',         // 16-18px - body large
    xl: 'clamp(1.125rem, 1rem + 0.625vw, 1.5rem)',           // 18-24px - subheadings
    '2xl': 'clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem)',       // 24-36px - section titles
    '3xl': 'clamp(2rem, 1.5rem + 2.5vw, 3.5rem)',            // 32-56px - page titles
    '4xl': 'clamp(3rem, 2rem + 5vw, 5.5rem)',                // 48-88px - hero
    '5xl': 'clamp(4rem, 2.5rem + 7.5vw, 8rem)',              // 64-128px - massive hero
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.7,
    loose: 2,
  },

  letterSpacing: {
    tight: '-0.03em',
    normal: '0',
    wide: '0.02em',
    wider: '0.1em',
    uppercase: '0.12em',
  },

  // Pre-built text styles for common patterns
  styles: {
    hero: {
      fontSize: 'clamp(3rem, 2rem + 5vw, 5.5rem)',
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
      fontFamily: 'var(--font-display, "Space Grotesk", "Inter", system-ui, sans-serif)',
    },
    heroAlt: {
      fontSize: 'clamp(3rem, 2rem + 5vw, 5.5rem)',
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
      fontFamily: 'var(--font-serif, "Instrument Serif", Georgia, serif)',
      fontStyle: 'italic',
    },
    pageTitle: {
      fontSize: 'clamp(2rem, 1.5rem + 2.5vw, 3.5rem)',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      fontFamily: 'var(--font-display, "Space Grotesk", "Inter", system-ui, sans-serif)',
    },
    sectionTitle: {
      fontSize: 'clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem)',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
      fontFamily: 'var(--font-display, "Space Grotesk", "Inter", system-ui, sans-serif)',
    },
    body: {
      fontSize: 'clamp(0.875rem, 0.825rem + 0.25vw, 1rem)',
      fontWeight: 400,
      lineHeight: 1.6,
      fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
    },
    bodyLarge: {
      fontSize: 'clamp(1rem, 0.925rem + 0.375vw, 1.125rem)',
      fontWeight: 400,
      lineHeight: 1.7,
      fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
    },
    label: {
      fontSize: 'clamp(0.625rem, 0.6rem + 0.125vw, 0.6875rem)',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
    },
    mono: {
      fontSize: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    },
    monoLarge: {
      fontSize: 'clamp(1.25rem, 1rem + 1.25vw, 2rem)',
      fontWeight: 600,
      lineHeight: 1.2,
      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      tabularNums: true,
    },
    caption: {
      fontSize: 'clamp(0.625rem, 0.6rem + 0.125vw, 0.6875rem)',
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
    },
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const radius = {
  none: '0',
  xs: '0.25rem',      // 4px - tiny elements
  sm: '0.375rem',     // 6px - small buttons, chips
  md: '0.5rem',       // 8px - default
  lg: '0.75rem',      // 12px - cards
  xl: '1rem',         // 16px - larger cards
  '2xl': '1.5rem',    // 24px - panels
  '3xl': '2rem',      // 32px - major surfaces
  full: '9999px',     // pills, avatars
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  // Layered shadows for depth
  xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.5), 0 10px 10px rgba(0, 0, 0, 0.3)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.6)',
  
  // Glass shadows
  glass: '0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 30px rgba(0,0,0,0.8)',
  glassHover: '0 1px 0 rgba(255,255,255,0.08) inset, 0 16px 40px rgba(99,102,241,0.25)',
  
  // Glow shadows
  glowBrand: '0 0 20px rgba(99, 102, 241, 0.4), 0 0 60px rgba(139, 92, 246, 0.15)',
  glowCyan: '0 0 16px rgba(6, 182, 212, 0.35)',
  glowSuccess: '0 0 16px rgba(34, 197, 94, 0.35)',
  
  // Inner shadows
  inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
  insetLight: 'inset 0 1px 0 rgba(255,255,255,0.05)',
} as const;

// ============================================================================
// TRANSITIONS / MOTION
// ============================================================================

export const motion = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
    hero: '1000ms',
  },
  
  easings: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    easeIn: 'cubic-bezier(0.55, 0, 0.68, 0.19)',
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    expoOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  
  // Preset transitions
  presets: {
    micro: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms cubic-bezier(0.22, 1, 0.36, 1)',
    standard: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 250ms cubic-bezier(0.22, 1, 0.36, 1)',
    slow: 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)',
    hero: 'transform 1000ms cubic-bezier(0.22, 1, 0.36, 1), opacity 1000ms cubic-bezier(0.22, 1, 0.36, 1)',
    spring: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  '3xl': '1920px',
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  commandPalette: 800,
  max: 9999,
} as const;

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const layout = {
  sidebar: {
    width: '280px',
    widthCollapsed: '72px',
    height: '100vh',
  },
  topNav: {
    height: '64px',
  },
  content: {
    maxWidth: '1440px',
    padding: '24px',
    paddingMobile: '16px',
  },
  hero: {
    minHeight: '100vh',
    maxWidth: '1200px',
  },
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  breakpoints,
  zIndex,
  layout,
} as const;

export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type Motion = typeof motion;
export type Breakpoints = typeof breakpoints;
export type ZIndex = typeof zIndex;
export type Layout = typeof layout;
export type Tokens = typeof tokens;