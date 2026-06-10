import { useEffect, useState } from 'react';
import { evaluationsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { Icon } from '@/components/ui/icon';
import { Avatar, Stars, PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import type { StudentEvaluation } from '@/types';

export function EvaluationsPage() {
  const role = useRole();
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evaluationsAPI.list().then(res => setEvaluations(res.evaluations || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

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
        title={role === 'student' ? '评价导师' : '学生评价'}
        subtitle="多维度匿名评价，促进教学质量提升"
      />

      {/* Evaluation list */}
      <div className="card anim-in d3" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel label={`评价记录 (${evaluations.length})`}/>
          {role === 'student' && <button className="btn btn-primary btn-sm"><Icon name="plus" size={12}/> 提交评价</button>}
        </div>
        <div>
          {evaluations.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>暂无评价记录</div>
          ) : evaluations.map((ev, i) => (
            <div key={ev.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <Avatar name={ev.student?.name || '?'} size={32} index={i}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{ev.student?.name}</span>
                    <Icon name="right" size={12}/>
                    <span style={{ fontWeight: 600, color: 'var(--teal)' }}>{ev.teacher?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {ev.competition?.title || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    {[
                      { label: '教学', val: ev.teaching },
                      { label: '沟通', val: ev.communication },
                      { label: '及时性', val: ev.availability },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
                        <Stars value={val}/>
                      </div>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)', fontSize: 14 }}>{ev.overall}</span>
                      <Stars value={ev.overall}/>
                    </div>
                  </div>
                </div>
              </div>
              {ev.feedback && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginLeft: 44 }}>
                  {ev.feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
