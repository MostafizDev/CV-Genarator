import { useEffect, useRef, useState } from 'react';
import { consentCategories, consentCopy, type OptionalCategory } from '../config/consent';
import { Button } from '../components/landing/Button';
import { alpha, colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { useConsent } from './ConsentContext';

const Toggle = ({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
    style={{
      backgroundColor: checked ? (disabled ? alpha(colors.green, 0.55) : colors.green) : colors.border,
      outlineColor: colors.blue,
    }}
  >
    <span
      className="absolute top-0.5 h-6 w-6 rounded-full transition-all"
      style={{ left: checked ? 22 : 2, backgroundColor: colors.white, boxShadow: `0 1px 3px ${alpha(colors.navy, 0.3)}` }}
    />
  </button>
);

const Dialog = () => {
  const { consent, save, acceptAll, rejectNonEssential, closePreferences } = useConsent();
  const [draft, setDraft] = useState<Record<OptionalCategory, boolean>>({
    preferences: consent?.preferences ?? false,
    analytics: consent?.analytics ?? false,
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Modal behaviour: focus moves in, Tab stays inside, Escape closes, page behind can't scroll,
  // and focus returns to whatever opened the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? []);
    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreferences();
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [closePreferences]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6"
      style={{ backgroundColor: alpha(colors.navy, 0.55) }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePreferences();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6"
        style={{
          backgroundColor: colors.white,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 24px 60px ${alpha(colors.navy, 0.3)}`,
          fontFamily: typography.fontFamily,
        }}
      >
        <h2 id="cookie-prefs-title" style={{ ...typography.styles.h3, color: colors.navy }}>
          {consentCopy.preferencesTitle}
        </h2>
        <p className="mt-2" style={{ ...typography.styles.small, color: colors.muted }}>
          {consentCopy.preferencesIntro}
        </p>

        <ul className="mt-5 space-y-3">
          {consentCategories.map((category) => {
            const optional = category.id !== 'essential';
            return (
              <li
                key={category.id}
                className="flex items-start gap-4 rounded-xl p-4"
                style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
              >
                <div className="flex-1">
                  <p className="flex flex-wrap items-center gap-2" style={{ ...typography.styles.body, fontWeight: 800, color: colors.navy }}>
                    {category.label}
                    {!category.inUse && (
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{ ...typography.styles.caption, backgroundColor: colors.blueTint, color: colors.blue }}
                      >
                        {consentCopy.notInUse}
                      </span>
                    )}
                  </p>
                  <p className="mt-1" style={{ ...typography.styles.small, color: colors.muted }}>
                    {category.description}
                  </p>
                  {category.examples && (
                    <p className="mt-1.5" style={{ ...typography.styles.caption, color: colors.muted }}>
                      In use: {category.examples.join(' · ')}
                    </p>
                  )}
                </div>
                {optional ? (
                  <Toggle
                    label={`Allow ${category.label.toLowerCase()} cookies`}
                    checked={draft[category.id as OptionalCategory]}
                    onChange={(next) => setDraft((prev) => ({ ...prev, [category.id]: next }))}
                  />
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <Toggle label="Essential cookies are always on" checked disabled onChange={() => {}} />
                    <span style={{ ...typography.styles.caption, color: colors.muted }}>{consentCopy.alwaysOn}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button variant="primary" onClick={() => save(draft)} className="sm:flex-1">
            {consentCopy.save}
          </Button>
          <Button variant="secondary" onClick={acceptAll} className="sm:flex-1">
            {consentCopy.acceptAll}
          </Button>
          <Button variant="secondary" onClick={rejectNonEssential} className="sm:flex-1">
            {consentCopy.rejectNonEssential}
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Preferences dialog, reachable from the banner and from Cookie Settings (footer / Settings page). */
export const CookiePreferences = () => {
  const { preferencesOpen } = useConsent();
  return preferencesOpen ? <Dialog /> : null;
};
