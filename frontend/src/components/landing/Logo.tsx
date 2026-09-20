import { Link } from 'react-router-dom';
import { brand } from '../../config/assets';
import { routes } from '../../config/routes';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

/** Linked Growth mark + wordmark. Links to the homepage. */
export const Logo = ({ showTagline = false, size = 36 }: { showTagline?: boolean; size?: number }) => (
  <Link
    to={routes.home}
    aria-label={`${brand.name} home`}
    className="inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4"
    style={{ outlineColor: colors.blue }}
  >
    <img src={brand.logoMark} alt="" width={size} height={size} />
    <span className="flex flex-col">
      <span
        style={{
          color: colors.navy,
          fontSize: size * 0.62,
          fontWeight: typography.weights.extrabold,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {brand.name}
      </span>
      {showTagline && (
        <span style={{ ...typography.styles.small, color: colors.muted, marginTop: 4 }}>{brand.tagline}</span>
      )}
    </span>
  </Link>
);
