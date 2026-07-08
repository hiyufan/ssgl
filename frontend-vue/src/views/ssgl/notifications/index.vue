<template>
  <section class="ssgl-page" data-page="Notifications">
    <div class="notif-header">
      <div>
        <h1 class="notif-header__title">通知中心</h1>
        <p class="notif-header__sub">
          {{ unreadCount > 0 ? `${unreadCount} 条未读通知` : '所有通知已读' }}
        </p>
      </div>
      <div class="notif-header__actions">
        <ElButton
          v-if="isAdmin"
          :type="showCreateForm ? 'danger' : 'primary'"
          size="small"
          @click="showCreateForm = !showCreateForm"
        >
          {{ showCreateForm ? '取消' : '发送通知' }}
        </ElButton>
        <ElButton
          v-if="unreadCount > 0"
          size="small"
          @click="handleMarkAllRead"
        >
          全部已读
        </ElButton>
      </div>
    </div>

    <!-- Admin Create Notification Form -->
    <Transition name="el-zoom-in-top">
      <div v-if="isAdmin && showCreateForm" class="create-form">
        <h3 class="create-form__title">发送系统通知</h3>
        <ElForm label-position="top" size="default">
          <ElFormItem label="搜索用户">
            <ElInput
              v-model="userSearch"
              placeholder="输入用户名或姓名搜索..."
              clearable
            />
            <div v-if="userResults.length > 0" class="user-dropdown">
              <div
                v-for="u in userResults"
                :key="u.id"
                class="user-dropdown__item"
                :class="{ 'is-selected': createForm.user_id === u.id }"
                @click="selectUser(u)"
              >
                {{ u.name }} ({{ u.username }})
              </div>
            </div>
            <div v-if="createForm.user_id > 0" class="selected-user-hint">
              已选择用户 ID: {{ createForm.user_id }}
            </div>
          </ElFormItem>
          <ElFormItem label="通知类型">
            <ElSelect v-model="createForm.type" style="width: 100%">
              <ElOption label="系统通知" value="system" />
              <ElOption label="赛事通知" value="competition" />
              <ElOption label="团队通知" value="team" />
              <ElOption label="奖项通知" value="award" />
              <ElOption label="报名通知" value="registration" />
              <ElOption label="预案通知" value="pre_plan" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="标题">
            <ElInput v-model="createForm.title" placeholder="通知标题" />
          </ElFormItem>
          <ElFormItem label="内容">
            <ElInput
              v-model="createForm.message"
              type="textarea"
              :rows="3"
              placeholder="通知内容（可选）"
            />
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" :loading="creating" @click="handleCreate">
              发送通知
            </ElButton>
          </ElFormItem>
        </ElForm>
      </div>
    </Transition>

    <!-- Filter Tabs -->
    <div class="filter-tabs mb-4">
      <ElRadioGroup v-model="filter" size="small" @change="handleFilterChange">
        <ElRadioButton label="all">全部</ElRadioButton>
        <ElRadioButton label="unread">
          未读
          <ElBadge v-if="unreadCount > 0" :value="unreadCount" :max="99" class="unread-badge" />
        </ElRadioButton>
      </ElRadioGroup>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <ElIcon :size="24" class="is-loading"><Loading /></ElIcon>
      <span class="loading-text">加载中...</span>
    </div>

    <!-- Empty -->
    <ElEmpty
      v-else-if="notifications.length === 0"
      :description="`暂无${filter === 'unread' ? '未读' : ''}通知`"
    />

    <!-- Notification List -->
    <div v-else class="notif-list">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notif-item"
        :class="{ 'is-unread': !n.read_at }"
        @click="!n.read_at && handleMarkRead(n.id)"
      >
        <div class="notif-item__icon" :style="{ background: getTypeInfo(n.type).bg, color: getTypeInfo(n.type).color }">
          <ElIcon :size="16"><component :is="getTypeInfo(n.type).icon" /></ElIcon>
        </div>
        <div class="notif-item__body">
          <div class="notif-item__header">
            <span class="notif-item__title" :class="{ 'is-bold': !n.read_at }">{{ n.title }}</span>
            <ElTag size="small" :color="getTypeInfo(n.type).bg" effect="plain" round>
              {{ TYPE_LABELS[n.type] || n.type }}
            </ElTag>
            <span v-if="!n.read_at" class="notif-item__dot" />
          </div>
          <p v-if="n.message" class="notif-item__msg">{{ n.message }}</p>
          <span class="notif-item__time">{{ timeAgo(n.created_at) }}</span>
        </div>
        <ElButton
          v-if="!n.read_at"
          link
          type="primary"
          size="small"
          title="标记已读"
          @click.stop="handleMarkRead(n.id)"
        >
          <ElIcon><Select /></ElIcon>
        </ElButton>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination-wrap">
      <ElButton :disabled="page <= 1" size="small" @click="page--; fetchData()">上一页</ElButton>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <ElButton :disabled="page >= totalPages" size="small" @click="page++; fetchData()">下一页</ElButton>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { Loading, Select, Bell, Trophy, UserFilled, Present, Promotion, CircleCheck, Document } from '@element-plus/icons-vue'
  import { notificationsAPI, profileAPI } from '@/api/ssgl'
  import { useUserStore } from '@/store/modules/user'
  import type { Notification, UserSummary } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Notifications' })

  const TYPE_COLORS: Record<string, { color: string; bg: string; icon: any }> = {
    system: { color: '#4a9eff', bg: '#ecf5ff', icon: Bell },
    competition: { color: '#f59e0b', bg: '#fdf6ec', icon: Trophy },
    team: { color: '#2dd4bf', bg: '#edfaf8', icon: UserFilled },
    award: { color: '#f59e0b', bg: '#fdf6ec', icon: Present },
    team_invite: { color: '#a78bfa', bg: '#f5f0ff', icon: Promotion },
    registration: { color: '#4ade80', bg: '#ecfdf5', icon: CircleCheck },
    pre_plan: { color: '#4a9eff', bg: '#ecf5ff', icon: Document },
  }

  const TYPE_LABELS: Record<string, string> = {
    system: '系统通知',
    competition: '赛事通知',
    team: '团队通知',
    award: '奖项通知',
    team_invite: '团队邀请',
    registration: '报名通知',
    pre_plan: '预案通知',
  }

  const userStore = useUserStore()
  const isAdmin = computed(() => userStore.info?.role === 'admin')

  const notifications = ref<Notification[]>([])
  const total = ref(0)
  const unreadCount = ref(0)
  const page = ref(1)
  const filter = ref<'all' | 'unread'>('all')
  const loading = ref(true)
  const showCreateForm = ref(false)
  const creating = ref(false)
  const userSearch = ref('')
  const userResults = ref<UserSummary[]>([])
  const createForm = reactive({ user_id: 0, type: 'system', title: '', message: '' })

  const totalPages = computed(() => Math.ceil(total.value / 20))

  function getTypeInfo(type: string) {
    return TYPE_COLORS[type] || TYPE_COLORS.system
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} 天前`
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  function handleFilterChange() {
    page.value = 1
    fetchData()
  }

  async function fetchData() {
    loading.value = true
    try {
      const params: Record<string, unknown> = { page: page.value, page_size: 20 }
      if (filter.value === 'unread') params.unread = true
      const [notifRes, unreadRes] = await Promise.all([
        notificationsAPI.list(params as { unread?: boolean; page?: number; page_size?: number }),
        notificationsAPI.getUnreadCount(),
      ])
      notifications.value = notifRes.items || []
      total.value = notifRes.total || 0
      unreadCount.value = unreadRes.unread_count || 0
    } catch {
      ElMessage.error('加载通知失败')
    } finally {
      loading.value = false
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await notificationsAPI.markRead(id)
      const idx = notifications.value.findIndex(n => n.id === id)
      if (idx !== -1) notifications.value[idx].read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      ElMessage.error('标记失败')
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsAPI.markAllRead()
      notifications.value.forEach(n => {
        if (!n.read_at) n.read_at = new Date().toISOString()
      })
      unreadCount.value = 0
      ElMessage.success('全部已读')
    } catch {
      ElMessage.error('操作失败')
    }
  }

  // Admin: user search debounce
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  watch(userSearch, val => {
    if (searchTimer) clearTimeout(searchTimer)
    if (val.length < 2) { userResults.value = []; return }
    searchTimer = setTimeout(async () => {
      try {
        const res = await profileAPI.searchUsers(val)
        userResults.value = res.users || []
      } catch { /* ignore */ }
    }, 300)
  })

  function selectUser(u: UserSummary) {
    createForm.user_id = u.id
    userSearch.value = `${u.name} (${u.username})`
    userResults.value = []
  }

  async function handleCreate() {
    if (!createForm.user_id || !createForm.title) {
      ElMessage.warning('请选择用户并填写标题')
      return
    }
    creating.value = true
    try {
      await notificationsAPI.create({ ...createForm })
      ElMessage.success('通知已发送')
      showCreateForm.value = false
      createForm.user_id = 0
      createForm.type = 'system'
      createForm.title = ''
      createForm.message = ''
      userSearch.value = ''
      fetchData()
    } catch {
      ElMessage.error('发送失败')
    } finally {
      creating.value = false
    }
  }

  onMounted(fetchData)
</script>

<style scoped lang="scss">
  .mb-4 {
    margin-bottom: 16px;
  }

  .notif-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;

    &__title {
      font-size: 24px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      margin: 0;
    }

    &__sub {
      color: var(--el-text-color-secondary);
      margin: 4px 0 0;
      font-size: 14px;
    }

    &__actions {
      display: flex;
      gap: 8px;
    }
  }

  .create-form {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;

    &__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin: 0 0 16px;
    }
  }

  .user-dropdown {
    margin-top: 4px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter);
    max-height: 150px;
    overflow: auto;

    &__item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: var(--el-text-color-primary);
      border-bottom: 1px solid var(--el-border-color-extra-light);

      &:hover {
        background: var(--el-fill-color);
      }

      &.is-selected {
        background: var(--el-color-primary-light-9);
      }

      &:last-child {
        border-bottom: none;
      }
    }
  }

  .selected-user-hint {
    font-size: 12px;
    color: var(--el-color-success);
    margin-top: 4px;
  }

  .filter-tabs {
    display: flex;
    gap: 8px;
  }

  .unread-badge {
    margin-left: 6px;
  }

  .loading-wrap {
    text-align: center;
    padding: 60px 0;
    color: var(--el-text-color-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .loading-text {
    font-size: 14px;
  }

  .notif-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notif-item {
    display: flex;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 12px;
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 1px solid transparent;
    transition: all 0.15s;

    &.is-unread {
      background: var(--el-bg-color);
      border: 1px solid var(--el-border-color-lighter);
    }

    &__icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__body {
      flex: 1;
      min-width: 0;
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }

    &__title {
      font-size: 13px;
      font-weight: 400;
      color: var(--el-text-color-primary);

      &.is-bold {
        font-weight: 600;
      }
    }

    &__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--el-color-primary);
      flex-shrink: 0;
    }

    &__msg {
      margin: 0;
      font-size: 13px;
      color: var(--el-text-color-regular);
      line-height: 1.5;
    }

    &__time {
      font-size: 11px;
      color: var(--el-text-color-secondary);
      margin-top: 4px;
      display: inline-block;
    }
  }

  .pagination-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
  }

  .page-info {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    padding: 0 12px;
  }
</style>
