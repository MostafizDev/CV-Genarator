import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { Features } from '../components/landing/Features';
import { FinalCta } from '../components/landing/FinalCta';
import { Footer } from '../components/landing/Footer';
import { Hero } from '../components/landing/Hero';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Navbar } from '../components/landing/Navbar';
import { Testimonials } from '../components/landing/Testimonials';
import { TrustedUsers } from '../components/landing/TrustedUsers';

/** Public marketing homepage shown to signed-out visitors. */
export const HomePage = () => (
  <div style={{ backgroundColor: colors.background, color: colors.text, fontFamily: typography.fontFamily }}>
    <Navbar />
    <main>
      <Hero />
      <TrustedUsers />
      <HowItWorks />
      <Features />
      <Testimonials />
      <FinalCta />
    </main>
    <Footer />
  </div>
);
