import React, { useEffect, useState, useMemo } from 'react';
import { Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { listarAtivos } from '@/data/commands';
import type { Asset } from '@/domain/models';

const AGE_COLORS = ['#94a3b8', '#f59e0b', '#3b82f6', '#22c55e', '#6366f1'];

export const FleetAgeChart: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarAtivos().then(setAssets).finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const ranges: { label: string; min: number; max: number }[] = [
      { label: `≤ ${currentYear - 5}`, min: 0, max: currentYear - 5 },
      { label: `${currentYear - 4}-${currentYear - 3}`, min: currentYear - 4, max: currentYear - 3 },
      { label: `${currentYear - 2}-${currentYear - 1}`, min: currentYear - 2, max: currentYear - 1 },
      { label: `${currentYear}+`, min: currentYear, max: 9999 },
      { label: 'S/Ano', min: -1, max: -1 },
    ];

    return ranges.map((r) => ({
      name: r.label,
      total: assets.filter((a) => {
        if (r.min === -1) return a.year === null;
        return a.year !== null && a.year >= r.min && a.year <= r.max;
      }).length,
    }));
  }, [assets]);

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Idade da Frota
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 70, right: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            width={65}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
