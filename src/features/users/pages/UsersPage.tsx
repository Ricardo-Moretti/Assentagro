import React, { useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, User as UserIcon, XCircle, ShieldAlert } from 'lucide-react';
import { listarUsuarios, criarUsuario, desativarUsuario } from '@/data/commands';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import type { User, CreateUserDto } from '@/domain/models';

export const UsersPage: React.FC = () => {
  const { isAdmin, role } = useRBAC();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
        <ShieldAlert className="h-12 w-12 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          Acesso restrito
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Somente administradores podem gerenciar usuarios.
        </p>
      </div>
    );
  }
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateUserDto>({
    username: '',
    password: '',
    name: '',
    role: 'user',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listarUsuarios();
      setUsers(data);
    } catch (err) {
      console.error('Erro ao listar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      await criarUsuario(form, role);
      setForm({ username: '', password: '', name: '', role: 'user' });
      setShowForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Erro ao criar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deseja realmente desativar este usuário?')) return;
    try {
      await desativarUsuario(id, role);
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao desativar usuário:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gerenciar Usuários
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastre, visualize e gerencie os usuários do sistema.
          </p>
        </div>
        <Button
          icon={<UserPlus className="h-4 w-4" />}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancelar' : 'Criar Usuário'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Novo Usuário
          </h2>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
                  'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                  'text-slate-900 dark:text-white placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
                )}
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Usuário (login) *
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
                  'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                  'text-slate-900 dark:text-white placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
                )}
                placeholder="Ex: joao.silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
                  'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                  'text-slate-900 dark:text-white placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
                )}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Perfil
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' })}
                title="Perfil do usuário"
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
                  'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                  'text-slate-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
                )}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Nenhum usuário cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {u.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                        u.role === 'admin'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                      )}
                    >
                      {u.role === 'admin' ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <UserIcon className="h-3 w-3" />
                      )}
                      {u.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                        u.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
                      )}
                    >
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.active && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        title="Desativar usuário"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Desativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
