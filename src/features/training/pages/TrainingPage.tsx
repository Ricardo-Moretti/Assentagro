import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Plus, X, Monitor, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/useAppStore';
import {
  listarNotebooksTreinamento,
  marcarComoTreinamento,
  listarAtivos,
} from '@/data/commands';
import { useAuthStore } from '@/stores/useAuthStore';
import { BRANCHES } from '@/domain/constants';
import type { Asset, AssetFilters } from '@/domain/models';

const STATUS_COLORS: Record<string, string> = {
  IN_USE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STOCK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RETIRED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_LABEL: Record<string, string> = {
  IN_USE: 'Em Uso',
  STOCK: 'Estoque',
  MAINTENANCE: 'Manutenção',
  RETIRED: 'Baixado',
};

export const TrainingPage: React.FC = () => {
  const [trainingAssets, setTrainingAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const { viewAsset } = useAppStore();
  const userName = useAuthStore((s) => s.user?.name) ?? 'sistema';

  const loadTraining = useCallback(async () => {
    try {
      const data = await listarNotebooksTreinamento();
      setTrainingAssets(data);
    } catch (e) {
      toast('error', `Falha ao carregar: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTraining();
  }, [loadTraining]);

  const handleRemove = async (asset: Asset) => {
    try {
      await marcarComoTreinamento(asset.id, false, userName);
      toast('success', `${asset.service_tag} removido do treinamento.`);
      loadTraining();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    }
  };

  const handleAdded = () => {
    setShowAddModal(false);
    loadTraining();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-agro-100 dark:bg-agro-900/40 text-agro-700 dark:text-agro-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Equipamentos de Treinamento
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {trainingAssets.length} equipamento{trainingAssets.length !== 1 ? 's' : ''} designado{trainingAssets.length !== 1 ? 's' : ''} para treinamento
            </p>
          </div>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Adicionar
        </Button>
      </div>

      {trainingAssets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">
            Nenhum equipamento de treinamento cadastrado.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Clique em "Adicionar" para designar equipamentos existentes para treinamento.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Service Tag</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Modelo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Filial</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Colaborador</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Config</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {trainingAssets.map((asset) => (
                <tr
                  key={asset.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => viewAsset(asset.id)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">
                    {asset.service_tag}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {asset.model || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {asset.branch_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[asset.status] ?? '')}>
                      {STATUS_LABEL[asset.status] ?? asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {asset.employee_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {asset.ram_gb}GB · {asset.storage_type.replace('_', ' ')} · {asset.os}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(asset); }}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Remover do treinamento"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddTrainingModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
          existingIds={new Set(trainingAssets.map((a) => a.id))}
        />
      )}
    </div>
  );
};

// ============================================================
// Modal para adicionar notebooks ao treinamento
// ============================================================

const AddTrainingModal: React.FC<{
  onClose: () => void;
  onAdded: () => void;
  existingIds: Set<string>;
}> = ({ onClose, onAdded, existingIds }) => {
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [notebooks, setNotebooks] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const filtros: AssetFilters = {
          sort_by: 'service_tag',
          sort_dir: 'ASC',
        };
        if (branchFilter) filtros.branch_id = branchFilter;
        if (search.trim()) filtros.search = search.trim();
        const all = await listarAtivos(filtros);
        setNotebooks(all.filter((a) => !a.is_training && !existingIds.has(a.id)));
      } catch (e) {
        toast('error', `Falha: ${e}`);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search, branchFilter, existingIds, toast]);

  const handleAdd = async (asset: Asset) => {
    setAdding(asset.id);
    try {
      await marcarComoTreinamento(asset.id, true, useAuthStore.getState().user?.name ?? 'sistema');
      toast('success', `${asset.service_tag} adicionado ao treinamento.`);
      setNotebooks((prev) => prev.filter((a) => a.id !== asset.id));
      onAdded();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Adicionar Equipamento ao Treinamento
          </h3>
          <button onClick={onClose} title="Fechar" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-3 space-y-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por tag, colaborador..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
              />
            </div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              title="Filtrar por filial"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500"
            >
              <option value="">Todas as Filiais</option>
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : notebooks.length === 0 ? (
            <div className="py-8 text-center">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum equipamento disponivel para adicionar.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notebooks.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm text-slate-900 dark:text-white">
                        {asset.service_tag}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[asset.status] ?? '')}>
                        {STATUS_LABEL[asset.status] ?? asset.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {asset.model || 'Sem modelo'} · {asset.branch_name ?? '—'} · {asset.employee_name ?? 'Sem colaborador'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAdd(asset)}
                    loading={adding === asset.id}
                    disabled={adding !== null}
                  >
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
