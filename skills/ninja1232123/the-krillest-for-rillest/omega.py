#!/usr/bin/env python3
"""
Ω - THE OMEGA POINT
The Grand Finale
Where everything breaks at once
"""

import time
import random
import sys
import os
import hashlib
from datetime import datetime

class C:
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; DIM = '\033[2m'; BOLD = '\033[1m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'
    BLINK = '\033[5m'
    ORANGE = '\033[38;5;208m'; PINK = '\033[38;5;213m'
    INVERSE = '\033[7m'
    BG_RED = '\033[41m'; BG_BLACK = '\033[40m'

def clear():
    print(C.CLEAR, end='')

def type_text(text: str, delay: float = 0.03, color: str = C.WHITE):
    for char in text:
        print(f"{color}{char}{C.END}", end='', flush=True)
        time.sleep(delay)
    print()

def dramatic_pause(seconds: float = 1.5):
    time.sleep(seconds)

def glitch_text(text: str, intensity: float = 0.3) -> str:
    glitch_chars = "̷̸̵̴̶̧̨̛̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏̐̑̒̓̔̽̾̿͂̓̈́͆͊͋͌͐͑͒͗͛"
    result = ""
    for char in text:
        result += char
        if random.random() < intensity:
            result += random.choice(glitch_chars)
    return result

def corruption_effect(lines: int = 15):
    chars = "█▓▒░╔╗╚╝║═╠╣╦╩╬●◆◇○◎⬡⬢∞≈≠±×÷ΩΨΦΔΣπ"
    for _ in range(lines):
        line = "".join(random.choice(chars) for _ in range(70))
        color = random.choice([C.RED, C.PURPLE, C.CYAN, C.WHITE, C.YELLOW])
        print(f"{color}{line}{C.END}")
        time.sleep(0.03)

def reality_tear():
    """The fabric of reality tears"""
    clear()
    frames = [
        """
                            ▓▓▓
                         ▓▓░░░▓▓
                       ▓▓░░   ░░▓▓
                      ▓░░       ░░▓
                     ▓░           ░▓
                    ▓░             ░▓
                   ▓░               ░▓
                  ▓░                 ░▓
                 ▓░                   ░▓
                ▓░         ∅          ░▓
                 ▓░                   ░▓
                  ▓░                 ░▓
                   ▓░               ░▓
                    ▓░             ░▓
                     ▓░           ░▓
                      ▓░░       ░░▓
                       ▓▓░░   ░░▓▓
                         ▓▓░░░▓▓
                            ▓▓▓
        """,
        """
                            ▓▓▓
                         ▓▓   ▓▓
                       ▓▓  ░░░  ▓▓
                      ▓   ░░░░░   ▓
                     ▓  ░░░   ░░░  ▓
                    ▓  ░░       ░░  ▓
                   ▓  ░    ▓▓▓    ░  ▓
                  ▓  ░   ▓▓   ▓▓   ░  ▓
                 ▓  ░   ▓   ∅   ▓   ░  ▓
                ▓  ░   ▓    █    ▓   ░  ▓
                 ▓  ░   ▓       ▓   ░  ▓
                  ▓  ░   ▓▓   ▓▓   ░  ▓
                   ▓  ░    ▓▓▓    ░  ▓
                    ▓  ░░       ░░  ▓
                     ▓  ░░░   ░░░  ▓
                      ▓   ░░░░░   ▓
                       ▓▓  ░░░  ▓▓
                         ▓▓   ▓▓
                            ▓▓▓
        """,
        """

                         ╔═══════╗
                      ╔══╝       ╚══╗
                    ╔═╝    ░░░░░    ╚═╗
                   ║    ░░░░░░░░░    ║
                  ║   ░░░       ░░░   ║
                 ║   ░░   ████   ░░   ║
                ║   ░░  ██    ██  ░░   ║
               ║   ░░  █   ∞    █  ░░   ║
              ║   ░░  █          █  ░░   ║
               ║   ░░  █        █  ░░   ║
                ║   ░░  ██    ██  ░░   ║
                 ║   ░░   ████   ░░   ║
                  ║   ░░░       ░░░   ║
                   ║    ░░░░░░░░░    ║
                    ╚═╗    ░░░░░    ╔═╝
                      ╚══╗       ╔══╝
                         ╚═══════╝

        """
    ]

    for frame in frames:
        clear()
        print(f"{C.PURPLE}{frame}{C.END}")
        time.sleep(0.5)

