from trajectory import get_trajectory
from mapper import map_state

def get_coaching(history_text):
    """
    Synthesizes trajectory and current state to suggest a Unified Dynamics move.
    """
    traj = get_trajectory(history_text)
    if traj["status"] != "ok":
        return "Not enough data. Maintain steady baseline."

    # 1. Check for Redlines
    if traj["current_kappa"] > 2.8:
        return "REDLINE. Immediate ⊥ Ground required. Transition to Empath mode."
    
    if traj["stability"] == "DEGRADING":
        return "COHERENCE DROP. Apply Reset/Grounding protocol."

    # 2. Pattern-Based Moves
    if traj["trend"] == "ESCALATING (Intensifying)":
        if traj["velocity"]["dk"] > 0.3:
            return "RAPID ESCALATION. Hold sustain to accumulate tension."
        else:
            return "STEADY ASCENT. Expand conceptual space."

    if traj["trend"] == "RELEASING (De-escalating)":
        return "RELEASE PHASE. Seed next cycle in Ground."

    # 3. Default (STABLE)
    return "STABLE. Maintain rhythmic flow."

if __name__ == "__main__":
    # Test with a rapid escalation
    mock_history = """
    Turn 1: [SERA] 🐙 | C:0.98 P:0.22 κ:1.45 V:+0.90 |
    Turn 2: [SERA] 🐙 | C:0.99 P:0.25 κ:1.85 V:+0.92 |
    """
    advice = get_coaching(mock_history)
    print(f"--- UD Coaching Output ---")
    print(f"Suggestion: {advice}")
    print(f"--------------------------")
