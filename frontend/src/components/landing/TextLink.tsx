import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

/**
 * Text link with token-based hover color. Paths starting with "/" (including "/#section")
 * navigate in-app; anything else (mailto:, external URLs) is a plain anchor.
 */
export const TextLink = ({ href, children, external = false, onClick, className = '' }: TextLinkProps) => {
  const { active, handlers } = useHover();
  const shared = {
    onClick,
    ...handlers,
    className: `whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`,
    style: {
      ...typography.styles.body,
      fontWeight: typography.weights.semibold,
      color: active ? colors.blue : colors.text,
      outlineColor: colors.blue,
    },
    children,
  };

  if (href.startsWith('/')) return <Link to={href} {...shared} />;
  return <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...shared} />;
};

/** Same look as TextLink, for actions that don't navigate (e.g. opening a dialog). */
export const TextButton = ({ onClick, children, className = '' }: { onClick: () => void; children: ReactNode; className?: string }) => {
  const { active, handlers } = useHover();
  return (
    <button
      type="button"
      onClick={onClick}
      {...handlers}
      className={`whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}
      style={{
        ...typography.styles.body,
        fontWeight: typography.weights.semibold,
        color: active ? colors.blue : colors.text,
        outlineColor: colors.blue,
      }}
    >
      {children}
    </button>
  );
};
