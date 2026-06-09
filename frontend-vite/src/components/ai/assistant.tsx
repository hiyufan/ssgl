import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/app';
import { cn } from '@/lib/utils';
import {
  Sparkles, Send, X, Minimize2, Maximize2,
  Bot, User, Lightbulb, ChevronDown,
  BarChart3, CheckSquare, Users, Trophy, FileText,
  Loader2,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  toolCalls?: { call: string }[];
  data?: any;
}

interface AIAssistantProps {
  context?: string;
  placeholder?: string;
  floating?: boolean;
}

export function AIAssistant({ context, placeholder, floating = true }: AIAssistantProps) {
  const { role, page } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const getWelcomeMessage = () => {
    const welcomes: Record<string, string> = {
      admin: '你好！我是 AI 管理助手。我可以帮你：\n\n• 查询赛事、团队、审批数据\n• 生成统计报告\n• 处理审批操作\n• 分析运营趋势\n\n有什么可以帮你的？',
      teacher: '你好！我是 AI 教学助手。我可以帮你：\n\n• 查看指导团队情况\n• 分析预计划质量\n• 生成学生反馈\n• 查看评价数据\n\n有什么可以帮你的？',
      student: '你好！我是 AI 学习助手。我可以帮你：\n\n• 查看赛事和团队信息\n• 优化项目方案\n• 生成商业计划\n• 获取改进建议\n\n有什么可以帮你的？',
    };
    return welcomes[role] || welcomes.student;
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    const placeholders: Record<string, string> = {
      admin: '试试："查看待处理审批" 或 "生成赛事报告"',
      teacher: '试试："分析这个预计划" 或 "查看指导团队"',
      student: '试试："查看我的团队" 或 "帮我优化方案"',
    };
    return placeholders[role] || '输入你的问题...';
  };

  const getQuickActions = () => {
    const actions: Record<string, { icon: any; label: string; action: string }[]> = {
      admin: [
        { icon: BarChart3, label: '统计数据', action: '获取平台统计数据' },
        { icon: CheckSquare, label: '待办审批', action: '查看待处理审批' },
        { icon: Trophy, label: '赛事概况', action: '查看进行中的赛事' },
        { icon: FileText, label: '生成报告', action: '生成赛事运营报告' },
      ],
      teacher: [
        { icon: Users, label: '我的团队', action: '查看我指导的团队' },
        { icon: FileText, label: '预计划', action: '查看待审核的预计划' },
        { icon: BarChart3, label: '评价数据', action: '查看学生评价汇总' },
      ],
      student: [
        { icon: Users, label: '我的团队', action: '查看我的团队信息' },
        { icon: FileText, label: '预计划', action: '查看我的预计划状态' },
        { icon: Trophy, label: '赛事', action: '查看可报名的赛事' },
        { icon: Sparkles, label: '改进建议', action: '给我项目改进建议' },
      ],
    };
    return actions[role] || actions.student;
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/ai/api/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          role: role,
          context: context || `当前页面: ${page}`,
          page: page,
        }),
      });

      if (!response.ok) {
        throw new Error('AI 服务暂时不可用');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        suggestions: data.suggestions,
        toolCalls: data.tool_calls,
        data: data.data,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，AI 服务暂时不可用。请确保 AI 服务已启动（端口 8000）。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Floating button mode
  if (floating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet to-accent text-white shadow-lg shadow-violet/30 transition-all hover:scale-105 hover:shadow-xl group"
        title="AI 助手"
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-surface border border-border shadow-2xl transition-all duration-300',
        floating
          ? isMaximized
            ? 'fixed inset-4 z-50 rounded-2xl'
            : 'fixed bottom-6 right-6 z-50 w-[420px] h-[640px] rounded-2xl'
          : 'w-full h-full rounded-2xl'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-violet/5 to-accent/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-accent shadow-md shadow-violet/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text font-display">AI 助手</h3>
            <p className="text-[11px] text-text-muted flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              在线 · {role === 'admin' ? '管理助手' : role === 'teacher' ? '教学助手' : '学习助手'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunken transition-colors"
            title="清空对话"
          >
            <X size={16} />
          </button>
          {floating && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunken transition-colors"
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          {floating && (
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunken transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-accent">
                <Bot size={16} className="text-white" />
              </div>
              <div className="rounded-xl bg-surface-sunken p-4 max-w-[85%]">
                <p className="text-sm text-text whitespace-pre-line">{getWelcomeMessage()}</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-4">
              <p className="text-xs text-text-muted mb-2 px-1">快捷操作</p>
              <div className="grid grid-cols-2 gap-2">
                {getQuickActions().map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.action)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-all hover:border-violet/30 hover:bg-violet-soft/50"
                  >
                    <action.icon size={16} className="text-violet" />
                    <span className="text-xs font-medium text-text">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-accent">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div className={cn('max-w-[85%]', msg.role === 'user' && 'ml-auto')}>
              <div
                className={cn(
                  'rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-surface-sunken text-text rounded-bl-md'
                )}
              >
                {msg.content}
              </div>

              {/* Tool calls indicator */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.toolCalls.map((tc, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-md bg-emerald-soft px-2 py-1 text-[10px] text-emerald font-mono">
                      <CheckSquare size={10} /> {tc.call.split('(')[0]}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="flex items-center gap-1 rounded-lg bg-violet-soft px-2.5 py-1.5 text-xs text-violet hover:bg-violet/10 transition-colors"
                    >
                      <Lightbulb size={10} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <User size={16} className="text-primary" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-accent">
              <Bot size={16} className="text-white" />
            </div>
            <div className="rounded-xl bg-surface-sunken p-4">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-violet" />
                <span className="text-sm text-text-muted">思考中...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={getPlaceholder()}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-surface-sunken px-4 py-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl transition-all',
              input.trim() && !isLoading
                ? 'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20'
                : 'bg-surface-sunken text-text-muted'
            )}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-text-muted">
            按 Enter 发送 · Shift + Enter 换行
          </span>
          <span className="text-[10px] text-text-muted">
            当前页面: {page || '未知'}
          </span>
        </div>
      </div>
    </div>
  );
}
