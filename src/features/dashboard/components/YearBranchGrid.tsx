import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { listarAtivos } from '@/data/commands';
import { BRANCHES, ASSET_STATUSES, EQUIPMENT_TYPE_LABEL } from '@/domain/constants';
import { useAppStore } from '@/stores/useAppStore';
import type { Asset } from '@/domain/models';

interface CellSelection {
  branchId: string;
  year: string;
}

export const YearBranchGrid: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CellSelection | null>(null);
  const { viewAsset } = useAppStore();

  useEffect(() => {
    listarAtivos()
      .then(setAssets)
      .finally(() => setLoading(false));
  }, []);

  // Build matrix data
  const { years, matrix, branchTotals, yearTotals } = useMemo(() => {
    const yearSet = new Set<string>();
    const map = new Map<string, Asset[]>(); // "branchId|year" -> assets

    for (const a of assets) {
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
  }, [assets]);

  // Assets for the selected cell
  const selectedAssets = useMemo(() => {
    if (!selected) return [];
    return matrix.get(`${selected.branchId}|${selected.year}`) || [];
  }, [selected, matrix]);

  const handleCellClick = (branchId: string, year: string) => {
    const key = `${branchId}|${year}`;
    const cellAssets = matrix.get(key) || [];
    if (cellAssets.length === 0) return;

    // If only 1 asset, navigate directly
    if (cellAssets.length === 1) {
      viewAsset(cellAssets[0].id);
      return;
    }

    // Toggle selection
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ano de Máquina por Filial
          </h3>
        </div>
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ano de Máquina por Filial
          </h3>
        </div>
        <p className="text-sm text-slate-500">Nenhum equipamento cadastrado.</p>
      </div>
    );
  }

  // Filter branches that have at least one asset
  const activeBranches = BRANCHES.filter((b) => branchTotals[b.id] > 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Ano de Máquina por Filial
        </h3>
        <span className="text-xs text-slate-400 ml-auto">
          Clique em uma célula para ver os equipamentos
        </span>
      </div>

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
              <tr
                key={branch.id}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="py-1.5 pr-3 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 z-10">
                  {branch.name}
                </td>
                {years.map((yr) => {
                  const count = (matrix.get(`${branch.id}|${yr}`) || []).length;
                  const isSelected =
                    selected?.branchId === branch.id && selected?.year === yr;
                  return (
                    <td key={yr} className="py-1.5 px-1 text-center">
                      {count > 0 ? (
                        <button
                          onClick={() => handleCellClick(branch.id, yr)}
                          className={`
                            inline-flex items-center justify-center w-9 h-7 rounded-md text-xs font-semibold
                            transition-all duration-150
                            ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md scale-110'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                            }
                            cursor-pointer
                          `}
                        >
                          {count}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-700">
                          —
                        </span>
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
                <td
                  key={yr}
                  className="py-2 px-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {yearTotals[yr]}
                </td>
              ))}
              <td className="py-2 px-2 text-center text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                {assets.length}
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
              onClick={() => setSelected(null)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Fechar
            </button>
          </div>

          <div className="grid gap-2">
            {selectedAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => viewAsset(asset.id)}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors group"
              >
                <Eye className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {asset.service_tag}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {EQUIPMENT_TYPE_LABEL[asset.equipment_type]}
                    </span>
                    {asset.model && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        · {asset.model}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {asset.employee_name && (
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {asset.employee_name}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getStatusStyle(asset.status)}`}
                >
                  {getStatusLabel(asset.status)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 -rotate-90 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
