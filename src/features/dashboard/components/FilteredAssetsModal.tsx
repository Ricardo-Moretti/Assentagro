import React, { useMemo, useState } from 'react';
import { X, Download, Search, SortAsc, SortDesc, Monitor, Laptop } from 'lucide-react';
import { BRANCHES, ASSET_STATUSES, EQUIPMENT_TYPE_LABEL } from '@/domain/constants';
import { cn } from '@/lib/utils';
import type { Asset } from '@/domain/models';

interface Props {
  assets: Asset[];
  title: string;
  onClose: () => void;
  onSelect?: (id: string) => void;
}

const branchName = (id: string) => BRANCHES.find((b) => b.id === id)?.name ?? id;
const statusInfo = (status: string) => ASSET_STATUSES.find((s) => s.value === status);

export const FilteredAssetsModal: React.FC<Props> = ({ assets, title, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'year' | 'branch' | 'status' | 'type' | 'employee'>('year');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    let list = [...assets];

    // search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.service_tag.toLowerCase().includes(q) ||
          (a.model ?? '').toLowerCase().includes(q) ||
          (a.employee_name ?? '').toLowerCase().includes(q) ||
          (a.cpu ?? '').toLowerCase().includes(q) ||
          branchName(a.branch_id).toLowerCase().includes(q),
      );
    }

    // sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'year':
          cmp = (a.year ?? 9999) - (b.year ?? 9999);
          break;
        case 'branch':
          cmp = branchName(a.branch_id).localeCompare(branchName(b.branch_id));
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'type':
          cmp = a.equipment_type.localeCompare(b.equipment_type);
          break;
        case 'employee':
          cmp = (a.employee_name ?? '').localeCompare(b.employee_name ?? '');
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [assets, search, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortIcon = sortAsc ? SortAsc : SortDesc;

  const handleExportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const rows = sorted.map((a) => ({
      'Service Tag': a.service_tag,
      Tipo: EQUIPMENT_TYPE_LABEL[a.equipment_type],
      Modelo: a.model ?? '',
      Ano: a.year ?? '',
      Filial: branchName(a.branch_id),
      Status: a.is_training ? 'Treinamento' : (statusInfo(a.status)?.label ?? a.status),
      Colaborador: a.employee_name ?? '',
      CPU: a.cpu ?? '',
      'RAM (GB)': a.ram_gb,
      'Armazenamento (GB)': a.storage_capacity_gb,
      SO: a.os ?? '',
    }));
    const ws = utils.json_to_sheet(rows);

    // auto-width
    const colWidths = Object.keys(rows[0] || {}).map((key) => {
      const maxLen = Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? '').length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Equipamentos');
    writeFile(wb, `equipamentos_filtrados_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStatusBadge = (asset: Asset) => {
    if (asset.is_training) {
      return { label: 'Treinamento', cls: 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30' };
    }
    const s = statusInfo(asset.status);
    return { label: s?.label ?? asset.status, cls: s ? `${s.color} ${s.bgColor}` : '' };
  };

  const thClass = (field: typeof sortField) =>
    cn(
      'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors',
      'hover:text-indigo-600 dark:hover:text-indigo-400',
      sortField === field ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400',
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[95vw] max-w-[1200px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {sorted.length} equipamento{sorted.length !== 1 ? 's' : ''} encontrado{sorted.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por tag, modelo, colaborador, filial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-2">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-8">
                  #
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Service Tag
                </th>
                <th className={thClass('type')} onClick={() => handleSort('type')}>
                  <span className="flex items-center gap-1">
                    Tipo {sortField === 'type' && <SortIcon className="h-3 w-3" />}
                  </span>
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Modelo
                </th>
                <th className={thClass('year')} onClick={() => handleSort('year')}>
                  <span className="flex items-center gap-1">
                    Ano {sortField === 'year' && <SortIcon className="h-3 w-3" />}
                  </span>
                </th>
                <th className={thClass('branch')} onClick={() => handleSort('branch')}>
                  <span className="flex items-center gap-1">
                    Filial {sortField === 'branch' && <SortIcon className="h-3 w-3" />}
                  </span>
                </th>
                <th className={thClass('status')} onClick={() => handleSort('status')}>
                  <span className="flex items-center gap-1">
                    Status {sortField === 'status' && <SortIcon className="h-3 w-3" />}
                  </span>
                </th>
                <th className={thClass('employee')} onClick={() => handleSort('employee')}>
                  <span className="flex items-center gap-1">
                    Colaborador {sortField === 'employee' && <SortIcon className="h-3 w-3" />}
                  </span>
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  CPU
                </th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  RAM
                </th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Disco
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((asset, idx) => {
                const badge = getStatusBadge(asset);
                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelect?.(asset.id)}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {asset.equipment_type === 'NOTEBOOK' ? (
                          <Laptop className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {asset.service_tag}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      {EQUIPMENT_TYPE_LABEL[asset.equipment_type]}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
                      {asset.model ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {asset.year ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {branchName(asset.branch_id)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                      {asset.employee_name ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                      {asset.cpu ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-center text-slate-600 dark:text-slate-400">
                      {asset.ram_gb}GB
                    </td>
                    <td className="px-3 py-2 text-xs text-center text-slate-600 dark:text-slate-400">
                      {asset.storage_capacity_gb}GB
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-slate-500">
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Total: <strong className="text-slate-700 dark:text-slate-300">{sorted.length}</strong></span>
          <span>Notebooks: <strong className="text-slate-700 dark:text-slate-300">{sorted.filter((a) => a.equipment_type === 'NOTEBOOK').length}</strong></span>
          <span>Desktops: <strong className="text-slate-700 dark:text-slate-300">{sorted.filter((a) => a.equipment_type === 'DESKTOP').length}</strong></span>
          <span className="ml-auto text-[10px]">Clique em uma linha para abrir o equipamento</span>
        </div>
      </div>
    </div>
  );
};
