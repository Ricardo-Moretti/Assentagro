import React, { useState } from 'react';
import { CornerDownLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { RETURN_REASONS } from '@/domain/constants';
import type { Asset } from '@/domain/models';

interface ReturnFormProps {
  inUseAssets: Asset[];
  onSubmit: (assetId: string, reason: string) => Promise<void>;
  loading: boolean;
}

export const ReturnForm: React.FC<ReturnFormProps> = ({ inUseAssets, onSubmit, loading }) => {
  const [assetId, setAssetId] = useState('');
  const [reasonSelect, setReasonSelect] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [observation, setObservation] = useState('');
  const [terminationDate, setTerminationDate] = useState('');
  const [error, setError] = useState('');

  const selectedAsset = inUseAssets.find((a) => a.id === assetId);
  const isOther = reasonSelect === 'Outro';
  const isTermination = reasonSelect === 'Desligamento';
  const baseReason = isOther ? customReason.trim() : reasonSelect;

  const buildFinalReason = (): string => {
    let reason = baseReason;
    if (isTermination && terminationDate) {
      reason += ` | Data: ${terminationDate}`;
    }
    if (observation.trim()) {
      reason += ` | Obs: ${observation.trim()}`;
    }
    return reason;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assetId) { setError('Selecione um equipamento.'); return; }
    if (!baseReason) { setError('Informe o motivo da devolucao.'); return; }
    if (isTermination && !observation.trim()) {
      setError('Para desligamento, a observacao e obrigatoria.');
      return;
    }

    try {
      await onSubmit(assetId, buildFinalReason());
      setAssetId('');
      setReasonSelect('');
      setCustomReason('');
      setObservation('');
      setTerminationDate('');
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Devolva um equipamento em uso ao estoque. O colaborador sera desvinculado e o status voltara para "Estoque".
      </p>

      <Select
        label="Equipamento (Em Uso) *"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
        options={inUseAssets.map((a) => ({
          value: a.id,
          label: `${a.service_tag} — ${a.employee_name ?? '?'} (${a.branch_name ?? ''})`,
        }))}
        placeholder={inUseAssets.length === 0 ? 'Nenhum equipamento em uso' : 'Selecione...'}
      />

      <Input
        label="Colaborador"
        value={selectedAsset?.employee_name ?? ''}
        readOnly
        placeholder="Selecione um equipamento acima"
        className="bg-slate-50 dark:bg-slate-800/50 cursor-default"
      />

      {selectedAsset && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Filial:</span> {selectedAsset.branch_name ?? '—'}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Service Tag:</span> <span className="font-mono">{selectedAsset.service_tag}</span>
          </p>
          {selectedAsset.model && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium">Modelo:</span> {selectedAsset.model}
            </p>
          )}
        </div>
      )}

      <Select
        label="Motivo *"
        value={reasonSelect}
        onChange={(e) => setReasonSelect(e.target.value)}
        options={RETURN_REASONS.map((r) => ({ value: r, label: r }))}
      />

      {isOther && (
        <Input
          label="Especifique o motivo *"
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Descreva o motivo da devolucao"
        />
      )}

      {isTermination && (
        <>
          <Input
            label="Data do Desligamento"
            type="date"
            value={terminationDate}
            onChange={(e) => setTerminationDate(e.target.value)}
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Para desligamentos, a observacao abaixo e obrigatoria. Registre detalhes relevantes sobre a devolucao do equipamento.
            </p>
          </div>
        </>
      )}

      {(isTermination || reasonSelect) && (
        <Textarea
          label={isTermination ? 'Observacao *' : 'Observacao'}
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          placeholder={isTermination
            ? 'Descreva os detalhes do desligamento e estado do equipamento...'
            : 'Informacoes adicionais (opcional)'}
          rows={3}
        />
      )}

      {/* Painel de confirmacao */}
      {selectedAsset && baseReason && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Confirme a devolucao:
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <span className="font-medium">Equipamento:</span> <span className="font-mono">{selectedAsset.service_tag}</span>
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <span className="font-medium">Colaborador:</span> {selectedAsset.employee_name}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <span className="font-medium">Filial:</span> {selectedAsset.branch_name}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <span className="font-medium">Motivo:</span> {baseReason}
          </p>
          {isTermination && terminationDate && (
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <span className="font-medium">Data Desligamento:</span> {terminationDate}
            </p>
          )}
          {observation.trim() && (
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <span className="font-medium">Obs:</span> {observation.trim()}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        icon={<CornerDownLeft className="h-4 w-4" />}
        disabled={inUseAssets.length === 0}
      >
        Devolver ao Estoque
      </Button>
    </form>
  );
};
