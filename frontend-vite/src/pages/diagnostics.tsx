import { useEffect, useState } from 'react';
import { systemAPI } from '@/services/api';
import { SectionLabel } from '@/components/ui/page-helpers';
import { Icon } from '@/components/ui/icon';

interface Diagnostics {
  status: string;
  uptime_seconds: number;
  uptime_human: string;
  go_version: string;
  num_cpu: number;
  num_goroutine: number;
  db_pool_stats: {
    open_connections: number;
    in_use: number;
    idle: number;
    wait_count: number;
    wait_duration: string;
    max_open_conns: number;
  };
  memory_stats: {
    alloc_mb: number;
    total_alloc_mb: number;
    sys_mb: number;
    num_gc: number;
    heap_alloc_mb: number;
    heap_sys_mb: number;
    heap_idle_mb: number;
    heap_inuse_mb: number;
  };
  timestamp: string;
}

function MetricCard({ label, value, unit, color, icon }: { label: string; value: string | number; unit?: string; color: string; icon: string }) {
  return (
    <div className="card card-magnetic" style={{ padding: '18px 20px', borderLeft: `3px solid ${color}`, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {value}
          {unit && <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function PoolBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export function DiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetch_ = async () => {
      try {
        const res = await systemAPI.diagnostics();
        if (mounted) setData(res);
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : '获取诊断数据失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch_();
    const interval = setInterval(fetch_, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5" />
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
        <Icon name="shield" size={32} />
        <p style={{ marginTop: 12 }}>{error || '无法获取诊断数据'}</p>
      </div>
    );
  }

  const mem = data.memory_stats;
  const db = data.db_pool_stats;

  return (
    <div className="forge-page">
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: data.status === 'healthy' ? 'var(--green)' : 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ◆ {data.status.toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
              {new Date(data.timestamp).toLocaleString('zh-CN')}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            系统诊断
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.status === 'healthy' ? 'var(--green)' : 'var(--amber)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>每 10 秒刷新</span>
        </div>
      </div>

      {/* Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <MetricCard label="运行时间" value={data.uptime_human} color="var(--green)" icon="clock" />
        <MetricCard label="Go 版本" value={data.go_version} color="var(--teal)" icon="zap" />
        <MetricCard label="CPU 核心" value={data.num_cpu} color="var(--amber)" icon="chart" />
        <MetricCard label="Goroutines" value={data.num_goroutine} color="var(--purple)" icon="sparkles" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Memory Stats */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="内存使用" />
          <div style={{ marginTop: 16 }}>
            <PoolBar label="堆使用" value={Number(mem.heap_inuse_mb.toFixed(1))} max={Number(mem.heap_sys_mb.toFixed(1))} color="var(--amber)" />
            <PoolBar label="堆空闲" value={Number(mem.heap_idle_mb.toFixed(1))} max={Number(mem.heap_sys_mb.toFixed(1))} color="var(--teal)" />
            <PoolBar label="已分配" value={Number(mem.alloc_mb.toFixed(1))} max={Number(mem.sys_mb.toFixed(1))} color="var(--purple)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              {[
                { label: '当前分配', value: `${mem.alloc_mb.toFixed(1)} MB`, color: 'var(--amber)' },
                { label: '累计分配', value: `${mem.total_alloc_mb.toFixed(1)} MB`, color: 'var(--teal)' },
                { label: '系统内存', value: `${mem.sys_mb.toFixed(1)} MB`, color: 'var(--purple)' },
                { label: 'GC 次数', value: String(mem.num_gc), color: 'var(--green)' },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.05em' }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DB Pool Stats */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionLabel label="数据库连接池" />
          <div style={{ marginTop: 16 }}>
            <PoolBar label="活跃连接" value={db.in_use} max={db.max_open_conns} color="var(--red)" />
            <PoolBar label="空闲连接" value={db.idle} max={db.max_open_conns} color="var(--green)" />
            <PoolBar label="总连接数" value={db.open_connections} max={db.max_open_conns} color="var(--amber)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              {[
                { label: '等待次数', value: String(db.wait_count), color: 'var(--red)' },
                { label: '等待时长', value: db.wait_duration || '0s', color: 'var(--amber)' },
                { label: '最大连接', value: String(db.max_open_conns), color: 'var(--teal)' },
                { label: '当前打开', value: String(db.open_connections), color: 'var(--purple)' },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.05em' }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
