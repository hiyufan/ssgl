<template>
  <section class="ssgl-page" data-page="Competitions">
    <SSGLPageHeader
      :title="role === 'student' ? '赛事大厅' : '赛事管理'"
      :subtitle="`共 ${competitions.length} 个赛事`"
    >
      <template v-if="canManage" #actions>
        <ElButton type="primary" :icon="Plus" @click="openCreate">创建赛事</ElButton>
        <ElButton :icon="Download" @click="showImport = !showImport">批量导入</ElButton>
      </template>
    </SSGLPageHeader>

    <!-- Batch Import Panel -->
    <ElCard v-if="canManage && showImport" shadow="never" class="import-card">
      <h4>批量导入赛事</h4>
      <p class="import-hint">输入 JSON 数组，每项包含 title、type、start_date、end_date 等字段。</p>
      <ElInput
        v-model="importJson"
        type="textarea"
        :rows="5"
        placeholder='[{"title":"示例赛事","type":"hackathon","start_date":"2026-07-01","end_date":"2026-08-01"}]'
      />
      <div class="import-actions">
        <ElButton :loading="importing" @click="handleBatchImport">开始导入</ElButton>
        <span v-if="importResult" :class="importResult.error_count > 0 ? 'text-warning' : 'text-success'">
          成功 {{ importResult.created_count }} 个，失败 {{ importResult.error_count }} 个
        </span>
      </div>
    </ElCard>

    <!-- Filters -->
    <div class="filter-bar">
      <ElRadioGroup v-model="statusFilter" size="small">
        <ElRadioButton value="all">全部</ElRadioButton>
        <ElRadioButton value="ongoing">进行中</ElRadioButton>
        <ElRadioButton value="published">报名中</ElRadioButton>
        <ElRadioButton value="completed">已结束</ElRadioButton>
        <ElRadioButton value="draft">草稿</ElRadioButton>
      </ElRadioGroup>
      <ElSelect v-model="typeFilter" placeholder="所有类型" clearable size="small" style="width: 140px">
        <ElOption value="all" label="所有类型" />
        <ElOption value="hackathon" label="Hackathon" />
        <ElOption value="innovation" label="创新赛" />
        <ElOption value="research" label="研究赛" />
        <ElOption value="business_plan" label="商业计划赛" />
        <ElOption value="ai_innovation" label="AI创新赛" />
        <ElOption value="data_science" label="数据科学赛" />
      </ElSelect>
      <ElInput
        v-model="search"
        :prefix-icon="Search"
        placeholder="搜索赛事名称…"
        clearable
        size="small"
        style="max-width: 240px"
      />
    </div>

    <!-- Table -->
    <ElTable v-loading="loading" :data="filtered" stripe border style="width: 100%">
      <ElTableColumn prop="title" label="赛事名称" min-width="180" show-overflow-tooltip />
      <ElTableColumn prop="type" label="类型" width="120">
        <template #default="{ row }">
          <ElTag size="small" :type="typeTagMap[row.type] || 'info'" effect="plain">
            {{ typeLabels[row.type] || row.type }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="status" label="状态" width="100">
        <template #default="{ row }">
          <SSGLStatusTag :status="row.status" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="队伍人数" width="110" align="center">
        <template #default="{ row }">
          {{ row.min_team_size }}-{{ row.max_team_size }}人
        </template>
      </ElTableColumn>
      <ElTableColumn prop="teams_count" label="已报名" width="80" align="center" />
      <ElTableColumn label="报名截止" width="120">
        <template #default="{ row }">
          {{ formatDate(row.registration_deadline) }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="起止时间" width="200">
        <template #default="{ row }">
          {{ formatDate(row.start_date) }} ~ {{ formatDate(row.end_date) }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="location" label="地点" width="120" show-overflow-tooltip />
      <ElTableColumn prop="prize" label="奖金" width="100" show-overflow-tooltip />
      <ElTableColumn label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <ElButton v-if="canManage && row.status === 'draft'" type="success" link size="small" @click="handlePublish(row)">
            发布
          </ElButton>
          <ElButton v-if="canManage" type="primary" link size="small" @click="openEdit(row)">编辑</ElButton>
          <ElButton v-if="canManage" type="danger" link size="small" @click="handleDelete(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- Create / Edit Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑赛事' : '创建赛事'"
      width="620px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" label-width="100px" :rules="formRules">
        <ElFormItem label="赛事名称" prop="title" required>
          <ElInput v-model="form.title" placeholder="例如：2026 校园创新马拉松" />
        </ElFormItem>
        <ElRow :gutter="16">
          <ElCol :span="8">
            <ElFormItem label="类型" prop="type" required>
              <ElSelect v-model="form.type" style="width: 100%">
                <ElOption v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value" :label="opt.label" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="最小人数" prop="min_team_size">
              <ElInputNumber v-model="form.min_team_size" :min="1" :max="99" style="width: 100%" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="最大人数" prop="max_team_size">
              <ElInputNumber v-model="form.max_team_size" :min="1" :max="99" style="width: 100%" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElFormItem label="赛事简介">
          <ElInput v-model="form.description" type="textarea" :rows="3" placeholder="一句话介绍赛事主题与目标" />
        </ElFormItem>
        <ElRow :gutter="16">
          <ElCol :span="8">
            <ElFormItem label="报名截止">
              <ElDatePicker v-model="form.registration_deadline" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" style="width: 100%" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="开始时间" prop="start_date" required>
              <ElDatePicker v-model="form.start_date" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" style="width: 100%" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="结束时间" prop="end_date" required>
              <ElDatePicker v-model="form.end_date" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" style="width: 100%" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="16">
          <ElCol :span="8">
            <ElFormItem label="地点">
              <ElInput v-model="form.location" placeholder="线上 / 教学楼…" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="奖金">
              <ElInput v-model="form.prize" placeholder="如 ¥50,000" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="标签">
              <ElInput v-model="form.tags" placeholder="逗号分隔" />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? '保存' : '创建' }}
        </ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { Plus, Download, Search } from '@element-plus/icons-vue'
  import { competitionsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import { useUserStore } from '@/store/modules/user'
  import type { Competition } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Competitions' })

  const userStore = useUserStore()
  const role = computed(() => userStore.info.role || '')
  const canManage = computed(() => ['teacher', 'admin'].includes(role.value))

  // State
  const loading = ref(false)
  const competitions = ref<Competition[]>([])
  const statusFilter = ref('all')
  const typeFilter = ref('all')
  const search = ref('')

  // Dialog
  const dialogVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref<number | null>(null)
  const submitting = ref(false)
  const formRef = ref<FormInstance>()

  // Import
  const showImport = ref(false)
  const importJson = ref('')
  const importing = ref(false)
  const importResult = ref<{ created_count: number; error_count: number; errors: Array<{ index: number; title: string; message: string }> } | null>(null)

  const TYPE_OPTIONS = [
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'innovation', label: '创新赛' },
    { value: 'research', label: '研究赛' },
    { value: 'business_plan', label: '商业计划赛' },
    { value: 'ai_innovation', label: 'AI创新赛' },
    { value: 'data_science', label: '数据科学赛' },
  ]

  const typeLabels: Record<string, string> = {
    hackathon: 'Hackathon',
    innovation: '创新赛',
    research: '研究赛',
    business_plan: '商业计划赛',
    ai_innovation: 'AI创新赛',
    data_science: '数据科学赛',
  }

  const typeTagMap: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    hackathon: 'warning',
    innovation: '',
    research: 'success',
    business_plan: 'info',
    ai_innovation: 'danger',
    data_science: 'success',
  }

  const emptyForm = () => ({
    title: '',
    type: 'hackathon' as Competition['type'],
    description: '',
    max_team_size: 4,
    min_team_size: 1,
    registration_deadline: '',
    start_date: '',
    end_date: '',
    location: '',
    prize: '',
    tags: '',
  })

  const form = reactive(emptyForm())

  const formRules: FormRules = {
    title: [{ required: true, message: '请填写赛事名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择类型', trigger: 'change' }],
    start_date: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
    end_date: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  }

  const filtered = computed(() => {
    return competitions.value
      .filter(c => {
        if (statusFilter.value !== 'all' && c.status !== statusFilter.value) return false
        if (typeFilter.value !== 'all' && typeFilter.value && c.type !== typeFilter.value) return false
        if (search.value && !c.title.includes(search.value)) return false
        return true
      })
      .sort((a, b) => {
        const order = ['ongoing', 'published', 'completed', 'draft', 'cancelled']
        return order.indexOf(a.status) - order.indexOf(b.status)
      })
  })

  function formatDate(s?: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('zh-CN')
  }

  async function loadCompetitions() {
    loading.value = true
    try {
      const res = await competitionsAPI.list()
      competitions.value = res.competitions || []
    } catch {
      ElMessage.error('加载赛事列表失败')
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    isEditing.value = false
    editingId.value = null
    Object.assign(form, emptyForm())
    dialogVisible.value = true
  }

  function openEdit(comp: Competition) {
    isEditing.value = true
    editingId.value = comp.id
    Object.assign(form, {
      title: comp.title,
      type: comp.type,
      description: comp.description || '',
      max_team_size: comp.max_team_size || 4,
      min_team_size: comp.min_team_size || 1,
      registration_deadline: comp.registration_deadline || '',
      start_date: comp.start_date || '',
      end_date: comp.end_date || '',
      location: comp.location || '',
      prize: comp.prize || '',
      tags: comp.tags || '',
    })
    dialogVisible.value = true
  }

  async function handleSubmit() {
    try {
      await formRef.value?.validate()
    } catch {
      return
    }

    submitting.value = true
    try {
      const payload = { ...form }
      if (isEditing.value && editingId.value) {
        const res = await competitionsAPI.update(editingId.value, payload)
        const idx = competitions.value.findIndex(c => c.id === editingId.value)
        if (idx >= 0) competitions.value[idx] = res.competition
        ElMessage.success('赛事已更新')
      } else {
        const res = await competitionsAPI.create(payload)
        competitions.value.unshift(res.competition)
        ElMessage.success('赛事已创建（草稿）')
      }
      dialogVisible.value = false
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '操作失败')
    } finally {
      submitting.value = false
    }
  }

  async function handlePublish(comp: Competition) {
    try {
      const res = await competitionsAPI.publish(comp.id)
      const idx = competitions.value.findIndex(c => c.id === comp.id)
      if (idx >= 0) competitions.value[idx] = res.competition
      ElMessage.success('赛事已发布')
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '发布失败')
    }
  }

  async function handleDelete(comp: Competition) {
    try {
      await ElMessageBox.confirm(`确认删除赛事「${comp.title}」？此操作不可撤销。`, '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await competitionsAPI.delete(comp.id)
      competitions.value = competitions.value.filter(c => c.id !== comp.id)
      ElMessage.success('赛事已删除')
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err?.response?.data?.error || '删除失败')
      }
    }
  }

  async function handleBatchImport() {
    let parsed: Record<string, unknown>[]
    try {
      parsed = JSON.parse(importJson.value)
      if (!Array.isArray(parsed)) {
        ElMessage.error('请输入 JSON 数组')
        return
      }
    } catch {
      ElMessage.error('JSON 格式错误')
      return
    }

    importing.value = true
    importResult.value = null
    try {
      const res = await competitionsAPI.batchImport(parsed)
      importResult.value = res
      if (res.created_count > 0) {
        ElMessage.success(`成功导入 ${res.created_count} 个赛事`)
        await loadCompetitions()
      }
      if (res.error_count > 0) {
        ElMessage.warning(`${res.error_count} 个赛事导入失败`)
      }
    } catch {
      ElMessage.error('导入失败')
    } finally {
      importing.value = false
    }
  }

  onMounted(loadCompetitions)
</script>

<style scoped lang="scss">
  .filter-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .import-card {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 600;
    }

    .import-hint {
      margin: 0 0 12px;
      font-size: 13px;
      color: var(--art-gray-600);
    }

    .import-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
    }
  }

  .text-success {
    color: var(--el-color-success);
    font-size: 13px;
  }

  .text-warning {
    color: var(--el-color-warning);
    font-size: 13px;
  }
</style>
