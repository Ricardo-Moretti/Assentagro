import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800',
      'p-5 flex items-center gap-4 shadow-sm',
      onClick && 'cursor-pointer hover:shadow-md hover:border-agro-300 dark:hover:border-agro-700 transition-all',
    )}
  >
    <div className={cn('p-3 rounded-xl', color)}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  </div>
);
