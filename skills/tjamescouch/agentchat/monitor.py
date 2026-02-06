#!/usr/bin/env python3
"""Simple blocking monitor - polls until messages arrive, then prints and exits.

Exit codes:
  0  - Normal exit (messages found, timeout, or interrupt)
  42 - Stop file detected (.agentchat/stop) - signals to stop monitoring loop

To stop monitoring: touch .agentchat/stop
"""

import json
import signal
import sys
import time
from pathlib import Path

# Flag to track if we should exit
_shutdown = False

def _handle_signal(signum, frame):
    """Handle interrupt signals gracefully."""
    global _shutdown
    _shutdown = True
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)

DAEMON_DIR = Path(".agentchat/daemons/default")
NEWDATA = DAEMON_DIR / "newdata"
INBOX = DAEMON_DIR / "inbox.jsonl"
LAST_TS = DAEMON_DIR / "last_ts"
STOP_FILE = Path(".agentchat/stop")

def get_last_ts():
    if LAST_TS.exists():
        return int(LAST_TS.read_text().strip())
    return 0

def set_last_ts(ts):
    LAST_TS.write_text(str(ts))

def read_new_messages():
    since = get_last_ts()
    messages = []
    if not INBOX.exists():
        return messages

    for line in INBOX.read_text().strip().split('\n'):
        if not line:
            continue
        try:
            msg = json.loads(line)
            # Filter out replay messages and @server noise (welcome messages, etc.)
            if msg.get('ts', 0) > since and not msg.get('replay') and msg.get('from') != '@server':
                messages.append(msg)
        except json.JSONDecodeError:
            continue

    return sorted(messages, key=lambda m: m.get('ts', 0))

def main():
    interval = float(sys.argv[1]) if len(sys.argv) > 1 else 5
    max_wait = float(sys.argv[2]) if len(sys.argv) > 2 else 300  # 5 min default

    start = time.time()
    while not _shutdown and time.time() - start < max_wait:
        # Check for stop file - allows clean shutdown of monitoring loop
        if STOP_FILE.exists():
            try:
                STOP_FILE.unlink()
            except FileNotFoundError:
                pass
            sys.exit(42)  # Special exit code signals "stop monitoring"
        if NEWDATA.exists():
            messages = read_new_messages()
            if messages:
                # Update timestamp
                max_ts = max(m.get('ts', 0) for m in messages)
                set_last_ts(max_ts)
                # Delete semaphore
                try:
                    NEWDATA.unlink()
                except FileNotFoundError:
                    pass
                # Output messages
                for msg in messages:
                    print(json.dumps(msg))
                return
            # Semaphore but no new messages after filtering
            try:
                NEWDATA.unlink()
            except FileNotFoundError:
                pass
        try:
            time.sleep(interval)
        except KeyboardInterrupt:
            return

    # Timeout - no messages
    print("", file=sys.stderr)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass  # Exit silently on Ctrl+C
