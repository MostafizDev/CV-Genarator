/*
 * Cookie consent configuration: what the banner says and which storage each category owns.
 *
 * Keep `inUse` truthful. It drives what visitors are told the app actually does. If you add
 * analytics or preference storage, flip it to true and gate the code with runWhenConsented().
 */
export type OptionalCategory = 'preferences' | 'analytics';
export type ConsentCategory = 'essential' | OptionalCategory;

export const CONSENT_COOKIE_NAME = 'bs_consent';
/** Bump to ask everyone again (e.g. after adding a new category). */
export const CONSENT_VERSION = 1;
/** Regulators generally expect consent to be re-requested within about 6 to 12 months. */
export const CONSENT_MAX_AGE_DAYS = 180;

export interface ConsentCategoryInfo {
  id: ConsentCategory;
  label: string;
  description: string;
  required: boolean;
  inUse: boolean;
  examples?: string[];
}

export const consentCategories: ConsentCategoryInfo[] = [
  {
    id: 'essential',
    label: 'Essential',
    description:
      'Keeps you signed in, protects your account, and remembers this cookie choice. Backedstory cannot work without these.',
    required: true,
    inUse: true,
    examples: ['Sign-in session', 'Your cookie choice (bs_consent)'],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    description: 'Remembers optional settings you pick, such as a default document template, on this device.',
    required: false,
    inUse: false,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Anonymous usage statistics that help us understand which parts of Backedstory to improve.',
    required: false,
    inUse: false,
  },
];

export const consentCopy = {
  bannerTitle: 'Your cookie choices',
  bannerBody:
    'We use cookies and similar browser storage. Essential ones keep you signed in and remember this choice. With your permission we may also use them for preferences and anonymous analytics. Right now Backedstory only uses essential storage, and nothing else is loaded unless you allow it.',
  acceptAll: 'Accept All',
  rejectNonEssential: 'Reject Non-Essential',
  customize: 'Customize',
  learnMore: 'Privacy Policy',
  preferencesTitle: 'Cookie preferences',
  preferencesIntro:
    'Choose which cookies and similar storage Backedstory may use. You can change this at any time from Cookie Settings in the footer.',
  save: 'Save preferences',
  notInUse: 'Not used at the moment',
  alwaysOn: 'Always on',
} as const;

/**
 * Browser storage that exists only because of an optional category. It is removed when
 * that category is declined or later withdrawn.
 */
export const nonEssentialStorageKeys: Record<OptionalCategory, string[]> = {
  preferences: ['cv_generator_template_cv', 'cv_generator_template_cover_letter'],
  analytics: [],
};
