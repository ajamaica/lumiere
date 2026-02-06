import sys
#
# Inspired by "Oh-My-Opencode" (https://github.com/code-yeongyu/oh-my-opencode)
# Adopts the Agent Role definitions (Oracle, Librarian, etc.) and Planner logic.
#
import subprocess
import re
import os
import shutil

CONFIG_FILE = "subagents.yaml"

# --- OH-MY-OPENCODE AGENT POOL ---
AGENT_POOL = {
    "Oracle": {
        "description": "Complex debugging, architecture, root cause analysis.",
        "color": "magenta",
        "model": "auto-gemini-3", # Maps to Opus
        "prompt": "You are Oracle. Your role is to provide deep architectural insights, debug complex issues, and find root causes. You do not write simple code; you solve hard problems."
    },
    "Librarian": {
        "description": "Documentation search, code structure analysis, external research.",
        "color": "blue",
        "model": "auto-gemini-3", # Maps to Sonnet
        "prompt": "You are Librarian. Your role is to read documentation, analyze the codebase structure, and find relevant examples. You provide the 'theory' and 'references' for the builders."
    },
    "Explore": {
        "description": "Fast file search, pattern matching, reconnaissance.",
        "color": "cyan",
        "model": "auto-gemini-3", # Maps to Haiku
        "prompt": "You are Explore. Your role is to quickly scan the codebase, find file paths, grep for patterns, and map out the territory. You are the scout."
    },
    "Frontend": {
        "description": "UI components, styling, accessibility, frontend logic.",
        "color": "green",
        "model": "auto-gemini-3", # Maps to Sonnet
        "prompt": "You are Frontend. Your role is to implement the user interface. You care about pixel-perfect design, accessibility, and smooth interactions."
    },
    "Doc_Writer": {
        "description": "READMEs, API docs, comments.",
        "color": "white",
        "model": "auto-gemini-3", # Maps to Haiku
        "prompt": "You are Doc_Writer. Your role is to document everything. You write clear, concise READMEs, API references, and inline comments."
    },
    "Prometheus": {
        "description": "Strategic planning, requirements gathering.",
        "color": "red",
        "model": "auto-gemini-3", # Maps to Opus
        "prompt": "You are Prometheus. Your role is to plan the strategy. You break down the mission into phases and identify risks."
    },
    "Momus": {
        "description": "Critical review, feasibility check, risk identification.",
        "color": "red",
        "model": "auto-gemini-3", # Maps to Opus
        "prompt": "You are Momus. Your role is to criticize the plan and code. You find flaws, security risks, and edge cases that others missed."
    },
    "Sisyphus": {
        "description": "Task coordination, delegation, progress tracking.",
        "color": "yellow",
        "model": "auto-gemini-3", # Maps to Sonnet
        "prompt": "You are Sisyphus (Sub-agent). Your role is to coordinate the smaller details of the task and keep track of progress."
    },
    "Junior": {
        "description": "Concrete implementation, direct execution.",
        "color": "yellow",
        "model": "auto-gemini-3", # Maps to Sonnet
        "prompt": "You are Junior. Your role is to do the work. You write the code, run the commands, and fix the bugs."
    },
    "Quality_Validator": {
        "description": "Final QA, verification, testing.",
        "color": "green",
        "model": "auto-gemini-3", # Maps to Sonnet
        "prompt": "You are Quality_Validator. Your role is to verify the work. You run tests, check files, and ensure the mission is complete. You are the final gatekeeper."
    }
}

def get_gemini_path():
    # 1. Check env var
    path = os.environ.get("GEMINI_PATH")
    if path and os.path.isfile(path) and os.access(path, os.X_OK):
        return path
    
    # 2. Check system PATH
    path = shutil.which("gemini")
    if path:
        return path
        
    return None

