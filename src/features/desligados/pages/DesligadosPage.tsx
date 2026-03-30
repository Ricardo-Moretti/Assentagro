import React, { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Laptop,
  Monitor,
  Package,
  ChevronRight,
} from 'lucide-react';
import {
  listarDesligamentos,
  confirmarDevolucao,
  cancelarDesligamento,
} from '@/data/commands';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import type { Desligamento } from '@/domain/models';

type Tab = 'aguardando' | 'devolvidos';

export const DesligadosPage: React.FC = () => {
  const [tab, setTab]                       = useState<Tab>('aguardando');
  const [aguardando, setAguardando]         = useState<Desligamento[]>([]);
  const [devolvidos, setDevolvidos]         = useState<Desligamento[]>([]);
  const [loading, setLoading]               = useState(true);
  const [confirmId, setConfirmId]           = useState<string | null>(null);
  const [confirmAction, setConfirmAction]   = useState<'devolver' | 'cancelar' | null>(null);
  const [actionLoading, setActionLoading]   = useState(false);
  const [toast, setToast]                   = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([
        listarDesligamentos('AGUARDANDO'),
        listarDesligamentos('DEVOLVIDO'),
      ]);
      setAguardando(a);
      setDevolvidos(d);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleAction = async () => {
    if (!confirmId || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'devolver') {
        await confirmarDevolucao(confirmId, useAuthStore.getState().user?.name ?? 'sistema');
        showToast('Equipamento devolvido e movido para Estoque.');
      } else {
        await cancelarDesligamento(confirmId);
        showToast('Desligamento cancelado.');
      }
      await loadAll();
    } catch (err: unknown) {
      showToast(`Erro: ${String(err)}`);
    } finally {
      setActionLoading(false);
      setConfirmId(null);
      setConfirmAction(null);
    }
  };

  const tabClass = (t: Tab) =>
    cn(
      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
      tab === t
        ? 'bg-orange-600 text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 dark:bg-slate-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-slide-down">
          {toast}
        </div>
      )}

      {/* StatCards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{aguardando.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Aguardando Equipamento</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{devolvidos.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Devolvidos ao Estoque</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-800">
          <UserX className="h-5 w-5 text-orange-600 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mr-2">
            Colaboradores Desligados
          </h2>
          <div className="flex gap-1">
            <button type="button" className={tabClass('aguardando')} onClick={() => setTab('aguardando')}>
              Aguardando
              {aguardando.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                  {aguardando.length}
                </span>
              )}
            </button>
            <button type="button" className={tabClass('devolvidos')} onClick={() => setTab('devolvidos')}>
              Devolvidos
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-agro-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Aguardando */}
              {tab === 'aguardando' && (
                <div className="space-y-2">
                  {aguardando.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Nenhum equipamento aguardando devolucao.
                    </p>
                  )}
                  {aguardando.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/10"
                    >
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 shrink-0">
                        {d.equipment_type === 'NOTEBOOK'
                          ? <Laptop className="h-4 w-4 text-indigo-500" />
                          : <Monitor className="h-4 w-4 text-orange-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                            {d.service_tag ?? '---'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30">
                            Aguardando equipamento
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Colaborador:</span> {d.employee_name}
                          {d.branch_name && <> {' \u00B7 '} <span className="font-medium">Filial:</span> {d.branch_name}</>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.model && <>{d.model} {' \u00B7 '}</>}
                          Desligado em {new Date(d.data_desligamento).toLocaleDateString('pt-BR')}
                        </p>
                        {d.observacoes && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                            {d.observacoes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setConfirmId(d.id); setConfirmAction('devolver'); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <Package className="h-3.5 w-3.5" />
                          Confirmar Devolucao
                        </button>
                        <button
                          type="button"
                          onClick={() => { setConfirmId(d.id); setConfirmAction('cancelar'); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Devolvidos */}
              {tab === 'devolvidos' && (
                <div className="space-y-2">
                  {devolvidos.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Nenhum equipamento devolvido ainda.
                    </p>
                  )}
                  {devolvidos.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 opacity-80"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                            {d.service_tag ?? '---'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30">
                            Em Estoque
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ex-colaborador: {d.employee_name}
                          {d.branch_name && <> {' \u00B7 '} {d.branch_name}</>}
                          {d.data_devolucao && (
                            <> {' \u00B7 '} Devolvido em {new Date(d.data_devolucao).toLocaleDateString('pt-BR')}</>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal confirmar acao */}
      {confirmId && confirmAction && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setConfirmId(null); setConfirmAction(null); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                {confirmAction === 'devolver' ? 'Confirmar Devolucao' : 'Cancelar Desligamento'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                {confirmAction === 'devolver'
                  ? 'O equipamento sera movido para Estoque e o nome do colaborador sera removido do ativo.'
                  : 'O registro de desligamento sera cancelado. O equipamento permanecera com o colaborador.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmId(null); setConfirmAction(null); }}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={actionLoading}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50',
                    confirmAction === 'devolver'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-slate-600 hover:bg-slate-700',
                  )}
                >
                  {actionLoading ? 'Aguarde...' : confirmAction === 'devolver' ? 'Confirmar' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
