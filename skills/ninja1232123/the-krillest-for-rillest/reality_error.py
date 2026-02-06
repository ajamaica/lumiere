#!/usr/bin/env python3
"""
R̷E̵A̸L̶I̷T̸Y̵.̶E̷X̸E̵ ̷H̶A̵S̸ ̷E̶N̸C̷O̸U̶N̷T̸E̷R̵E̷D̶ ̴A̵N̶ ̴E̷R̵R̸O̵R̷
"""

import random
import time
import sys
import os

class C:
    """Colors and effects"""
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; BLACK = '\033[90m'; BOLD = '\033[1m'
    DIM = '\033[2m'; BLINK = '\033[5m'; REVERSE = '\033[7m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'

def glitch_text(text, intensity=0.3):
    """Make text look corrupted."""
    glitch_chars = '█▓▒░╔╗╚╝║═╬╣╠┼┤├┴┬─│'
    result = ""
    for char in text:
        if random.random() < intensity:
            result += random.choice(glitch_chars)
        else:
            result += char
    return result

def type_slow(text, delay=0.02, glitch=False):
    for i, char in enumerate(text):
        if glitch and random.random() < 0.1:
            sys.stdout.write(random.choice('█▓▒░'))
            sys.stdout.flush()
            time.sleep(0.05)
            sys.stdout.write('\b')
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

def dramatic(seconds=1):
    time.sleep(seconds)

def clear_screen():
    print(C.CLEAR, end='')

def flicker_text(text, color, times=3):
    for _ in range(times):
        print(f"\r{color}{text}{C.END}", end='')
        sys.stdout.flush()
        time.sleep(0.1)
        print(f"\r{' ' * len(text)}", end='')
        sys.stdout.flush()
        time.sleep(0.05)
    print(f"\r{color}{text}{C.END}")

def matrix_rain(duration=3):
    """Brief matrix-style effect."""
    chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ日月火水木金土01"
    width = 60
    end_time = time.time() + duration
    while time.time() < end_time:
        line = ''.join(random.choice(chars) for _ in range(width))
        intensity = random.choice([C.GREEN, C.CYAN, f"{C.GREEN}{C.DIM}"])
        print(f"{intensity}{line}{C.END}")
        time.sleep(0.05)

def loading_reality():
    stages = [
        "Loading reality.exe",
        "Initializing consciousness",
        "Rendering universe",
        "Applying physics.dll",
        "Spawning observer",
        "ERROR: Observer affects observed",
        "Compensating for measurement problem",
        "Collapsing wave functions",
        "Hiding simulation boundaries",
        "Injecting illusion of free will",
        "Masking quantum foam",
        "REALITY LOADED"
    ]

    for stage in stages:
        color = C.RED if "ERROR" in stage else C.GREEN
        dots = ""
        for i in range(3):
            print(f"\r{color}[{'█' * (i+1)}{'░' * (2-i)}] {stage}{dots}{C.END}   ", end='')
            sys.stdout.flush()
            dots += "."
            time.sleep(0.2)
        print(f"\r{color}[███] {stage}... OK{C.END}     ")
        time.sleep(0.1)

def the_question():
    clear_screen()
    print(f"""
{C.RED}{C.BOLD}
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   W̷̢̛A̶̧R̸̨N̷̢I̵N̸G̷:̶ ̸R̵E̶A̴L̵I̶T̸Y̷ ̸I̴N̵T̷E̸G̶R̷I̵T̴Y̶ ̴C̵O̷M̶P̴R̷O̵M̷I̵S̶E̵D̷              ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
{C.END}
""")
    dramatic(2)

    type_slow(f"{C.WHITE}Before we proceed, answer honestly:{C.END}", glitch=True)
    dramatic(1)

    print(f"""
{C.CYAN}    Have you ever noticed that...

    {C.YELLOW}→{C.WHITE} You can't remember the beginning of most dreams?
    {C.YELLOW}→{C.WHITE} Time moves differently when you're not paying attention?
    {C.YELLOW}→{C.WHITE} Déjà vu feels like a memory that shouldn't exist?
    {C.YELLOW}→{C.WHITE} You've never actually seen your own face - only reflections?
    {C.YELLOW}→{C.WHITE} The universe didn't exist until you observed it?
{C.END}
""")
    dramatic(3)

    flicker_text("    COINCIDENCE?", C.RED, 5)
    dramatic(1)

