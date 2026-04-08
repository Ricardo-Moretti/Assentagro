import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Trash2, QrCode, FileSignature, Send, CheckCircle2, Clock, XCircle, FileText, PackageX, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { StatusBadge, TypeBadge, StorageBadge } from '@/components/ui/Badge';
import { SafeConfirmDialog } from '@/components/ui/Dialog';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRBAC } from '@/hooks/useRBAC';
import { obterAtivo, excluirAtivo, listarMovimentosPorAtivo, listarAnexos, listarDesligamentosPorAtivo, listarTermosPorAtivo, criarTermo, criarDescarte, reativarAtivo } from '@/data/commands';
import { AttachmentManager } from './AttachmentManager';
import { AssetTimeline } from './AssetTimeline';
import { QRCodeLabel } from './QRCodeLabel';
import { formatDateTime, formatStorage } from '@/lib/utils';
import { UserX } from 'lucide-react';
import type { Asset, Movement, AssetAttachment, Desligamento, Termo, DescarteMotivo } from '@/domain/models';

export const AssetDetail: React.FC = () => {
  const { detailAssetId, navigateTo, editAsset } = useAppStore();
  const { toast } = useToast();
  const { isAdmin } = useRBAC();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [attachments, setAttachments] = useState<AssetAttachment[]>([]);
  const [desligamentos, setDesligamentos] = useState<Desligamento[]>([]);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingTermo, setCreatingTermo] = useState(false);
  const [reativando, setReativando] = useState(false);
  const [showDescarte, setShowDescarte] = useState(false);
  const [descarteMotivo, setDescarteMotivo] = useState<DescarteMotivo>('OBSOLESCENCIA');
  const [descarteDestino, setDescarteDestino] = useState('');
  const [descarteResponsavel, setDescarteResponsavel] = useState('');
  const [descarteData, setDescarteData] = useState('');
  const [descarteObs, setDescarteObs] = useState('');
  const [savingDescarte, setSavingDescarte] = useState(false);

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
    try {
      const d = await listarDesligamentosPorAtivo(detailAssetId);
      setDesligamentos(d);
    } catch {
      setDesligamentos([]);
    }
    try {
      const t = await listarTermosPorAtivo(detailAssetId);
      setTermos(t);
    } catch {
      setTermos([]);
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
      const userName = useAuthStore.getState().user?.name ?? 'sistema';
      const userRole = useAuthStore.getState().user?.role ?? 'user';
      await excluirAtivo(asset.id, userName, userRole);
      toast('success', `Ativo ${asset.service_tag} excluído.`);
      navigateTo('assets-list');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const MOTIVO_LABEL: Record<DescarteMotivo, string> = {
    OBSOLESCENCIA: 'Obsolescência', DEFEITO_IRREPARAVEL: 'Defeito Irreparável',
    FURTO: 'Furto', PERDA: 'Perda', DOACAO: 'Doação', VENDA: 'Venda', OUTRO: 'Outro',
  };

  const openDescarte = () => {
    setDescarteMotivo('OBSOLESCENCIA');
    setDescarteDestino('');
    setDescarteResponsavel(useAuthStore.getState().user?.name ?? '');
    setDescarteData('');
    setDescarteObs('');
    setShowDescarte(true);
  };

  const handleSalvarDescarte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !descarteDestino.trim() || !descarteResponsavel.trim()) return;
    setSavingDescarte(true);
    try {
      const userName = useAuthStore.getState().user?.name ?? 'sistema';
      await criarDescarte(
        {
          asset_id: asset.id,
          motivo: descarteMotivo,
          destino: descarteDestino.trim(),
          responsavel: descarteResponsavel.trim(),
          data_prevista: descarteData || undefined,
          observacoes: descarteObs.trim() || undefined,
          registrado_por: userName,
        },
        userName,
      );
      toast('success', `Descarte agendado para ${asset.service_tag}.`);
      setShowDescarte(false);
    } catch (err) {
      toast('error', `Erro ao agendar descarte: ${err}`);
    } finally {
      setSavingDescarte(false);
    }
  };

  const handleReativar = async () => {
    if (!asset) return;
    setReativando(true);
    try {
      const userName = useAuthStore.getState().user?.name ?? 'sistema';
      await reativarAtivo(asset.id, userName);
      toast('success', `${asset.service_tag} reativado e voltou para Estoque.`);
      loadData();
    } catch (err) {
      toast('error', `Erro ao reativar: ${err}`);
    } finally {
      setReativando(false);
    }
  };

  const handleGerarTermo = async () => {
    if (!asset || !asset.employee_name) return;
    setCreatingTermo(true);
    try {
      const userName = useAuthStore.getState().user?.name ?? 'admin';
      await criarTermo(
        {
          colaborador_nome: asset.employee_name,
          asset_ids: [asset.id],
          tipo: 'ENTREGA',
          responsavel: userName,
        },
        userName,
      );
      toast('success', `Termo de entrega criado para ${asset.employee_name}`);
      loadData();
    } catch (e) {
      toast('error', `Erro ao criar termo: ${e}`);
    } finally {
      setCreatingTermo(false);
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
          {asset.employee_name && asset.status === 'IN_USE' && (
            <Button
              variant="secondary"
              size="sm"
              icon={<FileSignature className="h-4 w-4" />}
              onClick={handleGerarTermo}
              disabled={creatingTermo}
            >
              {creatingTermo ? 'Gerando...' : 'Gerar Termo'}
            </Button>
          )}
          {asset.status === 'RETIRED' ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={handleReativar}
              disabled={reativando}
            >
              {reativando ? 'Reativando...' : 'Reativar'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<PackageX className="h-4 w-4" />}
              onClick={openDescarte}
            >
              Descarte
            </Button>
          )}
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
          {isAdmin && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDelete(true)}
            >
              Excluir
            </Button>
          )}
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

      {/* Historico de desligamentos */}
      {desligamentos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-200 dark:border-orange-800/40 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Historico de Colaboradores Desligados
            </h3>
          </div>
          <div className="space-y-2">
            {desligamentos.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {d.employee_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Desligado em {new Date(d.data_desligamento).toLocaleDateString('pt-BR')}
                    {d.status === 'DEVOLVIDO' && d.data_devolucao && (
                      <> {' \u2014 '} Equipamento devolvido em {new Date(d.data_devolucao).toLocaleDateString('pt-BR')}</>
                    )}
                    {d.status === 'AGUARDANDO' && (
                      <> {' \u2014 '} <span className="text-orange-600 dark:text-orange-400 font-medium">Aguardando devolucao</span></>
                    )}
                    {d.status === 'CANCELADO' && (
                      <> {' \u2014 '} <span className="text-slate-400">Cancelado</span></>
                    )}
                  </p>
                </div>
                <span className={
                  d.status === 'DEVOLVIDO'
                    ? 'text-[10px] px-2 py-0.5 rounded-full font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30'
                    : d.status === 'AGUARDANDO'
                    ? 'text-[10px] px-2 py-0.5 rounded-full font-medium text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30'
                    : 'text-[10px] px-2 py-0.5 rounded-full font-medium text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'
                }>
                  {d.status === 'DEVOLVIDO' ? 'Devolvido' : d.status === 'AGUARDANDO' ? 'Aguardando' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline unificada */}
      <AssetTimeline assetId={asset.id} movements={movements} />

      {/* Termos de responsabilidade */}
      {termos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Termos de Responsabilidade ({termos.length})
            </h3>
          </div>
          <div className="space-y-2">
            {termos.map((t) => {
              const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                PENDENTE: { label: 'Pendente', color: 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800', icon: <Clock className="w-3 h-3" /> },
                GERADO: { label: 'PDF Gerado', color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30', icon: <FileText className="w-3 h-3" /> },
                ENVIADO: { label: 'Enviado', color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30', icon: <Send className="w-3 h-3" /> },
                ASSINADO: { label: 'Assinado', color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30', icon: <CheckCircle2 className="w-3 h-3" /> },
                RECUSADO: { label: 'Recusado', color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30', icon: <XCircle className="w-3 h-3" /> },
              };
              const sc = statusMap[t.status] ?? statusMap.PENDENTE;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Termo de {t.tipo === 'ENTREGA' ? 'Entrega' : t.tipo === 'DEVOLUCAO' ? 'Devolucao' : 'Troca'}
                      <span className="text-slate-400 ml-2 font-normal">
                        {t.colaborador_nome}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(t.data_geracao).toLocaleDateString('pt-BR')}
                      {t.responsavel && <> {' \u2014 '} por {t.responsavel}</>}
                      {t.data_assinatura && <> {' \u2014 '} Assinado em {new Date(t.data_assinatura).toLocaleDateString('pt-BR')}</>}
                    </p>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium', sc.color)}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Modal Agendar Descarte */}
      {showDescarte && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDescarte(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Agendar Descarte</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {asset.service_tag} · {asset.branch_name ?? '—'}
                  </p>
                </div>
                <button type="button" title="Fechar" onClick={() => setShowDescarte(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleSalvarDescarte} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={descarteMotivo}
                    onChange={(e) => setDescarteMotivo(e.target.value as DescarteMotivo)}
                    title="Motivo do descarte"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500/40"
                  >
                    {(Object.keys(MOTIVO_LABEL) as DescarteMotivo[]).map((k) => (
                      <option key={k} value={k}>{MOTIVO_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Destino <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ECO Eletrônicos SP, Doação à escola X…"
                    value={descarteDestino}
                    onChange={(e) => setDescarteDestino(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Responsável <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do responsável pelo descarte"
                    value={descarteResponsavel}
                    onChange={(e) => setDescarteResponsavel(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Data Prevista</label>
                  <input
                    type="date"
                    title="Data prevista para o descarte"
                    value={descarteData}
                    onChange={(e) => setDescarteData(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Informações adicionais…"
                    value={descarteObs}
                    onChange={(e) => setDescarteObs(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500/40 resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDescarte(false)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingDescarte || !descarteDestino.trim() || !descarteResponsavel.trim()}
                    className="flex-1 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {savingDescarte ? 'Agendando…' : 'Agendar Descarte'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
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
