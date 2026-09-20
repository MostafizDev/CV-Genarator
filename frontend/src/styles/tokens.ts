import { colors, cssVarName, type ColorName } from './colors';
import { typography } from './typography';

/**
 * Publishes the design tokens to the document: every color becomes a `--brand-*` CSS
 * variable (theme.css maps Tailwind's color names onto them, so all existing Tailwind
 * classes follow styles/colors.ts) and the font stack becomes `--brand-font-sans`. Call once,
 * before the first render.
 */
export function applyDesignTokens(): void {
  const root = document.documentElement;

  (Object.keys(colors) as ColorName[]).forEach((name) => {
    root.style.setProperty(cssVarName(name), colors[name]);
  });
  root.style.setProperty('--brand-font-sans', typography.fontFamily);
}
