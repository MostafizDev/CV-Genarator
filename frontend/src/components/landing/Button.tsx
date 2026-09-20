import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { useHover } from './useHover';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

type Destination =
  | { to: string; href?: never } // in-app route
  | { href: string; to?: never } // external URL, opened in a new tab
  | { to?: never; href?: never; onClick: () => void }; // plain action, no navigation

type ButtonProps = Destination & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

/** Router-aware button-styled link used for every call to action. */
export const Button = ({
  to,
  href,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  onClick,
}: ButtonProps) => {
  const { active, handlers } = useHover();

  const variants: Record<Variant, CSSProperties> = {
    primary: {
      backgroundColor: active ? colors.blueHover : colors.blue,
      color: colors.white,
      boxShadow: `0 6px 16px ${alpha(colors.blue, active ? 0.35 : 0.25)}`,
    },
    // Quieter than primary: outlined navy, fills in on hover.
    secondary: {
      backgroundColor: active ? colors.navy : colors.white,
      color: active ? colors.white : colors.navy,
      border: `1.5px solid ${colors.navy}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: active ? colors.blue : colors.text,
    },
  };

  const sizing: Record<Size, CSSProperties> = {
    md: { ...typography.styles.button, padding: '0.8rem 1.4rem' },
    lg: { ...typography.styles.buttonLarge, padding: '1.1rem 1.9rem' },
  };

  const shared = {
    onClick,
    ...handlers,
    className: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`,
    style: { ...sizing[size], ...variants[variant], outlineColor: colors.blue },
    children,
  };

  if (href !== undefined) return <a href={href} target="_blank" rel="noopener noreferrer" {...shared} />;
  if (to !== undefined) return <Link to={to} {...shared} />;
  return <button type="button" {...shared} />;
};
