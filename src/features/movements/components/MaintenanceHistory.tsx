import React, { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listarManutencoes } from '@/data/commands';
import { formatDateTime } from '@/lib/utils';
import type { MaintenanceRecord } from '@/domain/models';

export const MaintenanceHistory: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    listarManutencoes(filter || undefined)
      .then(setRecords)
      .catch(() => {});
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Registros de Manutenção ({records.length})
          </h3>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          title="Filtrar por status"
          className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="">Todos</option>
          <option value="OPEN">Abertos</option>
          <option value="CLOSED">Fechados</option>
        </select>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          Nenhum registro de manutenção encontrado.
        </p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
            >
              <div
                className={cn(
                  'mt-0.5 w-2 h-2 rounded-full flex-shrink-0',
                  r.status === 'OPEN' ? 'bg-amber-500' : 'bg-green-500',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                    {r.service_tag ?? r.asset_id.slice(0, 8)}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                      r.status === 'OPEN'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                    )}
                  >
                    {r.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fornecedor: {r.supplier || '—'} · Custo: R$ {r.cost.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enviado: {formatDateTime(r.sent_at)}
                  {r.returned_at && ` · Retornou: ${formatDateTime(r.returned_at)}`}
                  {r.expected_return_date && !r.returned_at && ` · Previsão: ${r.expected_return_date}`}
                </p>
                {r.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                    {r.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
