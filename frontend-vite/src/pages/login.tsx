import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
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

  const isDark = theme === 'dark';

  return (
    <div className="student-root" data-theme={theme} style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--s-bg)',
    }}>
      {/* Left — Editorial branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '0 64px 80px',
        position: 'relative',
      }}>
        {/* Theme toggle */}
        <button onClick={() => {
          const next = isDark ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('forge-theme', next);
          window.location.reload();
        }} style={{
          position: 'absolute', top: 32, right: 32,
          width: 36, height: 36, borderRadius: 6,
          background: 'transparent', border: '1px solid var(--s-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--s-text-3)', cursor: 'pointer', fontSize: 14,
        }} title={isDark ? '切换亮色' : '切换暗色'}>
          {isDark ? '☀' : '☾'}
        </button>

        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--s-text-3)', marginBottom: 24,
        }}>
          AI-Powered Competition Platform
        </div>
        <h1 style={{
          fontFamily: 'var(--s-font-hand)',
          fontSize: 'clamp(48px, 7vw, 88px)',
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: '-0.03em',
          color: 'var(--s-text-1)',
          marginBottom: 24,
        }}>
          让每<br />一次<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--s-amber)' }}>竞赛</em>
        </h1>
        <p style={{
          fontSize: 14, lineHeight: 1.8,
          color: 'var(--s-text-3)', maxWidth: 360,
        }}>
          面向高校的 AI 竞赛管理平台<br />
          整合赛事信息 · 团队协作 · 智能推荐
        </p>
      </div>

      {/* Right — Login form */}
      <div style={{
        width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 48,
        borderLeft: '1px solid var(--s-border)',
        background: 'var(--s-surface)',
      }}>
        <div style={{
          width: '100%', maxWidth: 320,
          animation: 's-card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          {/* Logo */}
          <div style={{
            fontFamily: 'var(--s-font-hand)',
            fontSize: 22, fontWeight: 900,
            letterSpacing: '0.08em',
            color: 'var(--s-text-1)',
            marginBottom: 48,
          }}>
            SSGL
          </div>

          {/* Greeting */}
          <h2 style={{
            fontFamily: 'var(--s-font-hand)',
            fontSize: 28, fontWeight: 700,
            color: 'var(--s-text-1)',
            marginBottom: 6,
          }}>
            登录
          </h2>
          <p style={{
            fontSize: 13, color: 'var(--s-text-3)', marginBottom: 36,
          }}>
            竞赛管理平台
          </p>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px', borderRadius: 6,
              background: 'var(--red-bg)', border: '1px solid rgba(166,61,47,0.15)',
              fontSize: 13, color: 'var(--s-red)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handle}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--s-text-3)', marginBottom: 6,
              }}>用户名</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="输入用户名"
                autoComplete="username"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'var(--s-bg)',
                  border: '1px solid var(--s-border)',
                  borderRadius: 6, color: 'var(--s-text-1)', fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--s-amber)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--s-border)'; }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--s-text-3)', marginBottom: 6,
              }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入密码"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'var(--s-bg)',
                  border: '1px solid var(--s-border)',
                  borderRadius: 6, color: 'var(--s-text-1)', fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--s-amber)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--s-border)'; }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 0',
              background: 'var(--s-text-1)',
              border: 'none', borderRadius: 6,
              color: 'var(--s-bg)', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}>
              {loading ? (
                <svg width={16} height={16} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.3}/>
                  <path d="M12 2a10 10 0 0110 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : '登录 →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 32 }}>
            <button onClick={() => setShowDemos(!showDemos)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: 'var(--s-text-3)',
              fontSize: 11, cursor: 'pointer', padding: '4px 0',
              fontWeight: 600, letterSpacing: '0.05em',
            }}>
              <span style={{
                transition: 'transform 0.2s',
                transform: showDemos ? 'rotate(90deg)' : 'rotate(0deg)',
                display: 'inline-block', fontSize: 10,
              }}>▸</span>
              演示账号
            </button>
            {showDemos && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 6,
                background: 'var(--s-bg)',
                border: '1px solid var(--s-border)',
                animation: 's-card-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                <div style={{
                  fontSize: 10, color: 'var(--s-text-3)', marginBottom: 8,
                  letterSpacing: '0.05em',
                }}>
                  密码均为 password123
                </div>
                {[
                  { role: '管理员', user: 'liuzy', color: 'var(--s-amber)' },
                  { role: '教师', user: 'wangjg', color: 'var(--teal)' },
                  { role: '学生', user: 'zhangm', color: 'var(--s-purple)' },
                ].map(({ role, user: u, color }) => (
                  <button key={u} onClick={() => fill(u, 'password123')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 10px', borderRadius: 4,
                    border: '1px solid var(--s-border)',
                    background: 'transparent', cursor: 'pointer',
                    marginBottom: 4, transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s-surface-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 1, background: color }}/>
                      <span style={{ fontSize: 12, color: 'var(--s-text-2)' }}>{role}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--s-font-mono)', fontSize: 11, color }}>{u}</span>
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
