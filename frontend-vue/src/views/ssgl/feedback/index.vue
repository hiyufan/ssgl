<template>
  <section class="ssgl-page" data-page="Feedback">
    <SSGLPageHeader title="赛事反馈评价" subtitle="查看和提交赛事评价反馈" />

    <!-- Competition Selector -->
    <div class="flex items-center gap-4 mb-4">
      <span class="text-sm text-gray-500 font-medium whitespace-nowrap">选择赛事</span>
      <ElSelect
        v-model="selectedCompId"
        placeholder="请选择赛事..."
        style="min-width: 300px"
        @change="handleCompChange"
      >
        <ElOption
          v-for="c in competitions"
          :key="c.id"
          :label="c.title"
          :value="c.id"
        />
      </ElSelect>
      <ElButton v-if="selectedCompId" type="primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '提交反馈' }}
      </ElButton>
    </div>

    <!-- Feedback Form -->
    <ElCard v-if="showForm && selectedCompId" shadow="never" class="mb-4">
      <template #header>
        <span class="font-semibold">提交赛事反馈</span>
      </template>

      <ElForm :model="form" label-width="100px" @submit.prevent="submitFeedback">
        <ElFormItem label="综合评分*" required>
          <ElRate v-model="form.overall" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
        </ElFormItem>
        <ElFormItem label="赛事内容">
          <ElRate v-model="form.content" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
        </ElFormItem>
        <ElFormItem label="组织安排">
          <ElRate v-model="form.org" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
        </ElFormItem>
        <ElFormItem label="公平性">
          <ElRate v-model="form.fairness" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
        </ElFormItem>
        <ElFormItem label="学习价值">
          <ElRate v-model="form.learning" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
        </ElFormItem>
        <ElFormItem label="评语">
          <ElInput
            v-model="form.comment"
            type="textarea"
            :rows="3"
            placeholder="分享您的参赛体验..."
          />
        </ElFormItem>
        <ElRow :gutter="16">
          <ElCol :span="16">
            <ElFormItem label="获得技能">
              <ElInput v-model="form.skills" placeholder="Go, PostgreSQL, 团队协作（逗号分隔）" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="匿名提交">
              <ElSwitch v-model="form.anonymous" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElFormItem>
          <ElButton type="success" :loading="submitting" :disabled="!form.overall" @click="submitFeedback">
            {{ submitting ? '提交中...' : '提交反馈' }}
          </ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- Loading -->
    <div v-if="dataLoading" class="text-center py-12 text-gray-400">
      <ElIcon class="is-loading" :size="24"><Loading /></ElIcon>
      <div class="mt-2">加载中...</div>
    </div>

    <!-- Summary Dashboard -->
    <template v-if="selectedCompId && !dataLoading && summary">
      <ElRow :gutter="16" class="mb-4">
        <!-- Rating Overview -->
        <ElCol :span="12">
          <ElCard shadow="never">
            <template #header>
              <span class="font-semibold">反馈概览</span>
            </template>

            <div v-if="summary.total_feedbacks === 0" class="text-center py-8 text-gray-400">
              暂无反馈数据
            </div>

            <template v-else>
              <div class="text-center py-4">
                <div class="text-5xl font-bold text-amber-500">{{ summary.avg_overall.toFixed(1) }}</div>
                <div class="text-sm text-gray-400 mt-1">综合评分 ({{ summary.total_feedbacks }} 份反馈)</div>
                <div class="mt-2">
                  <ElRate :model-value="Math.round(summary.avg_overall)" disabled :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
                </div>
              </div>

              <div class="space-y-3 mt-4">
                <div v-for="bar in ratingBars" :key="bar.label">
                  <div class="flex items-center gap-3 text-sm">
                    <span class="w-20 text-gray-400 text-right">{{ bar.label }}</span>
                    <div class="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :style="{ width: bar.pct + '%', background: barColor(bar.pct) }"
                      />
                    </div>
                    <span class="w-10 text-gray-500 font-mono text-right">{{ bar.value.toFixed(1) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </ElCard>
        </ElCol>

        <!-- Distribution + Skills -->
        <ElCol :span="12">
          <ElCard shadow="never">
            <template #header>
              <span class="font-semibold">评分分布 & 热门技能</span>
            </template>

            <!-- Rating Distribution -->
            <div class="mb-6">
              <div class="space-y-2">
                <div v-for="r in [5, 4, 3, 2, 1]" :key="r" class="flex items-center gap-2 text-sm">
                  <span class="w-8 text-amber-500 text-right">{{ r }}★</span>
                  <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-amber-500 rounded-full transition-all"
                      :style="{ width: distributionPct(r) + '%' }"
                    />
                  </div>
                  <span class="w-20 text-gray-400 text-right">
                    {{ distributionCount(r) }} ({{ distributionPct(r).toFixed(0) }}%)
                  </span>
                </div>
              </div>
            </div>

            <!-- Skills -->
            <div>
              <div class="text-sm font-semibold text-gray-500 mb-2">热门技能</div>
              <div v-if="!summary.top_skills?.length" class="text-sm text-gray-400">暂无技能标签</div>
              <div v-else class="flex flex-wrap gap-2">
                <ElTag
                  v-for="(s, i) in summary.top_skills"
                  :key="i"
                  type="info"
                  effect="plain"
                  round
                >
                  {{ s.skill }} <span class="ml-1 text-primary">×{{ s.count }}</span>
                </ElTag>
              </div>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- Recent Comments -->
      <ElCard v-if="summary.recent_comments?.length" shadow="never" class="mb-4">
        <template #header>
          <span class="font-semibold">最近评语</span>
        </template>
        <ElRow :gutter="16">
          <ElCol v-for="(c, i) in summary.recent_comments" :key="i" :span="12" class="mb-3">
            <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
              <div class="flex items-center justify-between mb-2">
                <ElRate :model-value="c.rating" disabled size="small" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
                <span class="text-xs text-gray-400">{{ c.date }}</span>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-300">{{ c.comment || '(无评语)' }}</div>
              <div v-if="c.anonymous" class="text-xs text-gray-400 mt-2">匿名用户</div>
            </div>
          </ElCol>
        </ElRow>
      </ElCard>
    </template>

    <!-- Feedback List -->
    <ElCard v-if="selectedCompId && feedbacks.length > 0" shadow="never">
      <template #header>
        <span class="font-semibold">全部反馈 ({{ feedbacks.length }})</span>
      </template>
      <div class="space-y-3">
        <div
          v-for="fb in feedbacks"
          :key="fb.id"
          class="p-4 rounded-lg border border-gray-100 dark:border-gray-700 flex items-start gap-4"
        >
          <div class="text-center flex-shrink-0">
            <div class="text-2xl font-bold text-amber-500">{{ fb.overall_rating }}</div>
            <div class="text-xs text-gray-400">综合</div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-sm">
                {{ fb.anonymous ? '匿名用户' : (fb.student_name || `用户${fb.student_id}`) }}
              </span>
              <span class="text-xs text-gray-400">{{ formatDate(fb.created_at) }}</span>
            </div>
            <div v-if="fb.comment" class="text-sm text-gray-600 dark:text-gray-300 mb-2">{{ fb.comment }}</div>
            <div class="flex gap-4 text-xs text-gray-400">
              <span v-if="fb.content_rating > 0">内容 {{ fb.content_rating }}★</span>
              <span v-if="fb.org_rating > 0">组织 {{ fb.org_rating }}★</span>
              <span v-if="fb.fairness_rating > 0">公平 {{ fb.fairness_rating }}★</span>
              <span v-if="fb.learning_value > 0">学习 {{ fb.learning_value }}★</span>
            </div>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- Empty state when competition selected but no feedback -->
    <div
      v-if="selectedCompId && !dataLoading && feedbacks.length === 0"
      class="text-center py-12 text-gray-400"
    >
      <ElIcon :size="48"><FolderOpened /></ElIcon>
      <div class="mt-3">暂无反馈数据，成为第一个提交反馈的人吧！</div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { Loading, FolderOpened } from '@element-plus/icons-vue'
  import { feedbackAPI, competitionsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import type { Competition, CompetitionFeedback, FeedbackSummary } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Feedback' })

  const competitions = ref<Competition[]>([])
  const selectedCompId = ref<number | null>(null)
  const summary = ref<FeedbackSummary | null>(null)
  const feedbacks = ref<CompetitionFeedback[]>([])
  const dataLoading = ref(false)
  const showForm = ref(false)
  const submitting = ref(false)

  const form = reactive({
    overall: 0,
    content: 0,
    org: 0,
    fairness: 0,
    learning: 0,
    comment: '',
    anonymous: false,
    skills: '',
  })

  const ratingBars = computed(() => {
    if (!summary.value) return []
    return [
      { label: '赛事内容', value: summary.value.avg_content, pct: (summary.value.avg_content / 5) * 100 },
      { label: '组织安排', value: summary.value.avg_org, pct: (summary.value.avg_org / 5) * 100 },
      { label: '公平性', value: summary.value.avg_fairness, pct: (summary.value.avg_fairness / 5) * 100 },
      { label: '学习价值', value: summary.value.avg_learning_value, pct: (summary.value.avg_learning_value / 5) * 100 },
    ]
  })

  const barColor = (pct: number) => {
    if (pct >= 80) return '#10b981'
    if (pct >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const distributionCount = (r: number) => {
    return summary.value?.rating_distribution?.[r] || 0
  }

  const distributionPct = (r: number) => {
    if (!summary.value?.rating_distribution) return 0
    const total = Object.values(summary.value.rating_distribution).reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    return ((summary.value.rating_distribution[r] || 0) / total) * 100
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('zh-CN')
  }

  const loadCompetitions = async () => {
    try {
      const res = await competitionsAPI.list()
      competitions.value = res.competitions || []
    } catch { /* ignore */ }
  }

  const handleCompChange = async () => {
    if (!selectedCompId.value) {
      summary.value = null
      feedbacks.value = []
      return
    }
    dataLoading.value = true
    try {
      const [s, f] = await Promise.all([
        feedbackAPI.summary(selectedCompId.value),
        feedbackAPI.listByCompetition(selectedCompId.value),
      ])
      summary.value = s as FeedbackSummary
      feedbacks.value = (f as any).feedbacks || []
    } catch {
      ElMessage.error('加载反馈数据失败')
    } finally {
      dataLoading.value = false
    }
  }

  const resetForm = () => {
    form.overall = 0
    form.content = 0
    form.org = 0
    form.fairness = 0
    form.learning = 0
    form.comment = ''
    form.anonymous = false
    form.skills = ''
  }

  const submitFeedback = async () => {
    if (!selectedCompId.value || !form.overall) {
      return ElMessage.warning('请至少填写综合评分')
    }
    submitting.value = true
    try {
      await feedbackAPI.submit(selectedCompId.value, {
        competition_id: selectedCompId.value,
        overall_rating: form.overall,
        content_rating: form.content || undefined,
        org_rating: form.org || undefined,
        fairness_rating: form.fairness || undefined,
        learning_value: form.learning || undefined,
        comment: form.comment || undefined,
        anonymous: form.anonymous,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })
      ElMessage.success('反馈提交成功！')
      showForm.value = false
      resetForm()
      // Refresh data
      await handleCompChange()
    } catch {
      ElMessage.error('提交失败（可能已提交过反馈）')
    } finally {
      submitting.value = false
    }
  }

  onMounted(loadCompetitions)
</script>
