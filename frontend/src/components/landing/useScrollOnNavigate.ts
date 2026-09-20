import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-side navigation keeps the previous scroll position, so pages that share this
 * layout call this to start at the top -- or at the #section named in the URL.
 */
export function useScrollOnNavigate() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash, key]);
}
