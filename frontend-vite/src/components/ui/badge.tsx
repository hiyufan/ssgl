/* ─── Status Badge ────────────────────────────────────── */
const BADGE_MAP: Record<string, { cls: string; label: string }> = {
  ongoing:        { cls: 'badge-teal',   label: '进行中' },
  published:      { cls: 'badge-amber',  label: '报名中' },
  completed:      { cls: 'badge-muted',  label: '已结束' },
  draft:          { cls: 'badge-muted',  label: '草稿' },
  cancelled:      { cls: 'badge-red',    label: '已取消' },
  pending:        { cls: 'badge-amber',  label: '待审核' },
  approved:       { cls: 'badge-green',  label: '已通过' },
  rejected:       { cls: 'badge-red',    label: '已驳回' },
  under_review:   { cls: 'badge-teal',   label: '审核中' },
  submitted:      { cls: 'badge-amber',  label: '已提交' },
  settled:        { cls: 'badge-green',  label: '已结算' },
  teacher_confirm:{ cls: 'badge-teal',   label: '教师确认' },
  waiting:        { cls: 'badge-muted',  label: '等待中' },
  active:         { cls: 'badge-green',  label: '活跃' },
  registration:   { cls: 'badge-amber',  label: '报名申请' },
  pre_plan:       { cls: 'badge-teal',   label: '预计划' },
  reward:         { cls: 'badge-purple', label: '获奖确认' },
};

export function StatusBadge({ status }: { status: string }) {
  const m = BADGE_MAP[status] || { cls: 'badge-muted', label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  const m = {
    hackathon:  { cls: 'badge-amber',  label: 'Hackathon' },
    innovation: { cls: 'badge-purple', label: '创新赛' },
    research:   { cls: 'badge-teal',   label: '研究赛' },
  }[type] || { cls: 'badge-muted', label: type };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
