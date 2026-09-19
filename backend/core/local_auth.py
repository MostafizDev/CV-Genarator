import base64
import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path
from typing import Optional

import jwt

# Email/password accounts: passwords are stored only as salted scrypt hashes, and a
# successful login returns a signed JWT that the frontend sends as its bearer token
# (the same header Firebase ID tokens use -- get_current_user accepts either).

_SCRYPT_N = 2**15
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_MAXMEM = 2**26

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "backedstory-local"
JWT_TTL_SECONDS = 30 * 24 * 60 * 60

_SECRET_FILE = Path(__file__).resolve().parent.parent / ".jwt_secret"


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, maxmem=_SCRYPT_MAXMEM
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, digest_b64 = stored_hash.split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest_b64)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=base64.b64decode(salt_b64),
            n=int(n),
            r=int(r),
            p=int(p),
            maxmem=_SCRYPT_MAXMEM,
            dklen=len(expected),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


# Verified against when a login email doesn't exist, so an unknown email costs the same
# time as a wrong password and can't be told apart by response time.
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(16))


def _jwt_secret() -> str:
    """JWT_SECRET if set (required in production so every instance signs alike);
    otherwise a random secret persisted to a gitignored file, so local dev sessions
    survive uvicorn --reload restarts."""
    env_secret = os.environ.get("JWT_SECRET", "").strip()
    if env_secret:
        return env_secret
    if _SECRET_FILE.exists():
        return _SECRET_FILE.read_text().strip()
    generated = secrets.token_urlsafe(48)
    _SECRET_FILE.write_text(generated)
    _SECRET_FILE.chmod(0o600)
    return generated


def create_access_token(user_id: str) -> str:
    now = int(time.time())
    payload = {"sub": user_id, "iss": JWT_ISSUER, "iat": now, "exp": now + JWT_TTL_SECONDS}
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Returns the user id from one of our own tokens, or None for anything else
    (including Firebase ID tokens, which are RS256 and rejected by the algorithm check)."""
    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None
    return payload["sub"]
