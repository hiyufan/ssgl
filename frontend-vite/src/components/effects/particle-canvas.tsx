import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════
   Particle Network — Login Background
   Lightweight canvas animation (~150 particles)
   ═══════════════════════════════════════ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
}

interface ParticleCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  /** Number of particles (default 120) */
  count?: number;
  /** Connection distance in px (default 150) */
  connectDist?: number;
  /** Mouse influence radius (default 200) */
  mouseRadius?: number;
}

export function ParticleCanvas({
  className,
  style,
  count = 120,
  connectDist = 150,
  mouseRadius = 200,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = parentRef.current;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;
    const particles: Particle[] = [];

    // Detect theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    function resize() {
      w = parent!.clientWidth;
      h = parent!.clientHeight;
      canvas!.width = w * devicePixelRatio;
      canvas!.height = h * devicePixelRatio;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(devicePixelRatio, devicePixelRatio);
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const dotColor = isDark ? '240, 236, 230' : '26, 26, 26';
      const lineColor = isDark ? '212, 168, 67' : '184, 134, 11';

      // Update & draw particles
      for (const p of particles) {
        // Mouse repel/attract
        const ddx = mx - p.x;
        const ddy = my - p.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < mouseRadius && dist > 0) {
          const force = (1 - dist / mouseRadius) * 0.02;
          p.vx += ddx * force;
          p.vy += ddy * force;
        }

        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${dotColor}, ${p.opacity})`;
        ctx!.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < connectDist) {
            const alpha = (1 - d / connectDist) * 0.15;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = parent!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function handleMouseLeave() {
      mouseRef.current = { x: -1000, y: -1000 };
    }

    resize();
    initParticles();
    draw();

    window.addEventListener('resize', () => { resize(); initParticles(); });
    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    // Watch for theme changes
    const observer = new MutationObserver(() => {});
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, [count, connectDist, mouseRadius]);

  // Wrapper div listens for mouse events; canvas is pointer-events: none
  return (
    <div ref={parentRef} className={className} style={{ position: 'absolute', inset: 0, ...style }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}
