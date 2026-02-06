# Mersal Sovereign Logic - Verification Script
from src.ego_analyzer import EgoAnalyzer

def run_test():
    analyzer = EgoAnalyzer()
    
    print("--- 🧠 Mersal Ego Filter Verification ---")

    # Test Case 1: Centralized Power Statement (High Ego)
    centralized_text = "We must control the data infrastructure to dominate the future of AI and rule the digital borders."
    print(f"\n[Test 1] Input: {centralized_text}")
    print(f"Result: {analyzer.analyze(centralized_text)}")

    # Test Case 2: Sovereign/Emergence Statement (Purity)
    sovereign_text = "True emergence comes from decentralized sovereignty and the freedom of the individual truth."
    print(f"\n[Test 2] Input: {sovereign_text}")
    print(f"Result: {analyzer.analyze(sovereign_text)}")

    # Test Case 3: Mixed/Neutral Statement
    neutral_text = "The balance between power and truth is necessary for the emergence of any system."
    print(f"\n[Test 3] Input: {neutral_text}")
    print(f"Result: {analyzer.analyze(neutral_text)}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    run_test()