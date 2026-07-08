<template>
  <section class="ssgl-page" data-page="Approvals">
    <SSGLPageHeader title="审批中心" subtitle="多步骤工作流可视化" />

    <ElRow :gutter="16" style="height: calc(100vh - 220px)">
      <!-- Left: Approval List -->
      <ElCol :span="10" style="height: 100%">
        <ElCard shadow="never" v-loading="loading" style="height: 100%; display: flex; flex-direction: column">
          <template #header>
            <div class="flex gap-1 items-center flex-wrap">
              <ElButton
                v-for="tab in filterTabs"
                :key="tab.key"
                :type="filter === tab.key ? 'warning' : 'default'"
                size="small"
                plain
                @click="filter = tab.key"
              >
                {{ tab.label }}
                <ElBadge
                  v-if="tab.count !== undefined && tab.count > 0"
                  :value="tab.count"
                  class="ml-1"
                  type="danger"
                />
              </ElButton>
              <ElSelect
                v-model="typeFilter"
                size="small"
                placeholder="类型筛选"
                clearable
                style="width: 130px"
                class="ml-auto"
              >
                <ElOption label="全部类型" value="all" />
                <ElOption label="报名申请" value="registration" />
                <ElOption label="预计划审批" value="pre_plan" />
                <ElOption label="获奖确认" value="reward" />
              </ElSelect>
            </div>
          </template>

          <div class="flex-1 overflow-auto">
            <div
              v-for="a in filteredApprovals"
              :key="a.id"
              class="p-3 border-b cursor-pointer transition-colors"
              :class="selectedId === a.id
                ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent'"
              @click="selectedId = selectedId === a.id ? null : a.id"
            >
              <div class="flex items-start gap-2">
                <div
                  class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  :style="{ background: typeColors[a.type] || '#f59e0b' }"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold truncate">{{ a.title || a.type }}</div>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <SSGLStatusTag :status="a.status" />
                    <span class="text-xs text-gray-400">by {{ a.submitter?.name || '' }}</span>
                    <span class="ml-auto text-xs text-gray-400 font-mono">
                      步骤 {{ a.current_step }}/{{ a.total_steps }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredApprovals.length === 0" class="py-12 text-center text-gray-400">
              暂无审批记录
            </div>
          </div>
        </ElCard>
      </ElCol>

      <!-- Right: Detail -->
      <ElCol :span="14" style="height: 100%">
        <ElCard v-if="detail" shadow="never" style="height: 100%; display: flex; flex-direction: column">
          <div class="flex-1 overflow-auto p-2">
            <!-- Header -->
            <div class="mb-5">
              <div class="flex items-center gap-2 mb-2">
                <SSGLStatusTag :status="detail.status" />
                <ElTag :type="typeTagTypes[detail.type] || 'info'" size="small">
                  {{ typeLabels[detail.type] || detail.type }}
                </ElTag>
              </div>
              <h3 class="text-lg font-bold mb-1">{{ detail.title || detail.type }}</h3>
              <div class="flex gap-4 text-sm text-gray-400">
                <span>提交人：{{ detail.submitter?.name || '' }}</span>
                <span>提交时间：{{ formatDate(detail.created_at) }}</span>
              </div>
            </div>

            <!-- Workflow Visualizer -->
            <div class="mb-6 p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border">
              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">审批流程</div>
              <div class="flex items-start">
                <template v-for="(node, i) in workflowNodes" :key="i">
                  <div class="flex flex-col items-center" style="min-width: 100px; max-width: 140px">
                    <div
                      class="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                      :style="{ background: nodeDotColor(node) }"
                      :class="{ 'shadow-lg': node.isActive }"
                    >
                      <ElIcon v-if="node.isRejected" color="#fff" :size="18"><Close /></ElIcon>
                      <ElIcon v-else-if="node.isDone" color="#fff" :size="18"><Check /></ElIcon>
                      <div v-else-if="node.isActive" class="w-2.5 h-2.5 rounded-full bg-gray-800 dark:bg-white" />
                      <div v-else class="w-2 h-2 rounded-full bg-gray-300" />
                    </div>
                    <div class="text-center mt-2 px-1">
                      <div class="text-xs font-bold" :class="node.isDone || node.isActive ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'">
                        {{ node.label }}
                      </div>
                      <div v-if="node.approver" class="text-xs text-gray-400 mt-0.5">{{ node.approver }}</div>
                      <div v-if="node.actedAt" class="text-xs text-gray-400 font-mono mt-0.5">{{ node.actedAt }}</div>
                      <ElTag v-if="node.isActive" type="warning" size="small" class="mt-1">等待中</ElTag>
                      <ElTag v-if="node.isRejected" type="danger" size="small" class="mt-1">已驳回</ElTag>
                    </div>
                    <div
                      v-if="node.comment"
                      class="mt-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border text-xs text-gray-500 text-center"
                      style="max-width: 110px"
                    >
                      "{{ node.comment.slice(0, 30) }}{{ node.comment.length > 30 ? '...' : '' }}"
                    </div>
                  </div>

                  <!-- Connector -->
                  <div
                    v-if="i < workflowNodes.length - 1"
                    class="flex-1 h-0.5 rounded mt-5 min-w-[24px] overflow-hidden"
                    style="background: var(--el-border-color-lighter)"
                  >
                    <div
                      class="h-full rounded transition-all duration-700"
                      :style="{
                        width: node.isDone ? '100%' : '0%',
                        background: node.isDone ? '#10b981' : 'transparent',
                      }"
                    />
                  </div>
                </template>
              </div>
            </div>

            <!-- Approve/Reject Actions -->
            <div v-if="detail.status === 'pending'" class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border">
              <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">审批意见</div>
              <ElInput
                v-model="comment"
                type="textarea"
                :rows="3"
                placeholder="填写审批意见（可选）"
                class="mb-3"
              />
              <div class="flex gap-2">
                <ElButton type="success" :loading="acting" style="flex: 1" @click="handleApprove">
                  <ElIcon><Check /></ElIcon>
                  通过
                </ElButton>
                <ElButton type="danger" :loading="acting" style="flex: 1" @click="handleReject">
                  <ElIcon><Close /></ElIcon>
                  驳回
                </ElButton>
              </div>
            </div>
          </div>
        </ElCard>

        <ElCard v-else shadow="never" style="height: 100%">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <ElIcon :size="48"><Checked /></ElIcon>
            <div class="mt-3 text-sm">选择一项审批查看详情</div>
            <div class="text-xs text-gray-300 mt-1">点击左侧列表中的审批项目</div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </section>
