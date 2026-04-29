import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Monitor,
  PlusCircle,
  FileDown,
  FileUp,
  ArrowLeftRight,
  ArrowRightLeft,
  ClipboardList,
  GraduationCap,
  StickyNote,
  Users,
  Settings,
  HelpCircle,
  Tractor,
  Trash2,
  UserX,
  RotateCcw,
  FileSignature,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useRBAC } from '@/hooks/useRBAC';
import type { AppView } from '@/domain/models';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { view: 'assets-list', label: 'Equipamentos', icon: <Monitor className="h-5 w-5" /> },
  { view: 'asset-new', label: 'Novo Ativo', icon: <PlusCircle className="h-5 w-5" /> },
  { view: 'export', label: 'Exportar', icon: <FileDown className="h-5 w-5" /> },
  { view: 'import', label: 'Importar', icon: <FileUp className="h-5 w-5" /> },
  { view: 'movements', label: 'Movimentações', icon: <ArrowLeftRight className="h-5 w-5" /> },
  { view: 'audit', label: 'Auditoria', icon: <ClipboardList className="h-5 w-5" /> },
  { view: 'training', label: 'Treinamento', icon: <GraduationCap className="h-5 w-5" /> },
  { view: 'loans', label: 'Empréstimos', icon: <ArrowRightLeft className="h-5 w-5" /> },
  { view: 'notes', label: 'Observações', icon: <StickyNote className="h-5 w-5" /> },
  { view: 'vendors', label: 'Fornecedores', icon: <Building2 className="h-5 w-5" /> },
  { view: 'software-licenses', label: 'Licenças', icon: <ShieldCheck className="h-5 w-5" /> },
  { view: 'desligados', label: 'Desligados', icon: <UserX className="h-5 w-5" /> },
  { view: 'termos', label: 'Termos', icon: <FileSignature className="h-5 w-5" /> },
  { view: 'disposal', label: 'Descarte', icon: <Trash2 className="h-5 w-5" /> },
  { view: 'trash', label: 'Lixeira', icon: <RotateCcw className="h-5 w-5" /> },
  { view: 'users', label: 'Usuários', icon: <Users className="h-5 w-5" /> },
];

const bottomItems: NavItem[] = [
  { view: 'settings', label: 'Configurações', icon: <Settings className="h-5 w-5" /> },
  { view: 'help', label: 'Ajuda', icon: <HelpCircle className="h-5 w-5" /> },
];

export const Sidebar: React.FC = () => {
  const { currentView, navigateTo } = useAppStore();
  const notifications = useNotifications();
  const { isAdmin } = useRBAC();

  // Filtra itens restritos a admin
  const visibleItems = isAdmin ? navItems : navItems.filter((item) => item.view !== 'users' && item.view !== 'trash');

  // Injeta badges nos items
  const itemsWithBadges = visibleItems.map((item) => {
    if (item.view === 'movements' && notifications.maintenance_open > 0) {
      return { ...item, badge: notifications.maintenance_open };
    }
    if (item.view === 'dashboard' && notifications.aging_count > 0) {
      return { ...item, badge: notifications.aging_count };
    }
    if (item.view === 'assets-list' && notifications.warranty_expiring > 0) {
      return { ...item, badge: notifications.warranty_expiring };
    }
    if (item.view === 'desligados' && notifications.desligados_aguardando > 0) {
      return { ...item, badge: notifications.desligados_aguardando };
    }
    return item;
  });

  return (
    <motion.aside
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -240, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-60 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
    >
      {/* Logo — Tracbel Agro */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gold-600/20 dark:border-gold-900/30 bg-gradient-to-br from-agro-900 via-agro-800 to-agro-900 dark:from-agro-950 dark:via-agro-900 dark:to-agro-950">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-agro-900 shadow-lg shadow-gold-500/20">
          <Tractor className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-wide">
            Controle de Ativos
          </h1>
          <p className="text-[10px] text-gold-300 leading-tight font-medium">
            Tracbel Agro — TI
          </p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {itemsWithBadges.map((item) => (
          <SidebarButton
            key={item.view}
            item={item}
            active={currentView === item.view}
            onClick={() => navigateTo(item.view)}
          />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {bottomItems.map((item) => (
          <SidebarButton
            key={item.view}
            item={item}
            active={currentView === item.view}
            onClick={() => navigateTo(item.view)}
          />
        ))}
      </div>
    </motion.aside>
  );
};

const SidebarButton: React.FC<{
  item: NavItem;
  active: boolean;
  onClick: () => void;
}> = ({ item, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      active
        ? 'bg-agro-50 text-agro-700 dark:bg-agro-950/50 dark:text-agro-400'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
    )}
  >
    {item.icon}
    <span className="flex-1 text-left">{item.label}</span>
    {item.badge != null && item.badge > 0 && (
      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
        {item.badge > 99 ? '99+' : item.badge}
      </span>
    )}
  </button>
);
