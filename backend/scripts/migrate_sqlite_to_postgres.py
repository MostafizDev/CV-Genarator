"""
One-time migration: SQLite (app.db) -> Postgres, with sensitive columns encrypted.

    cd backend && source venv/bin/activate
    python -m scripts.migrate_sqlite_to_postgres [--source app.db]

* Reads the SQLite file read-only, so the original is left untouched (your rollback).
* Copies every row with its original primary key, so all relationships are preserved.
* Encrypts sensitive columns on the way in (the EncryptedText type does this on insert).
* Runs in ONE transaction on the Postgres side: any failure rolls everything back.
* Refuses to run if the target already holds users, unless --force is given.
* Finishes by verifying row counts, decrypted values, and that no sensitive value was
  stored as plain text.

Uses MIGRATION_DATABASE_URL (the owner role), which is not subject to RLS.
"""
import argparse
import sys

from sqlalchemy import create_engine, func, inspect, select, text

import database
import models
import migrations
from core import crypto
from core.crypto import EncryptedText


def _copy_tables(source_engine, target_engine):
    """Yields (table_name, source_count, rows copied) for each table, in FK order."""
    src_columns = {t: {c["name"] for c in inspect(source_engine).get_columns(t)} for t in inspect(source_engine).get_table_names()}
    report = []
    with source_engine.connect() as src, target_engine.begin() as dst:
        for table in models.Base.metadata.sorted_tables:
            if table.name not in src_columns:
                continue
            columns = [c for c in table.columns if c.name in src_columns[table.name]]
            query = select(*columns)
            if table.name == "templates":
                # Built-in templates are seeded by the app itself; only carry over custom ones.
                query = query.where(table.c.user_id.isnot(None))
            rows = [dict(r) for r in src.execute(query).mappings()]
            if rows:
                dst.execute(table.insert(), rows)
            report.append((table.name, len(rows)))

            pk = table.c.get("id")
            if pk is not None and pk.type.python_type is int:
                dst.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table.name}), 1), "
                        f"(SELECT MAX(id) IS NOT NULL FROM {table.name}))"
                    )
                )
    return report


def _verify(source_engine, target_engine) -> list[str]:
    problems = []
    with source_engine.connect() as src, target_engine.connect() as dst:
        for table in models.Base.metadata.sorted_tables:
            if table.name not in inspect(source_engine).get_table_names():
                continue
            cols = [c for c in table.columns if c.name in {x["name"] for x in inspect(source_engine).get_columns(table.name)}]
            where = table.c.user_id.isnot(None) if table.name == "templates" else None
            q = select(*cols).order_by(table.c.id if "id" in table.c else cols[0])
            if where is not None:
                q = q.where(where)
            src_rows = [dict(r) for r in src.execute(q).mappings()]
            dst_rows = [dict(r) for r in dst.execute(q).mappings()]
            if src_rows != dst_rows:
                problems.append(f"{table.name}: values differ after migration ({len(src_rows)} vs {len(dst_rows)} rows)")

            # Raw read (no decryption): every value in an encrypted column must be ciphertext.
            for column in table.columns:
                if isinstance(column.type, EncryptedText):
                    bad = dst.execute(
                        text(f"SELECT COUNT(*) FROM {table.name} WHERE {column.name} IS NOT NULL AND {column.name} NOT LIKE 'enc:%'")
                    ).scalar()
                    if bad:
                        problems.append(f"{table.name}.{column.name}: {bad} value(s) stored as plain text")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", default="app.db", help="path to the SQLite database (default: app.db)")
    parser.add_argument("--force", action="store_true", help="run even if the target already has users")
    args = parser.parse_args()

    target_engine = database.migration_engine
    if target_engine.dialect.name != "postgresql":
        print("MIGRATION_DATABASE_URL / DATABASE_URL must point at Postgres (see backend/.env).")
        return 1
    crypto.assert_configured()

    source_engine = create_engine(f"sqlite:///file:{args.source}?mode=ro&uri=true")

    # Create tables, RLS policies and grants on the target first.
    models.Base.metadata.create_all(bind=target_engine)
    migrations.run_migrations(target_engine, database.engine)

    with target_engine.connect() as conn:
        existing = conn.execute(select(func.count()).select_from(models.User)).scalar()
    if existing and not args.force:
        print(f"Target already has {existing} user(s); refusing to copy over them. Use --force to override.")
        return 1

    print(f"Copying {args.source} -> Postgres ...")
    for name, count in _copy_tables(source_engine, target_engine):
        print(f"  {name:<20} {count} row(s)")

    print("Verifying ...")
    problems = _verify(source_engine, target_engine)
    if problems:
        print("VERIFICATION FAILED:")
        for p in problems:
            print("  -", p)
        return 2
    print("OK: all rows match and every sensitive column is encrypted at rest.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
