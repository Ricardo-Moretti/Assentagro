import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle
const CHECK_INTERVAL_MS = 60 * 1000;    // check every minute

export function useSessionTimeout() {
  const logout = useAuthStore((s) => s.logout);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const resetIdle = () => { lastActivity.current = Date.now(); };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);

    const interval = setInterval(() => {
      // Idle timeout
      const idle = Date.now() - lastActivity.current;
      if (idle > IDLE_TIMEOUT_MS) {
        logout();
        return;
      }

      // Absolute session timeout
      const sessionAt = localStorage.getItem('assetagro_session_at');
      if (sessionAt) {
        const elapsed = Date.now() - parseInt(sessionAt, 10);
        if (elapsed > 8 * 60 * 60 * 1000) {
          logout();
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      clearInterval(interval);
    };
  }, [logout]);
}
