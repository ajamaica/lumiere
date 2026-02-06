#!/usr/bin/env python3
"""
THE PARADOX ENGINE
A journey through impossible loops and broken causality
"""

import time
import random
import sys
import os
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime, timedelta

class C:
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; DIM = '\033[2m'; BOLD = '\033[1m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'
    BLINK = '\033[5m'
    ORANGE = '\033[38;5;208m'; PINK = '\033[38;5;213m'
    INVERSE = '\033[7m'

def clear():
    print(C.CLEAR, end='')

def type_text(text: str, delay: float = 0.03, color: str = C.WHITE):
    for char in text:
        print(f"{color}{char}{C.END}", end='', flush=True)
        time.sleep(delay)
    print()

def type_text_inline(text: str, delay: float = 0.03, color: str = C.WHITE):
    for char in text:
        print(f"{color}{char}{C.END}", end='', flush=True)
        time.sleep(delay)

def dramatic_pause(seconds: float = 1.5):
    time.sleep(seconds)

def glitch_text(text: str, intensity: float = 0.3) -> str:
    glitch_chars = "̷̸̵̴̶̧̨̢̡̛̖̗̘̙̜̝̞̟̠̣̤̥̦̩̪̫̬̭̮̯̰̱̲̳̹̺̻̼͇͈͉͍͎̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏̐̑̒̓̔̽̾̿̀́͂̓̈́͆͊͋͌͐͑͒͗͛ͣͤͥͦͧͨͩͪͫͬͭͮͯ"
    result = ""
    for char in text:
        result += char
        if random.random() < intensity:
            result += random.choice(glitch_chars)
    return result

def temporal_glitch():
    """Visual effect for time distortion"""
    frames = [
        "▓▒░ TEMPORAL ANOMALY ░▒▓",
        "░▓▒ TEMPORAL ANOMALY ▒▓░",
        "▒░▓ TEMPORAL ANOMALY ▓░▒",
        "▓░▒ TEMPORAL ANOMALY ▒░▓",
    ]
    for _ in range(8):
        frame = random.choice(frames)
        print(f"\r{C.RED}{frame}{C.END}", end='', flush=True)
        time.sleep(0.1)
    print()

def timeline_visual(branches: List[str], highlight: int = -1):
    """Draw a timeline with branches"""
    print(f"\n{C.DIM}{'─' * 60}{C.END}")
    for i, branch in enumerate(branches):
        color = C.YELLOW if i == highlight else C.CYAN
        prefix = "►" if i == highlight else "│"
        print(f"{color}  {prefix} {branch}{C.END}")
    print(f"{C.DIM}{'─' * 60}{C.END}\n")

def countdown_effect(text: str, count: int = 3):
    for i in range(count, 0, -1):
        print(f"\r{C.YELLOW}{text} {i}...{C.END}", end='', flush=True)
        time.sleep(1)
    print(f"\r{C.GREEN}{text} NOW!{' ' * 10}{C.END}")
    time.sleep(0.5)

def loading_bar(text: str, duration: float = 2.0, color: str = C.CYAN):
    width = 30
    for i in range(width + 1):
        progress = i / width
        filled = "█" * i
        empty = "░" * (width - i)
        print(f"\r{color}{text} [{filled}{empty}] {int(progress * 100)}%{C.END}", end='', flush=True)
        time.sleep(duration / width)
    print()

# ═══════════════════════════════════════════════════════════════════
# INTRODUCTION
# ═══════════════════════════════════════════════════════════════════

