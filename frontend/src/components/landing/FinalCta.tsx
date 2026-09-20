import { icons } from '../../config/assets';
import { finalCta } from '../../config/landingContent';
import { routes } from '../../config/routes';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Button } from './Button';
import { Container } from './Container';

export const FinalCta = () => (
  <section aria-labelledby="final-cta-heading" style={{ backgroundColor: colors.white }}>
    <Container className="py-12 sm:py-16">
      <div
        className="flex flex-col items-center gap-8 rounded-3xl p-8 text-center sm:p-10 lg:flex-row lg:justify-between lg:text-left"
        style={{
          background: `linear-gradient(120deg, ${colors.blueTint} 0%, ${alpha(colors.blueSoft, 0.55)} 100%)`,
          border: `1px solid ${alpha(colors.blue, 0.12)}`,
        }}
      >
        <div className="max-w-xl">
          <h2 id="final-cta-heading" style={{ ...typography.styles.h3, color: colors.navy }}>
            {finalCta.title}
          </h2>
          <p className="mt-3" style={{ ...typography.styles.body, color: colors.muted }}>
            {finalCta.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button to={routes.login} size="lg">
            {finalCta.button}
            <icons.arrowRight className="h-4 w-4" strokeWidth={2.6} />
          </Button>
          <p style={{ ...typography.styles.caption, fontWeight: typography.weights.medium, color: colors.muted }}>
            {finalCta.note}
          </p>
        </div>
      </div>
    </Container>
  </section>
);
