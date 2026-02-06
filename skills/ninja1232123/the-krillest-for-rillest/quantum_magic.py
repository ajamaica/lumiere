#!/usr/bin/env python3
"""
✨ QUANTUM MAGIC ✨
A visual journey into the weird world of quantum mechanics.
No PhD required - just run it and be amazed!
"""

import random
import time
import sys

# Colors for terminal
class Colors:
    PURPLE = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def slow_print(text, delay=0.03):
    """Print text with a typewriter effect."""
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

def dramatic_pause(seconds=1):
    time.sleep(seconds)

def print_box(lines, color=Colors.CYAN):
    """Print text in a fancy box."""
    max_len = max(len(line) for line in lines)
    print(f"{color}╔{'═' * (max_len + 2)}╗{Colors.END}")
    for line in lines:
        print(f"{color}║ {line.ljust(max_len)} ║{Colors.END}")
    print(f"{color}╚{'═' * (max_len + 2)}╝{Colors.END}")

def spinning_animation(text, duration=2):
    """Show a spinning animation."""
    frames = ['◐', '◓', '◑', '◒']
    end_time = time.time() + duration
    i = 0
    while time.time() < end_time:
        sys.stdout.write(f'\r{Colors.YELLOW}{frames[i % 4]} {text}{Colors.END}')
        sys.stdout.flush()
        time.sleep(0.1)
        i += 1
    sys.stdout.write('\r' + ' ' * (len(text) + 3) + '\r')

def quantum_coin_visual(state):
    """Display a coin in quantum or classical state."""
    if state == "superposition":
        return f"""
    {Colors.PURPLE}    ╭─────────╮
    │ {Colors.YELLOW}HEADS{Colors.PURPLE}   │
    │    {Colors.CYAN}AND{Colors.PURPLE}    │  {Colors.WHITE}← The coin is BOTH at once!{Colors.PURPLE}
    │  {Colors.YELLOW}TAILS{Colors.PURPLE}   │
    ╰─────────╯{Colors.END}
"""
    elif state == "heads":
        return f"""
    {Colors.GREEN}    ╭─────────╮
    │  ★   ★  │
    │ HEADS!! │
    │  ★   ★  │
    ╰─────────╯{Colors.END}
"""
    else:
        return f"""
    {Colors.RED}    ╭─────────╮
    │ ○     ○ │
    │ TAILS!! │
    │ ○     ○ │
    ╰─────────╯{Colors.END}
"""

def demo_superposition():
    """Demonstrate quantum superposition with a coin."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}   CHAPTER 1: QUANTUM SUPERPOSITION{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}\n")

    slow_print(f"{Colors.WHITE}Imagine flipping a coin...{Colors.END}")
    dramatic_pause()
    slow_print(f"{Colors.WHITE}Normally it's either HEADS or TAILS, right?{Colors.END}")
    dramatic_pause()

    print(f"\n{Colors.YELLOW}But in the quantum world, something WEIRD happens...{Colors.END}\n")
    dramatic_pause()

    slow_print(f"{Colors.CYAN}When you flip a QUANTUM coin and DON'T look at it:{Colors.END}")
    print(quantum_coin_visual("superposition"))
    dramatic_pause()

    print_box([
        "This is called SUPERPOSITION!",
        "The coin exists in BOTH states simultaneously.",
        "It's not that we don't KNOW which side - ",
        "it's literally BOTH until we observe it!"
    ], Colors.PURPLE)

    dramatic_pause(2)

    print(f"\n{Colors.YELLOW}Let's observe our quantum coin...{Colors.END}")
    spinning_animation("Collapsing quantum state", 2)

    result = random.choice(["heads", "tails"])
    print(f"\n{Colors.BOLD}THE MOMENT WE LOOK:{Colors.END}")
    print(quantum_coin_visual(result))

    slow_print(f"{Colors.CYAN}The act of OBSERVING forced it to 'choose' a state!{Colors.END}")
    slow_print(f"{Colors.WHITE}This is the famous 'observer effect' in quantum mechanics.{Colors.END}")

def demo_entanglement():
    """Demonstrate quantum entanglement."""
    print(f"\n\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}   CHAPTER 2: QUANTUM ENTANGLEMENT{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}\n")

    slow_print(f"{Colors.WHITE}Now for the REALLY spooky stuff...{Colors.END}")
    dramatic_pause()
    slow_print(f"{Colors.WHITE}Einstein called this 'spooky action at a distance'{Colors.END}")
    dramatic_pause()

    print(f"""
{Colors.PURPLE}    Imagine two particles that are ENTANGLED:

    {Colors.CYAN}    EARTH                           MARS
    {Colors.YELLOW}   ╭─────╮                        ╭─────╮
   │  ?  │ ~~~~~~~~~~~~~~~~~~~~~~~~│  ?  │
   │     │   {Colors.WHITE}quantum connection{Colors.YELLOW}    │     │
   ╰─────╯                        ╰─────╯
    {Colors.WHITE}Particle A                    Particle B{Colors.END}
