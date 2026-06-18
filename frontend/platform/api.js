// API Service Layer — connects React frontend to Go backend and AI service
// Backend:  http://localhost:8080/api/v1
// AI:       http://localhost:8000/ai/api/v1

const API_BASE = 'http://localhost:8080/api/v1';
const AI_BASE  = 'http://localhost:8000/ai/api/v1';

// ── Token Management ──────────────────────────────────────

const getToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

const setTokens = (tokens) => {
  if (tokens.access_token) localStorage.setItem('access_token', tokens.access_token);
  if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// ── Token Refresh ─────────────────────────────────────────

let refreshPromise = null; // deduplicate concurrent refresh calls

const refreshTokens = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return false;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data);
    return true;
  } catch {
    clearTokens();
    return false;
  }
};

// ── Base Fetch Wrapper ────────────────────────────────────

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(url, { ...options, headers });

  // Handle 401 — try refreshing token once, then retry
  if (res.status === 401) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => { refreshPromise = null; });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      const newToken = getToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
};

// ── Helper: build URL with query params ───────────────────

const buildUrl = (base, path, params) => {
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }
  return url.toString();
};

// ── Helper: standard JSON request ─────────────────────────

const jsonRequest = (method, body) => ({
  method,
  body: body ? JSON.stringify(body) : undefined,
});

// ── Auth API ──────────────────────────────────────────────

const authAPI = {
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const data = await res.json();
    // Backend returns { tokens: { access_token, refresh_token }, user: {...} }
    if (data.tokens) setTokens(data.tokens);
    return data;
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error(`Register failed: ${res.status}`);
    return res.json();
  },

  getMe: async () => {
    const res = await apiFetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error(`GetMe failed: ${res.status}`);
    return res.json();
  },

  logout: async () => {
    try {
      await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } finally {
      clearTokens();
    }
  },

  isAuthenticated: () => !!getToken(),
};

// ── Competitions API ──────────────────────────────────────

const competitionsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/competitions', params));
    if (!res.ok) throw new Error(`List competitions failed: ${res.status}`);
    return res.json();
  },

  get: async (id) => {
    const res = await apiFetch(`${API_BASE}/competitions/${id}`);
    if (!res.ok) throw new Error(`Get competition failed: ${res.status}`);
    return res.json();
  },

  create: async (data) => {
    const res = await apiFetch(`${API_BASE}/competitions`, jsonRequest('POST', data));
    if (!res.ok) throw new Error(`Create competition failed: ${res.status}`);
    return res.json();
  },

  update: async (id, data) => {
    const res = await apiFetch(`${API_BASE}/competitions/${id}`, jsonRequest('PUT', data));
    if (!res.ok) throw new Error(`Update competition failed: ${res.status}`);
    return res.json();
  },

  delete: async (id) => {
    const res = await apiFetch(`${API_BASE}/competitions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Delete competition failed: ${res.status}`);
    return res.json();
  },

  publish: async (id) => {
    const res = await apiFetch(`${API_BASE}/competitions/${id}/publish`, { method: 'POST' });
    if (!res.ok) throw new Error(`Publish competition failed: ${res.status}`);
    return res.json();
  },
};

// ── Teams API ─────────────────────────────────────────────

const teamsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/teams', params));
    if (!res.ok) throw new Error(`List teams failed: ${res.status}`);
    return res.json();
  },

  get: async (id) => {
    const res = await apiFetch(`${API_BASE}/teams/${id}`);
    if (!res.ok) throw new Error(`Get team failed: ${res.status}`);
    return res.json();
  },

  create: async (data) => {
    const res = await apiFetch(`${API_BASE}/teams`, jsonRequest('POST', data));
    if (!res.ok) throw new Error(`Create team failed: ${res.status}`);
    return res.json();
  },

  join: async (teamId) => {
    const res = await apiFetch(`${API_BASE}/teams/${teamId}/join`, { method: 'POST' });
    if (!res.ok) throw new Error(`Join team failed: ${res.status}`);
    return res.json();
  },

  leave: async (teamId) => {
    const res = await apiFetch(`${API_BASE}/teams/${teamId}/leave`, { method: 'POST' });
    if (!res.ok) throw new Error(`Leave team failed: ${res.status}`);
    return res.json();
  },
};

// ── Workflows API ─────────────────────────────────────────

const workflowsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/workflows', params));
    if (!res.ok) throw new Error(`List workflows failed: ${res.status}`);
    return res.json();
  },

  get: async (id) => {
    const res = await apiFetch(`${API_BASE}/workflows/${id}`);
    if (!res.ok) throw new Error(`Get workflow failed: ${res.status}`);
    return res.json();
  },

  approve: async (id, comment) => {
    const res = await apiFetch(`${API_BASE}/workflows/${id}/approve`, jsonRequest('POST', { comment }));
    if (!res.ok) throw new Error(`Approve workflow failed: ${res.status}`);
    return res.json();
  },

  reject: async (id, comment) => {
    const res = await apiFetch(`${API_BASE}/workflows/${id}/reject`, jsonRequest('POST', { comment }));
    if (!res.ok) throw new Error(`Reject workflow failed: ${res.status}`);
    return res.json();
  },
};

