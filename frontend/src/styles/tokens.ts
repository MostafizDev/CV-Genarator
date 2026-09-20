import { colors, cssVarName, type ColorName } from './colors';
import { typography } from './typography';

/**
 * Publishes the design tokens to the document: every color becomes a `--brand-*` CSS
 * variable (theme.css maps Tailwind's color names onto them, so all existing Tailwind
 * classes follow styles/colors.ts), the font stack becomes `--brand-font-sans`, and the
 * Google Fonts stylesheet for Nunito is loaded. Call once, before the first render.
 */
export function applyDesignTokens(): void {
  const root = document.documentElement;

  (Object.keys(colors) as ColorName[]).forEach((name) => {
    root.style.setProperty(cssVarName(name), colors[name]);
  });
  root.style.setProperty('--brand-font-sans', typography.fontFamily);

  if (!document.getElementById('brand-fonts')) {
    for (const origin of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      if (origin.includes('gstatic')) preconnect.crossOrigin = '';
      document.head.appendChild(preconnect);
    }
    const stylesheet = document.createElement('link');
    stylesheet.id = 'brand-fonts';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = typography.googleFontsUrl;
    document.head.appendChild(stylesheet);
  }
}
