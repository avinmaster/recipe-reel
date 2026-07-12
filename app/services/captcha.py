"""Self-hosted, open-source proof-of-work CAPTCHA (Altcha protocol).

No third-party service, no account, no external network call — the server signs a
challenge with an HMAC secret, the browser burns a little CPU solving a SHA-256
proof-of-work, and the server verifies the solution. This gates the public
extraction endpoint against drive-by bots without a Google/Cloudflare dependency.

Protocol (https://altcha.org/docs): the client is given
    {algorithm, challenge, salt, signature, maxnumber}
and must find the integer `number` in [0, maxnumber] such that
    SHA-256(salt + number) == challenge
It returns a base64 JSON payload {algorithm, challenge, number, salt, signature};
we recompute the hash + HMAC signature and check the embedded expiry + one-time use.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from app.config import settings

_ALGORITHM = "SHA-256"
# One-time-use guard: challenge -> expiry epoch. Bounded by TTL pruning below.
_used: dict[str, float] = {}


def _secret() -> bytes:
    # Fall back to an ephemeral per-process secret if none configured (dev). A restart
    # invalidates outstanding challenges, which is harmless.
    return (settings.captcha_hmac_secret or _EPHEMERAL).encode()


_EPHEMERAL = secrets.token_hex(32)


def _sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def _sign(challenge: str) -> str:
    return hmac.new(_secret(), challenge.encode(), hashlib.sha256).hexdigest()


def create_challenge() -> dict:
    """Build a signed PoW challenge for the client widget."""
    maxnumber = max(1000, settings.captcha_complexity)
    number = secrets.randbelow(maxnumber + 1)
    expires = int(time.time()) + settings.captcha_ttl_seconds
    salt = f"{secrets.token_hex(12)}?expires={expires}"
    challenge = _sha256_hex(salt + str(number))
    return {
        "algorithm": _ALGORITHM,
        "challenge": challenge,
        "maxnumber": maxnumber,
        "salt": salt,
        "signature": _sign(challenge),
    }


def _expiry_from_salt(salt: str) -> float | None:
    for part in salt.split("?", 1)[-1].split("&"):
        if part.startswith("expires="):
            try:
                return float(part.split("=", 1)[1])
            except ValueError:
                return None
    return None


def _prune(now: float) -> None:
    for k in [k for k, exp in _used.items() if exp < now]:
        _used.pop(k, None)


def verify_solution(payload_b64: str | None) -> tuple[bool, str]:
    """Return (ok, reason). `payload_b64` is the base64 JSON from the widget."""
    if not payload_b64:
        return False, "missing captcha solution"
    try:
        data = json.loads(base64.b64decode(payload_b64))
    except Exception:
        return False, "malformed captcha solution"

    algorithm = data.get("algorithm")
    challenge = data.get("challenge")
    number = data.get("number")
    salt = data.get("salt")
    signature = data.get("signature")
    if algorithm != _ALGORITHM or not (challenge and salt and signature) or number is None:
        return False, "incomplete captcha solution"

    now = time.time()
    expires = _expiry_from_salt(salt)
    if expires is None or expires < now:
        return False, "captcha expired — solve it again"

    # Signature must match our secret (proves we issued this challenge).
    if not hmac.compare_digest(signature, _sign(challenge)):
        return False, "captcha signature mismatch"

    # Proof-of-work must actually solve the challenge.
    if _sha256_hex(f"{salt}{number}") != challenge:
        return False, "captcha proof-of-work invalid"

    # One-time use (replay guard).
    _prune(now)
    if challenge in _used:
        return False, "captcha already used"
    _used[challenge] = expires
    return True, "ok"
