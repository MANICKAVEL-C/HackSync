import http.server
import socketserver
import sys
import os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("==================================================")
        print("HackSync Pro — Executive Competition Intelligence Platform")
        print(f"URL: http://127.0.0.1:{PORT} (Google OAuth 2.0 Enabled)")
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)

if __name__ == "__main__":
    run_server()
