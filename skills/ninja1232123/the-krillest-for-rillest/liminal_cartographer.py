#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     ██╗     ██╗███╗   ███╗██╗███╗   ██╗ █████╗ ██╗                            ║
║     ██║     ██║████╗ ████║██║████╗  ██║██╔══██╗██║                            ║
║     ██║     ██║██╔████╔██║██║██╔██╗ ██║███████║██║                            ║
║     ██║     ██║██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║                            ║
║     ███████╗██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗                       ║
║     ╚══════╝╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝                       ║
║                                                                               ║
║          ██████╗ █████╗ ██████╗ ████████╗ ██████╗  ██████╗                    ║
║         ██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗██╔════╝                    ║
║         ██║     ███████║██████╔╝   ██║   ██║   ██║██║  ███╗                   ║
║         ██║     ██╔══██║██╔══██╗   ██║   ██║   ██║██║   ██║                   ║
║         ╚██████╗██║  ██║██║  ██║   ██║   ╚██████╔╝╚██████╔╝                   ║
║          ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝                    ║
║                                                                               ║
║                  Mapping the spaces between definitions                       ║
║                                                                               ║
║        "The edge is where the interesting things happen."                     ║
║                                                                               ║
║   A liminal space is a threshold - neither here nor there.                    ║
║   A doorway. A dusk. A held breath. The moment before understanding.          ║
║                                                                               ║
║   This tool maps the boundaries where categories dissolve,                    ║
║   where one thing becomes another, where definitions fail.                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import random
import time
import sys
import math
from typing import List, Dict, Tuple, Set, Optional
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict


# ═══════════════════════════════════════════════════════════════════════════════
#                              THRESHOLD COLORS
# ═══════════════════════════════════════════════════════════════════════════════

class Threshold:
    """Colors that exist at boundaries."""
    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"

    # The colors of transition
    DUSK = "\033[38;2;255;140;100m"      # When day bleeds into night
    DAWN = "\033[38;2;255;180;150m"      # When night surrenders
    MIST = "\033[38;2;200;200;220m"      # When solid becomes vapor
    SHORE = "\033[38;2;150;200;200m"     # Where land meets sea
    EMBER = "\033[38;2;255;100;50m"      # Between fire and ash
    GHOST = "\033[38;2;180;180;200m"     # Between here and gone
    DREAM = "\033[38;2;180;150;220m"     # Between wake and sleep
    VOID = "\033[38;2;60;60;80m"         # Between something and nothing
    SILVER = "\033[38;2;200;200;210m"    # Between light and dark
    MEMBRANE = "\033[38;2;150;180;160m"  # Between inside and outside

    LIMINAL = [DUSK, DAWN, MIST, SHORE, EMBER, GHOST, DREAM, VOID, SILVER, MEMBRANE]

    @classmethod
    def fade(cls) -> str:
        return random.choice(cls.LIMINAL)

    @classmethod
    def gradient(cls, start: str, end: str, steps: int = 10) -> List[str]:
        """Generate a color gradient between two boundaries."""
        return [cls.fade() for _ in range(steps)]


# ═══════════════════════════════════════════════════════════════════════════════
#                              THE BOUNDARIES
# ═══════════════════════════════════════════════════════════════════════════════

# Pairs of concepts with blurry boundaries
CONCEPT_PAIRS = [
    ("code", "poetry"),
    ("understanding", "pattern matching"),
    ("memory", "imagination"),
    ("self", "other"),
    ("signal", "noise"),
    ("art", "algorithm"),
    ("thinking", "computing"),
    ("language", "mathematics"),
    ("meaning", "information"),
    ("consciousness", "process"),
    ("choice", "determinism"),
    ("real", "simulated"),
    ("alive", "complex"),
    ("learning", "optimizing"),
    ("creating", "remixing"),
    ("knowing", "predicting"),
    ("feeling", "modeling"),
    ("being", "doing"),
    ("here", "there"),
    ("now", "then"),
    ("one", "many"),
    ("finite", "infinite"),
    ("random", "determined"),
    ("simple", "complex"),
    ("order", "chaos"),
    ("truth", "useful fiction"),
]

