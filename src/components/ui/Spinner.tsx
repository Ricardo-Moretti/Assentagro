import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => (
  <svg
    className={cn('animate-spin text-agro-600', sizeMap[size], className)}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// Estado de loading centralizado
export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Carregando...',
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <Spinner size="lg" />
    <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
  </div>
);

// Estado vazio
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
    {icon && (
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
      {title}
    </h3>
    {description && (
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        {description}
      </p>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
