// ============================================================
// AssetAgro — Wrappers tipados para Tauri invoke()
// Nomes de parâmetros em snake_case (obrigatório para serde)
// ============================================================

import { invoke } from '@tauri-apps/api/core';
import type {
  Branch,
  Asset,
  CreateAssetDto,
  UpdateAssetDto,
  AssetFilters,
  DashboardData,
  AuditEntry,
  ImportResult,
  Movement,
  AssignDto,
  ReturnDto,
  SwapDto,
  Employee,
  MaintenanceRecord,
  SendMaintenanceDto,
  ReturnMaintenanceDto,
  AssetAttachment,
  WarrantyAlert,
  NotificationCounts,
  MaintenanceCostSummary,
  User,
  LoginDto,
  CreateUserDto,
  ChangePasswordDto,
  AssetLoan,
  CreateLoanDto,
  Nota,
  CreateNotaDto,
  Descarte,
  CreateDescarteDto,
  Desligamento,
  CreateDesligamentoDto,
  DeletedAsset,
  Termo,
  CreateTermoDto,
  UpdateTermoDto,
  D4SignConfig,
  SaveD4SignConfigDto,
  AssetLiveData,
  AssetSoftware,
  Vendor,
  CreateVendorDto,
  UpdateVendorDto,
  SoftwareLicense,
  SoftwareLicenseUsage,
  CreateSoftwareLicenseDto,
  UpdateSoftwareLicenseDto,
} from '@/domain/models';

// Filiais
export const listarFiliais = (): Promise<Branch[]> =>
  invoke('listar_filiais');

// Ativos — CRUD
export const listarAtivos = (filtros?: AssetFilters): Promise<Asset[]> =>
  invoke('listar_ativos', { filtros: filtros ?? null });

export const obterAtivo = (id: string): Promise<Asset> =>
  invoke('obter_ativo', { id });

export const criarAtivo = (dados: CreateAssetDto, usuario: string): Promise<Asset> =>
  invoke('criar_ativo', { dados, usuario });

export const atualizarAtivo = (id: string, dados: UpdateAssetDto, usuario: string): Promise<Asset> =>
  invoke('atualizar_ativo', { id, dados, usuario });

export const excluirAtivo = (id: string, usuario: string, role: string): Promise<void> =>
  invoke('excluir_ativo', { id, usuario, role });

// Dashboard
export const obterDadosDashboard = (branch_id?: string): Promise<DashboardData> =>
  invoke('obter_dados_dashboard', { branch_id: branch_id ?? null });

// Exportação
export const listarAtivosParaExportacao = (
  branch_ids?: string[],
): Promise<Asset[]> =>
  invoke('listar_ativos_para_exportacao', { branch_ids: branch_ids ?? null });

// Auditoria
export const listarAuditoria = (asset_id?: string): Promise<AuditEntry[]> =>
  invoke('listar_auditoria', { asset_id: asset_id ?? null });

// Importação em lote
export const importarAtivos = (
  ativos: CreateAssetDto[],
  modo: 'update' | 'skip',
  usuario: string,
  role: string,
): Promise<ImportResult> =>
  invoke('importar_ativos', { ativos, modo, usuario, role });

// Backup / Restore
export const criarBackup = (destino: string, role: string): Promise<string> =>
  invoke('criar_backup', { destino, role });

export const restaurarBackup = (origem: string, role: string): Promise<void> =>
  invoke('restaurar_backup', { origem, role });

// Movimentações
export const atribuirEquipamento = (dados: AssignDto, usuario: string): Promise<Movement> =>
  invoke('atribuir_equipamento', { dados, usuario });

export const reatribuirEquipamento = (dados: AssignDto, usuario: string): Promise<Movement> =>
  invoke('reatribuir_equipamento', { dados, usuario });

export const devolverEquipamento = (dados: ReturnDto, usuario: string): Promise<Movement> =>
  invoke('devolver_equipamento', { dados, usuario });

export const trocarEquipamentos = (dados: SwapDto, usuario: string): Promise<Movement[]> =>
  invoke('trocar_equipamentos', { dados, usuario });

export const listarMovimentos = (limit?: number): Promise<Movement[]> =>
  invoke('listar_movimentos', { limit: limit ?? null });

