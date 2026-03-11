import { useState, useEffect, useCallback } from 'react';
import {
  listarMovimentos,
  listarAtivosEmEstoque,
  listarAtivosEmUso,
  atribuirEquipamento,
  devolverEquipamento,
  trocarEquipamentos,
} from '@/data/commands';
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
    const result = await atribuirEquipamento(dto);
    await refresh();
    return result;
  };

  const returnAsset = async (dto: ReturnDto) => {
    const result = await devolverEquipamento(dto);
    await refresh();
    return result;
  };

  const swap = async (dto: SwapDto) => {
    const result = await trocarEquipamentos(dto);
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
