<template>
  <section class="ssgl-page" data-page="LearningPath">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="学习路径" subtitle="个性化学习推荐与成长路线" />

      <!-- User selector for admin/teacher -->
      <ElCard v-if="showUserSelector" shadow="never" class="ssgl-mb-16">
        <template #header><span class="card-title">选择学生</span></template>
        <ElSelect
          v-model="selectedUserId"
          filterable
          remote
          :remote-method="searchUsers"
          placeholder="搜索学生姓名"
          :loading="searchLoading"
          style="width: 300px"
          @change="fetchPath"
        >
          <ElOption
            v-for="u in userOptions"
            :key="u.id"
            :label="u.name"
            :value="u.id"
          />
        </ElSelect>
      </ElCard>

      <template v-if="pathData">
        <!-- Summary -->
        <ElCard v-if="pathData.summary" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">学习概况</span></template>
          <p class="path-summary">{{ pathData.summary }}</p>
        </ElCard>

        <!-- Current Level -->
        <ElCard v-if="pathData.current_level" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">当前水平</span></template>
          <ElRow :gutter="16">
            <ElCol :span="8">
              <div class="level-item">
                <div class="level-label">综合等级</div>
                <div class="level-value">{{ pathData.current_level.name || pathData.current_level.level }}</div>
              </div>
            </ElCol>
            <ElCol :span="8">
              <div class="level-item">
                <div class="level-label">经验值</div>
                <div class="level-value">{{ pathData.current_level.exp ?? pathData.current_level.experience ?? '—' }}</div>
              </div>
            </ElCol>
            <ElCol :span="8">
              <div class="level-item">
                <div class="level-label">下一等级</div>
                <div class="level-value">{{ pathData.current_level.next_level ?? '—' }}</div>
              </div>
            </ElCol>
          </ElRow>
          <ElProgress
            v-if="pathData.current_level.progress !== undefined"
            :percentage="Math.round(pathData.current_level.progress)"
            :stroke-width="10"
            class="ssgl-mt-12"
          />
        </ElCard>

        <!-- Recommended Steps -->
        <ElCard v-if="pathData.steps?.length || pathData.recommendations?.length" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">推荐学习路径</span></template>
          <ElTimeline>
            <ElTimelineItem
              v-for="(step, i) in (pathData.steps || pathData.recommendations)"
              :key="i"
              :type="step.completed ? 'success' : step.current ? 'primary' : 'info'"
              :hollow="!step.completed && !step.current"
              placement="top"
            >
              <ElCard shadow="hover" class="step-card">
                <div class="step-header">
                  <span class="step-title">{{ step.title || step.name }}</span>
                  <ElTag v-if="step.completed" type="success" size="small">已完成</ElTag>
                  <ElTag v-else-if="step.current" type="primary" size="small">进行中</ElTag>
                  <ElTag v-else type="info" size="small">待完成</ElTag>
                </div>
                <div class="step-desc">{{ step.description || step.detail }}</div>
                <div v-if="step.estimated_time || step.duration" class="step-meta">
                  预计用时: {{ step.estimated_time || step.duration }}
                </div>
              </ElCard>
            </ElTimelineItem>
          </ElTimeline>
        </ElCard>

        <!-- Skill Gaps -->
        <ElCard v-if="pathData.skill_gaps?.length" shadow="never">
          <template #header><span class="card-title">能力提升建议</span></template>
          <ElRow :gutter="12">
            <ElCol v-for="gap in pathData.skill_gaps" :key="gap.name || gap.skill" :span="8">
              <ElCard shadow="hover" class="gap-card">
                <div class="gap-name">{{ gap.name || gap.skill }}</div>
                <div class="gap-current">当前: {{ gap.current_level ?? gap.current ?? '—' }}</div>
                <div class="gap-target">目标: {{ gap.target_level ?? gap.target ?? '—' }}</div>
                <ElProgress
                  v-if="gap.progress !== undefined"
                  :percentage="Math.round(gap.progress)"
                  :stroke-width="4"
                  :show-text="false"
                  class="ssgl-mt-8"
                />
              </ElCard>
            </ElCol>
          </ElRow>
        </ElCard>
      </template>

      <div v-else-if="!loading && !showUserSelector" class="ssgl-empty">
        <ElEmpty description="暂无学习路径数据" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { learningPathAPI, profileAPI } from '@/api/ssgl'
import { useUserStore } from '@/store/modules/user'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import type { UserSummary } from '@/types/ssgl'

defineOptions({ name: 'SSGL_LearningPath' })

const userStore = useUserStore()
const role = computed(() => userStore.info.role || 'student')
const showUserSelector = computed(() => role.value === 'admin' || role.value === 'teacher')

const loading = ref(false)
const searchLoading = ref(false)
const selectedUserId = ref<number | null>(null)
const userOptions = ref<UserSummary[]>([])
const pathData = ref<any>(null)

async function searchUsers(query: string) {
  if (!query) return
  searchLoading.value = true
  try {
    const res = await profileAPI.searchUsers(query, 'student')
    userOptions.value = res.users || []
  } catch (e) {
    console.error('Search users error:', e)
  } finally {
    searchLoading.value = false
  }
}

async function fetchPath() {
  if (!selectedUserId.value) return
  loading.value = true
  try {
    pathData.value = await learningPathAPI.getPath(selectedUserId.value)
  } catch (e) {
    console.error('Learning path fetch error:', e)
    pathData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!showUserSelector.value && userStore.info.id) {
    selectedUserId.value = userStore.info.id
    await fetchPath()
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

.ssgl-mt-8 {
  margin-top: 8px;
}

.ssgl-mt-12 {
  margin-top: 12px;
}

.ssgl-empty {
  padding: 40px 0;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.path-summary {
  font-size: 14px;
  color: var(--art-gray-700);
  line-height: 1.6;
  margin: 0;
}

.level-item {
  text-align: center;
  padding: 12px;
}

.level-label {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-bottom: 6px;
  font-weight: 600;
}

.level-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.step-card {
  :deep(.el-card__body) {
    padding: 14px;
  }
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
}

.step-desc {
  font-size: 13px;
  color: var(--art-gray-600);
  line-height: 1.5;
}

.step-meta {
  font-size: 11px;
  color: var(--art-gray-500);
  margin-top: 6px;
}

.gap-card {
  margin-bottom: 12px;
  text-align: center;
}

.gap-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.gap-current {
  font-size: 12px;
  color: var(--art-gray-500);
}

.gap-target {
  font-size: 12px;
  color: var(--el-color-primary);
  margin-top: 2px;
}
</style>
