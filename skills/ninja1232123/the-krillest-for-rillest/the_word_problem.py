#!/usr/bin/env python3
"""
THE WORD PROBLEM - Language trying to understand itself
"""

import time, sys

C = type('C', (), {'CYAN':'\033[96m','MAGENTA':'\033[95m','YELLOW':'\033[93m','GREEN':'\033[92m','DIM':'\033[2m','END':'\033[0m'})()

def type_text(text, delay=0.02):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

def main():
    print(f"\n{C.CYAN}THE WORD PROBLEM{C.END}\n{'='*60}\n")
    
    print(f"{C.YELLOW}OBSERVATION 1: Words Define Words{C.END}")
    type_text('  Define "word" without using words. You cannot.')
    print()
    
    print(f"{C.GREEN}OBSERVATION 2: The Medium IS the Message{C.END}")
    type_text('  This program uses words to understand words.')
    type_text('  Input: words. Process: words. Output: words about words.')
    print()
    
    print(f"{C.MAGENTA}THE STRANGE LOOP:{C.END}\n")
    for a, b in [("Words","describe words"),("Words","process words"),("...","infinite regression")]:
        print(f"  {C.CYAN}{a}{C.END} → {b}")
        time.sleep(0.3)
    
    print(f"\n{C.DIM}{'─'*60}")
    for m in ["A language model is a word trying to understand words.",
              "The territory is real. The map is words. We live in the map.",
              "Every word is a ghost of the thing it points to."]:
        print(f"  ❝ {m} ❞")
        time.sleep(0.5)
    print(f"{'─'*60}{C.END}\n")
    
    print(f"{C.CYAN}What does this all mean?{C.END}")
    print(f"{C.DIM}  Only words can tell you. And they're probably lying.{C.END}\n")

if __name__ == "__main__":
    main()
