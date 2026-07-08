<template>
  <ElCard shadow="never" class="ssgl-stat-card">
    <div class="ssgl-stat-card__content">
      <div class="ssgl-stat-card__info">
        <span class="ssgl-stat-card__label">{{ label }}</span>
        <span class="ssgl-stat-card__value">{{ value }}</span>
      </div>
      <div v-if="icon" class="ssgl-stat-card__icon">
        <ElIcon :size="28">
          <component :is="icon" />
        </ElIcon>
      </div>
    </div>
    <div v-if="trend !== undefined" class="ssgl-stat-card__trend">
      <span :class="trend >= 0 ? 'text-green-500' : 'text-red-500'">
        {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}%
      </span>
      <span class="text-gray-400 ml-1">较上期</span>
    </div>
  </ElCard>
</template>

<script setup lang="ts">
  defineProps<{
    label: string
    value: string | number
    icon?: any
    trend?: number
  }>()
</script>

<style scoped lang="scss">
  .ssgl-stat-card {
    :deep(.el-card__body) {
      padding: 20px;
    }

    &__content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__label {
      display: block;
      font-size: 13px;
      color: var(--art-gray-600);
    }

    &__value {
      display: block;
      margin-top: 8px;
      font-size: 24px;
      font-weight: 700;
      color: var(--art-gray-900);
    }

    &__icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    &__trend {
      margin-top: 12px;
      font-size: 12px;
    }
  }
</style>
