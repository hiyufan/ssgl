<template>
  <section class="ssgl-page" data-page="Diagnostics">
    <!-- Header -->
    <div class="diag-header">
      <div>
        <div class="diag-header__status">
          <span
            class="diag-header__badge"
            :class="data?.status === 'healthy' ? 'diag-header__badge--ok' : 'diag-header__badge--warn'"
          >
            {{ data?.status?.toUpperCase() || '---' }}
          </span>
          <span class="diag-header__time">{{ data ? formatTime(data.timestamp) : '' }}</span>
        </div>
        <h1 class="diag-header__title">系统诊断</h1>
      </div>
      <div class="diag-header__live">
        <span class="pulse-dot" :class="data?.status === 'healthy' ? 'pulse-dot--ok' : 'pulse-dot--warn'" />
        <span class="diag-header__live-text">每 10 秒刷新</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <ElIcon :size="32" class="is-loading"><Loading /></ElIcon>
    </div>

    <!-- Error -->
    <ElResult
      v-else-if="error"
      icon="error"
      :title="error"
      sub-title="无法获取诊断数据"
    />

    <!-- Content -->
    <template v-else-if="data">
      <!-- Overview Metrics -->
      <ElRow :gutter="14" class="mb-6">
        <ElCol :xs="12" :sm="6" v-for="m in overviewMetrics" :key="m.label">
          <div class="metric-card" :style="{ borderLeftColor: m.color }">
            <div class="metric-card__icon" :style="{ color: m.color, background: m.color + '15' }">
              <ElIcon :size="18"><component :is="m.icon" /></ElIcon>
            </div>
            <div class="metric-card__body">
              <div class="metric-card__label">{{ m.label }}</div>
              <div class="metric-card__value">
                {{ m.value }}
              </div>
            </div>
          </div>
        </ElCol>
      </ElRow>

      <!-- Two-column: Memory + DB Pool -->
      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <div class="panel">
            <h3 class="panel__title">内存使用</h3>
            <div class="panel__body">
              <div v-for="bar in memoryBars" :key="bar.label" class="pool-bar">
                <div class="pool-bar__header">
                  <span class="pool-bar__label">{{ bar.label }}</span>
                  <span class="pool-bar__val">{{ bar.value }}/{{ bar.max }}</span>
                </div>
                <div class="pool-bar__track">
                  <div
                    class="pool-bar__fill"
                    :style="{ width: bar.max > 0 ? Math.min(100, (bar.value / bar.max) * 100) + '%' : '0%', background: bar.color }"
                  />
                </div>
              </div>
              <ElRow :gutter="10" class="mt-4">
                <ElCol :span="12" v-for="item in memoryCards" :key="item.label">
                  <div class="mini-card">
                    <div class="mini-card__label">{{ item.label }}</div>
                    <div class="mini-card__value" :style="{ color: item.color }">{{ item.value }}</div>
                  </div>
                </ElCol>
              </ElRow>
            </div>
          </div>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <div class="panel">
            <h3 class="panel__title">数据库连接池</h3>
            <div class="panel__body">
              <div v-for="bar in dbBars" :key="bar.label" class="pool-bar">
                <div class="pool-bar__header">
                  <span class="pool-bar__label">{{ bar.label }}</span>
                  <span class="pool-bar__val">{{ bar.value }}/{{ bar.max }}</span>
                </div>
                <div class="pool-bar__track">
                  <div
                    class="pool-bar__fill"
                    :style="{ width: bar.max > 0 ? Math.min(100, (bar.value / bar.max) * 100) + '%' : '0%', background: bar.color }"
                  />
                </div>
              </div>
              <ElRow :gutter="10" class="mt-4">
                <ElCol :span="12" v-for="item in dbCards" :key="item.label">
                  <div class="mini-card">
                    <div class="mini-card__label">{{ item.label }}</div>
                    <div class="mini-card__value" :style="{ color: item.color }">{{ item.value }}</div>
                  </div>
                </ElCol>
              </ElRow>
            </div>
          </div>
        </ElCol>
      </ElRow>
    </template>
  </section>
</template>

