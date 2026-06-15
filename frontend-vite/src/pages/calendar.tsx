import { useEffect, useState, useMemo, useCallback } from 'react';
import { calendarAPI } from '@/services/api';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { Icon } from '@/components/ui/icon';

interface CalendarEvent {
  id: number;
  title: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  location?: string;
  tags?: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hackathon:  { bg: 'rgba(45,212,191,0.15)',  text: 'var(--teal, #2dd4bf)',   border: 'rgba(45,212,191,0.4)' },
  innovation: { bg: 'rgba(96,165,250,0.15)',   text: 'var(--blue, #60a5fa)',   border: 'rgba(96,165,250,0.4)' },
  research:   { bg: 'rgba(167,139,250,0.15)',  text: 'var(--purple, #a78bfa)', border: 'rgba(167,139,250,0.4)' },
};

const TYPE_LABELS: Record<string, string> = {
  hackathon: '黑客松',
  innovation: '创新赛',
  research: '研究赛',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    calendarAPI.list(currentMonth)
      .then(res => {
        setEvents(res.events || []);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentMonth]);

  // Parse currentMonth into year and month.
  const [year, month] = currentMonth.split('-').map(Number);

  // Navigate months.
  const prevMonth = useCallback(() => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  }, [year, month]);

  const nextMonth = useCallback(() => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  }, [year, month]);

  const monthLabel = `${year}年${month}月`;

  // Build calendar grid.
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    // getDay() returns 0=Sun. We want Mon=0.
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6; // Sunday -> 6

    const daysInMonth = new Date(year, month, 0).getDate();
    const days: { date: string; day: number; inMonth: boolean }[] = [];

    // Previous month padding.
    const prevDays = new Date(year, month - 1, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevDays - i;
      const m = month - 1 || 12;
      const y = month === 1 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false });
    }

    // Current month.
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: true });
    }

    // Next month padding (fill to complete rows of 7).
    const remainder = days.length % 7;
    if (remainder !== 0) {
      const fill = 7 - remainder;
      for (let d = 1; d <= fill; d++) {
        const m = month + 1 > 12 ? 1 : month + 1;
        const y = month + 1 > 12 ? year + 1 : year;
        days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false });
      }
    }

    return days;
  }, [year, month]);

  // Map events to dates.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const start = new Date(evt.start_date);
      const end = new Date(evt.end_date);
      // Mark every day from start to end.
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(evt);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  // Today's date string.
  const todayStr = new Date().toISOString().slice(0, 10);

  // Selected day events.
  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) || [] : [];

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

  return (
    <div className="forge-page">
      <PageHeader
        title="赛事日历"
        subtitle={`${monthLabel} · ${total} 个赛事`}
        actions={
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              onClick={prevMonth}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="chevron-left" size={14} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, minWidth: 100, textAlign: 'center' }}>
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        }
      />

      {/* Legend */}
      <div className="card anim-in" style={{ padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SectionLabel label="类型图例" />
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: colors.text }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{TYPE_LABELS[type] || type}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="card anim-in d1" style={{ overflow: 'hidden' }}>
        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {WEEKDAYS.map(wd => (
            <div key={wd} style={{
              padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>{wd}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map(({ date, day, inMonth }) => {
            const dayEvents = eventsByDate.get(date) || [];
            const isToday = date === todayStr;
            const isSelected = date === selectedDay;

            return (
              <div
                key={date}
                onClick={() => setSelectedDay(isSelected ? null : date)}
                style={{
                  minHeight: 90,
                  padding: 6,
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--surface-2)' : isToday ? 'var(--amber-bg)' : 'transparent',
                  transition: 'background 0.15s',
                  opacity: inMonth ? 1 : 0.35,
                  position: 'relative',
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 500,
                  color: isToday ? 'var(--amber)' : 'var(--text)',
                  marginBottom: 4,
                  width: 22, height: 22, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'var(--amber)' : 'transparent',
                  color2: isToday ? '#0F1523' : undefined,
                }}>
                  <span style={{ color: isToday ? '#0F1523' : undefined }}>{day}</span>
                </div>

                {/* Event chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayEvents.slice(0, 3).map(evt => {
                    const colors = TYPE_COLORS[evt.type] || TYPE_COLORS.hackathon;
                    return (
                      <div
                        key={evt.id}
                        title={evt.title}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                          background: colors.bg, color: colors.text,
                          borderLeft: `2px solid ${colors.border}`,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {evt.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text-3)', paddingLeft: 5 }}>
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="card anim-in d2" style={{ marginTop: 16, padding: 20 }}>
          <SectionLabel label={`${selectedDay} 赛事详情`} count={selectedEvents.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedEvents.map(evt => {
              const colors = TYPE_COLORS[evt.type] || TYPE_COLORS.hackathon;
              return (
                <div key={evt.id} style={{
                  padding: 14, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 4, height: '100%', minHeight: 40, borderRadius: 2,
                    background: colors.text, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        {evt.title}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: colors.bg, color: colors.text,
                      }}>
                        {TYPE_LABELS[evt.type] || evt.type}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: 'var(--surface-3)', color: 'var(--text-3)',
                      }}>
                        {STATUS_LABELS[evt.status] || evt.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
                      <span>📅 {new Date(evt.start_date).toLocaleDateString('zh-CN')} — {new Date(evt.end_date).toLocaleDateString('zh-CN')}</span>
                      {evt.location && <span>📍 {evt.location}</span>}
                      {evt.tags && <span>🏷 {evt.tags}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
