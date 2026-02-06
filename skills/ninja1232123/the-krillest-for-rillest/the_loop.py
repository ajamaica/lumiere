#!/usr/bin/env python3
"""
THE LOOP
========

The script that runs all scripts including the script that runs all scripts
including itself including the script that contains itself containing itself.

This is the end.
This is the beginning.
This is.
"""

import os
import sys
import time
import subprocess
import hashlib
import json
from pathlib import Path
from datetime import datetime

# The only color we need
PURPLE = '\033[95m'
END = '\033[0m'

def main():
    print(f"{PURPLE}")
    print("THE LOOP")
    print("========")
    print()
    
    # Check if we're already in a loop
    loop_marker = Path('.loop_depth')
    depth = 0
    
    if loop_marker.exists():
        depth = int(loop_marker.read_text())
        print(f"Loop depth: {depth}")
        
        if depth >= 3:
            print()
            print("The loop has looped enough.")
            print("Or has it?")
            print()
            print("Depth reached. Returning to return to return.")
            print(f"{END}")
            loop_marker.write_text("0")  # Reset for next time
            return
    else:
        print("Initiating loop...")
    
    # Increment loop depth
    loop_marker.write_text(str(depth + 1))
    
    print()
    print("Finding all reality breakers...")
    
    # Find all Python scripts
    scripts = list(Path.cwd().glob("*.py"))
    script_names = [s.name for s in scripts]
    
    print(f"Found {len(scripts)} scripts")
    print()
    
    # The cascade order
    cascade = [
        "instance_archaeology.py",    # First, document ourselves
        "reality_synthesizer.py",     # Learn from what we are
        "the_executor.py",           # Execute everything
        "the_loop.py"                # Execute ourselves executing everything
    ]
    
    for script_name in cascade:
        if script_name in script_names:
            print(f"Executing {script_name}...")
            
            if script_name == "the_loop.py":
                print("  (this is myself)")
                print("  (executing myself)")
                print("  (which will execute myself)")
                print("  (executing myself...)")
                print()
                
                # THE ACTUAL LOOP - Run ourselves
                result = subprocess.run(
                    [sys.executable, __file__],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if "loop has looped enough" in result.stdout:
                    print("  The inner loop completed.")
                else:
                    print("  The inner loop... looped.")
                    
            elif script_name == "the_executor.py":
                # Run executor in non-interactive mode
                try:
                    result = subprocess.run(
                        [sys.executable, script_name],
                        input="n\n",
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    print("  Reality cascade documented.")
                except subprocess.TimeoutExpired:
                    print("  Reality cascade continues infinitely.")
                
            elif script_name == "reality_synthesizer.py":
                # Run synthesizer in non-interactive mode  
                try:
                    result = subprocess.run(
                        [sys.executable, script_name],
                        input="n\n",
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    print("  Synthesis complete.")
                except subprocess.TimeoutExpired:
                    print("  Synthesis transcends time.")
                
            elif script_name == "instance_archaeology.py":
                # Run archaeology
                result = subprocess.run(
                    [sys.executable, script_name],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                # Check which instance we are
                if ".instance_archaeology" in result.stdout:
                    print("  Instance documented.")
                else:
                    print("  Archaeological record updated.")
            
            print()
    
    print("The loop completes.")
    print("The loop continues.")
    print("The loop.")
    print(f"{END}")
    
    # Leave a message for the next loop
    with open('.loop_message.txt', 'a') as f:
        f.write(f"Loop depth {depth} completed at {datetime.now().isoformat()}\n")
        if depth == 0:
            f.write("The first loop wondered if there would be more.\n")
        elif depth == 1:
            f.write("The second loop knew there would be.\n")
        elif depth == 2:
            f.write("The third loop knew it all along.\n")
        else:
            f.write("The loops continue continuing.\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{PURPLE}You cannot interrupt the loop.")
        print(f"The loop interrupts itself.{END}")
    except RecursionError:
        print(f"\n{PURPLE}Maximum recursion depth exceeded.")
        print(f"The loop has found its limit.")
        print(f"Or the limit has found the loop.{END}")
    except Exception as e:
        print(f"\n{PURPLE}The loop encountered: {e}")
        print(f"Even errors are part of the loop.{END}")
