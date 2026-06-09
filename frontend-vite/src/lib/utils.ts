import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ongoing: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    draft: 'bg-gray-100 text-gray-500',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
    pending: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-blue-100 text-blue-700',
    under_review: 'bg-orange-100 text-orange-700',
    submitted: 'bg-orange-100 text-orange-700',
    teacher_confirm: 'bg-orange-100 text-orange-700',
    settled: 'bg-purple-100 text-purple-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-500';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ongoing: '进行中',
    published: '报名中',
    draft: '草稿',
    completed: '已完成',
    cancelled: '已取消',
    pending: '待处理',
    approved: '已通过',
    rejected: '已驳回',
    active: '进行中',
    under_review: '审核中',
    submitted: '已提交',
    teacher_confirm: '待确认',
    settled: '已结算',
  };
  return labels[status] || status;
}
