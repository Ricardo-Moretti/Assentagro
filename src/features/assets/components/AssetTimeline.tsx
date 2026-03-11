import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  RotateCcw,
  Wrench,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { listarManutencoes } from '@/data/commands';
import { formatDateTime } from '@/lib/utils';
import type { Movement, MaintenanceRecord } from '@/domain/models';

interface AssetTimelineProps {
  assetId: string;
  movements: Movement[];
}

interface TimelineEvent {
  id: string;
  date: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}

export const AssetTimeline: React.FC<AssetTimelineProps> = ({ assetId, movements }) => {
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    listarManutencoes()
      .then((all) => setMaintenances(all.filter((m) => m.asset_id === assetId)))
      .catch(() => {});
  }, [assetId]);

  // Converte movimentações em eventos
  const movEvents: TimelineEvent[] = movements.map((m) => {
    let icon: React.ReactNode;
    let color: string;
    let title: string;

    switch (m.movement_type) {
      case 'ASSIGN':
        icon = <ArrowRight className="h-3.5 w-3.5" />;
        color = 'bg-green-500';
        title = `Atribuído para ${m.to_employee}`;
        break;
      case 'RETURN':
        icon = <RotateCcw className="h-3.5 w-3.5" />;
        color = 'bg-blue-500';
        title = `Devolvido${m.from_employee ? ` por ${m.from_employee}` : ''}`;
        break;
      case 'SWAP':
        icon = <Activity className="h-3.5 w-3.5" />;
        color = 'bg-purple-500';
        title = `Trocado: ${m.from_employee ?? '?'} → ${m.to_employee ?? '?'}`;
        break;
      default:
        icon = <Activity className="h-3.5 w-3.5" />;
        color = 'bg-slate-500';
        title = m.movement_type;
    }

    return {
      id: m.id,
      date: m.created_at,
      icon,
      color,
      title,
      description: m.reason || '',
    };
  });

  // Converte manutenções em eventos
  const maintEvents: TimelineEvent[] = maintenances.flatMap((m) => {
    const events: TimelineEvent[] = [
      {
        id: `maint-sent-${m.id}`,
        date: m.sent_at,
        icon: <Wrench className="h-3.5 w-3.5" />,
        color: 'bg-amber-500',
        title: `Enviado para manutenção — ${m.supplier}`,
        description: m.notes || '',
      },
    ];
    if (m.returned_at) {
      events.push({
        id: `maint-ret-${m.id}`,
        date: m.returned_at,
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        color: 'bg-emerald-500',
        title: `Retornou de manutenção — ${m.supplier}`,
        description: m.cost ? `Custo: R$ ${m.cost.toFixed(2)}` : '',
      });
    }
    return events;
  });

  // Combina e ordena por data desc
  const allEvents = [...movEvents, ...maintEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (allEvents.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-emerald-600" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Timeline ({allEvents.length})
        </h3>
      </div>

      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-4">
          {allEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 relative">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full ${ev.color} text-white flex items-center justify-center z-10`}>
                {ev.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {ev.title}
                </p>
                {ev.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {ev.description}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatDateTime(ev.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
