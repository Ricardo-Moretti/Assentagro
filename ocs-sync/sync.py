"""
OCS Inventory -> AssetAgro Sync
Sincroniza dados de inventário do OCS Inventory com o banco AssetAgro.
"""

import json
import logging
import logging.handlers
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

import pymysql
import pymysql.cursors

# ---------------------------------------------------------------------------
# Configuração de logging
# ---------------------------------------------------------------------------

LOG_FILE = os.path.join(os.path.dirname(__file__), "ocs-sync.log")


def setup_logging(level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("ocs-sync")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Arquivo com rotação
    fh = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    fh.setFormatter(fmt)

    # Console
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)

    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


# ---------------------------------------------------------------------------
# Carregamento de configuração
# ---------------------------------------------------------------------------

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")


def load_config() -> dict:
    if not os.path.exists(CONFIG_FILE):
        print(f"[ERRO] Arquivo de configuração não encontrado: {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Conexões MySQL
# ---------------------------------------------------------------------------

def connect(cfg: dict, db_name: str) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=cfg["host"],
        port=int(cfg.get("port", 3306)),
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        charset="utf8mb4",
        connect_timeout=10,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


# ---------------------------------------------------------------------------
# Valores inválidos de service tag
# ---------------------------------------------------------------------------

INVALID_TAGS = {
    "", "N/A", "NA", "NONE", "DEFAULT", "TO BE FILLED BY O.E.M.",
    "TO BE FILLED BY OEM", "INVALID", "NOT SPECIFIED", "SYSTEM SERIAL NUMBER",
    "CHASSIS SERIAL NUMBER",
}


def normalizar_service_tag(raw: str | None) -> str | None:
    if raw is None:
        return None
    tag = raw.strip().upper()
    if tag in INVALID_TAGS:
        return None
    return tag


# ---------------------------------------------------------------------------
# Query OCS: hardware principal
# ---------------------------------------------------------------------------

OCS_HARDWARE_SQL = """
SELECT
    h.ID          AS ocs_id,
    h.NAME        AS hostname,
    h.USERID      AS logged_user,
    h.IPADDR      AS ip_address,
    h.OSNAME      AS os_name,
    h.MEMORY      AS ram_mb,
    h.LASTDATE    AS last_seen,
    b.SSN         AS service_tag,
    b.SMANUFACTURER AS manufacturer,
    b.SMODEL      AS bios_model
FROM hardware h
LEFT JOIN bios b ON h.ID = b.HARDWARE_ID
WHERE h.LASTDATE IS NOT NULL
ORDER BY h.LASTDATE DESC
"""

OCS_DRIVES_SQL = """
SELECT LETTER, TOTAL, FREE, TYPE
FROM drives
WHERE HARDWARE_ID = %s AND LETTER = 'C:'
ORDER BY TOTAL DESC
LIMIT 1
"""

OCS_SOFTWARE_SQL = """
SELECT NAME, VERSION, PUBLISHER, INSTALLDATE
FROM softwares
WHERE HARDWARE_ID = %s
ORDER BY NAME
"""

# ---------------------------------------------------------------------------
# Helpers de data/hora
# ---------------------------------------------------------------------------

def now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ocs_date(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(val), fmt)
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Sync principal
# ---------------------------------------------------------------------------

class OcsSyncer:
    def __init__(self, config: dict, logger: logging.Logger):
        self.cfg = config
        self.log = logger
        self.stale_days: int = int(config["sync"].get("stale_days", 90))
        self.create_new: bool = bool(config["sync"].get("create_new_assets", True))
        self.sync_sw: bool = bool(config["sync"].get("sync_software", True))

        # Contadores
        self.total_ocs = 0
        self.updated = 0
        self.created = 0
        self.skipped = 0
        self.errors = 0

    # ------------------------------------------------------------------
    # Conexões
    # ------------------------------------------------------------------

    def _connect_ocs(self) -> pymysql.connections.Connection:
        try:
            conn = connect(self.cfg["ocs"], "OCS")
            self.log.info("Conexão com OCS estabelecida (%s)", self.cfg["ocs"]["host"])
            return conn
        except Exception as exc:
            self.log.error("Falha ao conectar no OCS: %s", exc)
            sys.exit(1)

    def _connect_assetagro(self) -> pymysql.connections.Connection:
        try:
            conn = connect(self.cfg["assetagro"], "AssetAgro")
            self.log.info("Conexão com AssetAgro estabelecida (%s)", self.cfg["assetagro"]["host"])
            return conn
        except Exception as exc:
            self.log.error("Falha ao conectar no AssetAgro: %s", exc)
            sys.exit(1)

    # ------------------------------------------------------------------
    # Busca asset no AssetAgro por service tag
    # ------------------------------------------------------------------

    def _find_asset(self, ag_cur: pymysql.cursors.DictCursor, tag: str) -> dict | None:
        ag_cur.execute(
            "SELECT id, service_tag, status FROM assets WHERE UPPER(service_tag) = %s LIMIT 1",
            (tag.upper(),),
        )
        return ag_cur.fetchone()

    # ------------------------------------------------------------------
    # Atualiza campos OCS no asset existente
    # ------------------------------------------------------------------

    def _update_asset(
        self,
        ag_cur: pymysql.cursors.DictCursor,
        asset_id: str,
        row: dict,
        synced_at: str,
    ) -> None:
        ag_cur.execute(
            """
            UPDATE assets SET
                ocs_id           = %s,
                hostname         = %s,
                ip_address       = %s,
                last_logged_user = %s,
                ocs_last_seen    = %s,
                ocs_synced_at    = %s,
                updated_at       = %s
            WHERE id = %s
            """,
            (
                row["ocs_id"],
                row["hostname"],
                row["ip_address"],
                row["logged_user"],
                str(row["last_seen"]) if row["last_seen"] else None,
                synced_at,
                synced_at,
                asset_id,
            ),
        )

    # ------------------------------------------------------------------
    # Upsert asset_live_data
    # ------------------------------------------------------------------

    def _upsert_live_data(
        self,
        ag_cur: pymysql.cursors.DictCursor,
        ocs_cur: pymysql.cursors.DictCursor,
        asset_id: str,
        ram_mb: int | None,
        hardware_id: int,
        updated_at: str,
    ) -> None:
        # Busca disco C:
        ocs_cur.execute(OCS_DRIVES_SQL, (hardware_id,))
        drive = ocs_cur.fetchone()

        disk_total = None
        disk_free = None
        if drive:
            # OCS armazena em MB
            disk_total = drive.get("TOTAL")
            disk_free = drive.get("FREE")

        ag_cur.execute(
            """
            INSERT INTO asset_live_data
                (asset_id, ram_total_mb, ram_free_mb, disk_c_total_mb, disk_c_free_mb, updated_at)
            VALUES (%s, %s, NULL, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                ram_total_mb    = VALUES(ram_total_mb),
                disk_c_total_mb = VALUES(disk_c_total_mb),
                disk_c_free_mb  = VALUES(disk_c_free_mb),
                updated_at      = VALUES(updated_at)
            """,
            (asset_id, ram_mb, disk_total, disk_free, updated_at),
        )

    # ------------------------------------------------------------------
    # Sync de softwares
    # ------------------------------------------------------------------

    def _sync_software(
        self,
        ag_cur: pymysql.cursors.DictCursor,
        ocs_cur: pymysql.cursors.DictCursor,
        asset_id: str,
        hardware_id: int,
    ) -> None:
        ocs_cur.execute(OCS_SOFTWARE_SQL, (hardware_id,))
        softwares = ocs_cur.fetchall()

        # Remove registros anteriores
        ag_cur.execute("DELETE FROM asset_software WHERE asset_id = %s", (asset_id,))

        # Reinsere
        for sw in softwares:
            sw_id = str(uuid.uuid4())
            ag_cur.execute(
                """
                INSERT INTO asset_software (id, asset_id, name, version, publisher, install_date)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    sw_id,
                    asset_id,
                    (sw.get("NAME") or "")[:255],
                    (sw.get("VERSION") or None),
                    (sw.get("PUBLISHER") or None),
                    (sw.get("INSTALLDATE") or None),
                ),
            )

    # ------------------------------------------------------------------
    # Cria novo asset quando não encontrado no AssetAgro
    # ------------------------------------------------------------------

    def _create_asset(
        self,
        ag_cur: pymysql.cursors.DictCursor,
        row: dict,
        tag: str,
        synced_at: str,
    ) -> str:
        asset_id = str(uuid.uuid4())
        notes = (
            f"[OCS Auto-descoberto] hostname={row['hostname']}, "
            f"ip={row['ip_address']}, os={row.get('os_name', '')}"
        )
        import json as _json
        ag_cur.execute(
            """
            INSERT INTO assets (
                id, service_tag, equipment_type,
                hostname, ip_address, last_logged_user,
                ocs_id, ocs_last_seen, ocs_synced_at,
                status, branch_id,
                ram_gb, storage_capacity_gb, storage_type,
                os, cpu, notes,
                created_at, updated_at
            ) VALUES (
                %s, %s, 'DESKTOP',
                %s, %s, %s,
                %s, %s, %s,
                'STOCK', 'br-pendente',
                0, 0, 'SSD_SATA',
                %s, '', %s,
                %s, %s
            )
            """,
            (
                asset_id,
                tag,
                row["hostname"],
                row["ip_address"],
                row["logged_user"],
                row["ocs_id"],
                str(row["last_seen"]) if row["last_seen"] else None,
                synced_at,
                row.get("os_name") or "",
                notes,
                synced_at,
                synced_at,
            ),
        )

        # Registra na auditoria (schema: id, asset_id, changed_at, changes_json, changed_by)
        audit_id = str(uuid.uuid4())
        changes = _json.dumps({
            "acao": "COLETADO_OCS",
            "hostname": row["hostname"],
            "ip": row["ip_address"],
        }, ensure_ascii=False)
        ag_cur.execute(
            """
            INSERT INTO asset_audit (id, asset_id, changed_at, changes_json, changed_by)
            VALUES (%s, %s, %s, %s, 'ocs-sync')
            """,
            (audit_id, asset_id, synced_at, changes),
        )
        return asset_id

    # ------------------------------------------------------------------
    # Ponto de entrada do sync
    # ------------------------------------------------------------------

    def run(self) -> None:
        t0 = time.monotonic()
        stale_cutoff = datetime.utcnow() - timedelta(days=self.stale_days)

        ocs_conn = self._connect_ocs()
        ag_conn = self._connect_assetagro()

        try:
            with ocs_conn.cursor() as ocs_cur, ag_conn.cursor() as ag_cur:
                # Carrega todo o hardware do OCS
                self.log.info("Buscando hardware no OCS...")
                ocs_cur.execute(OCS_HARDWARE_SQL)
                machines = ocs_cur.fetchall()
                self.total_ocs = len(machines)
                self.log.info("OCS retornou %d máquinas.", self.total_ocs)

                for row in machines:
                    try:
                        self._process_machine(
                            ag_cur, ocs_cur, row, stale_cutoff
                        )
                    except Exception as exc:
                        self.errors += 1
                        tag_raw = row.get("service_tag") or row.get("hostname") or str(row.get("ocs_id"))
                        self.log.error("Erro ao processar [%s]: %s", tag_raw, exc)

                ag_conn.commit()
        finally:
            ocs_conn.close()
            ag_conn.close()

        elapsed = time.monotonic() - t0
        self._print_summary(elapsed)

    # ------------------------------------------------------------------
    # Processa uma máquina do OCS
    # ------------------------------------------------------------------

    def _process_machine(
        self,
        ag_cur: pymysql.cursors.DictCursor,
        ocs_cur: pymysql.cursors.DictCursor,
        row: dict,
        stale_cutoff: datetime,
    ) -> None:
        synced_at = now_str()

        # Verifica dados stale
        last_seen = parse_ocs_date(row.get("last_seen"))
        if last_seen is None or last_seen < stale_cutoff:
            self.skipped += 1
            return

        tag = normalizar_service_tag(row.get("service_tag"))
        hardware_id = row["ocs_id"]
        ram_mb = row.get("ram_mb")

        asset = self._find_asset(ag_cur, tag) if tag else None

        if asset:
            asset_id = asset["id"]
            self._update_asset(ag_cur, asset_id, row, synced_at)
            self._upsert_live_data(ag_cur, ocs_cur, asset_id, ram_mb, hardware_id, synced_at)
            if self.sync_sw:
                self._sync_software(ag_cur, ocs_cur, asset_id, hardware_id)
            self.updated += 1
            self.log.debug(
                "Atualizado asset %s (tag=%s, hostname=%s)", asset_id, tag, row.get("hostname")
            )
        elif self.create_new and tag:
            asset_id = self._create_asset(ag_cur, row, tag, synced_at)
            self._upsert_live_data(ag_cur, ocs_cur, asset_id, ram_mb, hardware_id, synced_at)
            if self.sync_sw:
                self._sync_software(ag_cur, ocs_cur, asset_id, hardware_id)
            self.created += 1
            self.log.info(
                "Criado novo asset %s (tag=%s, hostname=%s)", asset_id, tag, row.get("hostname")
            )
        else:
            self.skipped += 1
            self.log.debug(
                "Ignorado: tag inválida ou create_new_assets=false (hostname=%s)",
                row.get("hostname"),
            )

    # ------------------------------------------------------------------
    # Resumo final
    # ------------------------------------------------------------------

    def _print_summary(self, elapsed: float) -> None:
        line = "\u2550" * 40
        summary = (
            f"\n{line}\n"
            f" OCS \u2192 AssetAgro Sync conclu\u00eddo\n"
            f" Dura\u00e7\u00e3o    : {elapsed:.1f}s\n"
            f" OCS total  : {self.total_ocs} m\u00e1quinas\n"
            f" Atualizadas: {self.updated}\n"
            f" Novas      : {self.created}  (criadas no AssetAgro)\n"
            f" Ignoradas  : {self.skipped}  (stale > {self.stale_days} dias)\n"
            f" Erros      : {self.errors}\n"
            f"{line}"
        )
        self.log.info(summary)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    config = load_config()
    log_level = config.get("sync", {}).get("log_level", "INFO")
    logger = setup_logging(log_level)

    logger.info("=== OCS Sync iniciado ===")
    syncer = OcsSyncer(config, logger)
    syncer.run()


if __name__ == "__main__":
    main()
