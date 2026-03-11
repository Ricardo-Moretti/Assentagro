import React from 'react';
import { cn } from '@/lib/utils';
import type { BranchCount } from '@/domain/models';

interface BranchRankingProps {
  data: BranchCount[];
  onBranchClick: (branchId: string) => void;
}

export const BranchRanking: React.FC<BranchRankingProps> = ({ data, onBranchClick }) => {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
        Equipamentos por Filial
      </h3>
      <div className="space-y-2">
        {data.map((branch) => (
          <button
            key={branch.branch_id}
            onClick={() => onBranchClick(branch.branch_id)}
            className="w-full group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
          >
            <span className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {branch.branch_name}
            </span>
            <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
              {/* Barra Em Uso */}
              <div
                className="absolute inset-y-0 left-0 bg-green-500 rounded-l-full transition-all"
                style={{ width: `${(branch.in_use / maxTotal) * 100}%` }}
              />
              {/* Barra Estoque */}
              <div
                className="absolute inset-y-0 bg-blue-500 transition-all"
                style={{
                  left: `${(branch.in_use / maxTotal) * 100}%`,
                  width: `${(branch.stock / maxTotal) * 100}%`,
                }}
              />
              {/* Barra Manutenção */}
              <div
                className="absolute inset-y-0 bg-amber-500 transition-all"
                style={{
                  left: `${((branch.in_use + branch.stock) / maxTotal) * 100}%`,
                  width: `${(branch.maintenance / maxTotal) * 100}%`,
                }}
              />
              {/* Barra Baixado */}
              <div
                className="absolute inset-y-0 bg-slate-400 transition-all rounded-r-full"
                style={{
                  left: `${((branch.in_use + branch.stock + branch.maintenance) / maxTotal) * 100}%`,
                  width: `${(branch.retired / maxTotal) * 100}%`,
                }}
              />
            </div>
            <span
              className={cn(
                'w-8 text-right text-sm font-bold',
                branch.total > 0
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-400',
              )}
            >
              {branch.total}
            </span>
          </button>
        ))}
      </div>
      {/* Legenda */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Em Uso</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Estoque</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> Manutenção</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-400" /> Baixado</span>
      </div>
    </div>
  );
};