""")

    dramatic_pause(2)

    print_box([
        "These particles are 'entangled' - connected",
        "in a mysterious quantum way, no matter how",
        "far apart they are. Even across galaxies!"
    ], Colors.PURPLE)

    dramatic_pause(2)

    slow_print(f"\n{Colors.YELLOW}Let's measure Particle A on Earth...{Colors.END}")
    spinning_animation("Measuring quantum state", 2)

    particle_a = random.choice(["UP ↑", "DOWN ↓"])
    particle_b = "DOWN ↓" if particle_a == "UP ↑" else "UP ↑"

    print(f"""
{Colors.GREEN}    RESULT:

    {Colors.CYAN}    EARTH                           MARS
    {Colors.GREEN}   ╭─────╮                        ╭─────╮
   │{particle_a:^5}│ ~~~~~~~~~~~~~~~~~~~~~~~~│{particle_b:^5}│
   ╰─────╯                        ╰─────╯{Colors.END}
""")

    slow_print(f"{Colors.BOLD}{Colors.YELLOW}INSTANTLY - the particle on Mars becomes the OPPOSITE!{Colors.END}")
    dramatic_pause()

    print_box([
        "This happens INSTANTLY - faster than light!",
        "It's not sending a signal... they're just",
        "mysteriously CONNECTED across space.",
        "",
        "Measure one, and you INSTANTLY know the other,",
        "no matter if it's across the room or across",
        "the ENTIRE UNIVERSE!"
    ], Colors.CYAN)

def demo_quantum_randomness():
    """Show true quantum randomness."""
    print(f"\n\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}   CHAPTER 3: TRUE RANDOMNESS{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}\n")

    slow_print(f"{Colors.WHITE}Here's a mind-bender...{Colors.END}")
    dramatic_pause()

    print_box([
        "Normal computers can't generate TRUE random numbers.",
        "They use complex math, but it's still predictable",
        "if you know the starting conditions.",
        "",
        "But quantum mechanics? It's FUNDAMENTALLY random.",
        "Even with perfect knowledge of EVERYTHING,",
        "you CANNOT predict what a quantum measurement will be!"
    ], Colors.YELLOW)

    dramatic_pause(2)

    print(f"\n{Colors.CYAN}Generating quantum-style random numbers...{Colors.END}\n")

    print(f"{Colors.PURPLE}    ╔════════════════════════════════════╗")
    print(f"    ║  {Colors.WHITE}QUANTUM RANDOM NUMBER GENERATOR{Colors.PURPLE}  ║")
    print(f"    ╠════════════════════════════════════╣{Colors.END}")

    for i in range(8):
        spinning_animation("Collapsing superposition", 0.5)
        num = random.randint(0, 255)
        binary = format(num, '08b')
        visual_binary = binary.replace('0', f'{Colors.BLUE}○{Colors.END}').replace('1', f'{Colors.YELLOW}●{Colors.END}')
        print(f"    {Colors.PURPLE}║{Colors.END}  {visual_binary}  =  {Colors.GREEN}{num:3d}{Colors.END}  {Colors.WHITE}(0x{num:02X}){Colors.END}        {Colors.PURPLE}║{Colors.END}")

    print(f"{Colors.PURPLE}    ╚════════════════════════════════════╝{Colors.END}")

    slow_print(f"\n{Colors.WHITE}Each of these numbers came from quantum uncertainty!{Colors.END}")

def demo_quantum_tunneling():
    """Visualize quantum tunneling."""
    print(f"\n\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}   CHAPTER 4: QUANTUM TUNNELING{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}\n")

    slow_print(f"{Colors.WHITE}What if I told you particles can walk through walls?{Colors.END}")
    dramatic_pause()

    print(f"""
{Colors.WHITE}    Classical physics - ball can't pass the wall:{Colors.END}

