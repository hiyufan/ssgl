<template>
  <ElTag :type="meta.type" effect="light" round>
    {{ meta.label }}
  </ElTag>
</template>

<script setup lang="ts">
  const props = defineProps<{ status: string }>()

  type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

  const statusMap: Record<string, { label: string; type: TagType }> = {
    draft: { label: '草稿', type: 'info' },
    published: { label: '已发布', type: 'success' },
    ongoing: { label: '进行中', type: 'warning' },
    completed: { label: '已完成', type: 'success' },
    cancelled: { label: '已取消', type: 'danger' },
    pending: { label: '待处理', type: 'warning' },
    approved: { label: '已通过', type: 'success' },
    rejected: { label: '已驳回', type: 'danger' },
    active: { label: '正常', type: 'success' },
    disabled: { label: '禁用', type: 'danger' },
    submitted: { label: '已提交', type: 'info' },
    under_review: { label: '审核中', type: 'warning' },
    reviewed: { label: '已审核', type: 'success' },
    settled: { label: '已结算', type: 'success' },
    teacher_confirm: { label: '待教师确认', type: 'warning' },
    in_progress: { label: '进行中', type: 'warning' },
    skipped: { label: '已跳过', type: 'info' }
  }

  const meta = computed(() => statusMap[props.status] ?? { label: props.status, type: 'info' })
</script>
