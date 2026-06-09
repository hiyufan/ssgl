export function Spinner({ size = 20, color = 'var(--amber)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', display: 'block', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5"/>
      <path d="M12 2a10 10 0 0110 10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
