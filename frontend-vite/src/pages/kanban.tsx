import { useEffect, useState } from 'react';
import { statsAPI } from '@/services/api';
import { PageHeader, SectionLabel, ProgressBar } from '@/components/ui/page-helpers';
import { Icon } from '@/components/ui/icon';

/* ─── Types ──────────────────────────────────────────── */
interface CompetitionCard {
  id: number;
  title: string;
  type: string;
  team_count: number;
  student_count: number;
  preplan_count: number;
  award_count: number;
  progress: number;
  start_date: string;
  end_date: string;
  days_remaining: number;
}

interface KanbanColumn {
  status: string;
  label: string;
  count: number;
  competitions: CompetitionCard[];
}

interface KanbanData {
  columns: KanbanColumn[];
}

/* ─── Constants ──────────────────────────────────────── */
const TYPE_LABELS: Record<string, string> = {
  hackathon: '黑客松',
  innovation: '创新赛',
  research: '科研赛',
  business_plan: '商业计划',
  ai_innovation: 'AI创新',
  data_science: '数据科学',
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hackathon:     { bg: 'rgba(45,212,191,0.15)',  text: 'var(--teal, #2dd4bf)',   border: 'rgba(45,212,191,0.4)' },
  innovation:    { bg: 'rgba(96,165,250,0.15)',   text: 'var(--blue, #60a5fa)',   border: 'rgba(96,165,250,0.4)' },
  research:      { bg: 'rgba(167,139,250,0.15)',  text: 'var(--purple, #a78bfa)', border: 'rgba(167,139,250,0.4)' },
  business_plan: { bg: 'rgba(52,211,153,0.15)',   text: 'var(--green, #34d399)',  border: 'rgba(52,211,153,0.4)' },
  ai_innovation: { bg: 'rgba(251,113,133,0.15)',  text: 'var(--red, #fb7185)',    border: 'rgba(251,113,133,0.4)' },
  data_science:  { bg: 'rgba(251,146,60,0.15)',   text: 'var(--orange, #fb923c)', border: 'rgba(251,146,60,0.4)' },
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-3)',
  published: 'var(--teal)',
  ongoing: 'var(--green)',
  completed: 'var(--amber)',
};

const STATUS_ICONS: Record<string, string> = {
  draft: 'file',
  published: 'send',
  ongoing: 'target',
  completed: 'check',
};

/* ─── Sub-components ─────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.hackathon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
      padding: '2px 8px', borderRadius: 4,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: 'var(--text-3)',
    }}>
      <Icon name={icon} size={12} />
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)' }}>{value}</span>
    </div>
  );
}

function CompetitionCardComponent({ card, index }: { card: CompetitionCard; index: number }) {
  const daysLabel = card.days_remaining > 0
    ? `剩余 ${card.days_remaining} 天`
    : card.days_remaining === 0
      ? '今日截止'
      : `已过 ${Math.abs(card.days_remaining)} 天`;

  return (
    <div
      className="anim-in"
      style={{
        animationDelay: `${index * 60}ms`,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--teal)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Title + type */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {card.title}
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <TypeBadge type={card.type} />
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px',
        marginBottom: 10,
      }}>
        <StatPill icon="users" label="团队" value={card.team_count} />
        <StatPill icon="users" label="学生" value={card.student_count} />
        <StatPill icon="file" label="预计划" value={card.preplan_count} />
        <StatPill icon="gift" label="获奖" value={card.award_count} />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>进度</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-2)' }}>{card.progress}%</span>
        </div>
        <ProgressBar value={card.progress} color={STATUS_COLORS[card.status] || 'var(--teal)'} height={3} />
      </div>

      {/* Dates + days remaining */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 8, borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
          <Icon name="calendar" size={11} />
          <span>{card.start_date} — {card.end_date}</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: card.days_remaining > 0 ? 'var(--green)' : card.days_remaining === 0 ? 'var(--amber)' : 'var(--red)',
        }}>
          {daysLabel}
        </span>
      </div>
    </div>
  );
}

function KanbanColumnComponent({ column, colIndex }: { column: KanbanColumn; colIndex: number }) {
  return (
    <div
      className="anim-in"
      style={{
        animationDelay: `${colIndex * 100}ms`,
        flex: 1,
        minWidth: 280,
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: `${STATUS_COLORS[column.status] || 'var(--teal)'}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={STATUS_ICONS[column.status] || 'file'} size={13} />
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text)',
          letterSpacing: '0.02em',
        }}>
          {column.label}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
          color: 'var(--text-3)',
          background: 'var(--surface)',
          padding: '1px 7px', borderRadius: 4,
          border: '1px solid var(--border)',
        }}>
          {column.count}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: 10, overflowY: 'auto' }}>
        {column.competitions.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '32px 16px', color: 'var(--text-3)', gap: 8,
          }}>
            <Icon name="file" size={20} />
            <span style={{ fontSize: 12 }}>暂无赛事</span>
          </div>
        ) : (
          column.competitions.map((card, i) => (
            <CompetitionCardComponent key={card.id} card={card} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export function KanbanPage() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsAPI.kanban()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="anim-in" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <Icon name="kanban" size={28} />
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>加载看板数据…</span>
        </div>
      </div>
    );
  }

  const totalCompetitions = data?.columns.reduce((sum, c) => sum + c.count, 0) ?? 0;

  return (
    <div style={{ padding: '0 0 32px' }}>
      <PageHeader
        title="看板总览"
        subtitle={`共 ${totalCompetitions} 项赛事分布在 ${data?.columns.length ?? 4} 个阶段`}
      />

      {/* Column summary bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap',
      }}>
        {data?.columns.map((col, i) => (
          <div
            key={col.status}
            className="anim-in"
            style={{
              animationDelay: `${i * 80}ms`,
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: 2,
              background: STATUS_COLORS[col.status] || 'var(--teal)',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{col.label}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
              color: 'var(--text)',
            }}>
              {col.count}
            </span>
          </div>
        ))}
      </div>

      <SectionLabel label="赛事看板" count={totalCompetitions} />

      {/* Kanban columns */}
      <div style={{
        display: 'flex', gap: 14,
        overflowX: 'auto',
        paddingBottom: 8,
      }}>
        {data?.columns.map((col, i) => (
          <KanbanColumnComponent key={col.status} column={col} colIndex={i} />
        ))}
      </div>
    </div>
  );
}
