import { icons } from '../../config/assets';
import { features } from '../../config/landingContent';
import { alpha, colors, tones, type Tone } from '../../styles/colors';
import { typography } from '../../styles/typography';
import type { IconName } from '../../config/assets';
import { Container } from './Container';
import { SectionHeading } from './SectionHeading';
import { useHover } from './useHover';

const FeatureCard = ({
  icon,
  tone,
  title,
  description,
}: {
  icon: IconName;
  tone: Tone;
  title: string;
  description: string;
}) => {
  const { active, handlers } = useHover();
  const Icon = icons[icon];
  const palette = tones[tone];

  return (
    <li
      {...handlers}
      className="rounded-2xl p-6 transition"
      style={{
        backgroundColor: colors.white,
        border: `1px solid ${active ? alpha(palette.fg, 0.35) : colors.border}`,
        boxShadow: active ? `0 14px 30px ${alpha(colors.navy, 0.08)}` : `0 1px 2px ${alpha(colors.navy, 0.04)}`,
        transform: active ? 'translateY(-2px)' : 'none',
      }}
    >
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: palette.bg }}
      >
        <Icon className="h-6 w-6" color={palette.fg} strokeWidth={2.2} />
      </span>
      <h3 className="mt-5" style={{ ...typography.styles.cardTitle, color: colors.navy }}>
        {title}
      </h3>
      <p className="mt-2" style={{ ...typography.styles.small, color: colors.muted }}>
        {description}
      </p>
    </li>
  );
};

export const Features = () => (
  <section
    id="features"
    aria-labelledby="features-heading"
    style={{ backgroundColor: colors.white, scrollMarginTop: 72 }}
  >
    <Container className="py-16 sm:py-20">
      <SectionHeading id="features-heading" {...features} />
      <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.items.map((item) => (
          <FeatureCard key={item.title} {...item} />
        ))}
      </ul>
    </Container>
  </section>
);
