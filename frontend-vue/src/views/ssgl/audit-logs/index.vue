<template>
  <section class="ssgl-page" data-page="AuditLogs">
    <SSGLPageHeader title="审计日志" subtitle="系统全量操作记录 · 不可篡改" />

    <!-- Stats Cards -->
    <ElRow :gutter="12" class="mb-4">
      <ElCol :span="6" v-for="item in statCards" :key="item.label">
        <div class="stat-card">
          <div class="stat-card__value" :style="{ color: item.color }">{{ item.value }}</div>
          <div class="stat-card__label">{{ item.label }}</div>
        </div>
      </ElCol>
    </ElRow>

    <!-- Filters -->
    <div class="filter-bar mb-4">
      <ElInput
        v-model="search"
        placeholder="搜索用户、操作、对象…"
        :prefix-icon="Search"
        clearable
        style="max-width: 280px"
      />
      <ElRadioGroup v-model="actionFilter" size="small" @change="handleFilterChange">
        <ElRadioButton label="all">全部</ElRadioButton>
        <ElRadioButton label="login">登录</ElRadioButton>
        <ElRadioButton label="create">创建</ElRadioButton>
        <ElRadioButton label="approve">审批</ElRadioButton>
      </ElRadioGroup>
    </div>

    <!-- Table -->
    <ElTable :data="filtered" v-loading="loading" stripe style="width: 100%">
      <ElTableColumn label="时间" width="160">
        <template #default="{ row }">
          <span class="mono-text">{{ formatTime(row.created_at) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="用户" width="140">
        <template #default="{ row, $index }">
          <div class="user-cell">
            <ElAvatar :size="24" :style="{ background: avatarColor($index) }">
              {{ (row.username || '-').charAt(0).toUpperCase() }}
            </ElAvatar>
            <span class="user-cell__name">{{ row.username || '-' }}</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="120">
        <template #default="{ row }">
          <ElTag :color="getActionMeta(row.action).color" effect="dark" size="small" round>
            {{ getActionMeta(row.action).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="资源" min-width="200">
        <template #default="{ row }">
          <span class="ellipsis-cell">{{ row.resource || row.path }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="IP 地址" width="140">
        <template #default="{ row }">
          <span class="mono-text">{{ row.ip }}</span>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination-wrap">
      <ElPagination
        v-model:current-page="page"
        :page-size="20"
        :total="totalPages * 20"
        layout="prev, pager, next"
        background
        @current-change="fetchData"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { Search } from '@element-plus/icons-vue'
  import { auditAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import type { AuditLog, AuditStats } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_AuditLogs' })

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    login: { label: '登录', color: '#f59e0b' },
    register: { label: '注册', color: '#a78bfa' },
    create: { label: '创建', color: '#4ade80' },
    read: { label: '查看', color: '#94a3b8' },
    update: { label: '更新', color: '#2dd4bf' },
    delete: { label: '删除', color: '#f87171' },
    approve: { label: '审批通过', color: '#4ade80' },
    reject: { label: '驳回', color: '#f87171' },
  }

  const AVATAR_COLORS = ['#f59e0b', '#4a9eff', '#a78bfa', '#4ade80', '#f87171', '#2dd4bf']

  const logs = ref<AuditLog[]>([])
  const stats = ref<AuditStats | null>(null)
  const loading = ref(true)
  const search = ref('')
  const actionFilter = ref('all')
  const page = ref(1)
  const totalPages = ref(1)

  const statCards = computed(() => [
    { label: '今日操作', value: stats.value?.today_logs ?? '-', color: '#f59e0b' },
    { label: '总计日志', value: stats.value?.total_logs ?? '-', color: '#2dd4bf' },
    { label: '登录失败', value: stats.value?.failed_logins ?? '-', color: '#f87171' },
    { label: '操作类型', value: stats.value?.top_actions?.length ?? '-', color: '#a78bfa' },
  ])

  const filtered = computed(() => {
    if (!search.value) return logs.value
    const q = search.value.toLowerCase()
    return logs.value.filter(
      log =>
        log.username?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.resource?.toLowerCase().includes(q)
    )
  })

  function getActionMeta(action: string) {
    return ACTION_LABELS[action] ?? { label: action, color: '#94a3b8' }
  }

  function avatarColor(index: number) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length]
  }

  function formatTime(dateStr: string) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function handleFilterChange() {
    page.value = 1
    fetchData()
  }

  async function fetchData() {
    loading.value = true
    try {
      const [logRes, statsRes] = await Promise.all([
        auditAPI.list({
          page: page.value,
          page_size: 20,
          action: actionFilter.value !== 'all' ? actionFilter.value : undefined,
        }),
        auditAPI.stats(),
      ])
      logs.value = logRes.logs || []
      totalPages.value = logRes.total_pages || 1
      stats.value = statsRes
    } catch (e) {
      console.error('Failed to fetch audit logs:', e)
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchData)
</script>

<style scoped lang="scss">
  .mb-4 {
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    gap: 12px;

    &__value {
      font-family: var(--el-font-family);
      font-size: 22px;
      font-weight: 700;
    }

    &__label {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .filter-bar {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    &__name {
      font-weight: 600;
      font-size: 13px;
    }
  }

  .mono-text {
    font-family: var(--el-font-family);
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .ellipsis-cell {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    max-width: 200px;
    color: var(--el-text-color-regular);
  }

  .pagination-wrap {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }
</style>
