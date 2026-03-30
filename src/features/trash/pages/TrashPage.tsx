import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Laptop, Monitor } from 'lucide-react';
import { listarAtivosExcluidos, restaurarAtivo } from '@/data/commands';
import { useRBAC } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';
import type { DeletedAsset } from '@/domain/models';

export const TrashPage: React.FC = () => {
  const [items, setItems] = useState<DeletedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const { isAdmin, userName, role } = useRBAC();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarAtivosExcluidos();
      setItems(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRestore = async (item: DeletedAsset) => {
    setRestoring(item.id);
    try {
      await restaurarAtivo(item.id, userName, role);
      showToast(`${item.service_tag} restaurado para Estoque.`);
      await loadItems();
    } catch (err: unknown) {
      showToast(`Erro: ${String(err)}`);
    } finally {
      setRestoring(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 dark:bg-slate-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-slide-down">
          {toast}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-800">
          <Trash2 className="h-5 w-5 text-red-600 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Lixeira — Ativos Excluidos
          </h2>
          <span className="text-xs text-slate-400 ml-auto">{items.length} item(s)</span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-agro-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nenhum ativo na lixeira.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800/50 transition-colors"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    {item.equipment_type === 'NOTEBOOK'
                      ? <Laptop className="h-4 w-4 text-indigo-500" />
                      : <Monitor className="h-4 w-4 text-orange-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                        {item.service_tag}
                      </span>
                      <span className="text-xs text-slate-500">{item.model || '---'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.branch_name ?? '---'}
                      {item.employee_name ? ` \u00B7 ${item.employee_name}` : ''}
                      {' \u00B7 '}Excluido por {item.deleted_by} em {new Date(item.deleted_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    disabled={restoring !== null}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0',
                      'text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50',
                      'hover:bg-green-50 dark:hover:bg-green-900/20',
                      'disabled:opacity-50',
                    )}
                  >
                    <RotateCcw className={cn('h-3.5 w-3.5', restoring === item.id && 'animate-spin')} />
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
