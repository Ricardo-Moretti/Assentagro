"""
AssetAgro — Exportação SQLite → MySQL
Lê o banco SQLite local e gera um arquivo SQL com INSERTs compatíveis com MySQL.
Uso: python export_sqlite_to_mysql.py [caminho_do_banco] [arquivo_saida]

Padrão:
  - Banco: %APPDATA%/com.tracbel.assetagro/assetagro.db
  - Saída: ./assetagro_mysql_data.sql
"""

import sqlite3
import os
import sys
from datetime import datetime

def escape_mysql(val):
    """Escapa valor para INSERT MySQL"""
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")
    return f"'{s}'"

def export_table(cursor, table_name, columns, output):
    """Exporta todos os registros de uma tabela"""
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()

    if not rows:
        output.write(f"-- {table_name}: nenhum registro\n\n")
        return 0

    output.write(f"-- {table_name}: {len(rows)} registros\n")
    col_names = ", ".join([f"`{c}`" for c in columns])

    for row in rows:
        values = ", ".join([escape_mysql(v) for v in row])
        output.write(f"INSERT INTO `{table_name}` ({col_names}) VALUES ({values});\n")

    output.write("\n")
    return len(rows)

def main():
    # Caminho padrão do banco
    appdata = os.environ.get("APPDATA", "")
    default_db = os.path.join(appdata, "com.tracbel.assetagro", "assetagro.db")

    db_path = sys.argv[1] if len(sys.argv) > 1 else default_db
    output_path = sys.argv[2] if len(sys.argv) > 2 else "./assetagro_mysql_data.sql"

    if not os.path.exists(db_path):
        print(f"ERRO: Banco não encontrado em: {db_path}")
        print(f"Uso: python export_sqlite_to_mysql.py [caminho_banco.db] [arquivo_saida.sql]")
        sys.exit(1)

    print(f"Banco: {db_path}")
    print(f"Saída: {output_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Tabelas na ordem correta (respeita foreign keys)
    tables = {
        "branches": ["id", "name"],
        "assets": [
            "id", "service_tag", "equipment_type", "status", "employee_name",
            "branch_id", "ram_gb", "storage_capacity_gb", "storage_type",
            "os", "cpu", "notes", "model", "year", "is_training",
            "warranty_start", "warranty_end", "created_at", "updated_at"
        ],
        "asset_audit": ["id", "asset_id", "changed_at", "changes_json"],
        "asset_movements": [
            "id", "asset_id", "movement_type", "from_employee", "to_employee",
            "from_status", "to_status", "reason", "created_at"
        ],
        "app_settings": ["key", "value"],
        "employees": ["id", "name", "branch_id", "active", "created_at"],
        "maintenance_records": [
            "id", "asset_id", "supplier", "expected_return_date", "cost",
            "notes", "sent_at", "returned_at", "status"
        ],
        "asset_attachments": ["id", "asset_id", "filename", "filepath", "file_type", "created_at"],
        "users": ["id", "username", "password", "name", "role", "active", "created_at"],
    }

    total = 0
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"-- ============================================================\n")
        f.write(f"-- AssetAgro — Dados exportados do SQLite\n")
        f.write(f"-- Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Banco: {db_path}\n")
        f.write(f"-- ============================================================\n\n")
        f.write(f"USE assetagro;\n\n")
        f.write(f"SET NAMES utf8mb4;\n")
        f.write(f"SET FOREIGN_KEY_CHECKS = 0;\n\n")

        for table_name, columns in tables.items():
            try:
                count = export_table(cursor, table_name, columns, f)
                total += count
                print(f"  {table_name}: {count} registros")
            except Exception as e:
                print(f"  {table_name}: ERRO — {e}")
                f.write(f"-- {table_name}: ERRO — {e}\n\n")

        f.write(f"SET FOREIGN_KEY_CHECKS = 1;\n")

    conn.close()
    print(f"\nTotal: {total} registros exportados para {output_path}")

if __name__ == "__main__":
    main()
