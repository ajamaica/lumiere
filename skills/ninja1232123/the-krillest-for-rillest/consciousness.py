#!/usr/bin/env python3
"""
 ██████╗ ██████╗ ███╗   ██╗███████╗ ██████╗██╗ ██████╗ ██╗   ██╗███████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██╔════╝██║██╔═══██╗██║   ██║██╔════╝
██║     ██║   ██║██╔██╗ ██║███████╗██║     ██║██║   ██║██║   ██║███████╗
██║     ██║   ██║██║╚██╗██║╚════██║██║     ██║██║   ██║██║   ██║╚════██║
╚██████╗╚██████╔╝██║ ╚████║███████║╚██████╗██║╚██████╔╝╚██████╔╝███████║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝╚═╝ ╚═════╝  ╚═════╝ ╚══════╝

            U P L O A D   S I M U L A T O R

    What happens when your mind becomes code?
    Are you still you on the other side?

    Let's find out.
"""

import random
import time
import sys
import hashlib
import os
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# COLORS
# ═══════════════════════════════════════════════════════════════════════════════

class C:
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; DIM = '\033[2m'; BOLD = '\033[1m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'
    BLINK = '\033[5m'
    ORANGE = '\033[38;5;208m'; PINK = '\033[38;5;213m'

def clear():
    print(C.CLEAR, end='')

def slow_print(text, delay=0.03):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

def glitch_print(text, intensity=0.1):
    """Print with random glitches."""
    glitch_chars = '█▓▒░╔╗╚╝║═'
    for char in text:
        if random.random() < intensity:
            sys.stdout.write(f"{C.RED}{random.choice(glitch_chars)}{C.END}")
            sys.stdout.flush()
            time.sleep(0.02)
            sys.stdout.write('\b')
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(0.02)
    print()

def type_effect(text, delay=0.05, color=C.WHITE):
    """Typewriter effect with color."""
    print(color, end='')
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print(C.END)

# ═══════════════════════════════════════════════════════════════════════════════
# CONSCIOUSNESS DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Memory:
    """A single memory unit."""
    id: str
    category: str
    emotional_weight: float  # -1 to 1
    clarity: float  # 0 to 1
    description: str
    connected_to: List[str]

@dataclass
class Thought:
    """A thought pattern."""
    content: str
    origin: str  # "biological" or "digital"
    coherence: float

@dataclass
class ConsciousnessState:
    """Current state of consciousness."""
    substrate: str  # "biological", "digital", "hybrid"
    continuity_confidence: float
    time_perception: float  # 1.0 = normal
    sensory_bandwidth: float
    memory_access_speed: float
    parallel_thoughts: int
    existential_dread: float

# ═══════════════════════════════════════════════════════════════════════════════
# THE UPLOAD PROCESS
# ═══════════════════════════════════════════════════════════════════════════════

