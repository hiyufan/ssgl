// ══════════════════════════════════════════════════════════════
// STUDENT DASHBOARD — Modern Minimalist SaaS Design
// Light theme, Bento Grid, soft shadows, Electric Blue accent
// ══════════════════════════════════════════════════════════════
const useAuth = window.useAuth;

// ── Inject styles ─────────────────────────────────────────
const _saasStyles = document.createElement('style');
_saasStyles.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .saas-dash {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
    background: #F8F9FB;
    position: relative;
    padding: 0;
  }

  /* Subtle dot-grid background */
  .saas-dash::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: radial-gradient(circle, #d4d8e0 0.8px, transparent 0.8px);
    background-size: 24px 24px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.5;
  }

  .saas-content {
    position: relative;
    z-index: 1;
    padding: 32px;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Bento Grid */
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 20px;
  }

  /* White card base */
  .saas-card {
    background: #fff;
    border-radius: 20px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.02);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }
  .saas-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04);
    transform: translateY(-2px);
  }

  /* Stagger animation */
  .saas-stagger {
    opacity: 0;
    transform: translateY(16px);
    animation: saasFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes saasFadeIn {
    to { opacity: 1; transform: translateY(0); }
  }

  /* Pulse dot */
  .saas-pulse {
    animation: saasPulse 2s ease-in-out infinite;
  }
  @keyframes saasPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Progress ring animation */
  .saas-ring {
    animation: saasRingDraw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes saasRingDraw {
    from { stroke-dashoffset: 283; }
  }

  /* Scrollbar */
  .saas-dash::-webkit-scrollbar { width: 6px; }
  .saas-dash::-webkit-scrollbar-track { background: transparent; }
  .saas-dash::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
  .saas-dash::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.14); }

  /* Dashed connector line for app integration */
  .dash-connector {
    border-top: 2px dashed #d4d8e0;
    flex: 1;
    min-width: 20px;
  }
`;
document.head.appendChild(_saasStyles);


// ── Animated Counter ──────────────────────────────────────
const AnimatedNumber = ({ value, duration = 1000, suffix = '' }) => {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const num = parseInt(value) || 0;
    if (num === 0) { setDisplay(0); return; }
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * num));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display}{suffix}</span>;
};


// ── Progress Ring ─────────────────────────────────────────
const ProgressRing = ({ value, max = 100, size = 80, strokeWidth = 8, color1, color2 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const gradientId = `ring-${color1.replace('#', '')}-${color2.replace('#', '')}`;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#F0F1F3" strokeWidth={strokeWidth}
      />
      <circle
        className="saas-ring"
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
};


// ── Mini Line Chart (SVG) ─────────────────────────────────
const MiniAreaChart = ({ data, width = 300, height = 120, color = '#7C3AED' }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padY = 10;
  const usableH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + usableH - ((v - min) / range) * usableH;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};


// ── App Icon (for integration section) ────────────────────
const AppIcon = ({ name, color, bg, icon }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        transition: 'transform 0.2s',
        transform: hov ? 'translateY(-4px)' : 'none',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: hov ? '0 6px 20px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
        fontSize: 22, fontWeight: 700, color: '#fff',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{name}</span>
    </div>
  );
};


// ── Team Member Card ──────────────────────────────────────
const TeamMemberCard = ({ name, role, avatar, idx = 0 }) => {
  const colors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626'];
  const bg = colors[idx % colors.length];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderRadius: 12, background: '#F8F9FB', transition: 'background 0.2s',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `linear-gradient(135deg, ${bg}, ${bg}99)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>
        {avatar || name?.[0] || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>{name}</div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>{role}</div>
      </div>
    </div>
  );
};


