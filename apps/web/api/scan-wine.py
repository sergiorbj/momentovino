import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Dict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests

from _api_common import auth_bearer_user_id, load_env, send_json

_API_DIR = Path(__file__).resolve().parent
_PROMPTS_DIR = _API_DIR / "prompts"
_SUPPORTED_LANGUAGES = frozenset({"en", "pt-BR", "pt-PT", "es", "it"})
_DEFAULT_LANGUAGE = "en"
_prompt_cache: Dict[str, str] = {}


def _resolve_language(value: object) -> str:
    return value if isinstance(value, str) and value in _SUPPORTED_LANGUAGES else _DEFAULT_LANGUAGE


def _load_scan_wine_label_prompt(language: str) -> str:
    cached = _prompt_cache.get(language)
    if cached is not None:
        return cached
    path = _PROMPTS_DIR / f"scan-wine-label.{language}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    lines = data.get("prompt")
    if isinstance(lines, list):
        prompt = "\n".join(str(x) for x in lines)
    elif isinstance(lines, str):
        prompt = lines
    else:
        raise ValueError(f"{path.name} must contain a string or array \"prompt\"")
    _prompt_cache[language] = prompt
    return prompt


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

        language = _resolve_language(body.get("language"))

        load_env()
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            send_json(self, 500, {"error": "Missing GEMINI_API_KEY"})
            return

        gemini_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-3.1-flash-lite:generateContent"
        )
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": _load_scan_wine_label_prompt(language)},
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
            # Older app builds show `error` verbatim; newer ones translate `code`.
            send_json(
                self,
                200,
                {"error": "Could not identify wine from this image", "code": "not_identified"},
            )
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
