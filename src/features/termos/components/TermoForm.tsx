import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { criarTermo, listarAtivos, listarColaboradores } from '@/data/commands';
import type { Asset, Employee, TipoTermo } from '@/domain/models';

interface Props {
  onBack: () => void;
  onCreated: () => void;
}

export const TermoForm: React.FC<Props> = ({ onBack, onCreated }) => {
  const [colaboradorNome, setColaboradorNome] = useState('');
  const [colaboradorEmail, setColaboradorEmail] = useState('');
  const [tipo, setTipo] = useState<TipoTermo>('ENTREGA');
  const [observacoes, setObservacoes] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    listarAtivos().then(setAssets).catch(() => {});
    listarColaboradores().then(setEmployees).catch(() => {});
  }, []);

  const handleSelectEmployee = (emp: Employee) => {
    setColaboradorNome(emp.name);
    setEmpSearch('');
  };

  const handleToggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const nomeEfetivo = colaboradorNome.trim() || empSearch.trim();
    if (!nomeEfetivo) {
      toast('error', 'Informe o nome do colaborador');
      return;
    }
    if (selectedAssetIds.length === 0) {
      toast('error', 'Selecione ao menos um ativo');
      return;
    }
    setSaving(true);
    try {
      await criarTermo(
        {
          colaborador_nome: nomeEfetivo,
          colaborador_email: colaboradorEmail.trim() || undefined,
          asset_ids: selectedAssetIds,
          tipo,
          responsavel: user?.name ?? 'admin',
          observacoes: observacoes.trim() || undefined,
        },
        user?.name ?? 'admin',
      );
      toast('success', 'Termo criado com sucesso');
      onCreated();
    } catch (e) {
      toast('error', `Erro ao criar termo: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredAssets = assets.filter((a) => {
    if (!assetSearch) return true;
    const q = assetSearch.toLowerCase();
    return (
      a.service_tag.toLowerCase().includes(q) ||
      (a.employee_name ?? '').toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q)
    );
  });

  const filteredEmployees = empSearch.length >= 2
    ? employees.filter((e) => e.name.toLowerCase().includes(empSearch.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Termo de Responsabilidade</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do termo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Dados do Termo</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoTermo)}
            >
              <option value="ENTREGA">Entrega de Equipamento</option>
              <option value="DEVOLUCAO">Devolucao de Equipamento</option>
              <option value="TROCA">Troca de Equipamento</option>
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Colaborador</label>
            <input
              type="text"
              placeholder="Buscar colaborador..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              value={colaboradorNome || empSearch}
              onChange={(e) => {
                if (colaboradorNome) setColaboradorNome('');
                setEmpSearch(e.target.value);
              }}
            />
            {filteredEmployees.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                    onClick={() => handleSelectEmployee(emp)}
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email (para assinatura D4Sign)</label>
            <input
              type="email"
              placeholder="email@empresa.com.br"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              value={colaboradorEmail}
              onChange={(e) => setColaboradorEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observacoes</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> {saving ? 'Criando...' : 'Criar Termo'}
          </Button>
        </div>

        {/* Selecao de ativos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Ativos Vinculados ({selectedAssetIds.length})
            </h3>
          </div>

          {selectedAssetIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedAssetIds.map((id) => {
                const a = assets.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  >
                    {a?.service_tag ?? id.slice(0, 8)}
                    <button onClick={() => handleToggleAsset(id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <input
            type="text"
            placeholder="Buscar ativo por tag, modelo, colaborador..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            value={assetSearch}
            onChange={(e) => setAssetSearch(e.target.value)}
          />

          <div className="max-h-80 overflow-auto space-y-1">
            {filteredAssets.slice(0, 50).map((a) => {
              const selected = selectedAssetIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    selected
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                  }`}
                  onClick={() => handleToggleAsset(a.id)}
                >
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">{a.service_tag}</span>
                    <span className="text-slate-400 ml-2">{a.model}</span>
                    {a.employee_name && (
                      <span className="text-slate-400 ml-2">({a.employee_name})</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{a.equipment_type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
