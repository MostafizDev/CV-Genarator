import { images, type IconName } from './assets';
import type { Tone } from '../styles/colors';

/* All homepage copy and structure. Edit text here; components only render it. */

export const navLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Testimonials', href: '#testimonials' },
] as const;

export const hero = {
  headlineTop: 'Your story.',
  headlineAccent: 'Backed',
  headlineRest: ' by proof.',
  description:
    'Create professional resumes and cover letters tailored to any job, with real evidence from your projects, experience, and achievements.',
  cta: 'Get Started Free',
  assurances: ['Free to start', 'No credit card required', 'Built for real professionals'],
  handwritten: ['Turn', 'proof into', 'opportunities'],
} as const;

export const trustedUsers = {
  title: 'Trusted by ambitious professionals',
  items: [
    { icon: 'student', title: 'Students', caption: 'Build a strong start' },
    { icon: 'jobSeeker', title: 'Job Seekers', caption: 'Stand out in applications' },
    { icon: 'professional', title: 'Professionals', caption: 'Showcase real impact' },
    { icon: 'careerChanger', title: 'Career Changers', caption: 'Translate skills into new paths' },
  ] satisfies { icon: IconName; title: string; caption: string }[],
};

export const howItWorks = {
  eyebrow: 'How it works',
  title: 'From your experience to new opportunities',
  subtitle: 'A simple process to create, verify, and apply with confidence.',
  steps: [
    {
      icon: 'addInformation',
      tone: 'blue',
      title: 'Add Your Information',
      description: 'Upload your resume or enter your experience, projects, and achievements.',
    },
    {
      icon: 'connectEvidence',
      tone: 'green',
      title: 'Connect Evidence',
      description: 'Link your GitHub, portfolio, certificates, or any proof to back your claims.',
    },
    {
      icon: 'generate',
      tone: 'purple',
      title: 'Generate & Customize',
      description: 'Get tailored resumes and cover letters for any job description using AI.',
    },
    {
      icon: 'apply',
      tone: 'amber',
      title: 'Apply with Confidence',
      description: 'Show a stronger, verified story and land more interviews.',
    },
  ] satisfies { icon: IconName; tone: Tone; title: string; description: string }[],
};

export const features = {
  eyebrow: 'A stronger way to showcase you',
  title: 'More than a resume builder',
  subtitle: 'Backedstory helps you present a complete, verified story — not just a list of skills.',
  items: [
    {
      icon: 'aiDocument',
      tone: 'green',
      title: 'AI-Powered Resumes & Cover Letters',
      description: 'Tailored to job descriptions for higher chances.',
    },
    {
      icon: 'evidence',
      tone: 'blue',
      title: 'Evidence Integration',
      description: 'Connect GitHub, portfolios, certificates and more.',
    },
    {
      icon: 'ats',
      tone: 'purple',
      title: 'ATS Friendly',
      description: 'Professional, modern templates that get noticed.',
    },
    {
      icon: 'impact',
      tone: 'amber',
      title: 'Show Real Impact',
      description: 'Highlight your projects, results and achievements with proof.',
    },
  ] satisfies { icon: IconName; tone: Tone; title: string; description: string }[],
};

// Placeholder quotes from the design mock -- replace with real user feedback.
export const testimonials = {
  eyebrow: 'Real people. Real progress.',
  title: 'What our users say',
  subtitle: 'Join thousands who are turning their experience into real opportunities.',
  items: [
    {
      quote: 'Backedstory helped me showcase my projects with real evidence. I got 3 interview calls within 2 weeks!',
      name: 'Sadia Ahmed',
      role: 'Software Developer',
      avatar: images.avatars.sadia,
    },
    {
      quote:
        'The ability to link my GitHub and certificates made my resume stand out. This is exactly what job seekers need.',
      name: 'Tanvir Islam',
      role: 'Data Analyst',
      avatar: images.avatars.tanvir,
    },
    {
      quote: 'Simple, clean, and powerful. Backedstory made it so easy to tailor my resume for different jobs.',
      name: 'Nusrat Jahan',
      role: 'Recent Graduate',
      avatar: images.avatars.nusrat,
    },
  ],
};

export const finalCta = {
  title: 'Ready to turn your story into opportunity?',
  subtitle: 'Join thousands of professionals who are building their future with proof.',
  button: 'Get Started Free',
  note: 'No credit card required',
} as const;

export const footer = {
  links: [
    { label: 'About', href: '#how-it-works' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
  social: [
    { label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com' },
    { label: 'GitHub', icon: 'github', href: 'https://github.com' },
    { label: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com' },
  ] as const,
  rights: 'All rights reserved.',
} as const;