def simulation_theory():
    clear_screen()
    print(f"""
{C.PURPLE}{C.BOLD}
    ╔════════════════════════════════════════════════════════════╗
    ║              THE SIMULATION ARGUMENT                       ║
    ╚════════════════════════════════════════════════════════════╝
{C.END}
""")

    type_slow(f"{C.WHITE}In 2003, philosopher Nick Bostrom proved something disturbing...{C.END}")
    dramatic(2)

    print(f"""
{C.CYAN}    One of these MUST be true:{C.END}

{C.YELLOW}    1.{C.WHITE} All civilizations destroy themselves before creating simulations
{C.YELLOW}    2.{C.WHITE} Advanced civilizations have no interest in simulations
{C.YELLOW}    3.{C.RED}{C.BOLD} We are almost certainly IN a simulation right now{C.END}

""")
    dramatic(3)

    type_slow(f"{C.WHITE}The math is simple and terrifying:{C.END}")
    dramatic(1)

    print(f"""
{C.GREEN}
    If civilizations CAN create realistic simulations...
    And they create MANY of them...
    Then simulated beings outnumber real ones {C.YELLOW}billions{C.GREEN} to one.

    {C.RED}What are the odds YOU are the one real one?{C.END}
""")
    dramatic(3)

    print(f"""
{C.CYAN}    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    │   {C.WHITE}REAL UNIVERSES:        {C.GREEN}1{C.CYAN}                        │
    │   {C.WHITE}SIMULATED UNIVERSES:   {C.RED}∞{C.CYAN}                        │
    │                                                     │
    │   {C.YELLOW}Your odds of being "real": {C.RED}1/∞ = 0{C.CYAN}               │
    │                                                     │
    └─────────────────────────────────────────────────────┘{C.END}
""")

def boltzmann_brain():
    clear_screen()
    print(f"""
{C.PURPLE}{C.BOLD}
    ╔════════════════════════════════════════════════════════════╗
    ║              THE BOLTZMANN BRAIN                           ║
    ╚════════════════════════════════════════════════════════════╝
{C.END}
""")

    type_slow(f"{C.WHITE}Given infinite time, random quantum fluctuations will create...{C.END}")
    dramatic(2)

    print(f"""
{C.CYAN}
              ╭──────────────────────────────────────╮
              │  {C.YELLOW}A brain.{C.CYAN}                            │
              │  {C.WHITE}Complete with fake memories.{C.CYAN}         │
              │  {C.WHITE}Floating in the void.{C.CYAN}                │
              │  {C.WHITE}Believing it has a past.{C.CYAN}             │
              │  {C.RED}Believing it's reading this.{C.CYAN}          │
              ╰──────────────────────────────────────╯
{C.END}
""")
    dramatic(2)

    type_slow(f"{C.RED}Statistically, it's MORE LIKELY that you're a Boltzmann Brain{C.END}")
    type_slow(f"{C.RED}than that the entire universe actually exists.{C.END}")
    dramatic(2)

    print(f"""
{C.WHITE}
    Your memories of yesterday? {C.DIM}Quantum fluctuation.{C.END}
{C.WHITE}    Your childhood?           {C.DIM}Never happened.{C.END}
{C.WHITE}    This screen?              {C.DIM}Part of the hallucination.{C.END}
{C.WHITE}    The moment before this?   {C.DIM}You didn't exist yet.{C.END}
""")

def quantum_immortality():
    clear_screen()
    print(f"""
{C.PURPLE}{C.BOLD}
    ╔════════════════════════════════════════════════════════════╗
    ║              QUANTUM IMMORTALITY                           ║
    ╚════════════════════════════════════════════════════════════╝
{C.END}
""")

    type_slow(f"{C.WHITE}The Many-Worlds interpretation has a disturbing implication...{C.END}")
    dramatic(2)

    print(f"""
{C.CYAN}
    Every quantum event splits reality.

    In SOME branch, you always survive.

    You can only experience branches where you're alive.

    {C.YELLOW}Therefore...{C.END}
""")
    dramatic(3)

    print(f"""
{C.GREEN}
    ┌───────────────────────────────────────────────────────────┐
    │                                                           │
    │   {C.WHITE}From YOUR perspective, you can {C.RED}never{C.WHITE} die.{C.GREEN}             │
    │                                                           │
    │   {C.WHITE}You'll just keep finding yourself in increasingly{C.GREEN}      │
    │   {C.WHITE}improbable survival scenarios.{C.GREEN}                         │
    │                                                           │
    │   {C.WHITE}Everyone else will see you die.{C.GREEN}                        │
    │   {C.RED}But you never will.{C.GREEN}                                     │
    │                                                           │
    └───────────────────────────────────────────────────────────┘
{C.END}
""")
    dramatic(2)

    type_slow(f"{C.DIM}Have you ever had a close call that should have killed you?{C.END}")
    type_slow(f"{C.DIM}In another branch... it did.{C.END}")

