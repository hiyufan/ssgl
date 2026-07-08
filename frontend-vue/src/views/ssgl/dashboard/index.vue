<template>
  <section class="ssgl-page" data-page="Dashboard">
    <!-- Loading -->
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <!-- Admin Dashboard -->
      <template v-if="role === 'admin'">
        <SSGLPageHeader title="管理控制台" :subtitle="`今日有 ${pendingWorkflows.length} 个审批待处理`">
          <template #actions>
            <span class="ssgl-date">{{ currentDate }}</span>
          </template>
        </SSGLPageHeader>

        <!-- Stat Cards -->
        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol :span="6">
            <SSGLStatCard label="赛事总数" :value="overview?.total_competitions ?? 0" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="参赛团队" :value="overview?.total_teams ?? 0" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="待审批" :value="pendingWorkflows.length" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="已发奖项" :value="overview?.total_awards ?? 0" />
          </ElCol>
        </ElRow>

        <!-- Platform Overview + Pending Approvals -->
        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol :span="12">
            <ElCard shadow="never">
              <template #header><span class="card-title">平台概览</span></template>
              <ElDescriptions :column="2" border size="small">
                <ElDescriptionsItem label="总用户">{{ overview?.total_users ?? 0 }}</ElDescriptionsItem>
                <ElDescriptionsItem label="教师">{{ overview?.total_teachers ?? 0 }}</ElDescriptionsItem>
                <ElDescriptionsItem label="学生">{{ overview?.total_students ?? 0 }}</ElDescriptionsItem>
                <ElDescriptionsItem label="赛事">{{ overview?.total_competitions ?? 0 }}</ElDescriptionsItem>
              </ElDescriptions>
            </ElCard>
          </ElCol>
          <ElCol :span="12">
            <ElCard shadow="never">
              <template #header>
                <div class="card-header-row">
                  <span class="card-title">待审批 ({{ pendingWorkflows.length }})</span>
                  <ElButton size="small" text type="primary" @click="$router.push('/approvals')">查看全部</ElButton>
                </div>
              </template>
              <div v-if="pendingWorkflows.length === 0" class="ssgl-empty">暂无待办</div>
              <div v-else class="approval-list">
                <div v-for="wf in pendingWorkflows.slice(0, 4)" :key="wf.id" class="approval-item">
                  <div class="approval-info">
                    <div class="approval-title">{{ wf.title || wf.type }}</div>
                    <div class="approval-meta">{{ wf.submitter?.name }} &middot; {{ formatDate(wf.created_at) }}</div>
                  </div>
                  <ElButton size="small" type="primary" @click="$router.push('/approvals')">处理</ElButton>
                </div>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>

        <!-- Engagement Metrics -->
        <ElCard v-if="engagement" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">参与度指标</span></template>
          <ElRow :gutter="16">
            <ElCol v-for="item in engagementItems" :key="item.label" :span="4">
              <div class="engagement-item">
                <div class="engagement-label">{{ item.label }}</div>
                <div class="engagement-value" :style="{ color: item.color }">{{ item.value }}</div>
                <div class="engagement-desc">{{ item.desc }}</div>
              </div>
            </ElCol>
          </ElRow>
        </ElCard>

        <!-- Competition Progress -->
        <ElCard v-if="compProgress.length > 0" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">赛事生命周期进度</span></template>
          <div v-for="p in compProgress" :key="p.id" class="progress-item">
            <div class="progress-header">
              <span class="progress-title">{{ p.title }}</span>
              <ElTag :type="statusTagType(p.status)" size="small">{{ statusLabel(p.status) }}</ElTag>
            </div>
            <ElProgress :percentage="p.progress" :stroke-width="6" />
            <div class="progress-meta">{{ p.team_count }} 团队 &middot; {{ p.student_count }} 学生 &middot; {{ p.pre_plan_count }} 预案</div>
          </div>
        </ElCard>

        <!-- Quick Actions -->
        <ElRow :gutter="12">
          <ElCol v-for="action in adminActions" :key="action.label" :span="4">
            <ElCard shadow="hover" class="quick-action-card" @click="$router.push(action.path)">
              <div class="quick-action-label">{{ action.label }}</div>
            </ElCard>
          </ElCol>
        </ElRow>
      </template>

      <!-- Teacher Dashboard -->
      <template v-else-if="role === 'teacher'">
        <SSGLPageHeader title="教师工作台" :subtitle="`指导 ${teams.length} 支团队 · ${pendingWorkflows.length} 个待审批`">
          <template #actions>
            <span class="ssgl-date">{{ currentDate }}</span>
          </template>
        </SSGLPageHeader>

        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol :span="6">
            <SSGLStatCard label="指导团队" :value="teams.length" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="待审批" :value="pendingWorkflows.length" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="赛事管理" :value="competitions.length" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="学生评分" :value="evalData?.avg_overall?.toFixed(1) ?? '—'" />
          </ElCol>
        </ElRow>

        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol :span="12">
            <ElCard shadow="never">
              <template #header>
                <div class="card-header-row">
                  <span class="card-title">我的指导团队</span>
                  <ElButton size="small" text type="primary" @click="$router.push('/teams')">全部团队</ElButton>
                </div>
              </template>
              <div v-if="teams.length === 0" class="ssgl-empty">暂无团队</div>
              <div v-else>
                <div v-for="team in teams.slice(0, 4)" :key="team.id" class="team-item">
                  <div class="team-info">
                    <div class="team-name">{{ team.name }}</div>
                    <div class="team-meta">{{ team.competition?.title || '—' }}</div>
                  </div>
                  <ElTag size="small">{{ team.members?.length || 0 }} 人</ElTag>
                </div>
              </div>
            </ElCard>
          </ElCol>
          <ElCol :span="12">
            <ElCard shadow="never">
              <template #header>
                <div class="card-header-row">
                  <span class="card-title">待办审批</span>
                  <ElButton size="small" text type="primary" @click="$router.push('/approvals')">查看全部</ElButton>
                </div>
              </template>
              <div v-if="pendingWorkflows.length === 0" class="ssgl-empty">暂无待审批</div>
              <div v-else>
                <div v-for="wf in pendingWorkflows.slice(0, 3)" :key="wf.id" class="approval-item">
                  <div class="approval-info">
                    <div class="approval-title">{{ wf.title || wf.type }}</div>
                    <div class="approval-meta">{{ wf.submitter?.name }}</div>
                  </div>
                  <ElButton size="small" type="primary" @click="$router.push('/approvals')">审核</ElButton>
                </div>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>

        <!-- Evaluation -->
        <ElCard v-if="evalData" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">学生评价</span></template>
          <ElDescriptions :column="3" border size="small">
            <ElDescriptionsItem label="教学质量">{{ evalData.avg_teaching?.toFixed(1) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="沟通交流">{{ evalData.avg_communication?.toFixed(1) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="可及性">{{ evalData.avg_availability?.toFixed(1) }}</ElDescriptionsItem>
          </ElDescriptions>
          <div class="eval-summary">基于 {{ evalData.evaluation_count }} 条学生评价，综合评分 {{ evalData.avg_overall?.toFixed(1) }}</div>
        </ElCard>
      </template>

      <!-- Student Dashboard -->
      <template v-else>
        <SSGLPageHeader title="学生主页" :subtitle="myTeam ? `团队：${myTeam.name}` : '还没有加入团队'">
          <template #actions>
            <span class="ssgl-date">{{ currentDate }}</span>
          </template>
        </SSGLPageHeader>

        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol :span="6">
            <SSGLStatCard label="开放赛事" :value="openCompetitions.length" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="我的团队" :value="myTeam?.name ?? '—'" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="预计划" :value="myPreplan ? preplanStatusLabel(myPreplan.status) : '未创建'" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="AI 评分" :value="myPreplan?.ai_review_score ?? '—'" />
          </ElCol>
        </ElRow>

        <!-- Progress Steps -->
        <ElCard shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">竞赛进度</span></template>
          <ElSteps :active="activeStep" finish-status="success" align-center>
            <ElStep title="注册" />
            <ElStep title="组队" />
            <ElStep title="预计划" />
            <ElStep title="执行" />
            <ElStep title="获奖" />
          </ElSteps>
        </ElCard>

        <ElRow :gutter="16" class="ssgl-mb-16">
          <!-- My Team -->
          <ElCol :span="12">
            <ElCard shadow="never">
              <template #header>
                <div class="card-header-row">
                  <span class="card-title">我的团队</span>
                  <ElButton size="small" text type="primary" @click="$router.push('/teams')">查看</ElButton>
                </div>
              </template>
              <div v-if="myTeam">
                <div class="team-name-lg">{{ myTeam.name }}</div>
                <div class="team-meta">{{ myTeam.competition?.title || '—' }}</div>
                <div class="team-members">
                  <ElTag v-for="m in (myTeam.members || [])" :key="m.user?.id" size="small" class="ssgl-mr-4">
                    {{ m.user?.name || '?' }}
                  </ElTag>
                </div>
              </div>
              <div v-else class="ssgl-empty">还没有加入团队</div>
            </ElCard>
          </ElCol>

          <!-- Open Competitions -->
          <ElCol :span="12">
            <ElCard shadow="never">
              <template #header>
                <div class="card-header-row">
                  <span class="card-title">开放赛事 ({{ openCompetitions.length }})</span>
                  <ElButton size="small" text type="primary" @click="$router.push('/competitions')">查看全部</ElButton>
                </div>
              </template>
              <div v-if="openCompetitions.length === 0" class="ssgl-empty">暂无开放赛事</div>
              <div v-else>
                <div v-for="c in openCompetitions.slice(0, 4)" :key="c.id" class="comp-item" @click="$router.push('/competitions')">
                  <ElTag :type="c.status === 'ongoing' ? 'success' : 'warning'" size="small">
                    {{ c.status === 'ongoing' ? '进行中' : '报名中' }}
                  </ElTag>
                  <span class="comp-title">{{ c.title }}</span>
                </div>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>

        <!-- Quick Actions -->
        <ElCard shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">快捷操作</span></template>
          <ElRow :gutter="12">
            <ElCol v-for="action in studentActions" :key="action.label" :span="4">
              <ElCard shadow="hover" class="quick-action-card" @click="$router.push(action.path)">
                <div class="quick-action-label">{{ action.label }}</div>
                <div class="quick-action-desc">{{ action.desc }}</div>
              </ElCard>
            </ElCol>
          </ElRow>
        </ElCard>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/modules/user'
import {
  statsAPI,
  teamsAPI,
  workflowsAPI,
  competitionsAPI,
  prePlansAPI,
  profileAPI,
} from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import SSGLStatCard from '@/components/ssgl/SSGLStatCard.vue'
import type {
  StatsOverview,
  ApprovalWorkflow,
  EngagementStats,
  CompetitionProgress,
  Team,
  Competition,
  PrePlan,
} from '@/types/ssgl'

defineOptions({ name: 'SSGL_Dashboard' })

const userStore = useUserStore()
const role = computed(() => userStore.info.role || 'student')
const userName = computed(() => userStore.info.name || (role.value === 'admin' ? '管理员' : role.value === 'teacher' ? '教师' : '同学'))
const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

const loading = ref(true)
const overview = ref<StatsOverview | null>(null)
const pendingWorkflows = ref<ApprovalWorkflow[]>([])
const engagement = ref<EngagementStats | null>(null)
const compProgress = ref<CompetitionProgress[]>([])
const teams = ref<Team[]>([])
const competitions = ref<Competition[]>([])
const preplans = ref<PrePlan[]>([])
const evalData = ref<{
  avg_teaching: number
  avg_communication: number
  avg_availability: number
  avg_overall: number
  evaluation_count: number
} | null>(null)

const myTeam = computed(() => teams.value[0])
const myPreplan = computed(() => preplans.value[0])
const openCompetitions = computed(() =>
  competitions.value.filter((c) => c.status === 'published' || c.status === 'ongoing')
)

const activeStep = computed(() => {
  if (!myPreplan.value) return myTeam.value ? 2 : 1
  if (myPreplan.value.status === 'approved') return 3
  return 2
})

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

const adminActions = [
  { label: '创建赛事', path: '/competitions' },
  { label: '查看排行榜', path: '/leaderboard' },
  { label: '审批中心', path: '/approvals' },
  { label: '数据统计', path: '/stats' },
  { label: '赛事日历', path: '/calendar' },
]

const studentActions = [
  { label: '浏览赛事', desc: '查看可参加的赛事', path: '/competitions' },
  { label: '创建团队', desc: '组建你的竞赛团队', path: '/teams' },
  { label: 'AI 工具箱', desc: '智能辅助工具', path: '/aitools' },
  { label: '模拟答辩', desc: 'AI 答辩教练陪练', path: '/coach' },
  { label: '赛事日历', desc: '查看赛事时间线', path: '/calendar' },
]

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : ''
}

function statusLabel(status: string) {
  const map: Record<string, string> = { ongoing: '进行中', published: '已发布', completed: '已完成', draft: '草稿' }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = { ongoing: 'success', published: 'warning', completed: '', draft: 'info' }
  return map[status] || 'info'
}

function preplanStatusLabel(status: string) {
  const map: Record<string, string> = { approved: '已通过', submitted: '审核中', under_review: '审核中', draft: '草稿' }
  return map[status] || status
}

onMounted(async () => {
  try {
    if (role.value === 'admin') {
      const [statsRes, wfRes, engRes, progressRes] = await Promise.all([
        statsAPI.overview(),
        workflowsAPI.list({ tab: 'pending' }),
        statsAPI.engagement().catch(() => null),
        statsAPI.progress().catch(() => ({ competitions: [] })),
      ])
      overview.value = statsRes
      pendingWorkflows.value = wfRes.workflows || []
      engagement.value = engRes
      compProgress.value = (progressRes.competitions || []).slice(0, 6)
    } else if (role.value === 'teacher') {
      const [teamRes, wfRes, statsRes, compRes, planRes] = await Promise.all([
        teamsAPI.list(),
        workflowsAPI.list({ tab: 'pending' }),
        statsAPI.teachers().catch(() => ({ teachers: [] })),
        competitionsAPI.list({ page_size: '100' }).catch(() => ({ competitions: [] })),
        prePlansAPI.list({ page_size: '100' }).catch(() => ({ pre_plans: [] })),
      ])
      teams.value = teamRes.teams || []
      pendingWorkflows.value = wfRes.workflows || []
      competitions.value = compRes.competitions || []
      preplans.value = planRes.pre_plans || []
      const teacher = (statsRes.teachers || []).find((t) => t.id === userStore.info.id)
      if (teacher) {
        evalData.value = {
          avg_teaching: teacher.avg_teaching || 0,
          avg_communication: teacher.avg_communication || 0,
          avg_availability: teacher.avg_availability || 0,
          avg_overall: teacher.avg_overall || 0,
          evaluation_count: teacher.evaluation_count || 0,
        }
      }
    } else {
      const [teamRes, planRes, compRes] = await Promise.all([
        teamsAPI.list(),
        prePlansAPI.list(),
        competitionsAPI.list(),
      ])
      teams.value = teamRes.teams || []
      preplans.value = planRes.pre_plans || []
      competitions.value = compRes.competitions || []
    }
  } catch (e) {
    console.error('Dashboard fetch error:', e)
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

.ssgl-date {
  font-size: 12px;
  color: var(--art-gray-500);
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

.ssgl-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--art-gray-500);
  font-size: 13px;
}

.approval-list {
  display: flex;
  flex-direction: column;
}

.approval-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.approval-info {
  flex: 1;
  min-width: 0;
}

.approval-title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.approval-meta {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 2px;
}

.engagement-item {
  text-align: center;
  padding: 12px 8px;
}

.engagement-label {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 8px;
  font-weight: 600;
}

.engagement-value {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.engagement-desc {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 4px;
}

.progress-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 13px;
  font-weight: 600;
}

.progress-meta {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 4px;
}

.team-item,
.comp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }
}

.team-info {
  flex: 1;
  min-width: 0;
}

.team-name {
  font-size: 13px;
  font-weight: 600;
}

.team-name-lg {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.team-meta {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 2px;
}

.team-members {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 12px;
}

.comp-title {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.eval-summary {
  margin-top: 12px;
  font-size: 13px;
  color: var(--art-gray-600);
}

.quick-action-card {
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
}

.quick-action-label {
  font-size: 13px;
  font-weight: 600;
}

.quick-action-desc {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 4px;
}
</style>
