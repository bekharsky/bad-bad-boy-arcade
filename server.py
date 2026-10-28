"""Serve the local game without retaining stale application modules."""

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


class GameServer(ThreadingHTTPServer):
    # The import map loads many ES modules at once. A five-connection backlog
    # can drop WebKit's parallel requests before the handler ever sees them.
    request_queue_size = 128


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        path = urlsplit(self.path).path
        if path == "/" or Path(path).suffix in {".html", ".js", ".css", ".json"}:
            self.send_header("Cache-Control", "no-store")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with GameServer((args.bind, args.port), GameHandler) as server:
        print(f"Golden Blast: http://{args.bind}:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