// ── Pre-Plans API ─────────────────────────────────────────

const prePlansAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/pre-plans', params));
    if (!res.ok) throw new Error(`List pre-plans failed: ${res.status}`);
    return res.json();
  },

  get: async (id) => {
    const res = await apiFetch(`${API_BASE}/pre-plans/${id}`);
    if (!res.ok) throw new Error(`Get pre-plan failed: ${res.status}`);
    return res.json();
  },

  create: async (data) => {
    const res = await apiFetch(`${API_BASE}/pre-plans`, jsonRequest('POST', data));
    if (!res.ok) throw new Error(`Create pre-plan failed: ${res.status}`);
    return res.json();
  },
};

// ── Awards API ────────────────────────────────────────────

const awardsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/awards', params));
    if (!res.ok) throw new Error(`List awards failed: ${res.status}`);
    return res.json();
  },

  settle: async (id) => {
    const res = await apiFetch(`${API_BASE}/awards/${id}/settle`, { method: 'POST' });
    if (!res.ok) throw new Error(`Settle award failed: ${res.status}`);
    return res.json();
  },
};

// ── Evaluations API ───────────────────────────────────────

const evaluationsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/evaluations', params));
    if (!res.ok) throw new Error(`List evaluations failed: ${res.status}`);
    return res.json();
  },

  create: async (data) => {
    const res = await apiFetch(`${API_BASE}/evaluations`, jsonRequest('POST', data));
    if (!res.ok) throw new Error(`Create evaluation failed: ${res.status}`);
    return res.json();
  },
};

// ── Stats API ─────────────────────────────────────────────

const statsAPI = {
  overview: async () => {
    const res = await apiFetch(`${API_BASE}/stats/overview`);
    if (!res.ok) throw new Error(`Get stats overview failed: ${res.status}`);
    return res.json();
  },

  competitions: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/stats/competitions', params));
    if (!res.ok) throw new Error(`Get competition stats failed: ${res.status}`);
    return res.json();
  },

  teachers: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/stats/teachers', params));
    if (!res.ok) throw new Error(`Get teacher stats failed: ${res.status}`);
    return res.json();
  },
};

// ── AI Tools API ──────────────────────────────────────────

const aiToolsAPI = {
  businessPlan: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/business-plan`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Business plan generation failed: ${res.status}`);
    return res.json();
  },

  marketAnalysis: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/market-analysis`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Market analysis failed: ${res.status}`);
    return res.json();
  },

  improvement: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/improvement`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Improvement suggestions failed: ${res.status}`);
    return res.json();
  },

  techRoute: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/tech-route`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Tech route suggestion failed: ${res.status}`);
    return res.json();
  },

  resourceMatch: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/resource-match`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Resource matching failed: ${res.status}`);
    return res.json();
  },

  advisor: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/advisor`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`AI advisor failed: ${res.status}`);
    return res.json();
  },

  pitchDeck: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/pitch-deck`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Pitch deck failed: ${res.status}`);
    return res.json();
  },

  swotAnalysis: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/swot-analysis`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`SWOT analysis failed: ${res.status}`);
    return res.json();
  },

  competitionReport: async (params) => {
    const res = await apiFetch(`${AI_BASE}/tools/competition-report`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Competition report failed: ${res.status}`);
    return res.json();
  },
};

// ── RAG API ───────────────────────────────────────────────

const ragAPI = {
  query: async (params) => {
    const res = await apiFetch(`${AI_BASE}/rag/query`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`RAG query failed: ${res.status}`);
    return res.json();
  },

  ingest: async (params) => {
    const res = await apiFetch(`${AI_BASE}/rag/ingest`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`RAG ingest failed: ${res.status}`);
    return res.json();
  },

  search: async (params) => {
    const res = await apiFetch(`${AI_BASE}/rag/search`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`RAG search failed: ${res.status}`);
    return res.json();
  },
};

// ── Calendar API ─────────────────────────────────────────

const calendarAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/calendar', params));
    if (!res.ok) throw new Error(`List calendar failed: ${res.status}`);
    return res.json();
  },

  exportICS: async () => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/calendar/export`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Export ICS failed: ${res.status}`);
    return res.text();
  },
};

// ── Showcase API ─────────────────────────────────────────

const showcaseAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/showcase', params));
    if (!res.ok) throw new Error(`List showcase failed: ${res.status}`);
    return res.json();
  },
};

// ── Leaderboard API ──────────────────────────────────────

const leaderboardAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/leaderboard', params));
    if (!res.ok) throw new Error(`List leaderboard failed: ${res.status}`);
    return res.json();
  },
};

// ── Notifications API ────────────────────────────────────

const notificationsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/notifications', params));
    if (!res.ok) throw new Error(`List notifications failed: ${res.status}`);
    return res.json();
  },

  unreadCount: async () => {
    const res = await apiFetch(`${API_BASE}/notifications/unread-count`);
    if (!res.ok) throw new Error(`Unread count failed: ${res.status}`);
    return res.json();
  },

  markRead: async (id) => {
    const res = await apiFetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' });
    if (!res.ok) throw new Error(`Mark read failed: ${res.status}`);
    return res.json();
  },

  markAllRead: async () => {
    const res = await apiFetch(`${API_BASE}/notifications/read-all`, { method: 'POST' });
    if (!res.ok) throw new Error(`Mark all read failed: ${res.status}`);
    return res.json();
  },
};

// ── Favorites API ────────────────────────────────────────

const favoritesAPI = {
  list: async () => {
    const res = await apiFetch(`${API_BASE}/favorites`);
    if (!res.ok) throw new Error(`List favorites failed: ${res.status}`);
    return res.json();
  },

  toggle: async (compId) => {
    const res = await apiFetch(`${API_BASE}/favorites/${compId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Toggle favorite failed: ${res.status}`);
    return res.json();
  },

  check: async (compId) => {
    const res = await apiFetch(`${API_BASE}/favorites/${compId}/check`);
    if (!res.ok) throw new Error(`Check favorite failed: ${res.status}`);
    return res.json();
  },
};

// ── Registrations API ────────────────────────────────────

const registrationsAPI = {
  list: async (params) => {
    const res = await apiFetch(buildUrl(API_BASE, '/registrations', params));
    if (!res.ok) throw new Error(`List registrations failed: ${res.status}`);
    return res.json();
  },

  register: async (compId) => {
    const res = await apiFetch(`${API_BASE}/competitions/${compId}/register`, { method: 'POST' });
    if (!res.ok) throw new Error(`Register failed: ${res.status}`);
    return res.json();
  },

  deregister: async (compId) => {
    const res = await apiFetch(`${API_BASE}/competitions/${compId}/register`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Deregister failed: ${res.status}`);
    return res.json();
  },
};

