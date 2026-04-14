import json
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Optional

import requests

from _api_common import auth_bearer_user_id, load_env, send_json

_API_DIR = Path(__file__).resolve().parent
_PROMPT_JSON = _API_DIR / "jsons" / "scan-wine-label.json"
_scan_wine_label_prompt_cache: Optional[str] = None


def _load_scan_wine_label_prompt() -> str:
    global _scan_wine_label_prompt_cache
    if _scan_wine_label_prompt_cache is not None:
        return _scan_wine_label_prompt_cache
    with open(_PROMPT_JSON, encoding="utf-8") as f:
        data = json.load(f)
    lines = data.get("prompt")
    if isinstance(lines, list):
        _scan_wine_label_prompt_cache = "\n".join(str(x) for x in lines)
    elif isinstance(lines, str):
        _scan_wine_label_prompt_cache = lines
    else:
        raise ValueError("jsons/scan-wine-label.json must contain a string or array \"prompt\"")
    return _scan_wine_label_prompt_cache


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        _uid, err = auth_bearer_user_id(self)
        if err:
            send_json(self, err[0], err[1])
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            send_json(self, 400, {"error": "Invalid JSON body"})
            return

        image = body.get("image")
        mime_type = body.get("mimeType")
        if not image or not mime_type:
            send_json(self, 400, {"error": "Missing image or mimeType in request body"})
            return

        load_env()
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            send_json(self, 500, {"error": "Missing GEMINI_API_KEY"})
            return

        gemini_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent"
        )
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": _load_scan_wine_label_prompt()},
                        {"inlineData": {"mimeType": mime_type, "data": image}},
                    ],
                }
            ],
            "generationConfig": {"responseMimeType": "application/json"},
        }

        try:
            r = requests.post(
                gemini_url,
                params={"key": api_key},
                headers={"Content-Type": "application/json"},
                data=json.dumps(payload),
                timeout=120,
            )
        except requests.RequestException as e:
            send_json(self, 500, {"error": str(e)})
            return

        if r.status_code != 200:
            try:
                detail = r.json()
            except Exception:
                detail = r.text
            send_json(
                self,
                500,
                {"error": "Gemini request failed", "status": r.status_code, "detail": detail},
            )
            return

        try:
            outer = r.json()
            text = (
                outer.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            parsed = json.loads(text)
        except (json.JSONDecodeError, IndexError, KeyError, TypeError) as e:
            send_json(self, 500, {"error": f"Failed to parse model response: {e!s}"})
            return

        if not isinstance(parsed, dict):
            send_json(self, 500, {"error": "Invalid scan response shape"})
            return

        if "error" in parsed and "name" not in parsed:
            send_json(self, 200, parsed)
            return

        required = ("name", "producer", "region", "country", "type", "description")
        allowed_types = frozenset(
            {"RED", "WHITE", "ROSE", "SPARKLING", "DESSERT", "FORTIFIED", "UNKNOWN"}
        )
        for key in required:
            val = parsed.get(key)
            if not isinstance(val, str) or not val.strip():
                send_json(
                    self,
                    502,
                    {"error": f'Invalid scan response: field "{key}" must be a non-empty string'},
                )
                return
        t = parsed["type"].strip().upper()
        if t not in allowed_types:
            send_json(
                self,
                502,
                {"error": f'Invalid scan response: type must be one of {", ".join(sorted(allowed_types))}'},
            )
            return

        out = {k: parsed[k].strip() for k in required}
        out["type"] = t
        send_json(self, 200, out)
