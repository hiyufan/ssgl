import { useEffect, useState } from 'react';
import { competitionsAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { StatusBadge, TypeBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { Competition } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormModal, Field, TextInput, TextArea, NumberInput, Select, DateTimeInput } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import { TeamForm } from '@/pages/teams';

const TYPE_ICONS: Record<string, string> = { hackathon: 'trophy', innovation: 'zap', research: 'target' };
const STATUS_ORDER = ['ongoing', 'published', 'completed', 'draft', 'cancelled'];

const TYPE_OPTIONS = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'innovation', label: '创新赛' },
  { value: 'research', label: '研究赛' },
];

type CompFormState = {
  title: string; type: string; description: string;
  max_team_size: string; min_team_size: string;
  registration_deadline: string; start_date: string; end_date: string;
  location: string; prize: string; tags: string;
};

function emptyCompForm(): CompFormState {
  return { title: '', type: 'hackathon', description: '', max_team_size: '4', min_team_size: '1', registration_deadline: '', start_date: '', end_date: '', location: '', prize: '', tags: '' };
}

function CompetitionForm({ onClose, initial, onSaved, onDeleted }: {
  onClose: () => void;
  initial: Competition | null;
  onSaved: (comp: Competition, isNew: boolean) => void;
  onDeleted: (id: number) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<CompFormState>(() => initial ? {
    title: initial.title, type: initial.type, description: initial.description || '',
    max_team_size: String(initial.max_team_size || 4), min_team_size: String(initial.min_team_size || 1),
    registration_deadline: initial.registration_deadline || '', start_date: initial.start_date || '', end_date: initial.end_date || '',
    location: initial.location || '', prize: initial.prize || '', tags: initial.tags || '',
  } : emptyCompForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CompFormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { setError('请填写赛事名称'); return; }
    if (!form.start_date || !form.end_date) { setError('请填写开始与结束时间'); return; }
    setSubmitting(true); setError(null);
    const payload = {
      title: form.title.trim(),
      type: form.type as Competition['type'],
      description: form.description,
      max_team_size: Number(form.max_team_size) || 1,
      min_team_size: Number(form.min_team_size) || 1,
      registration_deadline: form.registration_deadline,
      start_date: form.start_date,
      end_date: form.end_date,
      location: form.location,
      prize: form.prize,
      tags: form.tags,
    };
    try {
      const res = isEdit
        ? await competitionsAPI.update(initial!.id, payload)
        : await competitionsAPI.create(payload);
      toast.success(isEdit ? '赛事已更新' : '赛事已创建（草稿）');
      onSaved(res.competition, !isEdit);
      onClose();
    } catch (err) {
      setError(getApiError(err, isEdit ? '更新失败' : '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title={isEdit ? '编辑赛事' : '创建赛事'} onSubmit={submit} submitting={submitting} error={error} submitLabel={isEdit ? '保存' : '创建'} width={620}>
      <Field label="赛事名称" required><TextInput value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="例如：2026 校园创新马拉松" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="类型" required><Select value={form.type} onChange={set('type')} options={TYPE_OPTIONS} /></Field>
        <Field label="最小队伍人数" required><NumberInput min={1} value={form.min_team_size} onChange={(e) => set('min_team_size')(e.target.value)} /></Field>
        <Field label="最大队伍人数" required><NumberInput min={1} value={form.max_team_size} onChange={(e) => set('max_team_size')(e.target.value)} /></Field>
      </div>
      <Field label="赛事简介"><TextArea value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="一句话介绍赛事主题与目标" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="报名截止"><DateTimeInput value={form.registration_deadline} onChange={set('registration_deadline')} /></Field>
        <Field label="开始时间" required><DateTimeInput value={form.start_date} onChange={set('start_date')} /></Field>
        <Field label="结束时间" required><DateTimeInput value={form.end_date} onChange={set('end_date')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="地点"><TextInput value={form.location} onChange={(e) => set('location')(e.target.value)} placeholder="线上 / 教学楼…" /></Field>
        <Field label="奖金"><TextInput value={form.prize} onChange={(e) => set('prize')(e.target.value)} placeholder="如 ¥50,000" /></Field>
        <Field label="标签"><TextInput value={form.tags} onChange={(e) => set('tags')(e.target.value)} placeholder="逗号分隔" /></Field>
      </div>
      {isEdit && (
        <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <Button type="button" variant="danger" size="sm" onClick={async () => {
            if (!confirm(`确认删除赛事「${initial!.title}」？此操作不可撤销。`)) return;
            try {
              await competitionsAPI.delete(initial!.id);
              toast.success('赛事已删除');
              onDeleted(initial!.id);
              onClose();
            } catch (err) {
              toast.error(getApiError(err, '删除失败'));
            }
          }}>删除赛事</Button>
        </div>
      )}
    </FormModal>
  );
}

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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Competition | null>(null);
  const [registerComp, setRegisterComp] = useState<Competition | null>(null);
  const canManage = role === 'teacher' || role === 'admin';

  const handleSaved = (comp: Competition, isNew: boolean) =>
    setCompetitions((prev) => (isNew ? [comp, ...prev] : prev.map((c) => (c.id === comp.id ? comp : c))));
  const handleDeleted = (id: number) =>
    setCompetitions((prev) => prev.filter((c) => c.id !== id));

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (comp: Competition) => { setEditing(comp); setFormOpen(true); };

  const openDetail = async (comp: Competition) => {
    setDetailId(comp.id); setDetail(comp);
    try {
      const res = await competitionsAPI.get(comp.id);
      setDetail(res.competition);
    } catch { /* 保底用列表项数据 */ }
  };

  const publish = async (comp: Competition) => {
    try {
      const res = await competitionsAPI.publish(comp.id);
      toast.success('赛事已发布');
      handleSaved(res.competition, false);
    } catch (err) {
      toast.error(getApiError(err, '发布失败'));
    }
  };

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
        actions={canManage ? <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={openCreate}>创建赛事</Button> : undefined}
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
                      <Button variant="primary" size="sm" onClick={() => setRegisterComp(comp)}>报名参加</Button>
                    )}
                    {canManage && comp.status === 'draft' && (
                      <Button variant="teal" size="sm" onClick={() => publish(comp)}>发布</Button>
                    )}
                    {canManage && (
                      <Button variant="outline" size="sm" icon={<Icon name="edit" size={12}/>} onClick={() => openEdit(comp)} />
                    )}
                    <Button variant="ghost" size="sm" iconRight={<Icon name="right" size={12}/>} onClick={() => openDetail(comp)}>详情</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <CompetitionForm onClose={() => setFormOpen(false)} initial={editing} onSaved={handleSaved} onDeleted={handleDeleted} />
      )}

      {registerComp && (
        <TeamForm
          onClose={() => setRegisterComp(null)}
          competitions={[registerComp]}
          fixedCompetition={registerComp}
          onCreated={() => { setRegisterComp(null); toast.success('报名成功，已创建团队'); }}
        />
      )}

      <CompetitionDetail comp={detailId ? detail : null} onClose={() => { setDetailId(null); setDetail(null); }} />
    </div>
  );
}

function CompetitionDetail({ comp, onClose }: { comp: Competition | null; onClose: () => void }) {
  if (!comp) return null;
  const fmt = (s?: string) => (s ? new Date(s).toLocaleString('zh-CN') : '—');
  return (
    <Modal open={!!comp} onClose={onClose} title={comp.title} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusBadge status={comp.status} />
          <TypeBadge type={comp.type} />
        </div>
        {comp.description && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{comp.description}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { k: '报名截止', v: fmt(comp.registration_deadline) },
            { k: '开始时间', v: fmt(comp.start_date) },
            { k: '结束时间', v: fmt(comp.end_date) },
            { k: '地点', v: comp.location || '线上' },
            { k: '奖金', v: comp.prize || '—' },
            { k: '已报名队伍', v: String(comp.teams_count ?? 0) },
          ].map(({ k, v }) => (
            <div key={k} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
