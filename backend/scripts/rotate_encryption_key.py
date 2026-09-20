"""
Re-encrypts every sensitive column with the current (first) key in DATA_ENCRYPTION_KEYS.

Rotation steps:
  1. Generate a key:  python -c "import os,base64;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
  2. PREPEND it in DATA_ENCRYPTION_KEYS, keeping the old key(s):  "key2:<new>,key1:<old>"
  3. Deploy / restart. New writes use key2; old rows still decrypt with key1.
  4. Run:  python -m scripts.rotate_encryption_key
  5. Once it reports 0 rows left on old keys, remove key1 from DATA_ENCRYPTION_KEYS.

Uses MIGRATION_DATABASE_URL (owner role, not subject to RLS). Runs in one transaction.
"""
import sys

from sqlalchemy import text

import database
import models
from core import crypto
from core.crypto import EncryptedText


def main() -> int:
    crypto.assert_configured()
    active, _ = crypto._keys()
    rotated = untouched = 0

    with database.migration_engine.begin() as conn:
        for table in models.Base.metadata.sorted_tables:
            columns = [c.name for c in table.columns if isinstance(c.type, EncryptedText)]
            if not columns or "id" not in table.c:
                continue
            for column in columns:
                rows = conn.execute(text(f"SELECT id, {column} FROM {table.name} WHERE {column} IS NOT NULL")).all()
                for row_id, stored in rows:
                    if crypto.is_encrypted(stored) and stored.startswith(f"enc:{active}:"):
                        untouched += 1
                        continue
                    conn.execute(
                        text(f"UPDATE {table.name} SET {column} = :v WHERE id = :id"),
                        {"v": crypto.encrypt(crypto.decrypt(stored)), "id": row_id},
                    )
                    rotated += 1

    print(f"Re-encrypted {rotated} value(s) with key '{active}'; {untouched} were already current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
