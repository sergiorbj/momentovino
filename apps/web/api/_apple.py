"""
Sign in with Apple — server-side token revocation.

App Store Review Guideline 5.1.1(v) requires apps that use Sign in with Apple
to revoke the user's Apple tokens when they delete their account. Supabase's
admin user-delete only drops our own records; it does not touch Apple. This
module exchanges a fresh, single-use authorization code (captured by the app
right before deletion) for a refresh token and revokes it with Apple.

Required environment (only for the Apple path — deletion still works without it):
  APPLE_TEAM_ID      10-char Apple Developer Team ID
  APPLE_KEY_ID       Key ID of the .p8 "Sign in with Apple" key
  APPLE_PRIVATE_KEY  Contents of the .p8 private key (PEM)
  APPLE_CLIENT_ID    App bundle identifier (defaults to com.momentovino.app)
"""
from __future__ import annotations

import os
import time
from typing import Tuple

import requests

from _api_common import load_env

_APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
_APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke"
_APPLE_AUDIENCE = "https://appleid.apple.com"
_DEFAULT_CLIENT_ID = "com.momentovino.app"
_FORM_HEADERS = {"Content-Type": "application/x-www-form-urlencoded"}


def _apple_config() -> dict:
    load_env()
    # Vercel / .env often store the .p8 with escaped "\n" — normalize to real
    # newlines so the PEM parser accepts it.
    private_key = (os.environ.get("APPLE_PRIVATE_KEY") or "").replace("\\n", "\n").strip()
    return {
        "team_id": (os.environ.get("APPLE_TEAM_ID") or "").strip(),
        "key_id": (os.environ.get("APPLE_KEY_ID") or "").strip(),
        "client_id": (os.environ.get("APPLE_CLIENT_ID") or _DEFAULT_CLIENT_ID).strip(),
        "private_key": private_key,
    }


def _client_secret(cfg: dict) -> str:
    """Builds the short-lived ES256 client secret JWT Apple expects."""
    import jwt  # PyJWT — imported lazily so a missing dep can't break deletion

    now = int(time.time())
    payload = {
        "iss": cfg["team_id"],
        "iat": now,
        "exp": now + 300,  # single immediate use; keep it short
        "aud": _APPLE_AUDIENCE,
        "sub": cfg["client_id"],
    }
    return jwt.encode(
        payload,
        cfg["private_key"],
        algorithm="ES256",
        headers={"kid": cfg["key_id"]},
    )


def revoke_apple_tokens(authorization_code: str) -> Tuple[bool, str]:
    """
    Exchanges a fresh Apple authorization code for a refresh token and revokes
    it. Best-effort: returns (ok, detail). Callers MUST NOT block account
    deletion on a False result.
    """
    code = (authorization_code or "").strip()
    if not code:
        return False, "Missing authorization code"

    cfg = _apple_config()
    if not cfg["team_id"] or not cfg["key_id"] or not cfg["private_key"]:
        return False, "Apple revocation not configured"

    try:
        secret = _client_secret(cfg)
    except Exception as exc:  # missing PyJWT/cryptography, malformed key, etc.
        return False, f"Could not build client secret: {exc}"

    token_resp = requests.post(
        _APPLE_TOKEN_URL,
        data={
            "client_id": cfg["client_id"],
            "client_secret": secret,
            "code": code,
            "grant_type": "authorization_code",
        },
        headers=_FORM_HEADERS,
        timeout=30,
    )
    if token_resp.status_code != 200:
        return False, f"Token exchange failed ({token_resp.status_code}): {token_resp.text}"

    tokens = token_resp.json() if token_resp.content else {}
    refresh_token = tokens.get("refresh_token")
    token = refresh_token or tokens.get("access_token")
    if not token:
        return False, "Apple returned no refresh/access token"

    revoke_resp = requests.post(
        _APPLE_REVOKE_URL,
        data={
            "client_id": cfg["client_id"],
            "client_secret": secret,
            "token": token,
            "token_type_hint": "refresh_token" if refresh_token else "access_token",
        },
        headers=_FORM_HEADERS,
        timeout=30,
    )
    if revoke_resp.status_code != 200:
        return False, f"Revoke failed ({revoke_resp.status_code}): {revoke_resp.text}"

    return True, "revoked"
