import { useEffect, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useToast } from '@/components/ui/Toast';

/**
 * Verifica atualizações na inicialização do app.
 * Para instaladores NSIS (Windows): downloadAndInstall() inicia o instalador,
 * que fecha o app e instala a nova versão sozinho.
 * Aguardamos 3s para o instalador NSIS iniciar antes de relançar.
 *
 * Deve ser usado DENTRO do ToastProvider para mostrar feedback visual.
 */
export function useUpdater() {
  const checked = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    (async () => {
      try {
        const update = await check();
        if (!update?.available) return;

        toast('info', `Nova versão ${update.version} disponível. Baixando atualização...`);

        await update.downloadAndInstall();

        toast('success', 'Atualização instalada! Reiniciando o app...');

        // Aguarda o instalador NSIS iniciar antes de fechar o processo atual
        await new Promise((r) => setTimeout(r, 3000));

        await relaunch();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Trunca mensagens longas de rede (ex: "tcp connect error: ...")
        const resumo = msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
        console.warn('[Updater] Verificação de atualização falhou:', err);
        toast('warning', `Atualização indisponível: ${resumo}`);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
