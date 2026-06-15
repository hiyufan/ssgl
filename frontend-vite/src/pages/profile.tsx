import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { profileAPI, type UserProfile } from '@/services/api';
import { useNavigate } from 'react-router-dom';

const roleLabels: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

const roleColors: Record<string, string> = {
  student: 'var(--amber)',
  teacher: 'var(--blue, #4a9eff)',
  admin: 'var(--red, #ff6b6b)',
};

export function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', dept: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    profileAPI.getMyProfile()
      .then(res => {
        setProfile(res.profile);
        setEditForm({
          name: res.profile.name || '',
          email: res.profile.email || '',
          phone: res.profile.phone || '',
          dept: res.profile.dept || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      const cards = containerRef.current?.querySelectorAll<HTMLElement>('[data-card]');
      if (!cards?.length) return;
      gsap.set(cards, { opacity: 0, y: 30, scale: 0.95 });
      gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.2)' });
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, profile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await profileAPI.updateProfile(editForm);
      setSaveMsg('✅ 保存成功');
      // Refresh profile
      const refreshed = await profileAPI.getMyProfile();
      setProfile(refreshed.profile);
      setEditing(false);
    } catch (e: any) {
      setSaveMsg('❌ ' + (e.response?.data?.error || '保存失败'));
    } finally {
      setSaving(false);
    }
  };

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

  if (!profile) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
        无法加载用户信息
      </div>
    );
  }

  const stats = [
    { label: '参与赛事', value: profile.competition_count, icon: '🏆', color: 'var(--amber)' },
    { label: '加入团队', value: profile.team_count, icon: '👥', color: 'var(--blue, #4a9eff)' },
    { label: '提交预案', value: profile.pre_plan_count, icon: '📋', color: 'var(--green, #4ade80)' },
    { label: '获得奖项', value: profile.award_count, icon: '🎖️', color: 'var(--purple, #a78bfa)' },
  ];

  return (
    <div ref={containerRef} style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div data-card style={styles.headerCard}>
        <div style={styles.avatarWrap}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} style={styles.avatar} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {(profile.name || profile.username).charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ ...styles.roleBadge, background: roleColors[profile.role] || 'var(--text-3)' }}>
            {roleLabels[profile.role] || profile.role}
          </div>
        </div>
        <div style={styles.info}>
          <h1 style={styles.name}>{profile.name || profile.username}</h1>
          <p style={styles.username}>@{profile.username}</p>
          {profile.dept && <p style={styles.detail}>🏫 {profile.dept}</p>}
          {profile.student_id && <p style={styles.detail}>📝 学号: {profile.student_id}</p>}
          {profile.email && <p style={styles.detail}>📧 {profile.email}</p>}
          {profile.phone && <p style={styles.detail}>📱 {profile.phone}</p>}
          <p style={styles.detail}>📅 注册于 {profile.created_at}</p>
          <button
            onClick={() => setEditing(!editing)}
            style={styles.editBtn}
          >
            {editing ? '取消' : '✏️ 编辑资料'}
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div data-card style={styles.editCard}>
          <h3 style={styles.sectionTitle}>编辑个人信息</h3>
          <div style={styles.formGrid}>
            <label style={styles.label}>
              姓名
              <input
                style={styles.input}
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </label>
            <label style={styles.label}>
              邮箱
              <input
                style={styles.input}
                type="email"
                value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              />
            </label>
            <label style={styles.label}>
              手机
              <input
                style={styles.input}
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </label>
            <label style={styles.label}>
              院系
              <input
                style={styles.input}
                value={editForm.dept}
                onChange={e => setEditForm({ ...editForm, dept: e.target.value })}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
              {saving ? '保存中...' : '💾 保存'}
            </button>
            {saveMsg && <span style={{ alignSelf: 'center', fontSize: 14 }}>{saveMsg}</span>}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div data-card style={styles.statsSection}>
        <h3 style={styles.sectionTitle}>📊 我的数据</h3>
        <div style={styles.statsGrid}>
          {stats.map((s, i) => (
            <div key={i} style={{ ...styles.statCard, borderTopColor: s.color }}>
              <span style={styles.statIcon}>{s.icon}</span>
              <span style={{ ...styles.statValue, color: s.color }}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div data-card style={styles.actionsCard}>
        <h3 style={styles.sectionTitle}>🚀 快捷操作</h3>
        <div style={styles.actionsGrid}>
          {profile.role === 'student' && (
            <>
              <button onClick={() => navigate('/teams')} style={styles.actionBtn}>👥 我的团队</button>
              <button onClick={() => navigate('/preplans')} style={styles.actionBtn}>📋 我的预案</button>
              <button onClick={() => navigate('/coach')} style={styles.actionBtn}>🎤 答辩教练</button>
            </>
          )}
          <button onClick={() => navigate('/competitions')} style={styles.actionBtn}>🏆 赛事列表</button>
          <button onClick={() => navigate('/aitools')} style={styles.actionBtn}>🤖 AI 工具箱</button>
          <button onClick={() => navigate('/leaderboard')} style={styles.actionBtn}>🏅 排行榜</button>
          <button onClick={() => navigate('/showcase')} style={styles.actionBtn}>🎯 成果展示</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerCard: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-1)',
    borderRadius: 16,
    padding: 32,
    display: 'flex',
    gap: 32,
    marginBottom: 24,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--amber)',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--amber), var(--orange, #f59e0b))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    fontWeight: 700,
    color: '#000',
  },
  roleBadge: {
    position: 'absolute' as const,
    bottom: -4,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '2px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    whiteSpace: 'nowrap' as const,
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  name: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-1)',
  },
  username: {
    margin: 0,
    fontSize: 14,
    color: 'var(--text-3)',
  },
  detail: {
    margin: 0,
    fontSize: 14,
    color: 'var(--text-2)',
  },
  editBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: '6px 16px',
    borderRadius: 8,
    border: '1px solid var(--border-2)',
    background: 'var(--surface-2)',
    color: 'var(--text-1)',
    cursor: 'pointer',
    fontSize: 14,
  },
  editCard: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-1)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    fontSize: 13,
    color: 'var(--text-2)',
  },
  input: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-2)',
    background: 'var(--surface-2)',
    color: 'var(--text-1)',
    fontSize: 14,
    outline: 'none',
  },
  saveBtn: {
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--amber)',
    color: '#000',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  statsSection: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
  },
  statCard: {
    background: 'var(--surface-2)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    borderTop: '3px solid',
  },
  statIcon: {
    fontSize: 28,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 13,
    color: 'var(--text-3)',
  },
  actionsCard: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-1)',
    borderRadius: 16,
    padding: 24,
  },
  actionsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  actionBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid var(--border-2)',
    background: 'var(--surface-2)',
    color: 'var(--text-1)',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
};
