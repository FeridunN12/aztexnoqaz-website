import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main():
    database = sqlite3.connect(":memory:")
    database.execute("PRAGMA foreign_keys = ON")
    for migration in sorted((ROOT / "migrations").glob("*.sql")):
        database.executescript(migration.read_text(encoding="utf-8"))

    required_tables = {
        "inventory_imports",
        "inventory_import_rows",
        "inventory_mappings",
        "inventory_exclusions",
        "product_inventory",
        "inventory_snapshot_items",
        "quotation_requests",
        "quotation_items",
        "quotation_events",
        "staff_profiles",
    }
    actual_tables = {
        row[0]
        for row in database.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    assert required_tables <= actual_tables, required_tables - actual_tables

    product_detail_columns = {
        row[1] for row in database.execute("PRAGMA table_info(product_catalog_details)")
    }
    assert {
        "low_stock_threshold",
        "public_quantity",
        "availability_override",
        "override_reason",
        "override_expires_at",
    } <= product_detail_columns

    quote_item_columns = {
        row[1] for row in database.execute("PRAGMA table_info(quotation_items)")
    }
    assert {
        "inventory_status_at_submission",
        "inventory_report_month",
        "inventory_report_year",
    } <= quote_item_columns

    forbidden_inventory_columns = {"cost_price", "warehouse_value", "financial_total"}
    inventory_columns = {
        row[1] for row in database.execute("PRAGMA table_info(product_inventory)")
    }
    assert not forbidden_inventory_columns & inventory_columns
    print(f"PASS schema smoke test ({len(actual_tables)} tables)")


if __name__ == "__main__":
    main()
