import { useAuthStore } from '@/stores/useAuthStore';

export function useRBAC() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  return { isAdmin, role: user?.role ?? 'user', userName: user?.name ?? 'sistema' };
}
