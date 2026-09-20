import {
  ArrowRight,
  Briefcase,
  ChartColumn,
  Check,
  FileCheck,
  FileText,
  GraduationCap,
  Link2,
  Menu,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { colors } from '../styles/colors';

/*
 * Every reusable asset -- logo, icons, brand marks, images -- lives here, so components
 * never hardcode an asset path or an SVG color. SVG assets are generated from the color
 * tokens in styles/colors.ts and exposed as data URIs, so re-theming the palette
 * re-colors the logo and illustrations too.
 */
const svgUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// --- Brand ---------------------------------------------------------------

/** "Linked Growth" logo mark: two chain links rising on a diagonal (blue -> green). */
const logoMarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <g transform="rotate(-45 24 24)" stroke-width="5.5" stroke-linecap="round">
    <rect x="5" y="15.5" width="24" height="17" rx="8.5" stroke="${colors.blue}"/>
    <rect x="19" y="15.5" width="24" height="17" rx="8.5" stroke="${colors.green}"/>
  </g>
</svg>`;

export const brand = {
  name: 'Backedstory',
  tagline: 'Your story. Backed by proof.',
  eyebrow: 'Real experience. Real opportunities.',
  logoMark: svgUri(logoMarkSvg),
} as const;

// --- UI icons (Lucide) -----------------------------------------------------

export const icons = {
  arrowRight: ArrowRight,
  check: Check,
  menu: Menu,
  close: X,
  student: GraduationCap,
  jobSeeker: Briefcase,
  professional: Users,
  careerChanger: RefreshCw,
  addInformation: FileText,
  connectEvidence: Link2,
  generate: FileCheck,
  apply: Send,
  aiDocument: FileText,
  evidence: Link2,
  ats: ShieldCheck,
  impact: ChartColumn,
} as const;

// --- Brand marks (Lucide has none) ------------------------------------------

export const brandIcons = {
  github: (color: string = colors.navy) =>
    svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${color}" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`,
    ),
  linkedin: (color: string = colors.navy) =>
    svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="${color}"/><rect x="5.9" y="9.6" width="2.6" height="8" fill="${colors.white}"/><circle cx="7.2" cy="6.9" r="1.5" fill="${colors.white}"/><path fill="${colors.white}" d="M10.6 9.6h2.5v1.1c.4-.7 1.3-1.3 2.6-1.3 2.4 0 2.9 1.6 2.9 3.6v4.6h-2.6v-4.1c0-1 0-2.2-1.4-2.2s-1.6 1-1.6 2.1v4.2h-2.6z"/></svg>`,
    ),
  youtube: (color: string = colors.navy) =>
    svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="${color}"/><path fill="${colors.white}" d="M10 8.9v6.2l5.3-3.1z"/></svg>`,
    ),
};

// --- Images ---------------------------------------------------------------

interface AvatarOptions {
  background: string;
  skin: string;
  hair: string;
  shirt: string;
  longHair?: boolean;
}

/** Flat, friendly placeholder portrait. Swap `images.avatars.*` for real photos later. */
function avatar({ background, skin, hair, shirt, longHair = false }: AvatarOptions): string {
  const hairBehind = longHair ? `<path d="M27 46c-2-21 8-31 21-31s23 10 21 31l1 24H26z" fill="${hair}"/>` : '';
  const hairFront = `<path d="M31 40c0-15 8-24 17-24s17 9 17 24c-4-9-10-12-17-12s-13 3-17 12z" fill="${hair}"/>`;
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${background}"/>${hairBehind}<path d="M10 96c0-21 16-33 38-33s38 12 38 33z" fill="${shirt}"/><rect x="41" y="52" width="14" height="16" rx="6" fill="${skin}"/><ellipse cx="48" cy="41" rx="16" ry="19" fill="${skin}"/>${hairFront}</svg>`,
  );
}

const skinTones = { light: '#F1C9A5', medium: '#D9A577', deep: '#B9805A' } as const;

export const images = {
  avatars: {
    founder: avatar({ background: colors.blueSoft, skin: skinTones.medium, hair: colors.text, shirt: colors.navy }),
    sadia: avatar({
      background: colors.greenTint,
      skin: skinTones.medium,
      hair: colors.text,
      shirt: colors.blue,
      longHair: true,
    }),
    tanvir: avatar({ background: colors.blueTint, skin: skinTones.deep, hair: colors.text, shirt: colors.green }),
    nusrat: avatar({
      background: colors.purpleTint,
      skin: skinTones.light,
      hair: colors.text,
      shirt: colors.navy,
      longHair: true,
    }),
  },
} as const;

export type IconName = keyof typeof icons;
