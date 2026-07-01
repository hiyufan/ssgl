import { useEffect, useState, useMemo } from 'react';
import { competitionsAPI, milestonesAPI, registrationsAPI, subscriptionsAPI, notesAPI } from '@/services/api';
import { useRole } from '@/hooks/use-role';
import { StatusBadge, TypeBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { Competition, Milestone } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormModal, Field, TextInput, TextArea, NumberInput, Select, DateTimeInput } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import { TeamForm } from '@/pages/teams';
import axios from 'axios';

const AI_BASE = import.meta.env.VITE_AI_BASE_URL || '/ai/api/v1';

const TYPE_ICONS: Record<string, string> = { hackathon: 'trophy', innovation: 'zap', research: 'target', business_plan: 'compass', ai_innovation: 'sparkles', data_science: 'chart' };
const STATUS_ORDER = ['ongoing', 'published', 'completed', 'draft', 'cancelled'];

const TYPE_COLOR_MAP: Record<string, string> = { hackathon: 'var(--amber)', innovation: 'var(--purple)', research: 'var(--teal)', ai_innovation: 'var(--purple)', business_plan: 'var(--amber)', data_science: 'var(--teal)' };
const TYPE_BG_MAP: Record<string, string> = { hackathon: 'var(--amber-bg)', innovation: 'var(--purple-bg)', research: 'var(--teal-bg)', ai_innovation: 'var(--purple-bg)', business_plan: 'var(--amber-bg)', data_science: 'var(--teal-bg)' };

