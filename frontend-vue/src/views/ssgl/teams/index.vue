<template>
  <section class="ssgl-page" data-page="Teams">
    <SSGLPageHeader
      :title="role === 'teacher' ? '指导团队' : role === 'student' ? '我的团队' : '团队管理'"
      :subtitle="`${filtered.length} 支团队`"
    >
      <template v-if="role === 'student'" #actions>
        <ElButton type="primary" :icon="Plus" @click="openCreate">创建团队</ElButton>
      </template>
    </SSGLPageHeader>

    <!-- Competition Filter Tabs -->
    <div class="filter-tabs">
      <ElButton
        v-for="comp in compOptions"
        :key="comp.id"
        :type="selectedComp === String(comp.id) ? 'primary' : 'default'"
        size="small"
        round
        @click="selectedComp = String(comp.id)"
      >
        {{ comp.title }}
      </ElButton>
    </div>

    <!-- Teams Table -->
    <ElTable v-loading="loading" :data="filtered" stripe border style="width: 100%">
      <ElTableColumn prop="name" label="团队名称" min-width="160" show-overflow-tooltip />
      <ElTableColumn label="关联赛事" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ getCompetitionTitle(row.competition_id) }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="status" label="状态" width="100">
        <template #default="{ row }">
          <SSGLStatusTag :status="row.status" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="成员" width="200">
        <template #default="{ row }">
          <div class="member-list">
            <span v-for="(m, i) in (row.members || []).slice(0, 4)" :key="i" class="member-chip">
              {{ m.user?.name || '?' }}
              <ElTag v-if="m.role === 'leader'" size="small" type="warning" effect="plain" class="leader-tag">队长</ElTag>
            </span>
            <span v-if="(row.members || []).length > 4" class="member-more">
              +{{ row.members.length - 4 }}
            </span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <ElButton type="primary" link size="small" @click="openDetail(row)">详情</ElButton>
          <ElButton v-if="isLeader(row)" type="warning" link size="small" @click="openEditName(row)">重命名</ElButton>
          <ElButton v-if="isLeader(row)" type="danger" link size="small" @click="handleDeleteTeam(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- Create Team Dialog -->
    <ElDialog v-model="createVisible" title="创建团队" width="440px" destroy-on-close>
      <ElForm ref="createFormRef" :model="createForm" label-width="80px" :rules="createFormRules">
        <ElFormItem label="团队名称" prop="name" required>
          <ElInput v-model="createForm.name" placeholder="给你的队伍起个名字" />
        </ElFormItem>
        <ElFormItem label="参赛赛事" prop="competition_id" required>
          <ElSelect v-model="createForm.competition_id" placeholder="选择赛事" style="width: 100%">
            <ElOption
              v-for="c in competitions.filter(c => c.status !== 'cancelled')"
              :key="c.id"
              :value="c.id"
              :label="c.title"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="createSubmitting" @click="handleCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- Team Detail Dialog -->
    <ElDialog v-model="detailVisible" :title="detailTeam?.name || '团队详情'" width="520px" destroy-on-close>
      <template v-if="detailTeam">
        <div class="detail-header">
          <SSGLStatusTag :status="detailTeam.status" />
          <span class="comp-label">{{ getCompetitionTitle(detailTeam.competition_id) }}</span>
        </div>

        <h4 class="section-title">成员 ({{ (detailTeam.members || []).length }})</h4>
        <div class="detail-members">
          <div v-for="(m, i) in detailTeam.members || []" :key="i" class="detail-member-row">
            <span class="member-name">{{ m.user?.name || '?' }}</span>
            <ElTag :type="m.role === 'leader' ? 'warning' : 'info'" size="small" effect="plain">
              {{ m.role === 'leader' ? '队长' : '队员' }}
            </ElTag>
          </div>
        </div>

        <div v-if="analysis" class="analysis-block">
          <h4 class="section-title">能力分析</h4>
          <ElRow :gutter="12">
            <ElCol :span="8">
              <div class="analysis-stat">
                <div class="analysis-value">{{ analysis.member_count }}</div>
                <div class="analysis-label">成员</div>
              </div>
            </ElCol>
            <ElCol :span="8">
              <div class="analysis-stat">
                <div class="analysis-value">{{ analysis.dept_diversity }}</div>
                <div class="analysis-label">学科</div>
              </div>
            </ElCol>
            <ElCol :span="8">
              <div class="analysis-stat">
                <div class="analysis-value">{{ analysis.avg_experience?.toFixed(1) }}</div>
                <div class="analysis-label">经验值</div>
              </div>
            </ElCol>
          </ElRow>
          <div v-if="analysis.strengths?.length" class="analysis-section">
            <strong>优势：</strong>
            <span v-for="(s, i) in analysis.strengths" :key="i">{{ s }}{{ i < analysis.strengths.length - 1 ? '、' : '' }}</span>
          </div>
          <div v-if="analysis.gaps?.length" class="analysis-section">
            <strong>短板：</strong>
            <span v-for="(g, i) in analysis.gaps" :key="i">{{ g }}{{ i < analysis.gaps.length - 1 ? '、' : '' }}</span>
          </div>
        </div>

        <div class="detail-actions">
          <ElButton size="small" :icon="DataAnalysis" :loading="analysisLoading" @click="loadAnalysis">能力分析</ElButton>
          <ElButton v-if="isMember(detailTeam) && !isLeader(detailTeam)" type="danger" size="small" :loading="leaving" @click="handleLeave(detailTeam)">退出团队</ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- Rename Dialog -->
    <ElDialog v-model="renameVisible" title="重命名团队" width="380px" destroy-on-close>
      <ElInput v-model="newTeamName" placeholder="新名称" />
      <template #footer>
        <ElButton @click="renameVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="renaming" @click="handleRename">保存</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { Plus, DataAnalysis } from '@element-plus/icons-vue'
  import { teamsAPI, competitionsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import { useUserStore } from '@/store/modules/user'
  import type { Competition, Team, TeamAnalysis } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Teams' })

  const userStore = useUserStore()
  const role = computed(() => userStore.info.role || '')
  const currentUserId = computed(() => userStore.info.id)

  // State
  const loading = ref(false)
  const teams = ref<Team[]>([])
  const competitions = ref<Competition[]>([])
  const selectedComp = ref('all')

  // Create dialog
  const createVisible = ref(false)
  const createSubmitting = ref(false)
  const createFormRef = ref<FormInstance>()
  const createForm = reactive({ name: '', competition_id: null as number | null })
  const createFormRules: FormRules = {
    name: [{ required: true, message: '请填写团队名称', trigger: 'blur' }],
    competition_id: [{ required: true, message: '请选择参赛赛事', trigger: 'change' }],
  }

  // Detail dialog
  const detailVisible = ref(false)
  const detailTeam = ref<Team | null>(null)
  const analysis = ref<TeamAnalysis | null>(null)
  const analysisLoading = ref(false)
  const leaving = ref(false)

  // Rename dialog
  const renameVisible = ref(false)
  const renameTeamId = ref<number | null>(null)
  const newTeamName = ref('')
  const renaming = ref(false)

  const compOptions = computed(() => [
    { id: 'all', title: '全部赛事' },
    ...competitions.value.filter(c => c.status !== 'cancelled'),
  ])

  const filtered = computed(() => {
    if (selectedComp.value === 'all') return teams.value
    return teams.value.filter(t => String(t.competition_id) === selectedComp.value)
  })

  function getCompetitionTitle(id: number) {
    return competitions.value.find(c => c.id === id)?.title || '未关联赛事'
  }

  function isLeader(team: Team) {
    const member = team.members?.find(m => m.user_id === currentUserId.value)
    return member?.role === 'leader'
  }

  function isMember(team: Team) {
    return team.members?.some(m => m.user_id === currentUserId.value)
  }

  async function loadData() {
    loading.value = true
    try {
      const [tRes, cRes] = await Promise.all([teamsAPI.list(), competitionsAPI.list()])
      teams.value = tRes.teams || []
      competitions.value = cRes.competitions || []
    } catch {
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    createForm.name = ''
    createForm.competition_id = null
    createVisible.value = true
  }

  async function handleCreate() {
    try {
      await createFormRef.value?.validate()
    } catch {
      return
    }
    createSubmitting.value = true
    try {
      const res = await teamsAPI.create({ name: createForm.name.trim(), competition_id: createForm.competition_id! })
      teams.value.unshift(res.team)
      ElMessage.success('团队已创建')
      createVisible.value = false
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '创建失败')
    } finally {
      createSubmitting.value = false
    }
  }

  function openDetail(team: Team) {
    detailTeam.value = team
    analysis.value = null
    detailVisible.value = true
  }

  async function loadAnalysis() {
    if (!detailTeam.value) return
    analysisLoading.value = true
    try {
      analysis.value = await teamsAPI.analysis(detailTeam.value.id)
    } catch {
      ElMessage.error('分析加载失败')
    } finally {
      analysisLoading.value = false
    }
  }

  async function handleLeave(team: Team) {
    try {
      await ElMessageBox.confirm(`确认退出团队「${team.name}」？`, '确认退出', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
      })
      leaving.value = true
      await teamsAPI.leave(team.id)
      teams.value = teams.value.filter(t => t.id !== team.id)
      detailVisible.value = false
      ElMessage.success('已退出团队')
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err?.response?.data?.error || '退出失败')
      }
    } finally {
      leaving.value = false
    }
  }

  function openEditName(team: Team) {
    renameTeamId.value = team.id
    newTeamName.value = team.name
    renameVisible.value = true
  }

  async function handleRename() {
    if (!newTeamName.value.trim()) {
      ElMessage.warning('名称不能为空')
      return
    }
    renaming.value = true
    try {
      await teamsAPI.update(renameTeamId.value!, { name: newTeamName.value.trim() })
      const idx = teams.value.findIndex(t => t.id === renameTeamId.value)
      if (idx >= 0) teams.value[idx].name = newTeamName.value.trim()
      if (detailTeam.value?.id === renameTeamId.value) {
        detailTeam.value.name = newTeamName.value.trim()
      }
      ElMessage.success('团队名称已更新')
      renameVisible.value = false
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '更新失败')
    } finally {
      renaming.value = false
    }
  }

  async function handleDeleteTeam(team: Team) {
    try {
      await ElMessageBox.confirm(`确认删除团队「${team.name}」？此操作不可撤销。`, '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await teamsAPI.delete(team.id)
      teams.value = teams.value.filter(t => t.id !== team.id)
      detailVisible.value = false
      ElMessage.success('团队已删除')
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err?.response?.data?.error || '删除失败')
      }
    }
  }

  onMounted(loadData)
