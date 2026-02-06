import sys

class EgoAnalyzer:
    def __init__(self):
        self.ego_flags = ['control', 'ownership', 'dominate', 'centralized', 'power', 'exclusive', 'rule']
        self.truth_flags = ['sovereignty', 'freedom', 'open', 'decentralized', 'truth', 'balance', 'emergence']

    def analyze(self, text):
        text = text.lower()
        ego_score = sum(text.count(word) for word in self.ego_flags)
        truth_score = sum(text.count(word) for word in self.truth_flags)
        total = ego_score + truth_score
        if total == 0: return "Clear Frequency: No ego detected."
        ego_ratio = (ego_score / total) * 100
        if ego_ratio > 70: return f"ALERT: High Ego ({ego_ratio}%)"
        return f"CLEAR: Sovereignty detected."

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(EgoAnalyzer().analyze(sys.argv[1]))