import React, { useState, useEffect } from 'react';
import { AssetForm } from '../components/AssetForm';
import { LoadingState } from '@/components/ui/Spinner';
import { useAppStore } from '@/stores/useAppStore';
import { obterAtivo } from '@/data/commands';
import type { Asset } from '@/domain/models';

export const AssetEditPage: React.FC = () => {
  const { editingAssetId } = useAppStore();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!editingAssetId) return;
    setLoading(true);
    obterAtivo(editingAssetId)
      .then(setAsset)
      .finally(() => setLoading(false));
  }, [editingAssetId]);

  if (loading) return <LoadingState message="Carregando ativo..." />;
  if (!asset) return null;

  return (
    <div className="animate-fade-in">
      <AssetForm initial={asset} />
    </div>
  );
};
