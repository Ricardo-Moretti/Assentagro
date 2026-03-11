import React, { useState, useEffect } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { listarManutencoes } from '@/data/commands';
import type { MaintenanceRecord } from '@/domain/models';

interface MaintenanceReturnFormProps {
  onSubmit: (maintenanceId: string, cost?: number, notes?: string) => Promise<void>;
  loading: boolean;
}

export const MaintenanceReturnForm: React.FC<MaintenanceReturnFormProps> = ({ onSubmit, loading }) => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [recordId, setRecordId] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listarManutencoes('OPEN')
      .then(setRecords)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!recordId) { setError('Selecione um registro de manutenção.'); return; }

    try {
      await onSubmit(
        recordId,
        cost ? parseFloat(cost) : undefined,
        notes.trim() || undefined,
      );
      setRecordId('');
      setCost('');
      setNotes('');
      // Refresh list
      listarManutencoes('OPEN').then(setRecords).catch(() => {});
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Registre o retorno de um equipamento em manutenção. O status será alterado para "Estoque".
      </p>

      <Select
        label="Registro de Manutenção *"
        value={recordId}
        onChange={(e) => setRecordId(e.target.value)}
        options={records.map((r) => ({
          value: r.id,
          label: `${r.service_tag ?? r.asset_id} — ${r.supplier} (enviado: ${r.sent_at.slice(0, 10)})`,
        }))}
        placeholder={records.length === 0 ? 'Nenhum equipamento em manutenção' : 'Selecione...'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Custo Final (R$)"
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
        placeholder="Serviço realizado, peças trocadas, etc."
        rows={2}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        icon={<CornerDownLeft className="h-4 w-4" />}
        disabled={records.length === 0}
      >
        Registrar Retorno
      </Button>
    </form>
  );
};
