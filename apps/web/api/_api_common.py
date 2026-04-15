import json
import os
from pathlib import Path
from typing import Any, Optional, Tuple, Union

import requests

_WEB_ROOT = Path(__file__).resolve().parent.parent
_ENV_LOADED = False


def load_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    try:
        from dotenv import load_dotenv

        load_dotenv(_WEB_ROOT / ".env.local")
        load_dotenv(_WEB_ROOT / ".env")
    except ImportError:
        pass
    _ENV_LOADED = True


def supabase_config() -> Tuple[str, str]:
    load_env()
    url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    return url, key


def auth_bearer_user_id(handler: Any) -> Tuple[Optional[str], Optional[Tuple[int, dict]]]:
    header = handler.headers.get("Authorization") or ""
    if not header.startswith("Bearer "):
        return None, (401, {"error": "Missing authorization header"})
    token = header[7:].strip()
    if not token:
        return None, (401, {"error": "Missing authorization header"})

    url, key = supabase_config()
    if not url or not key:
        return None, (500, {"error": "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"})

    r = requests.get(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None, (401, {"error": "Invalid or expired token"})
    data = r.json()
    uid = data.get("id")
    if not uid:
        return None, (401, {"error": "Invalid or expired token"})
    return uid, None


def auth_bearer_user(handler: Any) -> Tuple[Optional[str], Optional[str], Optional[Tuple[int, dict]]]:
    """Returns (user_id, email_lower_or_empty, error_tuple)."""
    header = handler.headers.get("Authorization") or ""
    if not header.startswith("Bearer "):
        return None, None, (401, {"error": "Missing authorization header"})
    token = header[7:].strip()
    if not token:
        return None, None, (401, {"error": "Missing authorization header"})

    url, key = supabase_config()
    if not url or not key:
        return None, None, (500, {"error": "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"})

    r = requests.get(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None, None, (401, {"error": "Invalid or expired token"})
    data = r.json()
    uid = data.get("id")
    if not uid:
        return None, None, (401, {"error": "Invalid or expired token"})
    email = (data.get("email") or "").strip().lower()
    return uid, email, None


def send_json(handler: Any, status: int, payload: Union[dict, list]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)
