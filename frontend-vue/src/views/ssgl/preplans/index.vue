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
