import { createContext, useContext } from 'react';
import type { ConsentChoices, ConsentRecord } from './consentCodec';

export interface ConsentContextValue {
  /** null until the visitor makes a choice. */
  consent: ConsentRecord | null;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  save: (choices: ConsentChoices) => void;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}

export const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent must be used inside <ConsentProvider>.');
  return value;
}
