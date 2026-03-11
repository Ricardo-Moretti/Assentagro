import { create } from 'zustand';
import type { AppView } from '@/domain/models';

interface AppState {
  currentView: AppView;
  sidebarCollapsed: boolean;
  editingAssetId: string | null;
  detailAssetId: string | null;

  navigateTo: (view: AppView) => void;
  toggleSidebar: () => void;
  editAsset: (id: string) => void;
  viewAsset: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  sidebarCollapsed: false,
  editingAssetId: null,
  detailAssetId: null,

  navigateTo: (view) =>
    set({ currentView: view, editingAssetId: null, detailAssetId: null }),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  editAsset: (id) =>
    set({ currentView: 'asset-edit', editingAssetId: id }),

  viewAsset: (id) =>
    set({ currentView: 'asset-detail', detailAssetId: id }),
}));
