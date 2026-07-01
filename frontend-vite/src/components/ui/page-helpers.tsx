import type { ReactNode } from 'react';
import { Icon } from './icon';
export { Spinner } from './spinner';

/* ─── Avatar ──────────────────────────────────────────── */
const AVATAR_COLORS = ['#b8860b', '#2a7a6d', '#5a3d8a', '#a63d2f', '#3a7d44', '#a85e10'];
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
export function ProgressBar({ value, max = 100, color = 'var(--amber)', height = 4 }: {
  value: number; max?: number; color?: string; height?: number;
}) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

/* ─── PageHeader — Editorial serif style ───────────────── */
export function PageHeader({ title, subtitle, actions, icon }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28, fontWeight: 900,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {icon && <Icon name={icon} size={24} />}
          <span>{title}</span>
        </h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, fontWeight: 400 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

/* ─── SectionLabel — Editorial uppercase label ────────── */
export function SectionLabel({ label, value, count, icon, children }: {
  label?: string;
  value?: string;
  count?: number;
  icon?: string;
  children?: ReactNode;
}) {
  const text = label ?? value ?? children;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      {icon && <Icon name={icon} size={13} />}
      <span style={{
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--text-3)',
      }}>{text}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-3)', opacity: 0.6,
        }}>({count})</span>
      )}
    </div>
  );
}
