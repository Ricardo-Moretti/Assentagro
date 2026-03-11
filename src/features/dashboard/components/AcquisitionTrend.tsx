import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { TrendPoint } from '@/domain/models';

interface AcquisitionTrendProps {
  data: TrendPoint[];
}

export const AcquisitionTrend: React.FC<AcquisitionTrendProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Formata período "2024-01" → "Jan/24"
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const formatted = data.map((d) => {
    const [year, month] = d.period.split('-');
    const label = `${MONTHS[parseInt(month) - 1]}/${year.slice(2)}`;
    return { ...d, label };
  });

  return (
    <ChartCard title="Tendência de Cadastros (12 meses)">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f1f5f9',
            }}
            formatter={(value: number) => [`${value} equipamentos`, 'Cadastros']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#trendGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
