<template>
  <section class="ssgl-page" data-page="AchievementGallery">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="成就展示墙" subtitle="荣誉殿堂 · 激励前行" />

      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="6">
          <SSGLStatCard label="总奖项" :value="totalAwards" />
        </ElCol>
        <ElCol :span="6">
          <SSGLStatCard label="获奖团队" :value="uniqueTeams" />
        </ElCol>
        <ElCol :span="6">
          <SSGLStatCard label="赛事覆盖" :value="uniqueCompetitions" />
        </ElCol>
        <ElCol :span="6">
          <SSGLStatCard label="总奖金" :value="totalPrize" />
        </ElCol>
      </ElRow>

      <ElRow :gutter="16">
        <ElCol v-for="award in awards" :key="award.id" :span="6">
          <ElCard shadow="hover" class="award-card">
            <div class="award-medal">
              <ElIcon :size="36" :style="{ color: medalColor(award.rank) }"><Trophy /></ElIcon>
            </div>
            <div class="award-rank">{{ award.rank_name || `第 ${award.rank} 名` }}</div>
            <div class="award-competition">{{ award.competition?.title || '—' }}</div>
            <div class="award-team">{{ award.team?.name || '—' }}</div>
            <div v-if="award.prize_amount && Number(award.prize_amount) > 0" class="award-prize">
              ¥{{ Number(award.prize_amount).toLocaleString() }}
            </div>
            <ElTag :type="award.status === 'settled' ? 'success' : 'info'" size="small" class="award-status">
              {{ award.status === 'settled' ? '已结算' : '待结算' }}
            </ElTag>
          </ElCard>
        </ElCol>
      </ElRow>

      <div v-if="awards.length === 0" class="ssgl-empty">
        <ElEmpty description="暂无奖项数据" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Trophy, Loading } from '@element-plus/icons-vue'
import { awardsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import SSGLStatCard from '@/components/ssgl/SSGLStatCard.vue'
import type { Award } from '@/types/ssgl'

defineOptions({ name: 'SSGL_AchievementGallery' })

const loading = ref(true)
const awards = ref<Award[]>([])

const totalAwards = computed(() => awards.value.length)
const uniqueTeams = computed(() => new Set(awards.value.map((a) => a.team_id).filter(Boolean)).size)
const uniqueCompetitions = computed(() => new Set(awards.value.map((a) => a.competition_id).filter(Boolean)).size)
const totalPrize = computed(() => {
  const sum = awards.value.reduce((acc, a) => acc + (Number(a.prize_amount) || 0), 0)
  return sum > 0 ? `¥${sum.toLocaleString()}` : '0'
})

function medalColor(rank: number) {
  if (rank === 1) return '#f59e0b'
  if (rank === 2) return '#14b8a6'
  if (rank === 3) return '#a855f7'
  return '#909399'
}

onMounted(async () => {
  try {
    const res = await awardsAPI.list()
    awards.value = res.awards || []
  } catch (e) {
    console.error('Achievement gallery fetch error:', e)
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
}

.award-card {
  margin-bottom: 16px;
  text-align: center;
}

.award-medal {
  margin-bottom: 8px;
}

.award-rank {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.award-competition {
  font-size: 12px;
  color: var(--art-gray-600);
  margin-bottom: 2px;
}

.award-team {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 8px;
}

.award-prize {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-color-primary);
  font-family: var(--el-font-family-monospace);
  margin-bottom: 8px;
}

.award-status {
  margin-top: 4px;
}
</style>
