<template>
  <section class="ssgl-page assistant-page" data-page="Assistant">
    <SSGLPageHeader title="AI 智能助手" subtitle="对话式 AI 助手 — 查询数据、执行操作、获取建议" />

    <!-- Quick Actions (shown when no messages) -->
    <div v-if="messages.length === 0" class="assistant-actions">
      <div class="assistant-actions__title">快捷操作</div>
      <div class="assistant-actions__grid">
        <button
          v-for="action in QUICK_ACTIONS"
          :key="action.id"
          class="action-card"
          @click="handleQuickAction(action.id)"
        >
          <ElIcon :size="20" color="var(--el-color-warning)"><component :is="actionIcon(action.icon)" /></ElIcon>
          <div>
            <div class="action-card__label">{{ action.label }}</div>
            <div class="action-card__desc">{{ action.desc }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Chat Area -->
    <div ref="chatEndRef" class="assistant-chat">
      <div v-for="msg in messages" :key="msg.id" :class="['chat-msg', msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--assistant']">
        <div class="chat-msg__bubble">
          {{ msg.content }}
          <!-- Suggestions -->
          <div v-if="msg.suggestions && msg.suggestions.length > 0" class="chat-msg__suggestions">
            <button
              v-for="(s, i) in msg.suggestions"
              :key="i"
              class="suggestion-btn"
              @click="handleSend(s)"
            >{{ s }}</button>
          </div>
          <!-- Tool calls -->
          <div v-if="msg.tool_calls && msg.tool_calls.length > 0" class="chat-msg__tools">
            <ElIcon :size="11"><SetUp /></ElIcon>
            调用了: {{ msg.tool_calls.map(tc => tc.call).join(', ') }}
          </div>
        </div>
      </div>

      <!-- Streaming indicator -->
      <div v-if="streaming && streamText" class="chat-msg chat-msg--assistant">
        <div class="chat-msg__bubble">{{ streamText }}<span class="cursor-blink">▊</span></div>
      </div>
      <div v-if="streaming && !streamText" class="chat-msg chat-msg--assistant">
        <div class="chat-msg__bubble chat-msg__bubble--thinking">思考中...</div>
      </div>

      <!-- Error -->
      <ElAlert v-if="error" :title="error" type="error" show-icon :closable="false" style="max-width: 400px" />

      <div ref="chatBottomRef" />
    </div>

    <!-- Input -->
    <div class="assistant-input">
      <ElInput
        ref="inputRef"
        v-model="input"
        type="textarea"
        :rows="1"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        resize="none"
        @keydown="handleKeydown"
      />
      <ElButton
        type="warning"
        :disabled="streaming || !input.trim()"
        :loading="streaming"
        @click="handleSend()"
      >
        发送
      </ElButton>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { ref, nextTick, watch } from 'vue'
  import { SetUp, DataAnalysis, Document, User, Trophy, Bell, Present } from '@element-plus/icons-vue'
  import { assistantAPI } from '@/api/ai'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import type { AssistantReply } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Assistant' })

  interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    suggestions?: string[]
    tool_calls?: { call: string }[]
    timestamp: number
  }

  const QUICK_ACTIONS = [
    { id: 'get_stats', icon: 'chart', label: '平台统计', desc: '查看平台整体数据概览' },
    { id: 'get_pending_approvals', icon: 'clipboard-list', label: '待审批', desc: '查看待处理的审批事项' },
    { id: 'get_my_teams', icon: 'users', label: '我的团队', desc: '查看我的团队列表' },
    { id: 'get_competitions', icon: 'trophy', label: '赛事列表', desc: '查看近期赛事' },
    { id: 'get_notifications', icon: 'bell', label: '通知', desc: '查看未读通知' },
    { id: 'get_awards', icon: 'gift', label: '获奖情况', desc: '查看获奖记录' },
  ]

  function actionIcon(icon: string) {
    const map: Record<string, unknown> = {
      chart: DataAnalysis,
      'clipboard-list': Document,
      users: User,
      trophy: Trophy,
      bell: Bell,
      gift: Present,
    }
    return map[icon] || DataAnalysis
  }

  const messages = ref<Message[]>([])
  const input = ref('')
  const streaming = ref(false)
  const streamText = ref('')
  const error = ref('')
  const chatEndRef = ref<HTMLElement | null>(null)
  const chatBottomRef = ref<HTMLElement | null>(null)
  const inputRef = ref<HTMLElement | null>(null)
  let msgIdSeq = 0

  watch([messages, streamText], () => {
    nextTick(() => {
      chatBottomRef.value?.scrollIntoView({ behavior: 'smooth' })
    })
  })

  function addMessage(role: 'user' | 'assistant', content: string, extra?: Partial<Message>) {
    msgIdSeq++
    messages.value.push({ id: msgIdSeq, role, content, timestamp: Date.now(), ...extra })
  }

  async function handleSend(text?: string) {
    const msg = (text || input.value).trim()
    if (!msg || streaming.value) return
    input.value = ''
    error.value = ''
    addMessage('user', msg)

    streaming.value = true
    streamText.value = ''
    let fullText = ''

    await assistantAPI.chatStream(
      { message: msg, page: 'assistant' },
      {
        onChunk(chunk: string) { fullText += chunk; streamText.value = fullText },
        onDone() {
          streaming.value = false
          addMessage('assistant', fullText)
          streamText.value = ''
        },
        onError(errMsg: string) {
          streaming.value = false
          error.value = errMsg
          if (fullText) { addMessage('assistant', fullText); streamText.value = '' }
        },
      },
    )
  }

  async function handleQuickAction(actionId: string) {
    if (streaming.value) return
    const action = QUICK_ACTIONS.find(a => a.id === actionId)
    addMessage('user', action?.label || actionId)
    streaming.value = true
    error.value = ''
    try {
      const res: AssistantReply = await assistantAPI.quickAction(actionId)
      addMessage('assistant', res.reply, { suggestions: res.suggestions, tool_calls: res.tool_calls })
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '执行失败'
    } finally {
      streaming.value = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
</script>

<style scoped lang="scss">
  .assistant-page {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--topbar-h, 60px));
    overflow: hidden;
  }

  .assistant-actions {
    margin-bottom: 20px;

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--art-gray-700);
      margin-bottom: 12px;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    font-family: inherit;

    &:hover {
      border-color: var(--el-color-warning);
    }

    &__label {
      font-size: 13px;
      font-weight: 700;
      color: var(--art-gray-800);
    }

    &__desc {
      font-size: 11px;
      color: var(--art-gray-500);
      margin-top: 2px;
    }
  }

  .assistant-chat {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .chat-msg {
    display: flex;

    &--user {
      justify-content: flex-end;
    }

    &--assistant {
      justify-content: flex-start;
    }

    &__bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;

      .chat-msg--user & {
        background: var(--el-color-warning);
        color: #000;
        border-bottom-right-radius: 4px;
      }

      .chat-msg--assistant & {
        background: var(--el-bg-color);
        color: var(--art-gray-800);
        border: 1px solid var(--el-border-color-light);
        border-bottom-left-radius: 4px;
      }

      &--thinking {
        color: var(--art-gray-500);
      }
    }

    &__suggestions {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    &__tools {
      margin-top: 8px;
      font-size: 11px;
      color: var(--art-gray-500);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .suggestion-btn {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-light);
    color: var(--art-gray-700);
    cursor: pointer;
    font-family: inherit;

    &:hover {
      background: var(--el-fill-color);
    }
  }

  .assistant-input {
    display: flex;
    gap: 10px;
    padding: 16px 0;
    border-top: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  .cursor-blink {
    animation: blink 1s infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
