/**
 * 顶部栏功能配置
 *
 * 统一管理顶部栏各个功能模块的启用状态。
 * 通过修改此配置文件可以快速启用或禁用顶部栏的功能按钮。
 *
 * @module config/headerBar
 * @author Art Design Pro Team
 */

import { HeaderBarFeatureConfig } from '@/types'

/**
 * 顶部栏功能配置对象
 */
export const headerBarConfig: HeaderBarFeatureConfig = {
  menuButton: {
    enabled: true,
    description: '控制左侧菜单的展开/收起按钮'
  },
  refreshButton: {
    enabled: true,
    description: '页面刷新按钮'
  },
  fastEnter: {
    enabled: false,
    description: '模板快速入口包含非 SSGL 页面，业务系统不展示'
  },
  breadcrumb: {
    enabled: true,
    description: '面包屑导航，显示当前页面路径'
  },
  globalSearch: {
    enabled: true,
    description: '全局搜索功能，支持快捷键 Ctrl+K 或 Cmd+K'
  },
  fullscreen: {
    enabled: true,
    description: '全屏切换功能'
  },
  notification: {
    enabled: true,
    description: '通知中心，显示系统通知和消息'
  },
  chat: {
    enabled: false,
    description: '由 SSGL AI 助手页面承载'
  },
  language: {
    enabled: false,
    description: 'SSGL 当前只启用中文界面'
  },
  settings: {
    enabled: false,
    description: 'SSGL 不暴露模板设置面板，避免空弹层和无业务意义配置'
  },
  themeToggle: {
    enabled: true,
    description: '主题切换功能（明暗主题）'
  }
}

export default headerBarConfig
