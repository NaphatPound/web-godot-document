#!/usr/bin/env python3
"""
Static server with:
  1. Cross-origin isolation headers (so the Godot Web Editor iframe can run).
  2. A /api/chat proxy that forwards to the Ollama cloud OpenAI-compatible
     endpoint. The API key stays on the server and never reaches the browser.

Usage:
    python3 serve.py            # defaults to port 8765
    python3 serve.py 9000       # custom port

Create config.local.json beside this file (copy config.example.json) with:
  {
    "ollama_api_key": "...",
    "ollama_model": "glm-5.1:cloud",
    "ollama_base_url": "https://ollama.com/v1"
  }
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn


HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.local.json")


def load_config() -> dict:
    if not os.path.exists(CONFIG_PATH):
        return {}
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


CONFIG = load_config()


class COIHandler(SimpleHTTPRequestHandler):
    # ---- Common response decorations ----
    def end_headers(self) -> None:
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "credentialless")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---- CORS / preflight for the chat endpoint ----
    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") == "/api/chat":
            self._handle_chat()
            return
        self.send_error(404, "Not found")

    # ---- /api/chat proxy ----
    def _handle_chat(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body)
        except Exception as e:
            self._json_error(400, f"Bad request: {e}")
            return

        api_key = CONFIG.get("ollama_api_key", "").strip()
        model = payload.get("model") or CONFIG.get("ollama_model", "glm-5.1:cloud")
        base_url = CONFIG.get("ollama_base_url", "https://ollama.com/v1").rstrip("/")

        if not api_key or api_key.startswith("YOUR_"):
            self._json_error(500, "Server missing ollama_api_key. Create config.local.json (see config.example.json).")
            return

        messages = payload.get("messages") or []
        if not isinstance(messages, list) or not messages:
            self._json_error(400, "Payload must contain a non-empty 'messages' array.")
            return

        req_body = {
            "model": model,
            "messages": messages,
            "stream": False,
            "temperature": payload.get("temperature", 0.4),
        }

        req = urllib.request.Request(
            url=f"{base_url}/chat/completions",
            data=json.dumps(req_body).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
                data = json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            self._json_error(e.code, f"Upstream error: {body}")
            return
        except Exception as e:
            self._json_error(502, f"Upstream request failed: {e}")
            return

        # OpenAI-style response: { choices: [{ message: { role, content } }] }
        content = ""
        try:
            content = data["choices"][0]["message"]["content"]
        except Exception:
            content = json.dumps(data)

        out = {
            "content": content,
            "model": data.get("model", model),
            "usage": data.get("usage"),
        }
        payload_bytes = json.dumps(out).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload_bytes)

    def _json_error(self, code: int, msg: str) -> None:
        body = json.dumps({"error": msg}).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


class ThreadedServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    addr = ("127.0.0.1", port)
    has_key = bool(CONFIG.get("ollama_api_key", "").strip()) and not CONFIG.get("ollama_api_key", "").startswith("YOUR_")
    print(f"Serving on http://{addr[0]}:{addr[1]}  (cross-origin isolated)")
    print(f"  AI chat: {'enabled (config.local.json found)' if has_key else 'DISABLED (add config.local.json to enable)'}")
    httpd = ThreadedServer(addr, COIHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()


if __name__ == "__main__":
    main()
