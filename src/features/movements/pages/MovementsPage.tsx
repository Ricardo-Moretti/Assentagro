import React, { useState, useMemo } from 'react';
import { UserPlus, UserCheck, CornerDownLeft, ArrowLeftRight, Wrench, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useMovements } from '../hooks/useMovements';
import { AssignForm } from '../components/AssignForm';
import { ReturnForm } from '../components/ReturnForm';
import { SwapForm } from '../components/SwapForm';
import { MovementHistory } from '../components/MovementHistory';
import { MaintenanceSendForm } from '../components/MaintenanceSendForm';
import { MaintenanceReturnForm } from '../components/MaintenanceReturnForm';
import { MaintenanceHistory } from '../components/MaintenanceHistory';
import { ReassignForm } from '../components/ReassignForm';
import { enviarParaManutencao, retornarDeManutencao, reatribuirEquipamento } from '@/data/commands';

const PER_PAGE = 10;

type Tab = 'assign' | 'reassign' | 'return' | 'swap' | 'maint-send' | 'maint-return' | 'maint-history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'assign', label: 'Atribuir', icon: <UserPlus className="h-4 w-4" /> },
  { id: 'reassign', label: 'Reatribuir', icon: <UserCheck className="h-4 w-4" /> },
  { id: 'return', label: 'Devolver', icon: <CornerDownLeft className="h-4 w-4" /> },
  { id: 'swap', label: 'Trocar', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: 'maint-send', label: 'Enviar Manut.', icon: <Wrench className="h-4 w-4" /> },
  { id: 'maint-return', label: 'Retorno Manut.', icon: <CornerDownLeft className="h-4 w-4" /> },
  { id: 'maint-history', label: 'Histórico Manut.', icon: <Wrench className="h-4 w-4" /> },
];

export const MovementsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('assign');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const { movements, stockAssets, inUseAssets, loading, assign, returnAsset, swap } = useMovements();
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil(movements.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedMovements = useMemo(
    () => movements.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [movements, safePage],
  );

  if (loading) return <LoadingState />;

  const handleAssign = async (assetId: string, toEmployee: string, reason: string) => {
    setSubmitting(true);
    try {
      const mov = await assign({ asset_id: assetId, to_employee: toEmployee, reason });
      toast('success', `${mov.service_tag} atribuído a ${toEmployee}.`);
    } catch (e) {
      toast('error', `Falha: ${e}`);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (assetId: string, reason: string) => {
    setSubmitting(true);
    try {
      const mov = await returnAsset({ asset_id: assetId, reason });
      toast('success', `${mov.service_tag} devolvido ao estoque.`);
    } catch (e) {
      toast('error', `Falha: ${e}`);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwap = async (assetIdA: string, assetIdB: string, reason: string) => {
    setSubmitting(true);
    try {
      const movs = await swap({ asset_id_a: assetIdA, asset_id_b: assetIdB, reason });
      toast('success', `Troca realizada: ${movs[0]?.service_tag} ↔ ${movs[1]?.service_tag}`);
    } catch (e) {
      toast('error', `Falha: ${e}`);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassign = async (assetId: string, toEmployee: string, reason: string) => {
    setSubmitting(true);
    try {
      const mov = await reatribuirEquipamento({ asset_id: assetId, to_employee: toEmployee, reason });
      toast('success', `${mov.service_tag} reatribuído a ${toEmployee}.`);
    } catch (e) {
      toast('error', `Falha: ${e}`);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaintenanceSend = async (assetId: string, supplier: string, expectedDate?: string, cost?: number, notes?: string) => {
    setSubmitting(true);
    try {
      const rec = await enviarParaManutencao({ asset_id: assetId, supplier, expected_return_date: expectedDate, cost, notes });
      toast('success', `${rec.service_tag ?? 'Equipamento'} enviado para manutenção.`);
    } catch (e) {
      toast('error', `Falha: ${e}`);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaintenanceReturn = async (maintenanceId: string, cost?: number, notes?: string) => {
    setSubmitting(true);
    try {
      const rec = await retornarDeManutencao({ maintenance_id: maintenanceId, cost, notes });
      toast('success', `${rec.service_tag ?? 'Equipamento'} retornou da manutenção.`);
    } catch (e) {
      toast('error', `Falha: ${e}`);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-agro-700 dark:text-agro-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        {activeTab === 'assign' && (
          <AssignForm
            stockAssets={stockAssets}
            onSubmit={handleAssign}
            loading={submitting}
          />
        )}
        {activeTab === 'reassign' && (
          <ReassignForm
            inUseAssets={inUseAssets}
            onSubmit={handleReassign}
            loading={submitting}
          />
        )}
        {activeTab === 'return' && (
          <ReturnForm
            inUseAssets={inUseAssets}
            onSubmit={handleReturn}
            loading={submitting}
          />
        )}
        {activeTab === 'swap' && (
          <SwapForm
            inUseAssets={inUseAssets}
            onSubmit={handleSwap}
            loading={submitting}
          />
        )}
        {activeTab === 'maint-send' && (
          <MaintenanceSendForm
            onSubmit={handleMaintenanceSend}
            loading={submitting}
          />
        )}
        {activeTab === 'maint-return' && (
          <MaintenanceReturnForm
            onSubmit={handleMaintenanceReturn}
            loading={submitting}
          />
        )}
        {activeTab === 'maint-history' && (
          <MaintenanceHistory />
        )}
      </div>

      {/* Histórico */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Histórico de Movimentações
          </h3>
          {movements.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {movements.length} movimentação{movements.length !== 1 ? 'ões' : ''}
            </span>
          )}
        </div>
        <MovementHistory movements={paginatedMovements} />

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-4">
            <PageBtn onClick={() => setPage(1)} disabled={safePage === 1} title="Primeira">
              <ChevronsLeft className="h-4 w-4" />
            </PageBtn>
            <PageBtn onClick={() => setPage(safePage - 1)} disabled={safePage === 1} title="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                return Math.abs(p - safePage) <= 2;
              })
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`dot-${i}`} className="px-1 text-slate-400">...</span>
                ) : (
                  <PageBtn
                    key={p}
                    onClick={() => setPage(p)}
                    active={p === safePage}
                  >
                    {p}
                  </PageBtn>
                ),
              )}
            <PageBtn onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} title="Próxima">
              <ChevronRight className="h-4 w-4" />
            </PageBtn>
            <PageBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages} title="Última">
              <ChevronsRight className="h-4 w-4" />
            </PageBtn>
          </div>
        )}
      </div>
    </div>
  );
};

const PageBtn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}> = ({ children, onClick, disabled, active, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg text-xs font-medium transition-colors',
      active
        ? 'bg-agro-600 text-white'
        : disabled
          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    )}
  >
    {children}
  </button>
);
