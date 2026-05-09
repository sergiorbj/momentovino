"""
Migrate Pro entitlement from an orphaned anonymous user_id to the
currently-authenticated user.

The mobile onboarding flow runs the paywall while the session is still
anonymous (so the purchase is anchored on the anon user_id). Email signup
upgrades that anon user via `updateUser` (preserving user_id), but native
Apple/Google sign-in goes through `signInWithIdToken`, which swaps the
session to a brand-new user_id and orphans the entitlement.

This endpoint is the recovery path for that swap. The mobile client captures
the anon access_token *before* signing in with Apple/Google, then POSTs it
here once the new session is established. We verify both tokens with GoTrue
(so the caller has to actually own the anon session — they can't claim a
random user_id), then move the pro_* columns with the service role.

POST /api/claim-anon-entitlement
  Authorization: Bearer <new user JWT>            (post-Apple/Google session)
  Body: { "anon_token": "<the anon user's access_token>" }

Returns:
  { "migrated": true, "expiresAt": "2026-..." }   when entitlement moved
  { "migrated": false, "reason": "..." }          when there was nothing to move
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests

from _api_common import auth_bearer_user_id, send_json, supabase_config


PRO_COLUMNS = (
    "pro_active",
    "pro_expires_at",
    "pro_will_renew",
    "pro_in_grace_period",
    "pro_in_billing_retry",
    "pro_period_type",
    "pro_store",
    "pro_product_id",
    "pro_original_transaction_id",
    "pro_event_at",
    "pro_environment",
)


def _verify_token(url: str, key: str, token: str) -> Optional[dict[str, Any]]:
    r = requests.get(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    return r.json()


def _read_profile(url: str, key: str, uid: str) -> Optional[dict[str, Any]]:
    r = requests.get(
        f"{url}/rest/v1/profiles?id=eq.{uid}&select={','.join(PRO_COLUMNS)}&limit=1",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    rows = r.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def _patch_profile(url: str, key: str, uid: str, fields: dict[str, Any]) -> bool:
    r = requests.patch(
        f"{url}/rest/v1/profiles?id=eq.{uid}",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=fields,
        timeout=30,
    )
    return r.status_code in (200, 204)


def _entitlement_is_live(profile: dict[str, Any]) -> bool:
    """Mirrors the `user_entitlement` view: pro_active AND not expired."""
    if not bool(profile.get("pro_active")):
        return False
    expires_raw = profile.get("pro_expires_at")
    if expires_raw is None:
        return True
    try:
        # Postgres returns ISO 8601 with `+00:00` or `Z`; both parse via fromisoformat
        # once the trailing Z is normalized.
        normalized = expires_raw.replace("Z", "+00:00") if isinstance(expires_raw, str) else ""
        if not normalized:
            return False
        expires = datetime.fromisoformat(normalized)
    except ValueError:
        return False
    return expires > datetime.now(timezone.utc)


def _read_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    n = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(n) if n else b""
    try:
        return json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        new_uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        url, key = supabase_config()
        if not url or not key:
            send_json(self, 500, {"error": "Supabase not configured"})
            return

        body = _read_body(self)
        anon_token = (body.get("anon_token") or "").strip()
        if not anon_token:
            send_json(self, 400, {"error": "anon_token is required"})
            return

        anon_user = _verify_token(url, key, anon_token)
        if not anon_user:
            send_json(self, 401, {"error": "Invalid or expired anon_token"})
            return

        anon_uid = anon_user.get("id")
        if not anon_uid:
            send_json(self, 401, {"error": "anon_token missing user id"})
            return

        if anon_uid == new_uid:
            send_json(self, 200, {"migrated": False, "reason": "same_user"})
            return

        # Source must actually be an anonymous user with no linked identities,
        # otherwise this would be a way to drain a real account's entitlement.
        if not bool(anon_user.get("is_anonymous")):
            send_json(self, 403, {"error": "source user is not anonymous"})
            return
        identities = anon_user.get("identities") or []
        if isinstance(identities, list) and len(identities) > 0:
            send_json(self, 403, {"error": "source user has linked identities"})
            return

        anon_profile = _read_profile(url, key, anon_uid)
        if not anon_profile:
            send_json(self, 200, {"migrated": False, "reason": "no_anon_profile"})
            return

        if not _entitlement_is_live(anon_profile):
            send_json(self, 200, {"migrated": False, "reason": "no_active_entitlement"})
            return

        # Don't clobber a real, still-active entitlement on the destination
        # (e.g. user already had Pro on the email account before signing in).
        dest_profile = _read_profile(url, key, new_uid)
        if dest_profile and _entitlement_is_live(dest_profile):
            send_json(
                self,
                200,
                {"migrated": False, "reason": "destination_already_pro"},
            )
            return

        copy_fields = {col: anon_profile.get(col) for col in PRO_COLUMNS}
        if not _patch_profile(url, key, new_uid, copy_fields):
            send_json(self, 500, {"error": "Failed to copy entitlement"})
            return

        clear_fields = {
            "pro_active": False,
            "pro_expires_at": None,
            "pro_will_renew": False,
            "pro_in_grace_period": False,
            "pro_in_billing_retry": False,
            "pro_period_type": None,
            "pro_store": None,
            "pro_product_id": None,
            "pro_original_transaction_id": None,
            "pro_event_at": None,
            "pro_environment": None,
        }
        if not _patch_profile(url, key, anon_uid, clear_fields):
            # The destination already has the entitlement; failing to clear the
            # orphan isn't fatal but is worth logging.
            print(f"[claim-anon-entitlement] failed to clear orphan profile {anon_uid}")

        send_json(
            self,
            200,
            {
                "migrated": True,
                "expiresAt": anon_profile.get("pro_expires_at"),
                "productId": anon_profile.get("pro_product_id"),
            },
        )
