import { useState, useEffect, useCallback } from 'react';
import { obterDadosDashboard } from '@/data/commands';
import type { DashboardData } from '@/domain/models';

export function useDashboardData(branchId?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await obterDadosDashboard(branchId);
      setData(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, reload: load };
}
