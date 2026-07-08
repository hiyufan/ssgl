<template>
  <section class="ssgl-page" data-page="Registrations">
    <SSGLPageHeader title="报名管理" :subtitle="`共 ${total} 条报名记录`" />

    <!-- Stats -->
    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="6" v-for="s in statCards" :key="s.label">
        <ElCard shadow="never">
          <div class="flex items-center gap-3">
            <div class="w-2 h-8 rounded" :style="{ background: s.color }" />
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wide">{{ s.label }}</div>
              <div class="text-2xl font-bold">{{ s.value }}</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- Filters -->
    <div class="flex gap-3 mb-4 flex-wrap">
      <ElSelect v-model="statusFilter" placeholder="全部状态" clearable style="width: 150px" @change="loadData(1)">
        <ElOption label="全部状态" value="" />
        <ElOption label="待审核" value="pending" />
        <ElOption label="已通过" value="approved" />
        <ElOption label="已驳回" value="rejected" />
      </ElSelect>
      <ElSelect v-model="compFilter" placeholder="全部赛事" clearable style="width: 220px" @change="loadData(1)">
        <ElOption label="全部赛事" value="" />
        <ElOption v-for="c in competitions" :key="c.id" :label="c.title" :value="String(c.id)" />
      </ElSelect>
    </div>

    <!-- Table -->
    <ElCard shadow="never" v-loading="loading">
      <ElTable :data="regs" stripe style="width: 100%">
        <ElTableColumn prop="id" label="ID" width="70">
          <template #default="{ row }">
            <span class="text-gray-400">#{{ row.id }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="学生" min-width="140">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElAvatar :size="28">{{ (row.user?.name || '?')[0] }}</ElAvatar>
              <span class="font-medium">{{ row.user?.name || row.user?.username || `用户#${row.user_id}` }}</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="赛事" min-width="200">
          <template #default="{ row }">
            {{ row.competition?.title || `赛事#${row.competition_id}` }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="110">
          <template #default="{ row }">
            <SSGLStatusTag :status="row.status" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="备注" min-width="160">
          <template #default="{ row }">
            <span class="text-gray-400">{{ row.remark || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="时间" width="120">
          <template #default="{ row }">
            <span class="text-gray-400 text-sm">{{ formatDate(row.created_at) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <ElButton type="success" link size="small" @click="handleApprove(row.id)">
                通过
              </ElButton>
              <ElButton type="danger" link size="small" @click="openReject(row.id)">
                驳回
              </ElButton>
            </template>
            <span v-else class="text-gray-400">—</span>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="flex justify-center mt-4">
        <ElPagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </ElCard>

    <!-- Reject Dialog -->
    <ElDialog v-model="rejectVisible" title="驳回报名" width="420px" destroy-on-close>
      <ElForm @submit.prevent="handleReject">
        <ElFormItem label="驳回原因">
          <ElInput v-model="rejectReason" type="textarea" :rows="3" placeholder="填写驳回原因（可选）" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="rejectVisible = false">取消</ElButton>
        <ElButton type="danger" :loading="rejecting" @click="handleReject">确认驳回</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { registrationsAPI, competitionsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import type { CompetitionRegistration, Competition } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Registrations' })

  const loading = ref(false)
  const regs = ref<CompetitionRegistration[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = 20
  const statusFilter = ref('')
  const compFilter = ref('')
  const competitions = ref<Competition[]>([])

  // Reject dialog
  const rejectVisible = ref(false)
  const rejectId = ref<number | null>(null)
  const rejectReason = ref('')
  const rejecting = ref(false)

  const statCards = computed(() => [
    { label: '总计', value: total.value, color: 'var(--el-color-primary)' },
    { label: '待审核', value: regs.value.filter(r => r.status === 'pending').length, color: 'var(--el-color-warning)' },
    { label: '已通过', value: regs.value.filter(r => r.status === 'approved').length, color: 'var(--el-color-success)' },
    { label: '已驳回', value: regs.value.filter(r => r.status === 'rejected').length, color: 'var(--el-color-danger)' },
  ])

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('zh-CN')
  }

  const loadData = async (p?: number) => {
    if (p) page.value = p
    loading.value = true
    try {
      const params: Record<string, string> = { page: String(page.value), page_size: String(pageSize) }
      if (statusFilter.value) params.status = statusFilter.value
      if (compFilter.value) params.competition_id = compFilter.value
      const res = await registrationsAPI.list(params)
      regs.value = res.registrations || []
      total.value = res.total || 0
    } catch {
      ElMessage.error('加载报名数据失败')
    } finally {
      loading.value = false
    }
  }

  const loadCompetitions = async () => {
    try {
      const res = await competitionsAPI.list({ page_size: '100' })
      competitions.value = res.competitions || []
    } catch { /* ignore */ }
  }

  const handleApprove = async (id: number) => {
    try {
      await registrationsAPI.approve(id)
      ElMessage.success('已通过报名')
      loadData()
    } catch {
      ElMessage.error('操作失败')
    }
  }

  const openReject = (id: number) => {
    rejectId.value = id
    rejectReason.value = ''
    rejectVisible.value = true
  }

  const handleReject = async () => {
    if (!rejectId.value) return
    rejecting.value = true
    try {
      await registrationsAPI.reject(rejectId.value, rejectReason.value)
      ElMessage.success('已驳回报名')
      rejectVisible.value = false
      loadData()
    } catch {
      ElMessage.error('操作失败')
    } finally {
      rejecting.value = false
    }
  }

  onMounted(() => {
    loadData()
    loadCompetitions()
  })
</script>
