import type { ReactNode } from 'react';

/* ─── Avatar ──────────────────────────────────────────── */
const AVATAR_COLORS = ['#C8820A', '#0A8F7E', '#6D28D9', '#C0392B', '#15803D', '#0369A1'];
export function Avatar({ name = '?', size = 32, index = 0 }: { name?: string; size?: number; index?: number }) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: bg, color: '#fff' }}>
      {name[0]}
    </div>
  );
}

/* ─── Stars ───────────────────────────────────────────── */
export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < Math.round(value) ? 'var(--amber)' : 'var(--border-2)'} stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

/* ─── ProgressBar ─────────────────────────────────────── */
export function ProgressBar({ value, max = 100, color = 'var(--amber)', height = 6 }: {
  value: number; max?: number; color?: string; height?: number;
}) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

/* ─── PageHeader ──────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

/* ─── SectionLabel ────────────────────────────────────── */
export function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 3, height: 14, background: 'var(--amber)', borderRadius: 2 }}/>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>({count})</span>
      )}
    </div>
  );
}
