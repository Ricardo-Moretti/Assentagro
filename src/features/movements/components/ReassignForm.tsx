import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import type { Asset } from '@/domain/models';

interface ReassignFormProps {
  inUseAssets: Asset[];
  stockAssets: Asset[];
  onSubmit: (assetId: string, toEmployee: string, reason: string) => Promise<void>;
  loading: boolean;
}

export const ReassignForm: React.FC<ReassignFormProps> = ({ inUseAssets, stockAssets, onSubmit, loading }) => {
  const [assetId, setAssetId] = useState('');
  const [toEmployee, setToEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const allAssets = [...inUseAssets, ...stockAssets];
  const selectedAsset = allAssets.find((a) => a.id === assetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assetId) { setError('Selecione um equipamento.'); return; }
    if (!toEmployee.trim()) { setError('Informe o nome do novo colaborador.'); return; }

    try {
      await onSubmit(assetId, toEmployee.trim(), reason.trim());
      setAssetId('');
      setToEmployee('');
      setReason('');
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Reatribua um equipamento em uso para um novo colaborador (ex: desligamento). O status permanece "Em Uso".
      </p>

      <Select
        label="Equipamento *"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        options={allAssets.map((a) => ({
          value: a.id,
          label: `${a.service_tag} — ${a.employee_name ?? 'Estoque'} (${a.branch_name ?? 'Sem filial'}) [${a.status === 'IN_USE' ? 'Em Uso' : 'Estoque'}]`,
        }))}
        placeholder={allAssets.length === 0 ? 'Nenhum equipamento disponível' : 'Selecione...'}
      />

      {selectedAsset && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Colaborador atual: <strong>{selectedAsset.employee_name ?? '—'}</strong>
          </span>
        </div>
      )}

      <Autocomplete
        label="Novo Colaborador *"
        value={toEmployee}
        onChange={setToEmployee}
        placeholder="Nome do novo colaborador"
        branchId={selectedAsset?.branch_id}
      />

      <Textarea
        label="Observação"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo da reatribuição (ex: desligamento do colaborador anterior)"
        rows={2}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        icon={<UserCheck className="h-4 w-4" />}
        disabled={allAssets.length === 0}
      >
        Reatribuir Equipamento
      </Button>
    </form>
  );
};
