import React, { useState } from 'react';
import { CornerDownLeft, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, SafeConfirmDialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { devolverEmLote, baixarEmLote } from '@/data/commands';

interface BatchActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  selectedIds,
  onClear,
  onDone,
}) => {
  const { toast } = useToast();
  const [showReturn, setShowReturn] = useState(false);
  const [showRetire, setShowRetire] = useState(false);
  const [loading, setLoading] = useState(false);

  if (selectedCount === 0) return null;

  const handleBatchReturn = async () => {
    setLoading(true);
    try {
      const movs = await devolverEmLote(selectedIds, 'Devolução em lote');
      toast('success', `${movs.length} equipamento(s) devolvido(s) ao estoque.`);
      onClear();
      onDone();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setLoading(false);
      setShowReturn(false);
    }
  };

  const handleBatchRetire = async () => {
    setLoading(true);
    try {
      const count = await baixarEmLote(selectedIds, 'Baixa em lote');
      toast('success', `${count} equipamento(s) baixado(s).`);
      onClear();
      onDone();
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setLoading(false);
      setShowRetire(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl border border-slate-700">
        <span className="text-sm font-medium">
          {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="w-px h-5 bg-slate-600" />
        <Button
          size="sm"
          variant="secondary"
          icon={<CornerDownLeft className="h-4 w-4" />}
          onClick={() => setShowReturn(true)}
        >
          Devolver ao Estoque
        </Button>
        <Button
          size="sm"
          variant="danger"
          icon={<XCircle className="h-4 w-4" />}
          onClick={() => setShowRetire(true)}
        >
          Baixar
        </Button>
        <button
          onClick={onClear}
          title="Limpar seleção"
          className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ConfirmDialog
        open={showReturn}
        onClose={() => setShowReturn(false)}
        onConfirm={handleBatchReturn}
        title="Devolver em Lote"
        message={`Deseja devolver ${selectedCount} equipamento(s) ao estoque?`}
        confirmLabel="Devolver"
        loading={loading}
      />
      <SafeConfirmDialog
        open={showRetire}
        onClose={() => setShowRetire(false)}
        onConfirm={handleBatchRetire}
        title="Baixar em Lote"
        message={`Esta ação é irreversível. ${selectedCount} equipamento(s) terão o status alterado para "Baixado".`}
        confirmLabel="Baixar"
        loading={loading}
      />
    </>
  );
};
