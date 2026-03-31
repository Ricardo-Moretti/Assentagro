import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSignature, Plus, Search, Eye, Trash2, Send, RefreshCw,
  CheckCircle2, Clock, FileText, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  listarTermos,
  obterTermo,
  excluirTermo,
} from '@/data/commands';
import type { Termo, StatusTermo, TipoTermo } from '@/domain/models';
import { TermoForm } from '../components/TermoForm';
import { TermoDetail } from '../components/TermoDetail';

const TIPO_LABEL: Record<TipoTermo, string> = {
  ENTREGA: 'Entrega',
  DEVOLUCAO: 'Devolucao',
  TROCA: 'Troca',
};

const TIPO_COLOR: Record<TipoTermo, string> = {
  ENTREGA: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DEVOLUCAO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  TROCA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const STATUS_CONFIG: Record<StatusTermo, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: {
    label: 'Pendente',
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  GERADO: {
    label: 'PDF Gerado',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  ENVIADO: {
    label: 'Enviado p/ Assinatura',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <Send className="w-3.5 h-3.5" />,
  },
  ASSINADO: {
    label: 'Assinado',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  RECUSADO: {
    label: 'Recusado',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  return iso.substring(0, 10).split('-').reverse().join('/');
}

export const TermosPage: React.FC = () => {
  const [termos, setTermos] = useState<Termo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<Termo | null>(null);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarTermos(statusFilter || undefined, tipoFilter || undefined);
      setTermos(data);
    } catch (e) {
      toast('error', `Erro ao carregar termos: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tipoFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este termo permanentemente?')) return;
    try {
      await excluirTermo(id, user?.name ?? 'admin');
      toast('success', 'Termo excluido');
      load();
    } catch (e) {
      toast('error', String(e));
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const termo = await obterTermo(id);
      setSelectedTermo(termo);
    } catch (e) {
      toast('error', String(e));
    }
  };

  const filtered = termos.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.colaborador_nome.toLowerCase().includes(q) ||
      t.responsavel.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  if (selectedTermo) {
    return (
      <TermoDetail
        termo={selectedTermo}
        onBack={() => { setSelectedTermo(null); load(); }}
        onRefresh={async () => {
          const t = await obterTermo(selectedTermo.id);
          setSelectedTermo(t);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <TermoForm
        onBack={() => { setShowForm(false); load(); }}
        onCreated={() => { setShowForm(false); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <FileSignature className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Termos de Responsabilidade</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gerencie termos de entrega, devolucao e troca com assinatura digital D4Sign
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Termo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por colaborador, responsavel..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="GERADO">PDF Gerado</option>
          <option value="ENVIADO">Enviado</option>
          <option value="ASSINADO">Assinado</option>
          <option value="RECUSADO">Recusado</option>
        </select>
        <select
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          <option value="ENTREGA">Entrega</option>
          <option value="DEVOLUCAO">Devolucao</option>
          <option value="TROCA">Troca</option>
        </select>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Contagem */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {filtered.length} termo{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Lista */}
      {loading ? (
        <LoadingState message="Carregando termos..." />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum termo encontrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Colaborador</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Data</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Responsavel</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const sc = STATUS_CONFIG[t.status as StatusTermo] ?? STATUS_CONFIG.PENDENTE;
                return (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                    onClick={() => handleViewDetail(t.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{t.colaborador_nome}</div>
                      {t.colaborador_email && (
                        <div className="text-xs text-slate-400">{t.colaborador_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', TIPO_COLOR[t.tipo as TipoTermo])}>
                        {TIPO_LABEL[t.tipo as TipoTermo] ?? t.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sc.color)}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtDate(t.data_geracao)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.responsavel}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                          title="Ver detalhes"
                          onClick={() => handleViewDetail(t.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          title="Excluir"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
