import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'teal' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconRight,
  full,
  children,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const sizeClass = { sm: 'btn-sm', md: '', lg: 'btn-lg', xl: 'btn-xl' }[size];
  const variantClass = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    teal: 'btn-teal',
    danger: 'btn-danger',
  }[variant];

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      style={{ ...(full ? { width: '100%' } : {}), ...style }}
      {...props}
    >
      {loading ? (
        <svg width={14} height={14} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', display: 'block', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.3}/>
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ) : icon ? (
        <span style={{ flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
      {iconRight && <span style={{ flexShrink: 0 }}>{iconRight}</span>}
    </button>
  );
}
