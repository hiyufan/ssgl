import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════
   Custom Cursor — snappy, minimal, visible
   ═══════════════════════════════════════ */

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('ontouchstart' in window) return;

    const outer = outerRef.current;
    const dot = dotRef.current;
    if (!outer || !dot) return;

    document.body.style.cursor = 'none';
    document.body.classList.add('custom-cursor-active');

    let isHovering = false;
    let mouseInWindow = true;

    const onMove = (e: MouseEvent) => {
      mouseInWindow = true;
      // Always ensure visible on move
      if (outer.style.opacity !== '1') gsap.set(outer, { opacity: 1 });
      if (dot.style.opacity !== '1') gsap.set(dot, { opacity: 1 });
      // Dot: instant
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      // Outer: fast follow
      gsap.to(outer, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: 'power3.out',
      });
    };

    const onEnterInteractive = () => {
      if (isHovering) return;
      isHovering = true;
      gsap.to(outer, {
        scale: 1.6,
        borderColor: 'var(--amber)',
        duration: 0.2,
        ease: 'power2.out',
      });
      gsap.to(dot, { scale: 0, duration: 0.15 });
    };

    const onLeaveInteractive = () => {
      if (!isHovering) return;
      isHovering = false;
      gsap.to(outer, {
        scale: 1,
        borderColor: 'var(--text-2)',
        duration: 0.2,
        ease: 'power2.out',
      });
      gsap.to(dot, { scale: 1, duration: 0.15, ease: 'back.out(2)' });
    };

    const checkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest(
        'button, a, input, [role="button"], .btn, .nav-item, [data-cursor-hover]'
      );
      if (isInteractive) onEnterInteractive();
      else onLeaveInteractive();
    };

    const onLeaveWindow = () => {
      mouseInWindow = false;
      gsap.to([outer, dot], { opacity: 0, duration: 0.15 });
    };

    const onEnterWindow = () => {
      mouseInWindow = true;
      gsap.to([outer, dot], { opacity: 1, duration: 0.15 });
    };

    // Safety: if any click/focus happens, ensure cursor is visible
    const ensureVisible = () => {
      if (!mouseInWindow) return;
      gsap.set(outer, { opacity: 1 });
      gsap.set(dot, { opacity: 1 });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', checkHover);
    document.addEventListener('mouseleave', onLeaveWindow);
    document.addEventListener('mouseenter', onEnterWindow);
    document.addEventListener('pointerdown', ensureVisible);
    document.addEventListener('focusin', ensureVisible);

    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('custom-cursor-active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', checkHover);
      document.removeEventListener('mouseleave', onLeaveWindow);
      document.removeEventListener('mouseenter', onEnterWindow);
      document.removeEventListener('pointerdown', ensureVisible);
      document.removeEventListener('focusin', ensureVisible);
      gsap.killTweensOf([outer, dot]);
    };
  }, []);

  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <>
      {/* Outer ring */}
      <div
        ref={outerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '1.5px solid var(--text-2)',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          willChange: 'transform',
        }}
      />
      {/* Center dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'var(--amber)',
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
