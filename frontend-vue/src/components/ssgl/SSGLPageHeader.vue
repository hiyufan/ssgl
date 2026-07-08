<template>
  <div class="ssgl-page-header">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="ssgl-page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ title: string; subtitle?: string }>()
</script>

<style scoped lang="scss">
  .ssgl-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;

    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--art-gray-900);
    }

    p {
      margin: 6px 0 0;
      color: var(--art-gray-600);
    }
  }
</style>
