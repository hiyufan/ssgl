import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { ParticleCanvas } from '@/components/effects/particle-canvas';

export function LoginPage() {
  const { login } = useAuthStore();
  const { theme } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemos, setShowDemos] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  /* ─── GSAP animations ──────────────────────── */
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      // Form stagger entrance
      const form = formRef.current;
      if (form) {
        const els = form.querySelectorAll<HTMLElement>('[data-anim]');
        if (els.length) {
          gsap.set(els, { opacity: 0, x: 20 });
          gsap.to(els, { opacity: 1, x: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', delay: 0.2 });
        }
      }

      // Headline character-by-character reveal
      const h1 = headlineRef.current;
      if (h1) {
        const html = h1.innerHTML;
        const spans: HTMLSpanElement[] = [];

        const walk = (node: Node) => {
          if (node.nodeType === 3) { // Text node
            for (const ch of (node.textContent || '')) {
              const s = document.createElement('span');
              s.textContent = ch === ' ' ? ' ' : ch;
              s.style.display = 'inline-block';
              node.parentNode!.insertBefore(s, node);
              spans.push(s);
            }
            node.parentNode!.removeChild(node);
          } else if (node.nodeType === 1) { // Element node (<br>, <em>)
            const childNodes = Array.from(node.childNodes);
            childNodes.forEach(walk);
          }
        };

        try {
          Array.from(h1.childNodes).forEach(walk);
        } catch {
          // If split fails, restore and skip animation
          h1.innerHTML = html;
          return;
        }

        if (spans.length) {
          gsap.set(spans, { opacity: 0, y: 40, rotateX: -30 });
          gsap.to(spans, {
            opacity: 1, y: 0, rotateX: 0,
            duration: 0.5, stagger: 0.02, ease: 'power3.out', delay: 0.3,
            onComplete: () => { h1.innerHTML = html; },
          });
        }
      }

      // Left panel label + paragraph
      const heroEls = document.querySelectorAll<HTMLElement>('[data-hero-anim]');
      if (heroEls.length) {
        gsap.set(heroEls, { opacity: 0, y: 20 });
        gsap.to(heroEls, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.1 });
      }
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  /* ─── Form logic ───────────────────────────── */
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    setError('');
    setLoading(true);
    try { await login(username, password); }
    catch { setError('用户名或密码错误'); setLoading(false); }
  };

  const fill = (u: string, p: string) => { setUsername(u); setPassword(p); };
  const isDark = theme === 'dark';

  return (
    <div data-theme={theme} className="login-page" style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* ── Left: Hero with particles ────────────────── */}
      <div className="login-hero-side" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '0 64px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <ParticleCanvas count={100} connectDist={140} mouseRadius={180} />

        {/* Theme toggle */}
        <button onClick={() => {
          const next = isDark ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('forge-theme', next);
          window.location.reload();
        }} style={{
          position: 'absolute', top: 32, right: 32, zIndex: 10,
          width: 36, height: 36, borderRadius: 6,
          background: 'transparent', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)', cursor: 'pointer', fontSize: 14,
        }} title={isDark ? '切换亮色' : '切换暗色'}>
          {isDark ? '☀' : '☾'}
        </button>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div data-hero-anim style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 24,
          }}>
            AI-Powered Competition Platform
          </div>

          <h1 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 7vw, 88px)',
            fontWeight: 900, lineHeight: 0.95,
            letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 24,
          }}>
            让每<br />一次<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--amber)' }}>竞赛</em>
          </h1>

          <p data-hero-anim style={{
            fontSize: 14, lineHeight: 1.8,
            color: 'var(--text-3)', maxWidth: 360,
          }}>
            面向高校的 AI 竞赛管理平台<br />
            整合赛事信息 · 团队协作 · 智能推荐
          </p>
        </div>
      </div>

      {/* ── Right: Login form ────────────────────────── */}
      <div className="login-form-side" style={{
        width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 48, borderLeft: '1px solid var(--border)', background: 'var(--surface)',
      }}>
        <div ref={formRef} style={{ width: '100%', maxWidth: 320 }}>
          <div data-anim style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
            letterSpacing: '0.08em', color: 'var(--text)', marginBottom: 48,
          }}>SSGL</div>

          <h2 data-anim style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
            color: 'var(--text)', marginBottom: 6,
          }}>登录</h2>
          <p data-anim style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 36 }}>
            竞赛管理平台
          </p>

          {error && (
            <div data-anim style={{
              marginBottom: 20, padding: '10px 14px', borderRadius: 6,
              background: 'var(--red-bg)', border: '1px solid rgba(166,61,47,0.15)',
              fontSize: 13, color: 'var(--red)',
            }}>{error}</div>
          )}

          <form onSubmit={handle}>
            <div data-anim style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-3)', marginBottom: 6,
              }}>用户名</label>
              <input className="forge-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="输入用户名" autoComplete="username" />
            </div>

            <div data-anim style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-3)', marginBottom: 6,
              }}>密码</label>
              <input className="forge-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" autoComplete="current-password" />
            </div>

            <div data-anim>
              <button type="submit" disabled={loading} className="btn btn-primary btn-xl" style={{ width: '100%' }}>
                {loading ? (
                  <svg width={16} height={16} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.3}/>
                    <path d="M12 2a10 10 0 0110 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                ) : '登录 →'}
              </button>
            </div>
          </form>

          {import.meta.env.DEV && (
          <div data-anim style={{ marginTop: 32 }}>
            <button onClick={() => setShowDemos(!showDemos)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: 'var(--text-3)',
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
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.05em' }}>
                  密码均为 password123
                </div>
                {[
                  { role: '管理员', user: 'liuzy', color: 'var(--amber)' },
                  { role: '教师', user: 'wangjg', color: 'var(--teal)' },
                  { role: '学生', user: 'zhangm', color: 'var(--purple)' },
                ].map(({ role, user: u, color }) => (
                  <button key={u} onClick={() => fill(u, 'password123')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 10px', borderRadius: 4,
                    border: '1px solid var(--border)', background: 'transparent',
                    cursor: 'pointer', marginBottom: 4, transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 1, background: color }}/>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{role}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>{u}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
