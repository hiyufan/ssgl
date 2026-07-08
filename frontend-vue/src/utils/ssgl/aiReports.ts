export interface PrePlanReviewDimension {
  key: string
  label: string
  score: number
}

export interface PrePlanSimilarProject {
  id?: number | string
  preview: string
  similarity?: number
}

export interface PrePlanReviewReport {
  score?: number
  dimensions: PrePlanReviewDimension[]
  summary: string
  suggestions: string[]
  similarProjects: PrePlanSimilarProject[]
  rawText: string
}

export interface ExecutionGap {
  area: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface ExecutionMatchResult {
  match_score: number
  dimension_scores: Record<string, number>
  gaps: ExecutionGap[]
  recommendations: string[]
  summary: string
}

const PRE_PLAN_DIMENSION_LABELS: Record<string, string> = {
  feasibility: '可行性',
  innovation: '创新性',
  completeness: '完整度',
  market_fit: '需求匹配'
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter((item) => item.trim().length > 0)
}

function parseStoredJson(notes?: string): Record<string, any> | null {
  if (!notes?.trim()) return null

  const primary = notes.split(/\n---\n/)[0].trim()
  const candidates = [primary]

  const firstBrace = primary.indexOf('{')
  const lastBrace = primary.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(primary.slice(firstBrace, lastBrace + 1))
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Try the next extraction strategy.
    }
  }

  return null
}

function dimensionsFromBreakdown(
  breakdown: unknown,
  labels: Record<string, string> = PRE_PLAN_DIMENSION_LABELS
): PrePlanReviewDimension[] {
  if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return []

  return Object.entries(breakdown as Record<string, unknown>).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    score: toNumber(value)
  }))
}

function similarProjectsFrom(value: unknown): PrePlanSimilarProject[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const project = item as Record<string, any>
      const preview = project.content_preview || project.preview || project.content || ''
      if (!preview) return null
      return {
        id: project.id,
        preview: String(preview),
        similarity: typeof project.similarity === 'number' ? project.similarity : undefined
      }
    })
    .filter(Boolean) as PrePlanSimilarProject[]
}

export function parsePrePlanReviewNotes(
  notes?: string,
  fallbackDimensions: { label: string; score: number }[] = []
): PrePlanReviewReport {
  const parsed = parseStoredJson(notes)

  if (!parsed) {
    return {
      dimensions: fallbackDimensions.map((dimension) => ({
        key: dimension.label,
        label: dimension.label,
        score: toNumber(dimension.score)
      })),
      summary: notes?.trim() || '',
      suggestions: [],
      similarProjects: [],
      rawText: notes || ''
    }
  }

  return {
    score: parsed.score == null ? undefined : toNumber(parsed.score),
    dimensions: dimensionsFromBreakdown(parsed.breakdown),
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    suggestions: toStringList(parsed.suggestions),
    similarProjects: similarProjectsFrom(parsed.similar_projects),
    rawText: notes || ''
  }
}

function normalizeSeverity(value: unknown): ExecutionGap['severity'] {
  return value === 'high' || value === 'low' || value === 'medium' ? value : 'medium'
}

function normalizeGaps(value: unknown): ExecutionGap[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return {
          area: '执行偏差',
          severity: 'medium' as const,
          description: item
        }
      }

      if (!item || typeof item !== 'object') return null
      const gap = item as Record<string, unknown>
      const description = String(gap.description || gap.content || '')
      if (!description.trim()) return null

      return {
        area: String(gap.area || gap.dimension || '执行偏差'),
        severity: normalizeSeverity(gap.severity),
        description
      }
    })
    .filter(Boolean) as ExecutionGap[]
}

function normalizeDimensionScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, score]) => [
      key,
      toNumber(score)
    ])
  )
}

export function normalizeExecutionMatchResponse(raw: any): ExecutionMatchResult {
  const dimensionSource = raw?.dimension_scores || raw?.breakdown || {}
  const gapSource = raw?.gaps || raw?.deviations || []
  const recommendations = raw?.recommendations || raw?.suggestions || []

  return {
    match_score: toNumber(raw?.match_score ?? raw?.score),
    dimension_scores: normalizeDimensionScores(dimensionSource),
    gaps: normalizeGaps(gapSource),
    recommendations: toStringList(recommendations),
    summary: typeof raw?.summary === 'string' ? raw.summary : raw?.feedback || ''
  }
}
