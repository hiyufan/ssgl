import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Icon } from './icon';

export function StatCard({ label, value, icon, color = 'var(--amber)', delta, sub, mono = true }: {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  delta?: number;
  sub?: string;
  mono?: boolean;
}) {
  const numRef = useRef<HTMLSpanElement>(null);

  // GSAP countUp animation
  useEffect(() => {
    if (typeof value !== 'number' || !numRef.current) return;
    const el = numRef.current;

    // Set initial
    el.textContent = '0';

    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.2,
      delay: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = Math.round(obj.val).toString();
      },
    });
  }, [value]);

  return (
    <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon name={icon} size={15}/>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          ref={numRef}
          style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}
        >
          {typeof value === 'number' ? 0 : value}
        </span>
        {delta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</span>}
    </div>
  );
}
