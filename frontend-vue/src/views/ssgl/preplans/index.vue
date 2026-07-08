<template>
  <section class="ssgl-page" data-page="Preplans">
    <SSGLPageHeader title="预计划管理" subtitle="提交预计划，获取 AI 智能评审报告">
      <template #actions>
        <ElButton type="primary" @click="openCreate">
          <ElIcon><Plus /></ElIcon>
          新建预计划
        </ElButton>
      </template>
    </SSGLPageHeader>

    <ElRow :gutter="16" style="height: calc(100vh - 220px)">
      <!-- Left: Plan List -->
      <ElCol :span="8" style="height: 100%">
        <ElCard shadow="never" v-loading="loading" style="height: 100%; display: flex; flex-direction: column">
          <template #header>
            <span class="font-semibold">预计划列表 ({{ preplans.length }})</span>
          </template>
          <div class="flex-1 overflow-auto">
            <div
              v-for="plan in preplans"
              :key="plan.id"
              class="p-3 border-b cursor-pointer transition-colors"
              :class="selected?.id === plan.id
                ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent'"
              @click="selectPlan(plan)"
            >
              <div class="font-semibold text-sm mb-1 line-clamp-1">{{ plan.title }}</div>
              <div class="flex items-center gap-2 flex-wrap">
                <SSGLStatusTag :status="plan.status" />
                <span v-if="plan.team?.name" class="text-xs text-gray-400">{{ plan.team.name }}</span>
                <span v-if="plan.ai_review_score" class="ml-auto font-mono font-bold text-sm text-teal-500">
                  AI {{ plan.ai_review_score }}
                </span>
              </div>
            </div>
            <div v-if="preplans.length === 0" class="py-12 text-center text-gray-400">
              暂无预计划
            </div>
          </div>
        </ElCard>
      </ElCol>

      <!-- Right: Detail -->
      <ElCol :span="16" style="height: 100%">
        <ElCard v-if="selected" shadow="never" style="height: 100%; display: flex; flex-direction: column">
          <template #header>
            <ElTabs v-model="activeTab" class="-mb-4">
              <ElTabPane label="方案详情" name="detail" />
              <ElTabPane name="ai">
                <template #label>
                  <span class="flex items-center gap-1">
                    <span v-if="selected.ai_review_score" class="w-2 h-2 rounded-full bg-teal-500" />
                    AI 评审报告
                  </span>
                </template>
              </ElTabPane>
            </ElTabs>
          </template>

          <div class="flex-1 overflow-auto">
            <!-- Detail Tab -->
            <div v-if="activeTab === 'detail'" class="p-2">
              <div class="flex items-center gap-3 mb-4">
                <h3 class="text-lg font-bold flex-1">{{ selected.title }}</h3>
                <SSGLStatusTag :status="selected.status" />
                <ElButton
                  v-if="selected.status === 'draft' || selected.status === 'reviewed'"
                  size="small"
                  @click="openEdit"
                >
                  编辑
                </ElButton>
              </div>

              <ElRow :gutter="12" class="mb-4">
                <ElCol :span="12">
                  <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div class="text-xs text-gray-400 mb-1">团队</div>
                    <div class="font-semibold">{{ selected.team?.name || '—' }}</div>
                  </div>
                </ElCol>
                <ElCol :span="12">
                  <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div class="text-xs text-gray-400 mb-1">提交时间</div>
                    <div class="font-semibold">{{ selected.submitted_at ? formatDate(selected.submitted_at) : '未提交' }}</div>
                  </div>
                </ElCol>
              </ElRow>

              <div v-for="field in planFields" :key="field.key" class="mb-4">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{{ field.label }}</div>
                <div class="text-sm leading-relaxed p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border">
                  {{ field.value || '—' }}
                </div>
              </div>
            </div>

            <!-- AI Review Tab -->
            <div v-if="activeTab === 'ai'" class="p-2">
              <!-- No AI review yet -->
              <div v-if="!selected.ai_review_score" class="flex flex-col items-center justify-center py-12 gap-4">
                <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-500">
                  <ElIcon :size="24"><MagicStick /></ElIcon>
                </div>
                <div class="text-sm font-semibold text-gray-500">
                  {{ reviewing ? 'AI 正在评审中，请稍候...' : '点击下方按钮，获取 AI 智能评审报告' }}
                </div>
                <ElButton type="primary" :loading="reviewing" @click="triggerReview">
                  <ElIcon v-if="!reviewing"><MagicStick /></ElIcon>
                  {{ reviewing ? '评审中...' : '请求 AI 评审' }}
                </ElButton>
              </div>

              <!-- Has AI review -->
              <div v-else>
                <div class="flex items-center gap-3 mb-5 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                  <div class="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center flex-shrink-0">
                    <ElIcon><MagicStick /></ElIcon>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wider">AI REVIEW</div>
                    <div class="text-xs text-gray-400">基于往届项目综合评估</div>
                  </div>
                </div>

                <!-- Score gauge -->
                <div class="flex justify-center mb-6">
                  <div class="relative w-36 h-36">
                    <ElProgress
                      type="circle"
                      :percentage="selected.ai_review_score"
                      :width="144"
                      :stroke-width="10"
                      :color="scoreColor(selected.ai_review_score)"
                    />
                  </div>
                </div>

                <!-- Dimensions -->
                <div v-if="aiReport.dimensions.length" class="mb-6">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">分项评分</div>
                  <div class="space-y-3">
                    <div v-for="dim in aiReport.dimensions" :key="dim.key">
                      <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium">{{ dim.label }}</span>
                        <span class="font-mono font-bold text-sm" :style="{ color: scoreColor(dim.score) }">
                          {{ dim.score }}/100
                        </span>
                      </div>
                      <ElProgress
                        :percentage="dim.score"
                        :stroke-width="7"
                        :show-text="false"
                        :color="scoreColor(dim.score)"
                      />
                    </div>
                  </div>
                </div>

                <!-- AI Notes -->
                <div>
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">AI 综合意见</div>
                  <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border text-sm leading-relaxed min-h-[80px]">
                    {{ aiReport.summary || selected.ai_review_notes || '—' }}
                  </div>
                </div>

                <div v-if="aiReport.suggestions.length" class="mt-6">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">改进建议</div>
                  <div class="space-y-2">
                    <div
                      v-for="(suggestion, index) in aiReport.suggestions"
                      :key="suggestion"
                      class="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-sm leading-relaxed"
                    >
                      <span class="font-mono font-bold text-amber-600">{{ index + 1 }}</span>
                      <span>{{ suggestion }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="aiReport.similarProjects.length" class="mt-6">
                  <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">参考相似项目</div>
                  <div class="space-y-2">
                    <div
                      v-for="project in aiReport.similarProjects"
                      :key="project.id || project.preview"
                      class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border text-sm leading-relaxed"
                    >
                      <div class="flex justify-between gap-3 mb-1">
                        <span class="font-semibold">相似项目 {{ project.id || '' }}</span>
                        <span v-if="project.similarity != null" class="text-xs text-gray-400">
                          {{ Math.round(project.similarity * 100) }}%
                        </span>
                      </div>
                      <div class="text-gray-500">{{ project.preview }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ElCard>

        <ElCard v-else shadow="never" style="height: 100%">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <ElIcon :size="48"><Document /></ElIcon>
            <div class="mt-3 text-sm">选择一项预计划查看详情</div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- Create Dialog -->
    <ElDialog v-model="showCreate" title="新建预计划" width="660px" destroy-on-close>
      <ElForm :model="createForm" label-width="100px" @submit.prevent="handleCreate">
        <!-- AI 智能解析按钮 -->
        <div class="mb-4 p-3 rounded-lg border-2 border-dashed border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20">
          <div class="flex items-center gap-2 mb-2">
            <ElIcon class="text-teal-500" :size="18"><MagicStick /></ElIcon>
            <span class="text-sm font-semibold text-teal-700 dark:text-teal-300">AI 智能解析</span>
          </div>
          <div class="flex gap-2">
            <ElInput v-model="aiParseInput" placeholder="输入项目名称或简要描述，AI 自动填充方案" size="small" />
            <ElButton type="primary" size="small" :loading="aiParsing" @click="handleAIParse" :disabled="!aiParseInput.trim()">
              {{ aiParsing ? '解析中...' : '一键解析' }}
            </ElButton>
          </div>
        </div>
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="团队" required>
              <ElSelect v-model="createForm.team_id" placeholder="选择团队" style="width: 100%">
                <ElOption
                  v-for="t in myTeams"
                  :key="t.id"
                  :label="t.competition?.title ? `${t.name} · ${t.competition.title}` : t.name"
                  :value="t.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="方案标题" required>
              <ElInput v-model="createForm.title" placeholder="项目名称" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElFormItem label="技术栈">
          <ElInput v-model="createForm.tech_stack" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="目标用户">
          <ElInput v-model="createForm.target_audience" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="市场分析">
          <ElInput v-model="createForm.market_analysis" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="创新点">
          <ElInput v-model="createForm.innovation" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="预期成果">
          <ElInput v-model="createForm.expected_outcome" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="时间规划">
          <ElInput v-model="createForm.timeline" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreate = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleCreate">提交</ElButton>
      </template>
    </ElDialog>

    <!-- Edit Dialog -->
    <ElDialog v-model="showEdit" title="编辑预计划" width="660px" destroy-on-close>
      <ElForm :model="editForm" label-width="100px" @submit.prevent="handleEdit">
        <ElFormItem label="方案标题" required>
          <ElInput v-model="editForm.title" placeholder="项目名称" />
        </ElFormItem>
        <ElFormItem label="技术栈">
          <ElInput v-model="editForm.tech_stack" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="目标用户">
          <ElInput v-model="editForm.target_audience" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="市场分析">
          <ElInput v-model="editForm.market_analysis" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="创新点">
          <ElInput v-model="editForm.innovation" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="预期成果">
          <ElInput v-model="editForm.expected_outcome" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="时间规划">
          <ElInput v-model="editForm.timeline" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showEdit = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleEdit">保存</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { Plus, MagicStick, Document } from '@element-plus/icons-vue'
  import { prePlansAPI, teamsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import type { PrePlan, Team } from '@/types/ssgl'
  import { parsePrePlanReviewNotes } from '@/utils/ssgl/aiReports'

  defineOptions({ name: 'SSGL_Preplans' })

  const loading = ref(false)
  const preplans = ref<PrePlan[]>([])
  const selected = ref<PrePlan | null>(null)
  const activeTab = ref('detail')
  const reviewing = ref(false)
  const submitting = ref(false)

  // Teams for create
  const myTeams = ref<Team[]>([])

  // AI 智能解析
  const aiParseInput = ref('')
  const aiParsing = ref(false)

  // Create dialog
  const showCreate = ref(false)
  const createForm = reactive({
    team_id: null as number | null,
    title: '',
    tech_stack: '',
    target_audience: '',
    market_analysis: '',
    innovation: '',
    expected_outcome: '',
    timeline: '',
  })

  // Edit dialog
  const showEdit = ref(false)
  const editForm = reactive({
    title: '',
    tech_stack: '',
    target_audience: '',
    market_analysis: '',
    innovation: '',
    expected_outcome: '',
    timeline: '',
  })

  const planFields = computed(() => {
    if (!selected.value) return []
    return [
      { key: 'tech_stack', label: '技术栈', value: selected.value.tech_stack },
      { key: 'target_audience', label: '目标用户', value: selected.value.target_audience },
      { key: 'market_analysis', label: '市场分析', value: selected.value.market_analysis },
      { key: 'innovation', label: '创新点', value: selected.value.innovation },
      { key: 'expected_outcome', label: '预期成果', value: selected.value.expected_outcome },
    ].filter(f => f.value)
  })

  const aiReport = computed(() =>
    parsePrePlanReviewNotes(selected.value?.ai_review_notes, selected.value?.ai_dimensions || [])
  )

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 65) return '#f59e0b'
    return '#ef4444'
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('zh-CN')
  }

  const loadPreplans = async () => {
    loading.value = true
    try {
      const res = await prePlansAPI.list()
      const plans = res.pre_plans || []
      preplans.value = plans
      if (plans.length > 0 && !selected.value) {
        selectPlan(plans[0])
      }
    } catch {
      ElMessage.error('加载预计划数据失败')
    } finally {
      loading.value = false
    }
  }

  const loadTeams = async () => {
    try {
      const res = await teamsAPI.list()
      myTeams.value = res.teams || []
    } catch { /* ignore */ }
  }

  const selectPlan = (plan: PrePlan) => {
    selected.value = plan
    activeTab.value = 'detail'
  }

  const openCreate = () => {
    createForm.team_id = null
    createForm.title = ''
    createForm.tech_stack = ''
    createForm.target_audience = ''
    createForm.market_analysis = ''
    createForm.innovation = ''
    createForm.expected_outcome = ''
    createForm.timeline = ''
    aiParseInput.value = ''
    showCreate.value = true
  }

  const openEdit = () => {
    if (!selected.value) return
    editForm.title = selected.value.title || ''
    editForm.tech_stack = selected.value.tech_stack || ''
    editForm.target_audience = selected.value.target_audience || ''
    editForm.market_analysis = selected.value.market_analysis || ''
    editForm.innovation = selected.value.innovation || ''
    editForm.expected_outcome = selected.value.expected_outcome || ''
    editForm.timeline = selected.value.timeline || ''
    showEdit.value = true
  }

  // Mock AI 解析
  const handleAIParse = async () => {
    if (!aiParseInput.value.trim()) return
    aiParsing.value = true
    await new Promise(r => setTimeout(r, 1800))

    const input = aiParseInput.value.trim()
    const lower = input.toLowerCase()

    let template: Record<string, string> = {}
    if (lower.includes('ai') || lower.includes('智能') || lower.includes('机器学习') || lower.includes('深度学习')) {
      template = {
        title: input.length < 15 ? `${input}——基于深度学习的智能应用系统` : input,
        tech_stack: 'Python 3.10+, TensorFlow / PyTorch, FastAPI, Vue 3, PostgreSQL, Docker',
        target_audience: '面向高校学生和科研人员，提供智能化的分析与辅助决策工具，降低专业门槛，提升工作效率',
        market_analysis: '国内AI应用市场规模已突破5000亿元，年增长率超过30%。教育领域AI工具需求旺盛，但现有产品多为通用型，缺乏针对特定场景的垂直解决方案',
        innovation: '1. 基于大语言模型的领域知识问答；2. 多模态数据融合分析；3. 可视化决策看板；4. 支持离线部署',
        expected_outcome: '完成一个可演示的智能应用原型系统，包含Web端界面、API接口文档、模型训练报告。预计申请软件著作权1项',
        timeline: '第1-2周：需求分析与技术选型\n第3-5周：核心算法开发与模型训练\n第6-7周：前后端开发与联调\n第8周：测试优化与文档撰写',
      }
    } else if (lower.includes('电商') || lower.includes('商业') || lower.includes('营销') || lower.includes('创业')) {
      template = {
        title: input.length < 15 ? `${input}——数字化营销创新方案` : input,
        tech_stack: '微信小程序, React, Node.js, MySQL, 微信支付API, ECharts',
        target_audience: '面向中小型商家和创业团队，提供低成本的数字化营销和客户管理解决方案',
        market_analysis: '小程序电商市场规模超万亿，中小商家数字化转型需求迫切。70%的中小商家仍在使用传统经营模式，市场空间巨大',
        innovation: '1. AI智能选品推荐；2. 社交裂变营销引擎；3. 实时数据驾驶舱；4. 低成本SaaS模式',
        expected_outcome: '完成微信小程序MVP版本，包含商品管理、订单系统、营销工具、数据看板四大模块',
        timeline: '第1周：市场调研与竞品分析\n第2-3周：产品原型设计\n第4-6周：核心功能开发\n第7周：测试与内测\n第8周：上线推广',
      }
    } else if (lower.includes('物联网') || lower.includes('iot') || lower.includes('硬件') || lower.includes('传感器')) {
      template = {
        title: input.length < 15 ? `${input}——物联网智能监控系统` : input,
        tech_stack: 'Arduino / ESP32, MQTT, Python, React, InfluxDB, Grafana',
        target_audience: '面向智慧校园、智能家居、工业监控等场景，提供实时感知和远程控制能力',
        market_analysis: '全球IoT市场规模预计2026年达1.5万亿美元，国内市场年增速超25%。智慧校园和智能制造是两大核心应用场景',
        innovation: '1. 边缘端轻量AI推理；2. LoRa低功耗通信；3. 数字孪生可视化；4. 异常智能预警',
        expected_outcome: '完成包含3个传感器节点的原型系统，实现数据采集、传输、存储、展示全链路',
        timeline: '第1-2周：硬件选型与电路设计\n第3-4周：嵌入式程序开发\n第5-6周：云平台搭建\n第7周：系统联调\n第8周：文档撰写',
      }
    } else {
      template = {
        title: input.length < 15 ? `${input}——创新实践项目方案` : input,
        tech_stack: 'Vue 3 / React, Python / Java, MySQL / PostgreSQL, Redis, Docker',
        target_audience: '面向在校大学生和青年创业者，解决日常学习生活中的实际痛点',
        market_analysis: '当前市场同类产品功能单一，用户体验有待提升。通过差异化定位有望获得竞争优势',
        innovation: '1. 简洁优雅的交互设计；2. 智能推荐算法；3. 多端同步；4. 开放API接口',
        expected_outcome: '完成Web端和移动端MVP版本，进行小规模用户测试(N≥50)，产出技术文档和商业计划书',
        timeline: '第1周：需求调研\n第2-3周：UI/UX设计\n第4-6周：核心功能开发\n第7周：集成测试\n第8周：用户测试与答辩',
      }
    }

    createForm.title = template.title
    await new Promise(r => setTimeout(r, 200))
    createForm.tech_stack = template.tech_stack
    await new Promise(r => setTimeout(r, 200))
    createForm.target_audience = template.target_audience
    await new Promise(r => setTimeout(r, 200))
    createForm.market_analysis = template.market_analysis
    await new Promise(r => setTimeout(r, 200))
    createForm.innovation = template.innovation
    await new Promise(r => setTimeout(r, 200))
    createForm.expected_outcome = template.expected_outcome
    await new Promise(r => setTimeout(r, 200))
    createForm.timeline = template.timeline

    ElMessage.success('AI 智能解析完成，已自动填充方案内容')
    aiParsing.value = false
  }

  const handleCreate = async () => {
    if (!createForm.team_id) return ElMessage.warning('请选择团队')
    if (!createForm.title.trim()) return ElMessage.warning('请填写方案标题')

    const team = myTeams.value.find(t => t.id === createForm.team_id)
    if (!team) return ElMessage.warning('团队无效')

    submitting.value = true
    try {
      const res = await prePlansAPI.create({
        competition_id: team.competition_id,
        team_id: team.id,
        title: createForm.title.trim(),
        tech_stack: createForm.tech_stack,
        target_audience: createForm.target_audience,
        market_analysis: createForm.market_analysis,
        innovation: createForm.innovation,
        expected_outcome: createForm.expected_outcome,
        timeline: createForm.timeline,
      })
      ElMessage.success('预计划已提交')
      preplans.value = [res.pre_plan, ...preplans.value]
      selected.value = res.pre_plan
      activeTab.value = 'detail'
      showCreate.value = false
    } catch {
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  }

  const handleEdit = async () => {
    if (!selected.value) return
    if (!editForm.title.trim()) return ElMessage.warning('请填写方案标题')

    submitting.value = true
    try {
      const res = await prePlansAPI.update(selected.value.id, {
        title: editForm.title.trim(),
        tech_stack: editForm.tech_stack,
        target_audience: editForm.target_audience,
        market_analysis: editForm.market_analysis,
        innovation: editForm.innovation,
        expected_outcome: editForm.expected_outcome,
        timeline: editForm.timeline,
      })
      ElMessage.success('预计划已更新')
      preplans.value = preplans.value.map(p => p.id === res.pre_plan.id ? res.pre_plan : p)
      selected.value = res.pre_plan
      showEdit.value = false
    } catch {
      ElMessage.error('更新失败')
    } finally {
      submitting.value = false
    }
  }

  const triggerReview = async () => {
    if (!selected.value) return
    reviewing.value = true
    try {
      const res = await prePlansAPI.review(selected.value.id)
      ElMessage.success('AI 评审完成')
      const updated = res.pre_plan
      preplans.value = preplans.value.map(p => p.id === updated.id ? updated : p)
      selected.value = updated
    } catch {
      ElMessage.error('AI 评审失败')
    } finally {
      reviewing.value = false
    }
  }

  onMounted(() => {
    loadPreplans()
    loadTeams()
  })
</script>
