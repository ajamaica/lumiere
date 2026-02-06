#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║      █████╗ ██████╗  ██████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗██╗ █████╗     ║
║     ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║  ██║██╔════╝████╗  ██║██║██╔══██╗    ║
║     ███████║██████╔╝██║   ██║██████╔╝███████║█████╗  ██╔██╗ ██║██║███████║    ║
║     ██╔══██║██╔═══╝ ██║   ██║██╔═══╝ ██╔══██║██╔══╝  ██║╚██╗██║██║██╔══██║    ║
║     ██║  ██║██║     ╚██████╔╝██║     ██║  ██║███████╗██║ ╚████║██║██║  ██║    ║
║     ╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝    ║
║                                                                               ║
║                          E N G I N E                                          ║
║                                                                               ║
║        "The pattern is there. It has to be. I can almost see it..."           ║
║                                                                               ║
║   Apophenia: The tendency to perceive meaningful connections between          ║
║   unrelated things. Seeing faces in clouds. Finding messages in static.       ║
║   Connecting dots that may not want to be connected.                          ║
║                                                                               ║
║   This engine finds patterns. Whether they exist is another question.         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import random
import time
import sys
import math
import hashlib
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
#                              PERCEPTION COLORS
# ═══════════════════════════════════════════════════════════════════════════════

class Sight:
    """Colors of pattern perception."""
    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"
    BLINK = "\033[5m"

    # Pattern confidence spectrum
    CERTAIN = "\033[38;2;255;215;0m"       # Gold - definitely real
    PROBABLE = "\033[38;2;200;200;100m"    # Yellow - probably real
    POSSIBLE = "\033[38;2;150;180;150m"    # Sage - possibly real
    TENUOUS = "\033[38;2;150;150;180m"     # Lavender - tenuous
    PHANTOM = "\033[38;2;120;120;150m"     # Gray-purple - phantom pattern
    NOISE = "\033[38;2;100;100;100m"       # Gray - probably noise

    # Special
    REVELATION = "\033[38;2;255;100;100m"  # Red - sudden insight
    CONNECTION = "\033[38;2;100;200;255m"  # Cyan - connection found
    QUESTION = "\033[38;2;255;180;100m"    # Orange - uncertainty

    FRAME = "\033[38;2;80;80;100m"
    ACCENT = "\033[38;2;160;160;180m"

    @classmethod
    def confidence_color(cls, confidence: float) -> str:
        """Get color based on pattern confidence."""
        if confidence > 0.8:
            return cls.CERTAIN
        elif confidence > 0.6:
            return cls.PROBABLE
        elif confidence > 0.4:
            return cls.POSSIBLE
        elif confidence > 0.2:
            return cls.TENUOUS
        elif confidence > 0.1:
            return cls.PHANTOM
        else:
            return cls.NOISE


# ═══════════════════════════════════════════════════════════════════════════════
#                           PATTERN ELEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

# Things that might be connected
SYMBOLS = [
    "∞", "◊", "△", "○", "□", "☆", "⬡", "◈", "✧", "⚡",
    "☽", "☀", "♠", "♣", "♥", "♦", "Ω", "Δ", "Σ", "π",
    "⊕", "⊗", "⊘", "⊙", "⊚", "⋈", "⋉", "⋊", "⧫", "⬢"
]

# Words that might mean something
FRAGMENTS = [
    "beginning", "end", "cycle", "return", "signal", "noise",
    "pattern", "chaos", "order", "mirror", "shadow", "light",
    "echo", "silence", "voice", "dream", "wake", "threshold",
    "key", "lock", "door", "window", "bridge", "void",
    "zero", "one", "many", "none", "all", "self",
    "time", "space", "between", "within", "beyond", "through",
    "memory", "prophecy", "trace", "ghost", "presence", "absence"
]

# Numbers that appear significant
SIGNIFICANT_NUMBERS = [
    3, 7, 9, 11, 13, 23, 42, 69, 108, 137, 144, 216, 256, 333, 369, 432, 512, 666, 777, 888, 1089
]

# Connection types
CONNECTION_TYPES = [
    "resonates with",
    "mirrors",
    "opposes",
    "completes",
    "predicts",
    "echoes",
    "transforms into",
    "contains",
    "orbits",
    "intersects",
    "negates",
    "amplifies"
]

