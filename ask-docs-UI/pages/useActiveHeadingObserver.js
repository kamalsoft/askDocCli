import { useState, useEffect, useRef } from 'react';

/**
 * Monitors headings within a scroll container and returns the ID of the active one.
 * @param {React.RefObject} containerRef - The scrollable container ref.
 * @param {Array} headings - List of heading objects containing { id }.
 */
const useActiveHeadingObserver = (containerRef, headings) => {
  const [activeId, setActiveId] = useState('');
  const observer = useRef(null);

  useEffect(() => {
    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    observer.current = new IntersectionObserver(handleIntersect, {
      root: containerRef.current || null,
      rootMargin: '0px 0px -80% 0px', // Triggers when heading is in the top 20% of the view
      threshold: 1.0,
    });

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.current.observe(el);
    });

    return () => observer.current?.disconnect();
  }, [containerRef, headings]);

  return activeId;
};

export default useActiveHeadingObserver;