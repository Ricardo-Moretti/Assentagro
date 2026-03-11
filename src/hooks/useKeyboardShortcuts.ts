import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export function useKeyboardShortcuts() {
  const { navigateTo, currentView } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignora quando foco está em input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            navigateTo('asset-new');
            break;
          case 'e':
            e.preventDefault();
            navigateTo('export');
            break;
          case 'k':
            e.preventDefault();
            navigateTo('assets-list');
            break;
        }
      }

      if (e.key === 'Escape') {
        // Esc volta para lista ou dashboard
        if (currentView !== 'dashboard' && currentView !== 'assets-list') {
          e.preventDefault();
          navigateTo('assets-list');
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigateTo, currentView]);
}
