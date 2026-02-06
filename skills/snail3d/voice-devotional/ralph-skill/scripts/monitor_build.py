#!/usr/bin/env python3
"""
Monitor Claude Code build session and report progress.
Checks session status at intervals and alerts on progress/errors.
"""

import sys
import time
import subprocess
from pathlib import Path
from typing import Optional
import json

class BuildMonitor:
    def __init__(self, session_id: str, check_interval: int = 30):
        self.session_id = session_id
        self.check_interval = check_interval
        self.last_status = None
        self.error_count = 0
        
    def check_session_status(self) -> bool:
        """Check if session is still running."""
        try:
            result = subprocess.run(
                ["process", "action:poll", f"sessionId:{self.session_id}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            # If output contains "Process still running" or similar, it's active
            return "running" in result.stdout.lower() or "Process still running" in result.stdout
        except:
            return False
    
    def get_session_log(self, lines: int = 20) -> str:
        """Get recent session output."""
        try:
            result = subprocess.run(
                ["process", "action:log", f"sessionId:{self.session_id}", f"limit:{lines}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout
        except:
            return ""
    
    def check_file_changes(self, watch_dir: str) -> list:
        """Check what files have been created/modified."""
        try:
            modified_files = []
            for file_path in Path(watch_dir).rglob("*"):
                if file_path.is_file():
                    # Get modification time
                    mtime = file_path.stat().st_mtime
                    current_time = time.time()
                    if current_time - mtime < self.check_interval + 5:  # Recently modified
                        modified_files.append(str(file_path))
            return modified_files
        except:
            return []
    
    def report_status(self, watch_dir: str):
        """Print current build status."""
        is_running = self.check_session_status()
        files_changed = self.check_file_changes(watch_dir)
        
        print(f"\n📊 BUILD STATUS CHECK", file=sys.stderr)
        print(f"⏱️  Session: {self.session_id[:12]}...", file=sys.stderr)
        print(f"{'🟢 RUNNING' if is_running else '🔴 STOPPED'}", file=sys.stderr)
        
        if files_changed:
            print(f"📝 Recent files ({len(files_changed)}):", file=sys.stderr)
            for fname in files_changed[:5]:
                print(f"   - {Path(fname).name}", file=sys.stderr)
            if len(files_changed) > 5:
                print(f"   ... and {len(files_changed) - 5} more", file=sys.stderr)
        
        # Show recent output snippet
        log = self.get_session_log(5)
        if log and "thinking" not in log.lower():
            print(f"💬 Recent activity: {log[:100]}...", file=sys.stderr)
        
        return is_running
    
    def monitor_loop(self, watch_dir: str, max_duration: int = 3600):
        """Continuously monitor the build."""
        start_time = time.time()
        check_count = 0
        
        print(f"🔍 Monitoring build (session: {self.session_id}) for max {max_duration}s", file=sys.stderr)
        
        while time.time() - start_time < max_duration:
            check_count += 1
            
            # Check status
            is_running = self.report_status(watch_dir)
            
            if not is_running:
                self.error_count += 1
                if self.error_count > 2:
                    print(f"❌ Session appears to have stopped. Check {self.session_id}", file=sys.stderr)
                    return False
            else:
                self.error_count = 0  # Reset on successful check
            
            # Wait before next check
            time.sleep(self.check_interval)
        
        print(f"✅ Monitoring complete ({check_count} checks)", file=sys.stderr)
        return True

def main():
    if len(sys.argv) < 3:
        print("Usage: monitor_build.py <session_id> <watch_dir> [--interval <seconds>]", file=sys.stderr)
        sys.exit(1)
    
    session_id = sys.argv[1]
    watch_dir = sys.argv[2]
    interval = 30
    
    # Parse optional interval
    if len(sys.argv) > 4 and sys.argv[3] == "--interval":
        interval = int(sys.argv[4])
    
    monitor = BuildMonitor(session_id, interval)
    success = monitor.monitor_loop(watch_dir)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
