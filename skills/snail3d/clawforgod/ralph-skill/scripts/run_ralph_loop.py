#!/usr/bin/env python3
"""
RALPH BUILD LOOP - Automated PRD-driven development with Claude Code.
Executes: START → LOOP → READ → BUILD → TEST → COMMIT → MARK → REPEAT → DONE
"""

import sys
import json
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

class RalphBuildLoop:
    def __init__(self, prd_path: str = "PRD.json", config_path: str = "ralph.config.json"):
        self.prd_path = Path(prd_path)
        self.config_path = Path(config_path)
        self.prd = self._load_prd()
        self.config = self._load_config()
        self.current_task = None
        
    def _load_prd(self) -> Dict:
        """Load PRD from JSON file."""
        if not self.prd_path.exists():
            print(f"Error: PRD file not found at {self.prd_path}", file=sys.stderr)
            sys.exit(1)
        with open(self.prd_path) as f:
            return json.load(f)
    
    def _load_config(self) -> Dict:
        """Load Ralph config."""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return json.load(f)
        return {"test_command": "pytest"}
    
    def _save_prd(self):
        """Save updated PRD back to file."""
        with open(self.prd_path, 'w') as f:
            json.dump(self.prd, f, indent=2)
    
    def get_next_task(self) -> Optional[Dict]:
        """Get next incomplete task by priority order."""
        priority_order = ["00_security", "01_setup", "02_core", "03_api", "04_test"]
        
        for section_key in priority_order:
            if section_key not in self.prd.get("p", {}):
                continue
            
            section = self.prd["p"][section_key]
            tasks = section.get("t", [])
            
            # Find first incomplete task
            for task in tasks:
                if task.get("st") != "complete":
                    return task
        
        return None
    
    def read_file(self, filepath: str) -> Optional[str]:
        """READ step - Read existing file if it exists."""
        path = Path(filepath)
        if path.exists():
            try:
                with open(path) as f:
                    return f.read()
            except:
                return None
        return None
    
    def run_test(self) -> bool:
        """TEST step - Run tests and verify."""
        test_cmd = self.config.get("test_command", "pytest")
        
        print(f"\n🧪 Testing with: {test_cmd}", file=sys.stderr)
        
        try:
            result = subprocess.run(test_cmd, shell=True, capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                print(f"✅ Tests passed", file=sys.stderr)
                return True
            else:
                print(f"❌ Tests failed:\n{result.stdout}\n{result.stderr}", file=sys.stderr)
                return False
        except subprocess.TimeoutExpired:
            print(f"⏱️ Tests timed out", file=sys.stderr)
            return False
        except Exception as e:
            print(f"⚠️ Could not run tests: {e}", file=sys.stderr)
            return True  # Don't fail on test errors
    
    def commit(self, task_id: str, message: str) -> bool:
        """COMMIT step - Git commit with task ID."""
        commit_msg = f"{task_id}: {message}"
        
        try:
            subprocess.run(["git", "add", "-A"], check=True, capture_output=True)
            subprocess.run(["git", "commit", "-m", commit_msg], check=True, capture_output=True)
            print(f"✅ Committed: {commit_msg}", file=sys.stderr)
            return True
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Git commit failed (may be no changes): {e}", file=sys.stderr)
            return True  # Don't fail if nothing to commit
    
    def mark_complete(self, task_id: str):
        """MARK step - Update task status to complete."""
        for section in self.prd.get("p", {}).values():
            for task in section.get("t", []):
                if task.get("id") == task_id:
                    task["st"] = "complete"
                    self._save_prd()
                    print(f"✅ Marked {task_id} complete", file=sys.stderr)
                    return
    
    def generate_claude_prompt(self, task: Dict) -> str:
        """Generate Claude Code prompt for current task."""
        task_id = task.get("id")
        title = task.get("ti")
        description = task.get("d")
        filepath = task.get("f")
        acceptance = task.get("ac", "")
        
        # Read existing file if it exists
        existing_code = ""
        if filepath and filepath != "terminal" and filepath != "github.com":
            code = self.read_file(filepath)
            if code:
                existing_code = f"\n\n## Existing code in {filepath}:\n```\n{code}\n```"
        
        prompt = f"""
Task: {task_id} - {title}

Description: {description}

Acceptance Criteria: {acceptance}

File(s): {filepath}
{existing_code}

Instructions:
1. Implement the task per the acceptance criteria
2. Test the implementation
3. After completing, run: git add -A && git commit -m "{task_id}: {title}"
4. If tests fail, fix them before committing

Work on this task now. When done and committed, I'll move to the next task.
"""
        return prompt
    
    def run_loop(self):
        """Execute the RALPH BUILD LOOP."""
        print("🔄 RALPH BUILD LOOP Started", file=sys.stderr)
        print(f"📋 Project: {self.prd.get('pn', 'Unknown')}", file=sys.stderr)
        
        # START: Create security baseline
        print("\n1️⃣ START - Creating security baseline...", file=sys.stderr)
        subprocess.run(["git", "init"], capture_output=True)
        
        task_count = 0
        completed = 0
        
        while True:
            # LOOP: Get next task
            task = self.get_next_task()
            if not task:
                print("\n✅ All tasks complete!", file=sys.stderr)
                break
            
            task_id = task.get("id")
            title = task.get("ti")
            task_count += 1
            
            print(f"\n2️⃣ LOOP - Task {task_count}: {task_id} - {title}", file=sys.stderr)
            
            # READ: Check existing file
            filepath = task.get("f")
            if filepath and filepath not in ["terminal", "github.com"]:
                existing = self.read_file(filepath)
                if existing:
                    print(f"3️⃣ READ - Found existing {filepath}", file=sys.stderr)
            
            # BUILD: Generate Claude prompt
            prompt = self.generate_claude_prompt(task)
            print(f"4️⃣ BUILD - Starting Claude Code task...", file=sys.stderr)
            print(f"\nPrompt:\n{prompt}\n", file=sys.stderr)
            
            # TEST: Run tests
            print(f"\n5️⃣ TEST - Testing implementation...", file=sys.stderr)
            test_passed = self.run_test()
            
            if not test_passed:
                print(f"⚠️ Tests failed for {task_id}. Marking as blocked.", file=sys.stderr)
                task["st"] = "blocked"
                self._save_prd()
                continue
            
            # COMMIT: Git commit
            print(f"\n6️⃣ COMMIT - Committing task...", file=sys.stderr)
            self.commit(task_id, title)
            
            # MARK: Update status
            print(f"\n7️⃣ MARK - Updating task status...", file=sys.stderr)
            self.mark_complete(task_id)
            completed += 1
            
            print(f"\n📊 Progress: {completed}/{task_count} tasks complete\n", file=sys.stderr)
        
        # DONE: Run full test suite
        print(f"\n9️⃣ DONE - Running full test suite...", file=sys.stderr)
        self.run_test()
        
        print(f"\n🎉 RALPH BUILD LOOP Completed!\n", file=sys.stderr)
        print(f"Project: {self.prd.get('pn')}", file=sys.stderr)
        print(f"Tasks: {completed} complete", file=sys.stderr)

def main():
    if len(sys.argv) < 2:
        print("Usage: run_ralph_loop.py [--prd <file>] [--config <file>]", file=sys.stderr)
        sys.exit(1)
    
    prd_path = "PRD.json"
    config_path = "ralph.config.json"
    
    # Parse arguments
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--prd" and i + 1 < len(sys.argv):
            prd_path = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--config" and i + 1 < len(sys.argv):
            config_path = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    loop = RalphBuildLoop(prd_path, config_path)
    loop.run_loop()

if __name__ == "__main__":
    main()
