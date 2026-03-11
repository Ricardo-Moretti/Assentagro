import React, { useState, useCallback } from 'react';
import { AssetFilters } from '../components/AssetFilters';
import { AssetTable } from '../components/AssetTable';
import { BatchActionBar } from '../components/BatchActionBar';
import { LoadingState } from '@/components/ui/Spinner';
import { useAssets } from '../hooks/useAssets';

export const AssetsListPage: React.FC = () => {
  const { assets, isLoading, deleteAsset, reload } = useAssets();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === assets.length ? new Set() : new Set(assets.map((a) => a.id)),
    );
  }, [assets]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return (
    <div className="space-y-4">
      <AssetFilters />
      {isLoading ? (
        <LoadingState message="Carregando equipamentos..." />
      ) : (
        <AssetTable
          assets={assets}
          onDelete={deleteAsset}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
        />
      )}
      <BatchActionBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onClear={clearSelection}
        onDone={reload}
      />
    </div>
  );
};
