<template>
  <section class="ssgl-page" data-page="Awards">
    <SSGLPageHeader
      title="获奖管理"
      :subtitle="`${awards.length} 个获奖记录，其中 ${settledCount} 个已结算`"
    >
      <template #actions>
        <ElButton type="primary" @click="showCreate = true">提名奖项</ElButton>
      </template>
    </SSGLPageHeader>

    <!-- Podium -->
    <ElCard v-if="podiumOrder.length > 0" shadow="never" class="mb-4">
      <template #header>
        <span class="font-semibold">颁奖台</span>
      </template>
      <div class="flex items-end justify-center gap-6 py-4" style="min-height: 260px">
        <div
          v-for="(award, i) in podiumOrder"
          :key="award?.id"
          class="flex flex-col items-center"
          :style="{ order: i === 0 ? 1 : i === 1 ? 0 : 2 }"
        >
          <div class="text-center mb-3 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border">
            <div class="font-bold text-sm">{{ award?.team?.name || '—' }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ award?.prize_name || award?.rank_name }}</div>
            <div class="font-mono font-bold mt-1" :class="podiumColors[i]">
              ¥{{ Number(award?.prize_amount || 0).toLocaleString() }}
            </div>
          </div>
          <div
            class="flex flex-col items-center justify-center rounded-t-lg font-display font-black text-2xl"
            :class="podiumBg[i]"
            :style="{ width: '100px', height: podiumHeights[i] + 'px' }"
          >
            <span>{{ podiumLabels[i] }}</span>
            <span class="text-xs opacity-60 mt-1">#{{ award?.rank }}</span>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- Filters & Table -->
    <ElCard shadow="never" v-loading="loading">
      <template #header>
        <div class="flex gap-2 items-center">
          <ElRadioGroup v-model="statusTab" size="small">
            <ElRadioButton value="all">全部</ElRadioButton>
            <ElRadioButton value="settled">已结算</ElRadioButton>
            <ElRadioButton value="teacher_confirm">教师确认</ElRadioButton>
            <ElRadioButton value="pending">待处理</ElRadioButton>
          </ElRadioGroup>
        </div>
      </template>

      <ElTable :data="filteredAwards" stripe style="width: 100%">
        <ElTableColumn label="排名" width="80">
          <template #default="{ row }">
            <span
              class="font-mono font-bold text-base"
              :class="{
                'text-amber-500': row.rank === 1,
                'text-gray-600': row.rank === 2,
                'text-orange-500': row.rank === 3,
                'text-gray-400': row.rank > 3,
              }"
            >
              #{{ row.rank }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="团队" min-width="140">
          <template #default="{ row }">
            <span class="font-semibold">{{ row.team?.name || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="赛事" min-width="200">
          <template #default="{ row }">
            <span class="text-gray-500 truncate block" style="max-width: 200px">
              {{ row.competition?.title || '—' }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="奖项" min-width="120">
          <template #default="{ row }">
            <span
              class="font-bold"
              :class="{
                'text-amber-500': row.rank === 1,
                'text-gray-600': row.rank === 2,
                'text-orange-500': row.rank === 3,
              }"
            >
              {{ row.rank_name || '—' }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="奖金" width="120">
          <template #default="{ row }">
            <span class="font-mono font-bold text-green-500">
              ¥{{ Number(row.prize_amount || 0).toLocaleString() }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="120">
          <template #default="{ row }">
            <SSGLStatusTag :status="row.status" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="row.status !== 'settled'"
              type="primary"
              link
              size="small"
              @click="openSettle(row)"
            >
              结算
            </ElButton>
            <span v-else class="text-gray-400">—</span>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- Settle Dialog -->
    <ElDialog v-model="settleVisible" :title="`结算奖项 · ${settleAward?.team?.name || ''}`" width="440px" destroy-on-close>
      <div class="text-sm text-gray-400 mb-3">
        {{ settleAward?.competition?.title || '' }} · {{ settleAward?.rank_name || `第 ${settleAward?.rank} 名` }}
      </div>
      <ElForm @submit.prevent="handleSettle">
        <ElFormItem label="结算奖金（元）">
          <ElInputNumber v-model="settleAmount" :min="0" :precision="2" style="width: 100%" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="settleVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="settling" @click="handleSettle">确认结算</ElButton>
      </template>
    </ElDialog>

    <!-- Create Award Dialog -->
    <ElDialog v-model="showCreate" title="提名奖项" width="520px" destroy-on-close>
      <ElForm :model="createForm" label-width="100px" @submit.prevent="handleCreate">
        <ElFormItem label="赛事" required>
          <ElSelect v-model="createForm.competition_id" placeholder="请选择赛事" style="width: 100%">
            <ElOption v-for="c in allCompetitions" :key="c.id" :label="c.title" :value="c.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="团队" required>
          <ElSelect v-model="createForm.team_id" placeholder="请选择团队" style="width: 100%">
            <ElOption v-for="t in allTeams" :key="t.id" :label="t.name" :value="t.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排名">
          <ElInputNumber v-model="createForm.rank" :min="1" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="奖项名称">
          <ElInput v-model="createForm.rank_name" placeholder="如：一等奖" />
        </ElFormItem>
        <ElFormItem label="奖品名称">
          <ElInput v-model="createForm.prize_name" placeholder="如：最佳创新奖" />
        </ElFormItem>
        <ElFormItem label="奖金（元）">
          <ElInputNumber v-model="createForm.prize_amount" :min="0" :precision="2" style="width: 100%" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreate = false">取消</ElButton>
        <ElButton type="primary" :loading="creating" @click="handleCreate">创建奖项</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { awardsAPI, competitionsAPI, teamsAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import type { Award, Competition, Team } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Awards' })

  const loading = ref(false)
  const awards = ref<Award[]>([])
  const statusTab = ref('all')

  // Settle
  const settleVisible = ref(false)
  const settleAward = ref<Award | null>(null)
  const settleAmount = ref(0)
  const settling = ref(false)

  // Create
  const showCreate = ref(false)
  const creating = ref(false)
  const allCompetitions = ref<Competition[]>([])
  const allTeams = ref<Team[]>([])
  const createForm = reactive({
    competition_id: null as number | null,
    team_id: null as number | null,
    rank: 1,
    rank_name: '',
    prize_name: '',
    prize_amount: 0,
  })

  const settledCount = computed(() => awards.value.filter(a => a.status === 'settled').length)

  const filteredAwards = computed(() => {
    if (statusTab.value === 'all') return awards.value
    return awards.value.filter(a => a.status === statusTab.value)
  })

  // Podium
  const top3 = computed(() => awards.value.slice(0, 3))
  const podiumOrder = computed(() => {
    const t = top3.value
    if (t.length === 0) return []
    return [t[1], t[0], t[2]].filter(Boolean) as Award[]
  })
  const podiumHeights = [120, 160, 100]
  const podiumLabels = ['2nd', '1st', '3rd']
  const podiumColors = ['text-gray-400', 'text-amber-500', 'text-orange-500']
  const podiumBg = [
    'bg-gray-200 dark:bg-gray-600 text-gray-400',
    'bg-amber-500 text-amber-950',
    'bg-orange-300 dark:bg-orange-700 text-orange-800 dark:text-orange-200',
  ]

  const loadAwards = async () => {
    loading.value = true
    try {
      const res = await awardsAPI.list()
      awards.value = res.awards || []
    } catch {
      ElMessage.error('加载获奖数据失败')
    } finally {
      loading.value = false
    }
  }

  const loadDropdowns = async () => {
    try {
      const [compRes, teamRes] = await Promise.all([
        competitionsAPI.list().catch(() => ({ competitions: [] })),
        teamsAPI.list().catch(() => ({ teams: [] })),
      ])
      allCompetitions.value = compRes.competitions || []
      allTeams.value = teamRes.teams || []
    } catch { /* ignore */ }
  }

  const openSettle = (award: Award) => {
    settleAward.value = award
    settleAmount.value = Number(award.prize_amount || 0)
    settleVisible.value = true
  }

  const handleSettle = async () => {
    if (!settleAward.value) return
    settling.value = true
    try {
      const res = await awardsAPI.settle(settleAward.value.id, settleAmount.value)
      ElMessage.success('奖项已结算')
      awards.value = awards.value.map(a => a.id === res.award.id ? res.award : a)
      settleVisible.value = false
    } catch {
      ElMessage.error('结算失败')
    } finally {
      settling.value = false
    }
  }

  const resetCreateForm = () => {
    createForm.competition_id = null
    createForm.team_id = null
    createForm.rank = 1
    createForm.rank_name = ''
    createForm.prize_name = ''
    createForm.prize_amount = 0
  }

  const handleCreate = async () => {
    if (!createForm.competition_id || !createForm.team_id) {
      return ElMessage.warning('请选择赛事和团队')
    }
    creating.value = true
    try {
      const res = await awardsAPI.create({
        competition_id: createForm.competition_id,
        team_id: createForm.team_id,
        rank: createForm.rank,
        rank_name: createForm.rank_name || undefined,
        prize_name: createForm.prize_name || undefined,
        prize_amount: String(createForm.prize_amount || 0),
      })
      ElMessage.success('奖项创建成功')
      awards.value = [res.award, ...awards.value]
      showCreate.value = false
      resetCreateForm()
    } catch {
      ElMessage.error('创建失败')
    } finally {
      creating.value = false
    }
  }

  onMounted(() => {
    loadAwards()
    loadDropdowns()
  })
</script>
