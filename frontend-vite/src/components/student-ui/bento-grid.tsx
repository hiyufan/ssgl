import type { ReactNode, CSSProperties } from 'react';

interface BentoGridProps {
  children: ReactNode;
  columns?: number;
  className?: string;
  style?: CSSProperties;
}

export function BentoGrid({ children, columns = 3, className = '', style }: BentoGridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: 'minmax(180px, auto)',
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
