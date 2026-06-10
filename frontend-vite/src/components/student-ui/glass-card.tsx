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
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        border: '1px solid var(--s-border)',
        borderRadius: 10,
        padding: 24,
        cursor: onClick ? 'pointer' : undefined,
        gridColumn: span ? `span ${span}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
