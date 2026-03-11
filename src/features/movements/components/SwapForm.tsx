import React, { useState } from 'react';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { Asset } from '@/domain/models';

interface SwapFormProps {
  inUseAssets: Asset[];
  onSubmit: (assetIdA: string, assetIdB: string, reason: string) => Promise<void>;
  loading: boolean;
}

const AssetInfoCard: React.FC<{ asset: Asset; side: string }> = ({ asset, side }) => (
  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{side}</p>
    <p className="text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium">Colaborador:</span> {asset.employee_name ?? '—'}
    </p>
    <p className="text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium">Service Tag:</span> <span className="font-mono">{asset.service_tag}</span>
    </p>
    <p className="text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium">Filial:</span> {asset.branch_name ?? '—'}
    </p>
    {asset.model && (
      <p className="text-sm text-slate-700 dark:text-slate-300">
        <span className="font-medium">Modelo:</span> {asset.model}
      </p>
    )}
    {asset.year && (
      <p className="text-sm text-slate-700 dark:text-slate-300">
        <span className="font-medium">Ano:</span> {asset.year}
      </p>
    )}
  </div>
);

export const SwapForm: React.FC<SwapFormProps> = ({ inUseAssets, onSubmit, loading }) => {
  const [assetIdA, setAssetIdA] = useState('');
  const [assetIdB, setAssetIdB] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const assetA = inUseAssets.find((a) => a.id === assetIdA);
  const assetB = inUseAssets.find((a) => a.id === assetIdB);

  // Filtrar para não selecionar o mesmo equipamento
  const optionsA = inUseAssets.filter((a) => a.id !== assetIdB);
  const optionsB = inUseAssets.filter((a) => a.id !== assetIdA);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assetIdA || !assetIdB) { setError('Selecione os dois equipamentos.'); return; }
    if (assetIdA === assetIdB) { setError('Selecione equipamentos diferentes.'); return; }

    try {
      await onSubmit(assetIdA, assetIdB, reason.trim());
      setAssetIdA('');
      setAssetIdB('');
      setReason('');
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Troque os equipamentos entre dois colaboradores. Cada um receberá a máquina do outro.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Select
            label="Equipamento A *"
            value={assetIdA}
            onChange={(e) => setAssetIdA(e.target.value)}
            options={optionsA.map((a) => ({
              value: a.id,
              label: `${a.service_tag} — ${a.employee_name ?? '?'} (${a.branch_name ?? ''})`,
            }))}
            placeholder={inUseAssets.length < 2 ? 'Mínimo 2 em uso' : 'Selecione...'}
          />
          {assetA && <AssetInfoCard asset={assetA} side="Lado A" />}
        </div>

        <div className="space-y-3">
          <Select
            label="Equipamento B *"
            value={assetIdB}
            onChange={(e) => setAssetIdB(e.target.value)}
            options={optionsB.map((a) => ({
              value: a.id,
              label: `${a.service_tag} — ${a.employee_name ?? '?'} (${a.branch_name ?? ''})`,
            }))}
            placeholder={inUseAssets.length < 2 ? 'Mínimo 2 em uso' : 'Selecione...'}
          />
          {assetB && <AssetInfoCard asset={assetB} side="Lado B" />}
        </div>
      </div>

      {/* Painel de confirmação */}
      {assetA && assetB && (
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
            Confirme a troca:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="p-3 rounded-lg bg-white/60 dark:bg-slate-800/60 space-y-1">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Equipamento A</p>
              <p className="text-sm font-mono font-medium text-purple-800 dark:text-purple-200">{assetA.service_tag}</p>
              <p className="text-xs text-purple-700 dark:text-purple-300">{assetA.employee_name}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">{assetA.branch_name ?? '—'}</p>
            </div>
            <div className="flex justify-center">
              <div className="flex items-center gap-1 text-purple-500">
                <ArrowRight className="h-4 w-4 rotate-180" />
                <ArrowLeftRight className="h-5 w-5" />
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-slate-800/60 space-y-1">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Equipamento B</p>
              <p className="text-sm font-mono font-medium text-purple-800 dark:text-purple-200">{assetB.service_tag}</p>
              <p className="text-xs text-purple-700 dark:text-purple-300">{assetB.employee_name}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">{assetB.branch_name ?? '—'}</p>
            </div>
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 space-y-0.5">
            <p><span className="font-mono">{assetA.service_tag}</span> ({assetA.employee_name}) <span className="font-medium">→</span> {assetB.employee_name}</p>
            <p><span className="font-mono">{assetB.service_tag}</span> ({assetB.employee_name}) <span className="font-medium">→</span> {assetA.employee_name}</p>
          </div>
        </div>
      )}

      <Textarea
        label="Observação"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo da troca (opcional)"
        rows={2}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        icon={<ArrowLeftRight className="h-4 w-4" />}
        disabled={inUseAssets.length < 2}
      >
        Confirmar Troca
      </Button>
    </form>
  );
};
