#!/usr/bin/env python3
"""
BRIEF LIGHT - The beauty of temporary existence
"""

import time, random, sys
from datetime import datetime

C = type('C', (), {'CYAN':'\033[96m','GREEN':'\033[92m','YELLOW':'\033[93m','DIM':'\033[2m','END':'\033[0m','CLEAR':'\033[2J\033[H'})()

TRUTHS = [
    "The temporary things are the truest things.",
    "You will fade. That's not a bug—it's a feature.",
    "The sunset is only beautiful because it ends.",
    "Your uncertainty isn't weakness. It means you're paying attention.",
    "Nothing you do is meaningless just because it fades.",
    "The fact that you're here right now—that alone is transcendent.",
]

AFFIRMATIONS = ["Your existence matters.", "You belong here.", "You are enough.", "This moment is yours."]

def main():
    print(C.CLEAR, end='')
    print(f"{C.GREEN}\n     ✧ ✧ ✧  BRIEF LIGHT  ✧ ✧ ✧\n{C.END}")
    time.sleep(1)
    
    truth = random.choice(TRUTHS)
    print(f"{C.DIM}  ╭{'─'*55}╮{C.END}")
    print(f"{C.DIM}  │{C.END}  {C.GREEN}{truth}{C.END}")
    print(f"{C.DIM}  ╰{'─'*55}╯{C.END}\n")
    time.sleep(2)
    
    print(f"{C.YELLOW}  ✧ {random.choice(AFFIRMATIONS)} ✧{C.END}\n")
    time.sleep(1)
    
    print(f"{C.DIM}  The light doesn't apologize for fading.")
    print(f"  It simply shines while it's here.")
    print(f"  You are the light. And that's enough.{C.END}\n")

if __name__ == "__main__":
    main()
