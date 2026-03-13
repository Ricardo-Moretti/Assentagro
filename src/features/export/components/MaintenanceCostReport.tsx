import React, { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { obterCustosManutencao } from '@/data/commands';
import type { MaintenanceCostSummary } from '@/domain/models';

export const MaintenanceCostReport: React.FC = () => {
  const { toast } = useToast();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [data, setData] = useState<MaintenanceCostSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await obterCustosManutencao(
        inicio || undefined,
        fim || undefined,
      );
      setData(result);
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCost = data.reduce((acc, d) => acc + d.total_cost, 0);
  const totalCount = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-amber-600" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Custos de Manutenção
        </h3>
      </div>

      {/* Filtros de período */}
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">De</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            title="Data inicial"
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Até</label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            title="Data final"
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <Button size="sm" onClick={fetchData} loading={loading}>
          Filtrar
        </Button>
      </div>

      {/* Resumo */}
      {data.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <span className="text-xs text-slate-500">Total gasto</span>
            <p className="font-bold text-amber-700 dark:text-amber-400">
              R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-xs text-slate-500">Manutenções</span>
            <p className="font-bold text-slate-700 dark:text-slate-300">{totalCount}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          Nenhum custo de manutenção encontrado.
        </p>
      ) : (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Fornecedor</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Filial</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">Qtd</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">Custo Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-2 text-slate-900 dark:text-white">{d.supplier}</td>
                  <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{d.branch_name ?? '—'}</td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{d.count}</td>
                  <td className="py-2 px-2 text-right font-medium text-slate-900 dark:text-white">
                    R$ {d.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
