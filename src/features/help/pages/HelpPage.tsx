import React from 'react';
import {
  Monitor,
  PlusCircle,
  FileDown,
  FileUp,
  LayoutDashboard,
  Search,
  SlidersHorizontal,
  Database,
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Guia de Uso — AssetAgro
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sistema de gestão de ativos de TI para as filiais da Tracbel Agro.
          </p>
        </div>

        <HelpSection
          icon={<LayoutDashboard className="h-5 w-5 text-agro-600" />}
          title="Dashboard"
          content="Visão geral do parque de equipamentos. Mostra totais por status, tipo, filial, SO, RAM e armazenamento. Clique em um card ou filial para ver os detalhes filtrados na lista de equipamentos."
        />

        <HelpSection
          icon={<Monitor className="h-5 w-5 text-agro-600" />}
          title="Equipamentos"
          content="Lista completa de todos os ativos cadastrados. Use a barra de busca para encontrar por Service Tag, nome do colaborador, processador ou sistema operacional."
        />

        <HelpSection
          icon={<SlidersHorizontal className="h-5 w-5 text-agro-600" />}
          title="Filtros"
          content="Clique em 'Filtros' para expandir as opções avançadas: filial, tipo de equipamento, status, RAM, tipo de armazenamento e SO. Combine múltiplos filtros para refinar a busca."
        />

        <HelpSection
          icon={<PlusCircle className="h-5 w-5 text-agro-600" />}
          title="Cadastro de Ativos"
          content={`
            Campos obrigatórios: Service Tag, Tipo, Status, Filial, RAM, Armazenamento, SO.

            Regras:
            • Service Tag deve ser único no sistema
            • Quando status é "Em Uso", o campo Colaborador se torna obrigatório
            • Quando status é "Baixado", recomenda-se informar o motivo nas Observações
            • Para RAM e Armazenamento, use "Outro" para valores fora das opções padrão
          `}
        />

        <HelpSection
          icon={<Search className="h-5 w-5 text-agro-600" />}
          title="Status dos Equipamentos"
          content={`
            • Em Uso — Equipamento atribuído a um colaborador
            • Estoque — Disponível para alocação
            • Manutenção — Em reparo ou aguardando peça
            • Baixado — Desativado permanentemente
          `}
        />

        <HelpSection
          icon={<FileDown className="h-5 w-5 text-agro-600" />}
          title="Exportação Excel"
          content="Gera um arquivo .xlsx com uma aba para cada filial. Pode exportar todas as filiais, apenas as selecionadas, ou o resultado filtrado da listagem. O cabeçalho vem congelado na primeira linha para facilitar a navegação."
        />

        <HelpSection
          icon={<FileUp className="h-5 w-5 text-agro-600" />}
          title="Importação de Dados"
          content={`
            Importe equipamentos a partir de planilhas Excel (.xlsx) ou CSV.

            O sistema identifica automaticamente as colunas, aceitando variações de nome:
            • Service Tag / Tag
            • Tipo / Equipment Type
            • Status (aceita "Em Uso", "Estoque", "Manutenção", "Baixado")
            • Colaborador / Employee / Usuário
            • Filial / Branch (aceita nome ou ID)
            • RAM / Memória
            • Armazenamento / Storage

            Se uma Service Tag já existir, você pode escolher entre pular ou atualizar o registro.
          `}
        />

        <HelpSection
          icon={<Database className="h-5 w-5 text-agro-600" />}
          title="Backup e Restauração"
          content={`
            Em Configurações, você pode:
            • Criar Backup — Salva uma cópia do banco de dados em um arquivo .db
            • Restaurar Backup — Substitui o banco atual por um backup anterior

            Recomenda-se fazer backups periódicos para evitar perda de dados.
          `}
        />
      </div>
    </div>
  );
};

const HelpSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  content: string;
}> = ({ icon, title, content }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 mt-0.5">{icon}</div>
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
        {content.trim()}
      </p>
    </div>
  </div>
);
