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
  group: string,
  fixedTab = false
): AppRouteRecord {
  return {
    name,
    path,
    component: `/ssgl${path}`,
    meta: { title, icon, roles, group, fixedTab }
  }
}

export const ssglRoutes: AppRouteRecord[] = [
  page('Dashboard', '/dashboard', '概览', 'ri:dashboard-line', allRoles, '概览', true),
  page('Competitions', '/competitions', '赛事管理', 'ri:trophy-line', allRoles, '赛事运营'),
  page('Calendar', '/calendar', '赛事日历', 'ri:calendar-line', allRoles, '赛事运营'),
  page('Teams', '/teams', '团队管理', 'ri:team-line', allRoles, '赛事运营'),
  page('Approvals', '/approvals', '审批中心', 'ri:checkbox-line', teacherAdmin, '流程审批'),
  page('Preplans', '/preplans', '预案管理', 'ri:file-list-3-line', allRoles, '流程审批'),
  page('Registrations', '/registrations', '报名管理', 'ri:file-user-line', teacherAdmin, '流程审批'),
  page('Awards', '/awards', '获奖管理', 'ri:gift-line', teacherAdmin, '流程审批'),
  page('Evaluations', '/evaluations', '学生评价', 'ri:star-line', allRoles, '流程审批'),
  page('Feedback', '/feedback', '赛事反馈', 'ri:message-3-line', allRoles, '流程审批'),
  page('Stats', '/stats', '统计分析', 'ri:bar-chart-line', teacherAdmin, '数据洞察'),
  page('Analytics', '/analytics', '数据分析中心', 'ri:line-chart-line', allRoles, '数据洞察'),
  page('Kanban', '/kanban', '看板总览', 'ri:kanban-view', teacherAdmin, '数据洞察'),
  page('Insights', '/insights', 'AI 洞察', 'ri:lightbulb-line', teacherAdmin, '数据洞察'),
  page('Leaderboard', '/leaderboard', '排行榜', 'ri:trophy-line', allRoles, '数据洞察'),
  page('Showcase', '/showcase', '成果展示', 'ri:award-line', allRoles, '数据洞察'),
  page('AchievementGallery', '/achievement-gallery', '成就展示墙', 'ri:medal-line', allRoles, '数据洞察'),
  page('Points', '/points', '积分成就', 'ri:star-smile-line', allRoles, '数据洞察'),
  page('Compare', '/compare', '赛事对比', 'ri:git-compare-line', allRoles, '数据洞察'),
  page('Growth', '/growth', '成长档案', 'ri:seedling-line', ['student'], '数据洞察'),
  page('LearningPath', '/learning-path', '学习路径', 'ri:map-2-line', allRoles, '数据洞察'),
  page('AnnualReport', '/annual-report', '年度报告', 'ri:file-chart-line', teacherAdmin, '数据洞察'),
  page('AITools', '/aitools', 'AI 工具箱', 'ri:magic-line', allRoles, '智能助手'),
  page('Coach', '/coach', '赛事陪练', 'ri:target-line', allRoles, '智能助手'),
  page('Assistant', '/assistant', 'AI 助手', 'ri:robot-2-line', allRoles, '智能助手'),
  page('ExecutionMatch', '/execution-match', '执行匹配', 'ri:survey-line', allRoles, '智能助手'),
  page('KnowledgeBase', '/knowledge-base', '知识库管理', 'ri:database-2-line', allRoles, '智能助手'),
  page('AuditLogs', '/audit-logs', '审计日志', 'ri:shield-check-line', adminOnly, '系统管理'),
  page('Diagnostics', '/diagnostics', '系统诊断', 'ri:pulse-line', adminOnly, '系统管理'),
  page('Notifications', '/notifications', '通知中心', 'ri:notification-3-line', allRoles, '账户'),
  page('Profile', '/profile', '个人中心', 'ri:user-settings-line', allRoles, '账户')
]