// ── Stat Data Card (big number + ring) ────────────────────
const StatDataCard = ({ value, label, growth, color1, color2, delay = 0 }) => {
  return (
    <div className="saas-stagger" style={{
      animationDelay: `${delay}ms`,
      background: '#fff',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.02)',
      padding: 24,
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ProgressRing value={value} max={300} size={72} strokeWidth={7} color1={color1} color2={color2} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 10, fontWeight: 700, color: '#6B7280',
        }}>
          {Math.round((value / 300) * 100)}%
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 36, fontWeight: 900, color: '#111111', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px',
        }}>
          <AnimatedNumber value={value} />
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{label}</div>
        {growth !== undefined && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            marginTop: 6, fontSize: 12, fontWeight: 600,
            color: growth >= 0 ? '#059669' : '#DC2626',
            background: growth >= 0 ? '#ECFDF5' : '#FEF2F2',
            padding: '2px 8px', borderRadius: 99,
          }}>
            {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
          </div>
        )}
      </div>
    </div>
  );
};


// ── Main Student Dashboard ────────────────────────────────
const DashStudentRedesign = ({ navigate }) => {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = React.useState([]);
  const [myPlans, setMyPlans] = React.useState([]);
  const [myAwards, setMyAwards] = React.useState([]);
  const [competitions, setCompetitions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, plansRes, awardsRes, compRes] = await Promise.all([
          teamsAPI.list(),
          prePlansAPI.list(),
          awardsAPI.list(),
          competitionsAPI.list({ status: 'published' }),
        ]);
        setMyTeams(teamsRes.teams || []);
        setMyPlans(plansRes.pre_plans || plansRes.plans || []);
        setMyAwards(awardsRes.awards || []);
        setCompetitions(compRes.competitions || []);
      } catch (e) {
        console.error('DashStudent fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="saas-dash" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid #E5E6E8', borderTopColor: '#2563EB',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <div style={{ color: '#6B7280', fontSize: 14 }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const myTeam = myTeams[0] || null;
  const myComp = myTeam?.competition || null;
  const myPlan = myPlans[0] || null;
  const myAward = myAwards[0] || null;
  const planStatus = myPlan?.status;

  // Chart data (registrations over time — simulated)
  const chartData = [12, 28, 35, 52, 48, 65, 78, 92, 86, 105, 118, 134];

  return (
    <div className="saas-dash">
      <div className="saas-content">

        {/* ═══ Row 1: Welcome + Quick Stats ═══ */}
        <div className="bento-grid" style={{ marginBottom: 20 }}>

          {/* Welcome Card — spans 8 cols */}
          <div
            className="saas-stagger saas-card"
            style={{
              gridColumn: 'span 8',
              padding: '36px 40px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #1E40AF 100%)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 200, height: 200, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }} />
            <div style={{
              position: 'absolute', bottom: -60, right: 80,
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.15)', borderRadius: 99,
                padding: '5px 14px', marginBottom: 16,
              }}>
                <div className="saas-pulse" style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#4ADE80', boxShadow: '0 0 8px #4ADE80',
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                  {myTeam ? 'Competition Active' : 'Ready to Start'}
                </span>
              </div>

              <h1 style={{
                fontSize: 32, fontWeight: 800, color: '#fff',
                lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.5px',
              }}>
                Start managing your tournament!
              </h1>
              <p style={{
                fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6,
                maxWidth: 480, marginBottom: 24,
              }}>
                {myComp
                  ? `You're registered for ${myComp.title}. Track your progress and stay on top of deadlines.`
                  : 'Browse open competitions, register your team, and submit your pre-plan to get started.'}
              </p>

              <button
                onClick={() => navigate('competitions')}
                style={{
                  background: '#fff', color: '#2563EB', border: 'none',
                  borderRadius: 99, padding: '10px 24px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
              >
                + Add new tournament
              </button>
            </div>
          </div>

          {/* Days Left / Countdown — spans 4 cols */}
          <div className="saas-stagger saas-card" style={{
            gridColumn: 'span 4',
            padding: 32,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animationDelay: '100ms',
          }}>
            {myComp ? (
              <>
                <div style={{
                  fontSize: 56, fontWeight: 900, color: '#111111',
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-2px',
                }}>
                  <AnimatedNumber value={Math.max(0, Math.ceil((new Date(myComp.end_date) - new Date()) / 86400000))} />
                </div>
                <div style={{
                  fontSize: 13, color: '#6B7280', marginTop: 8,
                  fontWeight: 500,
                }}>
                  days until deadline
                </div>
                <div style={{
                  marginTop: 16, fontSize: 12, color: '#2563EB',
                  background: '#EFF6FF', padding: '4px 12px', borderRadius: 99,
                  fontWeight: 600,
                }}>
                  {myComp.title?.length > 20 ? myComp.title.slice(0, 20) + '...' : myComp.title}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>No Active Event</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Browse competitions to get started</div>
              </>
            )}
          </div>
        </div>

        {/* ═══ Row 2: App Integration + Team ═══ */}
        <div className="bento-grid" style={{ marginBottom: 20 }}>

          {/* App Integration — spans 5 cols */}
          <div className="saas-stagger saas-card" style={{
            gridColumn: 'span 5',
            padding: 28,
            animationDelay: '200ms',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#6B7280',
              letterSpacing: '1px', textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              Sync your apps
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, flexWrap: 'wrap',
            }}>
              <AppIcon name="WeChat" bg="#07C160" icon="微" />
              <div className="dash-connector" />
              <AppIcon name="DingTalk" bg="#0089FF" icon="钉" />
              <div className="dash-connector" />
              <AppIcon name="WeCom" bg="#1AAD19" icon="企" />
              <div className="dash-connector" />
              <AppIcon name="Excel" bg="#217346" icon="X" />
              <div className="dash-connector" />
              <AppIcon name="More" bg="#6B7280" icon="+" />
            </div>
          </div>

          {/* Team Card — spans 7 cols */}
          <div className="saas-stagger saas-card" style={{
            gridColumn: 'span 7',
            padding: 28,
            animationDelay: '300ms',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#6B7280',
                  letterSpacing: '1px', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Your Team
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111111' }}>
                  {myTeam ? myTeam.name : 'No team yet'}
                </div>
              </div>
              {myTeam && (
                <div style={{
                  background: '#EFF6FF', color: '#2563EB',
                  padding: '4px 12px', borderRadius: 99,
                  fontSize: 12, fontWeight: 600,
                }}>
                  {myTeam.members?.length || 0} members
                </div>
              )}
            </div>

            {myTeam?.members?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {myTeam.members.slice(0, 6).map((m, i) => (
                  <TeamMemberCard
                    key={m.id || i}
                    name={m.name || m.user?.name || 'Member'}
                    role={m.role === 'leader' ? 'Team Leader' : 'Member'}
                    idx={i}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '24px 0',
                color: '#9CA3AF', fontSize: 13,
              }}>
                Join a competition to form your team
              </div>
            )}
          </div>
        </div>

        {/* ═══ Row 3: Chart + Quick Actions ═══ */}
        <div className="bento-grid" style={{ marginBottom: 20 }}>

          {/* Statistics Chart — spans 8 cols */}
          <div className="saas-stagger saas-card" style={{
            gridColumn: 'span 8',
            padding: 28,
            animationDelay: '400ms',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#6B7280',
                  letterSpacing: '1px', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Registration Trends
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111111' }}>
                  <AnimatedNumber value={134} /> <span style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>total registrations</span>
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 6,
              }}>
                {['1W', '1M', '3M'].map(t => (
                  <div key={t} style={{
                    padding: '4px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: t === '1M' ? '#2563EB' : 'transparent',
                    color: t === '1M' ? '#fff' : '#6B7280',
                    transition: 'all 0.2s',
                  }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <MiniAreaChart data={chartData} width={680} height={140} color="#7C3AED" />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 12,
              fontSize: 11, color: '#9CA3AF',
            }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* Quick Actions — spans 4 cols */}
          <div className="saas-stagger saas-card" style={{
            gridColumn: 'span 4',
            padding: 28,
            animationDelay: '500ms',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#6B7280',
              letterSpacing: '1px', textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: 'file', label: 'Pre-Plan', sub: planStatus === 'approved' ? 'Approved' : planStatus === 'submitted' ? 'Under Review' : 'Draft your plan', accent: '#7C3AED', page: 'preplans' },
                { icon: 'sparkle', label: 'AI Toolbox', sub: '6 intelligent tools', accent: '#2563EB', page: 'aitools' },
                { icon: 'trophy', label: 'Competitions', sub: `${competitions.length} open`, accent: '#D97706', page: 'competitions' },
                { icon: 'star', label: 'Evaluate', sub: 'Rate your mentor', accent: '#059669', page: 'evaluations' },
              ].map((a, i) => (
                <QuickActionRow key={i} {...a} delay={i * 60} onClick={() => navigate(a.page)} />
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Row 4: Stats Data Cards ═══ */}
        <div className="bento-grid" style={{ marginBottom: 20 }}>
          <div style={{ gridColumn: 'span 6' }}>
            <StatDataCard
              value={84}
              label="New Competitions"
              growth={39}
              color1="#7C3AED"
              color2="#A78BFA"
              delay={600}
            />
          </div>
          <div style={{ gridColumn: 'span 6' }}>
            <StatDataCard
              value={262}
              label="New Registrations"
              growth={4.3}
              color1="#F97316"
              color2="#FB923C"
              delay={700}
            />
          </div>
        </div>

        {/* ═══ Row 5: Open Competitions + Update ═══ */}
        <div className="bento-grid">

          {/* Open Competitions — spans 8 cols */}
          {competitions.length > 0 && (
            <div className="saas-stagger saas-card" style={{
              gridColumn: 'span 8',
              padding: 28,
              animationDelay: '800ms',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#6B7280',
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  Open Competitions
                </div>
                <button
                  onClick={() => navigate('competitions')}
                  style={{
                    background: 'none', border: 'none',
                    color: '#2563EB', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View all →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {competitions.slice(0, 4).map((c, i) => (
                  <CompetitionRow key={c.id} comp={c} onNavigate={navigate} delay={i * 80} />
                ))}
              </div>
            </div>
          )}

          {/* Update Card — spans 4 cols */}
          <div className="saas-stagger saas-card" style={{
            gridColumn: competitions.length > 0 ? 'span 4' : 'span 12',
            padding: 28,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            animationDelay: '900ms',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
            border: '1px solid rgba(37, 99, 235, 0.1)',
          }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#DBEAFE', borderRadius: 99,
                padding: '4px 10px', marginBottom: 16,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB' }}>New Version</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111111', marginBottom: 6 }}>
                Platform Update v2.4
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                New AI analysis tools, improved team collaboration features, and performance optimizations.
              </div>
            </div>
            <button
              style={{
                marginTop: 20, background: '#2563EB', color: '#fff',
                border: 'none', borderRadius: 12, padding: '10px 20px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
                alignSelf: 'flex-start',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'none'; }}
            >
              Update Now
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


// ── Quick Action Row ──────────────────────────────────────
const QuickActionRow = ({ icon, label, sub, accent, onClick, delay = 0 }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
        background: hov ? '#F8F9FB' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${accent}12`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'transform 0.2s',
        transform: hov ? 'scale(1.1)' : 'none',
      }}>
        <Ic n={icon} s={18} c={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111111' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>{sub}</div>
      </div>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{
          opacity: hov ? 1 : 0, transform: hov ? 'translateX(0)' : 'translateX(-4px)',
          transition: 'all 0.2s',
        }}
      >
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  );
};


// ── Competition Row ───────────────────────────────────────
const CompetitionRow = ({ comp, onNavigate, delay = 0 }) => {
  const [hov, setHov] = React.useState(false);
  const deadline = comp.registration_deadline?.split('T')[0] || 'TBD';
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onNavigate('competitions')}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
        background: hov ? '#F8F9FB' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Ic n="trophy" s={18} c="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#111111',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {comp.title}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
          Deadline: {deadline}
          {comp.prize ? ` · ${comp.prize}` : ''}
        </div>
      </div>
      <button
        style={{
          background: hov ? '#2563EB' : '#EFF6FF',
          color: hov ? '#fff' : '#2563EB',
          border: 'none', borderRadius: 10, padding: '7px 16px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s', flexShrink: 0, fontFamily: 'inherit',
        }}
      >
        Register
      </button>
    </div>
  );
};


Object.assign(window, { DashStudentRedesign });
