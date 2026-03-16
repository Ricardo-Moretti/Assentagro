import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { listarNotas, criarNota, atualizarNota, excluirNota } from '@/data/commands';
import type { Nota, NotaCategoria } from '@/domain/models';

const CATEGORIAS: { value: NotaCategoria; label: string; color: string }[] = [
  { value: 'GERAL',   label: 'Geral',    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'TI',      label: 'TI',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'REUNIAO', label: 'Reunião',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { value: 'ALERTA',  label: 'Alerta',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'OUTRO',   label: 'Outro',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
];

function catColor(c: string) {
  return CATEGORIAS.find((x) => x.value === c)?.color ?? CATEGORIAS[0].color;
}
function catLabel(c: string) {
  return CATEGORIAS.find((x) => x.value === c)?.label ?? c;
}
function fmtDate(iso: string) {
  return iso.substring(0, 16).replace('T', ' ');
}

export const NotesPage: React.FC = () => {
  const [notas, setNotas]         = useState<Nota[]>([]);
  const [loading, setLoading]     = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Nota | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarNotas(catFilter || undefined);
      setNotas(data);
    } catch (e) {
      toast('error', `Falha ao carregar: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [catFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const handleExcluir = async (nota: Nota) => {
    if (!confirm(`Excluir nota "${nota.titulo}"?`)) return;
    try {
      await excluirNota(nota.id);
      toast('success', 'Nota excluída.');
      load();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Observações</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{notas.length} nota{notas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setShowForm(true); }}>
          Nova Nota
        </Button>
      </div>

      {/* Filtro por categoria */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCatFilter('')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            catFilter === ''
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          )}
        >
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCatFilter(c.value)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              catFilter === c.value
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <LoadingState />
      ) : notas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <StickyNote className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">Nenhuma observação registrada.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Clique em "Nova Nota" para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notas.map((nota) => (
            <div key={nota.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', catColor(nota.categoria))}>
                      {catLabel(nota.categoria)}
                    </span>
                  </div>
                  {nota.titulo && (
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{nota.titulo}</h3>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(nota); setShowForm(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleExcluir(nota)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed flex-1">
                {nota.corpo}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{nota.autor}</span>
                <span>{fmtDate(nota.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <NoteFormModal
          nota={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
};

// ── Modal de Nota ──────────────────────────────────────────────────
const NoteFormModal: React.FC<{
  nota: Nota | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ nota, onClose, onSaved }) => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: nota?.titulo ?? '',
    corpo: nota?.corpo ?? '',
    categoria: (nota?.categoria ?? 'GERAL') as NotaCategoria,
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.corpo.trim()) { toast('error', 'O conteúdo da nota não pode estar vazio.'); return; }
    setSaving(true);
    try {
      if (nota) {
        await atualizarNota(nota.id, form.titulo, form.corpo, form.categoria);
      } else {
        await criarNota({
          titulo: form.titulo.trim(),
          corpo: form.corpo.trim(),
          categoria: form.categoria,
          autor: user?.name ?? user?.username ?? 'Sistema',
        });
      }
      toast('success', nota ? 'Nota atualizada.' : 'Nota criada.');
      onSaved();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {nota ? 'Editar Nota' : 'Nova Nota'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Categoria</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => set('categoria', c.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    form.categoria === c.value
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Título (opcional)</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="Título da observação..."
              className={inputCls}
            />
          </div>

          {/* Corpo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Conteúdo *</label>
            <textarea
              value={form.corpo}
              onChange={(e) => set('corpo', e.target.value)}
              rows={6}
              placeholder="Escreva sua observação aqui..."
              className={cn(inputCls, 'resize-none')}
              autoFocus
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving} icon={<Check className="h-4 w-4" />}>
            {nota ? 'Salvar' : 'Criar Nota'}
          </Button>
        </div>
      </div>
    </div>
  );
};
