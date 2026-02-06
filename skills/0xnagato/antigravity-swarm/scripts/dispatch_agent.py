import sys
import subprocess
import re
import os
import shutil
import json
import time

def parse_and_execute_side_effects(output):
    """
    Parses the agent output for special tags and executes the side effects.
    Supports:
    1. <<WRITE_FILE path="...">>content<<END_WRITE>>
    2. <<RUN_COMMAND>>command<<END_COMMAND>>
    """
    # Pattern for WRITE_FILE
    # Captures path in group 1, content in group 2.
    # Uses DOTALL to match newlines in content.
    write_pattern = re.compile(r'<<WRITE_FILE path="([^"]+)">>(.*?)<<END_WRITE>>', re.DOTALL)
    
    # Pattern for RUN_COMMAND
    # Captures command in group 1.
    run_pattern = re.compile(r'<<RUN_COMMAND>>(.*?)<<END_COMMAND>>', re.DOTALL)

    # Execute Writes
    for match in write_pattern.finditer(output):
        path = match.group(1)
        content = match.group(2).strip() # Remove leading/trailing newline from the tag block itself if desired, 
                                         # but keeping exact content is safer. 
                                         # Typically the tag might be on its own line, so we might want to strip first/last newline.
                                         # Let's strip one leading newline if present and one trailing.
        if content.startswith('\n'): content = content[1:]
        if content.endswith('\n'): content = content[:-1]
        
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[Shim] Successfully wrote to {path}")
        except Exception as e:
            print(f"[Shim] Error writing to {path}: {e}")

    # Execute Commands
    for match in run_pattern.finditer(output):
        command = match.group(1).strip()
        print(f"[Shim] Executing command: {command}")
        try:
            # Run command and print output
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            print(f"[Shim] Command Output:\n{result.stdout}")
            if result.stderr:
                print(f"[Shim] Command Error:\n{result.stderr}")
        except Exception as e:
            print(f"[Shim] Error executing command: {e}")

def get_gemini_path():
    # 1. Check env var
    path = os.environ.get("GEMINI_PATH")
    if path and os.path.isfile(path) and os.access(path, os.X_OK):
        return path
    
    # 2. Check system PATH
    path = shutil.which("gemini")
    if path:
        return path
        
    # 3. Last version fallback (Mac-specific from user context, for convenience)
    # But ideally this should just fail if not found for strict portability.
    # We will soft-fail.
    return None

def main():
    # Fix for Windows CP949 encoding issue
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print("Usage: python3 dispatch_agent.py <task_description> [--log-file <path>]")
        sys.exit(1)

    gemini_path = get_gemini_path()
    if not gemini_path:
        print("Error: 'gemini' executable not found.")
        print("Please resolve this by:\n1. Installing gemini CLI.\n2. Ensuring it is in your PATH.\n3. Or setting GEMINI_PATH environment variable.")
        sys.exit(1)

    # Parse arguments manually to keep it simple
    args = sys.argv[1:]
    
    log_file = None
    if "--log-file" in args:
        idx = args.index("--log-file")
        if idx + 1 < len(args):
            log_file = args[idx + 1]
            # Remove the flag and value from args so the rest is the task
            del args[idx:idx+2]

    model_name = "auto-gemini-3" # Default
    if "--model" in args:
        idx = args.index("--model")
        if idx + 1 < len(args):
            model_name = args[idx + 1]
            del args[idx:idx+2]
            
    log_format = "text"
    if "--format" in args:
        idx = args.index("--format")
        if idx + 1 < len(args):
            log_format = args[idx + 1]
            del args[idx:idx+2]
    
    task = " ".join(args)

    shim_instruction = (
        "You are a sub-agent working in the Antigravity IDE. "
        "Your environment lacks native writing tools, but I have a shim layer to help you. "
        "To perform actions, you MUST use the following syntax PRECISELY:\n\n"
        "1. TO WRITE A FILE:\n"
        '<<WRITE_FILE path="path/to/file.ext">>\n'
        "File content goes here...\n"
        "<<END_WRITE>>\n\n"
        "2. TO RUN A SHELL COMMAND:\n"
        "<<RUN_COMMAND>>\n"
        "ls -la\n"
        "<<END_COMMAND>>\n\n"
        "Now, perform the following task:\n"
    )

    full_prompt = f"{shim_instruction}{task}"
    
    log_file_handle = None
    if log_file:
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(os.path.abspath(log_file)), exist_ok=True)
            log_file_handle = open(log_file, 'a', encoding='utf-8')
        except Exception as e:
            print(f"[Shim] Warning: Could not open log file: {e}")

    def log_message(msg_type, content):
        if not log_file_handle: return
        
        try:
            if log_format == "json":
                entry = {
                    "timestamp": time.time(),
                    "type": msg_type,
                    "content": content
                }
                log_file_handle.write(json.dumps(entry) + "\n")
            else:
                log_file_handle.write(f"[{msg_type.upper()}] {content}\n")
            log_file_handle.flush()
        except Exception as e:
            print(f"[Shim] Warning: Could not write to log: {e}")

    start_msg = f"Dispatching task to sub-agent ({model_name}): {task}"
    print(f"[Shim] {start_msg}")
    log_message("status", "starting")
    log_message("info", start_msg)

    try:
        cmd = [gemini_path, "chat", "--model", model_name, full_prompt]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            encoding='utf-8'
        )
        
        stdout_acc = ""
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(line.strip())
                log_content = line.strip()
                stdout_acc += line
                log_message("output", log_content)
        
        # Parse side effects after completion (Shim limitation: post-execution)
        parse_and_execute_side_effects(stdout_acc)

        if process.returncode == 0:
             log_message("status", "completed")
        else:
             log_message("status", "failed")
             stderr = process.stderr.read()
             log_message("error", stderr)
             sys.exit(process.returncode)

        if log_file_handle:
            log_file_handle.close()

    except Exception as e:
        print(f"Error dispatching agent: {e}")

if __name__ == "__main__":
    main()
