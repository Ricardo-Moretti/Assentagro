import React, { useState } from 'react';
import { Paperclip, Trash2, Image, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { criarAnexo, excluirAnexo } from '@/data/commands';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { AssetAttachment } from '@/domain/models';

interface AttachmentManagerProps {
  assetId: string;
  attachments: AssetAttachment[];
  onRefresh: () => void;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  assetId,
  attachments,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetAttachment | null>(null);

  const handleUpload = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
          { name: 'Documentos', extensions: ['pdf'] },
          { name: 'Todos', extensions: ['*'] },
        ],
      });
      if (!selected) return;

      setUploading(true);
      await criarAnexo(assetId, selected as string);
      toast('success', 'Anexo adicionado com sucesso!');
      onRefresh();
    } catch (e) {
      toast('error', `Falha ao anexar: ${e}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await excluirAnexo(deleteTarget.id);
      toast('success', 'Anexo removido.');
      onRefresh();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'image') return <Image className="h-5 w-5 text-blue-500" />;
    if (type === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Anexos ({attachments.length})
          </h3>
        </div>
        <Button size="sm" onClick={handleUpload} loading={uploading}>
          Adicionar
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          Nenhum anexo adicionado.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {att.file_type === 'image' ? (
                <img
                  src={convertFileSrc(att.filepath)}
                  alt={att.filename}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-24">
                  {getIcon(att.file_type)}
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                  {att.filename}
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(att)}
                className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remover Anexo"
        message={`Deseja remover "${deleteTarget?.filename}"?`}
        confirmLabel="Remover"
      />
    </div>
  );
};
