import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { listarAtivos } from '@/data/commands';
import { useAppStore } from '@/stores/useAppStore';
import type { Asset } from '@/domain/models';

const AGING_THRESHOLD_YEARS = 4;

export const AgingAlerts: React.FC = () => {
  const [agingAssets, setAgingAssets] = useState<Asset[]>([]);
  const { viewAsset } = useAppStore();

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

  if (agingAssets.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Alerta de Envelhecimento de Frota — {agingAssets.length} equipamento{agingAssets.length > 1 ? 's' : ''} com {AGING_THRESHOLD_YEARS}+ anos
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {agingAssets.slice(0, 9).map((asset) => (
          <button
            key={asset.id}
            onClick={() => viewAsset(asset.id)}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 transition-colors text-left"
          >
            <div>
              <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                {asset.service_tag}
              </span>
              <span className="text-xs text-slate-500 ml-2">
                {asset.branch_name}
              </span>
            </div>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {asset.year}
            </span>
          </button>
        ))}
      </div>
      {agingAssets.length > 9 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          +{agingAssets.length - 9} equipamentos não exibidos
        </p>
      )}
    </div>
  );
};
