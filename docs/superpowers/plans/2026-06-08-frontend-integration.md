# Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing React frontend to the Go backend APIs, replacing mock data with real API calls.

**Architecture:** Add an API service layer to the frontend that calls the Go backend at `http://localhost:8080/api/v1`. Use fetch/axios for HTTP requests, store JWT tokens in localStorage, and handle auth state in React context.

**Tech Stack:** React 18, Fetch API, localStorage for tokens

---

## File Structure

```
frontend/
├── platform/
│   ├── api.js              # NEW: API service layer
│   ├── auth.js             # NEW: Auth context and hooks
│   ├── data.jsx            # MODIFY: Remove mock data, use API
│   ├── app.jsx             # MODIFY: Add auth provider
│   ├── dashboard.jsx       # MODIFY: Fetch real data
│   ├── competitions.jsx    # MODIFY: Fetch real data
│   ├── approvals.jsx       # MODIFY: Fetch real data
│   ├── preplans.jsx        # MODIFY: Fetch real data
│   ├── aitools.jsx         # MODIFY: Call real AI APIs
│   ├── stats.jsx           # MODIFY: Fetch real data
│   ├── records.jsx         # MODIFY: Fetch real data
│   └── ...                 # Other files unchanged
```

---

## Task 1: API Service Layer

**Files:**
- Create: `frontend/platform/api.js`

- [ ] **Step 1: Create api.js**

```javascript
// API Service Layer — connects to Go backend

const API_BASE = 'http://localhost:8080/api/v1';
const AI_BASE = 'http://localhost:8000/ai/api/v1';

// Token management
const getToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');
const setTokens = (tokens) => {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
};
const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Base fetch wrapper with auth
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 — try refresh
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      return fetch(url, { ...options, headers });
    }
  }

  return response;
}

// Refresh tokens
async function refreshTokens() {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: getRefreshToken() }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.tokens);
      return true;
    }
  } catch (e) {
    console.error('Token refresh failed:', e);
  }

  clearTokens();
  return false;
}

// ── Auth API ──────────────────────────────────────────────
export const authAPI = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setTokens(data.tokens);
    return data.user;
  },

  register: async (userData) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  },

  getMe: async () => {
    const response = await apiFetch(`${API_BASE}/users/me`);
    if (!response.ok) throw new Error('Failed to get user');
    return response.json();
  },

  logout: () => {
    clearTokens();
  },

  isAuthenticated: () => !!getToken(),
};

// ── Competitions API ──────────────────────────────────────
export const competitionsAPI = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${API_BASE}/competitions?${query}`);
    if (!response.ok) throw new Error('Failed to fetch competitions');
    return response.json();
  },

  get: async (id) => {
    const response = await apiFetch(`${API_BASE}/competitions/${id}`);
    if (!response.ok) throw new Error('Failed to fetch competition');
    return response.json();
  },

  create: async (data) => {
    const response = await apiFetch(`${API_BASE}/competitions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create competition');
    return response.json();
  },

  update: async (id, data) => {
    const response = await apiFetch(`${API_BASE}/competitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update competition');
    return response.json();
  },

  delete: async (id) => {
    const response = await apiFetch(`${API_BASE}/competitions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete competition');
    return response.json();
  },

  publish: async (id) => {
    const response = await apiFetch(`${API_BASE}/competitions/${id}/publish`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to publish competition');
    return response.json();
  },
};

// ── Teams API ─────────────────────────────────────────────
export const teamsAPI = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${API_BASE}/teams?${query}`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  },

  get: async (id) => {
    const response = await apiFetch(`${API_BASE}/teams/${id}`);
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  },

  create: async (data) => {
    const response = await apiFetch(`${API_BASE}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
  },

  join: async (id) => {
    const response = await apiFetch(`${API_BASE}/teams/${id}/join`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to join team');
    return response.json();
  },

  leave: async (id) => {
    const response = await apiFetch(`${API_BASE}/teams/${id}/leave`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to leave team');
    return response.json();
  },
};

// ── Workflows API ─────────────────────────────────────────
export const workflowsAPI = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${API_BASE}/workflows?${query}`);
    if (!response.ok) throw new Error('Failed to fetch workflows');
    return response.json();
  },

  get: async (id) => {
    const response = await apiFetch(`${API_BASE}/workflows/${id}`);
    if (!response.ok) throw new Error('Failed to fetch workflow');
    return response.json();
  },

  approve: async (id, comment = '') => {
    const response = await apiFetch(`${API_BASE}/workflows/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    if (!response.ok) throw new Error('Failed to approve');
    return response.json();
  },

  reject: async (id, comment = '') => {
    const response = await apiFetch(`${API_BASE}/workflows/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    if (!response.ok) throw new Error('Failed to reject');
    return response.json();
  },
};

// ── PrePlans API ──────────────────────────────────────────
export const prePlansAPI = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${API_BASE}/pre-plans?${query}`);
    if (!response.ok) throw new Error('Failed to fetch pre-plans');
    return response.json();
  },

  get: async (id) => {
    const response = await apiFetch(`${API_BASE}/pre-plans/${id}`);
    if (!response.ok) throw new Error('Failed to fetch pre-plan');
    return response.json();
  },

  create: async (data) => {
    const response = await apiFetch(`${API_BASE}/pre-plans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create pre-plan');
    return response.json();
  },
};

