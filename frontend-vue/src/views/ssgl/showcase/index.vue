<template>
  <section class="ssgl-page" data-page="Showcase">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="成果展示" subtitle="优秀团队与项目展示" />

      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol :span="6">
          <SSGLStatCard label="总奖项" :value="showcaseData?.total_awards ?? 0" />
        </ElCol>
        <ElCol :span="6">
          <SSGLStatCard label="获奖团队" :value="showcaseData?.total_teams ?? 0" />
        </ElCol>
        <ElCol :span="6">
          <SSGLStatCard label="赛事覆盖" :value="showcaseData?.comp_count ?? 0" />
        </ElCol>
        <ElCol :span="6">
          <SSGLStatCard label="总奖金" :value="prizeDisplay" />
        </ElCol>
      </ElRow>

      <!-- Top Teams -->
      <ElCard v-if="showcaseData?.top_teams?.length" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">优秀团队 Top</span></template>
        <ElTable :data="showcaseData.top_teams" stripe size="small">
          <ElTableColumn type="index" label="#" width="50" />
          <ElTableColumn prop="team_name" label="团队" />
          <ElTableColumn prop="leader_name" label="队长" />
          <ElTableColumn prop="competition_name" label="赛事" show-overflow-tooltip />
          <ElTableColumn prop="rank_name" label="奖项" width="100" />
          <ElTableColumn label="奖金" width="100" align="right">
            <template #default="{ row }">
              <span v-if="row.prize_amount > 0" class="prize-value">¥{{ Number(row.prize_amount).toLocaleString() }}</span>
              <span v-else>—</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <!-- All Entries -->
      <ElCard v-if="showcaseData?.entries?.length" shadow="never">
        <template #header><span class="card-title">全部获奖记录 ({{ showcaseData.entries.length }})</span></template>
        <ElTable :data="showcaseData.entries" stripe size="small">
          <ElTableColumn prop="team_name" label="团队" />
          <ElTableColumn prop="leader_name" label="队长" />
          <ElTableColumn prop="competition_name" label="赛事" show-overflow-tooltip />
          <ElTableColumn prop="comp_type" label="类型" width="100" />
          <ElTableColumn prop="rank_name" label="奖项" width="100" />
          <ElTableColumn label="奖金" width="100" align="right">
            <template #default="{ row }">
              <span v-if="row.prize_amount > 0" class="prize-value">¥{{ Number(row.prize_amount).toLocaleString() }}</span>
              <span v-else>—</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="settled_at" label="结算时间" width="120">
            <template #default="{ row }">
              {{ row.settled_at ? new Date(row.settled_at).toLocaleDateString('zh-CN') : '—' }}
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <div v-if="!showcaseData?.entries?.length" class="ssgl-empty">
        <ElEmpty description="暂无展示项目" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import SSGLStatCard from '@/components/ssgl/SSGLStatCard.vue'
import type { ShowcaseData } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Showcase' })

const loading = ref(true)
const showcaseData = ref<ShowcaseData | null>(null)

const prizeDisplay = computed(() => {
  const val = showcaseData.value?.total_prize ?? 0
  return val > 0 ? `¥${Number(val).toLocaleString()}` : '0'
})

onMounted(async () => {
  try {
    showcaseData.value = await statsAPI.showcase()
  } catch (e) {
    console.error('Showcase fetch error:', e)
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

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.prize-value {
  font-weight: 700;
  color: var(--el-color-primary);
  font-family: var(--el-font-family-monospace);
}
</style>
