import { useState, useEffect, useCallback } from 'react';
import { notificationsAPI, profileAPI, type Notification } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

const TYPE_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  system:       { color: 'var(--blue)',   bg: 'var(--blue-bg)',   icon: 'bell' },
  competition:  { color: 'var(--amber)',  bg: 'var(--amber-bg)',  icon: 'trophy' },
  team:         { color: 'var(--teal)',   bg: 'var(--teal-bg)',   icon: 'users' },
  award:        { color: 'var(--amber)',  bg: 'var(--amber-bg)',  icon: 'gift' },
  team_invite:  { color: 'var(--purple)', bg: 'var(--purple-bg)', icon: 'send' },
  registration: { color: 'var(--green)',  bg: 'var(--green-bg)',  icon: 'check' },
  pre_plan:     { color: 'var(--blue)',   bg: 'var(--blue-bg)',   icon: 'file' },
};

const TYPE_LABELS: Record<string, string> = {
  system: '系统通知',
  competition: '赛事通知',
  team: '团队通知',
  award: '奖项通知',
  team_invite: '团队邀请',
  registration: '报名通知',
  pre_plan: '预案通知',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export function NotificationsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ user_id: 0, type: 'system', title: '', message: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<Array<{ id: number; name: string; username: string }>>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (filter === 'unread') params.unread = true;
      const [notifRes, unreadRes] = await Promise.all([
        notificationsAPI.list(params as { unread?: boolean; page?: number; page_size?: number }),
        notificationsAPI.getUnreadCount(),
      ]);
      setNotifications(notifRes.items || []);
      setTotal(notifRes.total || 0);
      setUnreadCount(unreadRes.unread_count || 0);
    } catch {
      toast.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('标记失败');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
      setUnreadCount(0);
      toast.success('全部已读');
    } catch {
      toast.error('操作失败');
    }
  };

  // Admin: search users for notification creation
  useEffect(() => {
    if (!showCreateForm || userSearch.length < 2) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await profileAPI.searchUsers(userSearch);
        setUserResults(res.users || []);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, showCreateForm]);

  // Admin: create notification
  const handleCreate = async () => {
    if (!createForm.user_id || !createForm.title) { toast.error('请选择用户并填写标题'); return; }
    setCreating(true);
    try {
      await notificationsAPI.create(createForm);
      toast.success('通知已发送');
      setShowCreateForm(false);
      setCreateForm({ user_id: 0, type: 'system', title: '', message: '' });
      setUserSearch('');
      load();
    } catch {
      toast.error('发送失败');
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            <Icon name="bell" /> 通知中心
          </h1>
          <p style={{ color: 'var(--text-3)', margin: '4px 0 0', fontSize: 14 }}>
            {unreadCount > 0 ? `${unreadCount} 条未读通知` : '所有通知已读'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)} style={{ fontSize: 13, background: showCreateForm ? 'var(--red)' : 'var(--accent)' }}>
              <Icon name={showCreateForm ? 'x' : 'plus'} /> {showCreateForm ? '取消' : '发送通知'}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} style={{ fontSize: 13 }}>
              <Icon name="check" /> 全部已读
            </Button>
          )}
        </div>
      </div>

      {/* Admin Create Notification Form */}
      {isAdmin && showCreateForm && (
        <div style={{
          background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 16px' }}>
            <Icon name="send" /> 发送系统通知
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {/* User Search */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>搜索用户</label>
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="输入用户名或姓名搜索..."
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none',
                }}
              />
              {userResults.length > 0 && (
                <div style={{
                  marginTop: 4, background: 'var(--surface-2)', borderRadius: 8,
                  border: '1px solid var(--border)', maxHeight: 150, overflow: 'auto',
                }}>
                  {userResults.map(u => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setCreateForm(f => ({ ...f, user_id: u.id }));
                        setUserSearch(`${u.name} (${u.username})`);
                        setUserResults([]);
                      }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                        color: 'var(--text-1)', borderBottom: '1px solid var(--border)',
                        background: createForm.user_id === u.id ? 'var(--accent-bg)' : 'transparent',
                      }}
                    >
                      {u.name} ({u.username})
                    </div>
                  ))}
                </div>
              )}
              {createForm.user_id > 0 && (
                <p style={{ fontSize: 12, color: 'var(--green)', margin: '4px 0 0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" size={12} />
                  已选择用户 ID: {createForm.user_id}
                </p>
              )}
            </div>
            {/* Type */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>通知类型</label>
              <select
                value={createForm.type}
                onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14,
                }}
              >
                <option value="system">系统通知</option>
                <option value="competition">赛事通知</option>
                <option value="team">团队通知</option>
                <option value="award">奖项通知</option>
                <option value="registration">报名通知</option>
                <option value="pre_plan">预案通知</option>
              </select>
            </div>
            {/* Title */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>标题 *</label>
              <input
                type="text"
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="通知标题"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none',
                }}
              />
            </div>
            {/* Message */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>内容</label>
              <textarea
                value={createForm.message}
                onChange={e => setCreateForm(f => ({ ...f, message: e.target.value }))}
                placeholder="通知内容（可选）"
                rows={3}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', resize: 'vertical',
                }}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating} style={{ fontSize: 14, justifySelf: 'flex-end' }}>
              {creating ? '发送中...' : '发送通知'}
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: filter === f ? 600 : 400,
              background: filter === f ? 'var(--accent)' : 'var(--surface-2)',
              color: filter === f ? '#fff' : 'var(--text-2)',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? '全部' : '未读'}
            {f === 'unread' && unreadCount > 0 && (
              <span style={{
                marginLeft: 6, background: 'var(--red)', color: '#fff',
                borderRadius: 10, padding: '1px 6px', fontSize: 11,
              }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon name="hourglass" size={24} /></div>加载中...
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Icon name="bell" size={48} /></div>
          <p style={{ fontSize: 16, fontWeight: 500 }}>暂无{filter === 'unread' ? '未读' : ''}通知</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const typeInfo = TYPE_COLORS[n.type] || TYPE_COLORS.system;
            const isUnread = !n.read_at;
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: 14, padding: '14px 16px',
                  borderRadius: 12, cursor: 'pointer',
                  background: isUnread ? 'var(--surface-1)' : 'var(--surface-2)',
                  border: isUnread ? '1px solid var(--border)' : '1px solid transparent',
                  transition: 'all 0.15s',
                  opacity: isUnread ? 1 : 0.7,
                }}
                onClick={() => isUnread && handleMarkRead(n.id)}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: typeInfo.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name={typeInfo.icon} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 13, fontWeight: isUnread ? 600 : 400,
                      color: 'var(--text-1)',
                    }}>{n.title}</span>
                    <span style={{
                      fontSize: 11, padding: '1px 6px', borderRadius: 4,
                      background: typeInfo.bg, color: typeInfo.color,
                    }}>{TYPE_LABELS[n.type] || n.type}</span>
                    {isUnread && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)',
                      }} />
                    )}
                  </div>
                  {n.message && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'inline-block' }}>
                    {timeAgo(n.created_at)}
                  </span>
                </div>

                {/* Mark Read Button */}
                {isUnread && (
                  <button
                    onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                    title="标记已读"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-3)', padding: 4, borderRadius: 4,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Icon name="check" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ fontSize: 13, opacity: page <= 1 ? 0.4 : 1 }}
          >上一页</Button>
          <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-2)', padding: '0 12px' }}>
            {page} / {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ fontSize: 13, opacity: page >= totalPages ? 0.4 : 1 }}
          >下一页</Button>
        </div>
      )}
    </div>
  );
}
