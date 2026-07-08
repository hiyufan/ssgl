<template>
  <section class="ssgl-page" data-page="AnnualReport">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="年度报告" subtitle="平台运营年度总结" />

      <template v-if="reportData">
        <!-- Key Stats -->
        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol v-for="stat in keyStats" :key="stat.label" :span="4">
            <ElCard shadow="never" class="stat-card" :style="{ borderTop: `3px solid ${stat.color}` }">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
            </ElCard>
          </ElCol>
        </ElRow>

        <!-- Highlights -->
        <ElCard v-if="reportData.highlights?.length" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">年度亮点</span></template>
          <ElRow :gutter="16">
            <ElCol v-for="(h, i) in reportData.highlights" :key="i" :span="8">
              <ElCard shadow="hover" class="highlight-card">
                <div class="highlight-title">{{ h.title || h.name }}</div>
                <div class="highlight-desc">{{ h.description || h.detail }}</div>
                <div v-if="h.value !== undefined" class="highlight-value">{{ h.value }}</div>
              </ElCard>
            </ElCol>
          </ElRow>
        </ElCard>

        <!-- Monthly Breakdown -->
        <ElCard v-if="reportData.monthly?.length" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">月度数据</span></template>
          <ElTable :data="reportData.monthly" stripe size="small">
            <ElTableColumn prop="month" label="月份" width="100" />
            <ElTableColumn prop="competitions" label="赛事" width="80" align="center" />
            <ElTableColumn prop="teams" label="团队" width="80" align="center" />
            <ElTableColumn prop="participants" label="参与人数" width="100" align="center" />
            <ElTableColumn prop="awards" label="奖项" width="80" align="center" />
          </ElTable>
        </ElCard>

        <!-- Top Competitions -->
        <ElCard v-if="reportData.top_competitions?.length" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">年度热门赛事</span></template>
          <ElTable :data="reportData.top_competitions" stripe size="small">
            <ElTableColumn type="index" label="#" width="50" />
            <ElTableColumn prop="title" label="赛事名称" show-overflow-tooltip />
            <ElTableColumn prop="team_count" label="团队数" width="80" align="center" />
            <ElTableColumn prop="participant_count" label="参与人数" width="100" align="center" />
            <ElTableColumn prop="award_count" label="奖项数" width="80" align="center" />
          </ElTable>
        </ElCard>

        <!-- Achievements -->
        <ElCard v-if="reportData.achievements?.length" shadow="never">
          <template #header><span class="card-title">年度成就</span></template>
          <ElRow :gutter="12">
            <ElCol v-for="(a, i) in reportData.achievements" :key="i" :span="6">
              <ElCard shadow="hover" class="achievement-card">
                <div class="achievement-icon">
                  <ElIcon :size="28" color="#f59e0b"><Trophy /></ElIcon>
                </div>
                <div class="achievement-title">{{ a.title || a.name }}</div>
                <div class="achievement-desc">{{ a.description || a.detail }}</div>
              </ElCard>
            </ElCol>
          </ElRow>
        </ElCard>
      </template>

      <div v-else-if="!loading" class="ssgl-empty">
        <ElEmpty description="暂无年度报告数据" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Trophy } from '@element-plus/icons-vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'

defineOptions({ name: 'SSGL_AnnualReport' })

const loading = ref(true)
const reportData = ref<Record<string, any> | null>(null)

const keyStats = computed(() => {
  if (!reportData.value) return []
  const d = reportData.value
  return [
    { label: '年度赛事', value: d.total_competitions ?? d.competitions ?? 0, color: '#f59e0b' },
    { label: '参赛团队', value: d.total_teams ?? d.teams ?? 0, color: '#14b8a6' },
    { label: '参与人数', value: d.total_participants ?? d.participants ?? 0, color: '#a855f7' },
    { label: '发放奖项', value: d.total_awards ?? d.awards ?? 0, color: '#22c55e' },
    { label: '新增用户', value: d.new_users ?? 0, color: '#3b82f6' },
    { label: '完成率', value: d.completion_rate ? `${d.completion_rate}%` : '—', color: '#ef4444' },
  ]
})

onMounted(async () => {
  try {
    reportData.value = await statsAPI.annualReport()
  } catch (e) {
    console.error('Annual report fetch error:', e)
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

.stat-card {
  text-align: center;

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.stat-label {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 6px;
  font-weight: 600;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--el-font-family-monospace);
}

.highlight-card {
  margin-bottom: 12px;
  text-align: center;
}

.highlight-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.highlight-desc {
  font-size: 12px;
  color: var(--art-gray-600);
  line-height: 1.5;
}

.highlight-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-top: 8px;
  font-family: var(--el-font-family-monospace);
}

.achievement-card {
  text-align: center;
  margin-bottom: 12px;
}

.achievement-icon {
  margin-bottom: 8px;
}

.achievement-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 11px;
  color: var(--art-gray-500);
  line-height: 1.4;
}
</style>
