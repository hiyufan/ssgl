import { useEffect, useState } from 'react';

interface WaveProgressProps {
  value: number;    // 0-100
  height?: number;
  label?: string;
}

export function WaveProgress({ value, height = 8, label }: WaveProgressProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t); }, []);

  const pct = Math.min(100, Math.max(0, value));

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
        }}>
          <span style={{ fontSize: 12, color: 'var(--s-text-2)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontFamily: 'var(--s-font-mono)', fontSize: 12, color: 'var(--s-text-1)', fontWeight: 600 }}>
            {pct}%
          </span>
        </div>
      )}
      <div style={{
        height,
        borderRadius: height,
        background: 'var(--s-border)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: animated ? `${pct}%` : '0%',
          borderRadius: height,
          background: 'linear-gradient(90deg, #A78BFA, #F0A832)',
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
        }}>
          {/* Wave head effect */}
          <svg
            viewBox="0 0 40 8"
            style={{
              position: 'absolute',
              right: -20,
              top: 0,
              width: 40,
              height: height,
              opacity: animated ? 1 : 0,
              transition: 'opacity 0.5s ease 1s',
            }}
            preserveAspectRatio="none"
          >
            <path
              d="M0,4 Q10,0 20,4 Q30,8 40,4"
              fill="none"
              stroke="rgba(240,168,50,0.4)"
              strokeWidth="2"
              style={{ animation: 's-wave 2s ease-in-out infinite' }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
