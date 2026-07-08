<template>
  <section class="ssgl-page" data-page="Stats">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="统计分析" subtitle="平台数据全景 · 实时更新">
        <template #actions>
          <ElDropdown @command="handleExport">
            <ElButton :loading="!!exporting">
              <ElIcon><Download /></ElIcon>
              导出数据
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="overview">导出总览</ElDropdownItem>
                <ElDropdownItem command="competitions">导出赛事明细</ElDropdownItem>
                <ElDropdownItem command="teams">导出团队数据</ElDropdownItem>
                <ElDropdownItem command="full">全量导出</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </template>
      </SSGLPageHeader>

      <!-- Overview Cards -->
      <ElRow :gutter="12" class="ssgl-mb-16">
        <ElCol :span="4" v-for="(card, i) in overviewCards" :key="i">
          <SSGLStatCard :label="card.label" :value="card.value" />
        </ElCol>
      </ElRow>

      <!-- Engagement Metrics -->
      <ElCard v-if="engagement" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">平台参与度指标</span></template>
        <ElRow :gutter="1">
          <ElCol v-for="item in engagementItems" :key="item.label" :span="4">
            <div class="engagement-cell">
              <div class="engagement-label">{{ item.label }}</div>
              <div class="engagement-value" :style="{ color: item.color }">{{ item.value }}</div>
              <div class="engagement-desc">{{ item.desc }}</div>
            </div>
          </ElCol>
        </ElRow>
      </ElCard>

      <!-- Popularity Index -->
      <ElCard v-if="popularity.length > 0" shadow="never" class="ssgl-mb-16">
        <template #header>
          <div class="card-header-row">
            <span class="card-title">赛事热度指数 Top {{ popularity.length }}</span>
            <span class="card-subtitle">{{ popularityFormula }}</span>
          </div>
        </template>
        <ElTable :data="popularity" stripe size="small">
          <ElTableColumn label="排名" width="60" align="center">
            <template #default="{ row }">
              <span class="rank-badge" :class="{ 'rank-top': row.rank <= 3 }">{{ row.rank }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="title" label="赛事名称" show-overflow-tooltip />
          <ElTableColumn prop="team_count" label="团队" width="80" align="center" />
          <ElTableColumn prop="registration_count" label="报名" width="80" align="center" />
          <ElTableColumn prop="preplan_count" label="预案" width="80" align="center" />
          <ElTableColumn prop="award_count" label="奖项" width="80" align="center" />
          <ElTableColumn label="热度分" width="100" align="right">
            <template #default="{ row }">
              <span class="score-value">{{ row.popularity_score }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <!-- Competition Lifecycle -->
      <ElCard v-if="competitions.length > 0" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">赛事生命周期 ({{ competitions.length }} 个赛事)</span></template>
        <div v-for="comp in competitions" :key="comp.id" class="lifecycle-item">
          <div class="lifecycle-header">
            <ElTag :type="statusTagType(comp.status)" size="small">{{ statusLabel(comp.status) }}</ElTag>
            <span class="lifecycle-title">{{ comp.title }}</span>
            <span class="lifecycle-stats">
              <span class="stat-teal">{{ comp.team_count }} 团队</span>
              <span class="stat-purple">{{ comp.pre_plan_count }} 预案</span>
              <span class="stat-amber">{{ comp.award_count }} 奖项</span>
            </span>
          </div>
        </div>
      </ElCard>

      <!-- Type Distribution + Recent Activity -->
      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="12">
          <ElCard v-if="typeDistribution.length > 0" shadow="never">
            <template #header><span class="card-title">赛事类型分布</span></template>
            <div v-for="t in typeDistribution" :key="t.type" class="type-item">
              <div class="type-header">
                <span class="type-label">{{ typeLabels[t.type] || t.type }}</span>
                <span class="type-count" :style="{ color: typeColors[t.type] || 'var(--art-gray-500)' }">{{ t.count }}</span>
              </div>
              <ElProgress :percentage="Math.round((t.count / maxTypeCount) * 100)" :stroke-width="8" :show-text="false" />
            </div>
          </ElCard>
        </ElCol>
        <ElCol :span="12">
          <ElCard v-if="recentActivities.length > 0" shadow="never">
            <template #header><span class="card-title">最近动态</span></template>
            <div v-for="(a, i) in recentActivities.slice(0, 8)" :key="i" class="activity-item">
              <span class="activity-detail">{{ a.detail }}</span>
              <span class="activity-time">{{ a.created_at }}</span>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Top Students -->
      <ElCard v-if="topStudents.length > 0" shadow="never" class="ssgl-mb-16">
        <template #header>
          <div class="card-header-row">
            <span class="card-title">学生排行榜 Top 10</span>
            <span class="card-subtitle">
              总学生: {{ studentStatsData?.total_students }} &middot;
              已组队: {{ studentStatsData?.students_with_teams }} &middot;
              已获奖: {{ studentStatsData?.students_with_awards }}
            </span>
          </div>
        </template>
        <ElTable :data="topStudents" stripe size="small">
          <ElTableColumn label="排名" width="60" align="center">
            <template #default="{ $index }">
              <span class="rank-badge" :class="{ 'rank-top': $index < 3 }">{{ $index + 1 }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="name" label="学生" />
          <ElTableColumn prop="team_count" label="团队数" width="80" align="center" />
          <ElTableColumn prop="award_count" label="获奖数" width="80" align="center" />
          <ElTableColumn prop="pre_plan_count" label="预案数" width="80" align="center" />
          <ElTableColumn label="综合分" width="100" align="right">
            <template #default="{ row }">
              <span class="score-value">{{ row.award_count * 10 + row.team_count * 3 + row.pre_plan_count }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <!-- Teacher Leaderboard -->
      <ElCard v-if="teachers.length > 0" shadow="never">
        <template #header><span class="card-title">教师评价排行</span></template>
        <ElTable :data="sortedTeachers" stripe size="small">
          <ElTableColumn label="排名" width="60" align="center">
            <template #default="{ $index }">
              <span class="rank-badge" :class="{ 'rank-top': $index < 3 }">{{ $index + 1 }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="name" label="教师" />
          <ElTableColumn label="评价数" width="80" align="center">
            <template #default="{ row }">{{ row.evaluation_count }}</template>
          </ElTableColumn>
          <ElTableColumn label="教学质量" width="90" align="center">
            <template #default="{ row }">{{ row.avg_teaching?.toFixed(1) }}</template>
          </ElTableColumn>
          <ElTableColumn label="沟通交流" width="90" align="center">
            <template #default="{ row }">{{ row.avg_communication?.toFixed(1) }}</template>
          </ElTableColumn>
          <ElTableColumn label="可及性" width="90" align="center">
            <template #default="{ row }">{{ row.avg_availability?.toFixed(1) }}</template>
          </ElTableColumn>
          <ElTableColumn label="综合评分" width="100" align="right">
            <template #default="{ row }">
              <span class="score-value">{{ row.avg_overall?.toFixed(1) }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import SSGLStatCard from '@/components/ssgl/SSGLStatCard.vue'
import type {
  StatsOverview,
  TeacherStat,
  CompetitionStat,
  TrendPoint,
  TypeDistributionItem,
  ActivityItem,
  StudentStats,
  EngagementStats,
} from '@/types/ssgl'

defineOptions({ name: 'SSGL_Stats' })

const loading = ref(true)
const exporting = ref<string | null>(null)
const overview = ref<StatsOverview | null>(null)
const teachers = ref<TeacherStat[]>([])
const competitions = ref<CompetitionStat[]>([])
const trends = ref<TrendPoint[]>([])
const typeDistribution = ref<TypeDistributionItem[]>([])
const recentActivities = ref<ActivityItem[]>([])
const studentStatsData = ref<StudentStats | null>(null)
const engagement = ref<EngagementStats | null>(null)
const popularity = ref<Array<{
  id: number; title: string; type: string; team_count: number
  student_count: number; registration_count: number; preplan_count: number
  award_count: number; popularity_score: number; rank: number
}>>([])
const popularityFormula = ref('')

const topStudents = computed(() => studentStatsData.value?.top_students || [])
const sortedTeachers = computed(() => [...teachers.value].sort((a, b) => b.avg_overall - a.avg_overall))

const overviewCards = computed(() => [
  { label: '赛事总数', value: overview.value?.total_competitions ?? 0 },
  { label: '参赛团队', value: overview.value?.total_teams ?? 0 },
  { label: '参赛人数', value: overview.value?.total_users ?? 0 },
  { label: '已发奖项', value: overview.value?.total_awards ?? 0 },
  { label: '进行中', value: overview.value?.ongoing_competitions ?? 0 },
])

const engagementItems = computed(() => {
  if (!engagement.value) return []
  const e = engagement.value
  return [
    { label: '组队率', value: `${(e.team_formation_rate || 0).toFixed(1)}%`, desc: `${e.students_with_teams || 0}/${e.total_students || 0} 学生`, color: 'var(--el-color-primary)' },
    { label: 'AI 评审率', value: `${(e.ai_review_rate || 0).toFixed(1)}%`, desc: `${e.reviewed_pre_plans || 0}/${e.total_pre_plans || 0} 预案`, color: '#a855f7' },
    { label: '赛事完成率', value: `${(e.completion_rate || 0).toFixed(1)}%`, desc: `${e.published_competitions || 0} 已发布`, color: '#f59e0b' },
    { label: '平均团队规模', value: (e.avg_team_size || 0).toFixed(1), desc: `${e.total_teams || 0} 个团队`, color: '#22c55e' },
    { label: '平均预案评分', value: (e.avg_pre_plan_score || 0).toFixed(1), desc: 'AI 评审均分', color: '#ef4444' },
    { label: '进行中赛事', value: String(e.active_competitions || 0), desc: `共 ${e.total_competitions || 0} 个`, color: '#3b82f6' },
  ]
})

const maxTypeCount = computed(() => Math.max(...typeDistribution.value.map((t) => t.count), 1))

const typeLabels: Record<string, string> = {
  hackathon: '黑客松', innovation: '创新创业', research: '科研竞赛',
  business_plan: '商业计划', ai_innovation: 'AI创新', data_science: '数据科学',
}

const typeColors: Record<string, string> = {
  hackathon: '#14b8a6', innovation: '#f59e0b', research: '#a855f7',
  business_plan: '#22c55e', ai_innovation: '#3b82f6', data_science: '#ef4444',
}

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', ongoing: '进行中', ended: '已结束', cancelled: '已取消' }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, string> = { ongoing: 'success', published: 'warning', ended: 'info', cancelled: 'danger', draft: 'info' }
  return map[status] || 'info'
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function handleExport(type: string) {
  exporting.value = type
  try {
    let blob: Blob
    let filename: string
    if (type === 'overview') {
      blob = await statsAPI.exportOverview()
      filename = `平台统计_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (type === 'competitions') {
      blob = await statsAPI.exportCompetitions()
      filename = `赛事明细_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (type === 'full') {
      blob = await statsAPI.exportFull()
      filename = `全量数据_${new Date().toISOString().slice(0, 10)}.csv`
    } else {
      blob = await statsAPI.exportTeams()
      filename = `团队数据_${new Date().toISOString().slice(0, 10)}.csv`
    }
    downloadBlob(blob, filename)
  } catch (e) {
    console.error('Export failed:', e)
  } finally {
    exporting.value = null
  }
}

onMounted(async () => {
  try {
    const [o, t, c, tr, td, ra, ss, eg, pop] = await Promise.all([
      statsAPI.overview(),
      statsAPI.teachers(),
      statsAPI.competitions(),
      statsAPI.trends(),
      statsAPI.typeDistribution(),
      statsAPI.recentActivity(10),
      statsAPI.students(),
      statsAPI.engagement().catch(() => null),
      statsAPI.popularity(10).catch(() => null),
    ])
    overview.value = o
    teachers.value = t.teachers || []
    competitions.value = c.competitions || []
    trends.value = tr.trends || []
    typeDistribution.value = td.types || []
    recentActivities.value = ra.activities || []
    studentStatsData.value = ss
    engagement.value = eg
    if (pop) {
      popularity.value = pop.competitions || []
      popularityFormula.value = pop.formula || ''
    }
  } catch (e) {
    console.error('Stats fetch error:', e)
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

.engagement-cell {
  text-align: center;
  padding: 16px 8px;
  border-right: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-right: none;
  }
}

.engagement-label {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 8px;
  font-weight: 600;
}

.engagement-value {
  font-size: 22px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.engagement-desc {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 4px;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
  background: var(--art-gray-100);
  color: var(--art-gray-500);
}

.rank-top {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.score-value {
  font-family: var(--el-font-family-monospace);
  font-weight: 700;
  font-size: 14px;
}

.lifecycle-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.lifecycle-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lifecycle-title {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
}

.lifecycle-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  font-family: var(--el-font-family-monospace);
}

.stat-teal { color: var(--el-color-primary); }
.stat-purple { color: #a855f7; }
.stat-amber { color: #f59e0b; }

.type-item {
  margin-bottom: 12px;
}

.type-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.type-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--art-gray-700);
}

.type-count {
  font-size: 12px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.activity-detail {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-time {
  font-size: 11px;
  color: var(--art-gray-500);
  font-family: var(--el-font-family-monospace);
  white-space: nowrap;
}
</style>
