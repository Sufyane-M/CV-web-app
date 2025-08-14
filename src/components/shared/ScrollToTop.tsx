import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
  behavior?: ScrollBehavior;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ behavior = 'auto' }) => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {}

    window.scrollTo({ top: 0, left: 0, behavior });
    (document.getElementById('root') as HTMLElement | null)?.scrollTo?.({ top: 0, left: 0, behavior });
  }, [pathname, search, behavior]);

  return null;
};

export default ScrollToTop;


