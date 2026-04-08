import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Laptop,
  Monitor,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  listarCandidatosDescarte,
  criarDescarte,
  listarDescartes,
  concluirDescarte,
  cancelarDescarte,
  reativarAtivo,
} from '@/data/commands';
import { useAuthStore } from '@/stores/useAuthStore';
import { EQUIPMENT_TYPE_LABEL } from '@/domain/constants';

// Helper: get userName for audit
const getUserName = () => useAuthStore.getState().user?.name ?? 'sistema';
import { cn } from '@/lib/utils';
import type { Asset, Descarte, CreateDescarteDto, DescarteMotivo } from '@/domain/models';

// ─── Constantes ──────────────────────────────────────────────────────────────

type Tab = 'candidatos' | 'agendados' | 'historico';

const MOTIVO_LABEL: Record<DescarteMotivo, string> = {
  OBSOLESCENCIA:     'Obsolescência',
  DEFEITO_IRREPARAVEL: 'Defeito Irreparável',
  FURTO:             'Furto',
  PERDA:             'Perda',
  DOACAO:            'Doação',
  VENDA:             'Venda',
  OUTRO:             'Outro',
};

const MOTIVO_COLOR: Record<DescarteMotivo, string> = {
  OBSOLESCENCIA:       'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
  DEFEITO_IRREPARAVEL: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  FURTO:               'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30',
  PERDA:               'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30',
  DOACAO:              'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
  VENDA:               'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
  OUTRO:               'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
};

const currentYear = new Date().getFullYear();

// ─── Modal de agendamento ─────────────────────────────────────────────────────

interface ModalProps {
  asset: Asset;
  onClose: () => void;
  onSave: (dto: CreateDescarteDto) => Promise<void>;
}

