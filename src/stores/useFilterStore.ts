import { create } from 'zustand';
import type { AssetFilters } from '@/domain/models';

interface FilterState {
  filters: AssetFilters;
  setFilter: <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => void;
  setFilters: (filters: Partial<AssetFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: AssetFilters = {
  sort_by: 'created_at',
  sort_dir: 'DESC',
};

export const useFilterStore = create<FilterState>((set) => ({
  filters: { ...DEFAULT_FILTERS },

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value || undefined } })),

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
}));
