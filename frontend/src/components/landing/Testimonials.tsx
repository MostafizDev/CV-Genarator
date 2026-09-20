import { testimonials } from '../../config/landingContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Container } from './Container';
import { SectionHeading } from './SectionHeading';

export const Testimonials = () => (
  <section
    id="testimonials"
    aria-labelledby="testimonials-heading"
    style={{ backgroundColor: colors.surfaceTint, scrollMarginTop: 72 }}
  >
    <Container className="py-16 sm:py-20">
      <SectionHeading id="testimonials-heading" {...testimonials} />

      <ul className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {testimonials.items.map((item) => (
          <li
            key={item.name}
            className="flex gap-4 rounded-2xl p-5"
            style={{
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 1px 2px ${alpha(colors.navy, 0.04)}`,
            }}
          >
            <img
              src={item.avatar}
              alt={`Portrait of ${item.name}`}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
            <figure className="flex flex-col">
              <blockquote style={{ ...typography.styles.small, color: colors.text }}>“{item.quote}”</blockquote>
              <figcaption className="mt-4">
                <p style={{ ...typography.styles.body, fontWeight: typography.weights.extrabold, color: colors.navy }}>
                  {item.name}
                </p>
                <p style={{ ...typography.styles.caption, fontWeight: typography.weights.medium, color: colors.muted }}>
                  {item.role}
                </p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Container>
  </section>
);
