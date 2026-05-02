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


def _norm_path(handler: BaseHTTPRequestHandler) -> str:
    p = urlparse(handler.path).path.rstrip("/") or "/"
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


def _list_pending_invites(url: str, key: str, family_id: str) -> list[dict[str, Any]]:
    r = requests.get(
        (
            f"{url}/rest/v1/family_invitations?family_id=eq.{family_id}"
            "&status=eq.pending&select=id,email,expires_at,created_at&order=created_at.desc"
        ),
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return []
    rows = r.json()
    return rows if isinstance(rows, list) else []


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


def _send_resend_invite(
    to_email: str,
    family_name: str,
    invite_link: str,
) -> tuple[bool, Optional[str]]:
    load_env()
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("RESEND_FROM_EMAIL")
    skip = os.environ.get("RESEND_SKIP_SEND", "").lower() in ("1", "true", "yes")
    if skip or not api_key or not from_email:
        print(f"[family invite] RESEND_SKIP or missing key — link for {to_email}: {invite_link}")
        return True, None
    safe_family = html_lib.escape(family_name, quote=True)
    safe_link = html_lib.escape(invite_link, quote=True)
    body_html = _render_template(
        "family-invite.html",
        {"FAMILY_NAME": safe_family, "INVITE_LINK": safe_link},
    )
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": f"You're invited to {family_name} on MomentoVino",
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
        path_only = parsed.path.rstrip("/") or "/"
        uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return
        url, key = supabase_config()

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
        members_out: list[dict[str, Any]] = []
        for m in members_raw:
            em = _admin_user_email(url, key, m["user_id"])
            row = dict(m)
            row["email"] = em
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
            token = (body.get("token") or "").strip()
            if not token:
                send_json(self, 400, {"error": "Missing token"})
                return
            r = requests.get(
                f"{url}/rest/v1/family_invitations?token=eq.{token}&status=eq.pending&select=*",
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
                        send_json(self, 400, {"error": "Invitation expired"})
                        return
                except ValueError:
                    pass
            inv_email = (inv.get("email") or "").strip().lower()
            if not email or inv_email != email:
                send_json(self, 403, {"error": "Signed-in email must match the invitation"})
                return
            fid = inv["family_id"]
            dup = requests.get(
                (
                    f"{url}/rest/v1/family_members?family_id=eq.{fid}"
                    f"&user_id=eq.{uid}&select=id&limit=1"
                ),
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
            if dup.status_code == 200 and isinstance(dup.json(), list) and dup.json():
                send_json(self, 200, {"ok": True, "alreadyMember": True})
                return
            ins = requests.post(
                f"{url}/rest/v1/family_members",
                headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                json={"family_id": fid, "user_id": uid, "role": "member"},
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
            send_json(self, 200, {"ok": True, "familyId": fid})
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

            target_uid = _resolve_auth_user_id_by_email(url, key, email_norm)
            if target_uid:
                if target_uid == uid:
                    send_json(self, 400, {"error": "You are already in this family"})
                    return
                ex = requests.get(
                    (
                        f"{url}/rest/v1/family_members?family_id=eq.{fid}"
                        f"&user_id=eq.{target_uid}&select=id&limit=1"
                    ),
                    headers={"Authorization": f"Bearer {key}", "apikey": key},
                    timeout=30,
                )
                if ex.status_code == 200 and isinstance(ex.json(), list) and ex.json():
                    send_json(self, 409, {"error": "This user is already a member"})
                    return
                ins = requests.post(
                    f"{url}/rest/v1/family_members",
                    headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                    json={"family_id": fid, "user_id": target_uid, "role": "member"},
                    timeout=30,
                )
                if ins.status_code not in (200, 201):
                    send_json(self, 500, {"error": ins.text or "Failed to add member"})
                    return
                row = ins.json()[0] if isinstance(ins.json(), list) else ins.json()
                send_json(self, 201, {"addedMember": True, "member": row})
                return

            pend = requests.get(
                f"{url}/rest/v1/family_invitations",
                params={
                    "family_id": f"eq.{fid}",
                    "email": f"eq.{email_norm}",
                    "status": "eq.pending",
                    "select": "id",
                    "limit": "1",
                },
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
            if pend.status_code == 200 and isinstance(pend.json(), list) and pend.json():
                send_json(self, 409, {"error": "An invitation is already pending for this email"})
                return

            token = str(uuid.uuid4())
            expires = (datetime.now(timezone.utc) + timedelta(days=INVITE_VALID_DAYS)).isoformat()
            ins_inv = requests.post(
                f"{url}/rest/v1/family_invitations",
                headers={**_sb_headers_json(url, key), "Prefer": "return=representation"},
                json={
                    "family_id": fid,
                    "email": email_norm,
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
            load_env()
            base = (os.environ.get("PUBLIC_APP_URL") or os.environ.get("NEXT_PUBLIC_APP_URL") or "").rstrip("/")
            if base:
                invite_link = f"{base}/family/invite?token={token}"
            else:
                invite_link = f"momentovino://family/invite?token={token}"
            ok, err_msg = _send_resend_invite(email_norm, fam.get("name") or "MomentoVino", invite_link)
            if not ok:
                send_json(self, 502, {"error": f"Invitation saved but email failed: {err_msg}"})
                return
            send_json(self, 201, {"invited": True, "invitation": inv_row})
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
            if _owned_family(url, key, uid):
                send_json(self, 409, {"error": "You already have a family"})
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
