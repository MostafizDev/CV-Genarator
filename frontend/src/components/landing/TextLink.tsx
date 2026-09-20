import type { ReactNode } from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { useHover } from './useHover';

interface TextLinkProps {
  href: string;
  children: ReactNode;
  external?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Plain anchor (in-page #section, mailto or external) with token-based hover color. */
export const TextLink = ({ href, children, external = false, onClick, className = '' }: TextLinkProps) => {
  const { active, handlers } = useHover();
  return (
    <a
      href={href}
      onClick={onClick}
      {...handlers}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}
      style={{
        ...typography.styles.body,
        fontWeight: typography.weights.semibold,
        color: active ? colors.blue : colors.text,
        outlineColor: colors.blue,
      }}
    >
      {children}
    </a>
  );
};
