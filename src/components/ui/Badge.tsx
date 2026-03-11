import React from 'react';
import { cn } from '@/lib/utils';
import { ASSET_STATUSES, EQUIPMENT_TYPE_LABEL, STORAGE_TYPE_LABEL } from '@/domain/constants';
import type { AssetStatus, EquipmentType, StorageType } from '@/domain/models';

// Badge de status do ativo
export const StatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  const def = ASSET_STATUSES.find((s) => s.value === status);
  if (!def) return <span>{status}</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        def.bgColor,
        def.color,
      )}
    >
      {def.label}
    </span>
  );
};

// Badge de tipo de equipamento
export const TypeBadge: React.FC<{ type: EquipmentType }> = ({ type: equipType }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {EQUIPMENT_TYPE_LABEL[equipType]}
    </span>
  );
};

// Badge de tipo de armazenamento
export const StorageBadge: React.FC<{ type: StorageType }> = ({ type: storageType }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
      {STORAGE_TYPE_LABEL[storageType]}
    </span>
  );
};
