<template>
  <section class="ssgl-page execution-match-page" data-page="ExecutionMatch">
    <SSGLPageHeader title="执行匹配分析" subtitle="AI 对比预案计划与实际执行情况，识别偏差并给出改进建议" />

    <!-- Input Section -->
    <div class="em-input-card">
      <div class="em-input-grid">
        <!-- Left: Plan selection -->
        <div>
          <label class="em-label">选择预案（可选）</label>
          <ElSelect
            v-model="selectedPlan"
            placeholder="手动输入预案内容"
            clearable
            style="width: 100%"
          >
            <ElOption
              v-for="p in plans"
              :key="p.id"
              :label="p.competition_title ? `${p.title} — ${p.competition_title}` : p.title"
              :value="p.id"
            />
          </ElSelect>

          <div v-if="!selectedPlan" style="margin-top: 12px">
            <label class="em-label">预案内容</label>
            <ElInput
              v-model="planText"
              type="textarea"
              :rows="8"
              placeholder="粘贴原始预案计划内容..."
              resize="vertical"
            />
          </div>
        </div>

        <!-- Right: Execution text -->
        <div>
          <label class="em-label">
            实际执行情况 <span style="color: var(--el-color-danger)">*</span>
          </label>
          <ElInput
            v-model="executionText"
            type="textarea"
            :rows="selectedPlan ? 18 : 8"
            placeholder="描述项目的实际执行过程、成果、遇到的问题等..."
            resize="vertical"
          />
        </div>
      </div>

      <ElAlert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-top: 12px" />

      <div class="em-input-actions">
        <ElButton
          type="warning"
          :loading="loading"
          :disabled="!executionText.trim()"
          @click="handleMatch"
        >
          <ElIcon v-if="!loading"><Search /></ElIcon>
          {{ loading ? 'AI 分析中...' : '开始匹配分析' }}
        </ElButton>
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="em-results">
      <!-- Left: Score + Dimensions -->
      <div class="em-results__left">
        <div class="em-score-card">
          <div class="em-score-card__label">综合匹配度</div>
          <div class="em-score-circle" :style="scoreCircleStyle(result.match_score)">
            <div class="em-score-inner">
              <span class="em-score-number" :style="{ color: scoreColor(result.match_score) }">{{ result.match_score }}</span>
              <span class="em-score-unit">/ 100</span>
            </div>
          </div>
          <p class="em-score-summary">{{ result.summary }}</p>
        </div>

        <div class="em-dims-card">
          <div class="em-dims-title">维度评分</div>
          <div v-for="(val, key) in result.dimension_scores" :key="key" class="em-dim-row">
            <div class="em-dim-row__header">
              <span class="em-dim-row__label">{{ dimLabels[key] || key }}</span>
              <span class="em-dim-row__value" :style="{ color: scoreColor(val) }">{{ val }}</span>
            </div>
            <div class="em-dim-bar">
              <div class="em-dim-bar__fill" :style="{ width: `${val}%`, background: scoreColor(val) }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Gaps + Recommendations -->
      <div class="em-results__right">
        <!-- Gaps -->
        <div v-if="result.gaps.length > 0" class="em-gaps-card">
          <div class="em-section-title">
            <ElIcon><Warning /></ElIcon>
            偏差识别 ({{ result.gaps.length }})
          </div>
          <div class="em-gaps-list">
            <div v-for="(gap, i) in result.gaps" :key="i" class="em-gap-item">
              <div class="em-gap-item__header">
                <span class="em-gap-item__area">{{ gap.area }}</span>
                <ElTag
                  :type="gap.severity === 'high' ? 'danger' : gap.severity === 'medium' ? 'warning' : 'success'"
                  size="small"
                  effect="dark"
                >
                  {{ gap.severity === 'high' ? '高' : gap.severity === 'medium' ? '中' : '低' }}
                </ElTag>
              </div>
              <p class="em-gap-item__desc">{{ gap.description }}</p>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="em-recs-card">
          <div class="em-section-title">
            <ElIcon><Opportunity /></ElIcon>
            改进建议 ({{ result.recommendations.length }})
          </div>
          <div class="em-recs-list">
            <div v-for="(rec, i) in result.recommendations" :key="i" class="em-rec-item">
              <span class="em-rec-item__num">{{ i + 1 }}</span>
              <span class="em-rec-item__text">{{ rec }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Search, Warning, Opportunity } from '@element-plus/icons-vue'
  import { executionMatchAPI } from '@/api/ai'
  import { prePlansAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'

  defineOptions({ name: 'SSGL_ExecutionMatch' })

  interface MatchResult {
    match_score: number
    dimension_scores: Record<string, number>
    gaps: { area: string; severity: string; description: string }[]
    recommendations: string[]
    summary: string
  }

  interface PrePlanItem {
    id: number
    title: string
    competition_title?: string
    status: string
  }

  const dimLabels: Record<string, string> = {
    scope_completion: '范围完成度',
    timeline_adherence: '时间遵循度',
    quality_standards: '质量标准',
    resource_efficiency: '资源效率',
    innovation_achieved: '创新达成',
    team_collaboration: '团队协作',
    milestone_tracking: '里程碑跟踪',
    risk_management: '风险管理',
  }

  const plans = ref<PrePlanItem[]>([])
  const selectedPlan = ref<number | ''>('')
  const planText = ref('')
  const executionText = ref('')
  const loading = ref(false)
  const result = ref<MatchResult | null>(null)
  const error = ref('')

  onMounted(async () => {
    try {
      const r = await prePlansAPI.list()
      plans.value = (r.pre_plans || []).map(p => ({
        id: p.id,
        title: p.title || `预案 #${p.id}`,
        competition_title: p.competition?.title,
        status: p.status,
      }))
    } catch {
      // ignore
    }
  })

  async function handleMatch() {
    if (!executionText.value.trim()) { error.value = '请输入执行情况描述'; return }
    loading.value = true
    error.value = ''
    result.value = null
    try {
      result.value = await executionMatchAPI.match({
        pre_plan_id: selectedPlan.value || undefined,
        execution_text: executionText.value,
        plan_text: planText.value || undefined,
      })
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'AI 分析失败，请稍后重试'
    } finally {
      loading.value = false
    }
  }

  function scoreColor(s: number) {
    return s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'
  }

  function scoreCircleStyle(score: number) {
    return {
      background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, var(--el-fill-color-light) 0deg)`,
    }
  }
</script>

<style scoped lang="scss">
  .execution-match-page {
    overflow-y: auto;
  }

  .em-input-card {
    padding: 24px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
    margin-bottom: 24px;
  }

  .em-input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .em-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-gray-700);
    margin-bottom: 8px;
  }

  .em-input-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .em-results {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;

    &__left {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    &__right {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  }

  .em-score-card {
    padding: 24px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
    text-align: center;

    &__label {
      font-size: 13px;
      color: var(--art-gray-500);
      margin-bottom: 16px;
      font-weight: 600;
    }
  }

  .em-score-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }

  .em-score-inner {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: var(--el-bg-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .em-score-number {
    font-size: 36px;
    font-weight: 900;
  }

  .em-score-unit {
    font-size: 11px;
    color: var(--art-gray-500);
    margin-top: -2px;
  }

  .em-score-summary {
    margin-top: 16px;
    font-size: 13px;
    color: var(--art-gray-700);
    line-height: 1.6;
  }

  .em-dims-card {
    padding: 24px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
  }

  .em-dims-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--art-gray-800);
    margin-bottom: 16px;
  }

  .em-dim-row {
    margin-bottom: 12px;

    &__header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    &__label {
      font-size: 12px;
      color: var(--art-gray-700);
    }

    &__value {
      font-size: 12px;
      font-weight: 700;
    }
  }

  .em-dim-bar {
    height: 8px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    overflow: hidden;

    &__fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s ease;
    }
  }

  .em-gaps-card,
  .em-recs-card {
    padding: 24px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
  }

  .em-section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--art-gray-800);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .em-gaps-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .em-gap-item {
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);

    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    &__area {
      font-size: 13px;
      font-weight: 700;
      color: var(--art-gray-800);
    }

    &__desc {
      font-size: 13px;
      color: var(--art-gray-700);
      margin: 0;
      line-height: 1.5;
    }
  }

  .em-recs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .em-rec-item {
    display: flex;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--el-fill-color-light);

    &__num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--el-color-warning);
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }

    &__text {
      font-size: 13px;
      color: var(--art-gray-700);
      line-height: 1.5;
    }
  }
</style>
