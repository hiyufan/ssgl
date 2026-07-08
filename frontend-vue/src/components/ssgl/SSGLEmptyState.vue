<template>
  <div class="ssgl-empty-state">
    <ElEmpty :description="description" :image-size="imageSize">
      <template v-if="$slots.default" #default>
        <slot />
      </template>
    </ElEmpty>
  </div>
</template>

<script setup lang="ts">
  withDefaults(
    defineProps<{
      description?: string
      imageSize?: number
    }>(),
    {
      description: '暂无数据',
      imageSize: 160
    }
  )
</script>

<style scoped lang="scss">
  .ssgl-empty-state {
    padding: 40px 0;
    text-align: center;
  }
</style>