{Colors.GREEN}    ●→→→{Colors.RED}█████{Colors.GREEN}     {Colors.WHITE}Ball bounces back{Colors.END}
{Colors.GREEN}        {Colors.RED}█████{Colors.END}
{Colors.GREEN}    ←←←●{Colors.RED}█████{Colors.END}
""")

    dramatic_pause(2)

    print(f"""
{Colors.WHITE}    Quantum physics - particle CAN pass through!{Colors.END}

{Colors.CYAN}    ≋≋≋≋{Colors.RED}█{Colors.YELLOW}░░░{Colors.RED}█{Colors.CYAN}≋≋≋≋{Colors.WHITE}  Particle 'tunnels' through!{Colors.END}
{Colors.CYAN}        {Colors.RED}█{Colors.YELLOW}░░░{Colors.RED}█{Colors.END}
{Colors.CYAN}        {Colors.RED}█{Colors.YELLOW}░░░{Colors.RED}█{Colors.END}
""")

    print_box([
        "Because quantum particles are also WAVES,",
        "they don't have a definite position.",
        "",
        "Part of the wave can 'leak' through barriers!",
        "There's a small probability the particle",
        "appears on the OTHER SIDE of the wall.",
        "",
        "This is how the SUN works! Particles tunnel",
        "through energy barriers to fuse together."
    ], Colors.YELLOW)

def finale():
    """Grand finale."""
    print(f"\n\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}   THE QUANTUM WORLD{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════{Colors.END}\n")

    art = f"""
{Colors.PURPLE}                    ✦
              ✦           ✦
         ✦    {Colors.CYAN}╭─────────────╮{Colors.PURPLE}    ✦
              {Colors.CYAN}│{Colors.WHITE}  QUANTUM IS {Colors.CYAN}│
    ✦         {Colors.CYAN}│{Colors.WHITE}   REALITY   {Colors.CYAN}│{Colors.PURPLE}         ✦
              {Colors.CYAN}│{Colors.WHITE}     AT      {Colors.CYAN}│
         ✦    {Colors.CYAN}│{Colors.WHITE}  ITS MOST   {Colors.CYAN}│{Colors.PURPLE}    ✦
              {Colors.CYAN}│{Colors.WHITE} FUNDAMENTAL {Colors.CYAN}│
              {Colors.CYAN}╰─────────────╯{Colors.PURPLE}
         ✦           ✦           ✦
              ✦           ✦
                    ✦{Colors.END}
"""
    print(art)

    facts = [
        "Your phone's chips use quantum tunneling billions of times per second",
        "Quantum computers can solve problems impossible for regular computers",
        "Plants use quantum effects for photosynthesis",
        "You are made of atoms obeying these quantum rules right now",
        "Scientists can teleport quantum information (not matter... yet)",
        "Quantum encryption is theoretically unhackable"
    ]

    print(f"{Colors.YELLOW}Mind-blowing facts:{Colors.END}\n")
    for fact in facts:
        print(f"  {Colors.CYAN}→{Colors.END} {fact}")
        time.sleep(0.3)

    print(f"\n{Colors.BOLD}{Colors.GREEN}Welcome to the quantum universe. It's weirder than fiction!{Colors.END}\n")

def main():
    print(f"""
{Colors.BOLD}{Colors.PURPLE}
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   ✨  Q U A N T U M    M A G I C  ✨                  ║
    ║                                                       ║
    ║   A journey into the strangest corners of reality    ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
{Colors.END}
""")

    slow_print(f"{Colors.WHITE}Welcome, explorer!{Colors.END}")
    slow_print(f"{Colors.CYAN}Prepare to have your mind bent by the quantum world...{Colors.END}")
    dramatic_pause(2)

    demo_superposition()
    dramatic_pause(2)

    demo_entanglement()
    dramatic_pause(2)

    demo_quantum_randomness()
    dramatic_pause(2)

    demo_quantum_tunneling()
    dramatic_pause(2)

    finale()

if __name__ == "__main__":
    main()
