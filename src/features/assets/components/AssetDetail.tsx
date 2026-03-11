import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Trash2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge, TypeBadge, StorageBadge } from '@/components/ui/Badge';
import { SafeConfirmDialog } from '@/components/ui/Dialog';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/useAppStore';
import { obterAtivo, excluirAtivo, listarMovimentosPorAtivo, listarAnexos } from '@/data/commands';
import { AttachmentManager } from './AttachmentManager';
import { AssetTimeline } from './AssetTimeline';
import { QRCodeLabel } from './QRCodeLabel';
import { formatDateTime, formatStorage } from '@/lib/utils';
import type { Asset, Movement, AssetAttachment } from '@/domain/models';

export const AssetDetail: React.FC = () => {
  const { detailAssetId, navigateTo, editAsset } = useAppStore();
  const { toast } = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [attachments, setAttachments] = useState<AssetAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    if (!detailAssetId) return;
    setLoading(true);
    try {
      const a = await obterAtivo(detailAssetId);
      setAsset(a);
    } catch (e) {
      toast('error', `Falha ao carregar ativo: ${e}`);
      console.error('obterAtivo error:', e);
    }
    try {
      const m = await listarMovimentosPorAtivo(detailAssetId);
      setMovements(m);
    } catch {
      setMovements([]);
    }
    try {
      const att = await listarAnexos(detailAssetId);
      setAttachments(att);
    } catch {
      setAttachments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailAssetId]);

  const handleDelete = async () => {
    if (!asset) return;
    setDeleting(true);
    try {
      await excluirAtivo(asset.id);
      toast('success', `Ativo ${asset.service_tag} excluído.`);
      navigateTo('assets-list');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!asset) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigateTo('assets-list')}
        >
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<QrCode className="h-4 w-4" />}
            onClick={() => setShowQR(true)}
          >
            QR Code
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => editAsset(asset.id)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => setShowDelete(true)}
          >
            Excluir
          </Button>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        {/* Service Tag + Badges */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {asset.service_tag}
          </h2>
          <TypeBadge type={asset.equipment_type} />
          <StatusBadge status={asset.status} />
        </div>

        {/* Grid de detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailField label="Filial" value={asset.branch_name ?? '—'} />
          <DetailField label="Colaborador" value={asset.employee_name ?? '—'} />
          <DetailField label="Memória RAM" value={`${asset.ram_gb} GB`} />
          <DetailField
            label="Armazenamento"
            value={`${formatStorage(asset.storage_capacity_gb)}`}
            extra={<StorageBadge type={asset.storage_type} />}
          />
          <DetailField label="Sistema Operacional" value={asset.os || '—'} />
          <DetailField label="Processador" value={asset.cpu || '—'} />
          <DetailField label="Modelo" value={asset.model || '—'} />
          <DetailField label="Ano" value={asset.year ? String(asset.year) : '—'} />
          <DetailField label="Criado em" value={formatDateTime(asset.created_at)} />
          <DetailField label="Atualizado em" value={formatDateTime(asset.updated_at)} />
        </div>

        {/* Observações */}
        {asset.notes && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Observações
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              {asset.notes}
            </p>
          </div>
        )}
      </div>

      {/* Timeline unificada */}
      <AssetTimeline assetId={asset.id} movements={movements} />

      {/* Anexos */}
      <AttachmentManager
        assetId={asset.id}
        attachments={attachments}
        onRefresh={loadData}
      />

      <SafeConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir Ativo"
        message={`Esta ação é irreversível. O ativo "${asset.service_tag}" e todo seu histórico serão permanentemente removidos.`}
        confirmLabel="Excluir"
        loading={deleting}
      />

      {/* QR Code modal */}
      <QRCodeLabel
        open={showQR}
        onClose={() => setShowQR(false)}
        serviceTag={asset.service_tag}
        model={asset.model}
        branchName={asset.branch_name}
      />
    </div>
  );
};

const DetailField: React.FC<{
  label: string;
  value: string;
  extra?: React.ReactNode;
}> = ({ label, value, extra }) => (
  <div>
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
      {label}
    </p>
    <div className="flex items-center gap-2">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {extra}
    </div>
  </div>
);
