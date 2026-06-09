// Auth Context & Login Page

// ── Auth Context ──────────────────────────────────────────

const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // On mount: check existing token, restore session
  React.useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authAPI.getMe();
        // Backend returns { user: {...} }
        setUser(data.user || data);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = React.useCallback(async (username, password) => {
    const data = await authAPI.login({ username, password });
    // Backend returns { tokens: {...}, user: {...} }
    if (data.user) {
      setUser(data.user);
    } else {
      // Fallback: fetch user profile
      try {
        const me = await authAPI.getMe();
        setUser(me.user || me);
      } catch {
        setUser({ username });
      }
    }
    return data;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// ── Login Page ────────────────────────────────────────────

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError('登录失败，请检查用户名或密码');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 24,
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'fixed', top: -120, right: -80, width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: -100, left: -60, width: 350, height: 350,
        borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none',
      }} />

      <div style={{
        width: 400, maxWidth: '100%',
        background: 'rgba(255,255,255,.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        padding: '40px 36px 32px',
        animation: 'scaleIn .35s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #3370FF 0%, #7C3AED 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 4px 16px rgba(51,112,255,.35)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2329', margin: 0 }}>
            竞赛管理平台
          </h1>
          <p style={{ fontSize: 13, color: '#8F959E', marginTop: 6 }}>
            AI 驱动全流程管理系统
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 20,
            background: '#FFECE8', border: '1px solid #FDCDC8',
            color: '#F53F3F', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            animation: 'fadeUp .2s ease',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F53F3F" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2329', marginBottom: 6 }}>
              用户名
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #E5E6E8', fontSize: 14, outline: 'none',
                background: '#F7F8FA', transition: 'border-color .15s, box-shadow .15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#3370FF'; e.target.style.boxShadow = '0 0 0 3px rgba(51,112,255,.12)'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E6E8'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2329', marginBottom: 6 }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #E5E6E8', fontSize: 14, outline: 'none',
                background: '#F7F8FA', transition: 'border-color .15s, box-shadow .15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#3370FF'; e.target.style.boxShadow = '0 0 0 3px rgba(51,112,255,.12)'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E6E8'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <Btn full size="lg" disabled={submitting} style={{
            height: 44, fontSize: 15, fontWeight: 600, borderRadius: 10,
            background: submitting ? '#8F959E' : 'linear-gradient(135deg, #3370FF 0%, #5B5FC7 100%)',
            boxShadow: '0 4px 14px rgba(51,112,255,.3)',
          }}>
            {submitting ? <><Spinner size={18} color="#fff" /> 登录中...</> : '登 录'}
          </Btn>
        </form>

        {/* Test accounts hint */}
        <div style={{
          marginTop: 28, padding: '14px 16px', borderRadius: 10,
          background: '#F7F8FA', border: '1px solid #E5E6E8',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#646A73', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8F959E" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            测试账号
          </div>
          {[
            { name: 'liuzy (管理员)', role: 'admin' },
            { name: 'wangjg (教师)', role: 'teacher' },
            { name: 'zhangm (学生)', role: 'student' },
          ].map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 0', fontSize: 12, color: '#646A73',
              borderTop: i > 0 ? '1px solid #E5E6E8' : 'none',
            }}>
              <span style={{ fontFamily: 'Menlo, Monaco, monospace' }}>{a.name}</span>
              <span style={{ color: '#8F959E', fontFamily: 'Menlo, Monaco, monospace' }}>password123</span>
            </div>
          ))}
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setUsername('liuzy'); setPassword('password123'); }}
              style={{
                background: 'none', border: '1px solid #E5E6E8', borderRadius: 6,
                padding: '4px 12px', fontSize: 11, color: '#3370FF', cursor: 'pointer',
                fontWeight: 500, transition: 'all .15s',
              }}
              onMouseEnter={e => { e.target.style.background = '#EEF3FF'; e.target.style.borderColor = '#BDD4FF'; }}
              onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.borderColor = '#E5E6E8'; }}
            >
              快速填入管理员账号
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Export ────────────────────────────────────────────────

Object.assign(window, { AuthContext, AuthProvider, useAuth, LoginPage });
