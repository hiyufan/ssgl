import { useState, useEffect } from 'react';
import { Icon } from './icon';

function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) { rafId = requestAnimationFrame(tick); }
      else { setVal(target); }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return val;
}

export function StatCard({ label, value, icon, color = 'var(--amber)', delta, sub, mono = true }: {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  delta?: number;
  sub?: string;
  mono?: boolean;
}) {
  const num = typeof value === 'number' ? useCounter(value) : null;
  return (
    <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color.replace(')', ',0.1)').replace('var', 'rgba').replace('rgb', 'rgb'), display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon name={icon} size={15}/>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {num !== null ? num : value}
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