const TYPE_OPTIONS = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'innovation', label: '创新赛' },
  { value: 'research', label: '研究赛' },
  { value: 'business_plan', label: '商业计划赛' },
  { value: 'ai_innovation', label: 'AI创新赛' },
  { value: 'data_science', label: '数据科学赛' },
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
  const [showParse, setShowParse] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parsing, setParsing] = useState(false);

  const set = (k: keyof CompFormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleAIParse = async () => {
    if (!parseText.trim()) { toast.error('请粘贴赛事信息'); return; }
    setParsing(true);
    try {
      const resp = await axios.post(`${AI_BASE}/tools/parse-competition`, { content: parseText });
      if (resp.data.success && resp.data.data) {
        const d = resp.data.data;
        setForm((f) => ({
          ...f,
          title: d.title || f.title,
          type: d.type || f.type,
          description: d.description || f.description,
          max_team_size: d.max_team_size ? String(d.max_team_size) : f.max_team_size,
          min_team_size: d.min_team_size ? String(d.min_team_size) : f.min_team_size,
          registration_deadline: d.registration_deadline || f.registration_deadline,
          start_date: d.start_date || f.start_date,
          end_date: d.end_date || f.end_date,
          location: d.location || f.location,
          prize: d.prize || f.prize,
          tags: d.tags || f.tags,
        }));
        setShowParse(false);
        setParseText('');
        toast.success('AI 已自动填充，请检查并补充');
      } else {
        toast.error(resp.data.error || '解析失败');
      }
    } catch (err) {
      toast.error('AI 解析失败，请检查网络');
    } finally {
      setParsing(false);
    }
  };

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
      {!isEdit && (
        <div style={{ marginBottom: 8 }}>
          {!showParse ? (
            <button type="button" onClick={() => setShowParse(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--border-2)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, width: '100%', justifyContent: 'center' }}>
              <Icon name="sparkles" size={14} /> AI 智能解析 — 粘贴赛事信息一键填充
            </button>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>粘贴赛事通知、文档内容或简介，AI 自动解析填充表单：</div>
              <textarea
                value={parseText}
                onChange={(e) => setParseText(e.target.value)}
                placeholder="例如：蓝桥杯全国软件和信息技术专业人才大赛，由工信部主办，每年4月省赛，6月国赛，个人赛，C/C++/Java/Python四个赛道..."
                style={{ width: '100%', minHeight: 100, padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowParse(false); setParseText(''); }}>取消</Button>
                <Button type="button" variant="primary" size="sm" loading={parsing} onClick={handleAIParse}>
                  <Icon name="sparkles" size={13} /> 解析填充
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
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
  const [recommendations, setRecommendations] = useState<Array<Competition & { match_score: number; match_tags: string[]; reason: string }>>([]);
  const [showRecommend, setShowRecommend] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set());
  const [subscribing, setSubscribing] = useState<number | null>(null);

  useEffect(() => {
    competitionsAPI.list().then(res => setCompetitions(res.competitions || [])).catch(console.error).finally(() => setLoading(false));
    // Load user's subscriptions (students only)
    if (role === 'student') {
      subscriptionsAPI.list().then(res => {
        const ids = new Set((res.subscriptions || []).map(s => s.competition_id));
        setSubscribedIds(ids);
      }).catch(() => {});
    }
  }, []);

  const loadRecommendations = async () => {
    if (recommendations.length > 0) { setShowRecommend(!showRecommend); return; }
    setLoadingRecs(true);
    try {
      const res = await competitionsAPI.recommend();
      setRecommendations(res.recommendations || []);
      setShowRecommend(true);
    } catch { toast.error('加载推荐失败'); }
    finally { setLoadingRecs(false); }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Competition | null>(null);
  const [registerComp, setRegisterComp] = useState<Competition | null>(null);
  const canManage = role === 'teacher' || role === 'admin';
  const [registering, setRegistering] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created_count: number; error_count: number; errors: Array<{ index: number; title: string; message: string }> } | null>(null);

  const handleDirectRegister = async (comp: Competition) => {
    setRegistering(comp.id);
    try {
      await registrationsAPI.register(comp.id);
      toast.success(`已报名「${comp.title}」，等待审核`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || '报名失败';
      toast.error(msg);
    } finally {
      setRegistering(null);
    }
  };

  const handleSaved = (comp: Competition, isNew: boolean) =>
    setCompetitions((prev) => (isNew ? [comp, ...prev] : prev.map((c) => (c.id === comp.id ? comp : c))));
  const handleDeleted = (id: number) =>
    setCompetitions((prev) => prev.filter((c) => c.id !== id));

  const toggleSubscription = async (compId: number) => {
    setSubscribing(compId);
    try {
      if (subscribedIds.has(compId)) {
        await subscriptionsAPI.unsubscribe(compId);
        setSubscribedIds(prev => { const n = new Set(prev); n.delete(compId); return n; });
        toast.success('已取消订阅');
      } else {
        await subscriptionsAPI.subscribe(compId);
        setSubscribedIds(prev => new Set(prev).add(compId));
        toast.success('已订阅，将在截止前收到提醒');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setSubscribing(null);
    }
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (comp: Competition) => { setEditing(comp); setFormOpen(true); };

  const handleBatchImport = async () => {
    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) { toast.error('请输入 JSON 数组'); return; }
    } catch {
      toast.error('JSON 格式错误');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await competitionsAPI.batchImport(parsed);
      setImportResult(res);
      if (res.created_count > 0) {
        toast.success(`成功导入 ${res.created_count} 个赛事`);
        // Refresh competition list
        competitionsAPI.list().then(r => setCompetitions(r.competitions || [])).catch(console.error);
      }
      if (res.error_count > 0) {
        toast.error(`${res.error_count} 个赛事导入失败`);
      }
    } catch {
      toast.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

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

  const filtered = useMemo(() =>
    competitions.filter(c => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (search && !c.title.includes(search)) return false;
      return true;
    }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)),
    [competitions, filter, typeFilter, search]
  );

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
        actions={canManage ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={openCreate}>创建赛事</Button>
            <Button icon={<Icon name="download" size={13}/>} onClick={() => { setShowImport(!showImport); setImportResult(null); }}>批量导入</Button>
          </div>
        ) : undefined}
      />

      {/* Batch Import Panel */}
      {canManage && showImport && (
        <div style={{
          background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 12px' }}>
            <Icon name="download" /> 批量导入赛事
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 12px' }}>
            输入 JSON 数组，每项包含 title、type、max_team_size、min_team_size、start_date、end_date 字段。
          </p>
          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            placeholder={`[
  {"title": "示例赛事", "type": "hackathon", "max_team_size": 5, "min_team_size": 1, "start_date": "2026-07-01T00:00:00+08:00", "end_date": "2026-08-01T00:00:00+08:00"}
]`}
            rows={6}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13, outline: 'none',
              resize: 'vertical', fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Button onClick={handleBatchImport} disabled={importing} style={{ fontSize: 13 }}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
            {importResult && (
              <span style={{ fontSize: 13, color: importResult.error_count > 0 ? 'var(--amber)' : 'var(--green)' }}>
                成功 {importResult.created_count} 个，失败 {importResult.error_count} 个
              </span>
            )}
          </div>
          {importResult && importResult.errors.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8, maxHeight: 150, overflow: 'auto' }}>
              {importResult.errors.map((e, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="circle-x" size={12} />
                    #{e.index + 1} {e.title}: {e.message}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

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
            const accent = TYPE_COLOR_MAP[comp.type] || 'var(--amber)';
            const accentBg = TYPE_BG_MAP[comp.type] || 'var(--amber-bg)';

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
                    {role === 'student' && (comp.status === 'published' || comp.status === 'ongoing') && (
                      <>
                        <Button variant="primary" size="sm" disabled={registering === comp.id}
                          onClick={() => handleDirectRegister(comp)}>
                          {registering === comp.id ? '报名中...' : '快速报名'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setRegisterComp(comp)}>组队报名</Button>
                      </>
                    )}
                    {canManage && comp.status === 'draft' && (
                      <Button variant="teal" size="sm" onClick={() => publish(comp)}>发布</Button>
                    )}
                    {canManage && (
                      <Button variant="outline" size="sm" icon={<Icon name="edit" size={12}/>} onClick={() => openEdit(comp)} />
                    )}
                    {role === 'student' && (comp.status === 'published' || comp.status === 'ongoing') && (
                      <Button variant="ghost" size="sm"
                        icon={<Icon name={subscribedIds.has(comp.id) ? 'bell' : 'bell'} size={12}
                          style={{ color: subscribedIds.has(comp.id) ? 'var(--amber)' : 'var(--text-3)' }}/>}
                        disabled={subscribing === comp.id}
                        onClick={(e) => { e.stopPropagation(); toggleSubscription(comp.id); }}
                        title={subscribedIds.has(comp.id) ? '取消订阅提醒' : '订阅截止提醒'}
                      />
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

      <CompetitionDetail comp={detailId ? detail : null} onClose={() => { setDetailId(null); setDetail(null); }} canManage={canManage} />
    </div>
  );
}

const MILESTONE_TYPE_LABELS: Record<string, string> = { registration: '报名', submission: '提交', review: '评审', defense: '答辩', award: '颁奖', custom: '自定义' };
const MILESTONE_TYPE_ICONS: Record<string, string> = { registration: 'users', submission: 'file', review: 'search', defense: 'target', award: 'trophy', custom: 'star' };
const MILESTONE_STATUS_COLORS: Record<string, string> = { pending: 'var(--text-3)', in_progress: 'var(--amber)', completed: 'var(--green)', skipped: 'var(--text-3)' };

function CompetitionDetail({ comp, onClose, canManage }: { comp: Competition | null; onClose: () => void; canManage?: boolean }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [msProgress, setMsProgress] = useState(0);
  const [msLoading, setMsLoading] = useState(false);
  const [addMs, setAddMs] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', type: 'submission', due_date: '', description: '' });
  const [msSaving, setMsSaving] = useState(false);
  const [compStats, setCompStats] = useState<Record<string, number | string> | null>(null);

  // Notes state
  type Note = { id: number; title: string; content: string; color: string; pinned: boolean; created_at: string; updated_at: string };
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [addNote, setAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: 'teal' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [editNoteId, setEditNoteId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', color: 'teal' });

  useEffect(() => {
    if (!comp) return;
    setMsLoading(true);
    setNotesLoading(true);
    Promise.all([
      milestonesAPI.list(comp.id).catch(() => ({ milestones: [], progress: 0 })),
      competitionsAPI.stats(comp.id).catch(() => null),
      notesAPI.listByCompetition(comp.id).catch(() => ({ items: [] })),
    ]).then(([msRes, statsRes, notesRes]) => {
      setMilestones(msRes.milestones || []);
      setMsProgress(msRes.progress || 0);
      setCompStats(statsRes);
      setNotes(notesRes.items || []);
    }).finally(() => { setMsLoading(false); setNotesLoading(false); });
  }, [comp?.id]);

  if (!comp) return null;
  const fmt = (s?: string) => (s ? new Date(s).toLocaleString('zh-CN') : '—');

  const toggleMsStatus = async (ms: Milestone) => {
    const next = ms.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await milestonesAPI.update(ms.id, { status: next });
      setMilestones(prev => prev.map(m => m.id === ms.id ? res.milestone : m));
      // recalc progress
      const done = milestones.filter(m => (m.id === ms.id ? next : m.status) === 'completed').length;
      setMsProgress(milestones.length > 0 ? (done / milestones.length) * 100 : 0);
    } catch (err) { toast.error(getApiError(err, '更新失败')); }
  };

  const deleteMs = async (ms: Milestone) => {
    if (!confirm(`删除里程碑「${ms.title}」？`)) return;
    try {
      await milestonesAPI.delete(ms.id);
      setMilestones(prev => prev.filter(m => m.id !== ms.id));
      toast.success('已删除');
    } catch (err) { toast.error(getApiError(err, '删除失败')); }
  };

  const createMs = async () => {
    if (!msForm.title.trim() || !msForm.due_date) { toast.error('请填写标题和截止日期'); return; }
    setMsSaving(true);
    try {
      const res = await milestonesAPI.create({
        competition_id: comp.id, title: msForm.title.trim(), type: msForm.type,
        due_date: new Date(msForm.due_date).toISOString(), sort_order: milestones.length + 1,
        description: msForm.description || undefined,
      });
      setMilestones(prev => [...prev, res.milestone]);
      setAddMs(false);
      setMsForm({ title: '', type: 'submission', due_date: '', description: '' });
      toast.success('里程碑已创建');
    } catch (err) { toast.error(getApiError(err, '创建失败')); }
    finally { setMsSaving(false); }
  };

  // Notes CRUD
  const NOTE_COLORS: Record<string, { bg: string; border: string; accent: string; label: string }> = {
    teal: { bg: 'var(--teal-bg)', border: 'var(--teal-border)', accent: 'var(--teal)', label: '蓝绿' },
    amber: { bg: 'var(--amber-bg)', border: 'var(--amber-border)', accent: 'var(--amber)', label: '琥珀' },
    purple: { bg: 'var(--purple-bg)', border: 'var(--border)', accent: 'var(--purple)', label: '紫色' },
    green: { bg: 'var(--green-bg)', border: 'var(--border)', accent: 'var(--green)', label: '绿色' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', accent: 'var(--red)', label: '红色' },
  };

  const createNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) { toast.error('请填写标题和内容'); return; }
    setNoteSaving(true);
    try {
      const res = await notesAPI.create(comp.id, { title: noteForm.title.trim(), content: noteForm.content.trim(), color: noteForm.color });
      setNotes(prev => [res.note, ...prev]);
      setAddNote(false);
      setNoteForm({ title: '', content: '', color: 'teal' });
      toast.success('笔记已创建');
    } catch (err) { toast.error(getApiError(err, '创建失败')); }
    finally { setNoteSaving(false); }
  };

  const saveEditNote = async () => {
    if (!editNoteId || !editForm.title.trim() || !editForm.content.trim()) return;
    try {
      const res = await notesAPI.update(editNoteId, { title: editForm.title.trim(), content: editForm.content.trim(), color: editForm.color });
      setNotes(prev => prev.map(n => n.id === editNoteId ? res.note : n));
      setEditNoteId(null);
      toast.success('笔记已更新');
    } catch (err) { toast.error(getApiError(err, '更新失败')); }
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm('删除此笔记？')) return;
    try {
      await notesAPI.delete(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('已删除');
    } catch (err) { toast.error(getApiError(err, '删除失败')); }
  };

  const togglePin = async (note: Note) => {
    try {
      const res = await notesAPI.update(note.id, { pinned: !note.pinned });
      setNotes(prev => prev.map(n => n.id === note.id ? res.note : n));
    } catch (err) { toast.error(getApiError(err, '操作失败')); }
  };

  return (
    <Modal open={!!comp} onClose={onClose} title={comp.title} width={680}>
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

        {/* Competition Stats */}
        {compStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: '团队数', value: compStats.team_count ?? 0, color: 'var(--teal)' },
              { label: '学生数', value: compStats.student_count ?? 0, color: 'var(--purple)' },
              { label: '预案数', value: compStats.preplan_count ?? 0, color: 'var(--amber)' },
              { label: '奖项数', value: compStats.award_count ?? 0, color: 'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'var(--surface-2)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: s.color }}>{String(s.value)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Milestones Section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="target" size={15} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>赛事里程碑</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({milestones.length})</span>
            </div>
            {canManage && (
              <Button variant="outline" size="sm" icon={<Icon name="plus" size={12}/>} onClick={() => setAddMs(!addMs)}>添加</Button>
            )}
          </div>

          {/* Progress bar */}
          {milestones.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                <span>进度</span>
                <span>{Math.round(msProgress)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${msProgress}%`, borderRadius: 3, background: 'var(--green)', transition: 'width 0.3s' }}/>
              </div>
            </div>
          )}

          {/* Gantt-style timeline */}
          {milestones.length > 1 && (() => {
            const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);
            const allDates = sorted.flatMap(m => [new Date(m.start_date || m.due_date).getTime(), new Date(m.due_date).getTime()]);
            const minDate = Math.min(...allDates);
            const maxDate = Math.max(...allDates);
            const span = maxDate - minDate || 1;
            const statusColor: Record<string, string> = { completed: 'var(--green)', in_progress: 'var(--amber)', skipped: 'var(--text-3)', pending: 'var(--border-2)' };
            return (
              <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="chart" size={12} />
                  时间线
                </div>
                {/* Time axis */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)', marginBottom: 6, padding: '0 2px' }}>
                  <span>{new Date(minDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(maxDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                </div>
                {sorted.map(ms => {
                  const start = new Date(ms.start_date || ms.due_date).getTime();
                  const end = new Date(ms.due_date).getTime();
                  const left = ((start - minDate) / span) * 100;
                  const width = Math.max(((end - start) / span) * 100, 8);
                  const isDone = ms.status === 'completed';
                  return (
                    <div key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }} title={`${ms.title}: ${new Date(ms.start_date || ms.due_date).toLocaleDateString()} → ${new Date(ms.due_date).toLocaleDateString()}`}>
                      <span style={{ width: 70, fontSize: 10, color: 'var(--text-3)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.title}</span>
                      <div style={{ flex: 1, height: 18, borderRadius: 4, background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%',
                          borderRadius: 4, background: statusColor[ms.status] || 'var(--border-2)',
                          opacity: isDone ? 0.6 : 1, minWidth: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                        }}>
                          {isDone && <Icon name="check" size={9} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Add milestone form */}
          {addMs && (
            <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 10, marginBottom: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <TextInput value={msForm.title} onChange={e => setMsForm(f => ({...f, title: e.target.value}))} placeholder="里程碑标题" />
                <Select value={msForm.type} onChange={v => setMsForm(f => ({...f, type: v}))}
                  options={Object.entries(MILESTONE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <DateTimeInput value={msForm.due_date} onChange={v => setMsForm(f => ({...f, due_date: v}))} label="截止日期" />
                <div/>
              </div>
              <TextArea value={msForm.description} onChange={e => setMsForm(f => ({...f, description: e.target.value}))} placeholder="描述（可选）" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setAddMs(false)}>取消</Button>
                <Button variant="primary" size="sm" loading={msSaving} onClick={createMs}>创建</Button>
              </div>
            </div>
          )}

          {/* Milestone list */}
          {msLoading ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)', fontSize: 12 }}>加载中...</div>
          ) : milestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 12 }}>暂无里程碑</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...milestones].sort((a, b) => a.sort_order - b.sort_order).map(ms => (
                <div key={ms.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  opacity: ms.status === 'completed' ? 0.7 : 1,
                }}>
                  <button onClick={() => toggleMsStatus(ms)} style={{
                    width: 20, height: 20, borderRadius: 6, border: `2px solid ${MILESTONE_STATUS_COLORS[ms.status]}`,
                    background: ms.status === 'completed' ? 'var(--green)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff',
                  }}>
                    {ms.status === 'completed' && <Icon name="check" size={11} />}
                  </button>
                  <Icon name={MILESTONE_TYPE_ICONS[ms.type] || 'star'} size={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: ms.status === 'completed' ? 'line-through' : 'none' }}>{ms.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {MILESTONE_TYPE_LABELS[ms.type] || ms.type} · 截止 {new Date(ms.due_date).toLocaleDateString('zh-CN')}
                      {ms.status === 'completed' && ms.completed_at && ` · 完成于 ${new Date(ms.completed_at).toLocaleDateString('zh-CN')}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: ms.status === 'completed' ? 'var(--green-dim)' : ms.status === 'in_progress' ? 'var(--amber-dim)' : 'var(--surface)', color: MILESTONE_STATUS_COLORS[ms.status], fontWeight: 600 }}>
                    {ms.status === 'completed' ? '已完成' : ms.status === 'in_progress' ? '进行中' : ms.status === 'skipped' ? '已跳过' : '待办'}
                  </span>
                  {canManage && (
                    <button onClick={() => deleteMs(ms)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }} title="删除">
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="edit" size={15} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>我的笔记</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({notes.length})</span>
            </div>
            <Button variant="outline" size="sm" icon={<Icon name="plus" size={12}/>} onClick={() => setAddNote(!addNote)}>添加</Button>
          </div>

          {/* Add note form */}
          {addNote && (
            <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 10, marginBottom: 12, border: '1px solid var(--border)' }}>
              <input className="forge-input" placeholder="笔记标题" value={noteForm.title} onChange={e => setNoteForm(f => ({...f, title: e.target.value}))} style={{ marginBottom: 8 }} />
              <textarea className="forge-input" rows={3} placeholder="笔记内容…" value={noteForm.content} onChange={e => setNoteForm(f => ({...f, content: e.target.value}))} style={{ resize: 'none', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {Object.entries(NOTE_COLORS).map(([key, val]) => (
                  <button key={key} onClick={() => setNoteForm(f => ({...f, color: key}))} style={{
                    width: 24, height: 24, borderRadius: 6, border: `2px solid ${noteForm.color === key ? val.accent : 'var(--border)'}`,
                    background: val.bg, cursor: 'pointer',
                  }} title={val.label} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setAddNote(false)}>取消</Button>
                <Button variant="primary" size="sm" loading={noteSaving} onClick={createNote}>创建</Button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notesLoading ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)', fontSize: 12 }}>加载中...</div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 12 }}>暂无笔记，点击「添加」开始记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...notes].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map(note => {
                const colors = NOTE_COLORS[note.color] || NOTE_COLORS.teal;
                const isEditing = editNoteId === note.id;
                return (
                  <div key={note.id} style={{
                    padding: '10px 14px', borderRadius: 10, background: colors.bg,
                    border: `1px solid ${colors.border}`, position: 'relative',
                  }}>
                    {note.pinned && <span style={{ position: 'absolute', top: 6, right: 8, color: colors.accent }}><Icon name="pin" size={10} /></span>}
                    {isEditing ? (
                      <div>
                        <input className="forge-input" value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} style={{ marginBottom: 6, fontSize: 13 }} />
                        <textarea className="forge-input" rows={2} value={editForm.content} onChange={e => setEditForm(f => ({...f, content: e.target.value}))} style={{ resize: 'none', marginBottom: 6, fontSize: 12 }} />
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                          {Object.entries(NOTE_COLORS).map(([key, val]) => (
                            <button key={key} onClick={() => setEditForm(f => ({...f, color: key}))} style={{
                              width: 18, height: 18, borderRadius: 4, border: `2px solid ${editForm.color === key ? val.accent : 'var(--border)'}`,
                              background: val.bg, cursor: 'pointer',
                            }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="ghost" size="sm" onClick={() => setEditNoteId(null)}>取消</Button>
                          <Button variant="primary" size="sm" onClick={saveEditNote}>保存</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, paddingRight: 20 }}>{note.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.content}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{new Date(note.updated_at).toLocaleDateString('zh-CN')}</span>
                          <button onClick={() => togglePin(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, fontSize: 11 }} title={note.pinned ? '取消置顶' : '置顶'}>
                            <Icon name={note.pinned ? 'pin' : 'map-pin'} size={12} />
                          </button>
                          <button onClick={() => { setEditNoteId(note.id); setEditForm({ title: note.title, content: note.content, color: note.color }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }} title="编辑">
                            <Icon name="edit" size={12} />
                          </button>
                          <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }} title="删除">
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
