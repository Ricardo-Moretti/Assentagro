import { useState, useEffect, useCallback } from 'react';
import { contarNotificacoes } from '@/data/commands';
import type { NotificationCounts } from '@/domain/models';

const INTERVAL_MS = 60_000; // 60 segundos

export function useNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({
    maintenance_open: 0,
    aging_count: 0,
    warranty_expiring: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await contarNotificacoes();
      setCounts(data);
    } catch {
      // silencia erros de contagem
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return counts;
}
