import { icons } from '../../config/assets';
import { trustedUsers } from '../../config/landingContent';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Container } from './Container';

export const TrustedUsers = () => (
  <section aria-labelledby="trusted-heading" style={{ backgroundColor: colors.white }}>
    <Container className="py-10 sm:py-12">
      <h2
        id="trusted-heading"
        className="text-center"
        style={{ ...typography.styles.eyebrow, color: colors.muted }}
      >
        {trustedUsers.title}
      </h2>

      <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {trustedUsers.items.map((item, index) => {
          const Icon = icons[item.icon];
          return (
            <li key={item.title} className="flex items-center gap-4 lg:justify-center lg:px-4">
              {index > 0 && (
                <span
                  className="hidden h-12 w-px lg:-ml-4 lg:mr-4 lg:block"
                  style={{ backgroundColor: colors.border }}
                  aria-hidden="true"
                />
              )}
              <Icon className="h-9 w-9 shrink-0" color={colors.blue} strokeWidth={2.1} />
              <div>
                <p style={{ ...typography.styles.body, fontWeight: typography.weights.extrabold, color: colors.text }}>
                  {item.title}
                </p>
                <p style={{ ...typography.styles.caption, fontWeight: typography.weights.medium, color: colors.muted }}>
                  {item.caption}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Container>
  </section>
);
