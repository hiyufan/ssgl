<template>
  <section class="ssgl-page" data-page="Analytics">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="数据分析中心" subtitle="交互式图表 · 实时数据 · 多维洞察" />

      <!-- Key Metrics -->
      <ElRow :gutter="12" class="ssgl-mb-16">
        <ElCol v-for="m in metrics" :key="m.label" :span="6">
          <ElCard shadow="never" class="metric-card" :style="{ borderLeft: `3px solid ${m.color}` }">
            <div class="metric-label">{{ m.label }}</div>
            <div class="metric-value">{{ m.value.toLocaleString() }}</div>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Trends + Status -->
      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="16">
          <ElCard shadow="never">
            <template #header>
              <div class="card-header-row">
                <span class="card-title">平台增长趋势</span>
                <span class="card-subtitle">{{ trends.length }} 个月</span>
              </div>
            </template>
            <ElTable v-if="trends.length > 0" :data="trends" stripe size="small" max-height="280">
              <ElTableColumn prop="month" label="月份" width="100" />
              <ElTableColumn prop="teams" label="团队" width="80" align="center" />
              <ElTableColumn prop="competitions" label="赛事" width="80" align="center" />
              <ElTableColumn prop="awards" label="奖项" width="80" align="center" />
              <ElTableColumn prop="pre_plans" label="预案" width="80" align="center" />
              <ElTableColumn prop="prize_amount" label="奖金" width="100" align="right" />
            </ElTable>
            <div v-else class="ssgl-empty">暂无趋势数据</div>
          </ElCard>
        </ElCol>
        <ElCol :span="8">
          <ElCard shadow="never">
            <template #header><span class="card-title">赛事状态分布</span></template>
            <div v-for="s in statusData" :key="s.name" class="status-item">
              <div class="status-header">
                <span class="status-label">{{ s.name }}</span>
                <span class="status-value" :style="{ color: s.color }">{{ s.value }}</span>
              </div>
              <ElProgress :percentage="Math.round((s.value / maxStatusValue) * 100)" :stroke-width="8" :show-text="false" />
            </div>
            <div v-if="statusData.length === 0" class="ssgl-empty">暂无数据</div>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Competition Performance + Popularity -->
      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="12">
          <ElCard shadow="never">
            <template #header>
              <div class="card-header-row">
                <span class="card-title">赛事参与度对比</span>
                <span class="card-subtitle">{{ compPerfData.length }} 个赛事</span>
              </div>
            </template>
            <ElTable :data="compPerfData" stripe size="small" max-height="300">
              <ElTableColumn prop="name" label="赛事" show-overflow-tooltip />
              <ElTableColumn prop="team_count" label="团队" width="80" align="center" />
              <ElTableColumn prop="pre_plan_count" label="预案" width="80" align="center" />
              <ElTableColumn prop="award_count" label="奖项" width="80" align="center" />
            </ElTable>
          </ElCard>
        </ElCol>
        <ElCol :span="12">
          <ElCard shadow="never">
            <template #header>
              <div class="card-header-row">
                <span class="card-title">赛事热度排行</span>
                <span class="card-subtitle">Top {{ popularityData.length }}</span>
              </div>
            </template>
            <ElTable :data="popularityData" stripe size="small" max-height="300">
              <ElTableColumn prop="title" label="赛事" show-overflow-tooltip />
              <ElTableColumn prop="popularity_score" label="热度分" width="100" align="right">
                <template #default="{ row }">
                  <span class="score-value">{{ row.popularity_score }}</span>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Type Distribution + Engagement Radar + Awards -->
      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="8">
          <ElCard shadow="never">
            <template #header><span class="card-title">赛事类型分布</span></template>
            <div v-for="t in typeDist" :key="t.type" class="type-item">
              <div class="type-header">
                <span class="type-label">{{ typeLabels[t.type] || t.type }}</span>
                <span class="type-count">{{ t.count }}</span>
              </div>
              <ElProgress :percentage="Math.round((t.count / maxTypeCount) * 100)" :stroke-width="8" :show-text="false" />
            </div>
            <div v-if="typeDist.length === 0" class="ssgl-empty">暂无数据</div>
          </ElCard>
        </ElCol>
        <ElCol :span="8">
          <ElCard shadow="never">
            <template #header><span class="card-title">平台健康度</span></template>
            <div v-if="engagement" class="radar-list">
              <div v-for="item in radarItems" :key="item.metric" class="radar-item">
                <div class="radar-label">{{ item.metric }}</div>
                <ElProgress :percentage="Math.round(item.value)" :stroke-width="6" />
              </div>
            </div>
            <div v-else class="ssgl-empty">暂无数据</div>
          </ElCard>
        </ElCol>
        <ElCol :span="8">
          <ElCard shadow="never">
            <template #header><span class="card-title">奖项概况</span></template>
            <ElDescriptions :column="1" border size="small">
              <ElDescriptionsItem label="总奖项">{{ overview?.total_awards ?? 0 }}</ElDescriptionsItem>
              <ElDescriptionsItem label="已结算">{{ overview?.settled_awards ?? 0 }}</ElDescriptionsItem>
              <ElDescriptionsItem label="总预案">{{ overview?.total_pre_plans ?? 0 }}</ElDescriptionsItem>
              <ElDescriptionsItem label="总评价">{{ overview?.total_evaluations ?? 0 }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Composite: Teams vs PrePlans -->
      <ElCard v-if="trends.length > 0" shadow="never">
        <template #header><span class="card-title">团队 vs 预案增长对比</span></template>
        <ElTable :data="trends" stripe size="small">
          <ElTableColumn prop="month" label="月份" width="100" />
          <ElTableColumn prop="teams" label="团队" width="100" align="center" />
          <ElTableColumn prop="pre_plans" label="预案" width="100" align="center" />
          <ElTableColumn prop="awards" label="奖项" width="100" align="center" />
        </ElTable>
      </ElCard>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import type {
  StatsOverview,
  CompetitionStat,
  TrendPoint,
  TypeDistributionItem,
  EngagementStats,
} from '@/types/ssgl'

defineOptions({ name: 'SSGL_Analytics' })

const loading = ref(true)
const overview = ref<StatsOverview | null>(null)
const trends = ref<TrendPoint[]>([])
const competitions = ref<CompetitionStat[]>([])
const popularityData = ref<Array<{ id: number; title: string; popularity_score: number }>>([])
const typeDist = ref<TypeDistributionItem[]>([])
const engagement = ref<EngagementStats | null>(null)

const COLORS = {
  teal: '#14b8a6', amber: '#f59e0b', purple: '#a855f7',
  green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
}

const metrics = computed(() => [
  { label: '赛事总数', value: overview.value?.total_competitions ?? 0, color: COLORS.amber },
  { label: '参赛团队', value: overview.value?.total_teams ?? 0, color: COLORS.teal },
  { label: '注册用户', value: overview.value?.total_users ?? 0, color: COLORS.purple },
  { label: '已发奖项', value: overview.value?.total_awards ?? 0, color: COLORS.green },
])

const statusData = computed(() => {
  if (!overview.value) return []
  const o = overview.value
  return [
    { name: '已发布', value: o.published_competitions ?? 0, color: COLORS.teal },
    { name: '进行中', value: o.ongoing_competitions ?? 0, color: COLORS.green },
  ].filter((s) => s.value > 0)
})

const maxStatusValue = computed(() => Math.max(...statusData.value.map((s) => s.value), 1))

const compPerfData = computed(() =>
  competitions.value.slice(0, 12).map((c) => ({
    name: c.title.length > 12 ? c.title.slice(0, 12) + '…' : c.title,
    team_count: c.team_count,
    pre_plan_count: c.pre_plan_count,
    award_count: c.award_count,
  }))
)

const typeLabels: Record<string, string> = {
  hackathon: '黑客松', innovation: '创新创业', research: '科研竞赛',
  business_plan: '商业计划', ai_innovation: 'AI创新', data_science: '数据科学',
}

const maxTypeCount = computed(() => Math.max(...typeDist.value.map((t) => t.count), 1))

const radarItems = computed(() => {
  if (!engagement.value) return []
  const e = engagement.value
  return [
    { metric: '组队率', value: e.team_formation_rate || 0 },
    { metric: 'AI评审率', value: e.ai_review_rate || 0 },
    { metric: '完成率', value: e.completion_rate || 0 },
    { metric: '团队规模', value: Math.min((e.avg_team_size || 0) * 20, 100) },
    { metric: '预案评分', value: Math.min((e.avg_pre_plan_score || 0) * 10, 100) },
    { metric: '活跃度', value: Math.min(((e.active_competitions || 0) / Math.max(e.total_competitions || 1, 1)) * 100, 100) },
  ]
})

onMounted(async () => {
  try {
    const [o, tr, c, pop, td, eg] = await Promise.all([
      statsAPI.overview(),
      statsAPI.trends(),
      statsAPI.competitions(),
      statsAPI.popularity(10).catch(() => ({ competitions: [] })),
      statsAPI.typeDistribution().catch(() => ({ types: [] })),
      statsAPI.engagement().catch(() => null),
    ])
    overview.value = o
    trends.value = tr.trends || []
    competitions.value = c.competitions || []
    popularityData.value = (pop.competitions || []).slice(0, 8)
    typeDist.value = td.types || []
    engagement.value = eg
  } catch (e) {
    console.error('Analytics fetch error:', e)
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

.ssgl-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--art-gray-500);
  font-size: 13px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.card-subtitle {
  font-size: 11px;
  color: var(--art-gray-500);
  font-family: var(--el-font-family-monospace);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-card {
  :deep(.el-card__body) {
    padding: 16px 18px;
  }
}

.metric-label {
  font-size: 11px;
  color: var(--art-gray-500);
  font-weight: 600;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.status-item,
.type-item {
  margin-bottom: 12px;
}

.status-header,
.type-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.status-label,
.type-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--art-gray-700);
}

.status-value,
.type-count {
  font-size: 12px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.score-value {
  font-family: var(--el-font-family-monospace);
  font-weight: 700;
  font-size: 14px;
}

.radar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.radar-label {
  width: 70px;
  font-size: 12px;
  color: var(--art-gray-700);
  flex-shrink: 0;
}
</style>
