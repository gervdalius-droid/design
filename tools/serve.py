#!/usr/bin/env python3
"""Dev server for builder2 (no caching).  python3 tools/serve.py [port]   → http://127.0.0.1:8765/

  /                → the new app (index.html in the project root, built by build.py)
  /legacy/         → the untouched snapshot of the live builder (for side-by-side comparison)
  /hub/shared/*    → legacy/hub-shared/* (the scripts the live app loads from the hub)
"""
import http.server, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def translate_path(self, path):
        if path.startswith("/hub/shared/"):
            path = "/legacy/hub-shared/" + path[len("/hub/shared/"):]
        return super().translate_path(path)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    print("builder2 → http://127.0.0.1:%d/   (legacy snapshot: /legacy/)" % port)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
