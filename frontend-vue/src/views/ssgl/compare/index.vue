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
        <ElOption v-for="c in allCompetitions" :key="c.id" :label="c.title" :value="c.id" />
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
          <ElDescriptionsItem label="最受欢迎">{{
            compareResult.summary.most_popular
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最佳团队规模">{{
            compareResult.summary.best_team_size
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="平均团队数">{{
            compareResult.summary.avg_teams_overall?.toFixed(1)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总团队数">{{
            compareResult.summary.total_teams
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总学生数">{{
            compareResult.summary.total_students
          }}</ElDescriptionsItem>
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
              <span :class="{ 'best-value': row.bestId === comp.id }">{{
                row.values[comp.id] ?? '—'
              }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </template>

    <div v-else-if="!loading" class="ssgl-hint">
      <ElEmpty class="compare-empty" description="请至少选择2个赛事进行对比">
        <template #image>
          <svg
            class="compare-empty__svg"
            viewBox="0 0 320 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="compare-card-left"
                x1="62"
                y1="44"
                x2="156"
                y2="138"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="#EAF3FF" />
                <stop offset="1" stop-color="#F8FBFF" />
              </linearGradient>
              <linearGradient
                id="compare-card-right"
                x1="164"
                y1="38"
                x2="260"
                y2="134"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="#E8FBFF" />
                <stop offset="1" stop-color="#F8FDFF" />
              </linearGradient>
              <filter
                id="compare-soft-shadow"
                x="28"
                y="18"
                width="264"
                height="142"
                color-interpolation-filters="sRGB"
              >
                <feDropShadow
                  dx="0"
                  dy="12"
                  stdDeviation="12"
                  flood-color="#1B4B7A"
                  flood-opacity="0.12"
                />
              </filter>
            </defs>
            <path d="M48 143.5H272" stroke="#D8E4F2" stroke-width="2" stroke-linecap="round" />
            <g filter="url(#compare-soft-shadow)">
              <rect
                x="58"
                y="42"
                width="96"
                height="96"
                rx="12"
                fill="url(#compare-card-left)"
                stroke="#8ABDF6"
                stroke-width="2"
              />
              <rect
                x="166"
                y="42"
                width="96"
                height="96"
                rx="12"
                fill="url(#compare-card-right)"
                stroke="#68D4E5"
                stroke-width="2"
              />
            </g>
            <path
              d="M154 78C164 68 174 68 184 78"
              stroke="#4D7CFE"
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M184 102C174 112 164 112 154 102"
              stroke="#12B8C8"
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M179 72L186 78L179 84"
              stroke="#4D7CFE"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M159 96L152 102L159 108"
              stroke="#12B8C8"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <rect x="78" y="62" width="44" height="8" rx="4" fill="#2E5B94" opacity="0.86" />
            <rect x="78" y="80" width="56" height="8" rx="4" fill="#8ABDF6" />
            <rect x="78" y="98" width="34" height="8" rx="4" fill="#B8D8FB" />
            <rect x="92" y="118" width="10" height="14" rx="3" fill="#4D7CFE" />
            <rect x="108" y="110" width="10" height="22" rx="3" fill="#7EAAF8" />
            <rect x="124" y="102" width="10" height="30" rx="3" fill="#A9CCFB" />
            <rect x="186" y="62" width="44" height="8" rx="4" fill="#1B6670" opacity="0.86" />
            <rect x="186" y="80" width="34" height="8" rx="4" fill="#68D4E5" />
            <rect x="186" y="98" width="58" height="8" rx="4" fill="#A7ECF3" />
            <rect x="200" y="104" width="10" height="28" rx="3" fill="#A7ECF3" />
            <rect x="216" y="94" width="10" height="38" rx="3" fill="#68D4E5" />
            <rect x="232" y="116" width="10" height="16" rx="3" fill="#12B8C8" />
            <circle cx="72" cy="38" r="6" fill="#4D7CFE" opacity="0.16" />
            <circle cx="248" cy="34" r="8" fill="#12B8C8" opacity="0.16" />
            <circle cx="282" cy="98" r="5" fill="#4D7CFE" opacity="0.14" />
          </svg>
        </template>
      </ElEmpty>
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
      { label: '持续天数', key: 'duration_days' }
    ]
    return metrics.map((m) => {
      const values: Record<number, string | number> = {}
      let bestId: number | undefined
      let bestVal = m.higher ? -Infinity : Infinity
      for (const c of comps) {
        const v = (c as any)[m.key] ?? 0
        values[c.id] = typeof v === 'number' && m.key === 'registration_pct' ? `${v}%` : v
        if (m.higher && v > bestVal) {
          bestVal = v
          bestId = c.id
        }
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
    display: flex;
    justify-content: center;
    padding: 40px 0;
  }

  .compare-empty {
    width: 100%;
  }

  .compare-empty__svg {
    width: min(320px, 76vw);
    height: auto;
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