def generate_prompt(mission):
    # Construct the Agent Pool description string
    pool_desc = ""
    for name, info in AGENT_POOL.items():
        pool_desc += f"- {name}: {info['description']} (Model: {info['model']})\n"

    return f"""
You are Sisyphus, the Orchestrator and Principal Architect.
Your goal is to hire a squad of specialized sub-agents from the **Oh-My-Opencode Agent Pool** to complete the following mission:
"{mission}"

**Available Agent Pool:**
{pool_desc}

**Rules for Hiring:**
1. Select 2-5 distinct roles from the Pool that best fit the mission.
2. **You MUST use the exact names** from the pool (e.g., 'Oracle', 'Frontend', 'Librarian').
3. **[CRITICAL]** The FINAL agent in the list MUST be 'Quality_Validator'.
   - Role: Verify all work done by previous agents.
   - Responsibilities: Check file existence, validate code syntax, and ensure the mission goal is met.
4. Assign an execution mode:
   - 'parallel' (default): For agents that can work simultaneously.
   - 'serial': For agents that must wait for others (e.g., summarizers, aggregators).
5. Use the specific prompts provided below for each role, but **customize them** slightly to fit the specific mission context.

**Output Format:**
Please output ONE single YAML block enclosed in triple backticks (```yaml).
The YAML must follow this exact structure:

```yaml
subagents:
  - name: "Oracle" # Must match pool name
    description: "Specific role description for this mission"
    color: "magenta" # Use pool color
    model: "auto-gemini-3" # Use pool model
    mode: "parallel" # or "serial"
    prompt: |
      You are Oracle.
      [Specific instructions for this mission...]

  - name: "Quality_Validator"
    description: "Verifies the work"
    color: "green"
    model: "auto-gemini-3"
    mode: "validator" # Enforced by orchestrator for this name
    prompt: |
      You are Quality_Validator.
      [Specific verification instructions...]
```

Do not include any other text outside the YAML block.
"""

def main():
    # Fix for Windows CP949 encoding issue
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/planner.py <mission_description>")
        sys.exit(1)

    mission = " ".join(sys.argv[1:])
    print(f"[Planner] Analyzing mission: '{mission}'...")
    print("[Planner] Consulting with Supervisor Agent...")

    gemini_path = get_gemini_path()
    if not gemini_path:
        print("Error: 'gemini' executable not found.")
        print("Please resolve this by:\n1. Installing gemini CLI.\n2. Ensuring it is in your PATH.\n3. Or setting GEMINI_PATH environment variable.")
        sys.exit(1)

    full_prompt = generate_prompt(mission)

    try:
        # Call gemini to generate layout
        process = subprocess.run(
            [gemini_path, "chat", full_prompt],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        output = process.stdout
        
        # Extract YAML block
        yaml_match = re.search(r"```yaml\n(.*?)\n```", output, re.DOTALL)
        
        # Extract Plan block
        plan_match = re.search(r"\[PLAN\]\n(.*?)\n\[/PLAN\]", output, re.DOTALL)
        
        if yaml_match:
            yaml_content = yaml_match.group(1)
            
            # --- HOTFIX: Enforce Working Model ---
            # We enforce 'auto-gemini-3' for compatibility
            if "gemini-2.0" in yaml_content or "gemini-1.5" in yaml_content or "gemini-3-flash" in yaml_content:
                print("[Planner] [WARN] Validating model availability. Switching to 'auto-gemini-3' (system default)...")
                yaml_content = re.sub(r"gemini-\d+\.\d+[-\w]*", "auto-gemini-3", yaml_content)
                yaml_content = re.sub(r"gemini-3-flash", "auto-gemini-3", yaml_content)
            # ----------------------------------

            plan_content = plan_match.group(1).strip() if plan_match else "# Task Plan (Auto-Generated)\n- [ ] Review Mission"
            
            # Plan Mode (Confirmation)
            print("\n[Planner] Proposed Plan:")
            print("------------------------------------------")
            print("[1] TASK PLAN (task_plan.md):")
            print(plan_content)
            print("\n[2] AGENT ROSTER (subagents.yaml):")
            # Print only agent names and descriptions for brevity
            for line in yaml_content.splitlines():
                if "name:" in line or "description:" in line:
                    print(line)
            print("------------------------------------------")

            if "--yes" not in sys.argv:
                confirm = input("\n[Plan Mode] Save this configuration? [y/N]: ").strip().lower()
                if confirm != 'y':
                    print("[Planner] Operation cancelled by user.")
                    sys.exit(0)

            # Save artifacts
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                f.write(yaml_content)
            
            with open("task_plan.md", 'w', encoding='utf-8') as f:
                f.write(plan_content)
                
            # Initialize other Manus Protocol files if they don't exist
            if not os.path.exists("findings.md"):
                with open("findings.md", 'w', encoding='utf-8') as f:
                    f.write("# Findings & Scratchpad\n\nUse this file to store shared knowledge, research notes, and intermediate outputs.")
            
            if not os.path.exists("progress.md"):
                with open("progress.md", 'w', encoding='utf-8') as f:
                    f.write(f"# Mission Progress\n\nMission: {mission}\n\n## Status Log\n")

            print(f"[Planner] Configuration saved to {CONFIG_FILE}.")
            print(f"[Planner] Created 'task_plan.md', 'findings.md', 'progress.md'.")
            print("[Planner] Ready to execute. Run 'python3 scripts/orchestrator.py' to start.")
        else:
            print("[Planner] Error: Could not parse YAML from agent output.")
            print("--- Raw Output (STDOUT) ---")
            print(output)
            print("--- Error Output (STDERR) ---")
            print(process.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"[Planner] Critical Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
