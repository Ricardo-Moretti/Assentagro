import React, { useState } from 'react';
import { FileDown, FileText, Check, BarChart3, Users, GitCompare, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useExport, type ExportScope } from '../hooks/useExport';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { listarAtivosParaExportacao, obterDadosDashboard } from '@/data/commands';
import { generatePdf } from '../utils/generatePdf';
import { generateExecutivePdf } from '../utils/generateExecutivePdf';
import { BRANCHES, EQUIPMENT_TYPES, ASSET_STATUSES } from '@/domain/constants';
import { cn } from '@/lib/utils';
import { MaintenanceCostReport } from '../components/MaintenanceCostReport';
import { RelatorioColaborador } from '../components/RelatorioColaborador';
import { RelatorioFiliais } from '../components/RelatorioFiliais';
import { RelatorioManutencoes } from '../components/RelatorioManutencoes';
import type { AssetStatus, EquipmentType } from '@/domain/models';

type Tab = 'inventario' | 'executivo' | 'colaboradores' | 'filiais' | 'manutencoes';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'inventario',   label: 'Inventário',    icon: <FileDown className="h-4 w-4" /> },
  { id: 'executivo',    label: 'Executivo',     icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'colaboradores',label: 'Colaboradores', icon: <Users className="h-4 w-4" /> },
  { id: 'filiais',      label: 'Filiais',       icon: <GitCompare className="h-4 w-4" /> },
  { id: 'manutencoes',  label: 'Manutenções',   icon: <Wrench className="h-4 w-4" /> },
];

