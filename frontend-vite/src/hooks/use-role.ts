import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types';

export type Role = User['role'];

/**
 * The authenticated user's role — the single source of truth for role-based UI.
 * Falls back to the least-privileged role until the user profile is loaded.
 */
export function useRole(): Role {
  return useAuthStore((s) => s.user?.role ?? 'student');
}
