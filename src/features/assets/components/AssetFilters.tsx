import React, { useEffect, useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useFilterStore } from '@/stores/useFilterStore';
import {
  BRANCHES,
  EQUIPMENT_TYPES,
  ASSET_STATUSES,
  STORAGE_TYPES,
  RAM_OPTIONS,
  OS_OPTIONS,
} from '@/domain/constants';
import type { AssetStatus, EquipmentType, StorageType } from '@/domain/models';

export const AssetFilters: React.FC = () => {
  const { filters, setFilter, resetFilters } = useFilterStore();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce da busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter('search', searchInput || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilter]);

  const hasActiveFilters =
    filters.branch_id ||
    filters.equipment_type ||
    filters.status ||
    filters.ram_gb ||
    filters.storage_type ||
    filters.os;

  return (
    <div className="space-y-3">
      {/* Barra de busca + toggle filtros */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por Service Tag, Colaborador, Processador, SO..."
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-agro-500 focus:border-agro-500 placeholder:text-slate-400"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="sm"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-agro-600 text-white text-[10px] font-bold">
              !
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Limpar
          </Button>
        )}
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Select
            placeholder="Filial"
            value={filters.branch_id ?? ''}
            onChange={(e) => setFilter('branch_id', e.target.value || undefined)}
            options={BRANCHES.map((b) => ({ value: b.id, label: b.name }))}
          />
          <Select
            placeholder="Tipo"
            value={filters.equipment_type ?? ''}
            onChange={(e) => setFilter('equipment_type', (e.target.value || undefined) as EquipmentType | undefined)}
            options={EQUIPMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Select
            placeholder="Status"
            value={filters.status ?? ''}
            onChange={(e) => setFilter('status', (e.target.value || undefined) as AssetStatus | undefined)}
            options={ASSET_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Select
            placeholder="RAM"
            value={filters.ram_gb ? String(filters.ram_gb) : ''}
            onChange={(e) => setFilter('ram_gb', e.target.value ? parseInt(e.target.value) : undefined)}
            options={RAM_OPTIONS.map((r) => ({ value: String(r), label: `${r} GB` }))}
          />
          <Select
            placeholder="Armazenamento"
            value={filters.storage_type ?? ''}
            onChange={(e) => setFilter('storage_type', (e.target.value || undefined) as StorageType | undefined)}
            options={STORAGE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Select
            placeholder="SO"
            value={filters.os ?? ''}
            onChange={(e) => setFilter('os', e.target.value || undefined)}
            options={OS_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>
      )}
    </div>
  );
};
