import { icons } from '../../config/assets';
import { privacyHero } from '../../config/privacyContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Container } from '../landing/Container';
import { PrivacyHeroVisual } from './PrivacyHeroVisual';

export const PrivacyHero = () => (
  <section
    style={{
      background: `linear-gradient(180deg, ${alpha(colors.blueTint, 0.9)} 0%, ${alpha(colors.blueTint, 0.5)} 100%)`,
    }}
  >
    <Container className="grid items-center gap-8 py-12 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:py-16">
      <div className="text-center lg:text-left">
        <p style={{ ...typography.styles.eyebrow, color: colors.navy, letterSpacing: '0.22em' }}>
          {privacyHero.eyebrow}
        </p>

        <h1 className="mt-4" style={{ ...typography.styles.h1, color: colors.text }}>
          {privacyHero.titleTop}
          <br />
          <span style={{ color: colors.blue }}>{privacyHero.titleAccent}</span>
        </h1>

        <p className="mx-auto mt-5 max-w-[30rem] lg:mx-0" style={{ ...typography.styles.bodyLarge, color: colors.muted }}>
          {privacyHero.description}
        </p>

        <p
          className="mt-5 inline-flex items-center gap-2"
          style={{ ...typography.styles.small, color: colors.muted }}
        >
          <icons.calendar className="h-4 w-4" color={colors.muted} strokeWidth={2} aria-hidden="true" />
          {privacyHero.lastUpdated}
        </p>
      </div>

      <PrivacyHeroVisual />
    </Container>
  </section>
);
