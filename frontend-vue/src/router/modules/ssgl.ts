import type { AppRouteRecord } from '@/types/router'

const allRoles = ['student', 'teacher', 'admin']
const studentTeacher = ['student', 'teacher']
const teacherOnly = ['teacher']
const studentOnly = ['student']
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
  group('CompetitionOps', 'competition-ops', '赛事运营', 'ri:trophy-line', studentTeacher, [
    page('Competitions', 'competitions', '赛事管理', 'ri:trophy-line', studentTeacher),
    page('Calendar', 'calendar', '赛事日历', 'ri:calendar-line', studentTeacher),
    page('Teams', 'teams', '团队管理', 'ri:team-line', studentTeacher)
  ]),

  // 流程审批
  group('Workflow', 'workflow', '流程审批', 'ri:checkbox-line', studentTeacher, [
    page('Approvals', 'approvals', '审批中心', 'ri:checkbox-line', teacherOnly),
    page('Preplans', 'preplans', '预案管理', 'ri:file-list-3-line', studentTeacher),
    page('Registrations', 'registrations', '报名管理', 'ri:file-user-line', teacherOnly),
    page('Awards', 'awards', '获奖管理', 'ri:gift-line', teacherOnly),
    page('Evaluations', 'evaluations', '学生评价', 'ri:star-line', studentTeacher),
    page('Feedback', 'feedback', '赛事反馈', 'ri:message-3-line', studentTeacher)
  ]),

  // 数据洞察
  group('DataInsights', 'data-insights', '数据洞察', 'ri:bar-chart-line', studentTeacher, [
    page('Stats', 'stats', '统计分析', 'ri:bar-chart-line', teacherOnly),
    page('Analytics', 'analytics', '数据分析中心', 'ri:line-chart-line', teacherOnly),
    page('Kanban', 'kanban', '看板总览', 'ri:kanban-view', teacherOnly),
    page('Insights', 'insights', 'AI 洞察', 'ri:lightbulb-line', teacherOnly),
    page('Leaderboard', 'leaderboard', '排行榜', 'ri:trophy-line', studentTeacher),
    page('Showcase', 'showcase', '成果展示', 'ri:award-line', studentTeacher),
    page('AchievementGallery', 'achievement-gallery', '成就展示墙', 'ri:medal-line', studentTeacher),
    page('Points', 'points', '积分成就', 'ri:star-smile-line', studentOnly),
    page('Compare', 'compare', '赛事对比', 'ri:git-compare-line', studentTeacher),
    page('Growth', 'growth', '成长档案', 'ri:seedling-line', studentOnly),
    page('LearningPath', 'learning-path', '学习路径', 'ri:map-2-line', studentOnly),
    page('AnnualReport', 'annual-report', '年度报告', 'ri:file-chart-line', teacherOnly)
  ]),

  // 智能助手
  group('AIAssistants', 'ai-assistants', '智能助手', 'ri:magic-line', studentTeacher, [
    page('AITools', 'aitools', 'AI 工具箱', 'ri:magic-line', studentTeacher),
    page('Coach', 'coach', '赛事陪练', 'ri:target-line', studentOnly),
    page('Assistant', 'assistant', 'AI 助手', 'ri:robot-2-line', studentTeacher),
    page('ExecutionMatch', 'execution-match', '执行匹配', 'ri:survey-line', studentTeacher),
    page('KnowledgeBase', 'knowledge-base', '知识库管理', 'ri:database-2-line', teacherOnly)
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