// ── Awards API ────────────────────────────────────────────
export const awardsAPI = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${API_BASE}/awards?${query}`);
    if (!response.ok) throw new Error('Failed to fetch awards');
    return response.json();
  },

  settle: async (id) => {
    const response = await apiFetch(`${API_BASE}/awards/${id}/settle`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to settle award');
    return response.json();
  },
};

// ── Evaluations API ───────────────────────────────────────
export const evaluationsAPI = {
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${API_BASE}/evaluations?${query}`);
    if (!response.ok) throw new Error('Failed to fetch evaluations');
    return response.json();
  },

  create: async (data) => {
    const response = await apiFetch(`${API_BASE}/evaluations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create evaluation');
    return response.json();
  },
};

// ── Stats API ─────────────────────────────────────────────
export const statsAPI = {
  overview: async () => {
    const response = await apiFetch(`${API_BASE}/stats/overview`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  competitions: async () => {
    const response = await apiFetch(`${API_BASE}/stats/competitions`);
    if (!response.ok) throw new Error('Failed to fetch competition stats');
    return response.json();
  },

  teachers: async () => {
    const response = await apiFetch(`${API_BASE}/stats/teachers`);
    if (!response.ok) throw new Error('Failed to fetch teacher stats');
    return response.json();
  },
};

// ── AI Tools API ──────────────────────────────────────────
export const aiToolsAPI = {
  businessPlan: async (input) => {
    const response = await apiFetch(`${AI_BASE}/tools/business-plan`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
    if (!response.ok) throw new Error('Failed to generate business plan');
    return response.json();
  },

  marketAnalysis: async (industry, targetMarket) => {
    const response = await apiFetch(`${AI_BASE}/tools/market-analysis`, {
      method: 'POST',
      body: JSON.stringify({ input: industry, extra: targetMarket }),
    });
    if (!response.ok) throw new Error('Failed to generate market analysis');
    return response.json();
  },

  improvement: async (projectDescription) => {
    const response = await apiFetch(`${AI_BASE}/tools/improvement`, {
      method: 'POST',
      body: JSON.stringify({ input: projectDescription }),
    });
    if (!response.ok) throw new Error('Failed to generate suggestions');
    return response.json();
  },

  techRoute: async (requirements, teamSkills) => {
    const response = await apiFetch(`${AI_BASE}/tools/tech-route`, {
      method: 'POST',
      body: JSON.stringify({ input: requirements, extra: teamSkills }),
    });
    if (!response.ok) throw new Error('Failed to generate tech route');
    return response.json();
  },

  resourceMatch: async (teamInfo, projectNeeds) => {
    const response = await apiFetch(`${AI_BASE}/tools/resource-match`, {
      method: 'POST',
      body: JSON.stringify({ input: teamInfo, extra: projectNeeds }),
    });
    if (!response.ok) throw new Error('Failed to generate resource plan');
    return response.json();
  },

  advisor: async (projectStatus, timeRemaining) => {
    const response = await apiFetch(`${AI_BASE}/tools/advisor`, {
      method: 'POST',
      body: JSON.stringify({ input: projectStatus, extra: timeRemaining }),
    });
    if (!response.ok) throw new Error('Failed to get advice');
    return response.json();
  },
};

// ── RAG API ───────────────────────────────────────────────
export const ragAPI = {
  query: async (question, topK = 5) => {
    const response = await apiFetch(`${AI_BASE}/rag/query`, {
      method: 'POST',
      body: JSON.stringify({ question, top_k: topK }),
    });
    if (!response.ok) throw new Error('RAG query failed');
    return response.json();
  },

  ingest: async (content, metadata = {}) => {
    const response = await apiFetch(`${AI_BASE}/rag/ingest`, {
      method: 'POST',
      body: JSON.stringify({ content, metadata }),
    });
    if (!response.ok) throw new Error('RAG ingest failed');
    return response.json();
  },

  search: async (question, topK = 5) => {
    const response = await apiFetch(`${AI_BASE}/rag/search`, {
      method: 'POST',
      body: JSON.stringify({ question, top_k: topK }),
    });
    if (!response.ok) throw new Error('RAG search failed');
    return response.json();
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/platform/api.js
git commit -m "feat: add API service layer for frontend"
```

---

## Task 2: Auth Context & Login Page

**Files:**
- Create: `frontend/platform/auth.jsx`
- Modify: `frontend/platform/app.jsx`

- [ ] **Step 1: Create auth.jsx**

```jsx
// Auth Context — manages user state and login/logout

const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Check for existing token on mount
  React.useEffect(() => {
    const initAuth = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          const data = await authAPI.getMe();
          setUser(data.user);
        } catch (e) {
          authAPI.logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const userData = await authAPI.login(username, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const value = { user, login, logout, loading, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

// ── Login Page ────────────────────────────────────────────
const LoginPage = () => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '40px',
        width: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #3370FF, #7C3AED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Ic n="layers" s={28} c="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2329', marginBottom: 8 }}>
            竞赛管理平台
          </h1>
          <p style={{ fontSize: 14, color: '#8F959E' }}>
            AI 驱动全流程管理系统
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#FFECE8',
            border: '1px solid #FDCDC8',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: '#F53F3F',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E6E8',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E6E8',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#B8BCC4' : '#3370FF',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: '16px',
          background: '#F7F8FA',
          borderRadius: 8,
          fontSize: 12,
          color: '#8F959E',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>测试账号：</div>
          <div>管理员：liuzy / password123</div>
          <div>教师：wangjg / password123</div>
          <div>学生：zhangm / password123</div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Modify app.jsx to use auth**

Replace the App component to wrap with AuthProvider and show LoginPage when not authenticated:

```jsx
// App with auth
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [role, setRole] = React.useState('admin');
  const [page, setPage] = React.useState('dashboard');
  const [pageData, setPageData] = React.useState(null);

  // Sync role with user
  React.useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const navigate = (p, data) => {
    setPage(p);
    setPageData(data || null);
  };

  const ctx = { role, setRole, page, navigate, pageData, user };
  const pageTitle = PAGE_LABELS[page] || '首页';

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard />;
      case 'competitions': return <Competitions />;
      case 'teams':        return <Teams />;
      case 'approvals':    return <Approvals />;
      case 'preplans':     return <PrePlans />;
      case 'aitools':      return <AITools />;
      case 'stats':        return <Stats />;
      case 'awards':       return <Awards />;
      case 'evaluations':  return <Evaluations />;
      case 'users':        return <UsersPage />;
      default:             return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <AppContext.Provider value={ctx}>
        <Layout pageTitle={pageTitle}>
          {renderPage()}
        </Layout>
      </AppContext.Provider>
    </ToastProvider>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/platform/auth.jsx frontend/platform/app.jsx
git commit -m "feat: add auth context and login page"
```

---

## Task 3: Update Dashboard to Use Real Data

**Files:**
- Modify: `frontend/platform/dashboard.jsx`

- [ ] **Step 1: Update DashAdmin**

Replace mock data with API calls:

```jsx
const DashAdmin = ({ navigate }) => {
  const [stats, setStats] = React.useState(null);
  const [competitions, setCompetitions] = React.useState([]);
  const [workflows, setWorkflows] = React.useState([]);
  const { user } = useAuth();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, compData, workflowData] = await Promise.all([
          statsAPI.overview(),
          competitionsAPI.list(),
          workflowsAPI.list({ tab: 'pending' }),
        ]);
        setStats(statsData);
        setCompetitions(compData.competitions || []);
        setWorkflows(workflowData.approvals || []);
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      }
    };
    fetchData();
  }, []);

  if (!stats) return <PageWrap><Spinner size={40} /></PageWrap>;

  return (
    <PageWrap>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2329', marginBottom: 4 }}>
          你好，{user?.name || '管理员'} 👋
        </div>
        <div style={{ fontSize: 13, color: '#8F959E' }}>
          共有 <span style={{ color: '#FF7D00', fontWeight: 600 }}>{workflows.length} 个</span>审批待处理
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard label="活跃赛事" value={stats.competitions} icon="trophy" accent="#3370FF"
          onClick={() => navigate('competitions')} />
        <StatCard label="参赛团队" value={stats.teams} icon="users" accent="#00B42A" />
        <StatCard label="待处理审批" value={workflows.length} icon="checksq" accent="#FF7D00"
          onClick={() => navigate('approvals')} />
        <StatCard label="已颁发奖项" value={stats.awards} icon="medal" accent="#7C3AED" />
      </div>

      {/* Rest of the dashboard with real data */}
      ...
    </PageWrap>
  );
};
```

- [ ] **Step 2: Update DashTeacher and DashStudent similarly**

- [ ] **Step 3: Commit**

```bash
git add frontend/platform/dashboard.jsx
git commit -m "feat: update dashboard to use real API data"
```

---

## Task 4: Update Competitions Page

**Files:**
- Modify: `frontend/platform/competitions.jsx`

- [ ] **Step 1: Update Competitions component**

Replace mock data with API calls:

```jsx
const Competitions = () => {
  const { navigate } = React.useContext(AppContext);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [competitions, setCompetitions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const params = {};
        if (filter !== 'all') params.status = filter;
        if (search) params.search = search;
        const data = await competitionsAPI.list(params);
        setCompetitions(data.competitions || []);
      } catch (e) {
        console.error('Failed to fetch competitions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitions();
  }, [filter, search]);

  if (selected) return <CompDetail comp={selected} onBack={() => setSelected(null)} />;

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  // Rest of the component uses competitions state instead of mockData
  ...
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/platform/competitions.jsx
git commit -m "feat: update competitions page to use real API"
```

---

## Task 5: Update Approvals Page

**Files:**
- Modify: `frontend/platform/approvals.jsx`

- [ ] **Step 1: Update Approvals component**

Replace mock data with API calls:

```jsx
const Approvals = () => {
  const { role } = React.useContext(AppContext);
  const [tab, setTab] = React.useState('pending');
  const [selected, setSelected] = React.useState(null);
  const [approvals, setApprovals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const data = await workflowsAPI.list({ tab });
        setApprovals(data.approvals || []);
      } catch (e) {
        console.error('Failed to fetch approvals:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, [tab]);

  const handleAction = async (id, action, comment) => {
    try {
      if (action === 'approve') {
        await workflowsAPI.approve(id, comment);
      } else {
        await workflowsAPI.reject(id, comment);
      }
      // Refresh list
      const data = await workflowsAPI.list({ tab });
      setApprovals(data.approvals || []);
    } catch (e) {
      console.error('Failed to process approval:', e);
    }
  };

  // Rest of the component
  ...
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/platform/approvals.jsx
git commit -m "feat: update approvals page to use real API"
```

---

## Task 6: Update Remaining Pages

**Files:**
- Modify: `frontend/platform/preplans.jsx`
- Modify: `frontend/platform/records.jsx`
- Modify: `frontend/platform/stats.jsx`
- Modify: `frontend/platform/aitools.jsx`

- [ ] **Step 1: Update preplans.jsx**

Replace mock data with prePlansAPI calls.

- [ ] **Step 2: Update records.jsx**

Replace mock data with teamsAPI, awardsAPI, evaluationsAPI calls.

- [ ] **Step 3: Update stats.jsx**

Replace mock data with statsAPI calls.

- [ ] **Step 4: Update aitools.jsx**

Replace simulated streaming with real aiToolsAPI calls.

- [ ] **Step 5: Commit**

```bash
git add frontend/platform/preplans.jsx frontend/platform/records.jsx frontend/platform/stats.jsx frontend/platform/aitools.jsx
git commit -m "feat: update remaining pages to use real API"
```

---

## Task 7: Update index.html

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Add auth.jsx script tag**

Add the auth.jsx script before app.jsx:

```html
<script type="text/babel" data-presets="react" src="platform/api.js"></script>
<script type="text/babel" data-presets="react" src="platform/auth.jsx"></script>
<script type="text/babel" data-presets="react" src="platform/data.jsx"></script>
<!-- ... other scripts ... -->
<script type="text/babel" data-presets="react" src="platform/app.jsx"></script>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "feat: add api.js and auth.jsx to index.html"
```

---

## Summary

This plan integrates the React frontend with the Go backend:

1. **API Service Layer** — Centralized API calls with auth token management
2. **Auth Context** — Login/logout state management
3. **Login Page** — Beautiful login UI with test account hints
4. **Dashboard** — Real-time stats from backend
5. **All Pages** — Competitions, approvals, preplans, teams, awards, evaluations, stats, AI tools

After implementation, the frontend will be fully functional with real data from the Go backend.
