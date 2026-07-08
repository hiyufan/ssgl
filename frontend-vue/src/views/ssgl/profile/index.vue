<template>
  <section class="ssgl-page" data-page="Profile">
    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <ElIcon :size="32" class="is-loading"><Loading /></ElIcon>
    </div>

    <!-- Not found -->
    <ElEmpty v-else-if="!profile" description="无法加载用户信息" />

    <!-- Content -->
    <template v-else>
      <!-- Header Card -->
      <div class="profile-header">
        <div class="profile-header__avatar-wrap">
          <ElAvatar v-if="profile.avatar" :size="100" :src="profile.avatar" />
          <div v-else class="avatar-placeholder">
            {{ (profile.name || profile.username).charAt(0).toUpperCase() }}
          </div>
          <ElTag
            class="role-badge"
            :type="roleType(profile.role)"
            effect="dark"
            size="small"
            round
          >
            {{ roleLabels[profile.role] || profile.role }}
          </ElTag>
        </div>
        <div class="profile-header__info">
          <h1 class="profile-header__name">{{ profile.name || profile.username }}</h1>
          <p class="profile-header__username">@{{ profile.username }}</p>
          <p v-if="profile.dept" class="profile-header__detail">
            <ElIcon :size="14"><School /></ElIcon>{{ profile.dept }}
          </p>
          <p v-if="profile.student_id" class="profile-header__detail">
            <ElIcon :size="14"><EditPen /></ElIcon>学号: {{ profile.student_id }}
          </p>
          <p v-if="profile.email" class="profile-header__detail">
            <ElIcon :size="14"><Message /></ElIcon>{{ profile.email }}
          </p>
          <p v-if="profile.phone" class="profile-header__detail">
            <ElIcon :size="14"><Phone /></ElIcon>{{ profile.phone }}
          </p>
          <p class="profile-header__detail">
            <ElIcon :size="14"><Calendar /></ElIcon>注册于 {{ profile.created_at }}
          </p>
          <ElButton size="small" @click="editing = !editing" style="margin-top: 8px">
            <ElIcon v-if="!editing" :size="14"><EditPen /></ElIcon>
            {{ editing ? '取消' : '编辑资料' }}
          </ElButton>
        </div>
      </div>

      <!-- Edit Form -->
      <Transition name="el-zoom-in-top">
        <div v-if="editing" class="edit-card">
          <h3 class="section-title">编辑个人信息</h3>
          <ElForm label-position="top">
            <ElRow :gutter="16">
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="姓名">
                  <ElInput v-model="editForm.name" />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="邮箱">
                  <ElInput v-model="editForm.email" type="email" />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="手机">
                  <ElInput v-model="editForm.phone" />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="院系">
                  <ElInput v-model="editForm.dept" />
                </ElFormItem>
              </ElCol>
            </ElRow>
            <div class="edit-actions">
              <ElButton type="primary" :loading="saving" @click="handleSave">
                <ElIcon v-if="!saving" :size="14"><Check /></ElIcon>
                保存
              </ElButton>
              <Transition name="el-fade-in">
                <span v-if="saveMsg" class="save-msg" :class="saveStatus === 'success' ? 'save-msg--ok' : 'save-msg--err'">
                  <ElIcon :size="14">
                    <CircleCheck v-if="saveStatus === 'success'" />
                    <CircleClose v-else />
                  </ElIcon>
                  {{ saveMsg }}
                </span>
              </Transition>
            </div>
          </ElForm>
        </div>
      </Transition>

      <!-- Stats Grid -->
      <div class="stats-section">
        <h3 class="section-title">我的数据</h3>
        <ElRow :gutter="16">
          <ElCol :xs="12" :sm="6" v-for="s in statCards" :key="s.label">
            <div class="stat-card" :style="{ borderTopColor: s.color }">
              <ElIcon :size="28" :style="{ color: s.color }"><component :is="s.icon" /></ElIcon>
              <span class="stat-card__value" :style="{ color: s.color }">{{ s.value }}</span>
              <span class="stat-card__label">{{ s.label }}</span>
            </div>
          </ElCol>
        </ElRow>
      </div>

      <!-- Quick Actions -->
      <div class="actions-section">
        <h3 class="section-title">快捷操作</h3>
        <div class="actions-grid">
          <ElButton v-if="profile.role === 'student'" @click="router.push('/competition-ops/teams')">
            <ElIcon><UserFilled /></ElIcon>我的团队
          </ElButton>
          <ElButton v-if="profile.role === 'student'" @click="router.push('/workflow/preplans')">
            <ElIcon><Document /></ElIcon>我的预案
          </ElButton>
          <ElButton v-if="profile.role === 'student'" @click="router.push('/ai-assistants/coach')">
            <ElIcon><Microphone /></ElIcon>答辩教练
          </ElButton>
          <ElButton @click="router.push('/competition-ops/competitions')">
            <ElIcon><Trophy /></ElIcon>赛事列表
          </ElButton>
          <ElButton @click="router.push('/ai-assistants/aitools')">
            <ElIcon><ChatDotRound /></ElIcon>AI 工具箱
          </ElButton>
          <ElButton @click="router.push('/data-insights/leaderboard')">
            <ElIcon><Medal /></ElIcon>排行榜
          </ElButton>
          <ElButton @click="router.push('/data-insights/showcase')">
            <ElIcon><Aim /></ElIcon>成果展示
          </ElButton>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
  import {
    Loading, School, EditPen, Message, Phone, Calendar, Check,
    CircleCheck, CircleClose, UserFilled, Document, Microphone,
    Trophy, ChatDotRound, Medal, Aim,
  } from '@element-plus/icons-vue'
  import { profileAPI } from '@/api/ssgl'
  import type { UserProfile } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Profile' })

  const router = useRouter()

  const roleLabels: Record<string, string> = {
    student: '学生',
    teacher: '教师',
    admin: '管理员',
  }

  const profile = ref<UserProfile | null>(null)
  const loading = ref(true)
  const editing = ref(false)
  const saving = ref(false)
  const saveMsg = ref('')
  const saveStatus = ref<'success' | 'error' | ''>('')
  const editForm = reactive({ name: '', email: '', phone: '', dept: '' })

  const statCards = computed(() => [
    { label: '参与赛事', value: profile.value?.competition_count ?? 0, icon: Trophy, color: '#f59e0b' },
    { label: '加入团队', value: profile.value?.team_count ?? 0, icon: UserFilled, color: '#4a9eff' },
    { label: '提交预案', value: profile.value?.pre_plan_count ?? 0, icon: Document, color: '#4ade80' },
    { label: '获得奖项', value: profile.value?.award_count ?? 0, icon: Medal, color: '#a78bfa' },
  ])

  function roleType(role: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
    if (role === 'admin') return 'danger'
    if (role === 'teacher') return 'warning'
    return 'info'
  }

  async function fetchProfile() {
    try {
      const res = await profileAPI.getMyProfile()
      profile.value = res.profile
      editForm.name = res.profile.name || ''
      editForm.email = res.profile.email || ''
      editForm.phone = res.profile.phone || ''
      editForm.dept = res.profile.dept || ''
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    } finally {
      loading.value = false
    }
  }

  async function handleSave() {
    saving.value = true
    saveMsg.value = ''
    saveStatus.value = ''
    try {
      await profileAPI.updateProfile({ ...editForm })
      saveMsg.value = '保存成功'
      saveStatus.value = 'success'
      const refreshed = await profileAPI.getMyProfile()
      profile.value = refreshed.profile
      editing.value = false
    } catch (e: any) {
      saveMsg.value = e.response?.data?.error || '保存失败'
      saveStatus.value = 'error'
    } finally {
      saving.value = false
    }
  }

  onMounted(fetchProfile)
</script>

<style scoped lang="scss">
  .loading-wrap {
    display: flex;
    height: 200px;
    align-items: center;
    justify-content: center;
  }

  .profile-header {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
    padding: 32px;
    display: flex;
    gap: 32px;
    margin-bottom: 24px;

    &__avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    &__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__name {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--el-text-color-primary);
    }

    &__username {
      margin: 0;
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }

    &__detail {
      margin: 0;
      font-size: 14px;
      color: var(--el-text-color-regular);
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f59e0b, #f59e0b);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 700;
    color: #000;
  }

  .role-badge {
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
  }

  .edit-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .edit-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .save-msg {
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 5px;

    &--ok {
      color: var(--el-color-success);
    }

    &--err {
      color: var(--el-color-danger);
    }
  }

  .section-title {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stats-section {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: var(--el-fill-color-light);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border-top: 3px solid;
    margin-bottom: 16px;

    &__value {
      font-size: 32px;
      font-weight: 700;
    }

    &__label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .actions-section {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
    padding: 24px;
  }

  .actions-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
</style>