const AgendarModal: React.FC<ModalProps> = ({ asset, onClose, onSave }) => {
  const { user } = useAuthStore();
  const [motivo, setMotivo]           = useState<DescarteMotivo>('OBSOLESCENCIA');
  const [destino, setDestino]         = useState('');
  const [responsavel, setResponsavel] = useState(user?.name ?? '');
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino.trim() || !responsavel.trim()) {
      setError('Destino e responsável são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        asset_id:       asset.id,
        motivo,
        destino:        destino.trim(),
        responsavel:    responsavel.trim(),
        data_prevista:  dataPrevista || undefined,
        observacoes:    observacoes.trim() || undefined,
        registrado_por: user?.name ?? undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700',
    'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
    'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Agendar Descarte
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {asset.service_tag} · {asset.branch_name ?? '—'} · {asset.year ?? '—'}
              </p>
            </div>
            <button type="button" title="Fechar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Motivo */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Motivo <span className="text-red-500">*</span>
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as DescarteMotivo)}
                title="Motivo do descarte"
                className={inputClass}
              >
                {(Object.keys(MOTIVO_LABEL) as DescarteMotivo[]).map((k) => (
                  <option key={k} value={k}>{MOTIVO_LABEL[k]}</option>
                ))}
              </select>
            </div>

            {/* Destino */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Destino <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: ECO Eletrônicos SP, Doação à escola X…"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Responsável */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nome do responsável pelo descarte"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Data prevista */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Data Prevista
              </label>
              <input
                type="date"
                title="Data prevista para o descarte"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Observações */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Observações
              </label>
              <textarea
                rows={3}
                placeholder="Informações adicionais…"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className={cn(inputClass, 'resize-none')}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Agendando…' : 'Agendar Descarte'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

export const DescartePage: React.FC = () => {
  const [tab, setTab]                       = useState<Tab>('candidatos');
  const [candidatos, setCandidatos]         = useState<Asset[]>([]);
  const [agendados, setAgendados]           = useState<Descarte[]>([]);
  const [historico, setHistorico]           = useState<Descarte[]>([]);
  const [loading, setLoading]               = useState(true);
  const [modalAsset, setModalAsset]         = useState<Asset | null>(null);
  const [confirmId, setConfirmId]           = useState<string | null>(null);
  const [confirmAction, setConfirmAction]   = useState<'concluir' | 'cancelar' | null>(null);
  const [actionLoading, setActionLoading]   = useState(false);
  const [toast, setToast]                   = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, a, h] = await Promise.allSettled([
      listarCandidatosDescarte(),
      listarDescartes('PENDENTE'),
      listarDescartes('CONCLUIDO'),
    ]);
    if (c.status === 'fulfilled') setCandidatos(c.value);
    if (a.status === 'fulfilled') setAgendados(a.value);
    if (h.status === 'fulfilled') setHistorico(h.value);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (dto: CreateDescarteDto) => {
    await criarDescarte(dto, getUserName());
    showToast('Descarte agendado com sucesso.');
    await loadAll();
  };

  const handleAction = async () => {
    if (!confirmId || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'concluir') {
        await concluirDescarte(confirmId, getUserName());
        showToast('Descarte concluído. Equipamento marcado como Baixado.');
      } else {
        await cancelarDescarte(confirmId, getUserName());
        showToast('Descarte cancelado.');
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
        ? 'bg-red-600 text-white shadow-sm'
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{candidatos.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Candidatos (5+ anos)</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{agendados.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Agendados</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{historico.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Concluídos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-800">
          <Trash2 className="h-5 w-5 text-red-600 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mr-2">
            Gestão de Descarte
          </h2>
          <div className="flex gap-1">
            <button type="button" className={tabClass('candidatos')} onClick={() => setTab('candidatos')}>
              Candidatos
              {candidatos.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                  {candidatos.length}
                </span>
              )}
            </button>
            <button type="button" className={tabClass('agendados')} onClick={() => setTab('agendados')}>
              Agendados
              {agendados.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                  {agendados.length}
                </span>
              )}
            </button>
            <button type="button" className={tabClass('historico')} onClick={() => setTab('historico')}>
              Histórico
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
              {/* ── Candidatos ── */}
              {tab === 'candidatos' && (
                <div className="space-y-2">
                  {candidatos.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Nenhum equipamento candidato ao descarte no momento.
                    </p>
                  )}
                  {candidatos.map((asset) => {
                    const age = asset.year ? currentYear - asset.year : null;
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800/50 transition-colors"
                      >
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                          {asset.equipment_type === 'NOTEBOOK'
                            ? <Laptop className="h-4 w-4 text-indigo-500" />
                            : <Monitor className="h-4 w-4 text-orange-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                              {asset.service_tag}
                            </span>
                            <span className="text-xs text-slate-500">
                              {EQUIPMENT_TYPE_LABEL[asset.equipment_type]}
                            </span>
                            {age !== null && (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {asset.year} ({age}a)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {asset.branch_name ?? '—'}
                            {asset.employee_name ? ` · ${asset.employee_name}` : ''}
                            {asset.model ? ` · ${asset.model}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalAsset(asset)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Agendar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Agendados ── */}
              {tab === 'agendados' && (
                <div className="space-y-2">
                  {agendados.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Nenhum descarte agendado.
                    </p>
                  )}
                  {agendados.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/10"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                            {d.service_tag ?? '—'}
                          </span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', MOTIVO_COLOR[d.motivo])}>
                            {MOTIVO_LABEL[d.motivo]}
                          </span>
                          {d.year && (
                            <span className="text-xs text-slate-500">{d.year}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Destino:</span> {d.destino || '—'}
                          {' · '}
                          <span className="font-medium">Resp.:</span> {d.responsavel || '—'}
                        </p>
                        {d.data_prevista && (
                          <p className="text-xs text-slate-500">
                            Previsto para {new Date(d.data_prevista).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {d.observacoes && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                            {d.observacoes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setConfirmId(d.id); setConfirmAction('concluir'); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluir
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

              {/* ── Histórico ── */}
              {tab === 'historico' && (
                <div className="space-y-2">
                  {historico.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Nenhum descarte concluído ainda.
                    </p>
                  )}
                  {historico.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 opacity-80"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                            {d.service_tag ?? '—'}
                          </span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', MOTIVO_COLOR[d.motivo])}>
                            {MOTIVO_LABEL[d.motivo]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {d.destino || '—'} · {d.responsavel || '—'}
                          {d.data_conclusao && (
                            <> · Concluído em {new Date(d.data_conclusao).toLocaleDateString('pt-BR')}</>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        title="Reativar equipamento — volta para Estoque"
                        onClick={async () => {
                          try {
                            await reativarAtivo(d.asset_id, getUserName());
                            showToast(`${d.service_tag ?? d.asset_id} reativado e voltou para Estoque.`);
                            await loadAll();
                          } catch (err) {
                            showToast(`Erro ao reativar: ${String(err)}`);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reativar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal agendar descarte */}
      {modalAsset && (
        <AgendarModal
          asset={modalAsset}
          onClose={() => setModalAsset(null)}
          onSave={handleSave}
        />
      )}

      {/* Modal confirmar ação */}
      {confirmId && confirmAction && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setConfirmId(null); setConfirmAction(null); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                {confirmAction === 'concluir' ? 'Confirmar Descarte' : 'Cancelar Descarte'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                {confirmAction === 'concluir'
                  ? 'O equipamento será marcado como Baixado e o descarte ficará no histórico.'
                  : 'O agendamento de descarte será removido e o equipamento voltará aos candidatos.'}
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
                    confirmAction === 'concluir'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-slate-600 hover:bg-slate-700',
                  )}
                >
                  {actionLoading ? 'Aguarde…' : confirmAction === 'concluir' ? 'Confirmar' : 'Cancelar Descarte'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
