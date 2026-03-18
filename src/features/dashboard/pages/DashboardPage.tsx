import React, { useState } from 'react';
import {
  Monitor,
  CheckCircle,
  Package,
  Wrench,
  XCircle,
  Laptop,
  MonitorSpeaker,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { BranchRanking } from '../components/BranchRanking';
import { YearBranchGrid } from '../components/YearBranchGrid';
import { FleetAgeChart } from '../components/FleetAgeChart';
import { BranchStatusChart } from '../components/BranchStatusChart';
import { RecentMovements } from '../components/RecentMovements';
import { AgingAlerts } from '../components/AgingAlerts';
import { WarrantyAlerts } from '../components/WarrantyAlerts';
import { AcquisitionTrend } from '../components/AcquisitionTrend';
import { LoadingState } from '@/components/ui/Spinner';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAppStore } from '@/stores/useAppStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { BRANCHES } from '@/domain/constants';

// Cores dos gráficos
const STATUS_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#94a3b8'];
const TYPE_COLORS = ['#6366f1', '#f97316'];
const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export const DashboardPage: React.FC = () => {
  const [dashBranch, setDashBranch] = useState<string | undefined>(undefined);
  const { data, isLoading } = useDashboardData(dashBranch);
  const { navigateTo } = useAppStore();
  const { setFilters, resetFilters } = useFilterStore();

  if (isLoading || !data) return <LoadingState message="Carregando dashboard..." />;

  const { stats } = data;

  const handleBranchDrill = (branchId: string) => {
    resetFilters();
    setFilters({ branch_id: branchId });
    navigateTo('assets-list');
  };

  const handleStatusDrill = (status: string) => {
    resetFilters();
    setFilters({ status: status as 'IN_USE' | 'STOCK' | 'MAINTENANCE' | 'RETIRED' });
    navigateTo('assets-list');
  };

  // Dados para gráfico de status
  const statusData = [
    { name: 'Em Uso', value: stats.in_use },
    { name: 'Estoque', value: stats.stock },
    { name: 'Manutenção', value: stats.maintenance },
    { name: 'Baixado', value: stats.retired },
  ].filter((d) => d.value > 0);

  // Dados para gráfico de tipo
  const typeData = [
    { name: 'Notebook', value: stats.notebooks },
    { name: 'Desktop', value: stats.desktops },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filtro por filial */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={dashBranch ?? ''}
          onChange={(e) => setDashBranch(e.target.value || undefined)}
          title="Filtrar por filial"
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500/40"
        >
          <option value="">Todas as Filiais</option>
          {BRANCHES.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {dashBranch && (
          <button
            onClick={() => setDashBranch(undefined)}
            className="text-xs text-agro-600 hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Ativos"
          value={stats.total}
          icon={<Monitor className="h-6 w-6 text-slate-600" />}
          color="bg-slate-100 dark:bg-slate-800"
        />
        <StatCard
          label="Em Uso"
          value={stats.in_use}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          color="bg-green-100 dark:bg-green-900/30"
          onClick={() => handleStatusDrill('IN_USE')}
        />
        <StatCard
          label="Estoque"
          value={stats.stock}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100 dark:bg-blue-900/30"
          onClick={() => handleStatusDrill('STOCK')}
        />
        <StatCard
          label="Manutenção"
          value={stats.maintenance}
          icon={<Wrench className="h-6 w-6 text-amber-600" />}
          color="bg-amber-100 dark:bg-amber-900/30"
          onClick={() => handleStatusDrill('MAINTENANCE')}
        />
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Baixados"
          value={stats.retired}
          icon={<XCircle className="h-6 w-6 text-slate-500" />}
          color="bg-slate-100 dark:bg-slate-800"
          onClick={() => handleStatusDrill('RETIRED')}
        />
        <StatCard
          label="Notebooks"
          value={stats.notebooks}
          icon={<Laptop className="h-6 w-6 text-indigo-600" />}
          color="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <StatCard
          label="Desktops"
          value={stats.desktops}
          icon={<MonitorSpeaker className="h-6 w-6 text-orange-600" />}
          color="bg-orange-100 dark:bg-orange-900/30"
        />
        {stats.in_use_no_employee > 0 && (
          <StatCard
            label="Em Uso s/ Colaborador"
            value={stats.in_use_no_employee}
            icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
            color="bg-red-100 dark:bg-red-900/30"
          />
        )}
      </div>

      {/* Alertas de garantia a vencer */}
      <WarrantyAlerts />

      {/* Alertas de envelhecimento */}
      <AgingAlerts />

      {/* Ranking por filial */}
      <BranchRanking data={data.by_branch} onBranchClick={handleBranchDrill} />

      {/* Ano de Máquina por Filial */}
      <YearBranchGrid />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Distribuição por Status */}
        <ChartCard title="Distribuição por Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tw-bg-opacity, #fff)',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Distribuição por Tipo */}
        <ChartCard title="Distribuição por Tipo">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {typeData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[i] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Distribuição por SO */}
        <ChartCard title="Distribuição por SO">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_os} layout="vertical" margin={{ left: 60, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748b' }}
                width={55}
              />
              <Tooltip />
              <Bar dataKey="total" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribuição por RAM */}
        <ChartCard title="Distribuição por RAM">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_ram} margin={{ left: 10, right: 10 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribuição por Armazenamento */}
        <ChartCard title="Tipo de Armazenamento">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.by_storage_type}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="total"
                nameKey="label"
              >
                {data.by_storage_type.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {data.by_storage_type.map((d, i) => (
              <span key={d.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                {d.label} ({d.total})
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Gráficos avançados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FleetAgeChart />
        <BranchStatusChart data={data.by_branch} />
      </div>

      {/* Tendência de cadastros */}
      <AcquisitionTrend data={data.by_month} />

      {/* Movimentações recentes */}
      <RecentMovements />
    </div>
  );
};
