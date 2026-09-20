import type { CSSProperties, ReactNode } from 'react';
import { brandIcons, icons, images } from '../../config/assets';
import { hero } from '../../config/landingContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

/*
 * Illustration of a profile card with verified evidence cards floating over it.
 * Laid out on a fixed 520 x 440 design grid, and every size is expressed in container
 * query units (cqw), so the whole composition scales uniformly from phone to desktop.
 */
const DESIGN_WIDTH = 520;
const DESIGN_HEIGHT = 440;
const u = (px: number) => `${((px / DESIGN_WIDTH) * 100).toFixed(3)}cqw`;

const cardBase: CSSProperties = {
  position: 'absolute',
  backgroundColor: colors.white,
  border: `1px solid ${alpha(colors.border, 0.9)}`,
  boxShadow: `0 ${u(14)} ${u(34)} ${alpha(colors.navy, 0.1)}`,
};

const SkeletonLine = ({ width, height = 7 }: { width: number; height?: number }) => (
  <div style={{ width: u(width), height: u(height), borderRadius: u(height), backgroundColor: colors.border }} />
);

const VerifiedBadge = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center"
    style={{
      gap: u(4),
      padding: `${u(2)} ${u(8)}`,
      borderRadius: u(20),
      backgroundColor: colors.greenTint,
      color: colors.greenHover,
      fontSize: u(10.5),
      fontWeight: typography.weights.bold,
    }}
  >
    {label}
    <span
      className="inline-flex items-center justify-center"
      style={{ width: u(11), height: u(11), borderRadius: '50%', backgroundColor: colors.green }}
    >
      <icons.check color={colors.white} strokeWidth={4} style={{ width: u(7), height: u(7) }} />
    </span>
  </span>
);

const EvidenceCard = ({
  left,
  top,
  width,
  icon,
  title,
  badge,
}: {
  left: number;
  top: number;
  width: number;
  icon: ReactNode;
  title: string;
  badge: string;
}) => (
  <div
    className="flex items-center"
    style={{ ...cardBase, left: u(left), top: u(top), width: u(width), gap: u(12), padding: u(12), borderRadius: u(16) }}
  >
    {icon}
    <div className="flex min-w-0 flex-col" style={{ gap: u(4) }}>
      <span style={{ fontSize: u(14), fontWeight: typography.weights.extrabold, color: colors.text, lineHeight: 1.1 }}>
        {title}
      </span>
      <VerifiedBadge label={badge} />
    </div>
  </div>
);

const IconTile = ({ background, children }: { background: string; children: ReactNode }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center"
    style={{ width: u(38), height: u(38), borderRadius: u(11), backgroundColor: background }}
  >
    {children}
  </span>
);

export const HeroVisual = () => (
  <div
    role="img"
    aria-label="A candidate profile with GitHub, certificate and impact evidence marked as verified"
    className="relative mx-auto w-full max-w-[520px]"
    style={{ containerType: 'inline-size', aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}` }}
  >
    {/* Soft background blobs */}
    <div
      className="absolute rounded-full"
      style={{ right: u(-10), top: u(-6), width: u(380), height: u(380), backgroundColor: alpha(colors.blue, 0.07) }}
    />
    <div
      className="absolute rounded-full"
      style={{ right: u(-20), bottom: u(6), width: u(250), height: u(250), backgroundColor: alpha(colors.green, 0.09) }}
    />

    {/* Profile card */}
    <div style={{ ...cardBase, left: 0, top: u(24), width: u(336), height: u(340), borderRadius: u(18) }}>
      <div className="flex items-center" style={{ gap: u(14), padding: u(20) }}>
        <img
          src={images.avatars.founder}
          alt=""
          style={{ width: u(52), height: u(52), borderRadius: '50%', objectFit: 'cover' }}
        />
        <div className="flex flex-col" style={{ gap: u(2) }}>
          <span style={{ fontSize: u(16), fontWeight: typography.weights.extrabold, color: colors.text, lineHeight: 1.2 }}>
            Md Mostafizur Rahman
          </span>
          <span style={{ fontSize: u(11.5), fontWeight: typography.weights.medium, color: colors.muted }}>
            Software Engineer
          </span>
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: u(8), padding: `0 ${u(20)}` }}>
        <SkeletonLine width={110} />
        <SkeletonLine width={190} />
      </div>
      <div style={{ padding: `${u(26)} ${u(20)} 0` }}>
        <span style={{ fontSize: u(13), fontWeight: typography.weights.extrabold, color: colors.text }}>Experience</span>
        <div className="flex flex-col" style={{ gap: u(15), marginTop: u(16) }}>
          {[190, 230, 150, 210, 120].map((width, index) => (
            <div key={index} className="flex items-center" style={{ gap: u(12) }}>
              <span
                className="shrink-0 rounded-full"
                style={{ width: u(6), height: u(6), backgroundColor: colors.muted, opacity: 0.55 }}
              />
              <SkeletonLine width={width} />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Connectors between the evidence cards */}
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
      fill="none"
      aria-hidden="true"
    >
      <g stroke={colors.green} strokeWidth="1.6" strokeLinecap="round">
        <path d="M408 122 C 408 146, 372 142, 372 170" />
        <path d="M312 232 C 312 262, 268 262, 268 296" />
      </g>
      <g fill={colors.green}>
        <circle cx="408" cy="122" r="3.6" />
        <circle cx="372" cy="170" r="3.6" />
        <circle cx="312" cy="232" r="3.6" />
        <circle cx="268" cy="296" r="3.6" />
      </g>
    </svg>

    {/* Evidence cards */}
    <EvidenceCard
      left={300}
      top={58}
      width={216}
      title="GitHub Project"
      badge="Verified"
      icon={<img src={brandIcons.github(colors.text)} alt="" style={{ width: u(38), height: u(38) }} />}
    />
    <EvidenceCard
      left={262}
      top={170}
      width={206}
      title="Certificate"
      badge="Verified"
      icon={
        <IconTile background={colors.blueTint}>
          <icons.addInformation color={colors.blue} strokeWidth={2.2} style={{ width: u(20), height: u(20) }} />
        </IconTile>
      }
    />
    <EvidenceCard
      left={152}
      top={296}
      width={196}
      title="Real Impact"
      badge="Backed"
      icon={
        <IconTile background={colors.greenTint}>
          <icons.impact color={colors.green} strokeWidth={2.6} style={{ width: u(20), height: u(20) }} />
        </IconTile>
      }
    />

    {/* Handwritten tagline */}
    <div
      className="absolute"
      style={{
        left: u(372),
        top: u(300),
        transform: 'rotate(-11deg)',
        transformOrigin: 'left top',
        fontFamily: typography.handwritingFamily,
        fontSize: u(26),
        fontWeight: typography.weights.semibold,
        lineHeight: 1.05,
        color: colors.navy,
        opacity: 0.85,
      }}
    >
      {hero.handwritten.map((line) => (
        <div key={line}>{line}</div>
      ))}
      <svg viewBox="0 0 110 12" fill="none" style={{ width: u(96), marginTop: u(4) }} aria-hidden="true">
        <path d="M2 9 C 30 2, 70 2, 108 7" stroke={colors.blue} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);
