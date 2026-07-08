<template>
  <section class="ssgl-page" data-page="Points">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="积分成就" subtitle="参与赛事活动获取积分，查看排行榜和积分历史" />

      <!-- Summary Cards -->
      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="8">
          <ElCard shadow="never" class="summary-card">
            <div class="summary-label">总积分</div>
            <div class="summary-value amber">{{ summary?.total_points ?? 0 }}</div>
          </ElCard>
        </ElCol>
        <ElCol :span="8">
          <ElCard shadow="never" class="summary-card">
            <div class="summary-label">当前排名</div>
            <div class="summary-value purple">#{{ summary?.rank ?? 0 }}</div>
          </ElCard>
        </ElCol>
        <ElCol :span="8">
          <ElCard shadow="never" class="summary-card">
            <div class="summary-label">积分来源</div>
            <div class="summary-value teal">{{ summary?.breakdown?.length ?? 0 }}</div>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Breakdown -->
      <ElCard v-if="summary?.breakdown?.length" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">积分构成</span></template>
        <ElRow :gutter="12">
          <ElCol v-for="b in summary.breakdown" :key="b.reason" :span="6">
            <ElCard shadow="hover" class="breakdown-card">
              <div class="breakdown-header">
                <span class="breakdown-label">{{ reasonLabels[b.reason]?.label || b.reason }}</span>
                <span class="breakdown-value" :style="{ color: reasonLabels[b.reason]?.color || '#909399' }">+{{ b.total }}</span>
              </div>
              <ElProgress :percentage="Math.round((b.total / maxBreakdownTotal) * 100)" :stroke-width="4" :show-text="false" />
              <div class="breakdown-count">{{ b.count }} 次</div>
            </ElCard>
          </ElCol>
        </ElRow>
      </ElCard>

      <!-- Tabs -->
      <ElTabs v-model="activeTab" class="ssgl-mb-16">
        <ElTabPane label="积分规则" name="overview">
          <ElCard shadow="never">
            <ElRow :gutter="12">
              <ElCol v-for="rule in pointsRules" :key="rule.action" :span="8">
                <div class="rule-item">
                  <span class="rule-action">{{ rule.action }}</span>
                  <span class="rule-points">+{{ rule.points }}</span>
                </div>
              </ElCol>
            </ElRow>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="积分明细" name="history">
          <ElCard shadow="never">
            <div v-if="history.length === 0" class="ssgl-empty">暂无积分记录</div>
            <div v-else class="history-list">
              <div v-for="p in history" :key="p.id" class="history-item">
                <div class="history-info">
                  <div class="history-label">{{ reasonLabels[p.reason]?.label || p.reason }}</div>
                  <div class="history-time">{{ new Date(p.created_at).toLocaleString('zh-CN') }}</div>
                </div>
                <span class="history-points">+{{ p.points }}</span>
              </div>
            </div>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="排行榜" name="leaderboard">
          <ElCard shadow="never">
            <div v-if="leaderboard.length === 0" class="ssgl-empty">暂无排行数据</div>
            <div v-else class="leaderboard-list">
              <div v-for="(entry, idx) in leaderboard" :key="entry.user_id" class="leaderboard-item" :class="{ 'leaderboard-top': idx < 3 }">
                <div class="leaderboard-rank" :class="{ 'rank-top3': idx < 3 }">
                  <span v-if="idx < 3">
                    <ElIcon :size="18"><Medal /></ElIcon>
                  </span>
                  <span v-else>#{{ idx + 1 }}</span>
                </div>
                <div class="leaderboard-info">
                  <div class="leaderboard-name">{{ entry.name }}</div>
                  <div class="leaderboard-username">@{{ entry.username }}</div>
                </div>
                <div class="leaderboard-score">{{ entry.total_points }}</div>
                <span class="leaderboard-unit">分</span>
              </div>
            </div>
          </ElCard>
        </ElTabPane>
      </ElTabs>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Medal } from '@element-plus/icons-vue'
import { pointsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import type { AchievementPoint, PointsSummary, PointsLeaderboardEntry } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Points' })

const loading = ref(true)
const activeTab = ref('overview')
const summary = ref<PointsSummary | null>(null)
const history = ref<AchievementPoint[]>([])
const leaderboard = ref<PointsLeaderboardEntry[]>([])

const reasonLabels: Record<string, { label: string; color: string }> = {
  competition_register: { label: '赛事报名', color: '#14b8a6' },
  team_join: { label: '加入团队', color: '#a855f7' },
  preplan_submit: { label: '提交预案', color: '#f59e0b' },
  award_received: { label: '获得奖项', color: '#f59e0b' },
  evaluation_given: { label: '评价导师', color: '#22c55e' },
  ai_review: { label: 'AI 评审', color: '#6366f1' },
  milestone_complete: { label: '里程碑完成', color: '#14b8a6' },
  manual_award: { label: '管理员奖励', color: '#f59e0b' },
  competition_win: { label: '赛事获奖', color: '#f59e0b' },
  test: { label: '测试', color: '#909399' },
}

const maxBreakdownTotal = computed(() => Math.max(...(summary.value?.breakdown || []).map((b) => b.total), 1))

const pointsRules = [
  { action: '赛事报名', points: 25 },
  { action: '加入团队', points: 10 },
  { action: '提交预案', points: 30 },
  { action: 'AI 评审通过', points: 20 },
  { action: '获得奖项', points: 50 },
  { action: '评价导师', points: 5 },
]

onMounted(async () => {
  try {
    const [sumRes, histRes, lbRes] = await Promise.all([
      pointsAPI.me().catch(() => ({ total_points: 0, rank: 0, breakdown: [] })),
      pointsAPI.list().catch(() => ({ points: [], total: 0, count: 0 })),
      pointsAPI.leaderboard(20).catch(() => ({ leaderboard: [], count: 0 })),
    ])
    summary.value = sumRes
    history.value = histRes.points || []
    leaderboard.value = lbRes.leaderboard || []
  } catch (e) {
    console.error('Points fetch error:', e)
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
  padding: 40px 0;
  text-align: center;
  color: var(--art-gray-500);
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.summary-card {
  text-align: center;

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.summary-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--art-gray-500);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 36px;
  font-weight: 800;
  font-family: var(--el-font-family-monospace);

  &.amber { color: #f59e0b; }
  &.purple { color: #a855f7; }
  &.teal { color: #14b8a6; }
}

.breakdown-card {
  margin-bottom: 12px;

  :deep(.el-card__body) {
    padding: 12px 14px;
  }
}

.breakdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.breakdown-label {
  font-size: 12px;
  font-weight: 600;
}

.breakdown-value {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.breakdown-count {
  font-size: 10px;
  color: var(--art-gray-500);
  margin-top: 4px;
}

.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 8px;
}

.rule-action {
  font-size: 13px;
}

.rule-points {
  font-size: 14px;
  font-weight: 700;
  color: #f59e0b;
  font-family: var(--el-font-family-monospace);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.history-info {
  flex: 1;
}

.history-label {
  font-size: 13px;
  font-weight: 600;
}

.history-time {
  font-size: 11px;
  color: var(--art-gray-500);
}

.history-points {
  font-size: 16px;
  font-weight: 700;
  color: #22c55e;
  font-family: var(--el-font-family-monospace);
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);

  &.leaderboard-top {
    background: rgba(245, 158, 11, 0.06);
    border-color: rgba(245, 158, 11, 0.2);
  }
}

.leaderboard-rank {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--art-gray-500);

  &.rank-top3 {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.leaderboard-info {
  flex: 1;
}

.leaderboard-name {
  font-size: 14px;
  font-weight: 600;
}

.leaderboard-username {
  font-size: 11px;
  color: var(--art-gray-500);
}

.leaderboard-score {
  font-size: 18px;
  font-weight: 800;
  color: #f59e0b;
  font-family: var(--el-font-family-monospace);
}

.leaderboard-unit {
  font-size: 11px;
  color: var(--art-gray-500);
}
</style>
