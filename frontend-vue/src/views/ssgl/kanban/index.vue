<template>
  <section class="ssgl-page" data-page="Kanban">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="看板总览" subtitle="赛事进度一目了然" />

      <ElRow :gutter="16">
        <ElCol v-for="col in kanbanColumns" :key="col.status" :span="6">
          <div class="kanban-column">
            <div class="kanban-column-header" :style="{ borderColor: col.color }">
              <span class="kanban-column-title">{{ col.label }}</span>
              <ElBadge :value="col.items.length" :type="col.badgeType" />
            </div>
            <div class="kanban-column-body">
              <ElCard
                v-for="item in col.items"
                :key="item.id"
                shadow="hover"
                class="kanban-card"
              >
                <div class="kanban-card-title">{{ item.title }}</div>
                <div class="kanban-card-meta">
                  <span>{{ item.team_count }} 团队</span>
                  <span>{{ item.student_count }} 学生</span>
                </div>
                <ElProgress
                  :percentage="item.progress"
                  :stroke-width="4"
                  :show-text="false"
                  :color="col.color"
                />
                <div class="kanban-card-progress">{{ item.progress }}%</div>
              </ElCard>
              <div v-if="col.items.length === 0" class="kanban-empty">暂无赛事</div>
            </div>
          </div>
        </ElCol>
      </ElRow>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { statsAPI } from '@/api/ssgl'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import type { CompetitionProgress } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Kanban' })

const loading = ref(true)
const kanbanData = ref<CompetitionProgress[]>([])

const kanbanColumns = computed(() => [
  {
    status: 'draft',
    label: '草稿',
    color: '#909399',
    badgeType: 'info' as const,
    items: kanbanData.value.filter((c) => c.status === 'draft'),
  },
  {
    status: 'published',
    label: '已发布',
    color: '#409eff',
    badgeType: 'primary' as const,
    items: kanbanData.value.filter((c) => c.status === 'published'),
  },
  {
    status: 'ongoing',
    label: '进行中',
    color: '#67c23a',
    badgeType: 'success' as const,
    items: kanbanData.value.filter((c) => c.status === 'ongoing'),
  },
  {
    status: 'completed',
    label: '已完成',
    color: '#e6a23c',
    badgeType: 'warning' as const,
    items: kanbanData.value.filter((c) => c.status === 'completed' || c.status === 'ended'),
  },
])

onMounted(async () => {
  try {
    const res = await statsAPI.progress()
    kanbanData.value = res.competitions || []
  } catch (e) {
    console.error('Kanban fetch error:', e)
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

.kanban-column {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  min-height: 400px;
}

.kanban-column-header {
  padding: 12px 16px;
  border-bottom: 3px solid;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kanban-column-title {
  font-size: 13px;
  font-weight: 700;
}

.kanban-column-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kanban-card {
  cursor: default;

  :deep(.el-card__body) {
    padding: 12px;
  }
}

.kanban-card-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-card-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 8px;
}

.kanban-card-progress {
  font-size: 10px;
  color: var(--art-gray-500);
  text-align: right;
  margin-top: 4px;
  font-family: var(--el-font-family-monospace);
}

.kanban-empty {
  text-align: center;
  color: var(--art-gray-400);
  font-size: 12px;
  padding: 24px 0;
}
</style>