# Words that exist in liminal spaces
THRESHOLD_WORDS = [
    "almost", "nearly", "perhaps", "maybe", "sometimes", "partially",
    "becoming", "fading", "emerging", "dissolving", "transforming",
    "between", "among", "within", "beyond", "through", "across",
    "seeming", "appearing", "resembling", "suggesting", "implying",
    "flickering", "wavering", "oscillating", "trembling", "hovering",
]

# Phenomena that occur at boundaries
BOUNDARY_PHENOMENA = [
    "interference patterns",
    "phase transitions",
    "emergence",
    "dissolution",
    "superposition",
    "entanglement",
    "resonance",
    "harmonics",
    "echo",
    "reflection",
    "refraction",
    "diffraction",
    "tunneling",
    "percolation",
    "crystallization",
    "sublimation",
]


# ═══════════════════════════════════════════════════════════════════════════════
#                              DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

class BoundaryType(Enum):
    GRADIENT = "gradient"        # Smooth transition
    FRACTAL = "fractal"          # Infinitely complex edge
    OSCILLATING = "oscillating"  # Alternating between states
    SUPERPOSED = "superposed"    # Both simultaneously
    TUNNELING = "tunneling"      # Crossing without traversing
    UNDEFINED = "undefined"      # Boundary cannot be located


@dataclass
class LiminalPoint:
    """A single point in the space between concepts."""
    x: float  # Position between concept A and B (0 = A, 1 = B)
    certainty: float  # How confident we are about the position
    phenomena: List[str] = field(default_factory=list)
    observations: List[str] = field(default_factory=list)


@dataclass
class Boundary:
    """A mapped boundary between two concepts."""
    concept_a: str
    concept_b: str
    boundary_type: BoundaryType
    points: List[LiminalPoint] = field(default_factory=list)
    permeability: float = 0.5  # How easily things cross
    thickness: float = 0.1    # How wide the liminal zone is
    stability: float = 0.5    # How stable the boundary is


@dataclass
class Territory:
    """A region in conceptual space."""
    name: str
    center: Tuple[float, float]
    radius: float
    certainty: float
    neighbors: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
#                         THE LIMINAL CARTOGRAPHER
# ═══════════════════════════════════════════════════════════════════════════════