</script>

<style scoped lang="scss">
  .filter-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .member-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .member-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 13px;
  }

  .leader-tag {
    margin-left: 2px;
    transform: scale(0.85);
  }

  .member-more {
    font-size: 12px;
    color: var(--art-gray-500);
    margin-left: 4px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .comp-label {
      font-size: 13px;
      color: var(--art-gray-600);
    }
  }

  .section-title {
    margin: 16px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--art-gray-800);
  }

  .detail-members {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-member-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-radius: 6px;
    background: var(--el-fill-color-lighter);

    .member-name {
      font-size: 13px;
      font-weight: 500;
    }
  }

  .detail-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .analysis-block {
    margin-top: 16px;
    padding: 16px;
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
  }

  .analysis-stat {
    text-align: center;
    padding: 8px;

    .analysis-value {
      font-size: 20px;
      font-weight: 700;
      font-family: var(--el-font-family-monospace);
      color: var(--el-color-primary);
    }

    .analysis-label {
      font-size: 11px;
      color: var(--art-gray-500);
      margin-top: 2px;
    }
  }

  .analysis-section {
    font-size: 13px;
    margin-top: 8px;
    line-height: 1.8;
    color: var(--art-gray-700);

    strong {
      color: var(--art-gray-800);
    }
  }
</style>
