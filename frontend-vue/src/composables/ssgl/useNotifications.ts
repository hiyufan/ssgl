import { notificationsAPI } from '@/api/ssgl'
import { workflowsAPI } from '@/api/ssgl'

export function useNotifications() {
  const unreadCount = ref(0)
  const pendingCount = ref(0)

  async function fetchUnreadCount() {
    try {
      const data = await notificationsAPI.getUnreadCount()
      unreadCount.value = data.unread_count
    } catch {
      // silently fail
    }
  }

  async function fetchPendingCount() {
    try {
      const data = await workflowsAPI.list({ tab: 'pending' })
      pendingCount.value = data.total
    } catch {
      // silently fail
    }
  }

  async function refresh() {
    await Promise.all([fetchUnreadCount(), fetchPendingCount()])
  }

  return { unreadCount, pendingCount, refresh, fetchUnreadCount, fetchPendingCount }
}
