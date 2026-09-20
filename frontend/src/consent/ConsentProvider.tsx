import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ConsentContext, type ConsentContextValue } from './ConsentContext';
import { getConsent, saveConsent, subscribe } from './consentStore';
import type { ConsentChoices } from './consentCodec';

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const consent = useSyncExternalStore(subscribe, getConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const save = useCallback((choices: ConsentChoices) => {
    saveConsent(choices);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      save,
      acceptAll: () => save({ preferences: true, analytics: true }),
      rejectNonEssential: () => save({ preferences: false, analytics: false }),
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    }),
    [consent, save, preferencesOpen],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};
