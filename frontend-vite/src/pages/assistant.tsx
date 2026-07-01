import { useState, useRef, useEffect } from 'react';
import { assistantAPI, type AssistantReply } from '@/services/api';
import { Icon } from '@/components/ui/icon';

/* ─── Types ─── */
interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  tool_calls?: { call: string }[];
  timestamp: number;
}

/* ─── Quick Actions ─── */
const QUICK_ACTIONS = [
  { id: 'get_stats', icon: 'chart', label: '平台统计', desc: '查看平台整体数据概览' },
  { id: 'get_pending_approvals', icon: 'clipboard-list', label: '待审批', desc: '查看待处理的审批事项' },
  { id: 'get_my_teams', icon: 'users', label: '我的团队', desc: '查看我的团队列表' },
  { id: 'get_competitions', icon: 'trophy', label: '赛事列表', desc: '查看近期赛事' },
  { id: 'get_notifications', icon: 'bell', label: '通知', desc: '查看未读通知' },
  { id: 'get_awards', icon: 'gift', label: '获奖情况', desc: '查看获奖记录' },
];

/* ─── Styles ─── */
const msgBubble = (isUser: boolean): React.CSSProperties => ({
  maxWidth: '80%', padding: '12px 16px', borderRadius: 12,
  background: isUser ? 'var(--amber)' : 'var(--surface)',
  color: isUser ? '#000' : 'var(--text)',
  border: isUser ? 'none' : '1px solid var(--border)',
  borderBottomRightRadius: isUser ? 4 : 12,
  borderBottomLeftRadius: isUser ? 12 : 4,
  fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

/* ─── Component ─── */
export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgIdRef = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const addMessage = (role: 'user' | 'assistant', content: string, extra?: Partial<Message>) => {
    msgIdRef.current += 1;
    setMessages(prev => [...prev, { id: msgIdRef.current, role, content, timestamp: Date.now(), ...extra }]);
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;
    setInput('');
    setError('');
    addMessage('user', msg);

    setStreaming(true);
    setStreamText('');
    let fullText = '';

    await assistantAPI.chatStream(
      { message: msg, page: 'assistant' },
      {
        onChunk: (chunk) => { fullText += chunk; setStreamText(fullText); },
        onDone: () => {
          setStreaming(false);
          addMessage('assistant', fullText);
          setStreamText('');
        },
        onError: (errMsg) => {
          setStreaming(false);
          setError(errMsg);
          if (fullText) { addMessage('assistant', fullText); setStreamText(''); }
        },
      },
    );
  };

  const handleQuickAction = async (actionId: string) => {
    if (streaming) return;
    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    addMessage('user', action?.label || actionId);
    setStreaming(true);
    setError('');
    try {
      const res: AssistantReply = await assistantAPI.quickAction(actionId);
      addMessage('assistant', res.reply, { suggestions: res.suggestions, tool_calls: res.tool_calls });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '执行失败');
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Icon name="bot" size={28} />
            AI 智能助手
          </span>
        </h1>
        <p style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 14 }}>
          对话式 AI 助手 — 查询数据、执行操作、获取建议
        </p>
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>快捷操作</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                <Icon name={action.icon} size={20} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 0',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={msgBubble(msg.role === 'user')}>
              {msg.content}
              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i} onClick={() => handleSend(s)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        color: 'var(--text-2)', cursor: 'pointer',
                      }}
                    >{s}</button>
                  ))}
                </div>
              )}
              {/* Tool calls */}
              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="wrench" size={11} />
                  调用了: {msg.tool_calls.map(tc => tc.call).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {streaming && streamText && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={msgBubble(false)}>{streamText}<span style={{ animation: 'blink 1s infinite' }}>▊</span></div>
          </div>
        )}
        {streaming && !streamText && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ ...msgBubble(false), color: 'var(--text-3)' }}>思考中...</div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, maxWidth: 400,
            background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontSize: 13,
          }}>{error}</div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, padding: '16px 0', borderTop: '1px solid var(--border)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, resize: 'none',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={streaming || !input.trim()}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: streaming || !input.trim() ? 'var(--surface-2)' : 'var(--amber)',
            color: streaming || !input.trim() ? 'var(--text-3)' : '#000',
            fontWeight: 700, fontSize: 14, cursor: streaming ? 'wait' : 'pointer',
          }}
        >发送</button>
      </div>
    </div>
  );
}
