import React, { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { listarAtivos } from '@/data/commands';
import type { Asset } from '@/domain/models';

interface MaintenanceSendFormProps {
  onSubmit: (assetId: string, supplier: string, expectedReturnDate?: string, cost?: number, notes?: string) => Promise<void>;
  loading: boolean;
}

export const MaintenanceSendForm: React.FC<MaintenanceSendFormProps> = ({ onSubmit, loading }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listarAtivos()
      .then((all) => setAssets(all.filter((a) => a.status === 'IN_USE' || a.status === 'STOCK')))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!assetId) { setError('Selecione um equipamento.'); return; }
    if (!supplier.trim()) { setError('Informe o fornecedor.'); return; }

    try {
      await onSubmit(
        assetId,
        supplier.trim(),
        expectedDate || undefined,
        cost ? parseFloat(cost) : undefined,
        notes.trim() || undefined,
      );
      setAssetId('');
      setSupplier('');
      setExpectedDate('');
      setCost('');
      setNotes('');
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Envie um equipamento para manutenção externa. O status será alterado para "Manutenção".
      </p>

      <Select
        label="Equipamento *"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        options={assets.map((a) => ({
          value: a.id,
          label: `${a.service_tag} — ${a.status === 'IN_USE' ? a.employee_name : 'Estoque'} (${a.branch_name})`,
        }))}
        placeholder={assets.length === 0 ? 'Nenhum equipamento disponível' : 'Selecione...'}
      />

      <Input
        label="Fornecedor *"
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
        placeholder="Nome do fornecedor / assistência técnica"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Previsão de Retorno"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
        />
        <Input
          label="Custo Estimado (R$)"
          type="number"
          min={0}
          step={0.01}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <Textarea
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Defeito, peças solicitadas, etc."
        rows={2}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        icon={<Wrench className="h-4 w-4" />}
        disabled={assets.length === 0}
      >
        Enviar para Manutenção
      </Button>
    </form>
  );
};
