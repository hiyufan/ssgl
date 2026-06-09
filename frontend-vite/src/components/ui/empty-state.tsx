import { Icon } from './icon';

export function EmptyState({ icon = 'search', title = '暂无数据', desc }: {
  icon?: string;
  title?: string;
  desc?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ opacity: 0.4 }}><Icon name={icon} size={40}/></div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>{desc}</div>}
    </div>
  );
}
