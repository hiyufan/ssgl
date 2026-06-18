// Showcase & Leaderboard — Award winners display + team rankings

const ShowcasePage = () => {
  const [showcase, setShowcase] = React.useState([]);
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('showcase');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [showRes, leaderRes] = await Promise.all([
          showcaseAPI.list().catch(() => ({ awards: [] })),
          leaderboardAPI.list().catch(() => ({ teams: [] })),
        ]);
        setShowcase(showRes.awards || []);
        setLeaderboard(leaderRes.teams || []);
      } catch (e) {
        console.error('Showcase fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFFBE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="trophy" s={18} c="#FAAD14"/>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2329' }}>成果展示</div>
            <div style={{ fontSize: 12, color: '#8F959E' }}>获奖团队风采 · 团队排行榜</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid #E5E6E8', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {[
          ['showcase', '成果展示', 'trophy'],
          ['leaderboard', '团队排行', 'barchart'],
        ].map(([k, l, icon]) => (
          <div key={k} onClick={() => setTab(k)} style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            fontWeight: tab === k ? 600 : 400,
            background: tab === k ? '#FAAD14' : 'transparent',
            color: tab === k ? '#fff' : '#646A73',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all .15s',
          }}>
            <Ic n={icon} s={13} c={tab === k ? '#fff' : '#8F959E'}/>{l}
          </div>
        ))}
      </div>

      {/* Showcase */}
      {tab === 'showcase' && (
        <div>
          {showcase.length === 0 ? (
            <Empty text="暂无获奖成果" sub="赛事结算后获奖信息将在此展示"/>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {showcase.map((award, i) => (
                <Card key={award.id || i} hover style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Top accent bar */}
                  <div style={{
                    height: 4,
                    background: i < 3 ? `linear-gradient(90deg, ${rankColors[i]}, ${rankColors[i]}88)` : 'linear-gradient(90deg, #E5E6E8, #E5E6E888)',
                  }}></div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 24 }}>{rankEmojis[award.rank - 1] || '🏆'}</span>
                      <Badge label={award.rank_name || `第${award.rank}名`} status={award.rank <= 3 ? 'approved' : 'active'} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2329', marginBottom: 6 }}>{award.team_name || award.teamName}</div>
                    <div style={{ fontSize: 12, color: '#8F959E', marginBottom: 10 }}>{award.competition_title || award.compName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#646A73' }}>👤 {award.leader_name || award.leader}</span>
                      {award.prize_amount && (
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#FAAD14' }}>¥{award.prize_amount?.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            cols={[
              { key: '_rank', title: '排名', width: 70, render: (_, __, idx) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {idx < 3 ? (
                    <span style={{ fontSize: 20 }}>{rankEmojis[idx]}</span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#8F959E' }}>#{idx + 1}</span>
                  )}
                </div>
              )},
              { key: 'name', title: '团队', render: (v, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, ${['#3370FF','#7C3AED','#00B42A','#FF7D00','#E11D48'][row._rank % 5]}, ${['#3370FF','#7C3AED','#00B42A','#FF7D00','#E11D48'][row._rank % 5]}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                  }}>
                    {v?.[0] || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>{v}</div>
                    <div style={{ fontSize: 11, color: '#8F959E' }}>{row.competition_title || row.compName || ''}</div>
                  </div>
                </div>
              )},
              { key: 'score', title: '综合评分', render: v => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 60, height: 6, background: '#F0F1F3', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(v || 0, 100)}%`, height: '100%', background: '#3370FF', borderRadius: 3, transition: 'width .5s ease' }}></div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>{v || '-'}</span>
                </div>
              )},
              { key: 'award_count', title: '获奖数', render: v => <span style={{ fontWeight: 600 }}>{v || 0}</span> },
              { key: 'member_count', title: '成员数', render: v => <span style={{ color: '#8F959E' }}>{v || '-'}</span> },
            ]}
            rows={leaderboard.map((t, i) => ({ ...t, _rank: i }))}
          />
          {leaderboard.length === 0 && <Empty text="暂无排行数据"/>}
        </Card>
      )}
    </PageWrap>
  );
};

Object.assign(window, { ShowcasePage });
