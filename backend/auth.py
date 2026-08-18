import os
import secrets

from fastapi import Header, HTTPException

# Single shared password protecting the whole API, set via the APP_PASSWORD env var
# on deployment. If unset (e.g. local development), auth is disabled entirely -- every
# request passes through, matching the app's original no-auth local behavior.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()


def require_app_password(x_app_password: str = Header(default="")) -> None:
    if not APP_PASSWORD:
        return
    if not secrets.compare_digest(x_app_password or "", APP_PASSWORD):
        raise HTTPException(status_code=401, detail="Invalid or missing app password.")
