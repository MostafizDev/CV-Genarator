import { Container } from '../components/landing/Container';
import { PageLayout } from '../components/landing/PageLayout';
import { PolicyCard } from '../components/privacy/PolicyCard';
import { PrivacyHero } from '../components/privacy/PrivacyHero';
import { RelatedPolicies } from '../components/privacy/RelatedPolicies';
import { SafeBanner } from '../components/privacy/SafeBanner';
import { policySections } from '../config/privacyContent';
import { colors } from '../styles/colors';

/** Public privacy policy page. */
export const PrivacyPage = () => (
  <PageLayout>
    <PrivacyHero />
    <section style={{ backgroundColor: colors.white }}>
      <Container className="space-y-5 py-10 sm:py-12">
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {policySections.map((section, index) => (
            <PolicyCard key={section.title} number={index + 1} {...section} />
          ))}
        </ul>
        <SafeBanner />
        <RelatedPolicies />
      </Container>
    </section>
  </PageLayout>
);
