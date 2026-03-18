pub mod commands;
pub mod db;

use commands::AppState;
use tauri::Manager;
use tauri::tray::TrayIconBuilder;
use tauri::menu::{MenuBuilder, MenuItemBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Falha ao resolver diretório de dados");

            let pool =
                db::connection::inicializar_banco(&app_dir).expect("Falha ao inicializar banco MySQL");

            app.manage(AppState {
                db: pool,
                app_dir,
            });

            // System tray
            let show_item = MenuItemBuilder::with_id("show", "Abrir AssetAgro").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Sair").build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .tooltip("AssetAgro — Gestão de Ativos")
                .menu(&tray_menu)
                .on_menu_event(move |app_handle, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(w) = app_handle.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Minimizar para tray ao fechar
            let main_window = app.get_webview_window("main").unwrap();
            let win_clone = main_window.clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win_clone.hide();
                }
            });

            log::info!("AssetAgro iniciado com sucesso.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Filiais
            commands::listar_filiais,
            // Ativos — CRUD
            commands::listar_ativos,
            commands::obter_ativo,
            commands::criar_ativo,
            commands::atualizar_ativo,
            commands::excluir_ativo,
            // Dashboard
            commands::obter_dados_dashboard,
            // Exportação
            commands::listar_ativos_para_exportacao,
            // Auditoria
            commands::listar_auditoria,
            // Importação
            commands::importar_ativos,
            // Backup / Restore
            commands::criar_backup,
            commands::restaurar_backup,
            // Movimentações
            commands::atribuir_equipamento,
            commands::reatribuir_equipamento,
            commands::devolver_equipamento,
            commands::trocar_equipamentos,
            commands::listar_movimentos,
            commands::listar_ativos_em_estoque,
            commands::listar_ativos_em_uso,
            // Configurações + Backup automático
            commands::verificar_backup_automatico,
            commands::obter_configuracao,
            // Movimentações por ativo
            commands::listar_movimentos_por_ativo,
            // Colaboradores
            commands::listar_colaboradores,
            commands::criar_colaborador,
            // Manutenção
            commands::enviar_para_manutencao,
            commands::retornar_de_manutencao,
            commands::listar_manutencoes,
            // Operações em lote
            commands::devolver_em_lote,
            commands::baixar_em_lote,
            // Log de acesso
            commands::registrar_acesso,
            // Notebooks de treinamento
            commands::listar_notebooks_treinamento,
            commands::marcar_como_treinamento,
            // Validação de Service Tag
            commands::verificar_service_tag,
            // Alertas de garantia
            commands::listar_alertas_garantia,
            // Anexos
            commands::criar_anexo,
            commands::listar_anexos,
            commands::excluir_anexo,
            // Custos de manutenção
            commands::obter_custos_manutencao,
            // Notificações
            commands::contar_notificacoes,
            commands::ler_log_coletor,
            // Autenticação
            commands::autenticar_usuario,
            commands::criar_usuario,
            commands::listar_usuarios,
            commands::alterar_senha,
            commands::desativar_usuario,
            // Utilitário
            commands::escrever_arquivo,
            // Verificação de conexão
            commands::verificar_conexao,
            // Empréstimos / Retiradas
            commands::criar_emprestimo,
            commands::devolver_emprestimo,
            commands::listar_emprestimos,
            commands::excluir_emprestimo,
            // Observações / Notas
            commands::listar_notas,
            commands::criar_nota,
            commands::atualizar_nota,
            commands::excluir_nota,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar AssetAgro");
}
