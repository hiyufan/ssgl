<template>
  <section class="ssgl-page" data-page="Calendar">
    <SSGLPageHeader
      title="赛事日历"
      :subtitle="`${monthLabel} · ${events.length} 个赛事`"
    >
      <template #actions>
        <ElButton size="small" :loading="exporting" @click="handleExportICS">iCal 订阅</ElButton>
        <ElButton size="small" @click="goToToday">今天</ElButton>
        <ElButton :icon="ArrowLeft" size="small" circle @click="prevMonth" />
        <span class="month-label">{{ monthLabel }}</span>
        <ElButton :icon="ArrowRight" size="small" circle @click="nextMonth" />
      </template>
    </SSGLPageHeader>

    <!-- Legend -->
    <div class="legend-bar">
      <span v-for="(colors, type) in TYPE_COLORS" :key="type" class="legend-item">
        <span class="legend-dot" :style="{ background: colors.text }" />
        {{ TYPE_LABELS[type as string] || type }}
      </span>
    </div>

    <!-- Calendar Grid -->
    <ElCard v-loading="loading" shadow="never" class="calendar-card">
      <!-- Weekday Header -->
      <div class="calendar-weekdays">
        <div v-for="wd in WEEKDAYS" :key="wd" class="weekday-cell">{{ wd }}</div>
      </div>

      <!-- Day Cells -->
      <div class="calendar-grid">
        <div
          v-for="{ date, day, inMonth } in calendarDays"
          :key="date"
          class="day-cell"
          :class="{
            'is-today': date === todayStr,
            'is-selected': date === selectedDay,
            'is-other': !inMonth,
          }"
          @click="toggleDay(date)"
        >
          <div class="day-number" :class="{ 'is-today-num': date === todayStr }">{{ day }}</div>
          <div class="day-events">
            <div
              v-for="evt in (eventsByDate[date] || []).slice(0, 3)"
              :key="evt.id"
              class="event-chip"
              :style="getEventStyle(evt)"
              :title="evt.title"
            >
              {{ evt.title }}
            </div>
            <div v-if="(eventsByDate[date] || []).length > 3" class="event-more">
              +{{ eventsByDate[date].length - 3 }} 更多
            </div>
          </div>
        </div>
      </div>
    </ElCard>

    <!-- Selected Day Detail -->
    <ElCard v-if="selectedDay && selectedDayEvents.length > 0" shadow="never" class="day-detail-card">
      <h4 class="day-detail-title">{{ selectedDay }} 赛事详情</h4>
      <div class="day-detail-list">
        <div v-for="evt in selectedDayEvents" :key="evt.id" class="day-detail-item">
          <div class="detail-accent" :style="{ background: getEventColor(evt.type) }" />
          <div class="detail-content">
            <div class="detail-title-row">
              <span class="detail-title">{{ evt.title }}</span>
              <ElTag size="small" :style="getEventTagStyle(evt)" effect="plain">
                {{ TYPE_LABELS[evt.type] || evt.type }}
              </ElTag>
              <SSGLStatusTag :status="evt.status" />
            </div>
            <div class="detail-meta">
              <span>{{ formatDate(evt.start_date) }} — {{ formatDate(evt.end_date) }}</span>
              <span v-if="evt.location">{{ evt.location }}</span>
              <span v-if="evt.tags">{{ evt.tags }}</span>
            </div>
          </div>
        </div>
      </div>
    </ElCard>
  </section>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
  import { calendarAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import SSGLStatusTag from '@/components/ssgl/SSGLStatusTag.vue'
  import type { CalendarEvent } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_Calendar' })

  const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

  const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    hackathon:     { bg: 'rgba(45,212,191,0.15)',  text: '#2dd4bf', border: 'rgba(45,212,191,0.4)' },
    innovation:    { bg: 'rgba(96,165,250,0.15)',   text: '#60a5fa', border: 'rgba(96,165,250,0.4)' },
    research:      { bg: 'rgba(167,139,250,0.15)',  text: '#a78bfa', border: 'rgba(167,139,250,0.4)' },
    business_plan: { bg: 'rgba(52,211,153,0.15)',   text: '#34d399', border: 'rgba(52,211,153,0.4)' },
    ai_innovation: { bg: 'rgba(251,113,133,0.15)',  text: '#fb7185', border: 'rgba(251,113,133,0.4)' },
    data_science:  { bg: 'rgba(251,146,60,0.15)',   text: '#fb923c', border: 'rgba(251,146,60,0.4)' },
  }

  const TYPE_LABELS: Record<string, string> = {
    hackathon: '黑客松',
    innovation: '创新赛',
    research: '研究赛',
    business_plan: '商业计划赛',
    ai_innovation: 'AI创新赛',
    data_science: '数据科学赛',
  }

  const now = new Date()
  const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const events = ref<CalendarEvent[]>([])
  const total = ref(0)
  const loading = ref(false)
  const selectedDay = ref<string | null>(null)
  const exporting = ref(false)

  const [year, month] = currentMonth.value.split('-').map(Number)
  const yearRef = computed(() => Number(currentMonth.value.split('-')[0]))
  const monthRef = computed(() => Number(currentMonth.value.split('-')[1]))

  const monthLabel = computed(() => `${yearRef.value}年${monthRef.value}月`)
  const todayStr = new Date().toISOString().slice(0, 10)

  const calendarDays = computed(() => {
    const y = yearRef.value
    const m = monthRef.value
    const firstDay = new Date(y, m - 1, 1)
    let startWeekday = firstDay.getDay() - 1
    if (startWeekday < 0) startWeekday = 6

    const daysInMonth = new Date(y, m, 0).getDate()
    const days: { date: string; day: number; inMonth: boolean }[] = []

    const prevDays = new Date(y, m - 1, 0).getDate()
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevDays - i
      const pm = m - 1 || 12
      const py = m === 1 ? y - 1 : y
      days.push({ date: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: true })
    }

    const remainder = days.length % 7
    if (remainder !== 0) {
      const fill = 7 - remainder
      for (let d = 1; d <= fill; d++) {
        const nm = m + 1 > 12 ? 1 : m + 1
        const ny = m + 1 > 12 ? y + 1 : y
        days.push({ date: `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false })
      }
    }

    return days
  })

  const eventsByDate = computed(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const evt of events.value) {
      const start = new Date(evt.start_date)
      const end = new Date(evt.end_date)
      const cursor = new Date(start)
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(evt)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return map
  })

  const selectedDayEvents = computed(() => {
    if (!selectedDay.value) return []
    return eventsByDate.value[selectedDay.value] || []
  })

  function getEventColor(type: string) {
    return TYPE_COLORS[type]?.text || '#2dd4bf'
  }

  function getEventStyle(evt: CalendarEvent) {
    const colors = TYPE_COLORS[evt.type] || TYPE_COLORS.hackathon
    return {
      background: colors.bg,
      color: colors.text,
      borderLeft: `2px solid ${colors.border}`,
    }
  }

  function getEventTagStyle(evt: CalendarEvent) {
    const colors = TYPE_COLORS[evt.type] || TYPE_COLORS.hackathon
    return {
      background: colors.bg,
      color: colors.text,
      borderColor: colors.border,
    }
  }

  function formatDate(s?: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('zh-CN')
  }

  function toggleDay(date: string) {
    selectedDay.value = selectedDay.value === date ? null : date
  }

  function navigateMonth(offset: number) {
    const d = new Date(yearRef.value, monthRef.value - 1 + offset, 1)
    currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    selectedDay.value = null
  }

  function prevMonth() { navigateMonth(-1) }
  function nextMonth() { navigateMonth(1) }

  function goToToday() {
    const n = new Date()
    currentMonth.value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
    selectedDay.value = todayStr
  }

  async function loadEvents() {
    loading.value = true
    try {
      const res = await calendarAPI.list(currentMonth.value)
      events.value = res.events || []
      total.value = res.total || 0
    } catch {
      ElMessage.error('加载日历数据失败')
    } finally {
      loading.value = false
    }
  }

  async function handleExportICS() {
    exporting.value = true
    try {
      const blob = await calendarAPI.exportICS()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ssgl_calendar_${new Date().toISOString().slice(0, 10)}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      ElMessage.error('iCal 导出失败')
    } finally {
      exporting.value = false
    }
  }

  watch(currentMonth, loadEvents)
  onMounted(loadEvents)
</script>

<style scoped lang="scss">
  .month-label {
    font-size: 14px;
    font-weight: 700;
    min-width: 80px;
    text-align: center;
    display: inline-block;
  }

  .legend-bar {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    padding: 10px 16px;
    margin-bottom: 12px;
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }

  .calendar-card {
    overflow: hidden;
    margin-bottom: 16px;
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .weekday-cell {
    padding: 10px 0;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--art-gray-500);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }

  .day-cell {
    min-height: 88px;
    padding: 6px;
    border-right: 1px solid var(--el-border-color-lighter);
    border-bottom: 1px solid var(--el-border-color-lighter);
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.is-today {
      background: rgba(255, 193, 7, 0.08);
    }

    &.is-selected {
      background: var(--el-fill-color);
    }

    &.is-other {
      opacity: 0.35;
    }

    &:nth-child(7n) {
      border-right: none;
    }
  }

  .day-number {
    font-size: 12px;
    font-weight: 500;
    color: var(--art-gray-800);
    margin-bottom: 4px;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    &.is-today-num {
      font-weight: 800;
      color: #fff;
      background: var(--el-color-warning);
    }
  }

  .day-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .event-chip {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-more {
    font-size: 9px;
    color: var(--art-gray-500);
    padding-left: 5px;
  }

  .day-detail-card {
    margin-top: 16px;
  }

  .day-detail-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--art-gray-800);
  }

  .day-detail-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .day-detail-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
  }

  .detail-accent {
    width: 4px;
    min-height: 40px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .detail-content {
    flex: 1;
  }

  .detail-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .detail-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--art-gray-900);
  }

  .detail-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--art-gray-500);
    flex-wrap: wrap;
  }
</style>
