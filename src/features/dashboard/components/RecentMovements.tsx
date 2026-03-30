import React, { useEffect, useState } from 'react';
import { UserPlus, CornerDownLeft, ArrowLeftRight, Activity } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { MOVEMENT_TYPE_LABEL } from '@/domain/constants';
import { listarMovimentos } from '@/data/commands';
import type { Movement, MovementType } from '@/domain/models';

const TYPE_CONFIG: Record<MovementType, { icon: React.ReactNode; color: string; bg: string }> = {
  ASSIGN: {
    icon: <UserPlus className="h-3.5 w-3.5" />,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  RETURN: {
    icon: <CornerDownLeft className="h-3.5 w-3.5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  SWAP: {
    icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

interface Props {
  onSelect?: (id: string) => void;
}

export const RecentMovements: React.FC<Props> = ({ onSelect }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarMovimentos(5).then(setMovements).finally(() => setLoading(false));
  }, []);

  if (loading || movements.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Movimentações Recentes
        </h3>
      </div>
      <div className="space-y-2">
        {movements.map((mov) => {
          const config = TYPE_CONFIG[mov.movement_type as MovementType] ?? TYPE_CONFIG.ASSIGN;
          const desc =
            mov.movement_type === 'ASSIGN'
              ? `→ ${mov.to_employee ?? '—'}`
              : mov.movement_type === 'RETURN'
                ? `← ${mov.from_employee ?? '—'}`
                : `${mov.from_employee ?? '—'} ↔ ${mov.to_employee ?? '—'}`;

          return (
            <button
              type="button"
              key={mov.id}
              onClick={() => onSelect?.(mov.asset_id)}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
            >
              <div className={cn('flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0', config.bg, config.color)}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {mov.service_tag}
                  </span>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', config.bg, config.color)}>
                    {MOVEMENT_TYPE_LABEL[mov.movement_type as MovementType]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {desc}
                </p>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                {formatDateTime(mov.created_at)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
