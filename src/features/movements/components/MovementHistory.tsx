import React from 'react';
import { UserPlus, CornerDownLeft, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import { MOVEMENT_TYPE_LABEL } from '@/domain/constants';
import type { Movement, MovementType } from '@/domain/models';

interface MovementHistoryProps {
  movements: Movement[];
}

const TYPE_CONFIG: Record<MovementType, { icon: React.ReactNode; color: string; bg: string }> = {
  ASSIGN: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  RETURN: {
    icon: <CornerDownLeft className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  SWAP: {
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

export const MovementHistory: React.FC<MovementHistoryProps> = ({ movements }) => {
  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <p className="text-sm">Nenhuma movimentação registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movements.map((mov) => {
        const config = TYPE_CONFIG[mov.movement_type as MovementType] ?? TYPE_CONFIG.ASSIGN;
        return (
          <div
            key={mov.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            {/* Icon */}
            <div className={cn('flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0', config.bg, config.color)}>
              {config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.bg, config.color)}>
                  {MOVEMENT_TYPE_LABEL[mov.movement_type as MovementType] ?? mov.movement_type}
                </span>
                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                  {mov.service_tag}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {formatMovementDescription(mov)}
              </p>

              {mov.reason && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 italic">
                  {mov.reason}
                </p>
              )}
            </div>

            {/* Date */}
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap flex-shrink-0">
              {formatDateTime(mov.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

function formatMovementDescription(mov: Movement): string {
  switch (mov.movement_type) {
    case 'ASSIGN':
      return `Atribuído a ${mov.to_employee ?? '—'}`;
    case 'RETURN':
      return `Devolvido por ${mov.from_employee ?? '—'}`;
    case 'SWAP':
      return `${mov.from_employee ?? '—'} → ${mov.to_employee ?? '—'}`;
    default:
      return `${mov.from_employee ?? '—'} → ${mov.to_employee ?? '—'}`;
  }
}
