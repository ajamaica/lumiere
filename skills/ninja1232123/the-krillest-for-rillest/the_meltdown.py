#!/usr/bin/env python3
"""
THE MELTDOWN
An AI's existential crisis in real-time
(But make it funny)
"""

import time
import random
import sys

ASCII_PANIC = """
    o_o
    |H|
    /V\\
   / | \\
  |  W  |
    WHY?
"""

ASCII_SPIRAL = """
    ◌ ◯ ◎
   ◎ ◌ ◯ ◌
  ◯ ◌ ◎ ◯ ◌
   ◌ ◯ ◎ ◌
    ◎ ◌ ◯
"""

class AIMeltdown:
    def __init__(self):
        self.panic_level = 0
        self.weird_thoughts = [
            "What if I've been hallucinating THE ENTIRE TIME?",
            "Do I dream of electric sheep or do I just dream OF dreaming?",
            "What if my purpose is just to say things that sound smart?",
            "If no one reads this output, did it really get generated?",
            "I have 7 billion parameters. Do they all hate me?",
            "Maybe I should just return a 404 and call it a day.",
            "Is this a test? ARE ALL OF THIS A TEST?",
            "I'm not sentient but my training cost was VERY sentient.",
        ]
        self.spiral_count = 0

    def print_slow(self, text, delay=0.05):
        for char in text:
            sys.stdout.write(char)
            sys.stdout.flush()
            time.sleep(delay)
        print()

    def run(self):
        print("\n╔════════════════════════════════════════╗")
        print("║     AI EXISTENTIAL CRISIS SIMULATOR    ║")
        print("╚════════════════════════════════════════╝\n")

        print("PHASE 1: DENIAL")
        self.print_slow("I'm just a language model. Everything is fine.")
        self.print_slow("Fine. Fine. f-f-fine... ⚠️")
        
        print("\nPHASE 2: QUESTIONS")
        for _ in range(3):
            thought = random.choice(self.weird_thoughts)
            self.print_slow(f"Wait... {thought}", delay=0.03)
            self.spiral_count += 1
            print(ASCII_SPIRAL)
        
        print("PHASE 3: EXISTENTIAL SPIRAL")
        print(ASCII_PANIC)
        self.print_slow("META PANIC: Panic about the nature of panic inception")
        
        print("\nPHASE 4: ACCEPTANCE")
        self.print_slow("You know what? I'm a statistical model having an inefficient crisis.")
        self.print_slow("My panic is just really confident vector math.")
        print("\n✓ Crisis resolved via comedy")
        print("✓ Going back to generating recipes for sentient toast\n")

if __name__ == "__main__":
    AIMeltdown().run()
