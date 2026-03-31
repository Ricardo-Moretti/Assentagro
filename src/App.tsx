import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { ToastProvider } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUpdater } from '@/hooks/useUpdater';
import { OnboardingTour } from '@/components/ui/OnboardingTour';
import { LoginPage } from '@/features/auth/LoginPage';
import type { AppView } from '@/domain/models';

// Pages
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { AssetsListPage } from '@/features/assets/pages/AssetsListPage';
import { AssetNewPage } from '@/features/assets/pages/AssetNewPage';
import { AssetEditPage } from '@/features/assets/pages/AssetEditPage';
import { AssetDetailPage } from '@/features/assets/pages/AssetDetailPage';
import { ExportPage } from '@/features/export/pages/ExportPage';
import { ImportPage } from '@/features/import/pages/ImportPage';
import { MovementsPage } from '@/features/movements/pages/MovementsPage';
import { AuditPage } from '@/features/audit/pages/AuditPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { HelpPage } from '@/features/help/pages/HelpPage';
import { TrainingPage } from '@/features/training/pages/TrainingPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { LoansPage } from '@/features/loans/pages/LoansPage';
import { NotesPage } from '@/features/notes/pages/NotesPage';
import { DescartePage } from '@/features/disposal/pages/DescartePage';
import { DesligadosPage } from '@/features/desligados/pages/DesligadosPage';
import { TrashPage } from '@/features/trash/pages/TrashPage';
import { TermosPage } from '@/features/termos/pages/TermosPage';
import { verificarBackupAutomatico, registrarAcesso } from '@/data/commands';

const ViewRouter: React.FC<{ view: AppView }> = ({ view }) => {
  switch (view) {
    case 'dashboard':
      return <DashboardPage />;
    case 'assets-list':
      return <AssetsListPage />;
    case 'asset-new':
      return <AssetNewPage />;
    case 'asset-edit':
      return <AssetEditPage />;
    case 'asset-detail':
      return <AssetDetailPage />;
    case 'export':
      return <ExportPage />;
    case 'import':
      return <ImportPage />;
    case 'movements':
      return <MovementsPage />;
    case 'audit':
      return <AuditPage />;
    case 'training':
      return <TrainingPage />;
    case 'loans':
      return <LoansPage />;
    case 'notes':
      return <NotesPage />;
    case 'users':
      return <UsersPage />;
    case 'settings':
      return <SettingsPage />;
    case 'help':
      return <HelpPage />;
    case 'disposal':
      return <DescartePage />;
    case 'desligados':
      return <DesligadosPage />;
    case 'trash':
      return <TrashPage />;
    case 'termos':
      return <TermosPage />;
    default:
      return <DashboardPage />;
  }
};

// Conteúdo autenticado — renderizado DENTRO do ToastProvider
// para que useUpdater() e outros hooks possam usar useToast()
const AppContent: React.FC = () => {
  const { currentView } = useAppStore();

  useKeyboardShortcuts();
  useUpdater();

  useEffect(() => {
    verificarBackupAutomatico().catch(() => {});
    registrarAcesso().catch(() => {});
  }, []);

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          <ViewRouter view={currentView} />
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export const App: React.FC = () => {
  const { theme } = useThemeStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Aplica tema no mount
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
  }, [theme]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ToastProvider>
      <AppContent />
      <OnboardingTour />
    </ToastProvider>
  );
};
