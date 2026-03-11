export const ptBR = {
  // Sidebar
  'nav.dashboard': 'Dashboard',
  'nav.assets': 'Equipamentos',
  'nav.newAsset': 'Novo Ativo',
  'nav.export': 'Exportar',
  'nav.import': 'Importar',
  'nav.movements': 'Movimentações',
  'nav.audit': 'Auditoria',
  'nav.training': 'Treinamento',
  'nav.settings': 'Configurações',
  'nav.help': 'Ajuda',

  // Actions
  'action.save': 'Salvar',
  'action.cancel': 'Cancelar',
  'action.delete': 'Excluir',
  'action.edit': 'Editar',
  'action.create': 'Cadastrar',
  'action.back': 'Voltar',
  'action.confirm': 'Confirmar',
  'action.export': 'Exportar',
  'action.import': 'Importar',
  'action.search': 'Buscar',
  'action.filter': 'Filtrar',
  'action.clear': 'Limpar',
  'action.print': 'Imprimir',

  // Status
  'status.inUse': 'Em Uso',
  'status.stock': 'Estoque',
  'status.maintenance': 'Manutenção',
  'status.retired': 'Baixado',

  // Asset fields
  'field.serviceTag': 'Service Tag',
  'field.type': 'Tipo de Equipamento',
  'field.status': 'Status',
  'field.branch': 'Filial',
  'field.employee': 'Colaborador',
  'field.ram': 'Memória RAM',
  'field.storage': 'Armazenamento',
  'field.storageType': 'Tipo de Armazenamento',
  'field.os': 'Sistema Operacional',
  'field.cpu': 'Processador',
  'field.model': 'Modelo',
  'field.year': 'Ano',
  'field.notes': 'Observações',
  'field.warranty': 'Garantia',

  // Messages
  'msg.success': 'Operação realizada com sucesso!',
  'msg.error': 'Ocorreu um erro.',
  'msg.confirmDelete': 'Tem certeza que deseja excluir?',
  'msg.loading': 'Carregando...',
  'msg.noResults': 'Nenhum resultado encontrado.',

  // App
  'app.name': 'AssetAgro',
  'app.subtitle': 'Tracbel Agro — TI',
} as const;

export type TranslationKey = keyof typeof ptBR;
