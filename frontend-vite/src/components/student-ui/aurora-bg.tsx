import { memo } from 'react';
import { useAppStore } from '@/stores/app';

export const AuroraBg = memo(function AuroraBg() {
  const { theme } = useAppStore();
  const isLight = theme === 'light';

  const bg = isLight ? '#F8F7FF' : '#0A0B14';
  const o1 = isLight ? 0.12 : 0.25;
  const o2 = isLight ? 0.08 : 0.15;
  const o3 = isLight ? 0.06 : 0.12;
  const noise = isLight ? 0.15 : 0.4;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      background: bg,
      overflow: 'hidden',
      pointerEvents: 'none',
      transition: 'background 0.5s ease',
    }}>
      {/* Blob 1 — purple, top-left */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: 650,
        height: 650,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(167,139,250,${o1}) 0%, transparent 70%)`,
        filter: 'blur(120px)',
        animation: 's-aurora-drift-1 25s ease-in-out infinite',
        transition: 'background 0.5s ease',
      }} />
      {/* Blob 2 — amber, bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: 550,
        height: 550,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(240,168,50,${o2}) 0%, transparent 70%)`,
        filter: 'blur(120px)',
        animation: 's-aurora-drift-2 30s ease-in-out infinite',
        transition: 'background 0.5s ease',
      }} />
      {/* Blob 3 — deep purple, center */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '40%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(139,92,246,${o3}) 0%, transparent 70%)`,
        filter: 'blur(120px)',
        animation: 's-aurora-drift-3 20s ease-in-out infinite',
        transition: 'background 0.5s ease',
      }} />
      {/* Subtle noise overlay for texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
        opacity: noise,
        transition: 'opacity 0.5s ease',
      }} />
    </div>
  );
});
