import { Link } from 'react-router-dom';
import { consentCopy } from '../config/consent';
import { routes } from '../config/routes';
import { Button } from '../components/landing/Button';
import { TextButton } from '../components/landing/TextLink';
import { alpha, colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { useConsent } from './ConsentContext';

/** First-visit banner. Accept and Reject carry equal weight; nothing non-essential loads until "Accept". */
export const CookieBanner = () => {
  const { consent, preferencesOpen, acceptAll, rejectNonEssential, openPreferences } = useConsent();
  if (consent || preferencesOpen) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5"
    >
      <div
        className="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl p-5 sm:p-6 lg:flex-row lg:items-center"
        style={{
          backgroundColor: colors.white,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 18px 50px ${alpha(colors.navy, 0.22)}`,
          fontFamily: typography.fontFamily,
        }}
      >
        <div className="lg:flex-1">
          <h2 id="cookie-banner-title" style={{ ...typography.styles.cardTitle, color: colors.navy }}>
            {consentCopy.bannerTitle}
          </h2>
          <p id="cookie-banner-body" className="mt-1.5" style={{ ...typography.styles.small, color: colors.muted }}>
            {consentCopy.bannerBody}{' '}
            <Link
              to={routes.privacy}
              className="underline underline-offset-2"
              style={{ color: colors.blue, fontWeight: typography.weights.semibold }}
            >
              {consentCopy.learnMore}
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0 lg:flex-col lg:items-stretch">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" onClick={acceptAll} className="sm:flex-1">
              {consentCopy.acceptAll}
            </Button>
            <Button variant="secondary" onClick={rejectNonEssential} className="sm:flex-1">
              {consentCopy.rejectNonEssential}
            </Button>
          </div>
          <div className="text-center">
            <TextButton onClick={openPreferences}>{consentCopy.customize}</TextButton>
          </div>
        </div>
      </div>
    </section>
  );
};
