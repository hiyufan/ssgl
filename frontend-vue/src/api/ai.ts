import type { AssistantReply, CoachStart, CoachFinal, CoachStartPayload } from '@/types/ssgl'
import { aiApi, getAccessToken, SSGL_AI_BASE } from './http'
import {
  normalizeExecutionMatchResponse,
  type ExecutionMatchResult
} from '@/utils/ssgl/aiReports'

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

// AI Tools API
export const aiToolsAPI = {
  call: async (tool: string, input: string, extra?: string): Promise<{ result: string }> => {
    const response = await aiApi.post<{ result: string }>(`/tools/${tool}`, { input, extra })
    return response.data
  },

  callStream: async (
    tool: string,
    input: string,
    extra: string | undefined,
    handlers: {
      onChunk: (text: string) => void
      onDone: () => void
      onError: (msg: string) => void
    }
  ): Promise<void> => {
    try {
      const res = await fetch(`${SSGL_AI_BASE}/tools/stream/${tool}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ input, extra })
      })
      if (!res.ok || !res.body) {
        handlers.onError('AI 服务暂时不可用')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const evt of events) {
          if (!evt.startsWith('data:')) continue
          const data = evt.slice(5).replace(/^ /, '')
          if (data === '[DONE]') { handlers.onDone(); return }
          if (data === '[ERROR]') { handlers.onError('生成失败'); return }
          try {
            const parsed = JSON.parse(data)
            if (parsed.chunk) handlers.onChunk(parsed.chunk)
            if (parsed.error) { handlers.onError(parsed.error); return }
          } catch {
            handlers.onChunk(data)
          }
        }
      }
      handlers.onDone()
    } catch {
      handlers.onError('AI 服务暂时不可用，请确保已启动（端口 8000）')
    }
  }
}

// AI Assistant API
export const assistantAPI = {
  chat: async (payload: {
    message: string
    role?: string
    context?: string
    page?: string
  }): Promise<AssistantReply> => {
    const response = await aiApi.post<AssistantReply>('/assistant/chat', payload)
    return response.data
  },

  chatStream: async (
    payload: { message: string; role?: string; context?: string; page?: string },
    handlers: { onChunk: (text: string) => void; onDone: () => void; onError: (msg: string) => void }
  ): Promise<void> => {
    try {
      const res = await fetch(`${SSGL_AI_BASE}/assistant/chat/stream`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      if (!res.ok || !res.body) { handlers.onError('AI 服务暂时不可用'); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') { handlers.onDone(); return }
            try { const j = JSON.parse(data); if (j.text || j.chunk) handlers.onChunk(j.text || j.chunk) } catch { handlers.onChunk(data) }
          }
        }
      }
      handlers.onDone()
    } catch (e) { handlers.onError(String(e)) }
  },

  quickAction: async (action: string, params?: Record<string, unknown>): Promise<AssistantReply> => {
    const response = await aiApi.post<AssistantReply>('/assistant/quick-action', { action, ...params })
    return response.data
  }
}

// Execution Match API
export const executionMatchAPI = {
  match: async (payload: { pre_plan_id?: number; execution_text: string; plan_text?: string }): Promise<ExecutionMatchResult> => {
    const response = await aiApi.post('/review/execution-match', payload)
    return normalizeExecutionMatchResponse(response.data)
  }
}

// AI Pitch Coach API
export const coachAPI = {
  start: async (payload: CoachStartPayload): Promise<CoachStart> => {
    const response = await aiApi.post<CoachStart>('/coach/start', payload)
    return response.data
  },

  final: async (sessionId: string): Promise<CoachFinal> => {
    const response = await aiApi.post<CoachFinal>('/coach/final', { session_id: sessionId })
    return response.data
  },

  answerStream: async (
    payload: { session_id: string; question_id: number; answer: string },
    handlers: {
      onChunk: (text: string) => void
      onDone: () => void
      onExpired: () => void
      onError: (msg: string) => void
    }
  ): Promise<void> => {
    try {
      const res = await fetch(`${SSGL_AI_BASE}/coach/answer`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      if (!res.ok || !res.body) {
        handlers.onError('AI 服务暂时不可用')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const evt of events) {
          if (!evt.startsWith('data:')) continue
          const data = evt.slice(5).replace(/^ /, '')
          if (data === '[DONE]') { handlers.onDone(); return }
          if (data === '[EXPIRED]') { handlers.onExpired(); return }
          if (data === '[ERROR]') { handlers.onError('回答生成失败'); return }
          try {
            handlers.onChunk(JSON.parse(data) as string)
          } catch {
            handlers.onChunk(data)
          }
        }
      }
      handlers.onDone()
    } catch {
      handlers.onError('AI 服务暂时不可用，请确保已启动（端口 8000）')
    }
  }
}