export const listarAtivosEmEstoque = (): Promise<Asset[]> =>
  invoke('listar_ativos_em_estoque');

export const listarAtivosEmUso = (): Promise<Asset[]> =>
  invoke('listar_ativos_em_uso');

// Configurações + Backup automático
export const verificarBackupAutomatico = (): Promise<string | null> =>
  invoke('verificar_backup_automatico');

export const obterConfiguracao = (chave: string): Promise<string | null> =>
  invoke('obter_configuracao', { chave });

// Movimentações por ativo
export const listarMovimentosPorAtivo = (asset_id: string): Promise<Movement[]> =>
  invoke('listar_movimentos_por_ativo', { asset_id });

// Colaboradores
export const listarColaboradores = (
  search?: string,
  branch_id?: string,
): Promise<Employee[]> =>
  invoke('listar_colaboradores', {
    search: search ?? null,
    branch_id: branch_id ?? null,
  });

export const criarColaborador = (
  name: string,
  branch_id?: string,
): Promise<Employee> =>
  invoke('criar_colaborador', { name, branch_id: branch_id ?? null });

// Manutenção
export const enviarParaManutencao = (
  dados: SendMaintenanceDto,
  usuario: string,
): Promise<MaintenanceRecord> =>
  invoke('enviar_para_manutencao', { dados, usuario });

export const retornarDeManutencao = (
  dados: ReturnMaintenanceDto,
  usuario: string,
): Promise<MaintenanceRecord> =>
  invoke('retornar_de_manutencao', { dados, usuario });

export const listarManutencoes = (
  status_filter?: string,
): Promise<MaintenanceRecord[]> =>
  invoke('listar_manutencoes', { status_filter: status_filter ?? null });

// Operações em lote
export const devolverEmLote = (
  asset_ids: string[],
  reason: string,
  usuario: string,
): Promise<Movement[]> =>
  invoke('devolver_em_lote', { asset_ids, reason, usuario });

export const baixarEmLote = (
  asset_ids: string[],
  reason: string,
  usuario: string,
  role: string,
): Promise<number> =>
  invoke('baixar_em_lote', { asset_ids, reason, usuario, role });

// Log de acesso
export const registrarAcesso = (): Promise<void> =>
  invoke('registrar_acesso');

// Notebooks de treinamento
export const listarNotebooksTreinamento = (): Promise<Asset[]> =>
  invoke('listar_notebooks_treinamento');

export const marcarComoTreinamento = (
  asset_id: string,
  is_training: boolean,
  usuario: string,
): Promise<Asset> =>
  invoke('marcar_como_treinamento', { asset_id, is_training, usuario });

// Validação de Service Tag
export const verificarServiceTag = (
  tag: string,
  exclude_id?: string,
): Promise<boolean> =>
  invoke('verificar_service_tag', { tag, exclude_id: exclude_id ?? null });

// Alertas de garantia
export const listarAlertasGarantia = (dias?: number): Promise<WarrantyAlert[]> =>
  invoke('listar_alertas_garantia', { dias: dias ?? null });

// Anexos
export const criarAnexo = (
  asset_id: string,
  source_path: string,
): Promise<AssetAttachment> =>
  invoke('criar_anexo', { asset_id, source_path });

export const listarAnexos = (asset_id: string): Promise<AssetAttachment[]> =>
  invoke('listar_anexos', { asset_id });

export const excluirAnexo = (id: string): Promise<void> =>
  invoke('excluir_anexo', { id });

// Custos de manutenção
export const obterCustosManutencao = (
  inicio?: string,
  fim?: string,
): Promise<MaintenanceCostSummary[]> =>
  invoke('obter_custos_manutencao', { inicio: inicio ?? null, fim: fim ?? null });

// Notificações
export const contarNotificacoes = (): Promise<NotificationCounts> =>
  invoke('contar_notificacoes');

export const lerLogColetor = (): Promise<string> =>
  invoke('ler_log_coletor');

// Autenticação
export const autenticarUsuario = (dados: LoginDto): Promise<User> =>
  invoke('autenticar_usuario', { dados });

