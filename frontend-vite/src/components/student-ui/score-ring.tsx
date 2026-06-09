import { useState, useEffect } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 120, label = 'AI 评分' }: ScoreRingProps) {
  const [animated, setAnimated] = useState(false);
  const [displayed, setDisplayed] = useState(0);

  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const offset = animated ? circ * (1 - score / 100) : circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!animated) return;
    const start = performance.now();
    const duration = 1200;
    let rafId: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(eased * score));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animated, score]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`s-ring-grad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#F0A832" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="currentColor" strokeWidth="8" opacity={0.08} />
        {/* Fill */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={`url(#s-ring-grad-${score})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{
          fontFamily: 'var(--s-font-mono)',
          fontSize: size * 0.24,
          fontWeight: 700,
          color: 'var(--s-text-1)',
          lineHeight: 1,
        }}>
          {displayed}
        </span>
        <span style={{
          fontFamily: 'var(--s-font-body)',
          fontSize: Math.max(9, size * 0.08),
          color: 'var(--s-text-3)',
          fontWeight: 600,
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}
