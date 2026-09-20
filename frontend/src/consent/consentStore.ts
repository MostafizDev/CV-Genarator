import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
  nonEssentialStorageKeys,
  type ConsentCategory,
  type OptionalCategory,
} from '../config/consent';
import { buildCookie, decodeConsent, readCookie, type ConsentChoices, type ConsentRecord } from './consentCodec';

/*
 * The visitor's cookie choice: read from and written to a first-party cookie, with a tiny
 * subscribe API so React (and non-React code) can react to changes.
 *
 * To add anything non-essential (an analytics script, a preference cookie), never load it
 * directly -- wrap it:
 *
 *     runWhenConsented('analytics', () => {
 *       const script = loadAnalytics();   // only runs after the visitor allows analytics
 *       return () => script.remove();     // and is undone if they later withdraw
 *     });
 */

const listeners = new Set<() => void>();

function readFromCookie(): ConsentRecord | null {
  try {
    return decodeConsent(readCookie(document.cookie, CONSENT_COOKIE_NAME), CONSENT_VERSION);
  } catch {
    return null;
  }
}

let current: ConsentRecord | null = readFromCookie();

export function getConsent(): ConsentRecord | null {
  return current;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True if the category may be used right now. Essential is always allowed; others need an explicit yes. */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'essential') return true;
  return current?.[category] === true;
}

function removeStorageFor(category: OptionalCategory) {
  for (const key of nonEssentialStorageKeys[category]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable (private mode); nothing to clean up then.
    }
  }
}

export function saveConsent(choices: ConsentChoices): void {
  const record: ConsentRecord = { v: CONSENT_VERSION, ts: Date.now(), ...choices };
  document.cookie = buildCookie(CONSENT_COOKIE_NAME, record, {
    secure: window.location.protocol === 'https:',
    maxAgeSeconds: CONSENT_MAX_AGE_DAYS * 24 * 60 * 60,
  });
  current = record;

  // Declining (or withdrawing) removes what that category had stored.
  (['preferences', 'analytics'] as const).forEach((category) => {
    if (!choices[category]) removeStorageFor(category);
  });

  listeners.forEach((listener) => listener());
}

/**
 * Runs `start` only while `category` is allowed. It runs immediately if consent is already
 * given, or as soon as it is granted; the cleanup it returns runs if consent is withdrawn.
 * Returns a function that stops watching (and cleans up).
 */
export function runWhenConsented(category: OptionalCategory, start: () => void | (() => void)): () => void {
  let cleanup: void | (() => void);
  let running = false;

  const sync = () => {
    const allowed = hasConsent(category);
    if (allowed && !running) {
      cleanup = start();
      running = true;
    } else if (!allowed && running) {
      if (typeof cleanup === 'function') cleanup();
      cleanup = undefined;
      running = false;
    }
  };

  sync();
  const unsubscribe = subscribe(sync);
  return () => {
    unsubscribe();
    if (running && typeof cleanup === 'function') cleanup();
  };
}
