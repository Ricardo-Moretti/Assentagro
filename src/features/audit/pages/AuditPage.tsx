import React, { useEffect, useState, useMemo } from 'react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  ArrowLeftRight,
  UserX,
  GraduationCap,
  Package,
  Wrench,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn, formatDateTime } from '@/lib/utils';
import { LoadingState } from '@/components/ui/Spinner';
import { listarAuditoria, listarAtivos } from '@/data/commands';
import { useAppStore } from '@/stores/useAppStore';
import type { AuditEntry } from '@/domain/models';

const PER_PAGE = 15;

interface ParsedChange {
  acao: string;
  fields: { key: string; de?: string; para?: string; value?: string }[];
}

function parseChanges(json: string): ParsedChange {
  try {
    const obj = JSON.parse(json);
    const acao = obj.acao || 'DESCONHECIDO';
    const fields: ParsedChange['fields'] = [];

    for (const [key, val] of Object.entries(obj)) {
      if (key === 'acao') continue;
      if (typeof val === 'object' && val !== null && 'de' in val && 'para' in val) {
        const v = val as { de: string; para: string };
        fields.push({ key, de: v.de, para: v.para });
      } else {
        fields.push({ key, value: String(val) });
      }
    }
    return { acao, fields };
  } catch {
    return { acao: 'ERRO', fields: [{ key: 'raw', value: json }] };
  }
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  CRIADO: {
    label: 'Criado',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: <PlusCircle className="h-4 w-4" />,
  },
  ATUALIZADO: {
    label: 'Atualizado',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Pencil className="h-4 w-4" />,
  },
  EXCLUIDO: {
    label: 'Excluido',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: <Trash2 className="h-4 w-4" />,
  },
  MOVIMENTACAO: {
    label: 'Movimentacao',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  DESLIGAMENTO: {
    label: 'Desligamento',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <UserX className="h-4 w-4" />,
  },
  DEVOLUCAO_DESLIGAMENTO: {
    label: 'Devolucao (Desligamento)',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: <Package className="h-4 w-4" />,
  },
  MARCADO_TREINAMENTO: {
    label: 'Treinamento',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <GraduationCap className="h-4 w-4" />,
  },
  DESMARCADO_TREINAMENTO: {
    label: 'Remov. Treinamento',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    icon: <GraduationCap className="h-4 w-4" />,
  },
  DESCARTE_AGENDADO: {
    label: 'Descarte Agendado',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: <Trash2 className="h-4 w-4" />,
  },
  DESCARTE_CONCLUIDO: {
    label: 'Descarte Concluido',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: <Trash2 className="h-4 w-4" />,
  },
  DESCARTE_CANCELADO: {
    label: 'Descarte Cancelado',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    icon: <Trash2 className="h-4 w-4" />,
  },
  EMPRESTIMO_CRIADO: {
    label: 'Emprestimo',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  EMPRESTIMO_DEVOLVIDO: {
    label: 'Devol. Emprestimo',
    color: 'text-cyan-700 dark:text-cyan-300',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: <Package className="h-4 w-4" />,
  },
  ENVIADO_MANUTENCAO: {
    label: 'Env. Manutencao',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Wrench className="h-4 w-4" />,
  },
  RETORNADO_MANUTENCAO: {
    label: 'Ret. Manutencao',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Wrench className="h-4 w-4" />,
  },
  BAIXADO: {
    label: 'Baixado em Lote',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    icon: <Trash2 className="h-4 w-4" />,
  },
};

const FIELD_LABELS: Record<string, string> = {
  service_tag: 'Service Tag',
  status: 'Status',
  employee_name: 'Colaborador',
  branch_id: 'Filial',
  equipment_type: 'Tipo',
  ram_gb: 'RAM',
  storage_capacity_gb: 'Armazenamento',
  storage_type: 'Tipo Armaz.',
  os: 'SO',
  cpu: 'Processador',
  model: 'Modelo',
  year: 'Ano',
  notes: 'Observacoes',
  movement_type: 'Tipo Mov.',
  reason: 'Motivo',
  to_employee: 'Para',
  from_employee: 'De',
  swapped_with: 'Trocado com',
  branch_name: 'Filial',
  colaborador: 'Colaborador',
  colaborador_anterior: 'Ex-Colaborador',
  status_anterior: 'Status Anterior',
  status_novo: 'Novo Status',
  motivo: 'Motivo',
  destino: 'Destino',
  responsavel: 'Responsavel',
  tipo: 'Tipo',
};

export const AuditPage: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [assets, setAssets] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { viewAsset } = useAppStore();

  const handleExport = () => {
    const rows = filtered.map((e) => {
      const parsed = parseChanges(e.changes_json);
      return {
        'Data/Hora': formatDateTime(e.changed_at),
        'Service Tag': assets.get(e.asset_id) || e.asset_id.slice(0, 8),
        'Ação': parsed.acao,
        'Detalhes': parsed.fields
          .map((f) => f.de !== undefined ? `${f.key}: ${f.de} → ${f.para}` : `${f.key}: ${f.value}`)
          .join(' | '),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, `auditoria-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  useEffect(() => {
    Promise.all([listarAuditoria(), listarAtivos()])
      .then(([audits, assetList]) => {
        setEntries(audits);
        const map = new Map<string, string>();
        for (const a of assetList) map.set(a.id, a.service_tag);
        setAssets(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => {
      const tag = assets.get(e.asset_id) || '';
      return (
        tag.toLowerCase().includes(q) ||
        e.changes_json.toLowerCase().includes(q)
      );
    });
  }, [entries, search, assets]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [filtered, safePage],
  );

  if (loading) return <LoadingState message="Carregando auditoria..." />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Busca + Export */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por service tag..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <FileDown className="h-4 w-4" />
          Exportar Excel
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {paginated.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Nenhum registro de auditoria encontrado.</p>
          </div>
        ) : (
          paginated.map((entry) => {
            const parsed = parseChanges(entry.changes_json);
            const config = ACTION_CONFIG[parsed.acao] || ACTION_CONFIG.ATUALIZADO;
            const serviceTag = assets.get(entry.asset_id) || entry.asset_id.slice(0, 8);

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <div className={cn('flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0', config.bg, config.color)}>
                  {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.bg, config.color)}>
                      {config.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => viewAsset(entry.asset_id)}
                      className="text-sm font-mono font-semibold text-slate-900 dark:text-white hover:text-agro-600 dark:hover:text-agro-400 transition-colors flex items-center gap-1"
                    >
                      {serviceTag}
                      <Eye className="h-3 w-3 opacity-50" />
                    </button>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(entry.changed_at)}
                    </span>
                  </div>

                  {parsed.fields.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {parsed.fields.map((f, i) => (
                        <div key={i} className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {FIELD_LABELS[f.key] || f.key}:
                          </span>{' '}
                          {f.de !== undefined ? (
                            <>
                              <span className="line-through text-red-500/70">{f.de || '(vazio)'}</span>
                              {' → '}
                              <span className="text-green-600 dark:text-green-400">{f.para || '(vazio)'}</span>
                            </>
                          ) : (
                            <span>{f.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginacao */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{filtered.length} registro(s) — Pagina {safePage} de {totalPages}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PgBtn icon={<ChevronsLeft className="h-4 w-4" />} onClick={() => setPage(1)} disabled={safePage === 1} />
            <PgBtn icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} />
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (safePage <= 4) {
                p = i + 1;
              } else if (safePage >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = safePage - 3 + i;
              }
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors',
                    p === safePage
                      ? 'bg-agro-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  {p}
                </button>
              );
            })}
            <PgBtn icon={<ChevronRight className="h-4 w-4" />} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} />
            <PgBtn icon={<ChevronsRight className="h-4 w-4" />} onClick={() => setPage(totalPages)} disabled={safePage === totalPages} />
          </div>
        )}
      </div>
    </div>
  );
};

const PgBtn: React.FC<{ icon: React.ReactNode; onClick: () => void; disabled: boolean }> = ({ icon, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'p-1.5 rounded-lg transition-colors',
      disabled
        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800',
    )}
  >
    {icon}
  </button>
);