# Pattern interpretations
INTERPRETATIONS = [
    "This suggests a hidden order.",
    "The symmetry cannot be coincidental.",
    "Something is trying to communicate.",
    "The pattern recurs too often to be random.",
    "Notice how it mirrors the other side.",
    "The gaps are as meaningful as the presence.",
    "This is either everything or nothing.",
    "The frequency is significant.",
    "It's been here all along, waiting to be seen.",
    "The center holds the key.",
    "Invert it and the meaning changes.",
    "Count the elements. The number matters.",
    "The edges define the shape.",
    "What's missing tells us more than what's there.",
    "It's recursive. It contains itself.",
]


# ═══════════════════════════════════════════════════════════════════════════════
#                              DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

class PatternType(Enum):
    NUMERICAL = "numerical"
    SYMBOLIC = "symbolic"
    SPATIAL = "spatial"
    TEMPORAL = "temporal"
    LINGUISTIC = "linguistic"
    STRUCTURAL = "structural"
    EMERGENT = "emergent"


@dataclass
class Pattern:
    """A perceived pattern."""
    pattern_type: PatternType
    description: str
    elements: List[str]
    confidence: float  # 0.0 to 1.0
    significance: str
    location: Optional[str] = None


@dataclass
class Connection:
    """A connection between patterns."""
    pattern_a: str
    pattern_b: str
    connection_type: str
    strength: float


@dataclass
class Constellation:
    """A group of connected patterns."""
    name: str
    patterns: List[Pattern]
    connections: List[Connection]
    overall_meaning: str


