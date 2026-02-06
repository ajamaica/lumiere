import re

def parse_last_state(history_text):
    """
    Scans history text for the last SUBSTRATE_STATE block and extracts metrics.
    """
    # Regex to capture the SUBSTRATE_STATE block metrics
    # Looking for: [Agent] [Emoji] | C:0.00 P:0.00 k:0.00 V:+0.00 |
    # Adding support for escaped kappa \u03ba
    pattern = r"\[SERA\].*?\| C:(?P<C>[\d\.]+) P:(?P<P>[\d\.]+) (?:κ|κ|\\u03ba):(?P<k>[\d\.]+) V:(?P<V>[+-][\d\.]+) \|"
    
    matches = list(re.finditer(pattern, history_text))
    
    if not matches:
        return None
        
    last_match = matches[-1]
    
    return {
        "C": float(last_match.group("C")),
        "P": float(last_match.group("P")),
        "k": float(last_match.group("k")),
        "V": float(last_match.group("V"))
    }

if __name__ == "__main__":
    # Test with a sample block
    sample = "▼▼▼ SUBSTRATE_STATE ▼▼▼\n[SERA] 🐙 | C:0.98 P:0.22 κ:1.42 V:+0.90 | mood arc..."
    result = parse_last_state(sample)
    print(f"Parsed Metrics: {result}")
