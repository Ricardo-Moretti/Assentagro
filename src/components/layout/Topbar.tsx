import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Moon, Sun, PlusCircle, Search, X, LogOut, UserCircle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/Button';
import { listarAtivos, verificarConexao } from '@/data/commands';
import { cn } from '@/lib/utils';
import type { AppView, Asset } from '@/domain/models';

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Dashboard',
  'assets-list': 'Equipamentos',
  'asset-new': 'Novo Ativo',
  'asset-edit': 'Editar Ativo',
  'asset-detail': 'Detalhes do Ativo',
  export: 'Exportar Excel',
  import: 'Importar Dados',
  movements: 'Movimentações',
  audit: 'Auditoria',
  training: 'Equipamentos de Treinamento',
  loans: 'Empréstimos e Retiradas',
  notes: 'Observações',
  users: 'Gerenciar Usuários',
  settings: 'Configurações',
  help: 'Ajuda',
  disposal: 'Descarte de Equipamentos',
  desligados: 'Colaboradores Desligados',
  trash: 'Lixeira',
  termos: 'Termos de Responsabilidade',
  'd4sign-config': 'Configuracao D4Sign',
  vendors: 'Fornecedores',
  'software-licenses': 'Licenças de Software',
};

export const Topbar: React.FC = () => {
  const { currentView, toggleSidebar, navigateTo, viewAsset } = useAppStore();
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();

  const [connected, setConnected] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('dark');
  };

  const doSearch = useCallback((term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    listarAtivos({ search: term })
      .then((assets) => {
        setResults(assets.slice(0, 8));
        setShowDropdown(true);
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, []);

  const handleChange = (value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (id: string) => {
    setShowDropdown(false);
    setSearchTerm('');
    setResults([]);
    viewAsset(id);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setShowDropdown(false);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Check MySQL connection status every 60 seconds
  useEffect(() => {
    const checkConnection = () => {
      verificarConexao()
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    };
    checkConnection();
    const interval = setInterval(checkConnection, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-slate-500" />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {VIEW_TITLES[currentView]}
        </h2>
      </div>

      {/* Global Search */}
      <div ref={wrapperRef} className="relative w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar equipamento..."
            value={searchTerm}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowDropdown(false); }}
            className={cn(
              'w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border transition-colors',
              'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
            )}
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              title="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {searching && (
              <div className="px-4 py-3 text-sm text-slate-500">Buscando...</div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">Nenhum resultado encontrado.</div>
            )}
            {results.map((asset) => (
              <button
                key={asset.id}
                onClick={() => handleSelect(asset.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                    {asset.service_tag}
                  </span>
                  <span className="text-xs text-slate-500">{asset.equipment_type}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {asset.employee_name || '—'} · {asset.branch_name || '—'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" title={connected ? 'Conectado ao servidor' : 'Sem conexão com o servidor'}>
          <div className={cn(
            'h-2 w-2 rounded-full',
            connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          )} />
          <span className={cn(
            'text-xs font-medium',
            connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Alternar tema"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : (
            <Moon className="h-5 w-5 text-slate-500" />
          )}
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {user?.name || user?.username || 'Usuário'}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group"
            title="Sair do sistema"
          >
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
          </button>
        </div>

        {currentView !== 'asset-new' && (
          <Button
            size="sm"
            icon={<PlusCircle className="h-4 w-4" />}
            onClick={() => navigateTo('asset-new')}
          >
            Novo Ativo
          </Button>
        )}
      </div>
    </header>
  );
};
