<template>
  <section class="ssgl-page" data-page="Insights">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="AI 洞察" subtitle="智能分析 · 风险预警 · 决策建议" />

      <!-- Summary -->
      <ElCard v-if="insightsData" shadow="never" class="ssgl-mb-16">
        <template #header>
          <div class="card-header-row">
            <span class="card-title">平台概况</span>
            <ElTag :type="healthTagType">{{ insightsData.overall_health }}</ElTag>
          </div>
        </template>
        <p class="insight-summary">{{ insightsData.summary }}</p>
      </ElCard>

      <!-- Trend Analysis -->
      <ElCard v-if="insightsData?.trend_analysis" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">趋势分析</span></template>
        <ElRow :gutter="16">
          <ElCol v-for="item in trendItems" :key="item.label" :span="4">
            <div class="trend-item">
              <div class="trend-label">{{ item.label }}</div>
              <div class="trend-value" :style="{ color: item.value >= 0 ? '#22c55e' : '#ef4444' }">
                {{ item.value >= 0 ? '+' : '' }}{{ item.value }}%
              </div>
            </div>
          </ElCol>
        </ElRow>
      </ElCard>

      <!-- Insights -->
      <ElCard v-if="insightsData?.insights?.length" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">核心洞察</span></template>
        <div v-for="(insight, i) in insightsData.insights" :key="i" class="insight-item">
          <div class="insight-header">
            <ElTag size="small">{{ insight.category }}</ElTag>
            <ElTag :type="severityType(insight.severity)" size="small">{{ insight.severity }}</ElTag>
          </div>
          <div class="insight-title">{{ insight.title }}</div>
          <div class="insight-desc">{{ insight.description }}</div>
          <div v-if="insight.action" class="insight-action">建议: {{ insight.action }}</div>
        </div>
      </ElCard>

      <!-- Risk Matrix -->
      <ElCard v-if="insightsData?.risk_matrix?.length" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">风险矩阵</span></template>
        <ElTable :data="insightsData.risk_matrix" stripe size="small">
          <ElTableColumn prop="factor" label="风险因素" />
          <ElTableColumn prop="impact" label="影响" width="80" align="center">
            <template #default="{ row }">
              <ElTag :type="impactType(row.impact)" size="small">{{ row.impact }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="likelihood" label="可能性" width="80" align="center">
            <template #default="{ row }">
              <ElTag :type="impactType(row.likelihood)" size="small">{{ row.likelihood }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="score" label="分数" width="80" align="center" />
          <ElTableColumn prop="mitigation" label="缓解措施" show-overflow-tooltip />
        </ElTable>
      </ElCard>

      <!-- Recommendations -->
      <ElCard v-if="insightsData?.recommendations?.length" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">优化建议</span></template>
        <div v-for="(rec, i) in insightsData.recommendations" :key="i" class="insight-item">
          <div class="insight-header">
            <ElTag size="small">{{ rec.category }}</ElTag>
            <ElTag :type="severityType(rec.severity)" size="small">{{ rec.severity }}</ElTag>
          </div>
          <div class="insight-title">{{ rec.title }}</div>
          <div class="insight-desc">{{ rec.description }}</div>
        </div>
      </ElCard>

      <!-- Activity Bursts -->
      <ElCard v-if="insightsData?.activity_bursts?.length" shadow="never">
        <template #header><span class="card-title">活动高峰</span></template>
        <ElTable :data="insightsData.activity_bursts" stripe size="small">
          <ElTableColumn prop="period" label="时段" />
          <ElTableColumn prop="count" label="活动数" width="80" align="center" />
          <ElTableColumn label="关联赛事">
            <template #default="{ row }">
              <ElTag v-for="c in row.competitions" :key="c" size="small" class="ssgl-mr-4">{{ c }}</ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'

defineOptions({ name: 'SSGL_Insights' })

interface InsightsData {
  summary: string
  overall_health: string
  insights: Array<{ category: string; title: string; description: string; severity: string; metric?: number; action?: string }>
  trend_analysis: { competitions_growth: number; teams_growth: number; awards_growth: number; active_competitions: number; completion_rate: number; ai_audit_rate: number }
  risk_matrix: Array<{ factor: string; impact: string; likelihood: string; score: number; mitigation: string }>
  recommendations: Array<{ category: string; title: string; description: string; severity: string; action?: string }>
  activity_bursts: Array<{ period: string; count: number; competitions: string[] }>
  generated_at: string
}

const loading = ref(true)
const insightsData = ref<InsightsData | null>(null)

const healthTagType = computed(() => {
  const h = insightsData.value?.overall_health
  if (h === 'excellent' || h === 'good') return 'success'
  if (h === 'fair') return 'warning'
  return 'danger'
})

const trendItems = computed(() => {
  const t = insightsData.value?.trend_analysis
  if (!t) return []
  return [
    { label: '赛事增长', value: t.competitions_growth },
    { label: '团队增长', value: t.teams_growth },
    { label: '奖项增长', value: t.awards_growth },
    { label: '活跃赛事', value: t.active_competitions },
    { label: '完成率', value: t.completion_rate },
    { label: 'AI审核率', value: t.ai_audit_rate },
  ]
})

function severityType(severity: string) {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'success', critical: 'danger' }
  return map[severity] || 'info'
}

function impactType(impact: string) {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'success' }
  return map[impact] || 'info'
}

onMounted(async () => {
  try {
    insightsData.value = await statsAPI.insights()
  } catch (e) {
    console.error('Insights fetch error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.ssgl-loading {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.ssgl-mb-16 {
  margin-bottom: 16px;
}

.ssgl-mr-4 {
  margin-right: 4px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.insight-summary {
  font-size: 14px;
  color: var(--art-gray-700);
  line-height: 1.6;
  margin: 0;
}

.insight-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.insight-header {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.insight-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.insight-desc {
  font-size: 13px;
  color: var(--art-gray-600);
  line-height: 1.5;
}

.insight-action {
  font-size: 12px;
  color: var(--el-color-primary);
  margin-top: 6px;
}

.trend-item {
  text-align: center;
  padding: 12px 8px;
}

.trend-label {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 6px;
}

.trend-value {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}
</style>
