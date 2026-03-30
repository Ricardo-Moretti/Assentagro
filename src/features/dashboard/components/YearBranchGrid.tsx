import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Eye, ChevronDown, ChevronUp, GraduationCap, SlidersHorizontal, X, List } from 'lucide-react';
import { listarAtivos } from '@/data/commands';
import { BRANCHES, ASSET_STATUSES, EQUIPMENT_TYPE_LABEL } from '@/domain/constants';
import { cn } from '@/lib/utils';
import { FilteredAssetsModal } from './FilteredAssetsModal';
import type { Asset, AssetStatus } from '@/domain/models';

interface CellSelection {
  branchId: string;
  year: string;
}

type FilterStatus = 'ALL' | AssetStatus | 'TRAINING';
type FilterType   = 'ALL' | 'NOTEBOOK' | 'DESKTOP';

interface Props {
  onSelect?: (id: string) => void;
}

export const YearBranchGrid: React.FC<Props> = ({ onSelect }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CellSelection | null>(null);

  // Filtros
  const [filterType, setFilterType]       = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('ALL');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo]   = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [showAllModal, setShowAllModal]   = useState(false);

  useEffect(() => {
    listarAtivos()
      .then(setAssets)
      .finally(() => setLoading(false));
  }, []);

  // Anos disponíveis (para os selects de faixa)
  const availableYears = useMemo(() => {
    const s = new Set<number>();
    for (const a of assets) {
      if (a.year) s.add(a.year);
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [assets]);

  // Activos filtrados
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filterType !== 'ALL' && a.equipment_type !== filterType) return false;

      if (filterStatus === 'TRAINING') {
        if (!a.is_training) return false;
      } else if (filterStatus !== 'ALL') {
        if (a.status !== filterStatus) return false;
      }

      if (filterYearFrom && a.year !== null) {
        if (a.year < Number(filterYearFrom)) return false;
      }
      if (filterYearTo && a.year !== null) {
        if (a.year > Number(filterYearTo)) return false;
      }

      return true;
    });
  }, [assets, filterType, filterStatus, filterYearFrom, filterYearTo]);

  const hasFilters = filterType !== 'ALL' || filterStatus !== 'ALL' || filterYearFrom !== '' || filterYearTo !== '';

  const clearFilters = () => {
    setFilterType('ALL');
    setFilterStatus('ALL');
    setFilterYearFrom('');
    setFilterYearTo('');
    setSelected(null);
  };

  // Build matrix data from filtered assets
  const { years, matrix, branchTotals, yearTotals } = useMemo(() => {
    const yearSet = new Set<string>();
    const map = new Map<string, Asset[]>();

    for (const a of filteredAssets) {
      const yr = a.year ? String(a.year) : 'S/Ano';
      yearSet.add(yr);
      const key = `${a.branch_id}|${yr}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }

    const sortedYears = Array.from(yearSet).sort((a, b) => {
      if (a === 'S/Ano') return 1;
      if (b === 'S/Ano') return -1;
      return Number(a) - Number(b);
    });

    const bTotals: Record<string, number> = {};
    for (const br of BRANCHES) {
      bTotals[br.id] = 0;
      for (const yr of sortedYears) {
        bTotals[br.id] += (map.get(`${br.id}|${yr}`) || []).length;
      }
    }

    const yTotals: Record<string, number> = {};
    for (const yr of sortedYears) {
      yTotals[yr] = 0;
      for (const br of BRANCHES) {
        yTotals[yr] += (map.get(`${br.id}|${yr}`) || []).length;
      }
    }

    return { years: sortedYears, matrix: map, branchTotals: bTotals, yearTotals: yTotals };
  }, [filteredAssets]);

  const selectedAssets = useMemo(() => {
    if (!selected) return [];
    return matrix.get(`${selected.branchId}|${selected.year}`) || [];
  }, [selected, matrix]);

  const handleCellClick = (branchId: string, year: string) => {
    const cellAssets = matrix.get(`${branchId}|${year}`) || [];
    if (cellAssets.length === 0) return;
    if (cellAssets.length === 1) {
      onSelect?.(cellAssets[0].id);
      return;
    }
    if (selected?.branchId === branchId && selected?.year === year) {
      setSelected(null);
    } else {
      setSelected({ branchId, year });
    }
  };

  const getStatusStyle = (status: string) => {
    const s = ASSET_STATUSES.find((x) => x.value === status);
    return s ? `${s.color} ${s.bgColor}` : '';
  };

  const getStatusLabel = (status: string) => {
    return ASSET_STATUSES.find((x) => x.value === status)?.label ?? status;
  };

  const selectedBranchName = selected
    ? BRANCHES.find((b) => b.id === selected.branchId)?.name ?? ''
    : '';

  const activeBranches = BRANCHES.filter((b) => branchTotals[b.id] > 0);

  const selectClass = cn(
    'px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700',
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-indigo-600 shrink-0" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Ano de Máquina por Filial
        </h3>
        {hasFilters && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            {filteredAssets.length} de {assets.length}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <>
              <button
                type="button"
                onClick={() => setShowAllModal(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                <List className="h-3.5 w-3.5" />
                Ver todas as máquinas
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
              showFilters
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-fade-in">
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value as FilterType); setSelected(null); }}
              title="Filtrar por tipo"
              className={selectClass}
            >
              <option value="ALL">Todos</option>
              <option value="NOTEBOOK">Notebook</option>
              <option value="DESKTOP">Desktop</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as FilterStatus); setSelected(null); }}
              title="Filtrar por status"
              className={selectClass}
            >
              <option value="ALL">Todos</option>
              <option value="IN_USE">Em Uso</option>
              <option value="STOCK">Estoque</option>
              <option value="MAINTENANCE">Manutenção</option>
              <option value="RETIRED">Baixado</option>
              <option value="TRAINING">Treinamento</option>
            </select>
          </div>

          {/* Ano de */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Ano de
            </label>
            <select
              value={filterYearFrom}
              onChange={(e) => { setFilterYearFrom(e.target.value); setSelected(null); }}
              title="Ano inicial"
              className={selectClass}
            >
              <option value="">—</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Ano até */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Ano até
            </label>
            <select
              value={filterYearTo}
              onChange={(e) => { setFilterYearTo(e.target.value); setSelected(null); }}
              title="Ano final"
              className={selectClass}
            >
              <option value="">—</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Carregando...</p>}

      {!loading && years.length === 0 && (
        <p className="text-sm text-slate-500 py-4 text-center">
          {hasFilters ? 'Nenhum equipamento encontrado para os filtros selecionados.' : 'Nenhum equipamento cadastrado.'}
        </p>
      )}

      {!loading && years.length > 0 && (
        <>
          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 pr-3 sticky left-0 bg-white dark:bg-slate-900 z-10">
                    Filial
                  </th>
                  {years.map((yr) => (
                    <th
                      key={yr}
                      className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 px-2 min-w-[52px]"
                    >
                      {yr}
                    </th>
                  ))}
                  <th className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300 pb-2 px-2 min-w-[52px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeBranches.map((branch) => (
                  <tr key={branch.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 z-10">
                      {branch.name}
                    </td>
                    {years.map((yr) => {
                      const count = (matrix.get(`${branch.id}|${yr}`) || []).length;
                      const isSelected = selected?.branchId === branch.id && selected?.year === yr;
                      return (
                        <td key={yr} className="py-1.5 px-1 text-center">
                          {count > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleCellClick(branch.id, yr)}
                              className={cn(
                                'inline-flex items-center justify-center w-9 h-7 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer',
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-md scale-110'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
                              )}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {branchTotals[branch.id]}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                  <td className="py-2 pr-3 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">
                    Total
                  </td>
                  {years.map((yr) => (
                    <td key={yr} className="py-2 px-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {yearTotals[yr]}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    {filteredAssets.length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expanded detail panel */}
          {selected && selectedAssets.length > 0 && (
            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {selectedBranchName} — {selected.year}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({selectedAssets.length} equipamento{selectedAssets.length > 1 ? 's' : ''})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Fechar
                </button>
              </div>

              <div className="grid gap-2">
                {selectedAssets.map((asset) => {
                  const badgeClass = asset.is_training
                    ? 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30'
                    : getStatusStyle(asset.status);
                  const badgeLabel = asset.is_training ? 'Treinamento' : getStatusLabel(asset.status);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => onSelect?.(asset.id)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors group"
                    >
                      <Eye className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {asset.service_tag}
                          </span>
                          {asset.is_training && (
                            <GraduationCap className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {EQUIPMENT_TYPE_LABEL[asset.equipment_type]}
                          </span>
                          {asset.model && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              · {asset.model}
                            </span>
                          )}
                        </div>
                        {asset.employee_name && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                            {asset.employee_name}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 -rotate-90 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {/* Modal com todas as máquinas filtradas */}
      {showAllModal && (
        <FilteredAssetsModal
          assets={filteredAssets}
          title={`Equipamentos Filtrados${filterType !== 'ALL' ? ` - ${EQUIPMENT_TYPE_LABEL[filterType as 'NOTEBOOK' | 'DESKTOP']}` : ''}${filterStatus !== 'ALL' ? ` - ${filterStatus === 'TRAINING' ? 'Treinamento' : (ASSET_STATUSES.find((s) => s.value === filterStatus)?.label ?? filterStatus)}` : ''}${filterYearFrom ? ` - De ${filterYearFrom}` : ''}${filterYearTo ? ` até ${filterYearTo}` : ''}`}
          onClose={() => setShowAllModal(false)}
          onSelect={(id) => {
            setShowAllModal(false);
            onSelect?.(id);
          }}
        />
      )}
    </div>
  );
};
