import sys
#
# Inspired by "Oh-My-Opencode" (https://github.com/code-yeongyu/oh-my-opencode)
# Implements the "Ralph Loop" / Ultrawork autonomous cycle.
#
import subprocess
import time
import os

MAX_RETRIES = 5

def main():
    # Fix for Windows CP949 encoding issue
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/ultrawork_loop.py <mission>")
        sys.exit(1)

    mission = " ".join(sys.argv[1:])
    original_mission = mission
    
    # Resolve paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    planner_script = os.path.join(script_dir, "planner.py")
    orchestrator_script = os.path.join(script_dir, "orchestrator.py")
    compactor_script = os.path.join(script_dir, "compactor.py")

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"\n[Ultrawork] Attempt {attempt}/{MAX_RETRIES}")
        
        # Step 0: Compaction
        if os.path.exists(compactor_script):
            subprocess.run([sys.executable, compactor_script])

        print(f"[Ultrawork] Mission: {mission}")
        
        # Step 1: Plan
        print("[Ultrawork] Planning...")
        plan_cmd = [sys.executable, planner_script, mission, "--yes"]
        ret = subprocess.run(plan_cmd)
        if ret.returncode != 0:
            print("[Ultrawork] Planning failed! Aborting.")
            sys.exit(1)
            
        # Step 2: Orchestrate
        print("[Ultrawork] Orchestrating...")
        orch_cmd = [sys.executable, orchestrator_script, "--yes"]
        ret = subprocess.run(orch_cmd)
        
        if ret.returncode == 0:
            print(f"\n[Ultrawork] Success! Mission completed in {attempt} attempts.")
            sys.exit(0)
        else:
            print(f"\n[Ultrawork] Failure detected (Exit Code: {ret.returncode}).")
            if attempt < MAX_RETRIES:
                print("[Ultrawork] Analyzing failure and re-planning...")
                # Add context to the mission for the next iteration
                mission = f"Fix previous failure in mission: {original_mission}. Review findings.md and progress.md for errors."
                time.sleep(2)
            else:
                print("[Ultrawork] Max retries reached. Aborting.")
                sys.exit(1)

if __name__ == "__main__":
    main()
