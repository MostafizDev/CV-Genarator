import { icons } from '../../config/assets';
import { privacyHero } from '../../config/privacyContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

/* Shield + padlock illustration, laid out on a 480 x 300 design grid in container units. */
const DESIGN_WIDTH = 480;
const DESIGN_HEIGHT = 300;
const u = (px: number) => `${((px / DESIGN_WIDTH) * 100).toFixed(3)}cqw`;

export const PrivacyHeroVisual = () => (
  <div
    role="img"
    aria-label="A padlock inside a shield with the message: your data, your control"
    className="relative mx-auto w-full max-w-[480px]"
    style={{ containerType: 'inline-size', aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}` }}
  >
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
      fill="none"
      aria-hidden="true"
    >
      {/* Soft backdrop shape */}
      <path
        d="M120 250 C 90 200, 130 130, 200 120 C 250 112, 300 90, 340 120 C 380 150, 400 220, 350 262 C 300 300, 160 300, 120 250 Z"
        fill={alpha(colors.blue, 0.06)}
      />
      {/* Shield */}
      <path
        d="M240 18 C 205 40, 168 46, 138 46 L 138 148 C 138 212, 188 254, 240 276 C 292 254, 342 212, 342 148 L 342 46 C 312 46, 275 40, 240 18 Z"
        fill={alpha(colors.blue, 0.13)}
      />
      <path
        d="M240 44 C 214 60, 188 66, 164 68 L 164 148 C 164 196, 202 228, 240 246 C 278 228, 316 196, 316 148 L 316 68 C 292 66, 266 60, 240 44 Z"
        fill={alpha(colors.blue, 0.1)}
      />
      {/* Padlock */}
      <path d="M216 118 V104 a24 24 0 0 1 48 0 V118" stroke={colors.blue} strokeWidth="13" strokeLinecap="round" />
      <rect x="200" y="114" width="80" height="66" rx="14" fill={colors.blue} />
      <circle cx="240" cy="142" r="8.5" fill={colors.white} />
      <rect x="236" y="146" width="8" height="18" rx="4" fill={colors.white} />
    </svg>

    {/* "Your data. Your control." card */}
    <div
      className="absolute flex items-center"
      style={{
        left: u(288),
        top: u(150),
        gap: u(10),
        padding: `${u(12)} ${u(16)}`,
        borderRadius: u(14),
        backgroundColor: colors.white,
        boxShadow: `0 ${u(10)} ${u(28)} ${alpha(colors.navy, 0.12)}`,
      }}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: u(24), height: u(24), borderRadius: '50%', backgroundColor: colors.green }}
      >
        <icons.check color={colors.white} strokeWidth={3.5} style={{ width: u(14), height: u(14) }} />
      </span>
      <span
        style={{
          fontSize: u(13),
          fontWeight: typography.weights.extrabold,
          color: colors.text,
          lineHeight: 1.25,
        }}
      >
        {privacyHero.badge[0]}
        <br />
        {privacyHero.badge[1]}
      </span>
    </div>

    {/* Handwritten note */}
    <div
      className="absolute hidden sm:block"
      style={{
        left: u(354),
        top: u(16),
        transform: 'rotate(-10deg)',
        transformOrigin: 'left top',
        fontFamily: typography.handwritingFamily,
        fontSize: u(20),
        fontWeight: typography.weights.semibold,
        lineHeight: 1.05,
        color: colors.muted,
        opacity: 0.75,
      }}
    >
      {privacyHero.handwritten.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  </div>
);
