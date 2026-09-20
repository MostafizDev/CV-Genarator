import { externalLinks, type IconName } from './assets';
import { routes } from './routes';
import type { Tone } from '../styles/colors';

/* All privacy policy copy. Have this reviewed to match how the product actually works. */

export const privacyHero = {
  eyebrow: 'Privacy Policy',
  titleTop: 'Your privacy',
  titleAccent: 'matters.',
  description:
    "We're committed to protecting your personal information and being transparent about how we collect, use, and safeguard your data.",
  lastUpdated: 'Last updated: September 15, 2026',
  badge: ['Your data.', 'Your control.'],
  handwritten: ['Real', 'People.', 'Real', 'Opportunities.'],
} as const;

export const policySections: {
  icon: IconName;
  tone: Tone;
  title: string;
  body: string;
  link?: { label: string; href: string };
}[] = [
  {
    icon: 'document',
    tone: 'blue',
    title: 'Information We Collect',
    body: 'We collect information you provide, such as your name, email address, profile details, resumes, cover letters, certificates, and any other content you choose to upload.',
  },
  {
    icon: 'settings',
    tone: 'green',
    title: 'How We Use Your Information',
    body: 'We use your information to provide and improve our services, generate tailored resumes and cover letters, communicate with you, and ensure a better user experience.',
  },
  {
    icon: 'share',
    tone: 'purple',
    title: 'How We Share Your Information',
    body: 'We do not sell your personal information. We may share your data only with trusted third-party services (e.g., authentication, cloud hosting, AI processing) to operate our platform and when required by law.',
  },
  {
    icon: 'security',
    tone: 'amber',
    title: 'Data Security',
    body: 'Your data is protected using industry-standard security measures. Sensitive information is encrypted in transit (TLS/HTTPS) and at rest using encryption provided by our infrastructure providers. Access to data is limited to authorized systems and personnel only.',
  },
  {
    icon: 'brain',
    tone: 'green',
    title: 'Use of AI Services',
    body: 'We use trusted AI providers (such as Google Gemini) to help generate and improve your resumes and cover letters. Only the information you choose to submit is shared, and it is handled securely. We do not use your data to train our models.',
  },
  {
    icon: 'user',
    tone: 'blue',
    title: 'Your Rights',
    body: 'You can access, update, or delete your personal information at any time. If you have any requests or questions about your data, please contact us.',
  },
  {
    icon: 'cookie',
    tone: 'red',
    title: 'Cookies and Tracking',
    body: 'We use cookies to improve your experience, analyze usage, and ensure the proper functioning of our website. You can manage your cookie preferences in your browser settings.',
  },
  {
    icon: 'mail',
    tone: 'purple',
    title: 'Contact Us',
    body: 'If you have any questions about this Privacy Policy or your data, please reach out to us at',
    link: { label: externalLinks.supportEmail, href: `mailto:${externalLinks.supportEmail}` },
  },
];

export const safeBanner = {
  title: 'Your data is safe with us.',
  message: 'We use encryption, secure infrastructure, and strict access controls to protect your information.',
  handwritten: ['Privacy today.', 'Better opportunities tomorrow.'],
} as const;

export const relatedPolicies = {
  title: 'Related Policies',
  message: 'You may also want to review our Terms of Service, Cookie Policy, and Disclaimer.',
  // Entries without a `path` have no page yet and render as plain text.
  links: [
    { label: 'Terms of Service', path: undefined as string | undefined },
    { label: 'Cookie Policy', path: undefined as string | undefined },
    { label: 'Disclaimer', path: undefined as string | undefined },
  ],
  currentPath: routes.privacy,
} as const;
