import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { AuroraBg } from '@/components/student-ui/aurora-bg';
import '@/styles/student.css';

export function LoginPage() {
  const { login } = useAuthStore();
  const { theme } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemos, setShowDemos] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('用户名或密码错误');
      setLoading(false);
    }
  };

  const fill = (u: string, p: string) => { setUsername(u); setPassword(p); };

  return (
    <div className="student-root" data-theme={theme} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AuroraBg />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1, padding: 24,
      }}>
        {/* Theme toggle — top right */}
        <button onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('forge-theme', next);
          window.location.reload();
        }} style={{
          position: 'absolute', top: 24, right: 24,
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--s-surface)', border: '1px solid var(--s-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--s-text-2)', cursor: 'pointer', fontSize: 16,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }} title={theme === 'dark' ? '切换亮色' : '切换暗色'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Login card */}
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'var(--s-surface)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--s-border)',
          borderRadius: 24,
          padding: '40px 36px',
          animation: 's-card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
          boxShadow: 'var(--s-shadow)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--s-purple), var(--s-amber))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="7" width="4" height="6" fill="#0F1523" rx="1"/>
                <rect x="5" y="4" width="4" height="9" fill="#0F1523" rx="1"/>
                <rect x="9" y="1" width="4" height="12" fill="#0F1523" rx="1"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--s-font-body)', fontWeight: 700, fontSize: 15,
              letterSpacing: '0.04em', color: 'var(--s-text-1)',
            }}>
              FORGE
            </span>
          </div>

          {/* Greeting */}
          <div style={{
            fontFamily: 'var(--s-font-hand)', fontSize: 32, fontWeight: 500,
            color: 'var(--s-text-1)', textAlign: 'center', marginBottom: 8,
          }}>
            你好 👋
          </div>
          <p style={{
            fontSize: 14, color: 'var(--s-text-3)', textAlign: 'center', marginBottom: 32,
          }}>
            登录竞赛管理平台
          </p>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px', borderRadius: 12,
              background: 'var(--red-bg)', border: '1px solid rgba(248, 113, 113, 0.2)',
              fontSize: 13, color: 'var(--s-red)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handle}>
            <div style={{ marginBottom: 16 }}>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名"
                autoComplete="username"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--s-surface)',
                  border: '1px solid var(--s-border)',
                  borderRadius: 12, color: 'var(--s-text-1)', fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--s-purple)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--s-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--s-surface)',
                  border: '1px solid var(--s-border)',
                  borderRadius: 12, color: 'var(--s-text-1)', fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--s-purple)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--s-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px 0',
              background: 'linear-gradient(135deg, var(--s-purple), var(--s-amber))',
              border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.15s, opacity 0.15s',
            }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? (
                <svg width={18} height={18} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.3}/>
                  <path d="M12 2a10 10 0 0110 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : '登录'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 24 }}>
            <button onClick={() => setShowDemos(!showDemos)} style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
              background: 'none', border: 'none', color: 'var(--s-text-3)',
              fontSize: 12, cursor: 'pointer', padding: '4px 0',
            }}>
              <span style={{ transition: 'transform 0.2s', transform: showDemos ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▸</span>
              演示账号
            </button>
            {showDemos && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 12,
                background: 'var(--s-surface)',
                border: '1px solid var(--s-border)',
                animation: 's-card-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                <div style={{ fontSize: 10, color: 'var(--s-text-3)', marginBottom: 8, textAlign: 'center' }}>
                  密码均为 password123
                </div>
                {[
                  { role: '管理员', user: 'liuzy', color: 'var(--s-amber)' },
                  { role: '教师', user: 'wangjg', color: 'var(--s-teal, #2DD4BF)' },
                  { role: '学生', user: 'zhangm', color: 'var(--s-purple)' },
                ].map(({ role, user: u, color }) => (
                  <button key={u} onClick={() => fill(u, 'password123')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--s-border)',
                    background: 'transparent', cursor: 'pointer',
                    marginBottom: 4, transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s-surface-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>
                      <span style={{ fontSize: 12, color: 'var(--s-text-2)' }}>{role}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--s-font-mono)', fontSize: 12, color }}>{u}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
