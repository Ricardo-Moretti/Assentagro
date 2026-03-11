import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { useAssetForm } from '../hooks/useAssetForm';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/components/ui/Toast';
import {
  BRANCHES,
  EQUIPMENT_TYPES,
  ASSET_STATUSES,
  STORAGE_TYPES,
  RAM_OPTIONS,
  STORAGE_CAPACITY_OPTIONS,
  OS_OPTIONS,
} from '@/domain/constants';
import type { Asset, EquipmentType, AssetStatus, StorageType } from '@/domain/models';

interface AssetFormProps {
  initial?: Asset;
}

export const AssetForm: React.FC<AssetFormProps> = ({ initial }) => {
  const { form, setField, saving, submit, getError, rootError, tagStatus } = useAssetForm(initial);
  const { navigateTo } = useAppStore();
  const { toast } = useToast();
  const [customRam, setCustomRam] = useState(false);
  const [customStorage, setCustomStorage] = useState(false);

  const isEditing = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submit();
    if (result) {
      toast('success', isEditing ? 'Ativo atualizado com sucesso!' : 'Ativo cadastrado com sucesso!');
      navigateTo('assets-list');
    }
  };

  // Verifica se o valor atual de RAM está nas opções
  const ramInOptions = RAM_OPTIONS.includes(form.ram_gb ?? 0);
  const showCustomRam = customRam || (!ramInOptions && (form.ram_gb ?? 0) > 0);

  const storageInOptions = STORAGE_CAPACITY_OPTIONS.some((o) => o.value === form.storage_capacity_gb);
  const showCustomStorage = customStorage || (!storageInOptions && (form.storage_capacity_gb ?? 0) > 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigateTo('assets-list')}
        >
          Voltar
        </Button>
      </div>

      {/* Erro global */}
      {rootError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{rootError}</p>
        </div>
      )}

      {/* Service Tag + Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Input
            label="Service Tag *"
            value={form.service_tag ?? ''}
            onChange={(e) => setField('service_tag', e.target.value.toUpperCase())}
            placeholder="Ex: ABC1234"
            error={getError('service_tag') || (tagStatus === 'taken' ? 'Service Tag já existe no sistema.' : undefined)}
          />
          {tagStatus !== 'idle' && (
            <div className="absolute right-3 top-[34px]">
              {tagStatus === 'checking' && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
              {tagStatus === 'available' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {tagStatus === 'taken' && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
          )}
        </div>
        <Select
          label="Tipo de Equipamento *"
          value={form.equipment_type ?? ''}
          onChange={(e) => setField('equipment_type', e.target.value as EquipmentType)}
          options={EQUIPMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          error={getError('equipment_type')}
        />
      </div>

      {/* Status + Filial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Status *"
          value={form.status ?? ''}
          onChange={(e) => setField('status', e.target.value as AssetStatus)}
          options={ASSET_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          error={getError('status')}
        />
        <Select
          label="Filial *"
          value={form.branch_id ?? ''}
          onChange={(e) => setField('branch_id', e.target.value)}
          options={BRANCHES.map((b) => ({ value: b.id, label: b.name }))}
          error={getError('branch_id')}
        />
      </div>

      {/* Colaborador */}
      <Autocomplete
        label={form.status === 'IN_USE' ? 'Colaborador *' : 'Colaborador'}
        value={form.employee_name ?? ''}
        onChange={(val) => setField('employee_name', val)}
        placeholder="Nome do colaborador"
        error={getError('employee_name')}
        branchId={form.branch_id ?? undefined}
      />

      {/* Aviso para status "Baixado" */}
      <AnimatePresence>
        {form.status === 'RETIRED' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Recomendado preencher as observações com o motivo da baixa.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RAM + Armazenamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RAM */}
        <div>
          {showCustomRam ? (
            <div className="space-y-1.5">
              <Input
                label="Memória RAM (GB) *"
                type="number"
                min={1}
                value={form.ram_gb ?? ''}
                onChange={(e) => setField('ram_gb', parseInt(e.target.value) || 0)}
                error={getError('ram_gb')}
              />
              <button
                type="button"
                onClick={() => { setCustomRam(false); setField('ram_gb', 8); }}
                className="text-xs text-agro-600 hover:underline"
              >
                Voltar para lista
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Select
                label="Memória RAM (GB) *"
                value={String(form.ram_gb ?? '')}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setCustomRam(true);
                    setField('ram_gb', 0);
                  } else {
                    setField('ram_gb', parseInt(e.target.value));
                  }
                }}
                options={[
                  ...RAM_OPTIONS.map((r) => ({ value: String(r), label: `${r} GB` })),
                  { value: 'other', label: 'Outro...' },
                ]}
                error={getError('ram_gb')}
              />
            </div>
          )}
        </div>

        {/* Capacidade de Armazenamento */}
        <div>
          {showCustomStorage ? (
            <div className="space-y-1.5">
              <Input
                label="Armazenamento (GB) *"
                type="number"
                min={1}
                value={form.storage_capacity_gb ?? ''}
                onChange={(e) => setField('storage_capacity_gb', parseInt(e.target.value) || 0)}
                error={getError('storage_capacity_gb')}
              />
              <button
                type="button"
                onClick={() => { setCustomStorage(false); setField('storage_capacity_gb', 256); }}
                className="text-xs text-agro-600 hover:underline"
              >
                Voltar para lista
              </button>
            </div>
          ) : (
            <Select
              label="Armazenamento (GB) *"
              value={String(form.storage_capacity_gb ?? '')}
              onChange={(e) => {
                if (e.target.value === 'other') {
                  setCustomStorage(true);
                  setField('storage_capacity_gb', 0);
                } else {
                  setField('storage_capacity_gb', parseInt(e.target.value));
                }
              }}
              options={[
                ...STORAGE_CAPACITY_OPTIONS.map((s) => ({ value: String(s.value), label: s.label })),
                { value: 'other', label: 'Outro...' },
              ]}
              error={getError('storage_capacity_gb')}
            />
          )}
        </div>

        {/* Tipo de Armazenamento */}
        <Select
          label="Tipo de Armazenamento *"
          value={form.storage_type ?? ''}
          onChange={(e) => setField('storage_type', e.target.value as StorageType)}
          options={STORAGE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
          error={getError('storage_type')}
        />
      </div>

      {/* SO + Processador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Sistema Operacional *"
          value={form.os ?? ''}
          onChange={(e) => setField('os', e.target.value)}
          options={OS_OPTIONS.map((o) => ({ value: o, label: o }))}
          error={getError('os')}
        />
        <Input
          label="Processador"
          value={form.cpu ?? ''}
          onChange={(e) => setField('cpu', e.target.value)}
          placeholder="Ex: Intel Core i5-1235U"
        />
      </div>

      {/* Modelo + Ano */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Modelo"
          value={form.model ?? ''}
          onChange={(e) => setField('model', e.target.value)}
          placeholder="Ex: Dell Latitude 5540"
        />
        <Input
          label="Ano"
          type="number"
          min={2000}
          max={2099}
          value={form.year ?? ''}
          onChange={(e) => setField('year', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="Ex: 2024"
        />
      </div>

      {/* Observações */}
      <Textarea
        label="Observações"
        value={form.notes ?? ''}
        onChange={(e) => setField('notes', e.target.value)}
        placeholder="Informações adicionais sobre o equipamento..."
        rows={3}
      />

      {/* Botão de submissão */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigateTo('assets-list')}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
          {isEditing ? 'Salvar Alterações' : 'Cadastrar Ativo'}
        </Button>
      </div>
    </form>
  );
};
