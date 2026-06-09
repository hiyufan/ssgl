import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverable?: boolean;
  span?: number;       // grid column span
  rowSpan?: number;    // grid row span
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = '',
  style,
  hoverable = true,
  span,
  rowSpan,
  onClick,
}: GlassCardProps) {
  return (
    <div
      className={`s-glass-card ${hoverable ? 's-glass-hover' : ''} ${className}`}
      style={{
        background: 'var(--s-surface)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid var(--s-border)',
        borderRadius: 20,
        padding: 24,
        cursor: onClick ? 'pointer' : undefined,
        gridColumn: span ? `span ${span}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        transition: 'background 0.5s ease, border-color 0.5s ease',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
