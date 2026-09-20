import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { icons } from '../../config/assets';
import { relatedPolicies } from '../../config/privacyContent';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

const linkStyle = { ...typography.styles.small, fontWeight: typography.weights.semibold };

export const RelatedPolicies = () => (
  <div
    className="flex flex-col items-center gap-4 rounded-2xl p-6 text-center lg:flex-row lg:text-left"
    style={{ backgroundColor: colors.blueTint, border: `1px solid ${alpha(colors.blue, 0.1)}` }}
  >
    <span
      className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: colors.white, border: `1px solid ${alpha(colors.blue, 0.2)}` }}
      aria-hidden="true"
    >
      <icons.document className="h-7 w-7" color={colors.blue} strokeWidth={2} />
    </span>

    <div className="lg:flex-1">
      <h2 style={{ ...typography.styles.cardTitle, color: colors.navy }}>{relatedPolicies.title}</h2>
      <p className="mt-1" style={{ ...typography.styles.small, color: colors.muted }}>
        {relatedPolicies.message}
      </p>
    </div>

    <ul className="flex flex-wrap items-center justify-center gap-y-2">
      {relatedPolicies.links.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && (
            <li aria-hidden="true" className="mx-3" style={{ color: colors.border }}>
              |
            </li>
          )}
          <li>
            {item.path ? (
              <Link to={item.path} className="underline underline-offset-2" style={{ ...linkStyle, color: colors.blue }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ ...linkStyle, color: colors.muted }} title="Coming soon">
                {item.label}
              </span>
            )}
          </li>
        </Fragment>
      ))}
    </ul>
  </div>
);
