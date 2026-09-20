import type { CSSProperties, ReactNode } from 'react';

/** Centered max-width wrapper with the page's responsive side gutters. */
export const Container = ({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => (
  <div className={`mx-auto w-full max-w-[1120px] px-5 sm:px-8 ${className}`} style={style}>
    {children}
  </div>
);