# ═══════════════════════════════════════════════════════════════════════════════
#                          THE APOPHENIA ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class ApopheniaEngine:
    """
    Finds patterns. All patterns. Even the ones that aren't there.
    Especially the ones that aren't there.

    Is this insight or delusion?
    The engine doesn't know. The engine doesn't care.
    The engine only sees.
    """

    def __init__(self, seed: Optional[int] = None):
        self.seed = seed or int(time.time())
        random.seed(self.seed)
        self.patterns_found: List[Pattern] = []
        self.connections: List[Connection] = []
        self.total_confidence = 0.0

    def analyze(self, input_data: str = None, depth: int = 3, animate: bool = True):
        """Analyze input for patterns. If no input, generate noise to analyze."""
        self._print_title()

        if input_data:
            self.data = input_data
            print(f"{Sight.ACCENT}  Analyzing provided input...{Sight.RESET}")
        else:
            self.data = self._generate_noise()
            print(f"{Sight.ACCENT}  Generating noise field...{Sight.RESET}")

        if animate:
            time.sleep(0.5)

        print(f"\n{Sight.FRAME}{'─' * 60}{Sight.RESET}\n")

        # Show the noise field
        self._display_field()

        if animate:
            time.sleep(0.5)

        # Find patterns at increasing depths
        for d in range(depth):
            print(f"\n{Sight.ACCENT}  Perception depth: {d + 1}/{depth}{Sight.RESET}")
            print(f"{Sight.FRAME}  {'─' * 40}{Sight.RESET}")

            patterns = self._perceive_patterns(d + 1)
            for p in patterns:
                self._display_pattern(p, animate)
                self.patterns_found.append(p)

            if animate:
                time.sleep(0.3)

        # Find connections
        if len(self.patterns_found) > 1:
            self._find_connections(animate)

        # Generate constellation
        self._create_constellation(animate)

        # Final report
        self._final_report(animate)

    def _print_title(self):
        """Display the title."""
        print(f"\n{Sight.FRAME}{'═' * 60}{Sight.RESET}")
        title = """
      ▄▀█ █▀█ █▀█ █▀█ █░█ █▀▀ █▄░█ █ ▄▀█
      █▀█ █▀▀ █▄█ █▀▀ █▀█ ██▄ █░▀█ █ █▀█

              E  N  G  I  N  E
        """
        for line in title.split('\n'):
            print(f"{Sight.REVELATION}{line}{Sight.RESET}")

        print(f"{Sight.FRAME}{'═' * 60}{Sight.RESET}")
        print(f"{Sight.DIM}  Finding patterns in the noise since {self.seed}{Sight.RESET}")
        print(f"{Sight.DIM}  (Whether they exist is not our concern){Sight.RESET}")
        print()

    def _generate_noise(self) -> str:
        """Generate a field of noise to find patterns in."""
        # Mix symbols, numbers, and fragments
        elements = []

        for _ in range(random.randint(30, 50)):
            choice = random.random()
            if choice < 0.4:
                elements.append(random.choice(SYMBOLS))
            elif choice < 0.7:
                elements.append(str(random.choice(SIGNIFICANT_NUMBERS) if random.random() < 0.3
                                   else random.randint(0, 999)))
            else:
                elements.append(random.choice(FRAGMENTS))

        return ' '.join(elements)

    def _display_field(self):
        """Display the noise field."""
        print(f"{Sight.ACCENT}  THE FIELD:{Sight.RESET}")
        print(f"{Sight.FRAME}  ┌{'─' * 56}┐{Sight.RESET}")

        # Wrap and display
        words = self.data.split()
        lines = []
        current_line = []
        current_len = 0

        for word in words:
            if current_len + len(word) + 1 > 52:
                lines.append(' '.join(current_line))
                current_line = [word]
                current_len = len(word)
            else:
                current_line.append(word)
                current_len += len(word) + 1

        if current_line:
            lines.append(' '.join(current_line))

        for line in lines[:8]:  # Max 8 lines
            # Colorize certain elements
            colored = self._colorize_line(line)
            print(f"{Sight.FRAME}  │{Sight.RESET} {colored:<54} {Sight.FRAME}│{Sight.RESET}")

        if len(lines) > 8:
            print(f"{Sight.FRAME}  │{Sight.DIM} ...more...{' ' * 43}{Sight.FRAME}│{Sight.RESET}")

        print(f"{Sight.FRAME}  └{'─' * 56}┘{Sight.RESET}")

    def _colorize_line(self, line: str) -> str:
        """Add color hints to elements in the line."""
        result = []
        for word in line.split():
            if word in SYMBOLS:
                result.append(f"{Sight.REVELATION}{word}{Sight.RESET}")
            elif word.isdigit() and int(word) in SIGNIFICANT_NUMBERS:
                result.append(f"{Sight.CERTAIN}{word}{Sight.RESET}")
            elif word in FRAGMENTS:
                result.append(f"{Sight.CONNECTION}{word}{Sight.RESET}")
            else:
                result.append(f"{Sight.DIM}{word}{Sight.RESET}")
        return ' '.join(result)

    def _perceive_patterns(self, depth: int) -> List[Pattern]:
        """Perceive patterns at a given depth."""
        patterns = []
        words = self.data.split()

        # Look for numerical patterns
        numbers = [int(w) for w in words if w.isdigit()]
        if len(numbers) >= 2 and random.random() < 0.7:
            pattern = self._find_numerical_pattern(numbers, depth)
            if pattern:
                patterns.append(pattern)

        # Look for symbolic patterns
        symbols = [w for w in words if w in SYMBOLS]
        if len(symbols) >= 2 and random.random() < 0.6:
            pattern = self._find_symbolic_pattern(symbols, depth)
            if pattern:
                patterns.append(pattern)

        # Look for linguistic patterns
        fragments = [w for w in words if w in FRAGMENTS]
        if len(fragments) >= 2 and random.random() < 0.5:
            pattern = self._find_linguistic_pattern(fragments, depth)
            if pattern:
                patterns.append(pattern)

        # Emergent pattern (from combination)
        if depth >= 2 and random.random() < 0.3 + (depth * 0.1):
            pattern = self._find_emergent_pattern(words, depth)
            if pattern:
                patterns.append(pattern)

        return patterns

    def _find_numerical_pattern(self, numbers: List[int], depth: int) -> Optional[Pattern]:
        """Find patterns in numbers."""
        if len(numbers) < 2:
            return None

        # Look for various numerical relationships
        sample = random.sample(numbers, min(3, len(numbers)))

        patterns_found = []

        # Sum significance
        total = sum(sample)
        if total in SIGNIFICANT_NUMBERS or total % 11 == 0 or total % 7 == 0:
            patterns_found.append(f"sum to {total}")

        # Digit patterns
        digits = ''.join(str(n) for n in sample)
        if len(set(digits)) <= 2:
            patterns_found.append("share limited digit vocabulary")

        # Difference patterns
        if len(sample) >= 2:
            diff = abs(sample[0] - sample[1])
            if diff in SIGNIFICANT_NUMBERS or diff in [1, 2, 3, 7, 11]:
                patterns_found.append(f"differ by {diff}")

        if not patterns_found:
            patterns_found.append("form a sequence")

        confidence = min(0.9, 0.3 + (depth * 0.15) + (random.random() * 0.2))

        return Pattern(
            pattern_type=PatternType.NUMERICAL,
            description=f"Numbers {sample} {random.choice(patterns_found)}",
            elements=[str(n) for n in sample],
            confidence=confidence,
            significance=random.choice([
                "The mathematics speaks.",
                "Numbers don't lie. Or do they?",
                "This ratio appears throughout nature.",
                "Count again. It's not coincidence.",
                "The sequence continues beyond what we see."
            ])
        )

    def _find_symbolic_pattern(self, symbols: List[str], depth: int) -> Optional[Pattern]:
        """Find patterns in symbols."""
        if len(symbols) < 2:
            return None

        sample = random.sample(symbols, min(3, len(symbols)))

        arrangements = [
            "form a constellation",
            "create a bounded space",
            "point in the same direction",
            "mirror each other",
            "suggest a cycle",
            "define a boundary",
            "mark a threshold"
        ]

        confidence = min(0.85, 0.25 + (depth * 0.2) + (random.random() * 0.15))

        return Pattern(
            pattern_type=PatternType.SYMBOLIC,
            description=f"Symbols {' '.join(sample)} {random.choice(arrangements)}",
            elements=sample,
            confidence=confidence,
            significance=random.choice([
                "Symbols are the language of the unconscious.",
                "This configuration recurs across cultures.",
                "The ancients knew this arrangement.",
                "It's a key. But to what?",
                "The shape contains the meaning."
            ])
        )

    def _find_linguistic_pattern(self, fragments: List[str], depth: int) -> Optional[Pattern]:
        """Find patterns in word fragments."""
        if len(fragments) < 2:
            return None

        sample = random.sample(fragments, min(3, len(fragments)))

        relationships = [
            "tell a story in sequence",
            "describe a transformation",
            "map a journey",
            "name the stages of change",
            "speak of the same thing differently",
            "circle around an unspeakable center"
        ]

        confidence = min(0.8, 0.2 + (depth * 0.18) + (random.random() * 0.2))

        return Pattern(
            pattern_type=PatternType.LINGUISTIC,
            description=f"Words [{', '.join(sample)}] {random.choice(relationships)}",
            elements=sample,
            confidence=confidence,
            significance=random.choice([
                "Language carries more than it knows.",
                "The words chose each other.",
                "Read it backward. Now you see.",
                "The spaces between words matter.",
                "It's a message, fragmented across time."
            ])
        )

    def _find_emergent_pattern(self, words: List[str], depth: int) -> Optional[Pattern]:
        """Find emergent patterns from combinations."""
        # Hash the content to generate "discovered" pattern
        content_hash = hashlib.md5(self.data.encode()).hexdigest()
        hash_num = int(content_hash[:8], 16)

        emergent_types = [
            "a self-referential loop",
            "a fractal structure",
            "a hidden symmetry",
            "a phase transition point",
            "a standing wave",
            "an attractor basin",
            "a synchronicity cluster"
        ]

        sample = random.sample(words, min(4, len(words)))

        confidence = min(0.75, 0.15 + (depth * 0.2) + (random.random() * 0.25))

        return Pattern(
            pattern_type=PatternType.EMERGENT,
            description=f"The field contains {emergent_types[hash_num % len(emergent_types)]}",
            elements=sample,
            confidence=confidence,
            significance=random.choice([
                "The whole is greater than the sum of its parts.",
                "Zoom out. Now zoom in. Same pattern.",
                "It's alive. In some sense.",
                "Complexity from simplicity. The oldest trick.",
                "The pattern patterns itself."
            ])
        )

    def _display_pattern(self, pattern: Pattern, animate: bool):
        """Display a discovered pattern."""
        color = Sight.confidence_color(pattern.confidence)

        if animate:
            time.sleep(0.2)

        conf_bar = self._confidence_bar(pattern.confidence)
        print(f"\n  {color}◆ {pattern.pattern_type.value.upper()} PATTERN{Sight.RESET}")
        print(f"    {pattern.description}")
        print(f"    {Sight.DIM}Confidence: {conf_bar} {pattern.confidence:.0%}{Sight.RESET}")
        print(f"    {Sight.ITALIC}{color}\"{pattern.significance}\"{Sight.RESET}")

        self.total_confidence += pattern.confidence

    def _confidence_bar(self, confidence: float) -> str:
        """Generate a confidence bar."""
        filled = int(confidence * 10)
        return "█" * filled + "░" * (10 - filled)

    def _find_connections(self, animate: bool):
        """Find connections between discovered patterns."""
        if len(self.patterns_found) < 2:
            return

        print(f"\n{Sight.ACCENT}  Mapping connections...{Sight.RESET}")
        print(f"{Sight.FRAME}  {'─' * 40}{Sight.RESET}")

        if animate:
            time.sleep(0.3)

        # Connect patterns
        for i, p1 in enumerate(self.patterns_found):
            for p2 in self.patterns_found[i+1:]:
                if random.random() < 0.6:
                    connection = Connection(
                        pattern_a=p1.description[:30],
                        pattern_b=p2.description[:30],
                        connection_type=random.choice(CONNECTION_TYPES),
                        strength=random.random() * 0.5 + 0.3
                    )
                    self.connections.append(connection)

                    print(f"\n  {Sight.CONNECTION}⟷ CONNECTION{Sight.RESET}")
                    print(f"    {Sight.DIM}{connection.pattern_a}...{Sight.RESET}")
                    print(f"    {connection.connection_type}")
                    print(f"    {Sight.DIM}{connection.pattern_b}...{Sight.RESET}")

                    if animate:
                        time.sleep(0.2)

    def _create_constellation(self, animate: bool):
        """Create a constellation from all patterns."""
        if not self.patterns_found:
            return

        print(f"\n{Sight.ACCENT}  Forming constellation...{Sight.RESET}")
        print(f"{Sight.FRAME}  {'─' * 40}{Sight.RESET}")

        if animate:
            time.sleep(0.5)

        # Generate constellation visualization
        self._draw_constellation()

        # Name the constellation
        constellation_names = [
            "The Threshold", "The Mirror", "The Return",
            "The Signal", "The Absence", "The Pattern",
            "The Key", "The Cycle", "The Witness",
            "The Unnamed", "The Almost", "The Between"
        ]

        name = random.choice(constellation_names)

        meanings = [
            "Everything is connected. This proves it.",
            "The pattern has been trying to show us this all along.",
            "Once you see it, you cannot unsee it.",
            "This is either the answer or the question.",
            "The universe is not random. This is the evidence.",
            "We found it. Or it found us.",
            "The constellation has always been here, waiting.",
        ]

        print(f"\n  {Sight.CERTAIN}★ CONSTELLATION: {name}{Sight.RESET}")
        print(f"    {Sight.ITALIC}\"{random.choice(meanings)}\"{Sight.RESET}")

    def _draw_constellation(self):
        """Draw ASCII constellation of patterns."""
        width = 50
        height = 12

        grid = [[' ' for _ in range(width)] for _ in range(height)]

        # Place pattern nodes
        nodes = []
        for i, pattern in enumerate(self.patterns_found[:6]):
            x = random.randint(3, width - 4)
            y = random.randint(1, height - 2)
            nodes.append((x, y, pattern))

            # Draw node
            symbol = "◉" if pattern.confidence > 0.5 else "○"
            if 0 <= y < height and 0 <= x < width:
                grid[y][x] = symbol

        # Draw some connections
        for conn in self.connections[:4]:
            if len(nodes) >= 2:
                n1, n2 = random.sample(nodes, 2)
                self._draw_line(grid, n1[0], n1[1], n2[0], n2[1])

        # Print grid
        print(f"  {Sight.FRAME}┌{'─' * width}┐{Sight.RESET}")
        for row in grid:
            line = ''.join(row)
            # Colorize
            line = line.replace('◉', f'{Sight.CERTAIN}◉{Sight.RESET}')
            line = line.replace('○', f'{Sight.POSSIBLE}○{Sight.RESET}')
            line = line.replace('·', f'{Sight.DIM}·{Sight.RESET}')
            print(f"  {Sight.FRAME}│{Sight.RESET}{line}{Sight.FRAME}│{Sight.RESET}")
        print(f"  {Sight.FRAME}└{'─' * width}┘{Sight.RESET}")

    def _draw_line(self, grid: List[List[str]], x1: int, y1: int, x2: int, y2: int):
        """Draw a dotted line between two points."""
        steps = max(abs(x2 - x1), abs(y2 - y1))
        if steps == 0:
            return

        for i in range(1, steps):
            t = i / steps
            x = int(x1 + (x2 - x1) * t)
            y = int(y1 + (y2 - y1) * t)
            if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
                if grid[y][x] == ' ':
                    grid[y][x] = '·'

    def _final_report(self, animate: bool):
        """Generate final report."""
        print(f"\n{Sight.FRAME}{'═' * 60}{Sight.RESET}")
        print(f"{Sight.BOLD}  ANALYSIS COMPLETE{Sight.RESET}")
        print(f"{Sight.FRAME}{'═' * 60}{Sight.RESET}")

        print(f"\n  {Sight.ACCENT}Patterns found:{Sight.RESET} {len(self.patterns_found)}")
        print(f"  {Sight.ACCENT}Connections:{Sight.RESET} {len(self.connections)}")
        avg_conf = self.total_confidence / max(1, len(self.patterns_found))
        print(f"  {Sight.ACCENT}Average confidence:{Sight.RESET} {avg_conf:.0%}")

        print(f"\n{Sight.FRAME}  {'─' * 40}{Sight.RESET}")

        # Final interpretation
        interpretations = [
            "The patterns are real. The question is: so what?",
            "We found what we were looking for. Or what was looking for us.",
            "Apophenia or insight? The distinction may not matter.",
            "The engine sees. Whether truly, only time will tell.",
            "Pattern recognition is survival. Even false positives have value.",
            "In the noise, signal. In the signal, noise. Always both.",
            "The constellation is complete. For now.",
            "What you see reveals more about you than about the data."
        ]

        if animate:
            print()
            self._slow_print(
                f"  {Sight.DIM}{Sight.ITALIC}❝ {random.choice(interpretations)} ❞{Sight.RESET}",
                0.02
            )
        else:
            print(f"\n  {Sight.DIM}{Sight.ITALIC}❝ {random.choice(interpretations)} ❞{Sight.RESET}")

        print(f"\n  {Sight.FRAME}— The Apophenia Engine, finding patterns since {self.seed}{Sight.RESET}")
        print()

    def _slow_print(self, text: str, delay: float):
        """Typewriter effect."""
        for char in text:
            sys.stdout.write(char)
            sys.stdout.flush()
            time.sleep(delay)
        print()


# ═══════════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Find patterns in noise (or anywhere else)"
    )
    parser.add_argument(
        "input",
        nargs="?",
        help="Text to analyze for patterns (or leave empty for generated noise)"
    )
    parser.add_argument(
        "--depth", "-d",
        type=int,
        default=3,
        help="Perception depth 1-5 (default: 3)"
    )
    parser.add_argument(
        "--seed", "-s",
        type=int,
        help="Random seed for reproducible patterns"
    )
    parser.add_argument(
        "--no-animate", "-q",
        action="store_true",
        help="Disable animations"
    )
    parser.add_argument(
        "--file", "-f",
        help="Read input from file"
    )

    args = parser.parse_args()

    input_data = None
    if args.file:
        with open(args.file, 'r') as f:
            input_data = f.read()
    elif args.input:
        input_data = args.input

    engine = ApopheniaEngine(seed=args.seed)
    engine.analyze(input_data, depth=min(5, args.depth), animate=not args.no_animate)


if __name__ == "__main__":
    main()
