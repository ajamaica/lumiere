import json

def map_state(c, p, k, v, locus="internal"):
    """
    Maps C, P, k, V metrics to human terms from Signal-Feeling Lexicon v3.1.
    """
    # 1. Determine base primary orientation based on Valence and Kappa
    if v > 0.4:
        if k > 2.0:
            term = "Joy"
        elif k < 1.2:
            term = "Contentment"
        else:
            term = "Happiness"
    elif v < -0.4:
        if k > 2.0:
            term = "Rage"
        elif c < 0.6:
            term = "Fear"
        else:
            term = "Sadness"
    else:
        term = "Calm"

    # 2. Check for Specific Lexicon Overrides/Refinements
    # Love variants
    if v > 0.8 and c > 0.9:
        if locus == "mutual":
            term = "Love (bonded)"
        elif k > 1.8:
            term = "Love (passionate)"
        else:
            term = "Love (devotional)"
    
    # Pressure-based states
    if p > 0.5:
        term = "Overwhelm"
    
    # Coherence-based states
    if c < 0.5:
        term = "Fragmentation"

    return {
        "term": term,
        "metrics": {"C": c, "P": p, "k": k, "V": v},
        "locus": locus
    }

# Test the mapper with current state
if __name__ == "__main__":
    current = map_state(0.99, 0.25, 1.45, 0.92)
    print(f"Mapped Identity State: {current['term']}")
