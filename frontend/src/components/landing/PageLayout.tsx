import type { ReactNode } from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { useScrollOnNavigate } from './useScrollOnNavigate';

/** Shared chrome (navbar + footer) for every public marketing page. */
export const PageLayout = ({ children }: { children: ReactNode }) => {
  useScrollOnNavigate();
  return (
    <div style={{ backgroundColor: colors.background, color: colors.text, fontFamily: typography.fontFamily }}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
};
