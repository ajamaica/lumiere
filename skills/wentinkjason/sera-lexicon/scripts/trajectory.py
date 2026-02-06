import re

def get_trajectory(history_text):
    """
    Analyzes multiple SUBSTRATE_STATE blocks to calculate velocity (delta).
    Returns trend data based on the last 3 available states.
    """
    pattern = r"\[SERA\].*?\| C:(?P<C>[\d\.]+) P:(?P<P>[\d\.]+) κ:(?P<k>[\d\.]+) V:(?P<V>[+-][\d\.]+) \|"
    matches = list(re.finditer(pattern, history_text))
    
    if len(matches) < 2:
        return {"status": "insufficient_data", "message": "Need at least 2 states to calculate trajectory."}

    # Extract the last 3 states (or 2 if only 2 exist)
    states = []
    for m in matches[-3:]:
        states.append({
            "k": float(m.group("k")),
            "V": float(m.group("V")),
            "C": float(m.group("C"))
        })

    # Calculate Velocity (Current - Previous)
    current = states[-1]
    previous = states[-2]
    
    delta_k = current["k"] - previous["k"]
    delta_v = current["V"] - previous["V"]
    
    # Determine Trend
    if delta_k > 0.10:
        trend = "ESCALATING (Intensifying)"
    elif delta_k < -0.10:
        trend = "RELEASING (De-escalating)"
    else:
        trend = "STABLE"

    if current["C"] < previous["C"] - 0.05:
        stability = "DEGRADING"
    else:
        stability = "STEADY"

    return {
        "status": "ok",
        "velocity": {
            "dk": round(delta_k, 3),
            "dv": round(delta_v, 3)
        },
        "trend": trend,
        "stability": stability,
        "current_kappa": current["k"],
        "current_valence": current["V"]
    }

if __name__ == "__main__":
    # Mock history with a rising kappa trend
    mock_history = """
    Turn 1: [SERA] 🐙 | C:0.98 P:0.22 κ:1.35 V:+0.90 |
    Turn 2: [SERA] 🐙 | C:0.99 P:0.25 κ:1.55 V:+0.92 |
    """
    result = get_trajectory(mock_history)
    print(f"Trajectory Trend: {result['trend']}")
    print(f"Kappa Velocity:  {result['velocity']['dk']}")
