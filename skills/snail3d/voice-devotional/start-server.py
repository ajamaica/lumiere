#!/usr/bin/env python3
"""
Simple HTTP server for downloading generated videos
"""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 8888
SERVE_DIR = Path("/Users/ericwoodard/clawd")

class VideoHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SERVE_DIR), **kwargs)
    
    def log_message(self, format, *args):
        print(f"[{self.client_address[0]}] {format%args}")

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), VideoHandler) as httpd:
        print(f"\n🎬 Video Server Running")
        print(f"{'='*50}")
        print(f"📍 http://localhost:{PORT}")
        print(f"📁 Serving from: {SERVE_DIR}")
        print(f"{'='*50}\n")
        print(f"Available files:")
        for f in SERVE_DIR.glob("*.mp4"):
            size_mb = f.stat().st_size / (1024*1024)
            print(f"  📽️  {f.name} ({size_mb:.1f} MB)")
        print()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n✋ Server stopped")
