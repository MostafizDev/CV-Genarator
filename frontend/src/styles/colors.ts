/*
 * Backedstory color system -- the single source of truth for every color in the app.
 *
 * Components import `colors` (or use the Tailwind classes that theme.css maps onto the
 * same values). Never write a hex value anywhere else. The brand palette is the first
 * block; the rest are tints/states derived from it, plus the supporting accents the
 * design uses for variety (purple, amber).
 */
export const colors = {
  // Brand palette
  navy: '#172554', // Deep Navy: logo, headings, dark surfaces
  blue: '#2563EB', // Electric Blue: primary buttons, links, highlights
  green: '#16A34A', // Proof Green: verified / success
  background: '#F8FAFC', // Soft page background
  white: '#FFFFFF',
  text: '#0F172A', // Primary text
  muted: '#64748B', // Secondary text

  // Derived: blue
  blueHover: '#1D4ED8',
  blueActive: '#1E40AF',
  blueTint: '#EFF6FF',
  blueSoft: '#DBEAFE',

  // Derived: green
  greenHover: '#15803D',
  greenTint: '#DCFCE7',

  // Supporting accents
  purple: '#7C3AED',
  purpleTint: '#F3E8FF',
  amber: '#D97706',
  amberHover: '#B45309',
  amberTint: '#FEF3C7',

  // Feedback
  red: '#DC2626',
  redHover: '#B91C1C',

  // Neutrals
  border: '#E2E8F0',
  surfaceTint: '#F3F6FD', // alternating section bands
} as const;

export type ColorName = keyof typeof colors;

/** Pairs of foreground / soft-background used to color icons and badges by "tone". */
export const tones = {
  blue: { fg: colors.blue, bg: colors.blueTint },
  green: { fg: colors.green, bg: colors.greenTint },
  purple: { fg: colors.purple, bg: colors.purpleTint },
  amber: { fg: colors.amber, bg: colors.amberTint },
} as const;

export type Tone = keyof typeof tones;

/** Returns `hex` as an rgba() string with the given opacity (0-1), for shadows/borders. */
export function alpha(hex: string, opacity: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const cssVarName = (name: ColorName): string =>
  `--brand-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