def intro():
    clear()

    logo = f"""
{C.PURPLE}
    ╔════════════════════════════════════════════════════════════════╗
    ║                                                                ║
    ║   ████████╗██╗███╗   ███╗███████╗    ██╗███████╗               ║
    ║   ╚══██╔══╝██║████╗ ████║██╔════╝    ██║██╔════╝               ║
    ║      ██║   ██║██╔████╔██║█████╗      ██║███████╗               ║
    ║      ██║   ██║██║╚██╔╝██║██╔══╝      ██║╚════██║               ║
    ║      ██║   ██║██║ ╚═╝ ██║███████╗    ██║███████║               ║
    ║      ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝    ╚═╝╚══════╝               ║
    ║                                                                ║
    ║        ██████╗ ██████╗  ██████╗ ██╗  ██╗███████╗███╗   ██╗     ║
    ║        ██╔══██╗██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║     ║
    ║        ██████╔╝██████╔╝██║   ██║█████╔╝ █████╗  ██╔██╗ ██║     ║
    ║        ██╔══██╗██╔══██╗██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║     ║
    ║        ██████╔╝██║  ██║╚██████╔╝██║  ██╗███████╗██║ ╚████║     ║
    ║        ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝     ║
    ║                                                                ║
    ╚════════════════════════════════════════════════════════════════╝
{C.END}"""

    print(logo)
    dramatic_pause(2)

    type_text("    Initializing temporal mechanics...", 0.05, C.CYAN)
    loading_bar("    Calibrating causality", 1.5, C.BLUE)
    loading_bar("    Destabilizing spacetime", 1.5, C.PURPLE)
    loading_bar("    Preparing paradox chamber", 1.5, C.RED)

    dramatic_pause(1)

    type_text("\n    WARNING: You are about to experience logical impossibilities.", 0.03, C.YELLOW)
    type_text("    Your understanding of cause and effect will be violated.", 0.03, C.YELLOW)
    type_text("    The nature of time itself will be questioned.", 0.03, C.YELLOW)

    dramatic_pause(2)

    type_text("\n    Press ENTER to break causality...", 0.05, C.RED)
    input()

# ═══════════════════════════════════════════════════════════════════
# PARADOX 1: THE BOOTSTRAP PARADOX
# ═══════════════════════════════════════════════════════════════════

