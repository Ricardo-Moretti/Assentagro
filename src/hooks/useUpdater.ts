import { useEffect, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Verifica atualizações na inicialização do app.
 * Se encontrar uma nova versão, baixa e reinstala silenciosamente,
 * depois relança o app automaticamente.
 */
export function useUpdater() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    (async () => {
      try {
        const update = await check();
        if (!update?.available) return;

        console.info(`[Updater] Nova versão disponível: ${update.version}. Atualizando...`);

        await update.downloadAndInstall();
        await relaunch();
      } catch (err) {
        // Falha silenciosa — rede indisponível ou servidor offline
        console.warn('[Updater] Verificação de atualização falhou:', err);
      }
    })();
  }, []);
}
