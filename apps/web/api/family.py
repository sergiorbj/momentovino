from __future__ import annotations

import html as html_lib
import json
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler
from typing import Any, Optional
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests

from _api_common import auth_bearer_user, auth_bearer_user_id, load_env, send_json, supabase_config

INVITE_VALID_DAYS = 7
FAMILY_DESCRIPTION_MAX_LEN = 80

# App Store / Play Store URLs derived from apps/mobile/eas.json (ascAppId)
# and apps/mobile/app.config.ts (android.package).
APP_STORE_URL_IOS = "https://apps.apple.com/app/id6763680512"
APP_STORE_URL_ANDROID = "https://play.google.com/store/apps/details?id=com.momentovino.app"


def _norm_description(body: dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    """Returns (description_or_none, error_message)."""
    if "description" not in body:
        return None, None
    raw = body.get("description")
    if raw is None:
        return None, None
    s = str(raw).strip()
    if not s:
        return None, None
    if len(s) > FAMILY_DESCRIPTION_MAX_LEN:
        return None, f"Description must be at most {FAMILY_DESCRIPTION_MAX_LEN} characters"
    return s, None


_OP_TO_SUBPATH: dict[str, str] = {
    "search-members": "/api/family/members/search",
    "my-invitations": "/api/family/my-invitations",
    "accept-invitation": "/api/family/invitations/accept",
    "decline-invitation": "/api/family/invitations/decline",
    "invite-by-username": "/api/family/invitations/by-username",
    "members": "/api/family/members",
}


def _norm_path(handler: BaseHTTPRequestHandler) -> str:
    """Normalize path. Vercel only routes `/api/family` exact to this function,
    so callers pass the action via `?op=...` query param on the base path; we
    translate that to the legacy subpath string the body code already branches
    on. The Flask shim handles real subpaths fine, so both forms work in dev.
    """
    parsed = urlparse(handler.path)
    p = parsed.path.rstrip("/") or "/"
    if p == "/api/family":
        op = (parse_qs(parsed.query).get("op") or [""])[0]
        if op in _OP_TO_SUBPATH:
            return _OP_TO_SUBPATH[op]
    return p


def _sb_headers_json(url: str, key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
    }


def _admin_user_email(url: str, key: str, user_id: str) -> Optional[str]:
    r = requests.get(
        f"{url}/auth/v1/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    data = r.json()
    return (data.get("email") or "").strip().lower() or None


def _find_user_id_by_email_rpc(url: str, key: str, email_norm: str) -> Optional[str]:
    r = requests.post(
        f"{url}/rest/v1/rpc/find_user_id_by_email",
        headers=_sb_headers_json(url, key),
        json={"lookup_email": email_norm},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"[family] find_user_id_by_email RPC status={r.status_code} body={r.text[:500]}")
        return None
    out = r.json()
    if out is None or out is False:
        return None
    if isinstance(out, str) and len(out) > 10:
        return out
    return None


def _find_user_id_by_email_admin_list(url: str, key: str, email_norm: str) -> Optional[str]:
    """Fallback when RPC is missing or errors: paginate GoTrue admin users and match email (case-insensitive)."""
    page = 1
    per_page = 200
    max_pages = 10
    while page <= max_pages:
        r = requests.get(
            f"{url}/auth/v1/admin/users",
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            params={"page": str(page), "per_page": str(per_page)},
            timeout=30,
        )
        if r.status_code != 200:
            print(f"[family] admin list users status={r.status_code} page={page} body={r.text[:300]}")
            return None
        data = r.json()
        users = data.get("users") if isinstance(data, dict) else None
        if not isinstance(users, list):
            return None
        for u in users:
            if not isinstance(u, dict):
                continue
            em = (u.get("email") or "").strip().lower()
            if em == email_norm:
                uid = u.get("id")
                return str(uid) if uid else None
        if len(users) < per_page:
            break
        page += 1
    return None


def _resolve_auth_user_id_by_email(url: str, key: str, email_norm: str) -> Optional[str]:
    """1) RPC on DB (fast). 2) Admin API list (reliable if RPC absent). If still none, caller sends email invite."""
    uid = _find_user_id_by_email_rpc(url, key, email_norm)
    if uid:
        return uid
    return _find_user_id_by_email_admin_list(url, key, email_norm)


def _iter_admin_users(url: str, key: str, max_pages: int = 10, per_page: int = 150):
    page = 1
    while page <= max_pages:
        r = requests.get(
            f"{url}/auth/v1/admin/users",
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            params={"page": str(page), "per_page": str(per_page)},
            timeout=30,
        )
        if r.status_code != 200:
            print(f"[family] admin list users status={r.status_code} page={page} body={r.text[:300]}")
            return
        data = r.json()
        users = data.get("users") if isinstance(data, dict) else None
        if not isinstance(users, list):
            return
        for u in users:
            if isinstance(u, dict):
                yield u
        if len(users) < per_page:
            break
        page += 1


def _display_name_from_auth_user(u: dict[str, Any], email: str) -> str:
    meta = u.get("user_metadata")
    if isinstance(meta, dict):
        for k in ("full_name", "name", "display_name"):
            v = meta.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
    if "@" in email:
        local = email.split("@", 1)[0]
        return local.replace(".", " ").replace("_", " ").strip().title() or email
    return email


def _canonical_username_from_user(u: dict[str, Any], email: str) -> str:
    """Login-style handle: metadata username fields, else email local-part (lowercase, no @)."""
    meta = u.get("user_metadata")
    if isinstance(meta, dict):
        for k in ("username", "preferred_username", "user_name"):
            v = meta.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip().lower().lstrip("@")
    if "@" in email:
        return email.split("@", 1)[0].lower()
    return email.strip().lower()


def _normalize_username_search_query(q_raw: str) -> tuple[Optional[str], Optional[str]]:
    """Returns (needle_lower, error_message). Username only — no @, no email."""
    q = q_raw.strip().lower()
    if len(q) < 2:
        return None, "Use at least 2 characters"
    if " " in q or "\t" in q or "\n" in q:
        return None, "Username cannot contain spaces"
    if "@" in q:
        return None, "Username only — no @ or email addresses"
    if len(q) > 32:
        return None, "Username too long"
    if not re.match(r"^[a-z0-9._-]+$", q):
        return None, "Username may only use letters, numbers, dot, underscore, hyphen"
    return q, None


def _username_needle_matches_canonical(canonical: str, needle: str) -> bool:
    if not canonical or not needle:
        return False
    if canonical == needle:
        return True
    if len(needle) >= 2 and canonical.startswith(needle):
        return True
    return False


def _search_platform_users_for_invite(
    url: str, key: str, needle: str, exclude_user_ids: set[str], limit: int = 12
) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    seen: set[str] = set()
    for u in _iter_admin_users(url, key, max_pages=10, per_page=150):
        uid = str(u.get("id") or "")
        if not uid or uid in exclude_user_ids or uid in seen:
            continue
        email = (u.get("email") or "").strip().lower()
        if not email:
            continue
        canonical = _canonical_username_from_user(u, email)
        if not _username_needle_matches_canonical(canonical, needle):
            continue
        dn = _display_name_from_auth_user(u, email)
        seen.add(uid)
        matches.append(
            {
                "user_id": uid,
                "email": email,
                "display_name": dn,
                "username": canonical,
            }
        )
        if len(matches) >= limit:
            break
    return matches


def _owned_family(url: str, key: str, user_id: str) -> Optional[dict[str, Any]]:
    r = requests.get(
        f"{url}/rest/v1/families?select=*&owner_id=eq.{user_id}&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    rows = r.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def _family_via_membership(url: str, key: str, user_id: str) -> Optional[dict[str, Any]]:
    r = requests.get(
        f"{url}/rest/v1/family_members?select=family_id&user_id=eq.{user_id}&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    rows = r.json()
    if not isinstance(rows, list) or not rows:
        return None
    fid = rows[0].get("family_id")
    if not fid:
        return None
    r2 = requests.get(
        f"{url}/rest/v1/families?id=eq.{fid}&select=*&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r2.status_code != 200:
        return None
    fr = r2.json()
    if isinstance(fr, list) and fr:
        return fr[0]
    return None


def _resolve_family(url: str, key: str, user_id: str) -> tuple[Optional[dict[str, Any]], bool]:
    """Returns (family_row_or_none, current_user_is_owner)."""
    owned = _owned_family(url, key, user_id)
    if owned:
        return owned, True
    mem = _family_via_membership(url, key, user_id)
    if mem:
        return mem, mem.get("owner_id") == user_id
    return None, False


def _list_members(url: str, key: str, family_id: str) -> list[dict[str, Any]]:
    r = requests.get(
        f"{url}/rest/v1/family_members?family_id=eq.{family_id}&select=*&order=joined_at.asc",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return []
    rows = r.json()
    return rows if isinstance(rows, list) else []


def _load_member_avatars(url: str, key: str, user_ids: list[str]) -> dict[str, Optional[str]]:
    """Fetch avatar_url for each user from public.profiles in one batch."""
    if not user_ids:
        return {}
    in_list = ",".join(user_ids)
    r = requests.get(
        f"{url}/rest/v1/profiles",
        params={
            "id": f"in.({in_list})",
            "select": "id,avatar_url",
        },
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return {}
    body = r.json() if r.content else []
    rows = body if isinstance(body, list) else []
    out: dict[str, Optional[str]] = {}
    for row in rows:
        if isinstance(row, dict) and row.get("id"):
            url_val = row.get("avatar_url")
            out[str(row["id"])] = str(url_val).strip() if url_val else None
    return out


def _load_member_stats(url: str, key: str, user_ids: list[str]) -> dict[str, dict[str, int]]:
    """Per-user totals for the family dashboard: moments, wines, distinct countries
    (derived from each moment's associated wine.country). Two PostgREST round-trips
    using `in.(uid1,uid2,…)` rather than one per member, so cost is O(1) per family."""
    if not user_ids:
        return {}
    in_list = ",".join(user_ids)
    moments_resp = requests.get(
        f"{url}/rest/v1/moments",
        params={
            "user_id": f"in.({in_list})",
            "select": "user_id,wines(country)",
        },
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    wines_resp = requests.get(
        f"{url}/rest/v1/wines",
        params={
            "created_by": f"in.({in_list})",
            "select": "created_by",
        },
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    agg: dict[str, dict[str, Any]] = {
        uid: {"moments_count": 0, "wines_count": 0, "_countries": set()} for uid in user_ids
    }
    if moments_resp.status_code == 200:
        rows = moments_resp.json() if isinstance(moments_resp.json(), list) else []
        for row in rows:
            if not isinstance(row, dict):
                continue
            uid = row.get("user_id")
            if uid not in agg:
                continue
            agg[uid]["moments_count"] += 1
            wine = row.get("wines")
            country = wine.get("country") if isinstance(wine, dict) else None
            if country:
                agg[uid]["_countries"].add(country)
    if wines_resp.status_code == 200:
        rows = wines_resp.json() if isinstance(wines_resp.json(), list) else []
        for row in rows:
            if not isinstance(row, dict):
                continue
            uid = row.get("created_by")
            if uid not in agg:
                continue
            agg[uid]["wines_count"] += 1
    return {
        uid: {
            "moments_count": s["moments_count"],
            "wines_count": s["wines_count"],
            "countries_count": len(s["_countries"]),
        }
        for uid, s in agg.items()
    }


def _list_pending_invites(url: str, key: str, family_id: str) -> list[dict[str, Any]]:
    """Pending non-expired invitations for the admin dashboard. Includes both
    legacy email-token rows AND new username invites; for the latter we
    resolve the target user's email/display_name so the UI can render a
    person, not a uuid."""
    now_iso = datetime.now(timezone.utc).isoformat()
    r = requests.get(
        f"{url}/rest/v1/family_invitations",
        params={
            "family_id": f"eq.{family_id}",
            "status": "eq.pending",
            "expires_at": f"gt.{now_iso}",
            "select": "id,email,invited_user_id,expires_at,created_at",
            "order": "created_at.desc",
        },
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return []
    rows = r.json()
    if not isinstance(rows, list):
        return []
    out: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        invited_uid = row.get("invited_user_id")
        if invited_uid:
            u = _admin_user_by_id(url, key, str(invited_uid))
            if u:
                em = (u.get("email") or "").strip().lower()
                row["email"] = em or row.get("email")
                row["display_name"] = _display_name_from_auth_user(u, em)
        out.append(row)
    return out


def _pending_invited_user_ids(url: str, key: str, family_id: str) -> set[str]:
    """Set of user_ids that currently hold a non-expired pending invite for
    this family. Used to keep the invite search free of users we've already
    invited — re-inviting them is either a no-op or a confusing duplicate."""
    now_iso = datetime.now(timezone.utc).isoformat()
    r = requests.get(
        f"{url}/rest/v1/family_invitations",
        params={
            "family_id": f"eq.{family_id}",
            "status": "eq.pending",
            "expires_at": f"gt.{now_iso}",
            "invited_user_id": "not.is.null",
            "select": "invited_user_id",
        },
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return set()
    rows = r.json() if r.content else []
    out: set[str] = set()
    if isinstance(rows, list):
        for row in rows:
            if isinstance(row, dict):
                iv = row.get("invited_user_id")
                if iv:
                    out.add(str(iv))
    return out


def _admin_user_by_id(url: str, key: str, user_id: str) -> Optional[dict[str, Any]]:
    r = requests.get(
        f"{url}/auth/v1/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    data = r.json()
    return data if isinstance(data, dict) else None


def _user_current_family(url: str, key: str, user_id: str) -> Optional[dict[str, Any]]:
    """Returns the family the user currently belongs to (owner or member),
    or None. Used to enforce 'one family per user' at the API level — note
    this is intentionally NOT a DB constraint so we can lift it later."""
    fam, _ = _resolve_family(url, key, user_id)
    return fam


def _expire_stale_pending(url: str, key: str, family_id: str, invited_user_id: str) -> None:
    """Flip any expired pending invites for (family, user) to status='expired'
    so the duplicate-invite validation resets and a new invite can be created."""
    now_iso = datetime.now(timezone.utc).isoformat()
    requests.patch(
        f"{url}/rest/v1/family_invitations",
        params={
            "family_id": f"eq.{family_id}",
            "invited_user_id": f"eq.{invited_user_id}",
            "status": "eq.pending",
            "expires_at": f"lt.{now_iso}",
        },
        headers=_sb_headers_json(url, key),
        json={"status": "expired"},
        timeout=30,
    )


def _active_pending_invite_for_user(
    url: str, key: str, family_id: str, invited_user_id: str
) -> Optional[dict[str, Any]]:
    now_iso = datetime.now(timezone.utc).isoformat()
    r = requests.get(
        f"{url}/rest/v1/family_invitations",
        params={
            "family_id": f"eq.{family_id}",
            "invited_user_id": f"eq.{invited_user_id}",
            "status": "eq.pending",
            "expires_at": f"gt.{now_iso}",
            "select": "id,expires_at,created_at",
            "limit": "1",
        },
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    rows = r.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def _inviter_display_name(url: str, key: str, user_id: str) -> str:
    u = _admin_user_by_id(url, key, user_id)
    if not u:
        return "A friend"
    em = (u.get("email") or "").strip().lower()
    return _display_name_from_auth_user(u, em)


def _is_admin(url: str, key: str, user_id: str, family_id: str) -> bool:
    fam = requests.get(
        f"{url}/rest/v1/families?id=eq.{family_id}&select=owner_id&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if fam.status_code == 200 and isinstance(fam.json(), list) and fam.json():
        if fam.json()[0].get("owner_id") == user_id:
            return True
    r = requests.get(
        (
            f"{url}/rest/v1/family_members?family_id=eq.{family_id}"
            f"&user_id=eq.{user_id}&role=eq.admin&select=id&limit=1"
        ),
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code == 200 and isinstance(r.json(), list) and r.json():
        return True
    return False


_TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")


def _render_template(filename: str, replacements: dict[str, str]) -> str:
    """Read an HTML template from the api/templates folder and substitute
    `{{TOKEN}}` placeholders. We use `str.replace` (not `.format`) because
    the templates contain CSS curly braces that would otherwise need escaping."""
    with open(os.path.join(_TEMPLATES_DIR, filename), "r", encoding="utf-8") as f:
        out = f.read()
    for token, value in replacements.items():
        out = out.replace("{{" + token + "}}", value)
    return out


def _send_resend_app_store_email(
    to_email: str,
    family_name: str,
    inviter_name: str,
) -> tuple[bool, Optional[str]]:
    """Marketing-style nudge: 'X invited you to MomentoVino — download the app'.
    The email no longer carries a token / accept link; the actual invitation
    happens once the recipient signs up and the inviter sends a username
    invite from inside the app."""
    load_env()
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("RESEND_FROM_EMAIL")
    skip = os.environ.get("RESEND_SKIP_SEND", "").lower() in ("1", "true", "yes")
    if skip or not api_key or not from_email:
        print(f"[family invite] RESEND_SKIP or missing key — would email {to_email} for {family_name}")
        return True, None
    safe_family = html_lib.escape(family_name, quote=True)
    safe_inviter = html_lib.escape(inviter_name, quote=True)
    body_html = _render_template(
        "family-invite.html",
        {
            "FAMILY_NAME": safe_family,
            "INVITER_NAME": safe_inviter,
            "IOS_LINK": APP_STORE_URL_IOS,
            "ANDROID_LINK": APP_STORE_URL_ANDROID,
        },
    )
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": f"{inviter_name} invited you to MomentoVino",
        "html": body_html,
    }
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    if r.status_code not in (200, 201):
        return False, r.text or str(r.status_code)
    return True, None


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    n = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(n) if n else b""
    try:
        return json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path_only = _norm_path(self)
        uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return
        url, key = supabase_config()

        if path_only == "/api/family/my-invitations":
            now_iso = datetime.now(timezone.utc).isoformat()
            r = requests.get(
                f"{url}/rest/v1/family_invitations",
                params={
                    "invited_user_id": f"eq.{uid}",
                    "status": "eq.pending",
                    "expires_at": f"gt.{now_iso}",
                    "select": "id,family_id,invited_by,expires_at,created_at",
                    "order": "created_at.desc",
                },
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
            if r.status_code != 200:
                send_json(self, 500, {"error": "Failed to load invitations"})
                return
            rows = r.json() if isinstance(r.json(), list) else []
            out: list[dict[str, Any]] = []
            for row in rows:
                if not isinstance(row, dict):
                    continue
                fid = row.get("family_id")
                fam_row: Optional[dict[str, Any]] = None
                if fid:
                    fr = requests.get(
                        f"{url}/rest/v1/families",
                        params={"id": f"eq.{fid}", "select": "id,name,description,photo_url", "limit": "1"},
                        headers={"Authorization": f"Bearer {key}", "apikey": key},
                        timeout=30,
                    )
                    if fr.status_code == 200:
                        body = fr.json()
                        if isinstance(body, list) and body:
                            fam_row = body[0]
                inviter_uid = row.get("invited_by")
                inviter_name = (
                    _inviter_display_name(url, key, str(inviter_uid)) if inviter_uid else "A friend"
                )
                out.append(
                    {
                        "id": row["id"],
                        "family": fam_row,
                        "inviter_name": inviter_name,
                        "expires_at": row["expires_at"],
                        "created_at": row["created_at"],
                    }
                )
            send_json(self, 200, {"invitations": out})
            return

        if path_only == "/api/family/members/search":
            q = (parse_qs(parsed.query).get("q") or [""])[0].strip()
            needle, q_err = _normalize_username_search_query(q)
            if q_err is not None or needle is None:
                send_json(self, 400, {"error": q_err or "Invalid username search"})
                return
            fam, _ = _resolve_family(url, key, uid)
            if not fam:
                send_json(self, 403, {"error": "Create a family first"})
                return
            fid = fam["id"]
            if not _is_admin(url, key, uid, fid):
                send_json(self, 403, {"error": "Only family admins can search"})
                return
            members_raw = _list_members(url, key, fid)
            exclude: set[str] = {str(uid)}
            for m in members_raw:
                if isinstance(m, dict) and m.get("user_id"):
                    exclude.add(str(m["user_id"]))
            exclude |= _pending_invited_user_ids(url, key, fid)
            matches = _search_platform_users_for_invite(url, key, needle, exclude, limit=12)
            send_json(self, 200, {"matches": matches})
            return

        if path_only != "/api/family":
            send_json(self, 404, {"error": "Not found"})
            return
        fam, is_owner = _resolve_family(url, key, uid)
        if not fam:
            send_json(self, 200, {"family": None, "members": [], "pendingInvitations": [], "isOwner": False})
            return
        fid = fam["id"]
        members_raw = _list_members(url, key, fid)
        member_uids = [str(m["user_id"]) for m in members_raw if m.get("user_id")]
        stats_by_uid = _load_member_stats(url, key, member_uids)
        avatars_by_uid = _load_member_avatars(url, key, member_uids)
        members_out: list[dict[str, Any]] = []
        for m in members_raw:
            u = _admin_user_by_id(url, key, m["user_id"])
            em: Optional[str] = None
            dn: Optional[str] = None
            if u:
                em = (u.get("email") or "").strip().lower() or None
                dn = _display_name_from_auth_user(u, em or "")
            row = dict(m)
            row["email"] = em
            row["display_name"] = dn
            row["avatar_url"] = avatars_by_uid.get(str(m.get("user_id") or ""))
            s = stats_by_uid.get(str(m.get("user_id") or ""), {})
            row["moments_count"] = s.get("moments_count", 0)
            row["wines_count"] = s.get("wines_count", 0)
            row["countries_count"] = s.get("countries_count", 0)
            members_out.append(row)
        pending = _list_pending_invites(url, key, fid)
        send_json(
            self,
            200,
            {
                "family": fam,
                "members": members_out,
                "pendingInvitations": pending,
                "isOwner": fam.get("owner_id") == uid,
            },
        )

    def do_POST(self):
        path = _norm_path(self)
        uid, email, err = auth_bearer_user(self)
        if err:
            send_json(self, err[0], err[1])
            return
        url, key = supabase_config()

        if path == "/api/family/invitations/accept":
            body = _read_json(self)
            inv_id = (body.get("id") or "").strip()
            token = (body.get("token") or "").strip()
            if not inv_id and not token:
                send_json(self, 400, {"error": "Missing invitation id"})
                return
            params = (
                {"id": f"eq.{inv_id}"}
                if inv_id
                else {"token": f"eq.{token}"}
            )
            params.update({"status": "eq.pending", "select": "*"})
            r = requests.get(
                f"{url}/rest/v1/family_invitations",
                params=params,
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
            if r.status_code != 200:
                send_json(self, 500, {"error": "Failed to load invitation"})
                return
            inv_rows = r.json()
            if not isinstance(inv_rows, list) or not inv_rows:
                send_json(self, 400, {"error": "Invalid or expired invitation"})
                return
            inv = inv_rows[0]
            exp = inv.get("expires_at")
            if exp:
                try:
                    exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                    if exp_dt < datetime.now(timezone.utc):
                        requests.patch(
                            f"{url}/rest/v1/family_invitations?id=eq.{inv['id']}",
                            headers=_sb_headers_json(url, key),
                            json={"status": "expired"},
                            timeout=30,
                        )
                        send_json(self, 400, {"error": "Invitation expired"})
                        return
                except ValueError:
                    pass

            invited_uid = inv.get("invited_user_id")
            if invited_uid:
                if str(invited_uid) != str(uid):
                    send_json(self, 403, {"error": "This invitation is for a different account"})
                    return
            else:
                inv_email = (inv.get("email") or "").strip().lower()
                if not email or inv_email != email:
                    send_json(self, 403, {"error": "Signed-in email must match the invitation"})
                    return

            existing_fam = _user_current_family(url, key, uid)
            if existing_fam and str(existing_fam.get("id")) == str(inv["family_id"]):
                send_json(self, 200, {"ok": True, "alreadyMember": True, "familyId": inv["family_id"]})
                return
            if existing_fam:
                send_json(
                    self,
                    409,
                    {
                        "error": "You're already in a family. Leave it first to accept a new invitation.",
                        "code": "already_in_family",
                    },
                )
                return

            ins = requests.post(
                f"{url}/rest/v1/family_members",
                headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                json={"family_id": inv["family_id"], "user_id": uid, "role": "member"},
                timeout=30,
            )
            if ins.status_code not in (200, 201):
                send_json(self, 500, {"error": ins.text or "Failed to join family"})
                return
            requests.patch(
                f"{url}/rest/v1/family_invitations?id=eq.{inv['id']}",
                headers=_sb_headers_json(url, key),
                json={"status": "accepted"},
                timeout=30,
            )
            send_json(self, 200, {"ok": True, "familyId": inv["family_id"]})
            return

        if path == "/api/family/invitations/decline":
            body = _read_json(self)
            inv_id = (body.get("id") or "").strip()
            if not inv_id:
                send_json(self, 400, {"error": "Missing invitation id"})
                return
            r = requests.get(
                f"{url}/rest/v1/family_invitations",
                params={"id": f"eq.{inv_id}", "select": "id,invited_user_id,status"},
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
            if r.status_code != 200:
                send_json(self, 500, {"error": "Failed to load invitation"})
                return
            rows = r.json()
            if not isinstance(rows, list) or not rows:
                send_json(self, 404, {"error": "Invitation not found"})
                return
            inv = rows[0]
            if str(inv.get("invited_user_id") or "") != str(uid):
                send_json(self, 403, {"error": "This invitation is for a different account"})
                return
            if inv.get("status") != "pending":
                send_json(self, 409, {"error": "Invitation is no longer pending"})
                return
            upd = requests.patch(
                f"{url}/rest/v1/family_invitations?id=eq.{inv_id}",
                headers=_sb_headers_json(url, key),
                json={"status": "declined"},
                timeout=30,
            )
            if upd.status_code not in (200, 204):
                send_json(self, 500, {"error": upd.text or "Failed to decline invitation"})
                return
            send_json(self, 200, {"ok": True})
            return

        if path == "/api/family/invitations/by-username":
            body = _read_json(self)
            target_uid = (body.get("user_id") or "").strip()
            if not target_uid:
                send_json(self, 400, {"error": "user_id is required"})
                return
            if target_uid == uid:
                send_json(self, 400, {"error": "You can't invite yourself"})
                return

            fam, _ = _resolve_family(url, key, uid)
            if not fam:
                send_json(self, 404, {"error": "No family found — create a family first"})
                return
            fid = fam["id"]
            if not _is_admin(url, key, uid, fid):
                send_json(self, 403, {"error": "Only family admins can invite members"})
                return

            target_user = _admin_user_by_id(url, key, target_uid)
            if not target_user:
                send_json(self, 404, {"error": "User not found"})
                return

            already_member = requests.get(
                (
                    f"{url}/rest/v1/family_members?family_id=eq.{fid}"
                    f"&user_id=eq.{target_uid}&select=id&limit=1"
                ),
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
            if (
                already_member.status_code == 200
                and isinstance(already_member.json(), list)
                and already_member.json()
            ):
                send_json(
                    self,
                    409,
                    {"error": "This user is already a member of your family", "code": "already_member"},
                )
                return

            target_fam = _user_current_family(url, key, target_uid)
            if target_fam:
                send_json(
                    self,
                    409,
                    {
                        "error": "This user already belongs to another family.",
                        "code": "target_already_in_family",
                    },
                )
                return

            _expire_stale_pending(url, key, fid, target_uid)
            existing = _active_pending_invite_for_user(url, key, fid, target_uid)
            if existing:
                send_json(
                    self,
                    409,
                    {
                        "error": "You've already invited this user. Waiting for their response.",
                        "code": "already_invited",
                        "invitation": existing,
                    },
                )
                return

            token = str(uuid.uuid4())
            expires = (datetime.now(timezone.utc) + timedelta(days=INVITE_VALID_DAYS)).isoformat()
            ins_inv = requests.post(
                f"{url}/rest/v1/family_invitations",
                headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                json={
                    "family_id": fid,
                    "invited_user_id": target_uid,
                    "invited_by": uid,
                    "token": token,
                    "expires_at": expires,
                    "status": "pending",
                },
                timeout=30,
            )
            if ins_inv.status_code not in (200, 201):
                send_json(self, 500, {"error": ins_inv.text or "Failed to create invitation"})
                return
            inv_row = ins_inv.json()[0] if isinstance(ins_inv.json(), list) else ins_inv.json()
            send_json(self, 201, {"invited": True, "invitation": inv_row})
            return

        if path == "/api/family/members":
            body = _read_json(self)
            raw_email = body.get("email")
            if not raw_email or not str(raw_email).strip():
                send_json(self, 400, {"error": "email is required"})
                return
            email_norm = str(raw_email).strip().lower()
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_norm):
                send_json(self, 400, {"error": "Invalid email"})
                return

            fam, _ = _resolve_family(url, key, uid)
            if not fam:
                send_json(self, 404, {"error": "No family found — create a family first"})
                return
            fid = fam["id"]
            if not _is_admin(url, key, uid, fid):
                send_json(self, 403, {"error": "Only family admins can invite members"})
                return

            # Email invites are now an App Store nudge only — they don't add
            # the recipient to the family and they aren't persisted. If the
            # email already belongs to a MomentoVino account, we redirect the
            # admin to the username search so the recipient can consent.
            target_uid = _resolve_auth_user_id_by_email(url, key, email_norm)
            if target_uid:
                send_json(
                    self,
                    409,
                    {
                        "error": (
                            "This email already has a MomentoVino account. Ask them for their "
                            "username and invite them through the username search."
                        ),
                        "code": "email_already_registered",
                    },
                )
                return

            inviter_name = _inviter_display_name(url, key, uid)
            ok, err_msg = _send_resend_app_store_email(
                email_norm,
                fam.get("name") or "MomentoVino",
                inviter_name,
            )
            if not ok:
                send_json(self, 502, {"error": f"Email failed to send: {err_msg}"})
                return
            send_json(self, 200, {"emailed": True, "email": email_norm})
            return

        if path == "/api/family":
            body = _read_json(self)
            name = (body.get("name") or "").strip()
            if len(name) < 2:
                send_json(self, 400, {"error": "Family name is required (min 2 characters)"})
                return
            desc, derr = _norm_description(body)
            if derr:
                send_json(self, 400, {"error": derr})
                return
            photo_url = body.get("photo_url")
            photo_out: Optional[str] = None
            if photo_url is not None:
                ps = str(photo_url).strip()
                photo_out = ps if ps else None
            if _user_current_family(url, key, uid):
                send_json(self, 409, {"error": "You already belong to a family"})
                return
            row: dict[str, Any] = {"name": name, "owner_id": uid}
            if desc is not None:
                row["description"] = desc
            if photo_out is not None:
                row["photo_url"] = photo_out
            ins_f = requests.post(
                f"{url}/rest/v1/families",
                headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                json=row,
                timeout=30,
            )
            if ins_f.status_code not in (200, 201):
                send_json(self, 500, {"error": ins_f.text or "Failed to create family"})
                return
            fam = ins_f.json()[0] if isinstance(ins_f.json(), list) else ins_f.json()
            fid = fam["id"]
            ins_m = requests.post(
                f"{url}/rest/v1/family_members",
                headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                json={"family_id": fid, "user_id": uid, "role": "admin"},
                timeout=30,
            )
            if ins_m.status_code not in (200, 201):
                send_json(self, 500, {"error": ins_m.text or "Failed to add owner as member"})
                return
            send_json(self, 201, {"family": fam})
            return

        send_json(self, 404, {"error": "Not found"})

    def do_PATCH(self):
        path = _norm_path(self)
        if path != "/api/family":
            send_json(self, 404, {"error": "Not found"})
            return
        uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return
        body = _read_json(self)
        updates: dict[str, Any] = {}
        if "name" in body:
            name = (body.get("name") or "").strip()
            if len(name) < 2:
                send_json(self, 400, {"error": "Family name must be at least 2 characters"})
                return
            updates["name"] = name
        if "description" in body:
            desc, derr = _norm_description(body)
            if derr:
                send_json(self, 400, {"error": derr})
                return
            updates["description"] = desc  # may be None to clear
        if "photo_url" in body:
            pu = body.get("photo_url")
            if pu is None:
                updates["photo_url"] = None
            else:
                ps = str(pu).strip()
                updates["photo_url"] = ps if ps else None
        if not updates:
            send_json(self, 400, {"error": "No fields to update"})
            return
        url, key = supabase_config()
        fam = _owned_family(url, key, uid)
        if not fam:
            send_json(self, 403, {"error": "Only the family owner can update the family"})
            return
        fid = fam["id"]
        r = requests.patch(
            f"{url}/rest/v1/families?id=eq.{fid}",
            headers=_sb_headers_json(url, key),
            json=updates,
            timeout=30,
        )
        if r.status_code not in (200, 204):
            send_json(self, 500, {"error": r.text or "Failed to update family"})
            return
        gr = requests.get(
            f"{url}/rest/v1/families?id=eq.{fid}&select=*&limit=1",
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            timeout=30,
        )
        gr_body = gr.json() if gr.status_code == 200 else []
        out = gr_body[0] if isinstance(gr_body, list) and gr_body else {"id": fid, "name": name}
        send_json(self, 200, {"family": out})

    def do_DELETE(self):
        path = _norm_path(self)
        if path != "/api/family/members":
            send_json(self, 404, {"error": "Not found"})
            return
        uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return
        parsed = urlparse(self.path)
        target_uid = (parse_qs(parsed.query).get("user_id") or [""])[0].strip()
        if not target_uid:
            send_json(self, 400, {"error": "user_id is required"})
            return
        url, key = supabase_config()
        fam = _owned_family(url, key, uid)
        if not fam:
            send_json(self, 403, {"error": "Only the family owner can remove members"})
            return
        fid = fam["id"]
        if target_uid == str(uid):
            send_json(self, 400, {"error": "Use 'leave family' to remove yourself"})
            return
        if target_uid == str(fam.get("owner_id") or ""):
            send_json(self, 400, {"error": "Cannot remove the family owner"})
            return
        chk = requests.get(
            f"{url}/rest/v1/family_members",
            params={
                "family_id": f"eq.{fid}",
                "user_id": f"eq.{target_uid}",
                "select": "id",
                "limit": "1",
            },
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            timeout=30,
        )
        if chk.status_code != 200:
            send_json(self, 500, {"error": "Failed to verify member"})
            return
        rows = chk.json() if isinstance(chk.json(), list) else []
        if not rows:
            send_json(self, 404, {"error": "Member not in this family"})
            return
        r = requests.delete(
            f"{url}/rest/v1/family_members",
            params={"family_id": f"eq.{fid}", "user_id": f"eq.{target_uid}"},
            headers={
                "Authorization": f"Bearer {key}",
                "apikey": key,
                "Prefer": "return=minimal",
            },
            timeout=30,
        )
        if r.status_code not in (200, 204):
            send_json(self, 500, {"error": r.text or "Failed to remove member"})
            return
        send_json(self, 200, {"removed": True, "user_id": target_uid})
