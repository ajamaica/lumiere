import sys
import subprocess
import os
import shutil

# Configuration
THRESHOLD_LINES = 50
PRESERVE_LINES = 20

def get_gemini_path():
    path = os.environ.get("GEMINI_PATH")
    if path and os.path.isfile(path) and os.access(path, os.X_OK):
        return path
    
    path = shutil.which("gemini")
    if path:
        return path
        
    return None

def compact_file(filepath):
    if not os.path.exists(filepath):
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if len(lines) <= THRESHOLD_LINES:
        return

    print(f"[Compactor] Compacting {filepath} ({len(lines)} lines)...")

    # Split content
    old_content_lines = lines[:-PRESERVE_LINES]
    recent_content_lines = lines[-PRESERVE_LINES:]
    
    old_content = "".join(old_content_lines)
    recent_content = "".join(recent_content_lines)

    # Prepare prompt
    prompt = f"""
You are a History Compactor.
Summarize the following log entries into a concise bulleted history.
Discard trivial details but preserve key decisions, errors, and outcomes.

--- LOG START ---
{old_content}
--- LOG END ---

Output ONLY the summary.
"""

    gemini_path = get_gemini_path()
    if not gemini_path:
        print("[Compactor] Error: gemini CLI not found. Skipping compaction.")
        return

    try:
        # Call gemini to summarize
        # Use auto-gemini-3 (gemini-2.0-flash-thinking) for reasoning
        process = subprocess.run(
            [gemini_path, "chat", "--model", "auto-gemini-3", prompt],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if process.returncode != 0:
            print(f"[Compactor] Error calling Gemini: {process.stderr}")
            return

        summary = process.stdout.strip()
        
        # Construct new file content
        filename = os.path.basename(filepath)
        title = "Progress Log" if "progress" in filename else "Findings & Scratchpad"
        
        new_content = f"# {title}\n\n## 🗃️ Compacted History\n{summary}\n\n## 🔄 Recent Activity\n{recent_content}"
        
        # Backup and Overwrite
        shutil.copy(filepath, f"{filepath}.bak")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        print(f"[Compactor] Successfully compacted {filepath}.")

    except Exception as e:
        print(f"[Compactor] Critical Error: {e}")

def main():
    # Fix for Windows CP949 encoding issue
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    dry_run = "--dry-run" in sys.argv
    
    targets = ["progress.md", "findings.md"]
    
    for target in targets:
        if os.path.exists(target):
            if dry_run:
                print(f"[Compactor] Dry-run: Would check {target}")
            else:
                compact_file(target)

if __name__ == "__main__":
    main()
