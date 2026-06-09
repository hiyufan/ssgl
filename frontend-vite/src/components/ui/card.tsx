import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface2';
  children: ReactNode;
}

export function Card({ variant = 'default', className = '', style, children, ...props }: CardProps) {
  const cls = variant === 'surface2' ? 'card-2' : 'card';
  return (
    <div className={`${cls} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
