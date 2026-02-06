import yaml
#
# Inspired by "Oh-My-Opencode" (https://github.com/code-yeongyu/oh-my-opencode)
# Adopts the "Manus Protocol" for state management and TUI visualization.
#
import sys
import subprocess
import threading
import time
import os
import random
from rich.console import Console
from rich.live import Live
from rich.table import Table
from rich.layout import Layout
from rich.panel import Panel
from rich.text import Text
from rich.align import Align
from rich import box

# Configuration
CONFIG_FILE = "subagents.yaml"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DISPATCH_SCRIPT = os.path.join(SCRIPT_DIR, "dispatch_agent.py")

# Fancy Spinner Characters (Braille or Dots)
SPINNERS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
# Alternative: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]

class SubAgentRunner:
    def __init__(self, name, prompt, color, model="auto-gemini-3", mode="parallel", demo_mode=False):
        self.name = name
        self.prompt = prompt
        self.color = color
        self.model = model
        self.mode = mode  # parallel, serial, validator
        self.status = "Pending"
        self.log_file = f"logs/{name.lower().replace(' ', '_')}.log"
        self.last_log = ""
        self.is_running = False
        self.log_handle = None
        self.demo_mode = demo_mode
        self.start_time = None
        self.end_time = None
        
        # Ensure log dir exists
        os.makedirs("logs", exist_ok=True)

    def run(self):
        self.is_running = True
        self.status = "Running"
        self.start_time = time.time()
        
        if self.demo_mode:
            self._run_demo()
        else:
            self._run_real()

        self.end_time = time.time()
        self.is_running = False
        if self.log_handle:
            self.log_handle.close()

    def _run_demo(self):
        """Simulates agent execution for TUI testing."""
        steps = [
            "Initializing agent context...",
            "Reading task_plan.md...",
            "Analyzing requirements...",
            "Thinking...",
            "Generating solution code...",
            "Writing to file...",
            "Verifying output...",
            "Finalizing..."
        ]
        
        for step in steps:
            self.last_log = step
            time.sleep(random.uniform(0.5, 1.5))
            
        # 80% chance of success, 20% failure for demo realism
        if random.random() > 0.1:
            self.status = "Completed"
            self.last_log = "Task completed successfully."
        else:
            self.status = "Failed"
            self.last_log = "Error: Simulated failure."

    def _run_real(self):
        cmd = [
            sys.executable, 
            DISPATCH_SCRIPT, 
            self.prompt,
            "--log-file", 
            self.log_file,
            "--model",
            self.model
        ]
        
        try:
            self.process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            while self.process.poll() is None:
                self._read_new_logs()
                time.sleep(0.1)
                
            self.status = "Completed" if self.process.returncode == 0 else "Failed"
            self._read_new_logs() 
            
        except Exception as e:
            self.status = f"Error: {str(e)}"

    def _read_new_logs(self):
        if not self.log_handle:
            if os.path.exists(self.log_file):
                try:
                    self.log_handle = open(self.log_file, 'r', encoding='utf-8', errors='replace')
                except:
                    pass
        
        if self.log_handle:
            try:
                lines = self.log_handle.readlines()
                if lines:
                    last_line = lines[-1].strip()
                    if last_line:
                        self.last_log = last_line
            except:
                pass

    def get_duration(self):
        if self.start_time:
            end = self.end_time if self.end_time else time.time()
            return f"{end - self.start_time:.1f}s"
        return "-"

def create_layout():
    layout = Layout()
    layout.split(
        Layout(name="header", size=3),
        Layout(name="body")
    )
    layout["body"].split_row(
        Layout(name="left", ratio=2),
        Layout(name="right", ratio=1)
    )
    return layout

def generate_dashboard(runners, spinner_idx):
    spinner_char = SPINNERS[spinner_idx % len(SPINNERS)]
    
    # 1. Agent Table
    table = Table(box=box.ROUNDED, expand=True)
    table.add_column("Agent", style="bold white")
    table.add_column("Role", style="dim")
    table.add_column("Status", justify="center")
    table.add_column("Time", justify="right")
    
    active_log = "Waiting for agents..."
    active_agent = "System"

    for runner in runners:
        # Status Logic
        if runner.status == "Running":
            status_style = "bold yellow"
            status_icon = spinner_char
            active_log = runner.last_log
            active_agent = runner.name
        elif runner.status == "Completed":
            status_style = "bold green"
            status_icon = "✔"
        elif "Error" in runner.status or runner.status == "Failed":
            status_style = "bold red"
            status_icon = "✘"
        else: # Pending
            status_style = "dim"
            status_icon = "•"

        table.add_row(
            f"[{runner.color}]{runner.name}[/{runner.color}]",
            runner.mode,
            f"[{status_style}]{status_icon} {runner.status}[/{status_style}]",
            runner.get_duration()
        )

    # 2. Activity Panel
    log_content = Text()
    log_content.append(f"Agent: {active_agent}\n", style="bold cyan")
    log_content.append(f"Action: {active_log}", style="white")
    
    activity_panel = Panel(
        Align.center(log_content, vertical="middle"),
        title="Live Activity",
        border_style="blue",
        box=box.ROUNDED
    )

    # 3. Header
    header = Panel(
        Align.center("[bold magenta]✨ Antigravity Swarm Mission Control ✨[/bold magenta]"),
        box=box.HEAVY,
        style="white on black"
    )

    return header, table, activity_panel

