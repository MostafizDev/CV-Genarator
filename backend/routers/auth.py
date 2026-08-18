from fastapi import APIRouter, Depends

from auth import require_app_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/check", dependencies=[Depends(require_app_password)])
def check_password():
    """Succeeds iff the caller's X-App-Password header matches APP_PASSWORD (or no
    password is configured at all). Used by the frontend to verify a password before
    storing it, and to detect whether auth is enabled in the first place."""
    return {"ok": True}
