import { icons } from '../../config/assets';
import { supportProject } from '../../config/landingContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Button } from './Button';
import { Container } from './Container';

/** Optional, low-key "buy me a coffee" card -- deliberately quieter than the final CTA. */
export const SupportProject = () => (
  <section aria-label="Support the project" style={{ backgroundColor: colors.white }}>
    <Container className="pt-12 sm:pt-16">
      <div
        className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl p-6 text-center sm:flex-row sm:gap-6 sm:px-8 sm:text-left"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 4px 14px ${alpha(colors.navy, 0.05)}`,
        }}
      >
        <span
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.blueTint }}
          aria-hidden="true"
        >
          <icons.coffee className="h-7 w-7" color={colors.navy} strokeWidth={2} />
        </span>

        <p className="sm:flex-1" style={{ ...typography.styles.body, color: colors.muted }}>
          <span
            className="block"
            style={{ ...typography.styles.cardTitle, color: colors.navy, marginBottom: 2 }}
          >
            {supportProject.title}
          </span>
          {supportProject.message}
        </p>

        <Button href={supportProject.url} variant="secondary">
          {supportProject.button}
        </Button>
      </div>
    </Container>
  </section>
);
