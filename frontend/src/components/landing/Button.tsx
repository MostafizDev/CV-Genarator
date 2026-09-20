import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { alpha, colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { useHover } from './useHover';

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Router-aware button-styled link used for every call to action. */
export const Button = ({ to, variant = 'primary', size = 'md', children, className = '', onClick }: ButtonProps) => {
  const { active, handlers } = useHover();

  const variants: Record<Variant, CSSProperties> = {
    primary: {
      backgroundColor: active ? colors.blueHover : colors.blue,
      color: colors.white,
      boxShadow: `0 6px 16px ${alpha(colors.blue, active ? 0.35 : 0.25)}`,
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

  return (
    <Link
      to={to}
      onClick={onClick}
      {...handlers}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{ ...sizing[size], ...variants[variant], outlineColor: colors.blue }}
    >
      {children}
    </Link>
  );
};