export const ExportPage: React.FC = () => {
  const { exportToXlsx, exporting, progress } = useExport();
  const { assets } = useAssets();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('inventario');
  const [scope, setScope] = useState<ExportScope>('all');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingExecutive, setGeneratingExecutive] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<AssetStatus[]>([]);
  const [filterType, setFilterType] = useState<EquipmentType | ''>('');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');

  const toggleBranch = (id: string) => {
    setSelectedBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const applyInlineFilters = (data: typeof assets) => {
    let filtered = data;
    if (filterStatuses.length > 0) {
      filtered = filtered.filter((a) => filterStatuses.includes(a.status));
    }
    if (filterType) {
      filtered = filtered.filter((a) => a.equipment_type === filterType);
    }
    if (filterYearFrom) {
      const from = parseInt(filterYearFrom);
      filtered = filtered.filter((a) => a.year !== null && a.year >= from);
    }
    if (filterYearTo) {
      const to = parseInt(filterYearTo);
      filtered = filtered.filter((a) => a.year !== null && a.year <= to);
    }
    return filtered;
  };

  const hasInlineFilters = filterStatuses.length > 0 || !!filterType || !!filterYearFrom || !!filterYearTo;

  const handleExport = async () => {
    if (hasInlineFilters && scope !== 'filtered') {
      const branchIds = scope === 'selected' ? selectedBranches : undefined;
      const data = await listarAtivosParaExportacao(branchIds);
      exportToXlsx('filtered', undefined, applyInlineFilters(data));
    } else {
      exportToXlsx(
        scope,
        scope === 'selected' ? selectedBranches : undefined,
        scope === 'filtered' ? applyInlineFilters(assets) : undefined,
      );
    }
  };

  const handlePdf = async () => {
    setGeneratingPdf(true);
    try {
      const branchIds = scope === 'selected' ? selectedBranches : undefined;
      const raw = scope === 'filtered' ? assets : await listarAtivosParaExportacao(branchIds);
      const data = hasInlineFilters ? applyInlineFilters(raw) : raw;
      generatePdf(data);
      toast('success', 'PDF gerado com sucesso!');
    } catch (e) {
      toast('error', `Falha ao gerar PDF: ${e}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleExecutivePdf = async () => {
    setGeneratingExecutive(true);
    try {
      const [dashboardData, allAssets] = await Promise.all([
        obterDadosDashboard(),
        listarAtivosParaExportacao(),
      ]);
      generateExecutivePdf(dashboardData, allAssets);
      toast('success', 'Relatório executivo gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setGeneratingExecutive(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Tab navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-agro-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inventário */}
      {activeTab === 'inventario' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Exportar Inventário
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gera um arquivo .xlsx com uma aba para cada filial selecionada.
            </p>
          </div>

          {/* Escopo */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              O que exportar?
            </label>
            <div className="space-y-2">
              {([
                { value: 'all', label: 'Todas as filiais', desc: 'Exporta todos os equipamentos de todas as 16 filiais' },
                { value: 'selected', label: 'Filiais selecionadas', desc: 'Escolha quais filiais incluir na exportação' },
                { value: 'filtered', label: 'Resultado filtrado', desc: `Exporta os ${assets.length} equipamento(s) da listagem atual` },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors',
                    scope === opt.value
                      ? 'border-agro-500 bg-agro-50 dark:bg-agro-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      scope === opt.value
                        ? 'border-agro-600 bg-agro-600'
                        : 'border-slate-300 dark:border-slate-600',
                    )}
                  >
                    {scope === opt.value && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Seleção de filiais */}
          {scope === 'selected' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Selecione as filiais
                </label>
                <button
                  onClick={() =>
                    setSelectedBranches(
                      selectedBranches.length === BRANCHES.length
                        ? []
                        : BRANCHES.map((b) => b.id),
                    )
                  }
                  className="text-xs text-agro-600 hover:underline"
                >
                  {selectedBranches.length === BRANCHES.length
                    ? 'Desmarcar todas'
                    : 'Selecionar todas'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BRANCHES.map((branch) => {
                  const selected = selectedBranches.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      onClick={() => toggleBranch(branch.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                        selected
                          ? 'border-agro-500 bg-agro-50 text-agro-700 dark:bg-agro-950/30 dark:text-agro-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300',
                      )}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtros inline */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filtros adicionais (opcional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Status</label>
                <div className="space-y-1">
                  {ASSET_STATUSES.map((s) => (
                    <label key={s.value} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={filterStatuses.includes(s.value)}
                        onChange={() =>
                          setFilterStatuses((prev) =>
                            prev.includes(s.value) ? prev.filter((v) => v !== s.value) : [...prev, s.value],
                          )
                        }
                        className="rounded border-slate-300"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as EquipmentType | '')}
                  title="Filtrar por tipo"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <option value="">Todos</option>
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ano (de)</label>
                <input
                  type="number"
                  min={2000}
                  max={2099}
                  value={filterYearFrom}
                  onChange={(e) => setFilterYearFrom(e.target.value)}
                  placeholder="2000"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ano (até)</label>
                <input
                  type="number"
                  min={2000}
                  max={2099}
                  value={filterYearTo}
                  onChange={(e) => setFilterYearTo(e.target.value)}
                  placeholder="2099"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
            {hasInlineFilters && (
              <button
                onClick={() => { setFilterStatuses([]); setFilterType(''); setFilterYearFrom(''); setFilterYearTo(''); }}
                className="text-xs text-agro-600 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Botões */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handleExport}
              loading={exporting}
              disabled={(scope === 'selected' && selectedBranches.length === 0) || generatingPdf}
              icon={<FileDown className="h-4 w-4" />}
              size="lg"
            >
              Exportar Excel
            </Button>
            <Button
              onClick={handlePdf}
              loading={generatingPdf}
              disabled={(scope === 'selected' && selectedBranches.length === 0) || exporting}
              variant="secondary"
              icon={<FileText className="h-4 w-4" />}
              size="lg"
            >
              Gerar PDF
            </Button>
            {progress && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {progress}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Executivo */}
      {activeTab === 'executivo' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-agro-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Relatório Executivo
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                PDF profissional com KPIs, distribuição por filial, indicadores de atenção e equipamentos envelhecidos. Ideal para apresentações gerenciais.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              { label: '8 KPIs estratégicos', desc: 'Total, em uso, estoque, manutenção e mais' },
              { label: 'Distribuição por filial', desc: 'Tabela completa das 16 unidades' },
              { label: 'Indicadores de atenção', desc: 'Envelhecimento, sem colaborador, manutenções' },
              { label: 'Layout profissional', desc: 'Identidade visual Tracbel Agro com rodapé numerado' },
            ].map((f) => (
              <div key={f.label} className="flex gap-2 p-3 rounded-xl bg-agro-50 dark:bg-agro-950/20 border border-agro-100 dark:border-agro-900/30">
                <Check className="h-4 w-4 text-agro-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{f.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handleExecutivePdf}
              loading={generatingExecutive}
              icon={<FileText className="h-4 w-4" />}
              size="lg"
            >
              Gerar Relatório Executivo PDF
            </Button>
          </div>
        </div>
      )}

      {/* Colaboradores */}
      {activeTab === 'colaboradores' && <RelatorioColaborador />}

      {/* Filiais */}
      {activeTab === 'filiais' && <RelatorioFiliais />}

      {/* Manutenções */}
      {activeTab === 'manutencoes' && (
        <div className="space-y-6">
          <RelatorioManutencoes />
          <MaintenanceCostReport />
        </div>
      )}
    </div>
  );
};
