from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status

from app.config import settings
from app.services import captcha

router = APIRouter(prefix="/api/v1", tags=["captcha"])


@router.get("/captcha")
def captcha_challenge() -> dict:
    """Issue a signed proof-of-work challenge for the Altcha widget.

    Returns an inert `{enabled: false}` when CAPTCHA is switched off so the
    front-end can skip the widget entirely.
    """
    if not settings.captcha_enabled:
        return {"enabled": False}
    return {"enabled": True, **captcha.create_challenge()}


def require_captcha(x_altcha_solution: str | None = Header(default=None)) -> None:
    """FastAPI dependency: enforce a valid CAPTCHA solution when enabled.

    The browser sends the base64 solution payload in the `X-Altcha-Solution` header.
    """
    if not settings.captcha_enabled:
        return
    ok, reason = captcha.verify_solution(x_altcha_solution)
    if not ok:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"CAPTCHA check failed: {reason}")