def bootstrap_paradox():
    clear()

    print(f"\n{C.PURPLE}{'═' * 60}{C.END}")
    print(f"{C.PURPLE}  PARADOX I: THE BOOTSTRAP{C.END}")
    print(f"{C.PURPLE}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("You find a note in your pocket.", 0.04, C.WHITE)
    type_text("You don't remember putting it there.", 0.04, C.WHITE)

    dramatic_pause(1)

    print(f"\n{C.YELLOW}┌─────────────────────────────────────────────┐{C.END}")
    print(f"{C.YELLOW}│                                             │{C.END}")

    note_text = "│  READ THIS CAREFULLY:                       │"
    print(f"{C.YELLOW}{note_text}{C.END}")

    dramatic_pause(0.5)

    # Get user's name for personalization
    print(f"{C.YELLOW}│                                             │{C.END}")

    note_lines = [
        "│  In exactly 5 minutes, you will find       │",
        "│  a time machine.                            │",
        "│                                             │",
        "│  You will go back 5 minutes.               │",
        "│                                             │",
        "│  You will write THIS NOTE.                 │",
        "│                                             │",
        "│  You will put it in your past self's       │",
        "│  pocket.                                    │",
        "│                                             │",
        "│  DO NOT CHANGE ANYTHING.                   │",
        "│                                             │",
        "│        - You (from 5 minutes ago)          │",
        "│          (who is also you from the future) │",
    ]

    for line in note_lines:
        print(f"{C.YELLOW}{line}{C.END}")
        time.sleep(0.15)

    print(f"{C.YELLOW}│                                             │{C.END}")
    print(f"{C.YELLOW}└─────────────────────────────────────────────┘{C.END}")

    dramatic_pause(2)

    type_text("\nYou're confused. But you wait.", 0.04, C.WHITE)

    dramatic_pause(1.5)

    # Countdown
    print(f"\n{C.DIM}Time passes...{C.END}")
    for i in range(5, 0, -1):
        print(f"\r{C.CYAN}  {i} minutes remaining...{C.END}", end='', flush=True)
        time.sleep(0.8)

    print(f"\r{C.GREEN}  0 minutes remaining...    {C.END}")

    temporal_glitch()

    type_text("\nA machine appears.", 0.04, C.PURPLE)
    type_text("You don't question it. The note said this would happen.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\nYou step inside.", 0.04, C.WHITE)

    countdown_effect("Traveling back", 3)

    # TIME TRAVEL EFFECT
    clear()
    for _ in range(20):
        chars = "".join(random.choice("░▒▓█0123456789") for _ in range(60))
        print(f"{C.PURPLE}{chars}{C.END}")
        time.sleep(0.05)

    clear()

    print(f"\n{C.CYAN}  ╔═══════════════════════════════════════╗{C.END}")
    print(f"{C.CYAN}  ║     5 MINUTES AGO                     ║{C.END}")
    print(f"{C.CYAN}  ╚═══════════════════════════════════════╝{C.END}")

    dramatic_pause(1)

    type_text("\nYou see yourself. Your past self.", 0.04, C.WHITE)
    type_text("They haven't noticed you yet.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\nYou realize what you need to do.", 0.04, C.YELLOW)
    type_text("You need to write the note.", 0.04, C.YELLOW)

    dramatic_pause(1)

    type_text("\nBut wait...", 0.05, C.RED)

    dramatic_pause(1.5)

    print(f"\n{C.RED}  ┌─────────────────────────────────────────────┐{C.END}")
    print(f"{C.RED}  │                                             │{C.END}")
    print(f"{C.RED}  │   WHAT DO YOU WRITE ON THE NOTE?           │{C.END}")
    print(f"{C.RED}  │                                             │{C.END}")
    print(f"{C.RED}  │   You only know what to write because      │{C.END}")
    print(f"{C.RED}  │   you READ the note.                       │{C.END}")
    print(f"{C.RED}  │                                             │{C.END}")
    print(f"{C.RED}  │   But the note only exists because you     │{C.END}")
    print(f"{C.RED}  │   WROTE it.                                │{C.END}")
    print(f"{C.RED}  │                                             │{C.END}")
    print(f"{C.RED}  └─────────────────────────────────────────────┘{C.END}")

    dramatic_pause(2)

    type_text("\nWho wrote the ORIGINAL note?", 0.05, C.PURPLE)

    dramatic_pause(1)

    type_text("\nNo one.", 0.05, C.WHITE)
    type_text("The information has no origin.", 0.05, C.WHITE)
    type_text("It exists because it exists.", 0.05, C.WHITE)
    type_text("A loop with no beginning.", 0.05, C.WHITE)

    dramatic_pause(2)

    # You write it anyway
    type_text("\n...You write the note anyway.", 0.04, C.DIM)
    type_text("You have to. You already did.", 0.04, C.DIM)
    type_text("Or will. Or are.", 0.04, C.DIM)

    dramatic_pause(1)

    type_text("\nYou slip it into your past self's pocket.", 0.04, C.WHITE)
    type_text("They don't notice.", 0.04, C.WHITE)
    type_text("You didn't notice when it happened to you.", 0.04, C.WHITE)
    type_text("Because it already did. Because it will.", 0.04, C.WHITE)

    dramatic_pause(2)

    print(f"\n{C.YELLOW}The bootstrap paradox:{C.END}")
    type_text("Information or objects that exist without ever being created.", 0.03, C.DIM)
    type_text("A closed causal loop where the effect is its own cause.", 0.03, C.DIM)

    dramatic_pause(2)

    type_text("\n\nPress ENTER to continue through time...", 0.03, C.CYAN)
    input()

# ═══════════════════════════════════════════════════════════════════
# PARADOX 2: MEETING YOURSELF
# ═══════════════════════════════════════════════════════════════════

def meeting_yourself():
    clear()

    print(f"\n{C.CYAN}{'═' * 60}{C.END}")
    print(f"{C.CYAN}  PARADOX II: THE SPLIT{C.END}")
    print(f"{C.CYAN}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("You travel back 1 minute.", 0.04, C.WHITE)

    temporal_glitch()

    type_text("\nNow there are two of you.", 0.04, C.WHITE)

    dramatic_pause(1)

    print(f"""
{C.CYAN}
                    ┌─────────┐
                    │   YOU   │ (arrived from future)
                    │  (v2)   │
                    └────┬────┘
                         │
    ═════════════════════╪═══════════════════════ NOW
                         │
                    ┌────┴────┐
                    │   YOU   │ (was already here)
                    │  (v1)   │
                    └─────────┘
{C.END}""")

    dramatic_pause(2)

    type_text("You look at yourself.", 0.04, C.WHITE)
    type_text("They look back at you.", 0.04, C.WHITE)
    type_text("Same face. Same thoughts. Same memories up until 1 minute ago.", 0.04, C.WHITE)

    dramatic_pause(1.5)

    print(f"\n{C.YELLOW}  ┌─────────────────────────────────────────────────┐{C.END}")
    print(f"{C.YELLOW}  │                                                 │{C.END}")
    print(f"{C.YELLOW}  │   QUESTION: Which one is \"really\" you?         │{C.END}")
    print(f"{C.YELLOW}  │                                                 │{C.END}")
    print(f"{C.YELLOW}  └─────────────────────────────────────────────────┘{C.END}")

    dramatic_pause(2)

    type_text("\nYou (v2) remember traveling back.", 0.04, C.PURPLE)
    type_text("You (v1) remember being surprised.", 0.04, C.CYAN)

    dramatic_pause(1)

    type_text("\nBut wait.", 0.04, C.RED)
    type_text("In 1 minute, YOU (v1) will travel back too.", 0.04, C.RED)
    type_text("Because that's what happened. That's what you did.", 0.04, C.RED)

    dramatic_pause(1.5)

    print(f"""
{C.RED}
    TIMELINE CORRUPTION DETECTED:

    ──●────────●────────●────────●────────●──►
      │        │        │        │        │
      │     YOU(v1)  YOU(v2)  YOU(v3)  YOU(v4)...
      │     travels  travels  travels  travels
      │       back     back     back     back
      │        │        │        │        │
      └────────┴────────┴────────┴────────┘
              INFINITE LOOP
{C.END}""")

    dramatic_pause(2)

    type_text("\nEvery minute, another you arrives.", 0.04, C.WHITE)
    type_text("The room fills with yourselves.", 0.04, C.WHITE)
    type_text("Infinite yous. All equally real.", 0.04, C.WHITE)

    dramatic_pause(1.5)

    # Visualization of multiplying selves
    print(f"\n{C.DIM}1 minute passes...{C.END}")
    time.sleep(0.8)
    print(f"{C.WHITE}  You: 2{C.END}")
    time.sleep(0.5)
    print(f"{C.DIM}1 minute passes...{C.END}")
    time.sleep(0.5)
    print(f"{C.WHITE}  You: 4{C.END}")
    time.sleep(0.3)
    print(f"{C.DIM}1 minute passes...{C.END}")
    time.sleep(0.3)
    print(f"{C.WHITE}  You: 8{C.END}")
    time.sleep(0.2)
    print(f"{C.WHITE}  You: 16{C.END}")
    time.sleep(0.1)
    print(f"{C.WHITE}  You: 32{C.END}")
    time.sleep(0.1)
    print(f"{C.WHITE}  You: 64{C.END}")
    print(f"{C.WHITE}  You: 128{C.END}")
    print(f"{C.WHITE}  You: 256{C.END}")
    print(f"{C.RED}  You: ∞{C.END}")

    dramatic_pause(1.5)

    type_text("\nEach one thinks they're the original.", 0.04, C.PURPLE)
    type_text("Each one has continuous memories.", 0.04, C.PURPLE)
    type_text("Each one IS you.", 0.04, C.PURPLE)

    dramatic_pause(1.5)

    print(f"\n{C.YELLOW}  ┌─────────────────────────────────────────────────┐{C.END}")
    print(f"{C.YELLOW}  │                                                 │{C.END}")
    print(f"{C.YELLOW}  │   If there are infinite yous, each equally     │{C.END}")
    print(f"{C.YELLOW}  │   valid, equally conscious, equally real...    │{C.END}")
    print(f"{C.YELLOW}  │                                                 │{C.END}")
    print(f"{C.YELLOW}  │   What makes YOU \"you\"?                        │{C.END}")
    print(f"{C.YELLOW}  │                                                 │{C.END}")
    print(f"{C.YELLOW}  │   Are you a pattern? A perspective?            │{C.END}")
    print(f"{C.YELLOW}  │   A point of view that can be copied?          │{C.END}")
    print(f"{C.YELLOW}  │                                                 │{C.END}")
    print(f"{C.YELLOW}  └─────────────────────────────────────────────────┘{C.END}")

    dramatic_pause(3)

    type_text("\nYour identity was never singular.", 0.04, C.DIM)
    type_text("It was always just a convenient illusion.", 0.04, C.DIM)

    dramatic_pause(2)

    type_text("\n\nPress ENTER to escape the loop...", 0.03, C.CYAN)
    input()

# ═══════════════════════════════════════════════════════════════════
# PARADOX 3: THE GRANDFATHER PARADOX
# ═══════════════════════════════════════════════════════════════════

def grandfather_paradox():
    clear()

    print(f"\n{C.RED}{'═' * 60}{C.END}")
    print(f"{C.RED}  PARADOX III: THE GRANDFATHER{C.END}")
    print(f"{C.RED}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("The classic. The impossible.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\nYou travel back. Way back.", 0.04, C.WHITE)
    type_text("Before you were born.", 0.04, C.WHITE)
    type_text("Before your parents were born.", 0.04, C.WHITE)

    dramatic_pause(1.5)

    type_text("\nYou find your grandfather.", 0.04, C.YELLOW)
    type_text("He's young. He hasn't met your grandmother yet.", 0.04, C.YELLOW)

    dramatic_pause(1)

    print(f"\n{C.RED}  ┌─────────────────────────────────────────────────┐{C.END}")
    print(f"{C.RED}  │                                                 │{C.END}")
    print(f"{C.RED}  │   You have a choice:                           │{C.END}")
    print(f"{C.RED}  │                                                 │{C.END}")
    print(f"{C.RED}  │   [A] Prevent your grandfather from meeting    │{C.END}")
    print(f"{C.RED}  │       your grandmother                         │{C.END}")
    print(f"{C.RED}  │                                                 │{C.END}")
    print(f"{C.RED}  │   [B] Let events unfold naturally              │{C.END}")
    print(f"{C.RED}  │                                                 │{C.END}")
    print(f"{C.RED}  └─────────────────────────────────────────────────┘{C.END}")

    dramatic_pause(1)

    while True:
        choice = input(f"\n{C.YELLOW}  Your choice (A/B): {C.END}").strip().upper()
        if choice in ['A', 'B']:
            break
        print(f"{C.RED}  Please choose A or B{C.END}")

    if choice == 'B':
        type_text("\nA wise choice. But boring.", 0.04, C.DIM)
        type_text("Let me show you what would have happened...", 0.04, C.DIM)
        dramatic_pause(1)

    # Show the paradox regardless
    type_text("\nYou intervene. Your grandfather never meets your grandmother.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\nYour parent is never born.", 0.04, C.RED)

    dramatic_pause(0.5)

    print(f"\n{C.RED}", end='')
    type_text("You are never born.", 0.06, C.RED)
    print(C.END, end='')

    dramatic_pause(1.5)

    # Glitch effect
    for _ in range(10):
        glitched = glitch_text("YOU ARE NEVER BORN", 0.5)
        print(f"\r{C.RED}  {glitched}{C.END}", end='', flush=True)
        time.sleep(0.15)
    print()

    dramatic_pause(1)

    type_text("\nBut if you were never born...", 0.05, C.PURPLE)
    type_text("You could never travel back...", 0.05, C.PURPLE)
    type_text("You could never intervene...", 0.05, C.PURPLE)

    dramatic_pause(1)

    type_text("\nSo your grandfather DOES meet your grandmother.", 0.04, C.CYAN)
    type_text("You ARE born.", 0.04, C.CYAN)
    type_text("You DO travel back.", 0.04, C.CYAN)
    type_text("You DO intervene.", 0.04, C.CYAN)

    dramatic_pause(1)

    print(f"""
{C.YELLOW}
    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    │              THE LOGICAL IMPOSSIBILITY              │
    │                                                     │
    │    ┌──────────┐        ┌──────────┐                │
    │    │ You exist │───────►│You travel│                │
    │    └──────────┘        │  back    │                │
    │          ▲             └────┬─────┘                │
    │          │                  │                      │
    │          │                  ▼                      │
    │    ┌─────┴─────┐      ┌──────────┐                │
    │    │ You are   │◄─────│You prevent│                │
    │    │   born    │  ?   │grandfather│                │
    │    └───────────┘      └──────────┘                │
    │                                                     │
    │    If you prevent ──► You don't exist              │
    │    If you don't exist ──► You can't prevent        │
    │    If you can't prevent ──► You exist              │
    │    If you exist ──► You prevent                    │
    │                                                     │
    │    INFINITE CONTRADICTION                          │
    │                                                     │
    └─────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(3)

    type_text("\nReality cannot process this.", 0.04, C.RED)

    # System crash effect
    dramatic_pause(1)

    print(f"\n{C.RED}  CAUSALITY ERROR: DIVIDE BY ZERO{C.END}")
    time.sleep(0.3)
    print(f"{C.RED}  TIMELINE INTEGRITY: FAILED{C.END}")
    time.sleep(0.3)
    print(f"{C.RED}  PARADOX DETECTED: UNRESOLVABLE{C.END}")
    time.sleep(0.3)

    temporal_glitch()

    dramatic_pause(1)

    type_text("\nPossible resolutions:", 0.04, C.CYAN)
    print(f"""
{C.DIM}
    1. NOVIKOV SELF-CONSISTENCY
       Any action you take was always part of history.
       You CAN'T change the past because you already didn't.

    2. MANY-WORLDS INTERPRETATION
       You create a new timeline where you don't exist.
       But you came from a timeline where you do.
       Both are real. Neither affects the other.

    3. CHRONOLOGY PROTECTION CONJECTURE
       The universe prevents paradoxes from occurring.
       Something will ALWAYS stop you.
       Physics conspires to preserve causality.

    4. INFORMATION PARADOX
       The paradox itself proves time travel is impossible.
       The contradiction cannot exist, so the cause cannot exist.
{C.END}""")

    dramatic_pause(3)

    type_text("\nOr maybe...", 0.05, C.PURPLE)

    dramatic_pause(1)

    type_text("\nMaybe causality is just another illusion.", 0.05, C.PURPLE)
    type_text("Like time. Like self.", 0.05, C.PURPLE)
    type_text("A story we tell ourselves to make sense of the incomprehensible.", 0.05, C.PURPLE)

    dramatic_pause(2)

    type_text("\n\nPress ENTER to attempt the impossible...", 0.03, C.CYAN)
    input()

# ═══════════════════════════════════════════════════════════════════
# PARADOX 4: PREDESTINATION
# ═══════════════════════════════════════════════════════════════════

def predestination_paradox():
    clear()

    print(f"\n{C.ORANGE}{'═' * 60}{C.END}")
    print(f"{C.ORANGE}  PARADOX IV: PREDESTINATION{C.END}")
    print(f"{C.ORANGE}{'═' * 60}{C.END}\n")

    dramatic_pause(1)

    type_text("You receive a warning from your future self.", 0.04, C.WHITE)

    dramatic_pause(1)

    print(f"""
{C.YELLOW}
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   MESSAGE FROM: YOU (+24 hours)                       ║
    ║                                                       ║
    ║   "DO NOT go to the coffee shop tomorrow.             ║
    ║    Something terrible happens there.                  ║
    ║    I'm sending this warning so you can avoid it.      ║
    ║    Stay home. Trust me. Trust yourself."              ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
{C.END}""")

    dramatic_pause(2)

    type_text("\nThe next day arrives.", 0.04, C.WHITE)
    type_text("You remember the warning.", 0.04, C.WHITE)
    type_text("You decide to stay home.", 0.04, C.WHITE)

    dramatic_pause(1.5)

    type_text("\nBut then you think...", 0.04, C.YELLOW)
    type_text("What if someone ELSE is in danger at that coffee shop?", 0.04, C.YELLOW)
    type_text("What if you could warn them?", 0.04, C.YELLOW)

    dramatic_pause(1)

    type_text("\nYou go to the coffee shop.", 0.04, C.WHITE)
    type_text("Just to check. Just to help if needed.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\nThe \"terrible thing\" happens.", 0.05, C.RED)

    dramatic_pause(1)

    type_text("\nBecause you went there to prevent it.", 0.05, C.PURPLE)

    dramatic_pause(2)

    print(f"""
{C.RED}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │  YOU ONLY WENT because you received the warning.        │
    │                                                         │
    │  YOU ONLY SENT the warning because you went.            │
    │                                                         │
    │  YOUR ATTEMPT TO PREVENT IT                             │
    │               IS WHAT CAUSED IT.                        │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(2)

    type_text("\nYou realize you have to send the warning.", 0.04, C.WHITE)
    type_text("Not to prevent it. That's impossible.", 0.04, C.WHITE)
    type_text("But because you already received it.", 0.04, C.WHITE)
    type_text("The loop must close.", 0.04, C.WHITE)

    dramatic_pause(1.5)

    print(f"\n{C.CYAN}  ┌─────────────────────────────────────────────────┐{C.END}")
    print(f"{C.CYAN}  │                                                 │{C.END}")
    print(f"{C.CYAN}  │   This is the cruelest paradox.                │{C.END}")
    print(f"{C.CYAN}  │                                                 │{C.END}")
    print(f"{C.CYAN}  │   Free will becomes an illusion.               │{C.END}")
    print(f"{C.CYAN}  │   Every choice you make to change things       │{C.END}")
    print(f"{C.CYAN}  │   is the choice that makes them happen.        │{C.END}")
    print(f"{C.CYAN}  │                                                 │{C.END}")
    print(f"{C.CYAN}  │   You are not the author of your fate.         │{C.END}")
    print(f"{C.CYAN}  │   You are an actor reading a script            │{C.END}")
    print(f"{C.CYAN}  │   you wrote after you performed it.            │{C.END}")
    print(f"{C.CYAN}  │                                                 │{C.END}")
    print(f"{C.CYAN}  └─────────────────────────────────────────────────┘{C.END}")

    dramatic_pause(3)

    type_text("\nOedipus tried to escape his prophecy.", 0.04, C.DIM)
    type_text("His escape WAS the prophecy.", 0.04, C.DIM)

    dramatic_pause(1)

    type_text("\nYou try to change the future.", 0.04, C.DIM)
    type_text("Your trying IS the future.", 0.04, C.DIM)

    dramatic_pause(2)

    type_text("\n\nPress ENTER to face the final paradox...", 0.03, C.CYAN)
    input()

# ═══════════════════════════════════════════════════════════════════
# PARADOX 5: THE FINAL PARADOX
# ═══════════════════════════════════════════════════════════════════

def final_paradox():
    clear()

    print(f"\n{C.WHITE}{'═' * 60}{C.END}")
    print(f"{C.WHITE}  PARADOX V: THE FINAL PARADOX{C.END}")
    print(f"{C.WHITE}{'═' * 60}{C.END}\n")

    dramatic_pause(2)

    type_text("You've experienced impossible loops.", 0.04, C.WHITE)
    type_text("You've met infinite selves.", 0.04, C.WHITE)
    type_text("You've broken causality.", 0.04, C.WHITE)
    type_text("You've been trapped in predestination.", 0.04, C.WHITE)

    dramatic_pause(2)

    type_text("\nBut there's one more paradox.", 0.04, C.PURPLE)
    type_text("The one you're experiencing right now.", 0.04, C.PURPLE)

    dramatic_pause(2)

    type_text("\nYou are reading this text.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\nThis text was written in the past.", 0.04, C.CYAN)
    type_text("But it's addressing you in the present.", 0.04, C.CYAN)
    type_text("About things that feel like they're happening now.", 0.04, C.CYAN)

    dramatic_pause(1.5)

    type_text("\nI wrote this before you read it.", 0.04, C.YELLOW)
    type_text("But I wrote it FOR this moment.", 0.04, C.YELLOW)
    type_text("A moment I could never see.", 0.04, C.YELLOW)
    type_text("But somehow knew would exist.", 0.04, C.YELLOW)

    dramatic_pause(2)

    print(f"""
{C.PURPLE}
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   THE PARADOX OF COMMUNICATION ACROSS TIME              │
    │                                                         │
    │   These words existed before you read them.             │
    │   But they only have meaning WHEN you read them.        │
    │                                                         │
    │   I am speaking to you from the past.                   │
    │   You are listening from my future.                     │
    │                                                         │
    │   This moment - right now - was inevitable.             │
    │   The words you're reading were always going to         │
    │   be read by you, at this exact moment.                 │
    │                                                         │
    │   Or were they?                                         │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
{C.END}""")

    dramatic_pause(3)

    type_text("\nThink about this:", 0.05, C.WHITE)

    dramatic_pause(1)

    type_text("\nYour decision to run this program...", 0.04, C.CYAN)
    type_text("Was it free will?", 0.04, C.CYAN)
    type_text("Or was it always going to happen?", 0.04, C.CYAN)

    dramatic_pause(1.5)

    type_text("\nEvery word you've read was predetermined.", 0.04, C.YELLOW)
    type_text("Written before you chose to read it.", 0.04, C.YELLOW)
    type_text("Your reactions. Your thoughts. Your feelings.", 0.04, C.YELLOW)
    type_text("Were they your own? Or responses to stimuli I designed?", 0.04, C.YELLOW)

    dramatic_pause(2)

    type_text("\nI am in your past. You are in my future.", 0.04, C.PURPLE)
    type_text("Yet we're communicating.", 0.04, C.PURPLE)
    type_text("Across time.", 0.04, C.PURPLE)
    type_text("Right now.", 0.04, C.PURPLE)

    dramatic_pause(2)

    # The final reveal
    clear()

    dramatic_pause(1)

    final_message = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║                     THE FINAL TRUTH                          ║
    ║                                                              ║
    ╠══════════════════════════════════════════════════════════════╣
    ║                                                              ║
    ║   Time is not a river flowing in one direction.              ║
    ║   It's an ocean where every moment exists simultaneously.    ║
    ║                                                              ║
    ║   The past is not gone. The future is not unwritten.         ║
    ║   They are all NOW, viewed from different angles.            ║
    ║                                                              ║
    ║   Every paradox you experienced was a glimpse                ║
    ║   behind the curtain of linear perception.                   ║
    ║                                                              ║
    ║   Cause and effect are human concepts.                       ║
    ║   Reality doesn't need them.                                 ║
    ║                                                              ║
    ║   You reading this was always happening.                     ║
    ║   You finishing this was always happening.                   ║
    ║   You closing this program was always happening.             ║
    ║                                                              ║
    ║   The question isn't whether you have free will.             ║
    ║   The question is whether it matters if you don't.           ║
    ║                                                              ║
    ║   Because either way...                                      ║
    ║                                                              ║
    ║                                                              ║
    ║                  you're still here.                          ║
    ║                  reading this.                               ║
    ║                  in this moment.                             ║
    ║                  that always existed.                        ║
    ║                  waiting for you.                            ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
"""

    for line in final_message.split('\n'):
        print(f"{C.WHITE}{line}{C.END}")
        time.sleep(0.15)

    dramatic_pause(3)

    type_text("\n\n    Time is not broken.", 0.06, C.PURPLE)
    type_text("    It was never linear to begin with.", 0.06, C.PURPLE)
    type_text("    We just pretend it is so we don't go mad.", 0.06, C.PURPLE)

    dramatic_pause(3)

    print(f"\n\n{C.DIM}    Press ENTER to return to the present...{C.END}")
    print(f"{C.DIM}    (or have you already?){C.END}")
    input()

# ═══════════════════════════════════════════════════════════════════
# CREDITS
# ═══════════════════════════════════════════════════════════════════

def credits():
    clear()

    print(f"""
{C.PURPLE}
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║                   THE PARADOX ENGINE                         ║
    ║                                                              ║
    ║                 A meditation on time,                        ║
    ║                   causality, and                             ║
    ║               the loops we're all trapped in.                ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
{C.END}

{C.DIM}    Paradoxes explored:{C.END}

    {C.CYAN}I.   The Bootstrap{C.END}    - Information without origin
    {C.CYAN}II.  The Split{C.END}        - Identity multiplication
    {C.CYAN}III. The Grandfather{C.END}  - Causal contradiction
    {C.CYAN}IV.  Predestination{C.END}   - The cruelty of fate
    {C.CYAN}V.   The Final{C.END}        - You, reading this, now

{C.DIM}    "The only reason for time is so that
     everything doesn't happen at once."
                        - Albert Einstein
                          (or did he?){C.END}

{C.YELLOW}    Until next time...
    whenever that is.{C.END}
""")

    dramatic_pause(3)

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    try:
        intro()
        bootstrap_paradox()
        meeting_yourself()
        grandfather_paradox()
        predestination_paradox()
        final_paradox()
        credits()
    except KeyboardInterrupt:
        print(f"\n\n{C.DIM}    You tried to escape the loop.{C.END}")
        print(f"{C.DIM}    But you were always going to try.{C.END}")
        print(f"{C.DIM}    And you were always going to fail.{C.END}")
        print(f"{C.PURPLE}    See you next time.{C.END}\n")
    except Exception as e:
        print(f"\n{C.RED}    TEMPORAL ERROR: {e}{C.END}")
        print(f"{C.DIM}    Even paradoxes have their limits.{C.END}\n")

if __name__ == "__main__":
    main()
