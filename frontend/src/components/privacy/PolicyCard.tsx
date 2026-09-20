import { icons, type IconName } from '../../config/assets';
import { alpha, colors, tones, type Tone } from '../../styles/colors';
import { typography } from '../../styles/typography';

interface PolicyCardProps {
  number: number;
  icon: IconName;
  tone: Tone;
  title: string;
  body: string;
  link?: { label: string; href: string };
}

export const PolicyCard = ({ number, icon, tone, title, body, link }: PolicyCardProps) => {
  const Icon = icons[icon];
  const palette = tones[tone];

  return (
    <li
      className="flex gap-4 rounded-2xl p-5 sm:gap-5 sm:p-6"
      style={{
        backgroundColor: colors.white,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 1px 2px ${alpha(colors.navy, 0.04)}`,
      }}
    >
      <span
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full sm:h-16 sm:w-16"
        style={{ backgroundColor: palette.bg }}
        aria-hidden="true"
      >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" color={palette.fg} strokeWidth={2.1} />
      </span>

      <div>
        <h3 style={{ ...typography.styles.cardTitle, color: colors.navy }}>
          <span style={{ color: palette.fg }}>{String(number).padStart(2, '0')}.</span> {title}
        </h3>
        <p className="mt-2" style={{ ...typography.styles.small, color: colors.muted }}>
          {body}
          {link && (
            <>
              {' '}
              <a
                href={link.href}
                className="underline-offset-2 hover:underline"
                style={{ color: colors.blue, fontWeight: typography.weights.semibold }}
              >
                {link.label}
              </a>
              .
            </>
          )}
        </p>
      </div>
    </li>
  );
};
