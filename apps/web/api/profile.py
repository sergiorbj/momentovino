from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from typing import Any, Optional
from urllib.parse import urlparse

import requests

from _api_common import auth_bearer_user_id, send_json, supabase_config

DISPLAY_NAME_MIN = 2
DISPLAY_NAME_MAX = 50
BIO_MAX = 160
ALLOWED_LANGUAGES = {"en", "pt-BR"}


def _norm_path(handler: BaseHTTPRequestHandler) -> str:
    return urlparse(handler.path).path.rstrip("/") or "/"


def _sb_headers_json(url: str, key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
    }


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    n = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(n) if n else b""
    try:
        return json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


def _get_profile(url: str, key: str, uid: str) -> Optional[dict[str, Any]]:
    r = requests.get(
        f"{url}/rest/v1/profiles?id=eq.{uid}&select=*&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    rows = r.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def _ensure_profile(url: str, key: str, uid: str) -> Optional[dict[str, Any]]:
    """Get profile, auto-creating if missing (backfill for existing users)."""
    profile = _get_profile(url, key, uid)
    if profile:
        return profile

    # Fetch display name from auth metadata
    display_name = ""
    r = requests.get(
        f"{url}/auth/v1/admin/users/{uid}",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code == 200:
        data = r.json()
        meta = data.get("user_metadata") or {}
        for k in ("full_name", "name", "display_name"):
            v = meta.get(k)
            if isinstance(v, str) and v.strip():
                display_name = v.strip()
                break
        if not display_name:
            email = (data.get("email") or "").strip()
            if "@" in email:
                display_name = email.split("@", 1)[0]

    ins = requests.post(
        f"{url}/rest/v1/profiles",
        headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
        json={"id": uid, "display_name": display_name},
        timeout=30,
    )
    if ins.status_code in (200, 201):
        rows = ins.json()
        return rows[0] if isinstance(rows, list) and rows else rows
    # Race condition: another request created it
    return _get_profile(url, key, uid)


def _count_rows(url: str, key: str, table: str, filter_col: str, uid: str) -> int:
    r = requests.get(
        f"{url}/rest/v1/{table}?{filter_col}=eq.{uid}&select=id",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "count=exact",
            "Range-Unit": "items",
            "Range": "0-0",
        },
        timeout=30,
    )
    if r.status_code in (200, 206):
        content_range = r.headers.get("Content-Range", "")
        # Format: "0-0/42" or "*/0"
        if "/" in content_range:
            total = content_range.split("/")[-1]
            if total != "*":
                try:
                    return int(total)
                except ValueError:
                    pass
    return 0


def _has_family(url: str, key: str, uid: str) -> bool:
    # Check if owner
    r = requests.get(
        f"{url}/rest/v1/families?owner_id=eq.{uid}&select=id&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code == 200 and isinstance(r.json(), list) and r.json():
        return True
    # Check if member
    r2 = requests.get(
        f"{url}/rest/v1/family_members?user_id=eq.{uid}&select=id&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r2.status_code == 200 and isinstance(r2.json(), list) and r2.json():
        return True
    return False


def _get_stats(url: str, key: str, uid: str) -> dict[str, int]:
    moments = _count_rows(url, key, "moments", "user_id", uid)
    wines = _count_rows(url, key, "wines", "created_by", uid)
    family = 1 if _has_family(url, key, uid) else 0
    return {"moments": moments, "wines": wines, "family": family}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = _norm_path(self)
        if path != "/api/profile":
            send_json(self, 404, {"error": "Not found"})
            return

        uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        url, key = supabase_config()
        profile = _ensure_profile(url, key, uid)
        if not profile:
            send_json(self, 500, {"error": "Failed to load profile"})
            return

        stats = _get_stats(url, key, uid)
        send_json(self, 200, {"profile": profile, "stats": stats})

    def do_PATCH(self):
        path = _norm_path(self)
        uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        url, key = supabase_config()
        body = _read_json(self)

        if path == "/api/profile/settings":
            self._patch_settings(url, key, uid, body)
            return

        if path == "/api/profile":
            self._patch_profile(url, key, uid, body)
            return

        send_json(self, 404, {"error": "Not found"})

    def _patch_profile(self, url: str, key: str, uid: str, body: dict[str, Any]):
        updates: dict[str, Any] = {}

        if "display_name" in body:
            name = (str(body.get("display_name") or "")).strip()
            if len(name) < DISPLAY_NAME_MIN:
                send_json(self, 400, {"error": f"Display name must be at least {DISPLAY_NAME_MIN} characters"})
                return
            if len(name) > DISPLAY_NAME_MAX:
                send_json(self, 400, {"error": f"Display name must be at most {DISPLAY_NAME_MAX} characters"})
                return
            updates["display_name"] = name

        if "bio" in body:
            raw_bio = body.get("bio")
            if raw_bio is None or (isinstance(raw_bio, str) and not raw_bio.strip()):
                updates["bio"] = None
            else:
                bio = str(raw_bio).strip()
                if len(bio) > BIO_MAX:
                    send_json(self, 400, {"error": f"Bio must be at most {BIO_MAX} characters"})
                    return
                updates["bio"] = bio

        if "avatar_url" in body:
            raw_url = body.get("avatar_url")
            if raw_url is None:
                updates["avatar_url"] = None
            else:
                av = str(raw_url).strip()
                updates["avatar_url"] = av if av else None

        if not updates:
            send_json(self, 400, {"error": "No fields to update"})
            return

        _ensure_profile(url, key, uid)

        r = requests.patch(
            f"{url}/rest/v1/profiles?id=eq.{uid}",
            headers=_sb_headers_json(url, key),
            json=updates,
            timeout=30,
        )
        if r.status_code not in (200, 204):
            send_json(self, 500, {"error": r.text or "Failed to update profile"})
            return

        profile = _get_profile(url, key, uid)
        send_json(self, 200, {"profile": profile})

    def _patch_settings(self, url: str, key: str, uid: str, body: dict[str, Any]):
        updates: dict[str, Any] = {}

        if "language" in body:
            lang = str(body.get("language") or "").strip()
            if lang not in ALLOWED_LANGUAGES:
                send_json(self, 400, {"error": f"Language must be one of: {', '.join(sorted(ALLOWED_LANGUAGES))}"})
                return
            updates["language"] = lang

        if "notifications_enabled" in body:
            val = body.get("notifications_enabled")
            if not isinstance(val, bool):
                send_json(self, 400, {"error": "notifications_enabled must be a boolean"})
                return
            updates["notifications_enabled"] = val

        if not updates:
            send_json(self, 400, {"error": "No fields to update"})
            return

        _ensure_profile(url, key, uid)

        r = requests.patch(
            f"{url}/rest/v1/profiles?id=eq.{uid}",
            headers=_sb_headers_json(url, key),
            json=updates,
            timeout=30,
        )
        if r.status_code not in (200, 204):
            send_json(self, 500, {"error": r.text or "Failed to update settings"})
            return

        profile = _get_profile(url, key, uid)
        send_json(self, 200, {"profile": profile})
