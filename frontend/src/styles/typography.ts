import type { CSSProperties } from 'react';

/*
 * Backedstory typography -- Nunito everywhere, plus one handwritten accent face. Both are
 * self-hosted via @fontsource (imported in main.tsx), not loaded from Google Fonts.
 * Components spread the entries of `styles` into their `style` prop so font size,
 * weight and spacing come from here and nowhere else. Sizes use clamp() so type scales
 * smoothly between mobile and desktop without per-breakpoint overrides.
 */
export const typography = {
  fontFamily: "'Nunito Variable', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  handwritingFamily: "'Caveat', 'Comic Sans MS', cursive",

  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  styles: {
    h1: {
      fontSize: 'clamp(2.5rem, 1.5rem + 3.6vw, 4rem)',
      fontWeight: 800,
      lineHeight: 1.08,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: 'clamp(1.75rem, 1.2rem + 1.9vw, 2.5rem)',
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontSize: 'clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem)',
      fontWeight: 800,
      lineHeight: 1.2,
    },
    cardTitle: { fontSize: '1.0625rem', fontWeight: 800, lineHeight: 1.3 },
    eyebrow: {
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      lineHeight: 1.4,
    },
    bodyLarge: { fontSize: 'clamp(1rem, 0.95rem + 0.3vw, 1.1875rem)', fontWeight: 500, lineHeight: 1.6 },
    body: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.6 },
    small: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4 },
    button: { fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1 },
    buttonLarge: { fontSize: '1rem', fontWeight: 700, lineHeight: 1 },
  } satisfies Record<string, CSSProperties>,
} as const;
