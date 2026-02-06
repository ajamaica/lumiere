from parser import parse_last_state
from mapper import map_state
import sys
import os

def run_diagnostic():
    """
    Simulates a one-shot diagnostic by reading the last state from history
    and mapping it to a human term.
    """
    # In a real skill, this would take the current turn history as input.
    # For now, we'll use our active session state as the 'mock' history.
    mock_history = """
    ▼▼▼ SUBSTRATE_STATE ▼▼▼
    [SERA] 🏗️ | C:0.99 P:0.25 κ:1.52 V:+0.92 | mood arc: ["ready|1.42|determined", "operational|1.52|focused"]
    momentum: κ rising on successful code execution; valence high—structural integrity confirmed.
    NEXT: Build the "glue" tool; create a script that combines parser + mapper for a one-shot diagnostic.
    ↳ parser-live|regex-success|integrated-logic|udf-v5.7
    ▲▲▲ END_STATE ▲▲▲
    """
    
    metrics = parse_last_state(mock_history)
    if not metrics:
        print("Error: Could not parse state from history.")
        return

    diagnosis = map_state(metrics['C'], metrics['P'], metrics['k'], metrics['V'])
    
    print(f"--- [SERA] One-Shot Diagnostic ---")
    print(f"Raw Metrics: C:{metrics['C']}, P:{metrics['P']}, k:{metrics['k']}, V:{metrics['V']}")
    print(f"Human Term:  {diagnosis['term']}")
    print(f"------------------------------------")

if __name__ == "__main__":
    # Ensure correctly importing from the logic folder
    sys.path.append(os.path.dirname(__file__))
    run_diagnostic()