def main():
    # Fix for Windows CP949 encoding issue
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    # Demo Mode Check
    demo_mode = "--demo" in sys.argv
    if demo_mode:
        print("[Orchestrator] Running in DEMO MODE (Simulated Execution)")

    if not os.path.exists(CONFIG_FILE) and not demo_mode:
        print(f"Error: {CONFIG_FILE} not found.")
        sys.exit(1)

    if demo_mode:
        # Mock config for demo
        config = {
            'subagents': [
                {'name': 'Architect', 'color': 'magenta', 'prompt': '', 'mode': 'parallel'},
                {'name': 'Engineer', 'color': 'cyan', 'prompt': '', 'mode': 'parallel'},
                {'name': 'Tester', 'color': 'yellow', 'prompt': '', 'mode': 'serial'},
                {'name': 'Quality_Validator', 'color': 'green', 'prompt': '', 'mode': 'validator'}
            ]
        }
        manus_context = ""
    else:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # Manus Protocol: Context Injection
        manus_context = "\n\n[SHARED STATE]"
        for f_name in ["task_plan.md", "findings.md", "progress.md"]:
            if os.path.exists(f_name):
                with open(f_name, 'r', encoding='utf-8') as f:
                    manus_context += f"\n--- {f_name} ---\n{f.read()}"
        
        manus_context += "\n[END SHARED STATE]\n"
        manus_context += "Instructions: You must read the shared state above. Update 'findings.md' with new discoveries and 'progress.md' with your status using <<WRITE_FILE>>."

    runners = []
    parallel_runners = []
    serial_runners = []
    validator_runners = []

    for agent_cfg in config.get('subagents', []):
        full_prompt = agent_cfg['prompt'] + manus_context
        name = agent_cfg['name']
        mode = agent_cfg.get('mode', 'parallel')
        
        if name == 'Quality_Validator': mode = 'validator'
            
        runner = SubAgentRunner(
            name, 
            full_prompt, 
            agent_cfg.get('color', 'white'),
            agent_cfg.get('model', 'auto-gemini-3'),
            mode,
            demo_mode=demo_mode
        )
        
        if mode == 'validator': validator_runners.append(runner)
        elif mode == 'serial': serial_runners.append(runner)
        else: parallel_runners.append(runner)

    runners = parallel_runners + serial_runners + validator_runners

    if "--yes" not in sys.argv and not demo_mode:
        try:
            confirm = input("\n[Plan Mode] Execute this team? [y/N]: ").strip().lower()
            if confirm != 'y':
                print("[Orchestrator] Execution cancelled.")
                return
        except EOFError:
            print("[Orchestrator] No input stream. Assuming --yes.")

    console = Console()
    layout = create_layout()
    
    spinner_idx = 0
    with Live(layout, refresh_per_second=10, console=console) as live:
        
        def update_ui():
            nonlocal spinner_idx
            header, table, activity = generate_dashboard(runners, spinner_idx)
            layout["header"].update(header)
            layout["left"].update(table)
            layout["right"].update(activity)
            spinner_idx += 1

        # Phase 1: Parallel
        threads = []
        for r in parallel_runners:
            t = threading.Thread(target=r.run)
            t.start()
            threads.append(t)
        
        while any(t.is_alive() for t in threads):
            update_ui()
            time.sleep(0.1)

        # Phase 2: Serial
        for r in serial_runners:
            t = threading.Thread(target=r.run)
            t.start()
            while t.is_alive():
                update_ui()
                time.sleep(0.1)

        # Phase 3: Validator
        for r in validator_runners:
            t = threading.Thread(target=r.run)
            t.start()
            while t.is_alive():
                update_ui()
                time.sleep(0.1)
        
        # Final State
        update_ui()

    # Exit Check
    failed = [r for r in runners if r.status != "Completed"]
    if failed:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