<script setup lang="ts">
  import { Loading, Timer, Cpu, Connection, Memo } from '@element-plus/icons-vue'
  import { systemAPI } from '@/api/ssgl'

  defineOptions({ name: 'SSGL_Diagnostics' })

  interface DiagData {
    status: string
    uptime_seconds: number
    uptime_human: string
    go_version: string
    num_cpu: number
    num_goroutine: number
    db_pool_stats: {
      open_connections: number
      in_use: number
      idle: number
      wait_count: number
      wait_duration: string
      max_open_conns: number
    }
    memory_stats: {
      alloc_mb: number
      total_alloc_mb: number
      sys_mb: number
      num_gc: number
      heap_alloc_mb: number
      heap_sys_mb: number
      heap_idle_mb: number
      heap_inuse_mb: number
    }
    timestamp: string
  }

  const data = ref<DiagData | null>(null)
  const loading = ref(true)
  const error = ref('')
  let timer: ReturnType<typeof setInterval> | null = null

  const mem = computed(() => data.value?.memory_stats ?? {
    alloc_mb: 0, total_alloc_mb: 0, sys_mb: 0, num_gc: 0,
    heap_alloc_mb: 0, heap_sys_mb: 0, heap_idle_mb: 0, heap_inuse_mb: 0,
  })
  const db = computed(() => data.value?.db_pool_stats ?? {
    open_connections: 0, in_use: 0, idle: 0, wait_count: 0, wait_duration: '0s', max_open_conns: 0,
  })

  const overviewMetrics = computed(() => [
    { label: '运行时间', value: data.value?.uptime_human || '-', color: '#4ade80', icon: Timer },
    { label: 'Go 版本', value: data.value?.go_version || '-', color: '#2dd4bf', icon: Cpu },
    { label: 'CPU 核心', value: data.value?.num_cpu ?? '-', color: '#f59e0b', icon: Connection },
    { label: 'Goroutines', value: data.value?.num_goroutine ?? '-', color: '#a78bfa', icon: Memo },
  ])

  const memoryBars = computed(() => [
    { label: '堆使用', value: Number(mem.value.heap_inuse_mb.toFixed(1)), max: Number(mem.value.heap_sys_mb.toFixed(1)), color: '#f59e0b' },
    { label: '堆空闲', value: Number(mem.value.heap_idle_mb.toFixed(1)), max: Number(mem.value.heap_sys_mb.toFixed(1)), color: '#2dd4bf' },
    { label: '已分配', value: Number(mem.value.alloc_mb.toFixed(1)), max: Number(mem.value.sys_mb.toFixed(1)), color: '#a78bfa' },
  ])

  const memoryCards = computed(() => [
    { label: '当前分配', value: `${mem.value.alloc_mb.toFixed(1)} MB`, color: '#f59e0b' },
    { label: '累计分配', value: `${mem.value.total_alloc_mb.toFixed(1)} MB`, color: '#2dd4bf' },
    { label: '系统内存', value: `${mem.value.sys_mb.toFixed(1)} MB`, color: '#a78bfa' },
    { label: 'GC 次数', value: String(mem.value.num_gc), color: '#4ade80' },
  ])

  const dbBars = computed(() => [
    { label: '活跃连接', value: db.value.in_use, max: db.value.max_open_conns, color: '#f87171' },
    { label: '空闲连接', value: db.value.idle, max: db.value.max_open_conns, color: '#4ade80' },
    { label: '总连接数', value: db.value.open_connections, max: db.value.max_open_conns, color: '#f59e0b' },
  ])

  const dbCards = computed(() => [
    { label: '等待次数', value: String(db.value.wait_count), color: '#f87171' },
    { label: '等待时长', value: db.value.wait_duration || '0s', color: '#f59e0b' },
    { label: '最大连接', value: String(db.value.max_open_conns), color: '#2dd4bf' },
    { label: '当前打开', value: String(db.value.open_connections), color: '#a78bfa' },
  ])

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  async function fetchData() {
    try {
      data.value = await systemAPI.diagnostics()
      error.value = ''
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '获取诊断数据失败'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchData()
    timer = setInterval(fetchData, 10000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
</script>

<style scoped lang="scss">
  .mb-6 {
    margin-bottom: 24px;
  }

  .mt-4 {
    margin-top: 16px;
  }

  .loading-wrap {
    display: flex;
    height: 200px;
    align-items: center;
    justify-content: center;
  }

  .diag-header {
    margin-bottom: 28px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    &__status {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 4px;
    }

    &__badge {
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 0.1em;

      &--ok {
        color: #4ade80;
      }

      &--warn {
        color: #f59e0b;
      }
    }

    &__time {
      font-family: monospace;
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    &__title {
      font-size: 28px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0;
    }

    &__live {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__live-text {
      font-family: monospace;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;

    &--ok {
      background: #4ade80;
    }

    &--warn {
      background: #f59e0b;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.4;
    }
  }

  .metric-card {
    padding: 18px 20px;
    border-left: 3px solid;
    border-radius: 12px;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);
    border-right: 1px solid var(--el-border-color-lighter);
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;

    &__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__body {
      flex: 1;
      min-width: 0;
    }

    &__label {
      font-size: 10px;
      font-weight: 700;
      color: var(--el-text-color-secondary);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    &__value {
      font-family: monospace;
      font-size: 24px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      line-height: 1;
    }
  }

  .panel {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;

    &__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin: 0 0 16px;
    }
  }

  .mini-card {
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    margin-bottom: 10px;

    &__label {
      font-size: 10px;
      color: var(--el-text-color-secondary);
      margin-bottom: 4px;
      letter-spacing: 0.05em;
    }

    &__value {
      font-family: monospace;
      font-size: 16px;
      font-weight: 700;
    }
  }

  .pool-bar {
    margin-bottom: 12px;

    &__header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    &__label {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    &__val {
      font-family: monospace;
      font-size: 11px;
      color: var(--el-text-color-primary);
    }

    &__track {
      height: 6px;
      border-radius: 3px;
      background: var(--el-fill-color);
      overflow: hidden;
    }

    &__fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;
    }
  }
</style>
