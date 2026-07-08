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
      <ElRow :gutter="16" class="ssgl-mb-16">
        <ElCol v-for="comp in compareResult.competitions" :key="comp.id" :span="Math.floor(24 / compareResult.competitions.length)">
          <ElCard shadow="never">
            <template #header><span class="card-title">{{ comp.title }}</span></template>
            <ElDescriptions :column="1" border size="small">
              <ElDescriptionsItem label="状态">
                <ElTag :type="statusTagType(comp.status)" size="small">{{ statusLabel(comp.status) }}</ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="类型">{{ comp.type }}</ElDescriptionsItem>
              <ElDescriptionsItem label="团队数">{{ comp.team_count }}</ElDescriptionsItem>
              <ElDescriptionsItem label="学生数">{{ comp.student_count }}</ElDescriptionsItem>
              <ElDescriptionsItem label="报名数">{{ comp.registration_count }}</ElDescriptionsItem>
              <ElDescriptionsItem label="预案数">{{ comp.pre_plan_count }}</ElDescriptionsItem>
              <ElDescriptionsItem label="奖项数">{{ comp.award_count }}</ElDescriptionsItem>
              <ElDescriptionsItem label="热度分">{{ comp.popularity_score }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Comparison Table -->
      <ElCard v-if="compareResult.metrics" shadow="never">
        <template #header><span class="card-title">指标对比</span></template>
        <ElTable :data="comparisonRows" stripe size="small">
          <ElTableColumn prop="metric" label="指标" width="120" />
          <ElTableColumn
            v-for="comp in compareResult.competitions"
            :key="comp.id"
            :label="comp.title"
            align="center"
          >
            <template #default="{ row }">
              <span :class="{ 'best-value': row.best === comp.id }">{{ row.values[comp.id] ?? '—' }}</span>
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
import type { Competition, CompareResponse } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Compare' })

const compLoading = ref(true)
const loading = ref(false)
const comparing = ref(false)
const allCompetitions = ref<Competition[]>([])
const selectedIds = ref<number[]>([])
const compareResult = ref<CompareResponse | null>(null)

const comparisonRows = computed(() => {
  if (!compareResult.value?.metrics) return []
  return compareResult.value.metrics.map((m: any) => ({
    metric: m.label || m.name,
    values: m.values || {},
    best: m.best,
  }))
})

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', ongoing: '进行中', ended: '已结束' }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, string> = { ongoing: 'success', published: 'warning', ended: 'info', draft: 'info' }
  return map[status] || 'info'
}

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
