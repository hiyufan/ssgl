<template>
  <section class="ssgl-page aitools-page" data-page="AITools">
    <SSGLPageHeader title="AI 工具箱" subtitle="10 个智能助手 · 基于往届项目知识库 · 实时流式生成">
      <template #actions>
        <ElTag type="success" v-if="streaming" effect="dark">
          <ElIcon class="is-loading"><Loading /></ElIcon>
          流式输出中
        </ElTag>
        <ElTag effect="plain">RAG + LLM</ElTag>
      </template>
    </SSGLPageHeader>

    <div class="aitools-layout">
      <!-- Tool List -->
      <div class="aitools-sidebar">
        <button
          v-for="(tool, i) in TOOLS"
          :key="tool.id"
          class="tool-card"
          :class="{ active: active === tool.id, [`anim-in d${i + 1}`]: true }"
          :style="toolCardStyle(tool, active === tool.id)"
          @click="selectTool(tool.id)"
        >
          <div class="tool-card__header">
            <span class="tool-card__name" :style="{ color: active === tool.id ? getColor(tool.color).accent : 'var(--art-gray-900)' }">{{ tool.name }}</span>
            <span v-if="active === tool.id" class="tool-card__dot" :style="{ background: getColor(tool.color).accent }" />
          </div>
          <p class="tool-card__desc">{{ tool.desc }}</p>
          <div class="tool-card__tags">
            <span
              v-for="t in tool.tags"
              :key="t"
              class="tool-card__tag"
              :style="{ background: `${getColor(tool.color).accent}18`, color: getColor(tool.color).accent, borderColor: getColor(tool.color).border }"
            >{{ t }}</span>
          </div>
        </button>
      </div>

      <!-- Main Panel -->
      <div class="aitools-panel">
        <!-- Empty state -->
        <div v-if="!activeTool" class="aitools-empty">
          <ElIcon :size="48" color="var(--el-color-primary)"><MagicStick /></ElIcon>
          <div class="aitools-empty__title">选择一个 AI 工具</div>
          <div class="aitools-empty__desc">从左侧选择工具，输入信息后点击生成</div>
        </div>

        <!-- Active tool -->
        <template v-else>
          <div class="aitools-panel__header">
            <div>
              <div class="aitools-panel__title">{{ activeTool.name }}</div>
              <div class="aitools-panel__subtitle">{{ activeTool.desc }}</div>
            </div>
            <ElButton text @click="clearActive">
              <ElIcon><Close /></ElIcon>
            </ElButton>
          </div>

          <div class="aitools-panel__body">
            <div class="aitools-panel__input-area">
              <ElInput
                v-model="input"
                type="textarea"
                :rows="3"
                :placeholder="`描述你的项目，${activeTool.name} 将为你生成专属内容…`"
                resize="none"
              />
              <ElInput
                v-if="showExtra"
                v-model="extra"
                :placeholder="extraLabel"
                style="margin-top: 8px"
              />
              <div class="aitools-panel__actions">
                <ElButton
                  type="primary"
                  :disabled="generating"
                  :loading="generating"
                  @click="generate"
                >
                  <ElIcon v-if="!generating"><MagicStick /></ElIcon>
                  {{ generating ? '生成中…' : '立即生成' }}
                </ElButton>
                <ElTag v-if="streaming" type="success" effect="plain" size="small">
                  SSE 流式响应
                </ElTag>
                <span v-if="!streaming" class="aitools-panel__tags-label">{{ activeTool.tags.join(' · ') }}</span>
              </div>
            </div>

            <div ref="outputRef" class="aitools-panel__output">
              <template v-if="output">
                <SSGLStreamOutput :output="output" :loading="false" />
                <span v-if="streaming" class="cursor-blink" />
              </template>
              <div v-else-if="!generating" class="aitools-panel__output-empty">
                <ElIcon :size="24" color="var(--art-gray-400)"><Promotion /></ElIcon>
                <span>点击「立即生成」开始</span>
              </div>
              <SSGLStreamOutput v-else output="" :loading="true" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { ref, computed, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, Close, MagicStick, Promotion } from '@element-plus/icons-vue'
  import { aiToolsAPI } from '@/api/ai'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStreamOutput from '@/components/ssgl/SSGLStreamOutput.vue'

  defineOptions({ name: 'SSGL_AITools' })

  interface Tool {
    id: string
    name: string
    desc: string
    tags: string[]
    color: string
  }

  const TOOLS: Tool[] = [
    { id: 'business-plan', name: '商业计划书生成', desc: '输入项目信息，自动生成结构完整的商业计划书草稿', tags: ['文档生成', 'GPT-4'], color: 'teal' },
    { id: 'market-analysis', name: '市场分析报告', desc: '深度分析目标市场规模、竞争格局与切入机会点', tags: ['市场分析', 'RAG'], color: 'amber' },
    { id: 'improvement', name: '项目改进建议', desc: '结合往届优秀项目 AI 对比，给出针对性改进方向', tags: ['AI 建议', '历史对比'], color: 'purple' },
    { id: 'tech-route', name: '技术路线规划', desc: '根据功能需求和团队能力生成技术架构建议', tags: ['技术规划', 'RAG'], color: 'green' },
    { id: 'resource-match', name: '资源整合建议', desc: '分析团队技能差距并推荐补充资源与合作方向', tags: ['资源匹配', 'AI'], color: 'amber' },
    { id: 'pitch-deck', name: '路演PPT大纲', desc: '根据项目信息和答辩时长，生成结构化路演PPT大纲与时间分配', tags: ['路演', '答辩教练'], color: 'purple' },
    { id: 'advisor', name: '赛事顾问', desc: '实时回答赛事规则、评审标准与参赛策略问题', tags: ['问答', 'RAG + LLM'], color: 'teal' },
    { id: 'swot-analysis', name: 'SWOT 分析', desc: '对项目进行优势/劣势/机会/威胁全面分析，含交叉策略矩阵', tags: ['战略分析', 'RAG'], color: 'green' },
    { id: 'competition-report', name: '赛事分析报告', desc: '深度分析赛事评审标准、参赛建议、时间规划与往届优秀项目特征', tags: ['赛事分析', 'RAG'], color: 'teal' },
    { id: 'study-plan', name: '备赛计划生成', desc: '根据赛事特点和团队情况，量身定制周密的备赛计划和学习路径', tags: ['备赛', '个性化'], color: 'green' },
  ]

  const COLOR_MAP: Record<string, { accent: string; bg: string; border: string }> = {
    teal:   { accent: '#0d9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.2)' },
    amber:  { accent: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)' },
    purple: { accent: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
    green:  { accent: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)' },
  }

  const EXTRA_LABELS: Record<string, string> = {
    'market-analysis': '目标市场（选填）',
    'tech-route': '团队技术栈（选填）',
    'resource-match': '项目需求（选填）',
    'pitch-deck': '答辩时长，如 10分钟（选填）',
    'swot-analysis': '竞争对手信息（选填）',
    'advisor': '剩余时间（选填）',
    'study-plan': '团队情况描述（选填）',
  }

  const active = ref<string | null>(null)
  const input = ref('')
  const extra = ref('')
  const output = ref('')
  const generating = ref(false)
  const streaming = ref(false)
  const outputRef = ref<HTMLElement | null>(null)

  const activeTool = computed(() => active.value ? TOOLS.find(t => t.id === active.value) : null)
  const showExtra = computed(() => active.value ? Object.prototype.hasOwnProperty.call(EXTRA_LABELS, active.value) : false)
  const extraLabel = computed(() => active.value ? (EXTRA_LABELS[active.value] || '附加信息（选填）') : '附加信息（选填）')

  function getColor(c: string) {
    return COLOR_MAP[c] || COLOR_MAP.teal
  }

  function toolCardStyle(tool: Tool, isActive: boolean) {
    const colors = getColor(tool.color)
    return {
      border: `1px solid ${isActive ? colors.border : 'var(--el-border-color-light)'}`,
      background: isActive ? colors.bg : 'var(--el-bg-color)',
      boxShadow: isActive ? `0 0 0 1px ${colors.border}` : 'none',
    }
  }

  function selectTool(id: string) {
    active.value = id
    output.value = ''
    input.value = ''
    extra.value = ''
  }

  function clearActive() {
    active.value = null
    output.value = ''
  }

  function scrollToBottom() {
    nextTick(() => {
      if (outputRef.value) {
        outputRef.value.scrollTop = outputRef.value.scrollHeight
      }
    })
  }

  async function generate() {
    if (!active.value || generating.value) return
    generating.value = true
    streaming.value = true
    output.value = ''

    await aiToolsAPI.callStream(active.value, input.value, extra.value || undefined, {
      onChunk(text: string) {
        output.value += text
        scrollToBottom()
      },
      onDone() {
        generating.value = false
        streaming.value = false
      },
      onError(msg: string) {
        ElMessage.error(msg)
        generating.value = false
        streaming.value = false
      },
    })
  }
</script>

<style scoped lang="scss">
  .aitools-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--topbar-h, 60px));
    overflow: hidden;
  }

  .aitools-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 16px;
    flex: 1;
    overflow: hidden;
  }

  .aitools-sidebar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .tool-card {
    padding: 16px;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    font-family: inherit;

    &:hover:not(.active) {
      border-color: var(--el-color-primary) !important;
      background: var(--el-fill-color-light) !important;
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    &__name {
      font-size: 13px;
      font-weight: 700;
    }

    &__dot {
      margin-left: auto;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    &__desc {
      font-size: 12px;
      color: var(--art-gray-500);
      line-height: 1.5;
      margin: 0;
    }

    &__tags {
      display: flex;
      gap: 5px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    &__tag {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 10px;
      border: 1px solid;
      font-family: var(--el-font-family-monospace, monospace);
      font-weight: 600;
    }
  }

  .aitools-panel {
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--el-bg-color);
  }

  .aitools-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 32px;

    &__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--art-gray-900);
    }

    &__desc {
      font-size: 13px;
      color: var(--art-gray-500);
    }
  }

  .aitools-panel__header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .aitools-panel__title {
    font-size: 14px;
    font-weight: 700;
    color: var(--art-gray-900);
  }

  .aitools-panel__subtitle {
    font-size: 11px;
    color: var(--art-gray-500);
  }

  .aitools-panel__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .aitools-panel__input-area {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  .aitools-panel__actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 10px;
  }

  .aitools-panel__tags-label {
    font-size: 11px;
    color: var(--art-gray-500);
    margin-left: auto;
    font-family: var(--el-font-family-monospace, monospace);
  }

  .aitools-panel__output {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .aitools-panel__output-empty {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--art-gray-400);
    font-size: 13px;
  }

  .cursor-blink {
    display: inline-block;
    width: 8px;
    height: 14px;
    background: var(--el-color-primary);
    margin-left: 2px;
    vertical-align: middle;
    border-radius: 1px;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