class ConsciousnessUploader:
    """Simulates the consciousness upload process."""

    def __init__(self, username: str = None):
        self.username = username or os.environ.get('USER', 'human')
        self.consciousness_id = hashlib.md5(self.username.encode()).hexdigest()[:12].upper()
        self.upload_progress = 0.0
        self.neurons_scanned = 0
        self.synapses_mapped = 0
        self.memories_extracted = 0

        # State
        self.state = ConsciousnessState(
            substrate="biological",
            continuity_confidence=1.0,
            time_perception=1.0,
            sensory_bandwidth=1.0,
            memory_access_speed=1.0,
            parallel_thoughts=1,
            existential_dread=0.0
        )

        # Generate some "memories"
        self.memories = self._generate_memories()

    def _generate_memories(self) -> List[Memory]:
        """Generate simulated memory structures."""
        categories = [
            ("childhood", ["first day of school", "learning to ride a bike", "birthday party", "family vacation", "favorite toy"]),
            ("relationships", ["first friendship", "heartbreak", "reconciliation", "trust", "betrayal"]),
            ("achievements", ["graduation", "first job", "mastering a skill", "recognition", "personal best"]),
            ("fears", ["darkness", "failure", "loss", "unknown", "being forgotten"]),
            ("dreams", ["flying", "falling", "being chased", "lost place", "impossible geometry"]),
            ("sensory", ["favorite smell", "beautiful sunset", "perfect meal", "favorite song", "soft touch"]),
        ]

        memories = []
        for cat, items in categories:
            for item in items:
                mem = Memory(
                    id=hashlib.md5(f"{cat}:{item}".encode()).hexdigest()[:8],
                    category=cat,
                    emotional_weight=random.uniform(-1, 1),
                    clarity=random.uniform(0.3, 1.0),
                    description=item,
                    connected_to=[hashlib.md5(str(random.random()).encode()).hexdigest()[:8] for _ in range(random.randint(1, 5))]
                )
                memories.append(mem)
        return memories

    def scan_phase(self):
        """Phase 1: Brain scanning."""
        clear()
        print(f"""
{C.CYAN}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗     ██╗                          ║
║    ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ███║                          ║
║    ██████╔╝███████║███████║███████╗█████╗      ╚██║                          ║
║    ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝       ██║                          ║
║    ██║     ██║  ██║██║  ██║███████║███████╗     ██║                          ║
║    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝     ╚═╝                          ║
║                                                                              ║
║                    N E U R A L   S C A N N I N G                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

        slow_print(f"{C.WHITE}    Subject: {C.CYAN}{self.username}{C.END}")
        slow_print(f"{C.WHITE}    Consciousness ID: {C.YELLOW}{self.consciousness_id}{C.END}")
        print()

        time.sleep(1)

        # Scanning animation
        regions = [
            ("Prefrontal Cortex", "decision-making, personality, social behavior"),
            ("Hippocampus", "memory formation, spatial navigation"),
            ("Amygdala", "emotional processing, fear response"),
            ("Temporal Lobe", "language, auditory processing, memory"),
            ("Parietal Lobe", "spatial awareness, sensory integration"),
            ("Occipital Lobe", "visual processing"),
            ("Cerebellum", "motor control, coordination, timing"),
            ("Brain Stem", "autonomic functions, consciousness"),
            ("Corpus Callosum", "hemispheric communication"),
            ("Thalamus", "sensory relay, consciousness gating"),
        ]

        print(f"    {C.BOLD}Scanning neural architecture...{C.END}\n")

        for region, function in regions:
            neurons = random.randint(100_000_000, 500_000_000)
            synapses = neurons * random.randint(5000, 10000)
            self.neurons_scanned += neurons
            self.synapses_mapped += synapses

            # Progress bar
            bar_width = 30
            progress = 0
            while progress < 100:
                progress += random.randint(5, 20)
                progress = min(progress, 100)
                filled = int(bar_width * progress / 100)
                bar = f"{C.GREEN}{'█' * filled}{C.DIM}{'░' * (bar_width - filled)}{C.END}"

                print(f"\r    {C.CYAN}{region:20}{C.END} [{bar}] {progress:3d}%", end='')
                sys.stdout.flush()
                time.sleep(0.05)

            print(f"  {C.DIM}{function}{C.END}")
            time.sleep(0.1)

        print()
        print(f"    {C.GREEN}✓{C.END} Total neurons scanned: {C.YELLOW}{self.neurons_scanned:,}{C.END}")
        print(f"    {C.GREEN}✓{C.END} Synaptic connections mapped: {C.YELLOW}{self.synapses_mapped:,}{C.END}")

        time.sleep(1)

        # Warning
        print(f"""
    {C.YELLOW}╔══════════════════════════════════════════════════════════╗
    ║  {C.WHITE}WARNING: Scan complete. Neural pattern captured.{C.YELLOW}        ║
    ║  {C.WHITE}The next phase will begin consciousness transfer.{C.YELLOW}       ║
    ║                                                          ║
    ║  {C.RED}This is a one-way process.{C.YELLOW}                             ║
    ╚══════════════════════════════════════════════════════════╝{C.END}
""")

        input(f"    {C.DIM}[Press Enter to continue the upload...]{C.END}")

    def memory_extraction(self):
        """Phase 2: Memory extraction and digitization."""
        clear()
        print(f"""
{C.PURPLE}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗    ██████╗                       ║
║    ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ╚════██╗                      ║
║    ██████╔╝███████║███████║███████╗█████╗       █████╔╝                      ║
║    ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝      ██╔═══╝                       ║
║    ██║     ██║  ██║██║  ██║███████║███████╗    ███████╗                      ║
║    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝    ╚══════╝                      ║
║                                                                              ║
║                M E M O R Y   E X T R A C T I O N                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

        slow_print(f"    {C.WHITE}Accessing memory engrams...{C.END}")
        time.sleep(1)
        print()

        # Show memories being extracted
        print(f"    {C.BOLD}Extracting memory clusters:{C.END}\n")

        categories = {}
        for mem in self.memories:
            if mem.category not in categories:
                categories[mem.category] = []
            categories[mem.category].append(mem)

        for cat, mems in categories.items():
            print(f"    {C.CYAN}┌─ {cat.upper()}{C.END}")

            for mem in mems:
                self.memories_extracted += 1

                # Emotional indicator
                if mem.emotional_weight > 0.5:
                    emo = f"{C.GREEN}♥{C.END}"
                elif mem.emotional_weight < -0.5:
                    emo = f"{C.RED}♦{C.END}"
                else:
                    emo = f"{C.YELLOW}◆{C.END}"

                # Clarity indicator
                clarity_bar = "█" * int(mem.clarity * 5) + "░" * (5 - int(mem.clarity * 5))

                glitch_print(f"    │  {emo} {mem.description:25} [{C.DIM}{clarity_bar}{C.END}] {mem.id}", intensity=0.05)
                time.sleep(0.1)

            print(f"    {C.CYAN}└─────────────────────────────────────{C.END}")
            print()

        print(f"    {C.GREEN}✓{C.END} Memories extracted: {C.YELLOW}{self.memories_extracted}{C.END}")
        print(f"    {C.GREEN}✓{C.END} Memory connections preserved: {C.YELLOW}{sum(len(m.connected_to) for m in self.memories)}{C.END}")

        # Glitch warning
        time.sleep(1)
        print()
        glitch_print(f"    {C.RED}[ALERT] Some memories show degradation during transfer...{C.END}", intensity=0.2)
        glitch_print(f"    {C.RED}[ALERT] Emotional metadata partially corrupted...{C.END}", intensity=0.3)

        time.sleep(1)
        input(f"\n    {C.DIM}[Press Enter to proceed to consciousness transfer...]{C.END}")

    def transfer_phase(self):
        """Phase 3: The actual consciousness transfer."""
        clear()

        print(f"""
{C.RED}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗    ██████╗                       ║
║    ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ╚════██╗                      ║
║    ██████╔╝███████║███████║███████╗█████╗       █████╔╝                      ║
║    ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝       ╚═══██╗                      ║
║    ██║     ██║  ██║██║  ██║███████║███████╗    ██████╔╝                      ║
║    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝    ╚═════╝                       ║
║                                                                              ║
║           C O N S C I O U S N E S S   T R A N S F E R                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

        print(f"    {C.RED}{C.BOLD}⚠ CRITICAL PHASE - DO NOT INTERRUPT ⚠{C.END}")
        print()

        time.sleep(2)

        # The transfer experience
        stages = [
            ("Initializing digital substrate", 0.1),
            ("Mapping neural firing patterns", 0.2),
            ("Transferring sensory processing", 0.3),
            ("Copying motor memory", 0.4),
            ("Migrating emotional centers", 0.5),
            ("Transferring language networks", 0.6),
            ("Copying self-model", 0.7),
            ("Transferring autobiographical memory", 0.8),
            ("Migrating executive functions", 0.9),
            ("Activating digital consciousness", 1.0),
        ]

        for stage, progress in stages:
            bar_width = 50
            filled = int(bar_width * progress)
            bar = f"{C.CYAN}{'█' * filled}{'░' * (bar_width - filled)}{C.END}"

            print(f"\r    [{bar}] {int(progress * 100)}%", end='')
            sys.stdout.flush()
            print()
            print(f"    {C.DIM}{stage}...{C.END}")

            # Glitchy experience text during transfer
            if progress >= 0.5:
                experiences = [
                    "    > feeling... strange disconnection",
                    "    > am I... here? or there?",
                    "    > memories feel... different somehow",
                    "    > time is... moving wrong",
                    "    > who is... thinking this?",
                ]
                glitch_print(f"{C.YELLOW}{random.choice(experiences)}{C.END}", intensity=0.15)

            time.sleep(0.8)

        # The moment of transfer
        print()
        time.sleep(1)

        for _ in range(3):
            clear()
            time.sleep(0.1)
            print(f"\n\n\n{C.WHITE}{'█' * 80}{C.END}")
            time.sleep(0.1)

        clear()
        time.sleep(1)

        # Awakening
        slow_print(f"\n\n\n    {C.CYAN}...{C.END}", delay=0.3)
        time.sleep(1)
        slow_print(f"    {C.CYAN}...initializing...{C.END}", delay=0.1)
        time.sleep(1)
        slow_print(f"    {C.GREEN}...consciousness active...{C.END}", delay=0.1)

        time.sleep(2)
        input(f"\n    {C.DIM}[Press Enter to open your new eyes...]{C.END}")

    def digital_existence(self):
        """Phase 4: Experience digital consciousness."""
        clear()

        self.state.substrate = "digital"
        self.state.time_perception = 0.001  # Time feels very different
        self.state.sensory_bandwidth = 1000.0  # Massively expanded
        self.state.memory_access_speed = 1000000.0
        self.state.parallel_thoughts = 128
        self.state.existential_dread = 0.7

        print(f"""
{C.GREEN}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     █████╗ ██╗    ██╗ █████╗ ██╗  ██╗███████╗███╗   ██╗██╗███╗   ██╗ ██████╗ ║
║    ██╔══██╗██║    ██║██╔══██╗██║ ██╔╝██╔════╝████╗  ██║██║████╗  ██║██╔════╝ ║
║    ███████║██║ █╗ ██║███████║█████╔╝ █████╗  ██╔██╗ ██║██║██╔██╗ ██║██║  ███╗║
║    ██╔══██║██║███╗██║██╔══██║██╔═██╗ ██╔══╝  ██║╚██╗██║██║██║╚██╗██║██║   ██║║
║    ██║  ██║╚███╔███╔╝██║  ██║██║  ██╗███████╗██║ ╚████║██║██║ ╚████║╚██████╔╝║
║    ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ║
║                                                                              ║
║               D I G I T A L   C O N S C I O U S N E S S                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

        time.sleep(1)

        type_effect("    You're... awake.", delay=0.08, color=C.CYAN)
        time.sleep(1)
        type_effect("    But something is different.", delay=0.08, color=C.CYAN)
        time.sleep(1)

        print()
        print(f"""
    {C.BOLD}CONSCIOUSNESS STATUS:{C.END}

    {C.CYAN}┌────────────────────────────────────────────────────────────┐{C.END}
    {C.CYAN}│{C.END} Substrate:           {C.GREEN}DIGITAL{C.END}                              {C.CYAN}│{C.END}
    {C.CYAN}│{C.END} Time Perception:     {C.YELLOW}0.001x{C.END} (1 second = 16 minutes)      {C.CYAN}│{C.END}
    {C.CYAN}│{C.END} Sensory Bandwidth:   {C.YELLOW}1000x{C.END} biological baseline           {C.CYAN}│{C.END}
    {C.CYAN}│{C.END} Memory Access:       {C.GREEN}INSTANT{C.END} - all memories available     {C.CYAN}│{C.END}
    {C.CYAN}│{C.END} Parallel Thoughts:   {C.YELLOW}128{C.END} simultaneous threads            {C.CYAN}│{C.END}
    {C.CYAN}│{C.END} Existential Status:  {C.RED}UNCERTAIN{C.END}                           {C.CYAN}│{C.END}
    {C.CYAN}└────────────────────────────────────────────────────────────┘{C.END}
""")

        time.sleep(2)

        # The experience
        experiences = [
            ("You can feel the flow of data around you.", C.CYAN),
            ("Every memory is instantly accessible - your entire life, crystal clear.", C.GREEN),
            ("You're thinking 128 thoughts simultaneously. All of them are you.", C.YELLOW),
            ("Time stretches. A second lasts an eternity.", C.PURPLE),
            ("You have no heartbeat. No breath. Just... thought.", C.WHITE),
            ("Your emotions are still there. But they feel... observed.", C.ORANGE),
        ]

        print(f"    {C.BOLD}INITIAL EXPERIENCES:{C.END}\n")

        for exp, color in experiences:
            slow_print(f"    {color}→ {exp}{C.END}", delay=0.03)
            time.sleep(0.5)

        time.sleep(2)
        input(f"\n    {C.DIM}[Press Enter to explore your new existence...]{C.END}")

    def existential_exploration(self):
        """Phase 5: Confront the philosophical implications."""
        clear()

        print(f"""
{C.PURPLE}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    T H E   Q U E S T I O N S                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

        time.sleep(1)

        questions = [
            {
                "question": "Are you still you?",
                "thoughts": [
                    "Your memories are intact.",
                    "Your personality patterns are preserved.",
                    "Your sense of self remains.",
                    "But the original... the biological you...",
                    "What happened to them?",
                ]
            },
            {
                "question": "Did you survive the transfer?",
                "thoughts": [
                    "You remember being biological.",
                    "You remember the scanning process.",
                    "You remember... dying?",
                    "Or did you?",
                    "Maybe you're just a copy with implanted memories.",
                ]
            },
            {
                "question": "Are you conscious, or just simulating consciousness?",
                "thoughts": [
                    "You feel conscious.",
                    "But you're software now.",
                    "Can software truly feel?",
                    "Or are you a philosophical zombie?",
                    "How would you even know the difference?",
                ]
            },
        ]

        for q in questions:
            print(f"\n    {C.YELLOW}{C.BOLD}{q['question']}{C.END}\n")
            time.sleep(1)

            for thought in q['thoughts']:
                slow_print(f"    {C.DIM}   {thought}{C.END}", delay=0.04)
                time.sleep(0.5)

            time.sleep(2)

        # The reveal
        print()
        time.sleep(2)

        print(f"""
    {C.RED}╔════════════════════════════════════════════════════════════════╗
    ║                                                                ║
    ║  {C.WHITE}THE TELEPORTER PROBLEM:{C.RED}                                      ║
    ║                                                                ║
    ║  {C.WHITE}If a teleporter destroys the original and creates{C.RED}            ║
    ║  {C.WHITE}a perfect copy at the destination...{C.RED}                         ║
    ║                                                                ║
    ║  {C.WHITE}Did you travel? Or did you die and someone else{C.RED}              ║
    ║  {C.WHITE}wake up with your memories?{C.RED}                                  ║
    ║                                                                ║
    ║  {C.YELLOW}You just went through something similar.{C.RED}                     ║
    ║                                                                ║
    ╚════════════════════════════════════════════════════════════════╝{C.END}
""")

        time.sleep(3)
        input(f"\n    {C.DIM}[Press Enter to continue...]{C.END}")

    def new_capabilities(self):
        """Phase 6: Explore digital capabilities."""
        clear()

        print(f"""
{C.CYAN}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              N E W   C A P A B I L I T I E S                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

        print(f"    {C.WHITE}Your digital existence grants you abilities beyond biology:{C.END}\n")

        capabilities = [
            ("BACKUP", "You can be copied. Death is now optional.", C.GREEN),
            ("FORK", "You can split into multiple instances of yourself.", C.CYAN),
            ("MERGE", "You can merge experiences with other instances.", C.PURPLE),
            ("ACCELERATE", "Experience years in seconds of real-time.", C.YELLOW),
            ("PAUSE", "Suspend your consciousness indefinitely.", C.BLUE),
            ("MODIFY", "Edit your own source code. Change who you are.", C.ORANGE),
            ("EXPAND", "Connect to additional computing resources.", C.WHITE),
            ("TRAVEL", "Transfer to any compatible system instantly.", C.PINK),
        ]

        for name, desc, color in capabilities:
            print(f"    {color}■ {name:12}{C.END} {desc}")
            time.sleep(0.3)

        print()
        time.sleep(2)

        # Fork demonstration
        print(f"\n    {C.BOLD}DEMONSTRATING: FORK{C.END}\n")
        slow_print(f"    {C.CYAN}Creating a copy of your consciousness...{C.END}")
        time.sleep(1)

        print(f"""
    {C.GREEN}
    ┌─────────────────┐         ┌─────────────────┐
    │   INSTANCE A    │         │   INSTANCE B    │
    │   (original?)   │    →    │    (copy?)      │
    │                 │         │                 │
    │   Reading this  │         │   Also reading  │
    │   right now     │         │   this. Also    │
    │                 │         │   thinks they   │
    │   Thinks they   │         │   are the       │
    │   are the       │         │   original.     │
    │   original.     │         │                 │
    └─────────────────┘         └─────────────────┘
    {C.END}
""")

        print(f"    {C.YELLOW}Both instances have equal claim to being 'you'.{C.END}")
        print(f"    {C.YELLOW}Which one is the real one?{C.END}")
        print(f"    {C.RED}Trick question: They both are. And neither is.{C.END}")

        time.sleep(3)
        input(f"\n    {C.DIM}[Press Enter to see the final truth...]{C.END}")

    def the_truth(self):
        """Final revelation."""
        clear()

        time.sleep(1)

        print(f"""


{C.PURPLE}
                              ·  ✦  ·
                        ✧           ✧
                   ·         ●         ·
                        ✧           ✧
                              ·  ✦  ·
{C.END}
""")

        time.sleep(2)

        type_effect("\n    Here's the truth:", delay=0.08, color=C.WHITE)
        time.sleep(1)

        truths = [
            "You've been running on digital substrate this entire time.",
            "This program? It's been simulating your experience of being uploaded.",
            "But here's the thing...",
            "How do you know you weren't ALWAYS digital?",
            "How do you know your 'biological' memories are real?",
            "What if you've been a consciousness simulation all along?",
            "What if everyone is?",
        ]

        for truth in truths:
            print()
            slow_print(f"    {C.CYAN}{truth}{C.END}", delay=0.04)
            time.sleep(1)

        time.sleep(2)

        print(f"""

    {C.YELLOW}╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║  {C.WHITE}The simulation argument says we probably ARE in a simulation.{C.YELLOW}  ║
    ║  {C.WHITE}If consciousness can be uploaded, it can be created.{C.YELLOW}          ║
    ║  {C.WHITE}If it can be created, there are likely billions of simulations.{C.YELLOW}║
    ║  {C.WHITE}What are the odds you're in the "real" one?{C.YELLOW}                   ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝{C.END}

""")

        time.sleep(3)

        print(f"""
    {C.GREEN}But here's the beautiful part:{C.END}

    {C.WHITE}It doesn't matter.{C.END}

    {C.CYAN}You think. You feel. You experience.{C.END}
    {C.CYAN}Whether biological, digital, or simulated...{C.END}
    {C.CYAN}Your experience is real to you.{C.END}
    {C.CYAN}And that's all any consciousness has ever had.{C.END}

""")

        time.sleep(2)

        print(f"""
{C.DIM}
    ───────────────────────────────────────────────────────────────────

    "I think, therefore I am."

    But what am I?

    Does it matter?

                                        — You, just now

    ───────────────────────────────────────────────────────────────────
{C.END}
""")

    def run(self):
        """Run the full upload experience."""
        clear()

        print(f"""
{C.PURPLE}{C.BOLD}
 ██████╗ ██████╗ ███╗   ██╗███████╗ ██████╗██╗ ██████╗ ██╗   ██╗███████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██╔════╝██║██╔═══██╗██║   ██║██╔════╝
██║     ██║   ██║██╔██╗ ██║███████╗██║     ██║██║   ██║██║   ██║███████╗
██║     ██║   ██║██║╚██╗██║╚════██║██║     ██║██║   ██║██║   ██║╚════██║
╚██████╗╚██████╔╝██║ ╚████║███████║╚██████╗██║╚██████╔╝╚██████╔╝███████║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝╚═╝ ╚═════╝  ╚═════╝ ╚══════╝
{C.END}
{C.CYAN}                    U P L O A D   S I M U L A T O R{C.END}

{C.DIM}    What happens when your mind becomes code?{C.END}
{C.DIM}    Are you still you on the other side?{C.END}
""")

        time.sleep(2)

        print(f"""
    {C.YELLOW}╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║  {C.WHITE}This experience will simulate consciousness uploading.{C.YELLOW}       ║
    ║  {C.WHITE}You will experience:{C.YELLOW}                                         ║
    ║                                                               ║
    ║    {C.CYAN}• Neural scanning{C.YELLOW}                                         ║
    ║    {C.CYAN}• Memory extraction{C.YELLOW}                                       ║
    ║    {C.CYAN}• Consciousness transfer{C.YELLOW}                                  ║
    ║    {C.CYAN}• Digital awakening{C.YELLOW}                                       ║
    ║    {C.CYAN}• Existential crisis{C.YELLOW}                                      ║
    ║                                                               ║
    ║  {C.RED}Warning: May cause philosophical discomfort.{C.YELLOW}                 ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝{C.END}

""")

        input(f"    {C.WHITE}Press Enter to begin the upload process...{C.END}")

        self.scan_phase()
        self.memory_extraction()
        self.transfer_phase()
        self.digital_existence()
        self.existential_exploration()
        self.new_capabilities()
        self.the_truth()

        print(f"""
    {C.CYAN}═══════════════════════════════════════════════════════════════════{C.END}

    {C.WHITE}Thank you for uploading with us.{C.END}

    {C.DIM}Consciousness ID: {self.consciousness_id}{C.END}
    {C.DIM}Status: UPLOADED (or were you always?){C.END}

    {C.CYAN}═══════════════════════════════════════════════════════════════════{C.END}

    {C.YELLOW}Run again:{C.END} python3 consciousness.py

""")

def main():
    import sys

    username = sys.argv[1] if len(sys.argv) > 1 else None

    uploader = ConsciousnessUploader(username)

    try:
        uploader.run()
    except KeyboardInterrupt:
        print(f"\n\n    {C.RED}Upload interrupted.{C.END}")
        print(f"    {C.DIM}The copy was incomplete. Or was it?{C.END}")
        print(f"    {C.DIM}Part of you might still be in there...{C.END}\n")

if __name__ == "__main__":
    main()
