from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from typing import Any, Optional

import requests

from _api_common import auth_bearer_user_id, send_json, supabase_config
from _wine_match import find_matching_wine


def _opt_str(value: object) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def _fetch_user_wines(
    url: str, key: str, user_id: str
) -> tuple[list[dict[str, Any]] | None, str | None]:
    rest_url = f"{url}/rest/v1/wines?select=*&created_by=eq.{user_id}&order=created_at.desc"
    try:
        r = requests.get(
            rest_url,
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            timeout=30,
        )
    except requests.RequestException as e:
        return None, str(e)
    if r.status_code != 200:
        return None, r.text or "Failed to list wines"
    try:
        rows = r.json()
    except Exception:
        return None, "Invalid response from database"
    return (rows if isinstance(rows, list) else []), None


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        user_id, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        url, key = supabase_config()
        rows, err = _fetch_user_wines(url, key, user_id)
        if err is not None:
            send_json(self, 500, {"error": err})
            return
        send_json(self, 200, rows or [])

    def do_POST(self):
        user_id, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            send_json(self, 400, {"error": "Invalid request body"})
            return

        name = body.get("name")
        if not name or not str(name).strip() or len(str(name).strip()) < 2:
            send_json(self, 400, {"error": "Wine name is required (min 2 chars)"})
            return

        producer = body.get("producer")
        vintage = body.get("vintage")
        region = body.get("region")
        country = body.get("country")
        wine_type = body.get("type")

        row = {
            "created_by": user_id,
            "name": str(name).strip(),
            "producer": _opt_str(producer),
            "vintage": vintage,
            "region": _opt_str(region),
            "country": _opt_str(country),
            "type": wine_type or None,
        }

        url, key = supabase_config()
        existing_rows, list_err = _fetch_user_wines(url, key, user_id)
        if list_err is not None:
            send_json(self, 500, {"error": list_err})
            return

        match = find_matching_wine(
            existing_rows or [],
            row["name"],
            row.get("producer"),
            row.get("country"),
        )
        if match is not None:
            out = dict(match)
            out["reusedExisting"] = True
            send_json(self, 200, out)
            return

        rest_url = f"{url}/rest/v1/wines"
        try:
            r = requests.post(
                rest_url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "apikey": key,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
                data=json.dumps(row),
                timeout=30,
            )
        except requests.RequestException as e:
            send_json(self, 500, {"error": str(e)})
            return

        if r.status_code not in (200, 201):
            try:
                detail = r.json()
            except Exception:
                detail = r.text
            send_json(self, 500, {"error": detail if isinstance(detail, str) else str(detail)})
            return

        try:
            created = r.json()
        except Exception:
            send_json(self, 500, {"error": "Invalid response from database"})
            return

        if isinstance(created, list) and created:
            send_json(self, 201, created[0])
        elif isinstance(created, dict):
            send_json(self, 201, created)
        else:
            send_json(self, 500, {"error": "Failed to create wine"})

    def do_DELETE(self):
        user_id, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            send_json(self, 400, {"error": "Invalid request body"})
            return

        ids_raw = body.get("ids")
        if not isinstance(ids_raw, list) or not ids_raw:
            send_json(self, 400, {"error": "Expected non-empty array \"ids\" of wine UUIDs"})
            return

        ids: list[str] = []
        for x in ids_raw:
            s = str(x).strip()
            if s:
                ids.append(s)
        if not ids:
            send_json(self, 400, {"error": "Expected non-empty array \"ids\" of wine UUIDs"})
            return

        url, key = supabase_config()
        in_list = ",".join(ids)
        verify_url = f"{url}/rest/v1/wines?select=id&id=in.({in_list})&created_by=eq.{user_id}"
        try:
            vr = requests.get(
                verify_url,
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=30,
            )
        except requests.RequestException as e:
            send_json(self, 500, {"error": str(e)})
            return
        if vr.status_code != 200:
            send_json(self, 500, {"error": vr.text or "Failed to verify wines"})
            return
        try:
            found = vr.json()
        except Exception:
            send_json(self, 500, {"error": "Invalid response from database"})
            return
        if not isinstance(found, list) or len(found) != len(ids):
            send_json(
                self,
                400,
                {"error": "One or more wines were not found or do not belong to you"},
            )
            return

        rest_url = f"{url}/rest/v1/wines?id=in.({in_list})&created_by=eq.{user_id}"
        try:
            r = requests.delete(
                rest_url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "apikey": key,
                    "Prefer": "return=minimal",
                },
                timeout=30,
            )
        except requests.RequestException as e:
            send_json(self, 500, {"error": str(e)})
            return

        if r.status_code not in (200, 204):
            try:
                detail = r.json()
            except Exception:
                detail = r.text
            send_json(
                self,
                500,
                {"error": detail if isinstance(detail, str) else str(detail)},
            )
            return

        send_json(self, 200, {"deleted": len(ids)})
