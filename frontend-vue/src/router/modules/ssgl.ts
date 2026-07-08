import type { AppRouteRecord } from '@/types/router'

const allRoles = ['student', 'teacher', 'admin']
const teacherAdmin = ['teacher', 'admin']
const adminOnly = ['admin']

function page(
  name: string,
  path: string,
  title: string,
  icon: string,
  roles: string[],
  fixedTab = false
): AppRouteRecord {
  return {
    name,
    path,
    component: `/ssgl/${path}`,
    meta: { title, icon, roles, fixedTab }
  }
}

function group(
  name: string,
  path: string,
  title: string,
  icon: string,
  roles: string[],
  children: AppRouteRecord[]
): AppRouteRecord {
  return {
    name,
    path,
    component: '/index/index',
    meta: { title, icon, roles },
    children
  }
}

export const ssglRoutes: AppRouteRecord[] = [
  // 概览
  page('Dashboard', 'dashboard', '概览', 'ri:dashboard-line', allRoles, true),

  // 赛事运营
  group('CompetitionOps', 'competition-ops', '赛事运营', 'ri:trophy-line', allRoles, [
    page('Competitions', 'competitions', '赛事管理', 'ri:trophy-line', allRoles),
    page('Calendar', 'calendar', '赛事日历', 'ri:calendar-line', allRoles),
    page('Teams', 'teams', '团队管理', 'ri:team-line', allRoles)
  ]),

  // 流程审批
  group('Workflow', 'workflow', '流程审批', 'ri:checkbox-line', allRoles, [
    page('Approvals', 'approvals', '审批中心', 'ri:checkbox-line', teacherAdmin),
    page('Preplans', 'preplans', '预案管理', 'ri:file-list-3-line', allRoles),
    page('Registrations', 'registrations', '报名管理', 'ri:file-user-line', teacherAdmin),
    page('Awards', 'awards', '获奖管理', 'ri:gift-line', teacherAdmin),
    page('Evaluations', 'evaluations', '学生评价', 'ri:star-line', allRoles),
    page('Feedback', 'feedback', '赛事反馈', 'ri:message-3-line', allRoles)
  ]),

  // 数据洞察
  group('DataInsights', 'data-insights', '数据洞察', 'ri:bar-chart-line', allRoles, [
    page('Stats', 'stats', '统计分析', 'ri:bar-chart-line', teacherAdmin),
    page('Analytics', 'analytics', '数据分析中心', 'ri:line-chart-line', allRoles),
    page('Kanban', 'kanban', '看板总览', 'ri:kanban-view', teacherAdmin),
    page('Insights', 'insights', 'AI 洞察', 'ri:lightbulb-line', teacherAdmin),
    page('Leaderboard', 'leaderboard', '排行榜', 'ri:trophy-line', allRoles),
    page('Showcase', 'showcase', '成果展示', 'ri:award-line', allRoles),
    page('AchievementGallery', 'achievement-gallery', '成就展示墙', 'ri:medal-line', allRoles),
    page('Points', 'points', '积分成就', 'ri:star-smile-line', allRoles),
    page('Compare', 'compare', '赛事对比', 'ri:git-compare-line', allRoles),
    page('Growth', 'growth', '成长档案', 'ri:seedling-line', ['student']),
    page('LearningPath', 'learning-path', '学习路径', 'ri:map-2-line', allRoles),
    page('AnnualReport', 'annual-report', '年度报告', 'ri:file-chart-line', teacherAdmin)
  ]),

  // 智能助手
  group('AIAssistants', 'ai-assistants', '智能助手', 'ri:magic-line', allRoles, [
    page('AITools', 'aitools', 'AI 工具箱', 'ri:magic-line', allRoles),
    page('Coach', 'coach', '赛事陪练', 'ri:target-line', allRoles),
    page('Assistant', 'assistant', 'AI 助手', 'ri:robot-2-line', allRoles),
    page('ExecutionMatch', 'execution-match', '执行匹配', 'ri:survey-line', allRoles),
    page('KnowledgeBase', 'knowledge-base', '知识库管理', 'ri:database-2-line', allRoles)
  ]),

  // 系统管理
  group('SystemAdmin', 'system-admin', '系统管理', 'ri:settings-3-line', adminOnly, [
    page('AuditLogs', 'audit-logs', '审计日志', 'ri:shield-check-line', adminOnly),
    page('Diagnostics', 'diagnostics', '系统诊断', 'ri:pulse-line', adminOnly)
  ]),

  // 账户
  group('Account', 'account', '账户', 'ri:user-line', allRoles, [
    page('Notifications', 'notifications', '通知中心', 'ri:notification-3-line', allRoles),
    page('Profile', 'profile', '个人中心', 'ri:user-settings-line', allRoles)
  ])
]
