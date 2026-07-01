import { useState, useEffect } from 'react';
import { notificationsAPI, workflowsAPI } from '@/services/api';

let globalUnreadCount = 0;
let globalPendingCount = 0;
let listeners: Set<(unread: number, pending: number) => void> = new Set();
let intervalId: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (intervalId) return;
  const fetch = async () => {
    try {
      const [notifRes, wfRes] = await Promise.all([
        notificationsAPI.getUnreadCount(),
        workflowsAPI.list({ tab: 'pending' }),
      ]);
      globalUnreadCount = notifRes.unread_count || 0;
      globalPendingCount = (wfRes.workflows || []).length;
      listeners.forEach(fn => fn(globalUnreadCount, globalPendingCount));
    } catch { /* ignore */ }
  };
  fetch();
  intervalId = setInterval(fetch, 30000);
}

export function useNotifications() {
  const [state, setState] = useState({ unread: globalUnreadCount, pending: globalPendingCount });
  useEffect(() => {
    const listener = (unread: number, pending: number) => setState({ unread, pending });
    listeners.add(listener);
    startPolling();
    return () => { listeners.delete(listener); };
  }, []);
  return state;
}
