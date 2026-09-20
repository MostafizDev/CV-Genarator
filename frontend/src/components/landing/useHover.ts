import { useState } from 'react';

/** Tracks hover/focus so components can style interactive states from the color tokens. */
export function useHover() {
  const [active, setActive] = useState(false);
  return {
    active,
    handlers: {
      onMouseEnter: () => setActive(true),
      onMouseLeave: () => setActive(false),
      onFocus: () => setActive(true),
      onBlur: () => setActive(false),
    },
  };
}
