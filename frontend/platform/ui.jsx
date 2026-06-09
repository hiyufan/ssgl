// Shared UI primitives — Feishu-inspired, v2

// ── Button ────────────────────────────────────────────────
const Btn = ({ children, variant='primary', size='md', onClick, disabled, style:s={}, icon, full }) => {
  const [pressed, setPressed] = React.useState(false);
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
    border:'none', borderRadius:6, cursor:disabled?'not-allowed':'pointer', fontWeight:500,
    whiteSpace:'nowrap', fontFamily:'inherit', outline:'none',
    transition:'background .12s, box-shadow .12s, transform .08s',
    opacity: disabled ? .5 : 1,
    width: full ? '100%' : undefined,
    transform: pressed ? 'scale(0.97)' : 'scale(1)',
  };
  const sizes = { sm:{ padding:'4px 12px', fontSize:12 }, md:{ padding:'7px 16px', fontSize:13 }, lg:{ padding:'10px 22px', fontSize:14 } };
  const variants = {
    primary:   { background:'#3370FF', color:'#fff', boxShadow:'0 1px 2px rgba(51,112,255,.25)' },
    secondary: { background:'#fff', color:'#1F2329', border:'1px solid #E5E6E8' },
    ghost:     { background:'transparent', color:'#3370FF' },
    danger:    { background:'#F53F3F', color:'#fff' },
    text:      { background:'transparent', color:'#646A73', padding:'7px 8px' },
  };
  const [hov, setHov] = React.useState(false);
  const hovStyle = hov && !disabled ? {
    primary:{ background:'#2860DD' }, secondary:{ background:'#F7F8FA' },
    ghost:{ background:'#EEF3FF' }, danger:{ background:'#D63030' }, text:{ color:'#1F2329', background:'#F7F8FA' },
  }[variant] || {} : {};
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...hovStyle, ...s }}
      disabled={disabled}
    >{icon}{children}</button>
  );
};

// ── Status colors ─────────────────────────────────────────
const SC = {
  ongoing:{ bg:'#E8F4FF', color:'#1677FF' }, published:{ bg:'#E8FFED', color:'#00B42A' },
  draft:{ bg:'#F7F8FA', color:'#8F959E' }, completed:{ bg:'#F0F0FF', color:'#7C3AED' },
  cancelled:{ bg:'#FFECE8', color:'#F53F3F' }, pending:{ bg:'#FFF7E8', color:'#FF7D00' },
  teacher_pending:{ bg:'#FFF7E8', color:'#FF7D00' }, admin_pending:{ bg:'#FFF7E8', color:'#FF7D00' },
  teacher_confirm:{ bg:'#FFF7E8', color:'#FF7D00' }, approved:{ bg:'#E8FFED', color:'#00B42A' },
  rejected:{ bg:'#FFECE8', color:'#F53F3F' }, settled:{ bg:'#F0F0FF', color:'#7C3AED' },
  active:{ bg:'#E8F4FF', color:'#1677FF' }, under_review:{ bg:'#FFF7E8', color:'#FF7D00' },
  waiting:{ bg:'#F7F8FA', color:'#8F959E' },
};

const Badge = ({ label, status, style:s={} }) => {
  const c = SC[status] || { bg:'#F7F8FA', color:'#8F959E' };
  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:10, fontSize:12, fontWeight:500, ...c, ...s }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', flexShrink:0 }}></span>{label}
  </span>;
};

// ── Card ──────────────────────────────────────────────────
const Card = ({ children, style:s={}, onClick, hover }) => {
  const [hov, setHov] = React.useState(false);
  return <div onClick={onClick} onMouseEnter={() => hover&&setHov(true)} onMouseLeave={() => hover&&setHov(false)}
    style={{ background:'#fff', border:`1px solid ${hov?'#C0C4CC':'#E5E6E8'}`, borderRadius:8,
      boxShadow: hov ? '0 4px 16px rgba(0,0,0,.08)':'none', transition:'all .15s',
      cursor:onClick?'pointer':'default', ...s }}>{children}</div>;
};

