import { useEffect, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Verifica atualizações na inicialização do app.
 * Para instaladores NSIS (Windows): downloadAndInstall() inicia o instalador,
 * que fecha o app e instala a nova versão sozinho.
 * Aguardamos 3s para o instalador NSIS iniciar antes de relançar.
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

        console.info(`[Updater] Nova versão ${update.version} disponível. Baixando...`);

        await update.downloadAndInstall();

        // Aguarda o instalador NSIS iniciar antes de fechar o processo atual
        await new Promise((r) => setTimeout(r, 3000));

        await relaunch();
      } catch (err) {
        // Falha silenciosa — rede indisponível ou servidor offline
        console.warn('[Updater] Verificação de atualização falhou:', err);
      }
    })();
  }, []);
}
