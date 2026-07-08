<template>
  <section class="ssgl-page" data-page="Growth">
    <div v-if="loading" class="ssgl-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <SSGLPageHeader title="成长档案" subtitle="学生竞赛成长轨迹与能力画像" />

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
          @change="fetchGrowth"
        >
          <ElOption
            v-for="u in userOptions"
            :key="u.id"
            :label="u.name"
            :value="u.id"
          />
        </ElSelect>
      </ElCard>

      <!-- Growth Profile -->
      <template v-if="growthData">
        <!-- Summary -->
        <ElRow :gutter="16" class="ssgl-mb-16">
          <ElCol :span="6">
            <SSGLStatCard label="参赛次数" :value="growthData.competition_count ?? 0" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="获奖次数" :value="growthData.award_count ?? 0" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="团队经历" :value="growthData.team_count ?? 0" />
          </ElCol>
          <ElCol :span="6">
            <SSGLStatCard label="综合评分" :value="growthData.overall_score ?? '—'" />
          </ElCol>
        </ElRow>

        <!-- Skills Radar -->
        <ElCard v-if="growthData.skills?.length" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">能力画像</span></template>
          <ElRow :gutter="16">
            <ElCol v-for="skill in growthData.skills" :key="skill.name" :span="4">
              <div class="skill-item">
                <div class="skill-label">{{ skill.name }}</div>
                <ElProgress type="circle" :percentage="Math.round(skill.score)" :width="80" />
              </div>
            </ElCol>
          </ElRow>
        </ElCard>

        <!-- Timeline -->
        <ElCard v-if="growthData.timeline?.length" shadow="never" class="ssgl-mb-16">
          <template #header><span class="card-title">成长时间线</span></template>
          <ElTimeline>
            <ElTimelineItem
              v-for="(event, i) in growthData.timeline"
              :key="i"
              :timestamp="event.date"
              :type="eventType(event.type)"
              placement="top"
            >
              <div class="timeline-title">{{ event.title }}</div>
              <div class="timeline-desc">{{ event.description }}</div>
            </ElTimelineItem>
          </ElTimeline>
        </ElCard>

        <!-- Competition History -->
        <ElCard v-if="growthData.competitions?.length" shadow="never">
          <template #header><span class="card-title">参赛历史</span></template>
          <ElTable :data="growthData.competitions" stripe size="small">
            <ElTableColumn prop="title" label="赛事" show-overflow-tooltip />
            <ElTableColumn prop="type" label="类型" width="100" />
            <ElTableColumn prop="role" label="角色" width="80" />
            <ElTableColumn prop="result" label="成绩" width="100" />
            <ElTableColumn prop="date" label="时间" width="120" />
          </ElTable>
        </ElCard>
      </template>

      <div v-else-if="!loading && !showUserSelector" class="ssgl-empty">
        <ElEmpty description="暂无成长数据" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { growthAPI, profileAPI } from '@/api/ssgl'
import { useUserStore } from '@/store/modules/user'
import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
import SSGLStatCard from '@/components/ssgl/SSGLStatCard.vue'
import type { UserSummary } from '@/types/ssgl'

defineOptions({ name: 'SSGL_Growth' })

const userStore = useUserStore()
const role = computed(() => userStore.info.role || 'student')
const showUserSelector = computed(() => role.value === 'admin' || role.value === 'teacher')

const loading = ref(false)
const searchLoading = ref(false)
const selectedUserId = ref<number | null>(null)
const userOptions = ref<UserSummary[]>([])
const growthData = ref<any>(null)

function eventType(type: string) {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = { award: 'success', team: '', competition: 'warning', preplan: 'info' }
  return map[type] || 'info'
}

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

async function fetchGrowth() {
  if (!selectedUserId.value) return
  loading.value = true
  try {
    growthData.value = await growthAPI.getProfile(selectedUserId.value)
  } catch (e) {
    console.error('Growth fetch error:', e)
    growthData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!showUserSelector.value && userStore.info.id) {
    selectedUserId.value = userStore.info.id
    await fetchGrowth()
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

.skill-item {
  text-align: center;
  padding: 12px 8px;
}

.skill-label {
  font-size: 12px;
  color: var(--art-gray-600);
  margin-bottom: 8px;
  font-weight: 600;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
}

.timeline-desc {
  font-size: 12px;
  color: var(--art-gray-500);
  margin-top: 4px;
}
</style>
