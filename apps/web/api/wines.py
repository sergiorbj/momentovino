import json
from http.server import BaseHTTPRequestHandler
from typing import Optional

import requests

from _api_common import auth_bearer_user_id, send_json, supabase_config


def _opt_str(value: object) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        user_id, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        url, key = supabase_config()
        rest_url = f"{url}/rest/v1/wines?select=*&created_by=eq.{user_id}&order=created_at.desc"
        try:
            r = requests.get(
                rest_url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "apikey": key,
                },
                timeout=30,
            )
        except requests.RequestException as e:
            send_json(self, 500, {"error": str(e)})
            return

        if r.status_code != 200:
            send_json(self, 500, {"error": r.text or "Failed to list wines"})
            return

        try:
            rows = r.json()
        except Exception:
            send_json(self, 500, {"error": "Invalid response from database"})
            return

        send_json(self, 200, rows if isinstance(rows, list) else [])

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