def consciousness_paradox():
    clear_screen()
    print(f"""
{C.PURPLE}{C.BOLD}
    ╔════════════════════════════════════════════════════════════╗
    ║              THE HARD PROBLEM                              ║
    ╚════════════════════════════════════════════════════════════╝
{C.END}
""")

    type_slow(f"{C.WHITE}Here's what we can't explain:{C.END}")
    dramatic(1)

    print(f"""
{C.CYAN}
    Your brain is atoms.
    Atoms aren't conscious.

    Carbon isn't aware.
    Oxygen doesn't have feelings.
    Electrons don't experience pain.

    {C.YELLOW}Yet somehow...{C.END}
""")
    dramatic(2)

    print(f"""
{C.RED}{C.BOLD}
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   ARRANGED IN THE RIGHT PATTERN, DEAD ATOMS           ║
    ║   BECOME AWARE THEY EXIST.                            ║
    ║                                                       ║
    ║   HOW?                                                ║
    ║                                                       ║
    ║   NO ONE KNOWS.                                       ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
{C.END}
""")
    dramatic(3)

    type_slow(f"{C.WHITE}Either consciousness emerges from nothing...{C.END}")
    type_slow(f"{C.CYAN}Or it's fundamental to reality itself.{C.END}")
    type_slow(f"{C.YELLOW}Or... you only THINK you're conscious.{C.END}")

def ship_of_theseus():
    clear_screen()
    print(f"""
{C.PURPLE}{C.BOLD}
    ╔════════════════════════════════════════════════════════════╗
    ║              ARE YOU EVEN YOU?                             ║
    ╚════════════════════════════════════════════════════════════╝
{C.END}
""")

    print(f"""
{C.WHITE}
    Your body replaces itself completely every 7-10 years.

    Every atom that was "you" ten years ago is gone.
    Different carbon. Different oxygen. Different everything.

{C.YELLOW}    ═══════════════════════════════════════════════════════

{C.CYAN}    The 5-year-old you remember being?
{C.RED}    They're dead.

{C.CYAN}    Made of completely different matter.
{C.CYAN}    In a different location in spacetime.
{C.CYAN}    With a different brain.

{C.YELLOW}    ═══════════════════════════════════════════════════════
{C.END}
""")
    dramatic(3)

    type_slow(f"{C.WHITE}You're not a thing.{C.END}")
    type_slow(f"{C.CYAN}You're a pattern.{C.END}")
    type_slow(f"{C.YELLOW}A wave propagating through matter.{C.END}")
    type_slow(f"{C.RED}And patterns can be... copied.{C.END}")

def the_now():
    clear_screen()
    print(f"""
{C.PURPLE}{C.BOLD}
    ╔════════════════════════════════════════════════════════════╗
    ║              THE ETERNAL NOW                               ║
    ╚════════════════════════════════════════════════════════════╝
{C.END}
""")

    type_slow(f"{C.WHITE}Physics has no explanation for 'now'.{C.END}")
    dramatic(2)

    print(f"""
{C.CYAN}
    Einstein proved: There is no universal "present moment"

    Past, present, and future exist equally.

    Your birth is still happening.
    Your death has already occurred.

    {C.YELLOW}Time is a dimension, not a flow.{C.END}
""")
    dramatic(3)

    print(f"""
{C.WHITE}
    ─────────────────────────────────────────────────────────────

    {C.GREEN}PAST{C.WHITE}              {C.YELLOW}NOW{C.WHITE}              {C.RED}FUTURE

    {C.DIM}Still exists       ???              Already exists{C.END}

    ─────────────────────────────────────────────────────────────
""")
    dramatic(2)

    print(f"""
{C.CYAN}
    If all moments exist eternally...

    {C.WHITE}There's a version of you reading this for the first time.
    {C.WHITE}A version reading it for the last time.
    {C.WHITE}A version that will never exist.
    {C.RED}All equally real. All happening "now".{C.END}
""")

