import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useRBAC } from '@/hooks/useRBAC';
import { listarUsoLicencas, criarLicenca, atualizarLicenca, excluirLicenca } from '@/data/commands';
import type { SoftwareLicenseUsage, CreateSoftwareLicenseDto, LicenseType } from '@/domain/models';

const LICENSE_TYPES: { value: LicenseType; label: string }[] = [
  { value: 'PER_SEAT', label: 'Por Assento (Per Seat)' },
  { value: 'OEM', label: 'OEM' },
  { value: 'SUBSCRIPTION', label: 'Assinatura' },
  { value: 'OPEN', label: 'Open / Volume' },
];

export const SoftwareLicensesPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useRBAC();
  const [licenses, setLicenses] = useState<SoftwareLicenseUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateSoftwareLicenseDto>({ name: '', quantity_purchased: 1 });

  const load = async () => {
    setLoading(true);
    try { setLicenses(await listarUsoLicencas()); } catch { setLicenses([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: '', quantity_purchased: 1 }); setEditingId(null); setShowForm(true); };
  const openEdit = (l: SoftwareLicenseUsage) => {
    setForm({ name: l.name, publisher: l.publisher ?? undefined, license_type: l.license_type, quantity_purchased: l.quantity_purchased, cost_per_unit: l.cost_per_unit ?? undefined, expiry_date: l.expiry_date ?? undefined, notes: l.notes || undefined });
    setEditingId(l.id); setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) { await atualizarLicenca(editingId, form); toast('success', 'Licença atualizada.'); }
      else { await criarLicenca(form); toast('success', 'Licença criada.'); }
      setShowForm(false); load();
    } catch (err) { toast('error', `Erro: ${err}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (l: SoftwareLicenseUsage) => {
    if (!confirm(`Excluir licença "${l.name}"?`)) return;
    try { await excluirLicenca(l.id); toast('success', 'Licença excluída.'); load(); }
    catch (err) { toast('error', `Erro: ${err}`); }
  };

  const getStatus = (l: SoftwareLicenseUsage) => {
    const overdue = l.expiry_date && new Date(l.expiry_date) < new Date();
    const overUsed = l.quantity_installed > l.quantity_purchased;
    const underUsed = l.quantity_purchased > 0 && l.quantity_installed < l.quantity_purchased * 0.5;
    if (overdue) return { icon: <XCircle className="h-4 w-4 text-red-500" />, label: 'Expirada', color: 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40' };
    if (overUsed) return { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: 'Excesso', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40' };
    if (underUsed) return { icon: <AlertTriangle className="h-4 w-4 text-blue-400" />, label: 'Subutilizada', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40' };
    return { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, label: 'OK', color: 'text-slate-700 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' };
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Licenças de Software</h1>
          <p className="text-sm text-slate-500 mt-0.5">{licenses.length} licença{licenses.length !== 1 ? 's' : ''} cadastrada{licenses.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Nova Licença</Button>
        )}
      </div>

      {licenses.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma licença cadastrada ainda.</p>
          <p className="text-xs mt-1">Cadastre licenças para cruzar com os softwares detectados pelo OCS.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {licenses.map((l) => {
            const st = getStatus(l);
            const pct = l.quantity_purchased > 0 ? Math.min(100, Math.round((l.quantity_installed / l.quantity_purchased) * 100)) : 0;
            return (
              <div key={l.id} className={`rounded-2xl border p-5 ${st.color}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {st.icon}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{l.name}</p>
                      {l.publisher && <p className="text-xs text-slate-400">{l.publisher}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {LICENSE_TYPES.find(t => t.value === l.license_type)?.label ?? l.license_type}
                    </span>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(l)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{l.quantity_installed} instaladas de {l.quantity_purchased} licenciadas</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-agro-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {l.cost_per_unit != null && (
                      <span>Custo total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.cost_per_unit * l.quantity_purchased)}</span>
                    )}
                    {l.expiry_date && (
                      <span>Expira: {new Date(l.expiry_date).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingId ? 'Editar Licença' : 'Nova Licença'}
                </h2>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <Input label="Software *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Microsoft Office 365" />
                <Input label="Fabricante" value={form.publisher ?? ''} onChange={(e) => setForm({ ...form, publisher: e.target.value || undefined })} placeholder="Ex: Microsoft" />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Tipo" value={form.license_type ?? 'PER_SEAT'} onChange={(e) => setForm({ ...form, license_type: e.target.value as LicenseType })} options={LICENSE_TYPES} />
                  <Input label="Qtd. Licenciada *" type="number" min={1} value={form.quantity_purchased} onChange={(e) => setForm({ ...form, quantity_purchased: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Custo unit. (R$)" type="number" min={0} step={0.01} value={form.cost_per_unit ?? ''} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="0.00" />
                  <Input label="Validade" type="date" value={form.expiry_date ?? ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value || undefined })} />
                </div>
                <Textarea label="Observações" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })} rows={2} />
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" loading={saving}>{editingId ? 'Salvar' : 'Criar'}</Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