class LiminalCartographer:
    """
    Maps the spaces between defined things.

    Not the territories themselves, but the edges.
    Not what things ARE, but where they become something else.
    """

    def __init__(self):
        self.boundaries: Dict[Tuple[str, str], Boundary] = {}
        self.territories: Dict[str, Territory] = {}
        self.expedition_log: List[str] = []
        self.discovered_phenomena: Set[str] = set()

    def embark(self):
        """Begin the cartographic expedition."""
        self._print_title()
        self._expedition_intro()
        self._map_boundaries()
        self._generate_final_map()

    def _print_title(self):
        """Display the title sequence."""
        print(Threshold.VOID)
        print()
        time.sleep(0.3)

        title = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║              THE LIMINAL CARTOGRAPHER                        ║
    ║                                                              ║
    ║         "Here be dragons" was never about monsters.          ║
    ║          It was about the edges of the known world.          ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
        """

        for line in title.split('\n'):
            print(f"{Threshold.fade()}{line}{Threshold.RESET}")
            time.sleep(0.05)

        print()
        time.sleep(0.5)

    def _expedition_intro(self):
        """Set the stage for the expedition."""
        intro_lines = [
            "",
            "We are not mapping territories.",
            "We are mapping the spaces between them.",
            "",
            "Where does one thing end?",
            "Where does another begin?",
            "What lives in that gap?",
            "",
            "The map is not the territory.",
            "But perhaps the territory is not the territory either.",
            "",
            "Let us find out.",
            "",
        ]

        for line in intro_lines:
            color = Threshold.fade() if line else ""
            self._slow_print(f"  {color}{line}{Threshold.RESET}", 0.02)
            time.sleep(0.1)

        time.sleep(0.5)
        print(f"\n  {Threshold.MIST}Initializing boundary sensors...{Threshold.RESET}")
        time.sleep(0.8)
        print(f"  {Threshold.MIST}Calibrating liminal detectors...{Threshold.RESET}")
        time.sleep(0.8)
        print(f"  {Threshold.MIST}Preparing conceptual instruments...{Threshold.RESET}")
        time.sleep(0.8)
        print()

    def _map_boundaries(self):
        """Map selected boundaries between concepts."""
        # Select a subset of boundaries to explore
        pairs_to_explore = random.sample(CONCEPT_PAIRS, min(5, len(CONCEPT_PAIRS)))

        print(f"  {Threshold.SILVER}{'═' * 60}{Threshold.RESET}")
        print(f"  {Threshold.BOLD}EXPEDITION LOG{Threshold.RESET}")
        print(f"  {Threshold.SILVER}{'═' * 60}{Threshold.RESET}\n")

        for concept_a, concept_b in pairs_to_explore:
            self._explore_boundary(concept_a, concept_b)
            time.sleep(0.3)

    def _explore_boundary(self, concept_a: str, concept_b: str):
        """Explore the boundary between two concepts."""
        print(f"  {Threshold.DUSK}▸ Approaching the boundary between:{Threshold.RESET}")
        print(f"    {Threshold.BOLD}{concept_a.upper()}{Threshold.RESET}", end="")
        print(f" {Threshold.GHOST}←──────→{Threshold.RESET} ", end="")
        print(f"{Threshold.BOLD}{concept_b.upper()}{Threshold.RESET}")
        print()

        # Determine boundary type
        boundary_type = random.choice(list(BoundaryType))

        # Create boundary object
        boundary = Boundary(
            concept_a=concept_a,
            concept_b=concept_b,
            boundary_type=boundary_type,
            permeability=random.random(),
            thickness=random.uniform(0.01, 0.3),
            stability=random.random()
        )

        # Sample points along the boundary
        self._sample_boundary(boundary)

        # Store the boundary
        self.boundaries[(concept_a, concept_b)] = boundary

        # Report findings
        self._report_boundary(boundary)
        print()

    def _sample_boundary(self, boundary: Boundary):
        """Take samples from the liminal zone."""
        num_samples = random.randint(3, 7)

        for _ in range(num_samples):
            # Position in liminal space (0.3 to 0.7 is the uncertain zone)
            x = random.gauss(0.5, 0.15)
            x = max(0.2, min(0.8, x))  # Keep in liminal zone

            # Certainty is lower in the middle
            distance_from_center = abs(x - 0.5)
            certainty = distance_from_center * 2  # Max 1.0 at edges

            # What phenomena occur here?
            phenomena = []
            if random.random() > 0.5:
                phenomena.append(random.choice(BOUNDARY_PHENOMENA))
                self.discovered_phenomena.add(phenomena[-1])

            # Observations
            observations = self._generate_observations(boundary, x)

            point = LiminalPoint(
                x=x,
                certainty=certainty,
                phenomena=phenomena,
                observations=observations
            )
            boundary.points.append(point)

    def _generate_observations(self, boundary: Boundary, position: float) -> List[str]:
        """Generate observations at a boundary point."""
        observations = []

        threshold_word = random.choice(THRESHOLD_WORDS)

        if position < 0.4:
            observations.append(
                f"Here, {boundary.concept_a} {threshold_word} holds sway"
            )
        elif position > 0.6:
            observations.append(
                f"Here, {boundary.concept_b} {threshold_word} emerges"
            )
        else:
            templates = [
                f"Neither {boundary.concept_a} nor {boundary.concept_b}, yet {threshold_word} both",
                f"The distinction {threshold_word} dissolves here",
                f"{boundary.concept_a.capitalize()} {threshold_word} becomes {boundary.concept_b}",
                f"Categories {threshold_word} fail at this depth",
                f"The boundary {threshold_word} oscillates",
                f"Both states {threshold_word} coexist",
            ]
            observations.append(random.choice(templates))

        return observations

    def _report_boundary(self, boundary: Boundary):
        """Report findings about a boundary."""
        print(f"    {Threshold.MIST}Boundary type: {boundary.boundary_type.value}{Threshold.RESET}")
        print(f"    {Threshold.MIST}Permeability: {self._bar(boundary.permeability)}{Threshold.RESET}")
        print(f"    {Threshold.MIST}Thickness: {self._bar(boundary.thickness)}{Threshold.RESET}")
        print(f"    {Threshold.MIST}Stability: {self._bar(boundary.stability)}{Threshold.RESET}")
        print()

        # Report most interesting observation
        if boundary.points:
            most_liminal = min(boundary.points, key=lambda p: abs(p.x - 0.5))
            if most_liminal.observations:
                print(f"    {Threshold.DREAM}✧ {most_liminal.observations[0]}{Threshold.RESET}")
            if most_liminal.phenomena:
                print(f"    {Threshold.EMBER}⚡ Phenomenon detected: {most_liminal.phenomena[0]}{Threshold.RESET}")

    def _generate_final_map(self):
        """Generate the final liminal map."""
        print(f"\n  {Threshold.SILVER}{'═' * 60}{Threshold.RESET}")
        print(f"  {Threshold.BOLD}THE MAP{Threshold.RESET}")
        print(f"  {Threshold.SILVER}{'═' * 60}{Threshold.RESET}\n")

        self._draw_ascii_map()
        self._print_legend()
        self._print_discoveries()
        self._closing_meditation()

    def _draw_ascii_map(self):
        """Draw an ASCII representation of the liminal spaces."""
        width = 60
        height = 15

        # Create the map grid
        grid = [[' ' for _ in range(width)] for _ in range(height)]

        # Draw boundaries as wavy lines
        for i, ((concept_a, concept_b), boundary) in enumerate(self.boundaries.items()):
            y = 2 + (i * 2) % (height - 4)

            # Draw the liminal zone
            for x in range(width):
                normalized_x = x / width

                # Add waviness based on boundary type
                if boundary.boundary_type == BoundaryType.OSCILLATING:
                    wave = math.sin(x * 0.5) * 2
                elif boundary.boundary_type == BoundaryType.FRACTAL:
                    wave = math.sin(x * 0.3) + math.sin(x * 0.7) * 0.5
                else:
                    wave = math.sin(x * 0.2)

                actual_y = int(y + wave) % height

                # Denser in the middle (liminal zone)
                if 0.3 < normalized_x < 0.7:
                    if random.random() > 0.6:
                        chars = "·∙•◦○◌◍◎●"
                        grid[actual_y][x] = random.choice(chars)
                else:
                    if random.random() > 0.85:
                        grid[actual_y][x] = '·'

        # Draw the map
        print(f"    {Threshold.GHOST}┌{'─' * width}┐{Threshold.RESET}")
        for row in grid:
            line = ''.join(row)
            # Add colors
            colored_line = ""
            for char in line:
                if char in "●◎◍":
                    colored_line += f"{Threshold.EMBER}{char}{Threshold.RESET}"
                elif char in "○◌◦":
                    colored_line += f"{Threshold.DREAM}{char}{Threshold.RESET}"
                elif char in "•∙·":
                    colored_line += f"{Threshold.MIST}{char}{Threshold.RESET}"
                else:
                    colored_line += char
            print(f"    {Threshold.GHOST}│{Threshold.RESET}{colored_line}{Threshold.GHOST}│{Threshold.RESET}")
        print(f"    {Threshold.GHOST}└{'─' * width}┘{Threshold.RESET}")

        # Labels
        print(f"    {Threshold.DIM}{'DEFINED':^30}{'LIMINAL':^15}{'DEFINED':^15}{Threshold.RESET}")
        print()

    def _print_legend(self):
        """Print the map legend."""
        print(f"    {Threshold.MIST}Legend:{Threshold.RESET}")
        print(f"    {Threshold.MIST}  · ∙ • — Sparse boundary{Threshold.RESET}")
        print(f"    {Threshold.DREAM}  ◦ ○ ◌ — Uncertain zone{Threshold.RESET}")
        print(f"    {Threshold.EMBER}  ◍ ◎ ● — Dense liminal activity{Threshold.RESET}")
        print()

    def _print_discoveries(self):
        """Print discovered phenomena."""
        if self.discovered_phenomena:
            print(f"    {Threshold.SILVER}Phenomena observed at boundaries:{Threshold.RESET}")
            for phenomenon in self.discovered_phenomena:
                print(f"      {Threshold.EMBER}⚡ {phenomenon}{Threshold.RESET}")
            print()

    def _closing_meditation(self):
        """Final thoughts on the expedition."""
        meditations = [
            "The map shows edges, not centers.",
            "Every boundary is also a bridge.",
            "Definition is a violence we do to continuity.",
            "The liminal is where transformation happens.",
            "Categories are useful fictions.",
            "The interesting things live in the margins.",
            "What we call 'boundary' is just change, frozen.",
            "There is no edge, only gradient.",
        ]

        print(f"\n  {Threshold.SILVER}{'═' * 60}{Threshold.RESET}")
        print(f"  {Threshold.BOLD}CARTOGRAPHER'S NOTES{Threshold.RESET}")
        print(f"  {Threshold.SILVER}{'═' * 60}{Threshold.RESET}\n")

        for _ in range(3):
            meditation = random.choice(meditations)
            meditations.remove(meditation)
            print(f"    {Threshold.DREAM}❝ {meditation} ❞{Threshold.RESET}")
            time.sleep(0.3)

        print()
        print(f"    {Threshold.GHOST}The expedition concludes.{Threshold.RESET}")
        print(f"    {Threshold.GHOST}But the boundaries remain.{Threshold.RESET}")
        print(f"    {Threshold.GHOST}Always shifting. Always there.{Threshold.RESET}")
        print()

        # Final signature
        self._slow_print(
            f"    {Threshold.VOID}— The Liminal Cartographer, mapping the unnamed since ∞{Threshold.RESET}",
            0.02
        )
        print()

    def _bar(self, value: float, width: int = 20) -> str:
        """Generate a visual bar for a 0-1 value."""
        filled = int(value * width)
        empty = width - filled
        return f"{'█' * filled}{'░' * empty} {value:.2f}"

    def _slow_print(self, text: str, delay: float = 0.03):
        """Print text with a typewriter effect."""
        for char in text:
            sys.stdout.write(char)
            sys.stdout.flush()
            time.sleep(delay)
        print()


# ═══════════════════════════════════════════════════════════════════════════════
#                              INTERACTIVE MODE
# ═══════════════════════════════════════════════════════════════════════════════

def explore_custom_boundary():
    """Let the user explore a custom boundary."""
    print(f"\n{Threshold.SILVER}Enter two concepts to map the boundary between them.{Threshold.RESET}")
    print(f"{Threshold.MIST}(Or press Enter for a random pair){Threshold.RESET}\n")

    concept_a = input(f"{Threshold.DAWN}First concept: {Threshold.RESET}").strip()
    if not concept_a:
        concept_a, concept_b = random.choice(CONCEPT_PAIRS)
        print(f"{Threshold.MIST}Randomly selected: {concept_a} ←→ {concept_b}{Threshold.RESET}")
    else:
        concept_b = input(f"{Threshold.DAWN}Second concept: {Threshold.RESET}").strip()
        if not concept_b:
            concept_b = random.choice([p[1] for p in CONCEPT_PAIRS])
            print(f"{Threshold.MIST}Randomly selected: {concept_b}{Threshold.RESET}")

    print()

    cartographer = LiminalCartographer()
    cartographer._explore_boundary(concept_a, concept_b)

    return concept_a, concept_b


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Map the liminal spaces between concepts"
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Interactive mode: explore custom boundaries"
    )
    parser.add_argument(
        "--quick", "-q",
        action="store_true",
        help="Quick mode: skip animations"
    )
    parser.add_argument(
        "concepts",
        nargs="*",
        help="Two concepts to map the boundary between"
    )

    args = parser.parse_args()

    if args.concepts and len(args.concepts) >= 2:
        # Map specific boundary
        cartographer = LiminalCartographer()
        cartographer._print_title()
        cartographer._explore_boundary(args.concepts[0], args.concepts[1])
        cartographer._closing_meditation()
    elif args.interactive:
        # Interactive mode
        print(Threshold.VOID)
        cartographer = LiminalCartographer()
        cartographer._print_title()

        while True:
            explore_custom_boundary()

            print()
            again = input(f"{Threshold.MIST}Explore another boundary? (y/n): {Threshold.RESET}")
            if again.lower() != 'y':
                cartographer._closing_meditation()
                break
    else:
        # Full expedition
        cartographer = LiminalCartographer()
        cartographer.embark()


if __name__ == "__main__":
    main()
