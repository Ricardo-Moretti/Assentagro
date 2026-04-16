"""
Testa as conexões com OCS e AssetAgro antes de rodar o sync completo.
Uso: python testar-conexao.py
"""

import json
import os
import sys

try:
    import pymysql
except ImportError:
    print("[ERRO] pymysql não instalado. Rode: pip install pymysql")
    sys.exit(1)

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

def load_config():
    if not os.path.exists(CONFIG_FILE):
        print(f"[ERRO] config.json não encontrado em: {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def testar(nome: str, cfg: dict) -> bool:
    print(f"\n── Testando {nome} ──────────────────────────")
    print(f"   Host    : {cfg['host']}:{cfg.get('port', 3306)}")
    print(f"   Database: {cfg['database']}")
    print(f"   Usuário : {cfg['user']}")
    try:
        conn = pymysql.connect(
            host=cfg["host"],
            port=int(cfg.get("port", 3306)),
            database=cfg["database"],
            user=cfg["user"],
            password=cfg["password"],
            connect_timeout=10,
            cursorclass=pymysql.cursors.DictCursor,
        )
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION() AS v")
            row = cur.fetchone()
            print(f"   ✅ Conectado! MySQL {row['v']}")

            if nome == "OCS":
                cur.execute("SELECT COUNT(*) AS total FROM hardware")
                r = cur.fetchone()
                print(f"   📦 Máquinas no OCS: {r['total']}")

                cur.execute("""
                    SELECT COUNT(*) AS total FROM hardware
                    WHERE LASTDATE >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                """)
                r = cur.fetchone()
                print(f"   🟢 Ativas (últimos 90 dias): {r['total']}")

                cur.execute("SELECT COUNT(*) AS total FROM softwares")
                r = cur.fetchone()
                print(f"   💾 Registros de software: {r['total']}")

            elif nome == "AssetAgro":
                cur.execute("SELECT COUNT(*) AS total FROM assets WHERE deleted_at IS NULL")
                r = cur.fetchone()
                print(f"   📦 Ativos cadastrados: {r['total']}")

                cur.execute("SELECT COALESCE(MAX(version),0) AS v FROM schema_version")
                r = cur.fetchone()
                print(f"   🗄️  Schema version: {r['v']}")

        conn.close()
        return True

    except pymysql.err.OperationalError as e:
        print(f"   ❌ Falha de conexão: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Erro inesperado: {e}")
        return False

def main():
    print("╔══════════════════════════════════════════╗")
    print("║   AssetAgro — Teste de Conexão OCS Sync  ║")
    print("╚══════════════════════════════════════════╝")

    cfg = load_config()

    ok_ocs = testar("OCS", cfg["ocs"])
    ok_ag  = testar("AssetAgro", cfg["assetagro"])

    print("\n══════════════════════════════════════════")
    if ok_ocs and ok_ag:
        print("  ✅ Tudo OK — pode rodar: python sync.py")
    else:
        if not ok_ocs:
            print("  ❌ OCS: verifique host, porta, usuário e senha no config.json")
        if not ok_ag:
            print("  ❌ AssetAgro: verifique host, porta, usuário e senha no config.json")
    print("══════════════════════════════════════════\n")

if __name__ == "__main__":
    main()
