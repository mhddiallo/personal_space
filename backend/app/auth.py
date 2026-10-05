import os
import secrets
import time

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from app.database import BASE_DIR

CODE_FILE = BASE_DIR / ".auth_code"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 jours

MAX_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 15 * 60  # 15 minutes

_sessions: dict[str, float] = {}
_failed_attempts: dict[str, list[float]] = {}


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _register_failure(key: str) -> None:
    now = time.time()
    attempts = [t for t in _failed_attempts.get(key, []) if now - t < LOCKOUT_WINDOW_SECONDS]
    attempts.append(now)
    _failed_attempts[key] = attempts


def _is_locked_out(key: str) -> bool:
    now = time.time()
    attempts = [t for t in _failed_attempts.get(key, []) if now - t < LOCKOUT_WINDOW_SECONDS]
    _failed_attempts[key] = attempts
    return len(attempts) >= MAX_ATTEMPTS


def get_auth_code() -> str:
    # En prod (Render), le code vient de la variable d'environnement AUTH_CODE.
    env_code = os.environ.get("AUTH_CODE", "").strip()
    if env_code:
        return env_code
    if CODE_FILE.exists():
        return CODE_FILE.read_text().strip()
    code = f"{secrets.randbelow(100_000_000):08d}"
    CODE_FILE.write_text(code)
    return code


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise")
    token = authorization.removeprefix("Bearer ").strip()
    issued_at = _sessions.get(token)
    if issued_at is None or time.time() - issued_at > SESSION_TTL_SECONDS:
        _sessions.pop(token, None)
        raise HTTPException(status_code=401, detail="Session invalide ou expirée")


class LoginPayload(BaseModel):
    code: str


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginPayload, request: Request):
    key = _client_key(request)
    if _is_locked_out(key):
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives incorrectes. Réessaie dans quelques minutes.",
        )
    if payload.code.strip() != get_auth_code():
        _register_failure(key)
        raise HTTPException(status_code=401, detail="Code incorrect")
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time()
    return {"token": token}


@router.get("/check")
def check(authorization: str | None = Header(default=None)):
    require_auth(authorization)
    return {"ok": True}
