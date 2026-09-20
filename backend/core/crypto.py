import base64
import binascii
import functools
import os
import re
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

"""
Field-level encryption for sensitive data at rest (AES-256-GCM).

Keys come only from the environment -- never from code, the database or Git:

    DATA_ENCRYPTION_KEYS="key2:<base64 32 bytes>,key1:<base64 32 bytes>"

The FIRST entry encrypts new data; every entry can decrypt, so rotating a key is: prepend
a new one, run scripts/rotate_encryption_key.py, then drop the old one. Generate a key with
    python -c "import os,base64;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"

Stored form:  enc:<key id>:<urlsafe base64 of nonce + ciphertext + tag>
"""

_ENV_VAR = "DATA_ENCRYPTION_KEYS"
_TOKEN = re.compile(r"^enc:([A-Za-z0-9_-]{1,32}):([A-Za-z0-9_=-]+)$")
_NONCE_BYTES = 12


class CryptoConfigError(RuntimeError):
    pass


class CryptoError(RuntimeError):
    """Raised when stored data can't be decrypted (wrong key or tampering)."""


@functools.lru_cache(maxsize=1)
def _keys() -> tuple[str, dict[str, bytes]]:
    raw = os.environ.get(_ENV_VAR, "").strip()
    if not raw:
        raise CryptoConfigError(
            f"{_ENV_VAR} is not set. Generate a key with: "
            'python -c "import os,base64;print(\'key1:\'+base64.urlsafe_b64encode(os.urandom(32)).decode())"'
        )
    keys: dict[str, bytes] = {}
    active: Optional[str] = None
    for entry in raw.split(","):
        key_id, sep, encoded = entry.strip().partition(":")
        if not sep or not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", key_id):
            raise CryptoConfigError(f"{_ENV_VAR} entries must look like '<id>:<base64 key>'.")
        try:
            key = base64.urlsafe_b64decode(encoded)
        except (binascii.Error, ValueError) as exc:
            raise CryptoConfigError(f"Key '{key_id}' in {_ENV_VAR} is not valid base64.") from exc
        if len(key) != 32:
            raise CryptoConfigError(f"Key '{key_id}' in {_ENV_VAR} must decode to exactly 32 bytes.")
        keys[key_id] = key
        active = active or key_id
    return active, keys  # type: ignore[return-value]


def assert_configured() -> None:
    """Fail fast at startup rather than on the first user request."""
    _keys()


def is_encrypted(value: object) -> bool:
    return isinstance(value, str) and _TOKEN.match(value) is not None


def encrypt(plaintext: str) -> str:
    active, keys = _keys()
    nonce = os.urandom(_NONCE_BYTES)
    sealed = AESGCM(keys[active]).encrypt(nonce, plaintext.encode("utf-8"), None)
    return f"enc:{active}:{base64.urlsafe_b64encode(nonce + sealed).decode('ascii')}"


def decrypt(value: str) -> str:
    """Decrypts a stored value. Values that were never encrypted (rows written before
    encryption existed) are returned unchanged, so old data keeps working until the
    migration script re-encrypts it."""
    match = _TOKEN.match(value)
    if not match:
        return value
    key_id, payload = match.groups()
    _, keys = _keys()
    if key_id not in keys:
        raise CryptoError(f"Data was encrypted with unknown key '{key_id}'.")
    try:
        blob = base64.urlsafe_b64decode(payload)
        return AESGCM(keys[key_id]).decrypt(blob[:_NONCE_BYTES], blob[_NONCE_BYTES:], None).decode("utf-8")
    except Exception as exc:  # deliberately generic: never echo ciphertext or plaintext
        raise CryptoError("Stored data failed authentication (wrong key or tampered value).") from exc


class EncryptedText(TypeDecorator):
    """A TEXT column whose value is encrypted on write and decrypted on read, so the rest
    of the code (models, schemas, APIs) keeps working with plain Python strings."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt(value)

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt(value)
