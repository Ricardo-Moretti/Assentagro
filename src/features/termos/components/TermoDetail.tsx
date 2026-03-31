import React, { useState } from 'react';
import {
  ArrowLeft, Send, Download, FileText, CheckCircle2,
  Clock, XCircle, RefreshCw, FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  atualizarTermo,
  escreverArquivo,
  d4signUploadDocumento,
  d4signAdicionarSignatario,
  d4signEnviarParaAssinatura,
  d4signConsultarStatus,
  d4signBaixarAssinado,
} from '@/data/commands';
import { gerarPdfTermo } from './gerarPdfTermo';
import { appDataDir } from '@tauri-apps/api/path';
import type { Termo, StatusTermo } from '@/domain/models';

interface Props {
  termo: Termo;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  return iso.substring(0, 10).split('-').reverse().join('/');
}

const STATUS_CONFIG: Record<StatusTermo, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-slate-100 text-slate-600', icon: <Clock className="w-4 h-4" /> },
  GERADO: { label: 'PDF Gerado', color: 'bg-blue-100 text-blue-700', icon: <FileText className="w-4 h-4" /> },
  ENVIADO: { label: 'Enviado p/ Assinatura', color: 'bg-amber-100 text-amber-700', icon: <Send className="w-4 h-4" /> },
  ASSINADO: { label: 'Assinado', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" /> },
  RECUSADO: { label: 'Recusado', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
};

export const TermoDetail: React.FC<Props> = ({ termo, onBack, onRefresh }) => {
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const sc = STATUS_CONFIG[termo.status as StatusTermo] ?? STATUS_CONFIG.PENDENTE;

  const handleGerarPdf = async () => {
    setGenerating(true);
    try {
      const pdfBytes = await gerarPdfTermo({
        colaborador_nome: termo.colaborador_nome,
        colaborador_email: termo.colaborador_email ?? undefined,
        tipo: termo.tipo,
        responsavel: termo.responsavel,
        observacoes: termo.observacoes ?? undefined,
        data_geracao: termo.data_geracao,
        ativos: (termo.ativos ?? []).map((a) => ({
          service_tag: a.service_tag,
          equipment_type: a.equipment_type,
          model: a.model,
          branch_name: a.branch_name,
        })),
      });

      // Salvar PDF no disco
      const dir = await appDataDir();
      const filename = `termo_${termo.id.slice(0, 8)}_${Date.now()}.pdf`;
      const filepath = `${dir}termos/${filename}`;

      // Criar diretorio e salvar
      await escreverArquivo(filepath, Array.from(pdfBytes));

      // Atualizar termo no banco
      await atualizarTermo(termo.id, {
        status: 'GERADO',
        arquivo_gerado: filepath,
      }, user?.name ?? 'admin');

      toast('success', 'PDF gerado com sucesso');
      await onRefresh();
    } catch (e) {
      toast('error', `Erro ao gerar PDF: ${e}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleEnviarD4Sign = async () => {
    if (!termo.arquivo_gerado) {
      toast('error', 'Gere o PDF antes de enviar');
      return;
    }
    if (!termo.colaborador_email) {
      toast('error', 'Colaborador nao possui email cadastrado');
      return;
    }
    setSending(true);
    try {
      // 1. Upload
      const uploadResp = await d4signUploadDocumento(termo.arquivo_gerado, `Termo_${termo.id.slice(0, 8)}.pdf`);
      const uploadJson = JSON.parse(uploadResp);
      const docUuid = uploadJson.uuid;
      if (!docUuid) throw new Error('UUID do documento nao retornado pelo D4Sign');

      // 2. Adicionar signatario
      await d4signAdicionarSignatario(docUuid, termo.colaborador_email);

      // 3. Enviar para assinatura
      await d4signEnviarParaAssinatura(docUuid);

      // 4. Atualizar termo no banco
      const now = new Date().toISOString();
      await atualizarTermo(termo.id, {
        status: 'ENVIADO',
        d4sign_uuid: docUuid,
        d4sign_status: 'enviado',
        d4sign_enviado_em: now,
      }, user?.name ?? 'admin');

      toast('success', 'Termo enviado para assinatura via D4Sign');
      await onRefresh();
    } catch (e) {
      toast('error', `Erro ao enviar: ${e}`);
    } finally {
      setSending(false);
    }
  };

  const handleConsultarStatus = async () => {
    if (!termo.d4sign_uuid) return;
    setChecking(true);
    try {
      const resp = await d4signConsultarStatus(termo.d4sign_uuid);
      const json = JSON.parse(resp);
      const statusId = json.statusId ?? json[0]?.statusId;

      // D4Sign statusId: 1=processing, 2=waiting, 3=waiting signers, 4=completed, 5=archived, 6=cancelled
      if (statusId === '4' || statusId === 4) {
        // Baixar documento assinado
        const destino = termo.arquivo_gerado?.replace('.pdf', '_assinado.pdf') ?? '';
        if (destino) {
          await d4signBaixarAssinado(termo.d4sign_uuid, destino);
        }
        await atualizarTermo(termo.id, {
          status: 'ASSINADO',
          d4sign_status: 'completed',
          data_assinatura: new Date().toISOString(),
          arquivo_assinado: destino || undefined,
        }, user?.name ?? 'admin');
        toast('success', 'Termo assinado com sucesso!');
      } else if (statusId === '6' || statusId === 6) {
        await atualizarTermo(termo.id, {
          status: 'RECUSADO',
          d4sign_status: 'cancelled',
        }, user?.name ?? 'admin');
        toast('warning', 'Termo foi recusado/cancelado');
      } else {
        toast('info', `Status D4Sign: ${json.statusName ?? JSON.stringify(json)}`);
      }
      await onRefresh();
    } catch (e) {
      toast('error', String(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detalhes do Termo</h2>
        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', sc.color)}>
          {sc.icon} {sc.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info principal */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500">Colaborador</span>
              <p className="font-medium text-slate-900 dark:text-white">{termo.colaborador_nome}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Email</span>
              <p className="text-slate-700 dark:text-slate-300">{termo.colaborador_email ?? '\u2014'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Tipo</span>
              <p className="font-medium text-slate-900 dark:text-white">{termo.tipo}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Responsavel</span>
              <p className="text-slate-700 dark:text-slate-300">{termo.responsavel}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Data Geracao</span>
              <p className="text-slate-700 dark:text-slate-300">{fmtDate(termo.data_geracao)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Data Assinatura</span>
              <p className="text-slate-700 dark:text-slate-300">{fmtDate(termo.data_assinatura)}</p>
            </div>
          </div>

          {termo.observacoes && (
            <div>
              <span className="text-xs text-slate-500">Observacoes</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{termo.observacoes}</p>
            </div>
          )}

          {/* Ativos vinculados */}
          {termo.ativos && termo.ativos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Ativos Vinculados ({termo.ativos.length})
              </h4>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50">
                      <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-300">Service Tag</th>
                      <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-300">Tipo</th>
                      <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-300">Modelo</th>
                      <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-300">Filial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {termo.ativos.map((ta) => (
                      <tr key={ta.id} className="border-t border-slate-100 dark:border-slate-700/50">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{ta.service_tag ?? '\u2014'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{ta.equipment_type ?? '\u2014'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{ta.model ?? '\u2014'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{ta.branch_name ?? '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Painel D4Sign */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Assinatura Digital</h3>

          {termo.d4sign_uuid && (
            <div className="text-xs space-y-1 text-slate-500">
              <p>UUID: <span className="font-mono">{termo.d4sign_uuid.slice(0, 16)}...</span></p>
              <p>Status D4Sign: {termo.d4sign_status ?? '\u2014'}</p>
              <p>Enviado em: {fmtDate(termo.d4sign_enviado_em)}</p>
            </div>
          )}

          <div className="space-y-2">
            {/* Gerar PDF */}
            {termo.status === 'PENDENTE' && !termo.arquivo_gerado && (
              <Button
                className="w-full"
                onClick={handleGerarPdf}
                disabled={generating}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {generating ? 'Gerando PDF...' : 'Gerar PDF do Termo'}
              </Button>
            )}

            {/* Enviar para D4Sign */}
            {(termo.status === 'GERADO' || termo.status === 'PENDENTE') && termo.arquivo_gerado && (
              <Button
                className="w-full"
                onClick={handleEnviarD4Sign}
                disabled={sending || !termo.colaborador_email}
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar para D4Sign'}
              </Button>
            )}

            {/* PDF gerado - info */}
            {termo.arquivo_gerado && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> PDF gerado
              </p>
            )}

            {termo.status === 'ENVIADO' && termo.d4sign_uuid && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleConsultarStatus}
                disabled={checking}
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', checking && 'animate-spin')} />
                {checking ? 'Consultando...' : 'Atualizar Status'}
              </Button>
            )}

            {termo.arquivo_assinado && (
              <Button variant="secondary" className="w-full text-emerald-600">
                <Download className="w-4 h-4 mr-2" />
                Baixar Termo Assinado
              </Button>
            )}

            {!termo.colaborador_email && termo.status !== 'ASSINADO' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Colaborador sem email cadastrado. Necessario para envio via D4Sign.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
