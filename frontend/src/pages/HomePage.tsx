import { Features } from '../components/landing/Features';
import { FinalCta } from '../components/landing/FinalCta';
import { Hero } from '../components/landing/Hero';
import { HowItWorks } from '../components/landing/HowItWorks';
import { PageLayout } from '../components/landing/PageLayout';
import { SupportProject } from '../components/landing/SupportProject';
import { Testimonials } from '../components/landing/Testimonials';
import { TrustedUsers } from '../components/landing/TrustedUsers';

/** Public marketing homepage shown to signed-out visitors. */
export const HomePage = () => (
  <PageLayout>
    <Hero />
    <TrustedUsers />
    <HowItWorks />
    <Features />
    <Testimonials />
    <SupportProject />
    <FinalCta />
  </PageLayout>
);
