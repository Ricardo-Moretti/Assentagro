import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { listarAlertasGarantia } from '@/data/commands';
import { useAppStore } from '@/stores/useAppStore';
import type { WarrantyAlert } from '@/domain/models';

export const WarrantyAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<WarrantyAlert[]>([]);
  const { viewAsset } = useAppStore();

  useEffect(() => {
    listarAlertasGarantia(90).then(setAlerts).catch(() => {});
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Garantias Vencendo ({alerts.length})
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {alerts.slice(0, 10).map((a) => {
          const urgent = a.days_remaining <= 30;
          return (
            <button
              key={a.asset_id}
              onClick={() => viewAsset(a.asset_id)}
              className="flex items-center justify-between w-full py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                {urgent && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                  {a.service_tag}
                </span>
                {a.branch_name && (
                  <span className="text-xs text-slate-500">{a.branch_name}</span>
                )}
              </div>
              <span className={`text-xs font-medium ${urgent ? 'text-amber-600' : 'text-slate-500'}`}>
                {a.days_remaining <= 0 ? 'Vencida' : `${a.days_remaining}d restantes`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
