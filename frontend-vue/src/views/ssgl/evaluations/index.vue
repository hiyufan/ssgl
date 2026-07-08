<template>
  <section class="ssgl-page" data-page="Evaluations">
    <SSGLPageHeader title="学生评价" subtitle="多维度匿名评价，促进教学质量提升">
      <template #actions>
        <ElButton type="primary" @click="showCreate = true">
          <ElIcon><Plus /></ElIcon>
          提交评价
        </ElButton>
      </template>
    </SSGLPageHeader>

    <!-- Evaluation list -->
    <ElCard shadow="never" v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">评价记录 ({{ evaluations.length }})</span>
        </div>
      </template>

      <div v-if="evaluations.length === 0" class="py-12 text-center text-gray-400">
        暂无评价记录
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="ev in evaluations"
          :key="ev.id"
          class="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div class="flex items-start gap-3 mb-3">
            <ElAvatar :size="36">{{ (ev.student?.name || '?')[0] }}</ElAvatar>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold">{{ ev.student?.name }}</span>
                <ElIcon class="text-gray-400"><Right /></ElIcon>
                <span class="font-semibold text-primary">{{ ev.teacher?.name }}</span>
                <span class="text-sm text-gray-400">· {{ ev.competition?.title || '—' }}</span>
              </div>

              <div class="flex gap-4 mt-2 flex-wrap">
                <div v-for="dim in dimensions" :key="dim.key" class="flex items-center gap-1">
                  <span class="text-xs text-gray-400">{{ dim.label }}</span>
                  <ElRate
                    :model-value="(ev as any)[dim.key]"
                    disabled
                    size="small"
                    :colors="['#f59e0b', '#f59e0b', '#f59e0b']"
                  />
                </div>
                <div class="ml-auto flex items-center gap-1">
                  <span class="font-mono font-bold text-amber-500 text-lg">{{ ev.overall }}</span>
                  <ElRate :model-value="ev.overall" disabled size="small" :colors="['#f59e0b', '#f59e0b', '#f59e0b']" />
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="ev.feedback"
            class="ml-12 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
          >
            {{ ev.feedback }}
          </div>
        </div>
      </div>
    </ElCard>

    <!-- Create Dialog -->
    <ElDialog v-model="showCreate" title="提交评价" width="580px" destroy-on-close>
      <ElForm :model="form" label-width="80px" @submit.prevent="handleSubmit">
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="教师" required>
              <ElSelect v-model="form.teacher_id" placeholder="选择教师" style="width: 100%">
                <ElOption
                  v-for="t in teachers"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="赛事" required>
              <ElSelect v-model="form.competition_id" placeholder="选择赛事" style="width: 100%">
                <ElOption
                  v-for="c in competitions"
                  :key="c.id"
                  :label="c.title"
                  :value="c.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
        </ElRow>

        <ElFormItem
          v-for="dim in dimensions"
          :key="dim.key"
          :label="dim.label"
          required
        >
          <ElRate
            v-model="form[dim.key]"
            :colors="['#f59e0b', '#f59e0b', '#f59e0b']"
          />
        </ElFormItem>

        <ElFormItem label="文字反馈">
          <ElInput
            v-model="form.feedback"
            type="textarea"
            :rows="3"
            placeholder="可选：写下具体反馈"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="showCreate = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { Plus, Right } from '@element-plus/icons-vue'
  import { evaluationsAPI, statsAPI, competitionsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import type { StudentEvaluation, TeacherStat, Competition } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Evaluations' })

  const loading = ref(false)
  const evaluations = ref<StudentEvaluation[]>([])
  const teachers = ref<TeacherStat[]>([])
  const competitions = ref<Competition[]>([])
  const showCreate = ref(false)
  const submitting = ref(false)

  const dimensions = [
    { key: 'teaching', label: '教学' },
    { key: 'communication', label: '沟通' },
    { key: 'availability', label: '及时性' },
  ] as const

  const form = reactive({
    teacher_id: null as number | null,
    competition_id: null as number | null,
    teaching: 0,
    communication: 0,
    availability: 0,
    overall: 0,
    feedback: '',
  })

  const loadEvaluations = async () => {
    loading.value = true
    try {
      const res = await evaluationsAPI.list()
      evaluations.value = res.evaluations || []
    } catch {
      ElMessage.error('加载评价数据失败')
    } finally {
      loading.value = false
    }
  }

  const loadDropdowns = async () => {
    try {
      const [teacherRes, compRes] = await Promise.all([
        statsAPI.teachers().catch(() => ({ teachers: [] })),
        competitionsAPI.list().catch(() => ({ competitions: [] })),
      ])
      teachers.value = teacherRes.teachers || []
      competitions.value = compRes.competitions || []
    } catch { /* ignore */ }
  }

  const resetForm = () => {
    form.teacher_id = null
    form.competition_id = null
    form.teaching = 0
    form.communication = 0
    form.availability = 0
    form.overall = 0
    form.feedback = ''
  }

  const handleSubmit = async () => {
    if (!form.teacher_id) return ElMessage.warning('请选择教师')
    if (!form.competition_id) return ElMessage.warning('请选择赛事')
    if (!form.teaching || !form.communication || !form.availability || !form.overall) {
      return ElMessage.warning('请完成四项评分（各 1-5 星）')
    }

    submitting.value = true
    try {
      const res = await evaluationsAPI.create({
        teacher_id: form.teacher_id,
        competition_id: form.competition_id,
        teaching: form.teaching,
        communication: form.communication,
        availability: form.availability,
        overall: form.overall,
        feedback: form.feedback || undefined,
      })
      ElMessage.success('评价已提交')
      evaluations.value = [res.evaluation, ...evaluations.value]
      showCreate.value = false
      resetForm()
    } catch {
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    loadEvaluations()
    loadDropdowns()
  })
</script>