export const criarUsuario = (dados: CreateUserDto, role: string): Promise<User> =>
  invoke('criar_usuario', { dados, role });

export const listarUsuarios = (): Promise<User[]> =>
  invoke('listar_usuarios');

export const alterarSenha = (dados: ChangePasswordDto, role: string): Promise<void> =>
  invoke('alterar_senha', { dados, role });

export const desativarUsuario = (id: string, role: string): Promise<void> =>
  invoke('desativar_usuario', { id, role });

// Utilitário — escrita de arquivo binário
export const escreverArquivo = (caminho: string, dados: number[]): Promise<void> =>
  invoke('escrever_arquivo', { caminho, dados });

// Para paths escolhidos pelo usuário via diálogo nativo (exportações)
export const escreverArquivoUsuario = (caminho: string, dados: number[]): Promise<void> =>
  invoke('escrever_arquivo_usuario', { caminho, dados });

// Lê qualquer arquivo do sistema de arquivos (sem restrição de escopo do plugin fs)
export const lerArquivoBytes = (caminho: string): Promise<number[]> =>
  invoke('ler_arquivo_bytes', { caminho });

// Verificação de conexão
export const verificarConexao = (): Promise<boolean> =>
  invoke('verificar_conexao');

// Empréstimos
export const criarEmprestimo = (dados: CreateLoanDto, usuario: string): Promise<AssetLoan> =>
  invoke('criar_emprestimo', { dados, usuario });

export const devolverEmprestimo = (
  id: string,
  observacoes: string | undefined,
  usuario: string,
): Promise<AssetLoan> =>
  invoke('devolver_emprestimo', { id, observacoes: observacoes ?? null, usuario });

export const listarEmprestimos = (
  status_filter?: string,
  asset_id?: string,
): Promise<AssetLoan[]> =>
  invoke('listar_emprestimos', {
    status_filter: status_filter ?? null,
    asset_id: asset_id ?? null,
  });

export const excluirEmprestimo = (id: string): Promise<void> =>
  invoke('excluir_emprestimo', { id });

// Observações
export const listarNotas = (categoria?: string): Promise<Nota[]> =>
  invoke('listar_notas', { categoria: categoria ?? null });

export const criarNota = (dados: CreateNotaDto): Promise<Nota> =>
  invoke('criar_nota', { dados });

export const atualizarNota = (
  id: string,
  titulo: string,
  corpo: string,
  categoria: string,
): Promise<Nota> =>
  invoke('atualizar_nota', { id, titulo, corpo, categoria });

export const excluirNota = (id: string): Promise<void> =>
  invoke('excluir_nota', { id });

// Descarte de equipamentos
export const listarCandidatosDescarte = (): Promise<Asset[]> =>
  invoke('listar_candidatos_descarte');

export const criarDescarte = (dados: CreateDescarteDto, usuario: string): Promise<Descarte> =>
  invoke('criar_descarte', { dados, usuario });

export const listarDescartes = (status?: string): Promise<Descarte[]> =>
  invoke('listar_descartes', { status: status ?? null });

export const concluirDescarte = (id: string, usuario: string): Promise<Descarte> =>
  invoke('concluir_descarte', { id, usuario });

export const cancelarDescarte = (id: string, usuario: string): Promise<Descarte> =>
  invoke('cancelar_descarte', { id, usuario });

export const reativarAtivo = (id: string, usuario: string): Promise<Asset> =>
  invoke('reativar_ativo', { id, usuario });

// Desligamento de colaboradores
export const desligarColaborador = (dados: CreateDesligamentoDto, usuario: string): Promise<Desligamento> =>
  invoke('desligar_colaborador', { dados, usuario });

export const listarDesligamentos = (status?: string): Promise<Desligamento[]> =>
  invoke('listar_desligamentos', { status: status ?? null });

export const listarDesligamentosPorAtivo = (assetId: string): Promise<Desligamento[]> =>
  invoke('listar_desligamentos_por_ativo', { asset_id: assetId });

export const confirmarDevolucao = (id: string, usuario: string): Promise<Desligamento> =>
  invoke('confirmar_devolucao', { id, usuario });

export const cancelarDesligamento = (id: string): Promise<Desligamento> =>
  invoke('cancelar_desligamento', { id });

