import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useRBAC } from '@/hooks/useRBAC';
import { listarFornecedores, criarFornecedor, atualizarFornecedor, excluirFornecedor } from '@/data/commands';
import type { Vendor, CreateVendorDto } from '@/domain/models';

export const VendorsPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useRBAC();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateVendorDto>({ name: '' });

  const load = async () => {
    setLoading(true);
    try { setVendors(await listarFornecedores()); } catch { setVendors([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: '' }); setEditing(null); setShowForm(true); };
  const openEdit = (v: Vendor) => {
    setForm({ name: v.name, contact_name: v.contact_name ?? undefined, phone: v.phone ?? undefined, email: v.email ?? undefined, website: v.website ?? undefined, notes: v.notes || undefined });
    setEditing(v); setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) { await atualizarFornecedor(editing.id, form); toast('success', 'Fornecedor atualizado.'); }
      else { await criarFornecedor(form); toast('success', 'Fornecedor criado.'); }
      setShowForm(false); load();
    } catch (err) { toast('error', `Erro: ${err}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (v: Vendor) => {
    if (!confirm(`Excluir fornecedor "${v.name}"?`)) return;
    try { await excluirFornecedor(v.id); toast('success', 'Fornecedor excluído.'); load(); }
    catch (err) { toast('error', `Erro: ${err}`); }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fornecedores</h1>
          <p className="text-sm text-slate-500 mt-0.5">{vendors.length} fornecedor{vendors.length !== 1 ? 'es' : ''} cadastrado{vendors.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Novo Fornecedor</Button>
        )}
      </div>

      {vendors.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum fornecedor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-agro-600 flex-shrink-0" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{v.name}</h3>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar">
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                    <button onClick={() => handleDelete(v)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {v.contact_name && <p>{v.contact_name}</p>}
                {v.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{v.phone}</p>}
                {v.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{v.email}</p>}
                {v.website && <p className="flex items-center gap-1.5"><Globe className="h-3 w-3" />{v.website}</p>}
                {v.notes && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{v.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h2>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Dell Brasil Ltda" />
                <Input label="Contato" value={form.contact_name ?? ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value || undefined })} placeholder="Nome do contato comercial" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Telefone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value || undefined })} placeholder="(11) 9999-9999" />
                  <Input label="E-mail" type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value || undefined })} placeholder="vendas@fornecedor.com" />
                </div>
                <Input label="Website" value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value || undefined })} placeholder="https://..." />
                <Textarea label="Observações" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })} rows={2} placeholder="Condições de contrato, suporte, etc." />
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
