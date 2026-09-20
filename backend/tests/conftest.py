"""Test environment. Runs before any test module imports the app, so tests never read the
developer's backend/.env, never touch a real database, and never need real secrets."""
import base64
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_main.db"
os.environ["MIGRATION_DATABASE_URL"] = "sqlite:///./test_main.db"
os.environ["DATA_ENCRYPTION_KEYS"] = "test1:" + base64.urlsafe_b64encode(b"\x01" * 32).decode()
os.environ["JWT_SECRET"] = "test-only-jwt-secret"