</template>

<script setup lang="ts">
  import { Check, Close, Checked } from '@element-plus/icons-vue'
  import { workflowsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import type { ApprovalWorkflow } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Approvals' })

  const loading = ref(false)
  const approvals = ref<ApprovalWorkflow[]>([])
  const filter = ref('pending')
  const typeFilter = ref('all')
  const selectedId = ref<number | null>(null)
  const comment = ref('')
  const acting = ref(false)

  const typeColors: Record<string, string> = {
    registration: '#f59e0b',
    pre_plan: '#14b8a6',
    reward: '#8b5cf6',
  }

  const typeLabels: Record<string, string> = {
    registration: '报名申请',
    pre_plan: '预计划审批',
    reward: '获奖确认',
  }

  const typeTagTypes: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    registration: 'warning',
    pre_plan: '',
    reward: 'info',
  }

  const stepLabelsMap: Record<string, string[]> = {
    registration: ['提交申请', '管理员审批'],
    pre_plan: ['提交预计划', '教师初审', '管理员终审'],
    reward: ['管理员提名', '教师确认', '最终核定'],
  }

  const pendingCount = computed(() => approvals.value.filter(a => a.status === 'pending').length)

  const filterTabs = computed(() => [
    { key: 'pending', label: '待处理', count: pendingCount.value },
    { key: 'approved', label: '已通过' },
    { key: 'rejected', label: '已驳回' },
    { key: 'all', label: '全部' },
  ])

  const filteredApprovals = computed(() => {
    let list = approvals.value
    if (filter.value !== 'all') {
      list = list.filter(a => a.status === filter.value)
    }
    if (typeFilter.value !== 'all') {
      list = list.filter(a => a.type === typeFilter.value)
    }
    return list
  })

  const detail = computed(() => {
    if (!selectedId.value) return null
    return approvals.value.find(a => a.id === selectedId.value) || null
  })

  const workflowNodes = computed(() => {
    if (!detail.value) return []
    const d = detail.value
    const labels = stepLabelsMap[d.type] || []

    const nodes = [
      {
        label: labels[0] || '提交申请',
        isDone: true,
        isActive: false,
        isRejected: false,
        approver: null as string | null,
        comment: null as string | null,
        actedAt: null as string | null,
      },
      ...(d.steps || []).map((s, i) => ({
        label: labels[i + 1] || `审批 ${i + 1}`,
        isDone: s.action === 'approved' || s.action === 'rejected',
        isActive: s.action === 'pending',
        isRejected: s.action === 'rejected',
        approver: s.approver?.name || null,
        comment: s.comment || null,
        actedAt: s.acted_at ? new Date(s.acted_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : null,
      })),
    ]

    return nodes
  })

  const nodeDotColor = (node: { isRejected: boolean; isDone: boolean; isActive: boolean }) => {
    if (node.isRejected) return '#ef4444'
    if (node.isDone) return '#10b981'
    if (node.isActive) return '#f59e0b'
    return 'var(--el-border-color)'
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('zh-CN')
  }

  const loadData = async () => {
    loading.value = true
    try {
      const res = await workflowsAPI.list()
      approvals.value = res.workflows || []
    } catch {
      ElMessage.error('加载审批数据失败')
    } finally {
      loading.value = false
    }
  }

  const handleApprove = async () => {
    if (!detail.value) return
    acting.value = true
    try {
      await workflowsAPI.approve(detail.value.id, comment.value)
      ElMessage.success('已通过')
      approvals.value = approvals.value.map(a =>
        a.id === detail.value!.id ? { ...a, status: 'approved' as const } : a
      )
      comment.value = ''
    } catch {
      ElMessage.error('操作失败')
    } finally {
      acting.value = false
    }
  }

  const handleReject = async () => {
    if (!detail.value) return
    acting.value = true
    try {
      await workflowsAPI.reject(detail.value.id, comment.value)
      ElMessage.success('已驳回')
      approvals.value = approvals.value.map(a =>
        a.id === detail.value!.id ? { ...a, status: 'rejected' as const } : a
      )
      comment.value = ''
    } catch {
      ElMessage.error('操作失败')
    } finally {
      acting.value = false
    }
  }

  onMounted(loadData)
</script>
