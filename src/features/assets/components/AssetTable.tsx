import React, { useState, useMemo } from 'react';
import { Eye, Pencil, Trash2, ArrowUpDown, Monitor, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, TypeBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/useAppStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { formatStorage } from '@/lib/utils';
import type { Asset } from '@/domain/models';

interface AssetTableProps {
  assets: Asset[];
  onDelete: (id: string) => Promise<void>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
}

const PER_PAGE = 10;

export const AssetTable: React.FC<AssetTableProps> = ({ assets, onDelete, selectedIds, onToggleSelect, onToggleAll }) => {
  const hasBatch = !!selectedIds && !!onToggleSelect && !!onToggleAll;
  const { editAsset, viewAsset } = useAppStore();
  const { filters, setFilter } = useFilterStore();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  // Reset to page 1 when assets change (filters, delete, etc.)
  const totalPages = Math.max(1, Math.ceil(assets.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const paginatedAssets = useMemo(
    () => assets.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [assets, safePage],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      toast('success', `Ativo ${deleteTarget.service_tag} excluído.`);
    } catch (e) {
      toast('error', `Falha ao excluir: ${e}`);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleSort = (col: string) => {
    if (filters.sort_by === col) {
      setFilter('sort_dir', filters.sort_dir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setFilter('sort_by', col);
      setFilter('sort_dir', 'ASC');
    }
  };

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Monitor className="h-10 w-10" />}
        title="Nenhum equipamento encontrado"
        description="Tente ajustar os filtros ou cadastre um novo ativo."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              {hasBatch && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedAssets.length}
                    onChange={onToggleAll}
                    title="Selecionar todos"
                    className="rounded border-slate-300"
                  />
                </th>
              )}
              <SortHeader label="Service Tag" col="service_tag" current={filters.sort_by} dir={filters.sort_dir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Tipo</th>
              <SortHeader label="Status" col="status" current={filters.sort_by} dir={filters.sort_dir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Filial</th>
              <SortHeader label="Colaborador" col="employee_name" current={filters.sort_by} dir={filters.sort_dir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">RAM</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Armazen.</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">SO</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedAssets.map((asset) => (
              <tr
                key={asset.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
              >
                {hasBatch && (
                <td className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(asset.id)}
                    onChange={() => onToggleSelect(asset.id)}
                    title={`Selecionar ${asset.service_tag}`}
                    className="rounded border-slate-300"
                  />
                </td>
              )}
              <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                  {asset.service_tag}
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={asset.equipment_type} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={asset.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {asset.branch_name}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {asset.employee_name || (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {asset.ram_gb} GB
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {formatStorage(asset.storage_capacity_gb)}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {asset.os}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <ActionButton
                      icon={<Eye className="h-4 w-4" />}
                      title="Visualizar"
                      onClick={() => viewAsset(asset.id)}
                    />
                    <ActionButton
                      icon={<Pencil className="h-4 w-4" />}
                      title="Editar"
                      onClick={() => editAsset(asset.id)}
                    />
                    <ActionButton
                      icon={<Trash2 className="h-4 w-4" />}
                      title="Excluir"
                      onClick={() => setDeleteTarget(asset)}
                      danger
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mt-3">
        <span>
          {assets.length} equipamento(s) — Página {safePage} de {totalPages}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PageBtn
              icon={<ChevronsLeft className="h-4 w-4" />}
              title="Primeira página"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
            />
            <PageBtn
              icon={<ChevronLeft className="h-4 w-4" />}
              title="Página anterior"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors',
                  p === safePage
                    ? 'bg-agro-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {p}
              </button>
            ))}
            <PageBtn
              icon={<ChevronRight className="h-4 w-4" />}
              title="Próxima página"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            />
            <PageBtn
              icon={<ChevronsRight className="h-4 w-4" />}
              title="Última página"
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
            />
          </div>
        )}
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Ativo"
        message={`Tem certeza que deseja excluir o ativo "${deleteTarget?.service_tag}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
      />
    </>
  );
};

// Header de coluna com ordenação
const SortHeader: React.FC<{
  label: string;
  col: string;
  current?: string;
  dir?: string;
  onSort: (col: string) => void;
}> = ({ label, col, current, dir, onSort }) => (
  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
    <button
      onClick={() => onSort(col)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors',
        current === col && 'text-agro-600 dark:text-agro-400',
      )}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
      {current === col && (
        <span className="text-[10px]">{dir === 'ASC' ? '↑' : '↓'}</span>
      )}
    </button>
  </th>
);

// Botão de ação na tabela
const ActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, title, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'p-1.5 rounded-lg transition-colors',
      danger
        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800',
    )}
  >
    {icon}
  </button>
);

// Botão de paginação
const PageBtn: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled: boolean;
}> = ({ icon, title, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={cn(
      'p-1.5 rounded-lg transition-colors',
      disabled
        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800',
    )}
  >
    {icon}
  </button>
);
