import { useState, useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════
   Page Transition Wrapper
   Fade out old page → swap → fade in new page
   ═══════════════════════════════════════ */

interface PageTransitionProps {
  page: string;
  children: ReactNode;
}

export function PageTransition({ page, children }: PageTransitionProps) {
  const [displayPage, setDisplayPage] = useState(page);
  const [displayChildren, setDisplayChildren] = useState(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const childrenRef = useRef(children);

  // Always keep the latest children in the ref
  childrenRef.current = children;

  useEffect(() => {
    // Skip on initial mount
    if (page === displayPage && !isTransitioning.current) return;

    const container = containerRef.current;
    if (!container) {
      // No container yet, just swap immediately
      setDisplayPage(page);
      setDisplayChildren(childrenRef.current);
      return;
    }

    // If already transitioning, kill the current animation
    gsap.killTweensOf(container);

    isTransitioning.current = true;

    // Animate out
    gsap.to(container, {
      opacity: 0,
      y: -8,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        // Swap content
        setDisplayPage(page);
        setDisplayChildren(childrenRef.current);

        // Animate in on next frame
        requestAnimationFrame(() => {
          gsap.fromTo(container,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: 0.3,
              ease: 'power3.out',
              onComplete: () => { isTransitioning.current = false; },
            },
          );
        });
      },
    });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', willChange: 'transform, opacity' }}
    >
      {displayChildren}
    </div>
  );
}
