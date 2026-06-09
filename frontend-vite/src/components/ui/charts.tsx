import { useState, useEffect } from 'react';

/* ─── Counter Hook ────────────────────────────────────── */
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

/* ─── Score Gauge ─────────────────────────────────────── */
export function ScoreGauge({ score, label = '综合评分', size = 160 }: { score: number; label?: string; size?: number }) {
  const [animated, setAnimated] = useState(false);
  const displayed = useCounter(animated ? score : 0, 1500);
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  const color = score >= 80 ? 'var(--amber)' : score >= 60 ? 'var(--teal)' : 'var(--red)';
  const offset = animated ? circ * (1 - score / 100) : circ;

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-2)" strokeWidth="10"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{displayed}</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{label}</span>
      </div>
    </div>
  );
}

/* ─── Bar Chart (SVG) ─────────────────────────────────── */
export function BarChart({ data, color = 'var(--amber)', h = 160, label = true }: { data: { label: string; value: number }[]; color?: string; h?: number; label?: boolean }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 560, H = h;
  const barW = W / data.length * 0.5;
  const slot = W / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H + (label ? 24 : 4)}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const bH = animated ? Math.max(4, (d.value / max) * H) : 4;
        const x = i * slot + slot * 0.25;
        const y = H - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} fill={color} rx={4} opacity={0.85}
              style={{ transition: `y ${0.7 + i * 0.06}s cubic-bezier(0.16,1,0.3,1), height ${0.7 + i * 0.06}s cubic-bezier(0.16,1,0.3,1)` }}
            />
            {label && (
              <text x={x + barW / 2} y={H + 18} textAnchor="middle" fontSize={11} fill="var(--text-3)" fontFamily="var(--font-body)">
                {d.label}
              </text>
            )}
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={11} fill="var(--text-2)" fontFamily="var(--font-mono)">
                {animated ? d.value : ''}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Area Chart (SVG) ────────────────────────────────── */
export function AreaChart({ data, color = 'var(--teal)', h = 120 }: { data: { label: string; value: number }[]; color?: string; h?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);
  const W = 560, H = h, pad = 6;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (W - pad * 2) + pad,
    y: pad + (1 - d.value / max) * (H - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const totalLen = 600;

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {animated && <path d={area} fill="url(#areaGrad)"/>}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={totalLen} strokeDashoffset={animated ? 0 : totalLen}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={animated ? 4 : 0} fill={color}
          style={{ transition: `r 0.3s ease ${0.8 + i * 0.08}s` }}
        />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i].x} y={H + 16} textAnchor="middle" fontSize={11} fill="var(--text-3)" fontFamily="var(--font-body)">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

/* ─── Donut Chart ─────────────────────────────────────── */
export function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number }[]; size?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t); }, []);
  const total = segments.reduce((s, d) => s + d.value, 0);
  const r = size * 0.38, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;
  const colors = ['var(--amber)', 'var(--teal)', 'var(--purple)', 'var(--green)'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = animated ? circ * frac - 2 : 0;
          const offset = circ * (1 - cumulative);
          cumulative += frac;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i % colors.length]}
              strokeWidth="16" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: `stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s` }}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={r - 10} fill="var(--surface)"/>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }}/>
            <span style={{ color: 'var(--text-2)' }}>{seg.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 600, marginLeft: 'auto' }}>{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
