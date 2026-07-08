import { describe, expect, it } from 'vitest'
import { normalizeExecutionMatchResponse, parsePrePlanReviewNotes } from './aiReports'

describe('AI report helpers', () => {
  it('turns stored pre-plan review JSON into display sections', () => {
    const report = parsePrePlanReviewNotes(JSON.stringify({
      score: 82,
      breakdown: {
        feasibility: 78,
        innovation: 88,
        completeness: 80,
        market_fit: 84
      },
      summary: '方案方向清晰，但资源计划需要更具体。',
      suggestions: ['补充里程碑', '明确目标用户验证方法'],
      similar_projects: [
        { id: 7, content_preview: '往届智能排程项目', similarity: 0.76 }
      ]
    }))

    expect(report.score).toBe(82)
    expect(report.summary).toBe('方案方向清晰，但资源计划需要更具体。')
    expect(report.dimensions).toEqual([
      { key: 'feasibility', label: '可行性', score: 78 },
      { key: 'innovation', label: '创新性', score: 88 },
      { key: 'completeness', label: '完整度', score: 80 },
      { key: 'market_fit', label: '需求匹配', score: 84 }
    ])
    expect(report.suggestions).toEqual(['补充里程碑', '明确目标用户验证方法'])
    expect(report.similarProjects[0]).toEqual({
      id: 7,
      preview: '往届智能排程项目',
      similarity: 0.76
    })
  })

  it('ignores teacher-note suffixes appended after stored review JSON', () => {
    const notes = '{"summary":"AI 评审正文","suggestions":["继续打磨"]}\n---\n{"teacher_notes":"同意"}'

    expect(parsePrePlanReviewNotes(notes).summary).toBe('AI 评审正文')
  })

  it('normalizes legacy execution-match AI output into the frontend contract', () => {
    const normalized = normalizeExecutionMatchResponse({
      score: 68,
      breakdown: {
        alignment: 70,
        feasibility: 60
      },
      summary: '执行方案基本一致，但风险覆盖不足。',
      deviations: ['交付范围比预案缩小', { area: '风险管理', severity: 'high', description: '缺少备用方案' }],
      suggestions: ['补齐验收指标']
    })

    expect(normalized.match_score).toBe(68)
    expect(normalized.dimension_scores).toEqual({ alignment: 70, feasibility: 60 })
    expect(normalized.summary).toBe('执行方案基本一致，但风险覆盖不足。')
    expect(normalized.gaps).toEqual([
      { area: '执行偏差', severity: 'medium', description: '交付范围比预案缩小' },
      { area: '风险管理', severity: 'high', description: '缺少备用方案' }
    ])
    expect(normalized.recommendations).toEqual(['补齐验收指标'])
  })
})