// ── Tag / Avatar / Divider etc ────────────────────────────
const Tag = ({ label, color='#3370FF' }) => <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:4, fontSize:11, background:color+'18', color, fontWeight:500, border:`1px solid ${color}30` }}>{label}</span>;

const AV_BGS = ['#3370FF','#7C3AED','#00B42A','#FF7D00','#0891B2','#E11D48'];
const Avatar = ({ name='?', size=32, bg, color='#fff', idx=0 }) =>
  <div style={{ width:size, height:size, borderRadius:'50%', background:bg||AV_BGS[idx%AV_BGS.length], color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.38, fontWeight:600, flexShrink:0 }}>{(name||'?')[0]}</div>;

const Divider = ({ style:s={} }) => <div style={{ height:1, background:'#E5E6E8', ...s }}></div>;

const SHead = ({ title, action, sub }) => (
  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
    <div>
      <div style={{ fontSize:14, fontWeight:600, color:'#1F2329' }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:'#8F959E', marginTop:2 }}>{sub}</div>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Prio = ({ level }) => {
  const M = { high:{bg:'#FFECE8',color:'#F53F3F',l:'高'}, medium:{bg:'#FFF7E8',color:'#FF7D00',l:'中'}, low:{bg:'#E8FFED',color:'#00B42A',l:'低'} };
  const c = M[level]||M.medium;
  return <span style={{ padding:'2px 7px', borderRadius:4, fontSize:11, fontWeight:600, ...c }}>{c.l}</span>;
};

const Stars = ({ value=0, max=5, onChange, size=16 }) => (
  <div style={{ display:'flex', gap:2 }}>
    {Array.from({length:max},(_,i) => <span key={i} onClick={()=>onChange&&onChange(i+1)} style={{ cursor:onChange?'pointer':'default', fontSize:size, color:i<value?'#FAAD14':'#E5E6E8', transition:'color .1s', lineHeight:1 }}>★</span>)}
  </div>
);

const ProgBar = ({ value, max=100, color='#3370FF', h=6, label=true }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
    <div style={{ flex:1, height:h, background:'#F0F1F3', borderRadius:99, overflow:'hidden' }}>
      <div style={{ width:`${Math.round((value/max)*100)}%`, height:'100%', background:color, borderRadius:99, transition:'width .8s cubic-bezier(.16,1,.3,1)' }}></div>
    </div>
    {label && <span style={{ fontSize:12, color:'#646A73', width:26, textAlign:'right', flexShrink:0, fontWeight:500 }}>{value}</span>}
  </div>
);

const Empty = ({ text='暂无数据', sub }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'52px 24px', color:'#8F959E' }}>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="6" y="10" width="40" height="34" rx="4" fill="#F7F8FA" stroke="#E5E6E8" strokeWidth="1.5"/><path d="M16 20h20M16 27h14M16 34h10" stroke="#C9CDD4" strokeWidth="1.5" strokeLinecap="round"/></svg>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:13, fontWeight:500, color:'#646A73', marginBottom:4 }}>{text}</div>
      {sub && <div style={{ fontSize:12, color:'#8F959E' }}>{sub}</div>}
    </div>
  </div>
);

