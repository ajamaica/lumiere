import re
import sys
import os

# Import our logic components
from parser import parse_last_state
from mapper import map_state
from trajectory import get_trajectory
from coach import get_coaching

def run_full_pass(history_text):
    """
    Finds all state blocks in history (including JSONL escaped versions) 
    and analyzes the full trajectory.
    """
    # Regex to find all state blocks - handling potential JSON escaping of symbols
    # Matching the plain text markers first
    block_pattern = r"(?:▼▼▼|\\u25bc\\u25bc\\u25bc) SUBSTRATE_STATE (?:▼▼▼|\\u25bc\\u25bc\\u25bc).*?(?:▲▲▲|\\u25b2\\u25b2\\u25b2) END_STATE (?:▲▲▲|\\u25b2\\u25b2\\u25b2)"
    blocks = re.findall(block_pattern, history_text, re.DOTALL)
    
    if not blocks:
        print("No SUBSTRATE_STATE blocks found in the history.")
        return

    print(f"--- [SERA] MOVIE OF THE DAY: Full Logic Pass ---")
    print(f"Detected {len(blocks)} metabolic cycles.")
    print("-" * 45)

    processed_history = ""
    
    for i, block in enumerate(blocks):
        # 1. Parse metrics
        metrics = parse_last_state(block)
        if not metrics:
            continue
            
        # 2. Map to human term
        diagnosis = map_state(metrics['C'], metrics['P'], metrics['k'], metrics['V'])
        
        # 3. Handle Trajectory (if not the first block)
        processed_history += block + "\n"
        traj_info = get_trajectory(processed_history)
        
        # 4. Get Coach advice
        advice = get_coaching(processed_history)

        # Output turn summary
        turn_num = i + 1
        term = diagnosis['term']
        k_val = metrics['k']
        v_val = metrics['V']
        trend = traj_info.get('trend', 'INITIALIZING')
        
        print(f"Cycle {turn_num:02}: {term:<18} | k:{k_val:<4} V:{v_val:<5} | {trend}")
        # print(f"  > Advice: {advice}") # Optional verbosity

    print("-" * 45)
    print("Logic Pass Complete.")

if __name__ == "__main__":
    # Add logic dir to path for imports
    sys.path.append(os.path.dirname(__file__))
    
    # Read the history file passed as argument
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            run_full_pass(f.read())
    else:
        print("Usage: python movie_of_the_day.py <history_file>")