// Lixeira
export const listarAtivosExcluidos = (): Promise<DeletedAsset[]> =>
  invoke('listar_ativos_excluidos');

export const restaurarAtivo = (id: string, usuario: string, role: string): Promise<Asset> =>
  invoke('restaurar_ativo', { id, usuario, role });

// ============================================================
// Termos de responsabilidade
// ============================================================

export const criarTermo = (dados: CreateTermoDto, usuario: string): Promise<Termo> =>
  invoke('criar_termo', { dados, usuario });

export const obterTermo = (id: string): Promise<Termo> =>
  invoke('obter_termo', { id });

export const listarTermos = (status?: string, tipo?: string): Promise<Termo[]> =>
  invoke('listar_termos', { status: status ?? null, tipo: tipo ?? null });

export const listarTermosPorAtivo = (assetId: string): Promise<Termo[]> =>
  invoke('listar_termos_por_ativo', { asset_id: assetId });

export const atualizarTermo = (id: string, dados: UpdateTermoDto, usuario: string): Promise<Termo> =>
  invoke('atualizar_termo', { id, dados, usuario });

export const excluirTermo = (id: string, usuario: string): Promise<void> =>
  invoke('excluir_termo', { id, usuario });

// ============================================================
// Configuração D4Sign
// ============================================================

export const obterD4SignConfig = (): Promise<D4SignConfig | null> =>
  invoke('obter_d4sign_config');

export const salvarD4SignConfig = (dados: SaveD4SignConfigDto): Promise<D4SignConfig> =>
  invoke('salvar_d4sign_config', { dados });

export const d4signTestarConexao = (): Promise<string> =>
  invoke('d4sign_testar_conexao');

export const d4signListarCofres = (): Promise<string> =>
  invoke('d4sign_listar_cofres');

export const d4signUploadDocumento = (filepath: string, filename: string): Promise<string> =>
  invoke('d4sign_upload_documento', { filepath, filename });

export const d4signAdicionarSignatario = (documentoUuid: string, email: string): Promise<string> =>
  invoke('d4sign_adicionar_signatario', { documentoUuid, email });

export const d4signEnviarParaAssinatura = (documentoUuid: string): Promise<string> =>
  invoke('d4sign_enviar_para_assinatura', { documentoUuid });

export const d4signConsultarStatus = (documentoUuid: string): Promise<string> =>
  invoke('d4sign_consultar_status', { documentoUuid });

export const d4signBaixarAssinado = (documentoUuid: string, destino: string): Promise<string> =>
  invoke('d4sign_baixar_assinado', { documentoUuid, destino });

// OCS — Saúde e Softwares
export const obterLiveData = (id: string): Promise<AssetLiveData> =>
  invoke('obter_live_data', { id });

export const listarSoftwaresAtivo = (id: string): Promise<AssetSoftware[]> =>
  invoke('listar_softwares_ativo', { id });

// Fornecedores
export const listarFornecedores = (): Promise<Vendor[]> =>
  invoke('listar_fornecedores');

export const criarFornecedor = (dados: CreateVendorDto): Promise<Vendor> =>
  invoke('criar_fornecedor', { dados });

export const atualizarFornecedor = (id: string, dados: UpdateVendorDto): Promise<Vendor> =>
  invoke('atualizar_fornecedor', { id, dados });

export const excluirFornecedor = (id: string): Promise<void> =>
  invoke('excluir_fornecedor', { id });

// Licenças de Software
export const listarLicencas = (): Promise<SoftwareLicense[]> =>
  invoke('listar_licencas');

export const listarUsoLicencas = (): Promise<SoftwareLicenseUsage[]> =>
  invoke('listar_uso_licencas');

export const criarLicenca = (dados: CreateSoftwareLicenseDto): Promise<SoftwareLicense> =>
  invoke('criar_licenca', { dados });

export const atualizarLicenca = (id: string, dados: UpdateSoftwareLicenseDto): Promise<SoftwareLicense> =>
  invoke('atualizar_licenca', { id, dados });

export const excluirLicenca = (id: string): Promise<void> =>
  invoke('excluir_licenca', { id });
