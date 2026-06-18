// Calendar — Monthly view of competition events + iCal export

const CalendarPage = () => {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = React.useState(null);

  React.useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await calendarAPI.list({ month: currentMonth });
        setEvents(res.events || []);
      } catch (e) {
        console.error('Calendar fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [currentMonth]);

  const exportICS = async () => {
    try {
      const ics = await calendarAPI.exportICS();
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ssgl-competitions.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('ICS export error:', e);
    }
  };

  const [year, month] = currentMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Group events by day
  const eventsByDay = {};
  events.forEach(ev => {
    const day = new Date(ev.date).getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  });

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const phaseColors = {
    registration: '#3370FF',
    start: '#00B42A',
    end: '#FF7D00',
    deadline: '#F53F3F',
    milestone: '#7C3AED',
  };
  const phaseLabels = {
    registration: '报名截止',
    start: '开赛',
    end: '结束',
    deadline: '截止',
    milestone: '里程碑',
  };

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="cal" s={18} c="#3370FF"/>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2329' }}>赛事日历</div>
            <div style={{ fontSize: 12, color: '#8F959E' }}>查看所有赛事时间节点，支持导出 iCal</div>
          </div>
        </div>
        <Btn variant="secondary" icon={<Ic n="download" s={14} c="#646A73"/>} onClick={exportICS}>
          导出 iCal
        </Btn>
      </div>

      {/* Month Navigation */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E6E8' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Ic n="chevl" s={18} c="#646A73"/>
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2329' }}>
            {year}年{month}月
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Ic n="chevr" s={18} c="#646A73"/>
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F0F1F3' }}>
          {weekdays.map(w => (
            <div key={w} style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#8F959E' }}>{w}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* Empty cells before first day */}
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 90, borderRight: '1px solid #F7F8FA', borderBottom: '1px solid #F7F8FA' }}></div>
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDay[day] || [];
            const todayClass = isToday(day);
            const isSelected = selectedDay === day;
            return (
              <div key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{
                  minHeight: 90, padding: '6px 8px',
                  borderRight: (day + startWeekday) % 7 !== 0 ? '1px solid #F7F8FA' : 'none',
                  borderBottom: '1px solid #F7F8FA',
                  background: isSelected ? '#F0F5FF' : todayClass ? '#FAFBFF' : '#fff',
                  cursor: 'pointer', transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#FAFBFF'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = todayClass ? '#FAFBFF' : '#fff'; }}
              >
                <div style={{
                  fontSize: 13, fontWeight: todayClass ? 700 : 500,
                  color: todayClass ? '#3370FF' : '#1F2329',
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: todayClass ? '#EEF3FF' : 'transparent',
                  marginBottom: 4,
                }}>
                  {day}
                </div>
                {dayEvents.slice(0, 2).map((ev, j) => (
                  <div key={j} style={{
                    fontSize: 10, padding: '2px 5px', borderRadius: 4,
                    background: (phaseColors[ev.phase] || '#3370FF') + '15',
                    color: phaseColors[ev.phase] || '#3370FF',
                    fontWeight: 500, marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ev.title?.slice(0, 8) || phaseLabels[ev.phase] || ev.phase}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: 10, color: '#8F959E', paddingLeft: 5 }}>+{dayEvents.length - 2} 更多</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected day events detail */}
      {selectedDay && eventsByDay[selectedDay] && (
        <Card style={{ padding: 20, marginTop: 16 }}>
          <SHead title={`${year}年${month}月${selectedDay}日 · ${eventsByDay[selectedDay].length} 个事件`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {eventsByDay[selectedDay].map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FAFBFC', borderRadius: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: phaseColors[ev.phase] || '#3370FF',
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: '#8F959E' }}>{phaseLabels[ev.phase] || ev.phase}</div>
                </div>
                <Badge label={phaseLabels[ev.phase] || ev.phase} status={ev.phase === 'end' ? 'completed' : 'active'} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {Object.entries(phaseLabels).map(([phase, label]) => (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: phaseColors[phase] }}></div>
            <span style={{ fontSize: 12, color: '#646A73' }}>{label}</span>
          </div>
        ))}
      </div>
    </PageWrap>
  );
};

Object.assign(window, { CalendarPage });
