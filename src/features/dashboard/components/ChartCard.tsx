import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
      {title}
    </h3>
    {children}
  </div>
);
