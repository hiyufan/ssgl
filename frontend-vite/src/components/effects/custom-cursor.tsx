import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════
   Custom Cursor — follows mouse, grows on hover
   Hides on touch devices
   ═══════════════════════════════════════ */

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hide on touch devices
    if ('ontouchstart' in window) return;

    const outer = outerRef.current;
    const dot = dotRef.current;
    if (!outer || !dot) return;

    // Hide default cursor
    document.body.style.cursor = 'none';
    document.body.classList.add('custom-cursor-active');

    const pos = { x: 0, y: 0 };
    let isHovering = false;

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;

      // Dot follows immediately
      gsap.set(dot, { x: pos.x, y: pos.y });

      // Outer ring follows with delay
      gsap.to(outer, {
        x: pos.x,
        y: pos.y,
        duration: 0.35,
        ease: 'power2.out',
      });
    };

    const onEnterInteractive = () => {
      if (isHovering) return;
      isHovering = true;
      gsap.to(outer, {
        scale: 2.2,
        opacity: 0.5,
        borderColor: 'var(--amber)',
        duration: 0.3,
        ease: 'back.out(2)',
      });
      gsap.to(dot, {
        scale: 0,
        duration: 0.2,
      });
    };

    const onLeaveInteractive = () => {
      if (!isHovering) return;
      isHovering = false;
      gsap.to(outer, {
        scale: 1,
        opacity: 1,
        borderColor: 'var(--text-3)',
        duration: 0.4,
        ease: 'elastic.out(1, 0.4)',
      });
      gsap.to(dot, {
        scale: 1,
        duration: 0.3,
        ease: 'back.out(2)',
      });
    };

    // Delegate hover detection
    const checkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, a, input, [role="button"], .btn, .nav-item, .card-magnetic, [data-cursor-hover]');
      if (isInteractive) onEnterInteractive();
      else onLeaveInteractive();
    };

    const onLeaveWindow = () => {
      gsap.to([outer, dot], { opacity: 0, duration: 0.2 });
    };
    const onEnterWindow = () => {
      gsap.to([outer, dot], { opacity: 1, duration: 0.2 });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', checkHover);
    document.addEventListener('mouseleave', onLeaveWindow);
    document.addEventListener('mouseenter', onEnterWindow);

    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('custom-cursor-active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', checkHover);
      document.removeEventListener('mouseleave', onLeaveWindow);
      document.removeEventListener('mouseenter', onEnterWindow);
      gsap.killTweensOf([outer, dot]);
    };
  }, []);

  // Don't render on touch
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <>
      {/* Outer ring — follows with delay */}
      <div
        ref={outerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1.5px solid var(--text-3)',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          willChange: 'transform',
          mixBlendMode: 'difference',
        }}
      />
      {/* Center dot — follows immediately */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'var(--text)',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          willChange: 'transform',
        }}
      />
    </>
  );
}
