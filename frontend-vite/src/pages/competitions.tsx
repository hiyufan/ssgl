import { useEffect, useState } from 'react';
import { competitionsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { StatusBadge, TypeBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { Competition } from '@/types';

const TYPE_ICONS: Record<string, string> = { hackathon: 'trophy', innovation: 'zap', research: 'target' };
const STATUS_ORDER = ['ongoing', 'published', 'completed', 'draft', 'cancelled'];

export function CompetitionsPage() {
  const role = useRole();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    competitionsAPI.list().then(res => setCompetitions(res.competitions || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = competitions.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (search && !c.title.includes(search)) return false;
    return true;
  }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const daysLeft = (dateStr: string) => Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="forge-page">
      <PageHeader
        title={role === 'student' ? '赛事大厅' : '赛事管理'}
        subtitle={`共 ${competitions.length} 个赛事，${filtered.length} 个符合筛选`}
        actions={role === 'admin' ? <button className="btn btn-primary"><Icon name="plus" size={13}/>创建赛事</button> : undefined}
      />

      {/* Filters */}
      <div className="anim-in" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {[
            { k: 'all', l: '全部' }, { k: 'ongoing', l: '进行中' }, { k: 'published', l: '报名中' },
            { k: 'completed', l: '已结束' }, { k: 'draft', l: '草稿' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: filter === k ? 'var(--surface)' : 'transparent',
              color: filter === k ? 'var(--amber)' : 'var(--text-3)',
              border: filter === k ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: filter === k ? 'var(--shadow-sm)' : 'none',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {[
            { k: 'all', l: '所有类型' }, { k: 'hackathon', l: 'Hackathon' },
            { k: 'innovation', l: '创新赛' }, { k: 'research', l: '研究赛' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setTypeFilter(k)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: typeFilter === k ? 'var(--surface)' : 'transparent',
              color: typeFilter === k ? 'var(--teal)' : 'var(--text-3)',
              border: typeFilter === k ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', flex: 1, maxWidth: 260 }}>
          <Icon name="search" size={13}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索赛事名称…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', width: '100%' }}/>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="trophy" title="没有符合条件的赛事" desc="尝试调整筛选条件"/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {filtered.map((comp, i) => {
            const regDays = daysLeft(comp.registration_deadline);
            const endDays = daysLeft(comp.end_date);
            const accent = { hackathon: 'var(--amber)', innovation: 'var(--purple)', research: 'var(--teal)' }[comp.type] || 'var(--amber)';
            const accentBg = { hackathon: 'var(--amber-bg)', innovation: 'var(--purple-bg)', research: 'var(--teal-bg)' }[comp.type] || 'var(--amber-bg)';

            return (
              <div key={comp.id} className={`card anim-in d${Math.min(i + 1, 8)}`}
                style={{ padding: 20, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
                    <Icon name={TYPE_ICONS[comp.type] || 'trophy'} size={18}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: 6 }}>{comp.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <StatusBadge status={comp.status}/>
                      <TypeBadge type={comp.type}/>
                    </div>
                  </div>
                </div>
                {comp.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {comp.description}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { icon: 'users', val: `${comp.teams_count || 0} 队`, sub: '已报名' },
                    { icon: 'zap', val: comp.prize || '—', sub: '奖金', color: 'var(--amber)' },
                    { icon: 'clock', val: comp.status === 'ongoing' ? `${endDays}天` : `${regDays}天`, sub: comp.status === 'ongoing' ? '截止倒计时' : '报名截止', color: (comp.status === 'ongoing' ? endDays : regDays) <= 7 ? 'var(--red)' : undefined },
                  ].map(({ icon, val, sub, color }) => (
                    <div key={icon} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'var(--surface-2)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="compass" size={12}/>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{comp.location || '线上'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {role === 'student' && comp.status === 'published' && (
                      <button className="btn btn-primary btn-sm">报名参加</button>
                    )}
                    {role === 'admin' && <button className="btn btn-outline btn-sm"><Icon name="edit" size={12}/></button>}
                    <button className="btn btn-ghost btn-sm">详情 <Icon name="right" size={12}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
