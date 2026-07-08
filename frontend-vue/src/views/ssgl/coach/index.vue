<template>
  <section class="ssgl-page coach-page" data-page="Coach">
    <SSGLPageHeader title="赛事陪练" subtitle="三人 AI 评委席 · 读取真实预计划 + 往届项目 · 连珠炮追问">
      <template #actions>
        <ElTag type="warning" effect="plain">AI 模拟答辩</ElTag>
      </template>
    </SSGLPageHeader>

    <!-- Setup Stage -->
    <div v-if="stage === 'setup'" class="coach-setup">
      <div class="coach-setup__tabs">
        <ElButton :type="source === 'pre_plan' ? 'primary' : 'default'" @click="source = 'pre_plan'">选择我的预计划</ElButton>
        <ElButton :type="source === 'text' ? 'primary' : 'default'" @click="source = 'text'">自由粘贴 Pitch</ElButton>
      </div>

      <div v-if="source === 'pre_plan'" class="coach-setup__field">
        <label class="coach-setup__label">预计划</label>
        <ElSelect v-model="planId" placeholder="选择一份预计划…" style="width: 100%">
          <ElOption v-for="p in prePlans" :key="p.id" :label="p.title" :value="p.id" />
        </ElSelect>
        <p v-if="prePlans.length === 0" class="coach-setup__hint">暂无预计划，可改用「自由粘贴 Pitch」。</p>
      </div>

      <div v-else class="coach-setup__field">
        <label class="coach-setup__label">你的 Pitch</label>
        <ElInput
          v-model="pitchText"
          type="textarea"
          :rows="5"
          placeholder="用几句话描述你的项目：解决什么问题、给谁用、怎么做、创新点…"
          resize="none"
        />
      </div>

      <div class="coach-setup__field">
        <label class="coach-setup__label">答辩题量：{{ numQuestions }}</label>
        <ElSlider v-model="numQuestions" :min="3" :max="6" :step="1" style="max-width: 300px" />
      </div>

      <ElButton type="primary" :loading="starting" @click="start">
        <ElIcon v-if="!starting"><Aim /></ElIcon>
        {{ starting ? '评委入场中…' : '开始答辩' }}
      </ElButton>
    </div>

    <!-- Opening Stage -->
    <div v-if="stage === 'opening' && openingData" class="coach-opening">
      <div class="coach-opening__scores">
        <div class="coach-opening__radar-placeholder">
          <div v-for="d in DIMS" :key="d.key" class="radar-row">
            <span class="radar-row__label">{{ d.label }}</span>
            <ElProgress :percentage="openingData.scores[d.key] ?? 0" :stroke-width="8" :show-text="false" style="flex: 1" />
            <span class="radar-row__value">{{ openingData.scores[d.key] ?? 0 }}</span>
          </div>
        </div>
        <div class="coach-opening__overall">{{ openingData.overall }}</div>
        <div class="coach-opening__overall-label">开场综合分</div>
      </div>
      <div class="coach-opening__verdict">
        <div class="coach-opening__verdict-title">评委开场定调</div>
        <p class="coach-opening__verdict-text">{{ openingData.verdict }}</p>
        <div v-if="openingData.similar_projects.length > 0" class="coach-opening__similar">
          <div class="coach-opening__similar-title">往届相似项目</div>
          <div class="coach-opening__similar-list">
            <ElTag
              v-for="(s, i) in openingData.similar_projects"
              :key="i"
              :title="s.preview"
              type="info"
              effect="plain"
              size="small"
            >
              相似度 {{ (s.similarity * 100).toFixed(0) }}%
            </ElTag>
          </div>
        </div>
        <div class="coach-opening__count">共 {{ openingData.questions.length }} 个追问，三位评委轮流发问。</div>
        <ElButton type="primary" @click="stage = 'qa'">
          <ElIcon><ArrowRight /></ElIcon>
          进入答辩
        </ElButton>
      </div>
    </div>

    <!-- Q&A Stage -->
    <div v-if="stage === 'qa' && openingData && currentQuestion" class="coach-qa">
      <div class="coach-qa__header">
        <span class="coach-qa__progress">答辩进行中</span>
        <span class="coach-qa__count">第 {{ qIndex + 1 }} / {{ openingData.questions.length }} 问</span>
        <ElButton text size="small" style="margin-left: auto" @click="finalize">结束答辩</ElButton>
      </div>

      <div ref="scrollRef" class="coach-qa__transcript">
        <div v-for="(item, i) in transcript" :key="i" :class="['bubble', item.type === 'a' ? 'bubble--user' : 'bubble--judge']">
          <div v-if="item.type !== 'a'" class="bubble__label" :style="{ color: personaColor(item.persona) }">
            {{ personaLabel(item.persona) }} · {{ item.type === 'q' ? '提问' : '点评' }}
          </div>
          <div class="bubble__text">{{ item.text }}</div>
        </div>

        <div v-if="streaming" class="bubble bubble--judge">
          <div class="bubble__label" :style="{ color: personaColor(currentQuestion.persona) }">
            {{ personaLabel(currentQuestion.persona) }} · 点评
          </div>
          <div class="bubble__text">{{ reaction || '评委思考中…' }}</div>
        </div>

        <div v-if="!streaming" class="coach-qa__current-q">
          <ElTag :color="personaBg(currentQuestion.persona)" effect="plain" size="small">
            {{ personaLabel(currentQuestion.persona) }}
          </ElTag>
          <div class="coach-qa__question-text">{{ followup ?? currentQuestion.question }}</div>
        </div>
      </div>

      <div class="coach-qa__footer">
        <ElInput
          v-model="answer"
          type="textarea"
          :rows="3"
          placeholder="作答…（Ctrl+Enter 提交）"
          :disabled="streaming"
          resize="none"
          @keydown="onAnswerKeydown"
        />
        <div class="coach-qa__footer-actions">
          <ElButton type="primary" :disabled="streaming || !answer.trim()" :loading="streaming" @click="submitAnswer">
            <ElIcon v-if="!streaming"><Promotion /></ElIcon>
            {{ streaming ? '评委点评中…' : '提交回答' }}
          </ElButton>
          <ElButton v-if="!streaming && transcript.length > 0" @click="nextQuestion">
            {{ qIndex < openingData!.questions.length - 1 ? '下一问 →' : '出终评 →' }}
          </ElButton>
        </div>
      </div>
    </div>

    <!-- Final Stage -->
    <div v-if="stage === 'final'" class="coach-final">
      <div v-if="finalizing && !finalData" class="coach-final__loading">
        <ElIcon class="is-loading" :size="20"><Loading /></ElIcon>
        <span>评委合议中…</span>
      </div>
      <template v-else-if="finalData">
        <div class="coach-final__scores">
          <div class="coach-opening__radar-placeholder">
            <div v-for="d in DIMS" :key="d.key" class="radar-row">
              <span class="radar-row__label">{{ d.label }}</span>
              <ElProgress :percentage="finalData.scores[d.key] ?? 0" :stroke-width="8" :show-text="false" style="flex: 1" />
              <span class="radar-row__value">{{ finalData.scores[d.key] ?? 0 }}</span>
            </div>
          </div>
          <div class="coach-opening__overall">{{ finalData.overall }}</div>
          <div class="coach-opening__overall-label">答辩终评分</div>
        </div>
        <div class="coach-final__detail">
          <p class="coach-final__closing">{{ finalData.closing }}</p>
          <div class="coach-final__section">
            <div class="coach-final__section-title">答辩亮点</div>
            <ul class="coach-final__list">
              <li v-for="(h, i) in finalData.highlights" :key="i">{{ h }}</li>
            </ul>
          </div>
          <div class="coach-final__section">
            <div class="coach-final__section-title">改进清单</div>
            <ul class="coach-final__list">
              <li v-for="(im, i) in finalData.improvements" :key="i">
                <ElTag :type="im.priority === 'high' ? 'danger' : 'warning'" size="small" effect="dark" style="margin-right: 6px">
                  {{ im.priority === 'high' ? '高' : '中' }}
                </ElTag>
                {{ im.content }}
              </li>
            </ul>
          </div>
          <ElButton @click="resetToSetup">
            <ElIcon><Aim /></ElIcon>
            再来一次
          </ElButton>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Aim, ArrowRight, Promotion, Loading } from '@element-plus/icons-vue'
  import { coachAPI } from '@/api/ai'
  import { prePlansAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import type { PrePlan, CoachStart, CoachFinal, CoachQuestion, CoachScores } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Coach' })

  type Stage = 'setup' | 'opening' | 'qa' | 'final'
  type TranscriptItem = { type: 'q' | 'a' | 'reaction'; persona?: string; text: string }

  const DIMS: { key: keyof CoachScores; label: string }[] = [
    { key: 'innovation', label: '创新性' },
    { key: 'feasibility', label: '可行性' },
    { key: 'business', label: '商业价值' },
    { key: 'delivery', label: '表达力' },
    { key: 'completeness', label: '完整度' },
  ]

  const PERSONA: Record<string, { label: string; color: string; bg: string }> = {
    tech: { label: '技术评委', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
    business: { label: '商业评委', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
    product: { label: '产品评委', color: '#0d9488', bg: 'rgba(13,148,136,0.08)' },
  }

  const stage = ref<Stage>('setup')
  const source = ref<'pre_plan' | 'text'>('pre_plan')
  const prePlans = ref<PrePlan[]>([])
  const planId = ref<number | null>(null)
  const pitchText = ref('')
  const numQuestions = ref(4)
  const starting = ref(false)

  const openingData = ref<CoachStart | null>(null)
  const qIndex = ref(0)
  const transcript = ref<TranscriptItem[]>([])
  const answer = ref('')
  const streaming = ref(false)
  const reaction = ref('')
  const followup = ref<string | null>(null)
  const followupCount = ref<Record<number, number>>({})

  const finalData = ref<CoachFinal | null>(null)
  const finalizing = ref(false)
  const scrollRef = ref<HTMLElement | null>(null)

  const currentQuestion = computed(() => openingData.value?.questions[qIndex.value])

  function personaLabel(p?: string) {
    return PERSONA[p || '']?.label || '评委'
  }

  function personaColor(p?: string) {
    return PERSONA[p || '']?.color || 'var(--art-gray-600)'
  }

  function personaBg(p?: string) {
    return PERSONA[p || '']?.bg || 'var(--el-fill-color-light)'
  }

  function scrollToBottom() {
    nextTick(() => {
      scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' })
    })
  }

  watch([transcript, reaction], scrollToBottom)

  onMounted(async () => {
    try {
      const r = await prePlansAPI.list()
      prePlans.value = r.pre_plans || []
    } catch {
      prePlans.value = []
    }
  })

  async function start() {
    if (starting.value) return
    if (source.value === 'pre_plan' && !planId.value) { ElMessage.warning('请选择一份预计划'); return }
    if (source.value === 'text' && !pitchText.value.trim()) { ElMessage.warning('请粘贴你的 Pitch'); return }
    starting.value = true
    try {
      const data = await coachAPI.start({
        source: source.value,
        pre_plan_id: source.value === 'pre_plan' ? planId.value! : undefined,
        pitch_text: source.value === 'text' ? pitchText.value : undefined,
        num_questions: numQuestions.value,
      })
      if (!data.questions || data.questions.length === 0) {
        ElMessage.error('AI 未能生成答辩问题，请重试')
        return
      }
      openingData.value = data
      qIndex.value = 0
      transcript.value = []
      followupCount.value = {}
      stage.value = 'opening'
    } catch (e: unknown) {
      ElMessage.error(extractErr(e))
    } finally {
      starting.value = false
    }
  }

  function submitAnswer() {
    if (!openingData.value || !currentQuestion.value || streaming.value || !answer.value.trim()) return
    const qid = currentQuestion.value.id
    const qText = followup.value ?? currentQuestion.value.question
    const myAnswer = answer.value.trim()

    transcript.value.push(
      { type: 'q', persona: currentQuestion.value.persona, text: qText },
      { type: 'a', text: myAnswer },
    )
    answer.value = ''
    reaction.value = ''
    streaming.value = true
    let collected = ''

    coachAPI.answerStream(
      { session_id: openingData.value.session_id, question_id: qid, answer: myAnswer },
      {
        onChunk(c: string) { collected += c; reaction.value = collected },
        onDone() {
          streaming.value = false
          transcript.value.push({ type: 'reaction', persona: currentQuestion.value!.persona, text: collected })
          reaction.value = ''
          handleFollowup(qid, collected)
        },
        onExpired() {
          streaming.value = false
          ElMessage.error('答辩会话已过期，请重新开始')
          resetToSetup()
        },
        onError(msg: string) {
          streaming.value = false
          transcript.value.push({ type: 'reaction', persona: currentQuestion.value!.persona, text: msg })
          reaction.value = ''
        },
      },
    )
  }

  function handleFollowup(qid: number, reactionText: string) {
    const m = reactionText.split('\n').map(l => l.trim()).find(l => l.startsWith('追问：'))
    const used = followupCount.value[qid] ?? 0
    if (m && used < 1) {
      followupCount.value[qid] = used + 1
      followup.value = m.slice('追问：'.length).trim()
    } else {
      followup.value = null
    }
  }

  function nextQuestion() {
    followup.value = null
    if (!openingData.value) return
    if (qIndex.value < openingData.value.questions.length - 1) {
      qIndex.value++
    } else {
      finalize()
    }
  }

  async function finalize() {
    if (!openingData.value || finalizing.value) return
    finalizing.value = true
    stage.value = 'final'
    try {
      finalData.value = await coachAPI.final(openingData.value.session_id)
    } catch (e: unknown) {
      ElMessage.error(extractErr(e))
    } finally {
      finalizing.value = false
    }
  }

  function resetToSetup() {
    stage.value = 'setup'
    openingData.value = null
    finalData.value = null
    transcript.value = []
    reaction.value = ''
    followup.value = null
    answer.value = ''
  }

  function onAnswerKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submitAnswer()
    }
  }

  function extractErr(e: unknown): string {
    const err = e as { response?: { data?: { detail?: string; error?: string } }; message?: string }
    return err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'AI 服务暂时不可用，请确保已启动（端口 8000）'
  }
</script>

<style scoped lang="scss">
  .coach-page {
    overflow-y: auto;
  }

  .coach-setup {
    max-width: 640px;
    padding: 24px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);

    &__tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
    }

    &__field {
      margin-bottom: 18px;
    }

    &__label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--art-gray-800);
      margin-bottom: 8px;
    }

    &__hint {
      font-size: 12px;
      color: var(--art-gray-500);
      margin-top: 6px;
    }
  }

  .coach-opening {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 20px;

    &__scores {
      padding: 18px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 12px;
      background: var(--el-bg-color);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    &__radar-placeholder {
      width: 100%;
      margin-bottom: 12px;
    }

    &__overall {
      font-size: 30px;
      font-weight: 800;
      color: var(--el-color-warning);
      margin-top: 8px;
    }

    &__overall-label {
      font-size: 12px;
      color: var(--art-gray-500);
    }

    &__verdict {
      padding: 20px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 12px;
      background: var(--el-bg-color);
    }

    &__verdict-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--art-gray-800);
      margin-bottom: 6px;
    }

    &__verdict-text {
      font-size: 14px;
      color: var(--art-gray-700);
      line-height: 1.7;
      margin: 0 0 16px;
    }

    &__similar {
      margin-bottom: 16px;
    }

    &__similar-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--art-gray-500);
      margin-bottom: 6px;
    }

    &__similar-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    &__count {
      font-size: 12px;
      color: var(--art-gray-500);
      margin-bottom: 16px;
    }
  }

  .radar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    &__label {
      font-size: 12px;
      color: var(--art-gray-600);
      width: 60px;
      flex-shrink: 0;
    }

    &__value {
      font-size: 12px;
      font-weight: 700;
      color: var(--art-gray-800);
      width: 30px;
      text-align: right;
    }
  }

  .coach-qa {
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--topbar-h, 60px) - 120px);

    &__header {
      padding: 12px 18px;
      border-bottom: 1px solid var(--el-border-color-light);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    &__progress {
      font-size: 13px;
      font-weight: 700;
      color: var(--art-gray-800);
    }

    &__count {
      font-size: 12px;
      color: var(--art-gray-500);
    }

    &__transcript {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    &__current-q {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--el-border-color-light);
    }

    &__question-text {
      font-size: 14px;
      color: var(--art-gray-800);
      line-height: 1.6;
      margin-top: 6px;
    }

    &__footer {
      padding: 14px;
      border-top: 1px solid var(--el-border-color-light);
      flex-shrink: 0;
    }

    &__footer-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
  }

  .bubble {
    max-width: 85%;
    font-size: 14px;
    line-height: 1.6;

    &--user {
      align-self: flex-end;
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--el-color-warning);
      color: #fff;
    }

    &--judge {
      align-self: flex-start;
    }

    &__label {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 3px;
    }

    &__text {
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--el-fill-color-light);
      color: var(--art-gray-800);
      white-space: pre-wrap;
      border: 1px solid var(--el-border-color-light);
    }
  }

  .coach-final {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 20px;

    &__loading {
      grid-column: 1 / -1;
      padding: 40px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 12px;
      background: var(--el-bg-color);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--art-gray-500);
    }

    &__scores {
      padding: 18px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 12px;
      background: var(--el-bg-color);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    &__detail {
      padding: 20px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 12px;
      background: var(--el-bg-color);
    }

    &__closing {
      font-size: 15px;
      color: var(--art-gray-800);
      line-height: 1.7;
      font-weight: 600;
      margin: 0 0 16px;
    }

    &__section {
      margin-bottom: 16px;
    }

    &__section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--art-gray-500);
      margin-bottom: 6px;
    }

    &__list {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      li {
        font-size: 13px;
        color: var(--art-gray-700);
        line-height: 1.7;
      }
    }
  }
</style>
