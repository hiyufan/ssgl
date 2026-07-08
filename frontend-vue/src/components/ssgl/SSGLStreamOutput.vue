<template>
  <div class="ssgl-stream-output">
    <div v-if="loading" class="ssgl-stream-output__loading">
      <ElIcon class="is-loading"><Loading /></ElIcon>
      <span>生成中...</span>
    </div>
    <div v-if="error" class="ssgl-stream-output__error">
      <ElAlert :title="error" type="error" show-icon :closable="false" />
    </div>
    <div v-if="output" class="ssgl-stream-output__content" v-html="renderedOutput" />
  </div>
</template>

<script setup lang="ts">
  import { Loading } from '@element-plus/icons-vue'

  const props = defineProps<{
    output: string
    loading?: boolean
    error?: string
  }>()

  const renderedOutput = computed(() => {
    // Simple markdown-like rendering
    return props.output
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
  })
</script>

<style scoped lang="scss">
  .ssgl-stream-output {
    &__loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--el-color-primary);
      font-size: 14px;
    }

    &__error {
      margin-bottom: 12px;
    }

    &__content {
      line-height: 1.8;
      font-size: 14px;

      :deep(code) {
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--el-fill-bg-color);
        font-family: monospace;
      }
    }
  }
</style>
