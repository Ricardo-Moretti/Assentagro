import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import type { Asset } from '@/domain/models';

interface AssignFormProps {
  stockAssets: Asset[];
  onSubmit: (assetId: string, toEmployee: string, reason: string) => Promise<void>;
  loading: boolean;
}

export const AssignForm: React.FC<AssignFormProps> = ({ stockAssets, onSubmit, loading }) => {
  const [assetId, setAssetId] = useState('');
  const [toEmployee, setToEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assetId) { setError('Selecione um equipamento.'); return; }
    if (!toEmployee.trim()) { setError('Informe o nome do colaborador.'); return; }

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
        Atribua um equipamento do estoque a um colaborador. O status será alterado para "Em Uso".
      </p>

      <Select
        label="Equipamento (Estoque) *"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        options={stockAssets.map((a) => ({
          value: a.id,
          label: `${a.service_tag} — ${a.branch_name ?? 'Sem filial'}`,
        }))}
        placeholder={stockAssets.length === 0 ? 'Nenhum equipamento em estoque' : 'Selecione...'}
      />

      <Autocomplete
        label="Colaborador *"
        value={toEmployee}
        onChange={setToEmployee}
        placeholder="Nome do colaborador que receberá o equipamento"
      />

      <Textarea
        label="Observação"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo da atribuição (opcional)"
        rows={2}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        icon={<UserPlus className="h-4 w-4" />}
        disabled={stockAssets.length === 0}
      >
        Atribuir Equipamento
      </Button>
    </form>
  );
};
