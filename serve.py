#!/usr/bin/env python3
"""
Static server with cross-origin isolation headers enabled.

The Godot Web Editor uses SharedArrayBuffer, which only works in a
"cross-origin isolated" browsing context. To embed editor.godotengine.org
in an iframe served from this site, we need:

  Cross-Origin-Opener-Policy:   same-origin
  Cross-Origin-Embedder-Policy: credentialless

`credentialless` lets us embed cross-origin iframes (like the Godot editor)
without requiring them to send CORP: cross-origin — the browser loads them
without credentials. Chrome 110+, Firefox 119+, Safari 17+ all support it.

Usage:
    python3 serve.py            # defaults to port 8765
    python3 serve.py 9000       # custom port
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn


class COIHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "credentialless")
        # Let any origin link to our resources (harmless for a learning site).
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        # Disable aggressive caching during local dev.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class ThreadedServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    addr = ("127.0.0.1", port)
    httpd = ThreadedServer(addr, COIHandler)
    print(f"Serving on http://{addr[0]}:{addr[1]}  (cross-origin isolated)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()


if __name__ == "__main__":
    main()
