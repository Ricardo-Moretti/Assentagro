import React from 'react';
import { Building2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BranchCount } from '@/domain/models';

interface BranchStatusChartProps {
  data: BranchCount[];
}

export const BranchStatusChart: React.FC<BranchStatusChartProps> = ({ data }) => {
  // Filter branches with at least 1 asset and sort by total desc
  const chartData = data
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((b) => ({
      name: b.branch_name.length > 10 ? b.branch_name.slice(0, 10) + '...' : b.branch_name,
      'Em Uso': b.in_use,
      Estoque: b.stock,
      'Manut.': b.maintenance,
      Baixado: b.retired,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Status por Filial
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 75, right: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={70}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          />
          <Bar dataKey="Em Uso" stackId="a" fill="#22c55e" />
          <Bar dataKey="Estoque" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Manut." stackId="a" fill="#f59e0b" />
          <Bar dataKey="Baixado" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