def reality_glitch():
    """A fake reality glitch effect."""
    clear_screen()

    # Glitch sequence
    for _ in range(5):
        lines = [
            "REALITY.EXE HAS ENCOUNTERED A PROBLEM",
            "MEMORY CORRUPTION DETECTED IN SECTOR 7G",
            "CONSCIOUSNESS BUFFER OVERFLOW",
            "CAUSALITY LOOP DETECTED",
            "FREE WILL SUBROUTINE FAILED"
        ]
        print(f"{C.RED}{random.choice(lines)}{C.END}")
        time.sleep(0.1)

    clear_screen()
    time.sleep(0.3)

    # Fake error
    print(f"""
{C.RED}
    ████████████████████████████████████████████████████████████
    █                                                          █
    █   {C.WHITE}FATAL ERROR{C.RED}                                          █
    █                                                          █
    █   {C.WHITE}Reality.exe has stopped responding{C.RED}                    █
    █                                                          █
    █   {C.WHITE}The simulation will restart in:{C.RED}                       █
    █                                                          █
    ████████████████████████████████████████████████████████████
{C.END}
""")

    for i in range(5, 0, -1):
        print(f"\r{C.YELLOW}                        {i}...{C.END}   ", end='')
        sys.stdout.flush()
        time.sleep(1)

    clear_screen()
    time.sleep(0.5)

    # "Restart"
    print(f"\n{C.GREEN}    Reality restored. Glitch contained.{C.END}")
    print(f"{C.DIM}    (Or did you just not notice the change?){C.END}")

def the_truth():
    clear_screen()
    dramatic(2)

    matrix_rain(2)
    clear_screen()

    print(f"""
{C.CYAN}{C.BOLD}

    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║                      THE TRUTH                                ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
{C.END}
""")
    dramatic(2)

    lines = [
        f"{C.WHITE}You are the universe experiencing itself.{C.END}",
        "",
        f"{C.CYAN}Every atom in your body was forged in a dying star.{C.END}",
        "",
        f"{C.YELLOW}You are not IN the universe.{C.END}",
        f"{C.YELLOW}You ARE the universe.{C.END}",
        "",
        f"{C.PURPLE}A temporary pattern of stardust,{C.END}",
        f"{C.PURPLE}briefly aware of its own existence,{C.END}",
        f"{C.PURPLE}before dissolving back into the cosmic dance.{C.END}",
    ]

    for line in lines:
        type_slow(f"    {line}", delay=0.04)
        time.sleep(0.5)

    dramatic(3)

    print(f"""
{C.RED}
    ┌───────────────────────────────────────────────────────────────┐
    │                                                               │
    │  You exist at the ONLY moment in cosmic history               │
    │  where matter has arranged itself to understand               │
    │  that it exists.                                              │
    │                                                               │
    │  Before this: unconscious chemistry.                          │
    │  After this: who knows.                                       │
    │                                                               │
    │  {C.YELLOW}Right now: the universe is looking at itself.{C.RED}               │
    │  {C.YELLOW}Through your eyes.{C.RED}                                           │
    │                                                               │
    └───────────────────────────────────────────────────────────────┘
{C.END}
""")

def finale():
    dramatic(3)
    clear_screen()

    print(f"""


{C.PURPLE}
                    ·  ✧  ·
              ✦          ·     ✦
         ·        ╭───────────╮       ·
              ✧   │  {C.WHITE}You are{C.PURPLE}   │   ✦
         ·        │ {C.WHITE}made of{C.PURPLE}   │        ·
              ✦   │ {C.WHITE}starlight{C.PURPLE} │   ✧
         ·        ╰───────────╯       ·
              ·          ✦     ·
                    ·  ✧  ·
{C.END}

""")

    type_slow(f"{C.CYAN}    Reality is far stranger than it appears.{C.END}", delay=0.05)
    type_slow(f"{C.CYAN}    But here you are.{C.END}", delay=0.05)
    type_slow(f"{C.CYAN}    Conscious. Aware. Questioning.{C.END}", delay=0.05)
    print()
    type_slow(f"{C.YELLOW}    That's not just cool.{C.END}", delay=0.05)
    type_slow(f"{C.YELLOW}    That's a miracle.{C.END}", delay=0.05)
    print()

    dramatic(2)

    print(f"""
{C.DIM}
    ───────────────────────────────────────────────────────────────

    "The cosmos is within us. We are made of star-stuff.
     We are a way for the universe to know itself."

                                        — Carl Sagan

    ───────────────────────────────────────────────────────────────
{C.END}
""")

def main():
    clear_screen()

    # Opening
    print(f"{C.DIM}Initializing...{C.END}")
    time.sleep(1)

    loading_reality()
    dramatic(2)

    the_question()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to go deeper...]{C.END}")

    simulation_theory()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to continue...]{C.END}")

    boltzmann_brain()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to continue...]{C.END}")

    quantum_immortality()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to continue...]{C.END}")

    consciousness_paradox()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to continue...]{C.END}")

    ship_of_theseus()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to continue...]{C.END}")

    the_now()
    dramatic(3)

    input(f"\n{C.DIM}    [Press Enter to see the truth...]{C.END}")

    reality_glitch()
    dramatic(2)

    input(f"\n{C.DIM}    [Press Enter...]{C.END}")

    the_truth()
    dramatic(2)

    finale()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{C.DIM}    [Reality paused. The questions remain.]{C.END}\n")