// ── Milestones API ───────────────────────────────────────

const milestonesAPI = {
  list: async (compId) => {
    const res = await apiFetch(`${API_BASE}/competitions/${compId}/milestones`);
    if (!res.ok) throw new Error(`List milestones failed: ${res.status}`);
    return res.json();
  },

  create: async (data) => {
    const res = await apiFetch(`${API_BASE}/milestones`, jsonRequest('POST', data));
    if (!res.ok) throw new Error(`Create milestone failed: ${res.status}`);
    return res.json();
  },

  update: async (id, data) => {
    const res = await apiFetch(`${API_BASE}/milestones/${id}`, jsonRequest('PUT', data));
    if (!res.ok) throw new Error(`Update milestone failed: ${res.status}`);
    return res.json();
  },

  delete: async (id) => {
    const res = await apiFetch(`${API_BASE}/milestones/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Delete milestone failed: ${res.status}`);
    return res.json();
  },
};

// ── Coach API ────────────────────────────────────────────

const coachAPI = {
  start: async (params) => {
    const res = await apiFetch(`${AI_BASE}/coach/start`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`Coach start failed: ${res.status}`);
    return res.json();
  },
};

// ── RAG Document Management API ──────────────────────────

const ragDocsAPI = {
  list: async () => {
    const res = await apiFetch(`${AI_BASE}/rag/documents`);
    if (!res.ok) throw new Error(`List RAG docs failed: ${res.status}`);
    return res.json();
  },

  ingest: async (params) => {
    const res = await apiFetch(`${AI_BASE}/rag/ingest`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`RAG ingest failed: ${res.status}`);
    return res.json();
  },

  upload: async (formData) => {
    const token = getToken();
    const res = await fetch(`${AI_BASE}/rag/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`RAG upload failed: ${res.status}`);
    return res.json();
  },

  search: async (params) => {
    const res = await apiFetch(`${AI_BASE}/rag/search`, jsonRequest('POST', params));
    if (!res.ok) throw new Error(`RAG search failed: ${res.status}`);
    return res.json();
  },

  stats: async () => {
    const res = await apiFetch(`${AI_BASE}/rag/stats`);
    if (!res.ok) throw new Error(`RAG stats failed: ${res.status}`);
    return res.json();
  },

  delete: async (docId) => {
    const res = await apiFetch(`${AI_BASE}/rag/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`RAG delete failed: ${res.status}`);
    return res.json();
  },
};

// ── Export to window (consistent with existing pattern) ───

Object.assign(window, {
  // Token management
  getToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  // Base fetch
  apiFetch,
  // API objects
  authAPI,
  competitionsAPI,
  teamsAPI,
  workflowsAPI,
  prePlansAPI,
  awardsAPI,
  evaluationsAPI,
  statsAPI,
  aiToolsAPI,
  ragAPI,
  calendarAPI,
  showcaseAPI,
  leaderboardAPI,
  notificationsAPI,
  favoritesAPI,
  registrationsAPI,
  milestonesAPI,
  coachAPI,
  ragDocsAPI,
});
