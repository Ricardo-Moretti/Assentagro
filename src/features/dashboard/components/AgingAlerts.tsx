import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, GraduationCap, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { listarAtivos } from '@/data/commands';
import { BRANCHES, ASSET_STATUSES } from '@/domain/constants';
import { cn } from '@/lib/utils';
import type { Asset, AssetStatus, EquipmentType } from '@/domain/models';

const AGING_THRESHOLD_YEARS = 5;
const INITIAL_SHOWN = 9;

type FilterStatus = 'ALL' | AssetStatus | 'TRAINING';
type FilterType   = 'ALL' | EquipmentType;

interface Props {
  onSelect?: (id: string) => void;
}

const selectClass = cn(
  'px-2.5 py-1.5 text-xs rounded-lg border border-amber-200 dark:border-amber-800/60',
  'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  'focus:outline-none focus:ring-2 focus:ring-amber-400/40',
);

export const AgingAlerts: React.FC<Props> = ({ onSelect }) => {
  const [agingAssets, setAgingAssets] = useState<Asset[]>([]);
  const [showAll, setShowAll]         = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filterType,   setFilterType]   = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    listarAtivos()
      .then((assets) => {
        const currentYear = new Date().getFullYear();
        const old = assets
          .filter(
            (a) =>
              a.year !== null &&
              a.year <= currentYear - AGING_THRESHOLD_YEARS &&
              a.status !== 'RETIRED',
          )
          .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
        setAgingAssets(old);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return agingAssets.filter((a) => {
      if (filterType !== 'ALL' && a.equipment_type !== filterType) return false;
      if (filterStatus === 'TRAINING') {
        if (!a.is_training) return false;
      } else if (filterStatus !== 'ALL') {
        if (a.status !== filterStatus) return false;
      }
      if (filterBranch && a.branch_id !== filterBranch) return false;
      return true;
    });
  }, [agingAssets, filterType, filterStatus, filterBranch]);

  // Filiais que aparecem na lista (para o select) — deve ficar ANTES de qualquer return condicional
  const activeBranches = useMemo(() => {
    const ids = new Set(agingAssets.map((a) => a.branch_id));
    return BRANCHES.filter((b) => ids.has(b.id));
  }, [agingAssets]);

  const hasFilters = filterType !== 'ALL' || filterStatus !== 'ALL' || filterBranch !== '';

  const clearFilters = () => {
    setFilterType('ALL');
    setFilterStatus('ALL');
    setFilterBranch('');
    setShowAll(false);
  };

  if (agingAssets.length === 0) return null;

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_SHOWN);
  const currentYear = new Date().getFullYear();

  const getStatusBadge = (asset: Asset) => {
    if (asset.is_training) {
      return {
        label: 'Treinamento',
        color: 'text-violet-700 dark:text-violet-300',
        bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      };
    }
    return ASSET_STATUSES.find((s) => s.value === asset.status);
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Alerta de Envelhecimento de Frota
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full shrink-0">
            {hasFilters ? `${filtered.length} / ${agingAssets.length}` : agingAssets.length} com {AGING_THRESHOLD_YEARS}+ anos
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
              showFilters
                ? 'bg-amber-200 dark:bg-amber-900/50 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:border-amber-400',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />}
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 animate-fade-in">
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value as FilterType); setShowAll(false); }}
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
            <label className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as FilterStatus); setShowAll(false); }}
              title="Filtrar por status"
              className={selectClass}
            >
              <option value="ALL">Todos</option>
              <option value="IN_USE">Em Uso</option>
              <option value="STOCK">Estoque</option>
              <option value="MAINTENANCE">Manutenção</option>
              <option value="TRAINING">Treinamento</option>
            </select>
          </div>

          {/* Filial */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Filial
            </label>
            <select
              value={filterBranch}
              onChange={(e) => { setFilterBranch(e.target.value); setShowAll(false); }}
              title="Filtrar por filial"
              className={selectClass}
            >
              <option value="">Todas</option>
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 text-center py-2">
          Nenhum equipamento encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {visible.map((asset) => {
            const badge = getStatusBadge(asset);
            const age = asset.year ? currentYear - asset.year : null;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onSelect?.(asset.id)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 hover:shadow-sm transition-all text-left group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white truncate">
                      {asset.service_tag}
                    </span>
                    {asset.is_training && (
                      <GraduationCap className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                    {asset.branch_name ?? '—'}
                  </span>
                  {asset.employee_name && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">
                      {asset.employee_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {asset.year}
                    {age !== null && <span className="text-amber-500 ml-1">({age}a)</span>}
                  </span>
                  {badge && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badge.bgColor, badge.color)}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Ver mais / menos */}
      {filtered.length > INITIAL_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors mx-auto"
        >
          {showAll ? (
            <><ChevronUp className="h-3.5 w-3.5" />Mostrar menos</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" />+{filtered.length - INITIAL_SHOWN} equipamentos — ver todos</>
          )}
        </button>
      )}
    </div>
  );
};