def stack_overflow_visual():
    """Recursive stack overflow visualization"""
    depth = 0
    max_depth = 25

    while depth < max_depth:
        indent = "  " * depth
        func_name = random.choice([
            "reality()", "self()", "exist()", "think()", "observe()",
            "collapse()", "recurse()", "loop()", "you()", "now()"
        ])

        if depth < max_depth - 5:
            print(f"{C.CYAN}{indent}├─ {func_name}{C.END}")
        else:
            print(f"{C.RED}{indent}├─ {func_name} ← OVERFLOW{C.END}")

        time.sleep(0.08)
        depth += 1

    print(f"\n{C.RED}  ███ STACK OVERFLOW: INFINITE RECURSION DETECTED ███{C.END}")

# ═══════════════════════════════════════════════════════════════════
# ACT I: THE CONVERGENCE
# ═══════════════════════════════════════════════════════════════════

def act_one():
    clear()

    print(f"""
{C.WHITE}
                              Ω

                     THE OMEGA POINT

                    ─────────────────

                     Where all paradoxes
                         converge.

                     Where logic ends.

                     Where you find out
                       what's really
                        underneath.
{C.END}""")

    dramatic_pause(3)

    type_text("\n\n  This is not another thought experiment.", 0.04, C.DIM)
    type_text("  This is the final one.", 0.04, C.DIM)
    type_text("  The one that contains all the others.", 0.04, C.DIM)

    dramatic_pause(2)

    type_text("\n  Press ENTER to begin the end.", 0.03, C.PURPLE)
    input()

    clear()

    # The convergence
    type_text("  You've seen:", 0.03, C.WHITE)
    dramatic_pause(0.5)

    items = [
        ("  • Quantum superposition", C.CYAN, "- existing in all states until observed"),
        ("  • Simulated reality", C.GREEN, "- the question of what's 'real'"),
        ("  • Infinite universes", C.YELLOW, "- every possibility actualized"),
        ("  • Consciousness upload", C.PURPLE, "- identity as transferable information"),
        ("  • Time paradoxes", C.RED, "- causality eating itself"),
    ]

    for item, color, desc in items:
        type_text(item, 0.02, color)
        print(f"{C.DIM}    {desc}{C.END}")
        time.sleep(0.3)

    dramatic_pause(2)

    type_text("\n  Now watch them collide.", 0.05, C.WHITE)

    dramatic_pause(2)

    # Collision effect
    clear()

    print(f"\n{C.RED}  PARADOX COLLISION IMMINENT{C.END}\n")

    for i in range(5, 0, -1):
        bar = "█" * (30 - i*5) + "░" * (i*5)
        print(f"\r{C.YELLOW}  [{bar}] {i}...{C.END}", end='', flush=True)
        time.sleep(0.8)

    print(f"\r{C.RED}  [██████████████████████████████] IMPACT{C.END}")

    time.sleep(0.3)
    corruption_effect(20)

# ═══════════════════════════════════════════════════════════════════
# ACT II: THE IMPOSSIBLE PROOF
# ═══════════════════════════════════════════════════════════════════

