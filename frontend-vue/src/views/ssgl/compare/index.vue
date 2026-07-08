<template>
  <section class="ssgl-page" data-page="Compare">
    <SSGLPageHeader title="赛事对比" subtitle="选择赛事进行多维度对比分析" />

    <!-- Competition Selector -->
    <ElCard shadow="never" class="ssgl-mb-16">
      <template #header><span class="card-title">选择对比赛事</span></template>
      <ElSelect
        v-model="selectedIds"
        multiple
        filterable
        placeholder="搜索并选择赛事（至少2个）"
        style="width: 100%"
        :loading="compLoading"
      >
        <ElOption
          v-for="c in allCompetitions"
          :key="c.id"
          :label="c.title"
          :value="c.id"
        />
      </ElSelect>
      <ElButton
        type="primary"
        :disabled="selectedIds.length < 2"
        :loading="comparing"
        style="margin-top: 12px"
        @click="doCompare"
      >
        开始对比
      </ElButton>
    </ElCard>

    <!-- Comparison Result -->
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else-if="compareResult">
      <!-- Summary -->
      <ElCard shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">对比摘要</span></template>
        <ElDescriptions :column="3" border size="small">
          <ElDescriptionsItem label="最受欢迎">{{ compareResult.summary.most_popular }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最佳团队规模">{{ compareResult.summary.best_team_size }}</ElDescriptionsItem>
          <ElDescriptionsItem label="平均团队数">{{ compareResult.summary.avg_teams_overall?.toFixed(1) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总团队数">{{ compareResult.summary.total_teams }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总学生数">{{ compareResult.summary.total_students }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- Comparison Table -->
      <ElCard shadow="never">
        <template #header><span class="card-title">指标对比</span></template>
        <ElTable :data="comparisonRows" stripe size="small">
          <ElTableColumn prop="label" label="指标" width="120" />
          <ElTableColumn
            v-for="comp in compareResult.competitions"
            :key="comp.id"
            :label="comp.title"
            align="center"
          >
            <template #default="{ row }">
              <span :class="{ 'best-value': row.bestId === comp.id }">{{ row.values[comp.id] ?? '—' }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </template>

    <div v-else-if="!loading" class="ssgl-hint">
      <ElEmpty description="请至少选择2个赛事进行对比" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { competitionsAPI, comparisonAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import type { Competition, CompareResponse, CompetitionComparison } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Compare' })

const compLoading = ref(true)
const loading = ref(false)
const comparing = ref(false)
const allCompetitions = ref<Competition[]>([])
const selectedIds = ref<number[]>([])
const compareResult = ref<CompareResponse | null>(null)

type MetricRow = { label: string; values: Record<number, string | number>; bestId?: number }

const comparisonRows = computed<MetricRow[]>(() => {
  if (!compareResult.value) return []
  const comps = compareResult.value.competitions
  const metrics: Array<{ label: string; key: keyof CompetitionComparison; higher?: boolean }> = [
    { label: '团队数', key: 'team_count', higher: true },
    { label: '学生数', key: 'student_count', higher: true },
    { label: '预案数', key: 'preplan_count', higher: true },
    { label: '奖项数', key: 'award_count', higher: true },
    { label: '平均团队规模', key: 'avg_team_size', higher: true },
    { label: '报名率', key: 'registration_pct', higher: true },
    { label: '持续天数', key: 'duration_days' },
  ]
  return metrics.map((m) => {
    const values: Record<number, string | number> = {}
    let bestId: number | undefined
    let bestVal = m.higher ? -Infinity : Infinity
    for (const c of comps) {
      const v = (c as any)[m.key] ?? 0
      values[c.id] = typeof v === 'number' && m.key === 'registration_pct' ? `${v}%` : v
      if (m.higher && v > bestVal) { bestVal = v; bestId = c.id }
    }
    return { label: m.label, values, bestId }
  })
})

async function doCompare() {
  if (selectedIds.value.length < 2) return
  comparing.value = true
  loading.value = true
  try {
    compareResult.value = await comparisonAPI.compare(selectedIds.value)
  } catch (e) {
    console.error('Compare error:', e)
  } finally {
    comparing.value = false
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await competitionsAPI.list()
    allCompetitions.value = res.competitions || []
  } catch (e) {
    console.error('Fetch competitions error:', e)
  } finally {
    compLoading.value = false
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

.ssgl-hint {
  padding: 40px 0;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.best-value {
  font-weight: 700;
  color: var(--el-color-primary);
}
</style>
