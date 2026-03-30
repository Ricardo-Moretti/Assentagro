import { useState, useEffect, useCallback } from 'react';
import {
  listarMovimentos,
  listarAtivosEmEstoque,
  listarAtivosEmUso,
  atribuirEquipamento,
  devolverEquipamento,
  trocarEquipamentos,
} from '@/data/commands';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Movement, Asset, AssignDto, ReturnDto, SwapDto } from '@/domain/models';

export function useMovements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  const [inUseAssets, setInUseAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [movs, stock, inUse] = await Promise.all([
        listarMovimentos(200),
        listarAtivosEmEstoque(),
        listarAtivosEmUso(),
      ]);
      setMovements(movs);
      setStockAssets(stock);
      setInUseAssets(inUse);
    } catch {
      // handled by caller
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const assign = async (dto: AssignDto) => {
    const userName = useAuthStore.getState().user?.name ?? 'sistema';
    const result = await atribuirEquipamento(dto, userName);
    await refresh();
    return result;
  };

  const returnAsset = async (dto: ReturnDto) => {
    const userName = useAuthStore.getState().user?.name ?? 'sistema';
    const result = await devolverEquipamento(dto, userName);
    await refresh();
    return result;
  };

  const swap = async (dto: SwapDto) => {
    const userName = useAuthStore.getState().user?.name ?? 'sistema';
    const result = await trocarEquipamentos(dto, userName);
    await refresh();
    return result;
  };

  return {
    movements,
    stockAssets,
    inUseAssets,
    loading,
    refresh,
    assign,
    returnAsset,
    swap,
  };
}
