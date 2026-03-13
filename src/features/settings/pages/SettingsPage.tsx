import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Download, Upload, Loader2, Clock } from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/useThemeStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { criarBackup, restaurarBackup, obterConfiguracao } from '@/data/commands';
import type { Theme } from '@/domain/models';

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-5 w-5" /> },
  { value: 'dark', label: 'Escuro', icon: <Moon className="h-5 w-5" /> },
  { value: 'system', label: 'Sistema', icon: <Monitor className="h-5 w-5" /> },
];

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { toast } = useToast();
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);
  const [lastAccess, setLastAccess] = useState<string | null>(null);

  useEffect(() => {
    obterConfiguracao('last_auto_backup').then(setLastAutoBackup).catch(() => {});
    obterConfiguracao('last_access').then(setLastAccess).catch(() => {});
  }, []);

  const handleBackup = async () => {
    try {
      const destino = await save({
        defaultPath: `assetagro-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });
      if (!destino) return;

      setBackingUp(true);
      const path = await criarBackup(destino);
      toast('success', `Backup salvo em: ${path.split(/[/\\]/).pop()}`);
    } catch (e) {
      toast('error', `Falha ao criar backup: ${e}`);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    try {
      const origem = await open({
        multiple: false,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });
      if (!origem) return;

      const filePath = typeof origem === 'string' ? origem : origem;

      setRestoring(true);
      await restaurarBackup(filePath);
      toast('success', 'Banco restaurado com sucesso! Reinicie o aplicativo para garantir consistência.');
    } catch (e) {
      toast('error', `Falha ao restaurar: ${e}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Tema */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Aparência
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Escolha o tema visual do aplicativo.
          </p>
        </div>
        <div className="flex gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors',
                theme === opt.value
                  ? 'border-agro-500 bg-agro-50 dark:bg-agro-950/30 text-agro-700 dark:text-agro-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300',
              )}
            >
              {opt.icon}
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Backup e Restauração
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Faça backup do banco de dados ou restaure a partir de um arquivo anterior.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            onClick={handleBackup}
            disabled={backingUp || restoring}
          >
            {backingUp ? 'Salvando...' : 'Criar Backup'}
          </Button>
          <Button
            variant="secondary"
            icon={restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            onClick={handleRestore}
            disabled={backingUp || restoring}
          >
            {restoring ? 'Restaurando...' : 'Restaurar Backup'}
          </Button>
        </div>

        {/* Info do backup automático */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <Clock className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Backup Automático (a cada 15 dias):</span>{' '}
            {lastAutoBackup
              ? `Último em ${lastAutoBackup}`
              : 'Nenhum backup automático realizado ainda'}
          </div>
        </div>
      </div>

      {/* Sobre */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-agro-600 to-agro-800 flex items-center justify-center shadow-lg flex-shrink-0">
            <Monitor className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AssetAgro
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Sistema de Gestão de Ativos de TI
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Versão</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">0.6.0</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Banco de Dados</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">MySQL 8.0</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Servidor</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">192.168.90.5</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Último Acesso</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{lastAccess || '—'}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Desenvolvido para Tracbel Agro — Departamento de TI
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                © 2025 Tracbel Agro. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
