<template>
  <section class="ssgl-page" data-page="Leaderboard">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="团队排行榜" subtitle="基于获奖数、参赛数和预案提交综合评分" />

      <!-- Top 3 Podium -->
      <div v-if="entries.length >= 3" class="podium">
        <div v-for="(entry, idx) in podiumOrder" :key="entry.team_id" class="podium-item" :class="`podium-rank-${entry.rank}`">
          <div class="podium-medal" :style="{ color: medalColors[entry.rank - 1] }">
            <ElIcon :size="32"><Medal /></ElIcon>
          </div>
          <div class="podium-team">{{ entry.team_name }}</div>
          <div class="podium-leader">{{ entry.leader_name }}</div>
          <div class="podium-bar" :style="{ height: `${barHeights[entry.rank - 1]}px`, background: `linear-gradient(180deg, ${medalColors[entry.rank - 1]}33, ${medalColors[entry.rank - 1]}11)`, borderColor: `${medalColors[entry.rank - 1]}44` }">
            <div class="podium-score" :style="{ color: medalColors[entry.rank - 1] }">{{ entry.score }}</div>
            <div class="podium-score-label">综合评分</div>
          </div>
        </div>
      </div>

      <!-- Full Table -->
      <ElCard shadow="never">
        <template #header>
          <span class="card-title">完整排名 ({{ entries.length }} 支团队)</span>
        </template>
        <ElTable :data="entries" stripe size="small">
          <ElTableColumn label="排名" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.rank <= 3" :style="{ color: medalColors[row.rank - 1] }">
                <ElIcon :size="18"><Medal /></ElIcon>
              </span>
              <span v-else class="rank-num">{{ row.rank }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="team_name" label="团队" />
          <ElTableColumn prop="leader_name" label="队长">
            <template #default="{ row }">{{ row.leader_name || '—' }}</template>
          </ElTableColumn>
          <ElTableColumn prop="competition_count" label="参赛" width="80" align="center" />
          <ElTableColumn prop="award_count" label="获奖" width="80" align="center" />
          <ElTableColumn prop="pre_plan_count" label="预案" width="80" align="center" />
          <ElTableColumn label="评分" width="100" align="right">
            <template #default="{ row }">
              <span class="score-value" :class="{ 'score-positive': row.score > 0 }">{{ row.score }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-if="entries.length === 0" class="ssgl-empty">
          <p>暂无团队数据</p>
        </div>
      </ElCard>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Medal } from '@element-plus/icons-vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import type { LeaderboardEntry } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Leaderboard' })

const loading = ref(true)
const entries = ref<LeaderboardEntry[]>([])

const medalColors = ['#f59e0b', '#14b8a6', '#a855f7']
const barHeights = [180, 140, 120]

const podiumOrder = computed(() => {
  if (entries.value.length < 3) return []
  const [first, second, third] = entries.value
  return [
    { ...second, rank: 2 },
    { ...first, rank: 1 },
    { ...third, rank: 3 },
  ]
})

onMounted(async () => {
  try {
    const data = await statsAPI.leaderboard()
    entries.value = data.leaderboard || []
  } catch (e) {
    console.error('Leaderboard fetch error:', e)
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

.ssgl-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--art-gray-500);
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.podium {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 32px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 160px;
}

.podium-medal {
  display: flex;
  align-items: center;
  justify-content: center;
}

.podium-team {
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.podium-leader {
  font-size: 11px;
  color: var(--art-gray-500);
}

.podium-bar {
  width: 100%;
  border-radius: 8px 8px 0 0;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.podium-score {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.podium-score-label {
  font-size: 10px;
  color: var(--art-gray-500);
}

.rank-num {
  font-family: var(--el-font-family-monospace);
  font-size: 13px;
  font-weight: 700;
  color: var(--art-gray-500);
}

.score-value {
  font-family: var(--el-font-family-monospace);
  font-size: 15px;
  font-weight: 700;
  color: var(--art-gray-400);
}

.score-positive {
  color: var(--el-color-primary);
}
</style>
