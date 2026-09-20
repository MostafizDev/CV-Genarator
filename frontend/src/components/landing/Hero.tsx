import { brand, icons } from '../../config/assets';
import { hero } from '../../config/landingContent';
import { routes } from '../../config/routes';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { Button } from './Button';
import { Container } from './Container';
import { HeroVisual } from './HeroVisual';

const CheckBox = () => (
  <span
    className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]"
    style={{ backgroundColor: colors.green }}
  >
    <icons.check className="h-3 w-3" color={colors.white} strokeWidth={3.5} />
  </span>
);

export const Hero = () => (
  <section
    style={{
      background: `linear-gradient(180deg, ${colors.white} 0%, ${alpha(colors.blueTint, 0.7)} 100%)`,
    }}
  >
    <Container className="grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
      <div className="text-center lg:text-left">
        <p style={{ ...typography.styles.eyebrow, color: colors.muted }}>{brand.eyebrow}</p>

        <h1 className="mt-5" style={{ ...typography.styles.h1, color: colors.text }}>
          {hero.headlineTop}
          <br />
          <span style={{ color: colors.blue }}>{hero.headlineAccent}</span>
          {hero.headlineRest}
        </h1>

        <p className="mx-auto mt-6 max-w-[30rem] lg:mx-0" style={{ ...typography.styles.bodyLarge, color: colors.text }}>
          {hero.description}
        </p>

        <div className="mt-8">
          <Button to={routes.login} size="lg">
            {hero.cta}
            <icons.arrowRight className="h-4 w-4" strokeWidth={2.6} />
          </Button>
        </div>

        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
          {hero.assurances.map((text) => (
            <li key={text} className="flex items-center gap-2" style={{ ...typography.styles.small, color: colors.text }}>
              <CheckBox />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <HeroVisual />
    </Container>
  </section>
);
