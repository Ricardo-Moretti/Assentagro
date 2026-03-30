use anyhow::{Context, Result};
use log::info;
use mysql::prelude::*;
use mysql::{OptsBuilder, Pool, PoolConstraints, PoolOpts};
use std::path::Path;
use std::time::Duration;

use super::migrations::executar_migracoes;

/// Configuração de conexão MySQL
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DbConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl Default for DbConfig {
    fn default() -> Self {
        Self {
            host: std::env::var("ASSETAGRO_DB_HOST").unwrap_or_else(|_| "localhost".to_string()),
            port: std::env::var("ASSETAGRO_DB_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3306),
            user: std::env::var("ASSETAGRO_DB_USER").unwrap_or_else(|_| "assetagro".to_string()),
            password: std::env::var("ASSETAGRO_DB_PASS").unwrap_or_else(|_| String::new()),
            database: std::env::var("ASSETAGRO_DB_NAME").unwrap_or_else(|_| "assetagro".to_string()),
        }
    }
}

/// Carrega configuração do arquivo db_config.json ou usa padrão
pub fn carregar_config(diretorio_app: &Path) -> DbConfig {
    let config_path = diretorio_app.join("db_config.json");

    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<DbConfig>(&content) {
                info!("Configuração MySQL carregada de: {:?}", config_path);
                return config;
            }
        }
    }

    // Se não existe, cria arquivo modelo para o usuário preencher
    let default_config = DbConfig::default();
    let _ = std::fs::create_dir_all(diretorio_app);
    let json = serde_json::to_string_pretty(&default_config).unwrap_or_default();
    let _ = std::fs::write(&config_path, &json);
    info!(
        "Arquivo db_config.json criado em: {:?}. Preencha host e password antes de iniciar.",
        config_path
    );

    default_config
}

/// Inicializa a conexão MySQL
pub fn inicializar_banco(diretorio_app: &Path) -> Result<Pool> {
    std::fs::create_dir_all(diretorio_app)
        .with_context(|| format!("Falha ao criar diretório: {:?}", diretorio_app))?;

    let config = carregar_config(diretorio_app);

    info!("Conectando ao MySQL em {}:{}...", config.host, config.port);

    // Pool conservador: min 2, max 5 conexões por instância
    // 16 filiais x 2 usuários x 5 = 80 conexões máx — dentro do limite MySQL (151 default)
    let pool_opts = PoolOpts::new()
        .with_constraints(
            PoolConstraints::new(2, 5)
                .context("Falha ao configurar PoolConstraints")?,
        )
        .with_reset_connection(false);

    let opts = OptsBuilder::new()
        .ip_or_hostname(Some(&config.host))
        .tcp_port(config.port)
        .user(Some(&config.user))
        .pass(Some(&config.password))
        .db_name(Some(&config.database))
        .tcp_connect_timeout(Some(Duration::from_secs(5)))
        .read_timeout(Some(Duration::from_secs(10)))
        .write_timeout(Some(Duration::from_secs(10)))
        .pool_opts(pool_opts);

    let pool = Pool::new(opts)
        .context("Falha ao conectar ao MySQL. Verifique db_config.json")?;

    // Testa conexão
    let mut conn = pool.get_conn().context("Falha ao obter conexão do pool")?;

    // Configura charset
    conn.query_drop("SET NAMES utf8mb4").context("Falha ao configurar charset")?;

    // Executa migrações
    executar_migracoes(&mut conn).context("Falha ao executar migrações")?;

    info!("Banco MySQL inicializado com sucesso.");
    Ok(pool)
}
