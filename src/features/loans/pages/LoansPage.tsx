import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Plus, RotateCcw, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  listarEmprestimos,
  devolverEmprestimo,
  excluirEmprestimo,
  criarEmprestimo,
  listarAtivos,
} from '@/data/commands';
import { BRANCHES } from '@/domain/constants';
import type { AssetLoan, AssetFilters } from '@/domain/models';

const TIPO_LABEL: Record<string, string> = {
  EMPRESTIMO: 'Empréstimo',
  MANUTENCAO: 'Manutenção',
};

const TIPO_COLOR: Record<string, string> = {
  EMPRESTIMO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  MANUTENCAO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const STATUS_COLOR: Record<string, string> = {
  ATIVO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DEVOLVIDO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  ATRASADO: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.substring(0, 10).split('-').reverse().join('/');
}

function isAtrasado(loan: AssetLoan): boolean {
  if (loan.status !== 'ATIVO' || !loan.previsao_retorno) return false;
  return new Date(loan.previsao_retorno) < new Date();
}

export const LoansPage: React.FC = () => {
  const [loans, setLoans] = useState<AssetLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ATIVO');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarEmprestimos(statusFilter || undefined);
      setLoans(data);
    } catch {
      // erro silencioso — evita loop de re-render
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDevolver = async (loan: AssetLoan) => {
    if (!confirm(`Confirmar devolução de "${loan.service_tag ?? loan.asset_id}"?`)) return;
    try {
      await devolverEmprestimo(loan.id);
      toast('success', 'Devolução registrada.');
      load();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    }
  };

  const handleExcluir = async (loan: AssetLoan) => {
    if (!confirm('Excluir este registro?')) return;
    try {
      await excluirEmprestimo(loan.id);
      toast('success', 'Registro excluído.');
      load();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    }
  };

  const filtered = loans.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.responsavel.toLowerCase().includes(q) ||
      (l.service_tag ?? '').toLowerCase().includes(q) ||
      l.destino.toLowerCase().includes(q)
    );
  });

  const ativos = loans.filter((l) => l.status === 'ATIVO').length;
  const atrasados = loans.filter(isAtrasado).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Empréstimos e Retiradas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {ativos} ativo{ativos !== 1 ? 's' : ''}
              {atrasados > 0 && (
                <span className="ml-2 text-red-500 font-medium">· {atrasados} atrasado{atrasados !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
          Registrar Saída
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por responsável, tag, destino..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="DEVOLVIDO">Devolvidos</option>
          <option value="ATRASADO">Atrasados</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">
            {statusFilter === 'ATIVO' ? 'Nenhum empréstimo ativo.' : 'Nenhum registro encontrado.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Equipamento</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Responsável</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Destino</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Saída</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Previsão</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((loan) => {
                const atrasado = isAtrasado(loan);
                return (
                  <tr key={loan.id} className={cn(
                    'transition-colors',
                    atrasado ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  )}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {loan.service_tag ?? '—'}
                      </span>
                      {loan.asset_model && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-32">{loan.asset_model}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TIPO_COLOR[loan.tipo] ?? '')}>
                        {TIPO_LABEL[loan.tipo] ?? loan.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{loan.responsavel}</span>
                      {loan.contato && <p className="text-xs text-slate-400">{loan.contato}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-36 truncate">
                      {loan.destino || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {fmtDate(loan.data_saida)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {loan.data_retorno ? (
                        <span className="text-slate-500 dark:text-slate-400">{fmtDate(loan.data_retorno)}</span>
                      ) : atrasado ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">{fmtDate(loan.previsao_retorno)} ⚠</span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{fmtDate(loan.previsao_retorno)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                        atrasado ? STATUS_COLOR['ATRASADO'] : STATUS_COLOR[loan.status] ?? '')}>
                        {atrasado ? 'ATRASADO' : loan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {loan.status === 'ATIVO' && (
                          <button
                            onClick={() => handleDevolver(loan)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            title="Registrar devolução"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleExcluir(loan)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <LoanFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
};

// ── Modal de Registro ──────────────────────────────────────────────
const LoanFormModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<Array<{ id: string; service_tag: string; model: string }>>([]);
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().substring(0, 10);

  const [form, setForm] = useState({
    asset_id: '',
    tipo: 'EMPRESTIMO' as 'EMPRESTIMO' | 'MANUTENCAO',
    responsavel: '',
    contato: '',
    destino: '',
    destino_branch_id: '',
    data_saida: today,
    previsao_retorno: '',
    observacoes: '',
  });

  useEffect(() => {
    listarAtivos({ search: search || undefined, sort_by: 'service_tag', sort_dir: 'ASC' } as AssetFilters)
      .then((a) => setAssets(a.map((x) => ({ id: x.id, service_tag: x.service_tag, model: x.model }))))
      .catch(() => {});
  }, [search]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.asset_id) { toast('error', 'Selecione um equipamento.'); return; }
    if (!form.responsavel.trim()) { toast('error', 'Informe o responsável.'); return; }
    if (!form.destino.trim()) { toast('error', 'Informe o destino.'); return; }
    setSaving(true);
    try {
      await criarEmprestimo({
        asset_id: form.asset_id,
        tipo: form.tipo,
        responsavel: form.responsavel.trim(),
        contato: form.contato.trim() || undefined,
        destino: form.destino.trim(),
        destino_branch_id: form.destino_branch_id || undefined,
        data_saida: form.data_saida,
        previsao_retorno: form.previsao_retorno || undefined,
        observacoes: form.observacoes.trim() || undefined,
        registrado_por: user?.name ?? user?.username,
      });
      toast('success', 'Saída registrada com sucesso.');
      onSaved();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Registrar Saída</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className={labelCls}>Tipo de saída *</label>
            <div className="flex gap-2">
              {(['EMPRESTIMO', 'MANUTENCAO'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => set('tipo', t)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    form.tipo === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Equipamento */}
          <div>
            <label className={labelCls}>Equipamento *</label>
            <input
              type="text"
              placeholder="Buscar por service tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputCls, 'mb-2')}
            />
            <select
              value={form.asset_id}
              onChange={(e) => set('asset_id', e.target.value)}
              className={inputCls}
              size={4}
            >
              <option value="">— Selecione —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.service_tag} {a.model ? `· ${a.model}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Responsável *</label>
              <input type="text" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} placeholder="Nome de quem levou" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contato</label>
              <input type="text" value={form.contato} onChange={(e) => set('contato', e.target.value)} placeholder="Telefone ou ramal" className={inputCls} />
            </div>
          </div>

          {/* Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Destino *</label>
              <input type="text" value={form.destino} onChange={(e) => set('destino', e.target.value)} placeholder="Ex: Filial Franca, Lab TI..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Filial destino</label>
              <select value={form.destino_branch_id} onChange={(e) => set('destino_branch_id', e.target.value)} className={inputCls}>
                <option value="">— Nenhuma —</option>
                {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data de saída *</label>
              <input type="date" value={form.data_saida} onChange={(e) => set('data_saida', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Previsão de retorno</label>
              <input type="date" value={form.previsao_retorno} onChange={(e) => set('previsao_retorno', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} rows={3} placeholder="Motivo, detalhes adicionais..." className={cn(inputCls, 'resize-none')} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Registrar Saída</Button>
        </div>
      </div>
    </div>
  );
};