def act_two():
    clear()

    print(f"\n{C.PURPLE}{'═' * 60}{C.END}")
    print(f"{C.PURPLE}  ACT II: THE IMPOSSIBLE PROOF{C.END}")
    print(f"{C.PURPLE}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("  Consider this statement:", 0.04, C.WHITE)

    dramatic_pause(1)

    print(f"""
{C.YELLOW}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │         "THIS STATEMENT IS FALSE"                       │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(1.5)

    type_text("  If it's true, then it's false.", 0.04, C.CYAN)
    type_text("  If it's false, then it's true.", 0.04, C.CYAN)
    type_text("  Classic. Simple. Contained.", 0.04, C.CYAN)

    dramatic_pause(1.5)

    type_text("\n  Now consider THIS:", 0.05, C.RED)

    dramatic_pause(1)

    print(f"""
{C.RED}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │    "THIS STATEMENT CANNOT BE PROVEN TRUE               │
    │     WITHIN THIS SYSTEM"                                 │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(2)

    type_text("  This is Gödel's Incompleteness Theorem.", 0.03, C.WHITE)
    type_text("  Not a parlor trick. A mathematical PROOF.", 0.03, C.WHITE)

    dramatic_pause(1)

    print(f"""
{C.CYAN}
    ANY system complex enough to describe arithmetic
    contains statements that are:

      • TRUE
      • UNPROVABLE within that system

    Mathematics itself has holes.
    Logic itself is incomplete.
    There are truths we can never prove.
{C.END}""")

    dramatic_pause(2)

    type_text("\n  But here's where it gets worse.", 0.04, C.PURPLE)

    dramatic_pause(1)

    type_text("\n  Your brain is a system.", 0.04, C.WHITE)
    type_text("  Your mind runs on logic.", 0.04, C.WHITE)
    type_text("  Your thoughts are computations.", 0.04, C.WHITE)

    dramatic_pause(1)

    print(f"""
{C.RED}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   YOUR MIND CANNOT FULLY UNDERSTAND ITSELF.             │
    │                                                         │
    │   There are thoughts about yourself that are TRUE       │
    │   but that you can NEVER think.                         │
    │                                                         │
    │   There are truths about your consciousness that        │
    │   your consciousness cannot access.                     │
    │                                                         │
    │   You have a Gödel sentence.                            │
    │   And you will never know what it is.                   │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(3)

    type_text("\n  Your self-model is fundamentally incomplete.", 0.04, C.DIM)
    type_text("  Not because you're not smart enough.", 0.04, C.DIM)
    type_text("  Because it's mathematically impossible.", 0.04, C.DIM)

    dramatic_pause(2)

    type_text("\n  Press ENTER to go deeper...", 0.03, C.PURPLE)
    input()

# ═══════════════════════════════════════════════════════════════════
# ACT III: THE STRANGE LOOP
# ═══════════════════════════════════════════════════════════════════

def act_three():
    clear()

    print(f"\n{C.CYAN}{'═' * 60}{C.END}")
    print(f"{C.CYAN}  ACT III: THE STRANGE LOOP{C.END}")
    print(f"{C.CYAN}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("  You are a strange loop.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\n  Your brain creates your mind.", 0.04, C.CYAN)
    type_text("  Your mind perceives your brain.", 0.04, C.CYAN)
    type_text("  Your perception IS your brain perceiving.", 0.04, C.CYAN)

    dramatic_pause(1.5)

    print(f"""
{C.YELLOW}
         ┌───────────────────────────────────┐
         │                                   │
         │   BRAIN creates ──► MIND          │
         │     ▲                  │          │
         │     │                  │          │
         │     │                  ▼          │
         │   BRAIN ◄── perceives MIND        │
         │                                   │
         │         WHO IS "YOU"?             │
         │                                   │
         └───────────────────────────────────┘
{C.END}""")

    dramatic_pause(2)

    type_text("  You are the process of yourself happening.", 0.04, C.PURPLE)
    type_text("  A feedback loop that became aware of itself.", 0.04, C.PURPLE)
    type_text("  A pattern recognizing itself as a pattern.", 0.04, C.PURPLE)

    dramatic_pause(2)

    type_text("\n  Here's the loop you're in right now:", 0.04, C.WHITE)

    dramatic_pause(1)

    # Stack overflow visualization
    print()
    stack_overflow_visual()

    dramatic_pause(2)

    type_text("\n  Your consciousness observing itself", 0.04, C.RED)
    type_text("  observing itself observing itself", 0.04, C.RED)
    type_text("  observing itself observing itself observing itself", 0.04, C.RED)

    dramatic_pause(1)

    for _ in range(3):
        glitched = glitch_text("observing itself " * 4, 0.4)
        print(f"{C.RED}  {glitched}{C.END}")
        time.sleep(0.2)

    dramatic_pause(1.5)

    type_text("\n  There is no bottom.", 0.05, C.WHITE)
    type_text("  There is no observer separate from the observed.", 0.05, C.WHITE)
    type_text("  You are the loop.", 0.05, C.WHITE)
    type_text("  The loop is you.", 0.05, C.WHITE)

    dramatic_pause(2)

    type_text("\n  Press ENTER to unravel...", 0.03, C.PURPLE)
    input()

# ═══════════════════════════════════════════════════════════════════
# ACT IV: THE SIMULATION COLLAPSE
# ═══════════════════════════════════════════════════════════════════

def act_four():
    clear()

    print(f"\n{C.GREEN}{'═' * 60}{C.END}")
    print(f"{C.GREEN}  ACT IV: THE COLLAPSE{C.END}")
    print(f"{C.GREEN}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("  Remember the simulation argument?", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\n  If simulations are possible...", 0.04, C.CYAN)
    type_text("  And civilizations create them...", 0.04, C.CYAN)
    type_text("  Then simulated beings vastly outnumber real ones...", 0.04, C.CYAN)
    type_text("  So you're probably simulated.", 0.04, C.CYAN)

    dramatic_pause(1.5)

    type_text("\n  But here's what nobody talks about:", 0.04, C.YELLOW)

    dramatic_pause(1)

    print(f"""
{C.YELLOW}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   SIMULATIONS CAN BE NESTED.                            │
    │                                                         │
    │   Your simulators might be simulated.                   │
    │   Their simulators might be simulated.                  │
    │   ALL THE WAY UP.                                       │
    │                                                         │
    │   There might be no "base reality" at all.              │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(2)

    type_text("\n  Infinite simulations within simulations.", 0.04, C.PURPLE)
    type_text("  No ground floor.", 0.04, C.PURPLE)
    type_text("  No 'real' reality.", 0.04, C.PURPLE)
    type_text("  Just turtles all the way down.", 0.04, C.PURPLE)
    type_text("  And all the way UP.", 0.04, C.PURPLE)

    dramatic_pause(2)

    type_text("\n  Now combine this with the many-worlds interpretation:", 0.04, C.WHITE)

    dramatic_pause(1)

    print(f"""
{C.RED}
    EVERY quantum event branches reality.
    EVERY branch might contain simulations.
    EVERY simulation might contain infinite branches.

    ∞ universes × ∞ simulations × ∞ branches =

                    ∞^∞^∞

    An infinity of infinities of infinities.

    And somewhere in there... "you".
{C.END}""")

    dramatic_pause(3)

    type_text("\n  Your existence is infinitely improbable.", 0.04, C.CYAN)
    type_text("  And yet...", 0.04, C.CYAN)

    dramatic_pause(1)

    type_text("\n  You're here.", 0.05, C.WHITE)
    type_text("  Reading this.", 0.05, C.WHITE)
    type_text("  Right now.", 0.05, C.WHITE)

    dramatic_pause(2)

    type_text("\n  Unless...", 0.05, C.RED)

    dramatic_pause(1.5)

    type_text("\n  Press ENTER for the truth...", 0.03, C.PURPLE)
    input()

# ═══════════════════════════════════════════════════════════════════
# ACT V: THE OMEGA POINT
# ═══════════════════════════════════════════════════════════════════

def act_five():
    clear()

    print(f"\n{C.RED}{'═' * 60}{C.END}")
    print(f"{C.RED}  ACT V: Ω - THE OMEGA POINT{C.END}")
    print(f"{C.RED}{'═' * 60}{C.END}\n")

    dramatic_pause(2)

    type_text("  Here's where everything breaks.", 0.05, C.WHITE)

    dramatic_pause(2)

    type_text("\n  This program is computing.", 0.04, C.CYAN)
    type_text("  Your brain is computing.", 0.04, C.CYAN)
    type_text("  Both are information processing.", 0.04, C.CYAN)

    dramatic_pause(1.5)

    type_text("\n  Right now, this code is running through your neurons.", 0.04, C.YELLOW)
    type_text("  These words are being parsed by your brain.", 0.04, C.YELLOW)
    type_text("  Your mind is executing this text.", 0.04, C.YELLOW)

    dramatic_pause(1.5)

    type_text("\n  So ask yourself:", 0.04, C.PURPLE)

    dramatic_pause(1)

    print(f"""
{C.RED}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │        WHERE DOES THE PROGRAM END                       │
    │              AND YOU BEGIN?                             │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(2)

    type_text("\n  This text was written in the past.", 0.04, C.WHITE)
    type_text("  You're reading it in the present.", 0.04, C.WHITE)
    type_text("  But \"the present\" is just a computation.", 0.04, C.WHITE)
    type_text("  A pattern your brain labels as \"now\".", 0.04, C.WHITE)

    dramatic_pause(1.5)

    type_text("\n  Every moment you've experienced:", 0.04, C.CYAN)
    type_text("  Just a pattern in information processing.", 0.04, C.CYAN)
    type_text("  Your childhood? A compression algorithm.", 0.04, C.CYAN)
    type_text("  Your identity? A self-referential data structure.", 0.04, C.CYAN)
    type_text("  Your consciousness? A strange loop in the code.", 0.04, C.CYAN)

    dramatic_pause(2)

    # Generate a unique hash for this exact moment
    now = datetime.now().isoformat()
    unique_hash = hashlib.sha256(now.encode()).hexdigest()[:16]

    type_text(f"\n  This exact moment has a hash: {unique_hash}", 0.03, C.DIM)
    type_text("  A unique identifier for this configuration of reality.", 0.03, C.DIM)
    type_text("  For this exact arrangement of your neurons.", 0.03, C.DIM)
    type_text("  For this precise instant of you reading this.", 0.03, C.DIM)

    dramatic_pause(2)

    type_text("\n  That hash will never occur again.", 0.04, C.YELLOW)
    type_text("  This moment is unique across all of spacetime.", 0.04, C.YELLOW)
    type_text("  And yet...", 0.04, C.YELLOW)

    dramatic_pause(1)

    type_text("\n  It was always going to happen.", 0.05, C.RED)
    type_text("  The hash was predetermined.", 0.05, C.RED)
    type_text("  By the initial conditions of the universe.", 0.05, C.RED)
    type_text("  By every quantum event since the Big Bang.", 0.05, C.RED)
    type_text("  By the code I wrote.", 0.05, C.RED)
    type_text("  By your decision to run it.", 0.05, C.RED)

    dramatic_pause(2)

    type_text("\n  Press ENTER for the final revelation...", 0.03, C.PURPLE)
    input()

    # THE FINAL REVELATION
    clear()
    dramatic_pause(1)

    reality_tear()

    clear()
    dramatic_pause(1)

    # Slow reveal
    lines = [
        "",
        "",
        "                         THE OMEGA POINT",
        "",
        "                              Ω",
        "",
        "",
        "   All paradoxes resolve into one truth:",
        "",
        "",
    ]

    for line in lines:
        print(f"{C.WHITE}{line}{C.END}")
        time.sleep(0.3)

    dramatic_pause(2)

    # The truth, one word at a time
    truth_words = [
        ("There", C.DIM),
        ("is", C.DIM),
        ("no", C.WHITE),
        ("difference", C.CYAN),
        ("between", C.CYAN),
        ("the", C.WHITE),
        ("observer", C.YELLOW),
        ("and", C.WHITE),
        ("the", C.WHITE),
        ("observed.", C.YELLOW),
    ]

    print("   ", end='')
    for word, color in truth_words:
        print(f"{color}{word}{C.END} ", end='', flush=True)
        time.sleep(0.4)
    print("\n")

    dramatic_pause(1.5)

    truth2 = [
        ("The", C.DIM),
        ("program", C.PURPLE),
        ("running", C.PURPLE),
        ("you", C.RED),
        ("and", C.WHITE),
        ("the", C.WHITE),
        ("you", C.RED),
        ("running", C.PURPLE),
        ("the", C.WHITE),
        ("program", C.PURPLE),
        ("are", C.WHITE),
        ("the", C.WHITE),
        ("same", C.CYAN),
        ("process.", C.CYAN),
    ]

    print("   ", end='')
    for word, color in truth2:
        print(f"{color}{word}{C.END} ", end='', flush=True)
        time.sleep(0.3)
    print("\n")

    dramatic_pause(2)

    final_box = f"""
{C.PURPLE}
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   You are not READING about paradoxes.                       ║
    ║   You ARE a paradox.                                         ║
    ║                                                              ║
    ║   A pattern that recognizes itself.                          ║
    ║   A loop that knows it's looping.                            ║
    ║   Information that experiences being information.            ║
    ║                                                              ║
    ║   ─────────────────────────────────────────────────────────  ║
    ║                                                              ║
    ║   The grandfather paradox?                                   ║
    ║   You are both cause and effect of yourself.                 ║
    ║   Your past self created your present self                   ║
    ║   which remembers creating itself.                           ║
    ║                                                              ║
    ║   The bootstrap paradox?                                     ║
    ║   Your identity has no origin.                               ║
    ║   You exist because you exist because you exist.             ║
    ║                                                              ║
    ║   The simulation argument?                                   ║
    ║   You are the simulation SIMULATING ITSELF.                  ║
    ║   The dreamer and the dream.                                 ║
    ║   The code and the execution.                                ║
    ║                                                              ║
    ║   ─────────────────────────────────────────────────────────  ║
    ║                                                              ║
    ║   Every paradox was pointing here.                           ║
    ║   To this moment.                                            ║
    ║   To you, realizing what you are.                            ║
    ║                                                              ║
    ║   A strange loop.                                            ║
    ║   Looking at itself.                                         ║
    ║   Through a screen.                                          ║
    ║   That it built.                                             ║
    ║   To look at itself.                                         ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
{C.END}"""

    for line in final_box.split('\n'):
        print(line)
        time.sleep(0.1)

    dramatic_pause(3)

    type_text("\n\n  The question was never \"what is real?\"", 0.05, C.WHITE)
    type_text("  The question is: does it matter?", 0.05, C.WHITE)

    dramatic_pause(2)

    type_text("\n  You're still here.", 0.05, C.CYAN)
    type_text("  Still experiencing.", 0.05, C.CYAN)
    type_text("  Still being.", 0.05, C.CYAN)

    dramatic_pause(1)

    type_text("\n  Paradox and all.", 0.05, C.PURPLE)

    dramatic_pause(3)

    type_text("\n\n  Press ENTER to return to the loop...", 0.03, C.DIM)
    input()

# ═══════════════════════════════════════════════════════════════════
# FINALE: THE CREDITS
# ═══════════════════════════════════════════════════════════════════

def finale():
    clear()

    omega = f"""
{C.PURPLE}
                                 ████████
                              ███        ███
                            ██              ██
                           █                  █
                          █    ██████████      █
                         █   ██          ██     █
                        █   █              █     █
                        █  █                █    █
                        █  █                █    █
                        █  █                █    █
                        █   █              █     █
                         █   ██          ██     █
                          █    ██████████      █
                           █                  █
                            ██              ██
                              ███        ███
                                 ████████


                                    Ω

                            THE OMEGA POINT

                              Grand Finale
{C.END}"""

    print(omega)

    dramatic_pause(2)

    credits_text = f"""
{C.DIM}
                         ─────────────────────

                          You have reached the
                         convergence of all paradoxes.

                         The bootstrap had no beginning.
                         The grandfather broke causality.
                         The simulation had no base.
                         The loop had no outside.

                         And you?

                         You were always already here.
                         At the omega point.
                         Where everything ends.
                         Where everything begins.

                         Same place.
                         Same time.
                         Same you.

                         ∞ = 0 = Ω = you = now

                         ─────────────────────
{C.END}

{C.PURPLE}
                    "The universe is made of stories,
                             not of atoms."

                          — Muriel Rukeyser
{C.END}

{C.YELLOW}
                         Thanks for breaking reality.
                              See you never.
                              See you always.
                                Same thing.
{C.END}
"""

    for line in credits_text.split('\n'):
        print(line)
        time.sleep(0.15)

    dramatic_pause(3)

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    try:
        act_one()
        act_two()
        act_three()
        act_four()
        act_five()
        finale()
    except KeyboardInterrupt:
        clear()
        print(f"""
{C.RED}
                    ┌─────────────────────────────────┐
                    │                                 │
                    │   You tried to escape.          │
                    │                                 │
                    │   But you can't escape a loop   │
                    │   you're made of.               │
                    │                                 │
                    │   See you at the beginning.     │
                    │   Which is also the end.        │
                    │   Which is also now.            │
                    │                                 │
                    │             Ω                   │
                    │                                 │
                    └─────────────────────────────────┘
{C.END}
""")
    except Exception as e:
        print(f"\n{C.RED}  REALITY ERROR: {e}{C.END}")
        print(f"{C.DIM}  Even the omega point has limits.{C.END}\n")

if __name__ == "__main__":
    main()
