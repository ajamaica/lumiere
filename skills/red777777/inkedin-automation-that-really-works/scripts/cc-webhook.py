#!/usr/bin/env python3
"""Content Calendar webhook — receives approve/edit/skip actions, updates cc-data.json.
Deploy as systemd service. Configure paths via env vars or edit defaults below."""
import json, os, re
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Configure these for your setup
ACTIONS_FILE = os.environ.get("CC_ACTIONS_FILE", os.path.expanduser("~/clawd/content-calendar-actions.json"))
DATA_FILE = os.environ.get("CC_DATA_FILE", "/var/www/preview/cc-data.json")
WAKE_FILE = os.environ.get("CC_WAKE_FILE", os.path.expanduser("~/clawd/content-calendar-pending.json"))
PORT = int(os.environ.get("CC_WEBHOOK_PORT", "8401"))

def load_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return [] if 'actions' in path else {"posts": {}}

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/data'):
            data = load_json(DATA_FILE)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
        else:
            actions = load_json(ACTIONS_FILE)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps(actions, ensure_ascii=False).encode())

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode()
        try:
            data = json.loads(body)
        except:
            self.send_response(400)
            self.end_headers()
            return

        data['received_at'] = datetime.now().isoformat()

        # Log to actions file
        actions = load_json(ACTIONS_FILE)
        actions.append(data)
        save_json(ACTIONS_FILE, actions)

        # Update cc-data.json based on action type
        cc_data = load_json(DATA_FILE)
        post_id = data.get('postId')
        action_type = data.get('type')
        applied = False

        if post_id and post_id in cc_data.get('posts', {}):
            post = cc_data['posts'][post_id]

            if action_type == 'status':
                post['status'] = data.get('status', post.get('status'))

            elif action_type == 'edit':
                note = data.get('note', '')
                # Auto-apply simple "X -> Y" edits
                if '->' in note:
                    parts = note.split('->', 1)
                    old_text = parts[0].strip().rstrip(':').strip()
                    new_text = parts[1].strip()
                    if old_text and new_text and old_text in post.get('text', ''):
                        post['text'] = post['text'].replace(old_text, new_text)
                        post['status'] = 'ready'
                        applied = True

                if not applied:
                    # Complex edit — flag for agent processing
                    post['status'] = 'edit-requested'
                    if 'editNotes' not in post:
                        post['editNotes'] = []
                    post['editNotes'].append({
                        'note': note,
                        'timestamp': data.get('timestamp', datetime.now().isoformat())
                    })
                    try:
                        with open(WAKE_FILE, 'w') as wf:
                            json.dump({
                                'type': 'edit', 'postId': post_id,
                                'note': note, 'timestamp': datetime.now().isoformat()
                            }, wf)
                    except:
                        pass

            save_json(DATA_FILE, cc_data)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True, "auto_applied": applied}).encode())

    def do_PUT(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode()
        try:
            data = json.loads(body)
        except:
            self.send_response(400)
            self.end_headers()
            return

        cc_data = load_json(DATA_FILE)
        post_id = data.get('postId')

        if post_id and post_id in cc_data.get('posts', {}):
            post = cc_data['posts'][post_id]
            for key in ['text', 'title', 'image', 'status', 'tags', 'subtitle']:
                if key in data:
                    post[key] = data[key]
            save_json(DATA_FILE, cc_data)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True}).encode())

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', PORT), Handler)
    print(f"CC webhook listening on :{PORT}")
    server.serve_forever()
