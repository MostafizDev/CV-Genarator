import { Fragment } from 'react';
import { icons } from '../../config/assets';
import { howItWorks } from '../../config/landingContent';
import { alpha, colors, tones } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Container } from './Container';
import { SectionHeading } from './SectionHeading';

export const HowItWorks = () => (
  <section
    id="how-it-works"
    aria-labelledby="how-it-works-heading"
    style={{ backgroundColor: colors.surfaceTint, scrollMarginTop: 72 }}
  >
    <Container className="py-16 sm:py-20">
      <SectionHeading id="how-it-works-heading" {...howItWorks} />

      <ol className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:flex lg:items-start lg:justify-between lg:gap-2">
        {howItWorks.steps.map((step, index) => {
          const tone = tones[step.tone];
          const Icon = icons[step.icon];
          return (
            <Fragment key={step.title}>
              <li className="flex flex-col items-center text-center lg:flex-1">
                <div className="relative">
                  <span
                    className="absolute -left-5 -top-1 inline-flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: tone.bg,
                      color: tone.fg,
                      fontWeight: typography.weights.extrabold,
                      fontSize: '1.05rem',
                      border: `2px solid ${colors.white}`,
                    }}
                    aria-label={`Step ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className="inline-flex h-[84px] w-[84px] items-center justify-center rounded-full"
                    style={{
                      backgroundColor: colors.white,
                      border: `1px solid ${alpha(tone.fg, 0.16)}`,
                      boxShadow: `0 10px 26px ${alpha(tone.fg, 0.14)}`,
                    }}
                  >
                    <Icon className="h-9 w-9" color={tone.fg} strokeWidth={2} />
                  </span>
                </div>
                <h3 className="mt-5" style={{ ...typography.styles.cardTitle, color: colors.navy }}>
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[13.5rem]" style={{ ...typography.styles.small, color: colors.muted }}>
                  {step.description}
                </p>
              </li>
              {index < howItWorks.steps.length - 1 && (
                <li aria-hidden="true" className="mt-9 hidden lg:block">
                  <icons.arrowRight className="h-5 w-5" color={colors.muted} strokeWidth={1.8} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </Container>
  </section>
);
