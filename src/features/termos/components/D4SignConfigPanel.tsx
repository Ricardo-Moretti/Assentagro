import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  obterD4SignConfig,
  salvarD4SignConfig,
  d4signTestarConexao,
  d4signListarCofres,
} from '@/data/commands';
import type { SaveD4SignConfigDto } from '@/domain/models';

interface Props {
  onBack: () => void;
}

export const D4SignConfigPanel: React.FC<Props> = ({ onBack }) => {
  const [config, setConfig] = useState<SaveD4SignConfigDto>({
    habilitado: false,
    token_api: '',
    crypt_key: '',
    cofre_uuid: '',
    base_url: 'https://sandbox.d4sign.com.br/api/v1',
    envio_automatico: false,
    mensagem_email: 'Prezado(a), segue o termo de responsabilidade para assinatura digital.',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [cofres, setCofres] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    obterD4SignConfig().then((c) => {
      if (c) {
        setConfig({
          habilitado: c.habilitado,
          token_api: c.token_api,
          crypt_key: c.crypt_key,
          cofre_uuid: c.cofre_uuid,
          base_url: c.base_url || 'https://sandbox.d4sign.com.br/api/v1',
          envio_automatico: c.envio_automatico,
          mensagem_email: c.mensagem_email,
        });
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await salvarD4SignConfig(config);
      toast('success', 'Configuracao D4Sign salva');
    } catch (e) {
      toast('error', `Erro: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Salvar antes de testar
      await salvarD4SignConfig(config);
      await d4signTestarConexao();
      setTestResult('success');
      toast('success', 'Conexao com D4Sign OK');
    } catch (e) {
      setTestResult('error');
      toast('error', `Falha na conexao: ${e}`);
    } finally {
      setTesting(false);
    }
  };

  const handleListarCofres = async () => {
    try {
      await salvarD4SignConfig(config);
      const resp = await d4signListarCofres();
      setCofres(resp);
      toast('success', 'Cofres carregados');
    } catch (e) {
      toast('error', `Erro: ${e}`);
    }
  };

  const field = (label: string, key: keyof SaveD4SignConfigDto, type: string = 'text', placeholder?: string) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
        value={(config[key] as string) ?? ''}
        onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuracao D4Sign</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credenciais */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Credenciais da API</h3>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.habilitado}
                onChange={(e) => setConfig((prev) => ({ ...prev, habilitado: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">D4Sign habilitado</span>
            </label>
          </div>

          {field('Token API', 'token_api', 'password', 'live_...')}
          {field('Crypt Key', 'crypt_key', 'password', 'live_crypt_...')}
          {field('UUID do Cofre', 'cofre_uuid', 'text', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')}
          {field('URL Base', 'base_url', 'text', 'https://sandbox.d4sign.com.br/api/v1')}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.envio_automatico}
                onChange={(e) => setConfig((prev) => ({ ...prev, envio_automatico: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Envio automatico apos gerar PDF</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem do email</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              value={config.mensagem_email ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, mensagem_email: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {testing ? 'Testando...' : 'Testar Conexao'}
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {testResult === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult === 'success' ? 'Conexao bem sucedida!' : 'Falha na conexao'}
            </div>
          )}
        </div>

        {/* Cofres */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Cofres Disponiveis</h3>
          <p className="text-sm text-slate-500">Clique para listar os cofres da sua conta D4Sign e verificar o UUID.</p>
          <Button variant="secondary" onClick={handleListarCofres}>
            Listar Cofres
          </Button>
          {cofres && (
            <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-60 text-slate-700 dark:text-slate-300">
              {JSON.stringify(JSON.parse(cofres), null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
