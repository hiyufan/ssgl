import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';

/* ═══════════════════════════════════════
   GSAP Hooks — Phase 1 Animation System
   ═══════════════════════════════════════ */

/**
 * Stagger children entrance animation.
 * Targets all direct children of the ref element.
 */
export function useStaggerIn(
  ref: RefObject<HTMLElement | null>,
  options: gsap.TweenVars & { selector?: string } = {},
) {
  const { selector, ...vars } = options;
  const varsKey = JSON.stringify(vars);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = selector ? el.querySelectorAll(selector) : el.children;
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'all',
        ...vars,
      });
    }, el);

    return () => ctx.revert();
  }, [selector, varsKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Split text into individual characters and animate them in.
 * Manual implementation (GSAP SplitText is a paid plugin).
 */
export function useSplitText(
  ref: RefObject<HTMLElement | null>,
  options: { delay?: number; duration?: number; stagger?: number; y?: number } = {},
) {
  const { delay = 0, duration = 0.7, stagger = 0.03, y = 30 } = options;
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;
    hasAnimated.current = true;

    const text = el.textContent || '';
    el.textContent = '';
    el.style.visibility = 'visible';

    // Split into chars, preserving spaces
    const chars: HTMLSpanElement[] = [];
    for (const char of text) {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? ' ' : char;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, opacity';
      el.appendChild(span);
      chars.push(span);
    }

    gsap.from(chars, {
      opacity: 0,
      y,
      duration,
      stagger,
      delay,
      ease: 'power3.out',
      onComplete: () => {
        // Clean up: restore plain text
        el.textContent = text;
      },
    });
  }, [delay, duration, stagger, y]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Magnetic hover effect — element follows cursor within its bounds.
 * Returns a ref to attach to the target element.
 */
export function useMagneticHover(
  ref: RefObject<HTMLElement | null>,
  options: { strength?: number; radius?: number; ease?: string } = {},
) {
  const { strength = 0.35, radius = 1, ease = 'elastic.out(1, 0.4)' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(rect.width, rect.height) * radius;

      if (dist < maxDist) {
        const factor = 1 - dist / maxDist;
        gsap.to(el, {
          x: dx * strength * factor,
          y: dy * strength * factor,
          duration: 0.4,
          ease,
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.3)',
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, radius, ease]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Animated number counter using GSAP.
 * Replaces the manual requestAnimationFrame approach.
 */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  target: number,
  options: { duration?: number; decimals?: number; delay?: number } = {},
) {
  const { duration = 1.2, decimals = 0, delay = 0 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || !target) return;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = decimals > 0
          ? obj.val.toFixed(decimals)
          : Math.round(obj.val).toString();
      },
    });
  }, [target, duration, decimals, delay]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Timed stagger entrance — plays once on mount with a container ref.
 * Designed for dashboard cards that need coordinated entry.
 */
export function useStaggerTimeline(
  ref: RefObject<HTMLElement | null>,
  options: { delay?: number } = {},
) {
  const { delay = 0.1 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cards = el.querySelectorAll('[data-animate]');
    if (!cards.length) return;

    const tl = gsap.timeline({ delay });

    cards.forEach((card, i) => {
      const anim = card.getAttribute('data-animate') || 'fade-up';
      const staggerDelay = i * 0.08;

      const from: gsap.TweenVars = { opacity: 0, duration: 0.6, ease: 'power3.out' };

      switch (anim) {
        case 'fade-up':
          from.y = 30;
          break;
        case 'fade-left':
          from.x = -30;
          break;
        case 'fade-right':
          from.x = 30;
          break;
        case 'fade-scale':
          from.scale = 0.92;
          break;
      }

      tl.from(card, from, staggerDelay);
    });

    return () => { tl.kill(); };
  }, [delay]); // eslint-disable-line react-hooks/exhaustive-deps
}
