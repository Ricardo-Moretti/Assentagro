import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Monitor,
  Laptop,
  User,
  Building2,
  Cpu,
  HardDrive,
  Calendar,
  Tag,
  GraduationCap,
} from 'lucide-react';
import { obterAtivo } from '@/data/commands';
import { useAppStore } from '@/stores/useAppStore';
import { ASSET_STATUSES } from '@/domain/constants';
import type { Asset } from '@/domain/models';
import { cn } from '@/lib/utils';

interface Props {
  assetId: string | null;
  onClose: () => void;
}

const TRAINING_STATUS = {
  label: 'Treinamento',
  color: 'text-violet-700 dark:text-violet-300',
  bgColor: 'bg-violet-100 dark:bg-violet-900/30',
};

export const AssetQuickViewModal: React.FC<Props> = ({ assetId, onClose }) => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const { viewAsset } = useAppStore();

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      return;
    }
    setLoading(true);
    obterAtivo(assetId)
      .then(setAsset)
      .catch(() => setAsset(null))
      .finally(() => setLoading(false));
  }, [assetId]);

  if (!assetId) return null;

  const statusInfo = asset ? ASSET_STATUSES.find((s) => s.value === asset.status) : null;
  const displayStatus = asset?.is_training ? TRAINING_STATUS : statusInfo;

  const handleViewFull = () => {
    onClose();
    viewAsset(assetId);
  };

  const currentYear = new Date().getFullYear();
  const assetAge = asset?.year ? currentYear - asset.year : null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 z-50 shadow-2xl overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Detalhes do Equipamento
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-agro-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && asset && (
            <>
              {/* Service tag + status */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Service Tag</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {asset.service_tag}
                  </p>
                  {assetAge !== null && assetAge >= 5 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠ {assetAge} anos de uso
                    </p>
                  )}
                </div>
                {displayStatus && (
                  <span
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 mt-1 flex items-center gap-1',
                      displayStatus.bgColor,
                      displayStatus.color,
                    )}
                  >
                    {asset.is_training && <GraduationCap className="h-3 w-3" />}
                    {displayStatus.label}
                  </span>
                )}
              </div>

              {/* Type + Year */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  {asset.equipment_type === 'NOTEBOOK' ? (
                    <Laptop className="h-4 w-4 text-indigo-500 shrink-0" />
                  ) : (
                    <Monitor className="h-4 w-4 text-orange-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Tipo</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {asset.equipment_type === 'NOTEBOOK' ? 'Notebook' : 'Desktop'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Ano</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {asset.year ?? '—'}
                      {assetAge !== null && (
                        <span className="text-xs text-slate-400 ml-1">({assetAge}a)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <User className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Colaborador</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {asset.employee_name ?? '—'}
                  </p>
                </div>
              </div>

              {/* Branch */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Filial</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {asset.branch_name ?? '—'}
                  </p>
                </div>
              </div>

              {/* Model */}
              {asset.model && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Tag className="h-4 w-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Modelo</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{asset.model}</p>
                  </div>
                </div>
              )}

              {/* CPU */}
              {asset.cpu && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Cpu className="h-4 w-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Processador</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{asset.cpu}</p>
                  </div>
                </div>
              )}

              {/* RAM + Storage */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <HardDrive className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Hardware</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {asset.ram_gb}GB RAM · {asset.storage_capacity_gb}GB{' '}
                    {asset.storage_type.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* OS */}
              {asset.os && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Sistema Operacional
                  </p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{asset.os}</p>
                </div>
              )}

              {/* Warranty */}
              {asset.warranty_end && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Garantia
                  </p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    até {new Date(asset.warranty_end).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {/* Notes */}
              {asset.notes && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Observações
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {asset.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {!loading && !asset && assetId && (
            <p className="text-sm text-slate-500 py-8 text-center">
              Equipamento não encontrado.
            </p>
          )}
        </div>

        {/* Footer */}
        {asset && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleViewFull}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Página Completa
            </button>
          </div>
        )}
      </div>
    </>
  );
};
