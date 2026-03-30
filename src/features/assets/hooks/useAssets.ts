import { useState, useEffect, useCallback } from 'react';
import * as api from '@/data/commands';
import { useFilterStore } from '@/stores/useFilterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Asset } from '@/domain/models';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useFilterStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listarAtivos(filters);
      setAssets(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteAsset = async (id: string) => {
    const userName = useAuthStore.getState().user?.name ?? 'sistema';
    const userRole = useAuthStore.getState().user?.role ?? 'user';
    await api.excluirAtivo(id, userName, userRole);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return { assets, isLoading, error, reload: load, deleteAsset };
}