const Spinner = ({ size=20, color='#3370FF' }) =>
  <div style={{ width:size, height:size, border:`2px solid ${color}22`, borderTop:`2px solid ${color}`, borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}></div>;

const InfoRow = ({ icon, label, value, style:s={} }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#646A73', ...s }}>
    {icon}{label && <span style={{ color:'#8F959E' }}>{label}：</span>}<span style={{ color:'#1F2329' }}>{value}</span>
  </div>
);

const Modal = ({ open, onClose, title, children, width=560, footer }) => {
  if (!open) return null;
  React.useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(28,31,36,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:12, width, maxWidth:'95vw', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 12px 40px rgba(0,0,0,.18)', animation:'modalIn .2s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #E5E6E8', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:600, color:'#1F2329' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#8F959E', width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✕</button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:20 }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px', borderTop:'1px solid #E5E6E8', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>{footer}</div>}
      </div>
    </div>
  );
};

const Table = ({ cols, rows, onRowClick, emptyText }) => (
  <div style={{ border:'1px solid #E5E6E8', borderRadius:8, overflow:'hidden' }}>
    <table style={{ width:'100%', borderCollapse:'collapse' }}>
      <thead>
        <tr style={{ background:'#F7F8FA' }}>
          {cols.map(c => <th key={c.key} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, fontWeight:600, color:'#8F959E', borderBottom:'1px solid #E5E6E8', whiteSpace:'nowrap', width:c.width }}>{c.title}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={cols.length}><Empty text={emptyText||'暂无数据'}/></td></tr>
          : rows.map((row, ri) => (
          <tr key={ri} onClick={() => onRowClick&&onRowClick(row)}
            style={{ borderBottom:ri<rows.length-1?'1px solid #F7F8FA':'none', cursor:onRowClick?'pointer':'default', transition:'background .1s' }}
            onMouseEnter={e => { if(onRowClick) e.currentTarget.style.background='#FAFBFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background=''; }}>
            {cols.map(c => <td key={c.key} style={{ padding:'12px 14px', fontSize:13, color:'#1F2329', verticalAlign:'middle' }}>
              {c.render ? c.render(row[c.key], row, ri) : row[c.key]}
            </td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Toast system ──────────────────────────────────────────
const ToastContext = React.createContext({ add: () => {} });

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const add = React.useCallback((msg, type='success') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type, exiting:false }]);
    setTimeout(() => setToasts(p => p.map(t => t.id===id ? {...t, exiting:true} : t)), 2800);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => setToasts(p => p.filter(x => x.id!==t.id))}/>)}
      </div>
    </ToastContext.Provider>
  );
};

const toastConfig = {
  success: { bg:'#E8FFED', border:'#AFF4C6', color:'#00B42A', icon:'✓' },
  error:   { bg:'#FFECE8', border:'#FDCDC8', color:'#F53F3F', icon:'✕' },
  info:    { bg:'#EEF3FF', border:'#BDD4FF', color:'#3370FF', icon:'i' },
  warning: { bg:'#FFF7E8', border:'#FFE4A0', color:'#FF7D00', icon:'!' },
};

const ToastItem = ({ toast, onRemove }) => {
  const cfg = toastConfig[toast.type] || toastConfig.info;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#fff',
      borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', border:`1px solid ${cfg.border}`,
      animation: toast.exiting ? 'toastOut .3s ease forwards' : 'toastIn .25s cubic-bezier(.16,1,.3,1)',
      minWidth:260, maxWidth:360, pointerEvents:'all' }}>
      <div style={{ width:22, height:22, borderRadius:6, background:cfg.bg, color:cfg.color,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{cfg.icon}</div>
      <span style={{ flex:1, fontSize:13, color:'#1F2329', lineHeight:1.5 }}>{toast.msg}</span>
      <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:'#8F959E', fontSize:14, padding:'0 2px', lineHeight:1, pointerEvents:'all' }}>✕</button>
    </div>
  );
};

const useToast = () => React.useContext(ToastContext);

// Global styles injection
const _st = document.createElement('style');
_st.textContent = `
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes modalIn { from { opacity:0; transform:scale(.94) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(20px); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes countUp { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  .row-exit { animation: toastOut .3s ease forwards; }
`;
document.head.appendChild(_st);

Object.assign(window, { Btn, Badge, SC, Card, Tag, Avatar, AV_BGS, Modal, Empty, Spinner, Divider, SHead, Prio, Stars, ProgBar, InfoRow, Table, ToastContext, ToastProvider, useToast });
