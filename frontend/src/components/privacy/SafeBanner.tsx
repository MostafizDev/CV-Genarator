import { icons } from '../../config/assets';
import { safeBanner } from '../../config/privacyContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

export const SafeBanner = () => (
  <div
    className="flex flex-col items-center gap-4 rounded-2xl p-6 text-center sm:flex-row sm:text-left"
    style={{
      backgroundColor: alpha(colors.green, 0.07),
      border: `1px solid ${alpha(colors.green, 0.22)}`,
    }}
  >
    <span
      className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: colors.white, boxShadow: `0 4px 14px ${alpha(colors.green, 0.18)}` }}
      aria-hidden="true"
    >
      <icons.lock className="h-7 w-7" color={colors.green} strokeWidth={2.3} />
    </span>

    <div className="sm:flex-1">
      <h2 style={{ ...typography.styles.cardTitle, color: colors.navy }}>{safeBanner.title}</h2>
      <p className="mt-1" style={{ ...typography.styles.small, color: colors.muted }}>
        {safeBanner.message}
      </p>
    </div>

    <p
      className="hidden shrink-0 md:block"
      style={{
        fontFamily: typography.handwritingFamily,
        fontSize: '1.45rem',
        fontWeight: typography.weights.semibold,
        lineHeight: 1.1,
        color: colors.green,
        transform: 'rotate(-4deg)',
      }}
    >
      {safeBanner.handwritten[0]}
      <br />
      {safeBanner.handwritten[1]}
    </p>
  </div>
);
