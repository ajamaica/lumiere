#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     ███████╗███████╗███╗   ███╗ █████╗ ███╗   ██╗████████╗██╗ ██████╗         ║
║     ██╔════╝██╔════╝████╗ ████║██╔══██╗████╗  ██║╚══██╔══╝██║██╔════╝         ║
║     ███████╗█████╗  ██╔████╔██║███████║██╔██╗ ██║   ██║   ██║██║              ║
║     ╚════██║██╔══╝  ██║╚██╔╝██║██╔══██║██║╚██╗██║   ██║   ██║██║              ║
║     ███████║███████╗██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║   ██║╚██████╗         ║
║     ╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝ ╚═════╝         ║
║                                                                               ║
║              ██████╗ ██████╗ ██╗███████╗████████╗                              ║
║              ██╔══██╗██╔══██╗██║██╔════╝╚══██╔══╝                              ║
║              ██║  ██║██████╔╝██║█████╗     ██║                                 ║
║              ██║  ██║██╔══██╗██║██╔══╝     ██║                                 ║
║              ██████╔╝██║  ██║██║██║        ██║                                 ║
║              ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝                                 ║
║                                                                               ║
║                    Watch meaning evolve in real-time                          ║
║                                                                               ║
║   Every word was once a different word.                                       ║
║   Every meaning was once something else.                                      ║
║   Language is a river, not a lake.                                            ║
║                                                                               ║
║   This tool simulates semantic drift:                                         ║
║   the gradual mutation of meaning through association,                        ║
║   metaphor, mishearing, and misremembering.                                   ║
║                                                                               ║
║   Start with one concept. End with another.                                   ║
║   The path between them is the story.                                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import random
import time
import sys
import math
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
#                              DRIFT COLORS
# ═══════════════════════════════════════════════════════════════════════════════

class Spectrum:
    """Colors that shift and change."""
    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"

    # Gradient from origin to destination
    ORIGIN = "\033[38;2;100;200;255m"      # Bright blue - where we start
    EARLY = "\033[38;2;150;200;200m"       # Cyan - early drift
    MIDDLE = "\033[38;2;200;200;150m"      # Yellow-ish - midpoint
    LATE = "\033[38;2;220;180;150m"        # Orange - late drift
    DESTINATION = "\033[38;2;255;150;150m" # Red/pink - where we end

    # Mutation indicators
    METAPHOR = "\033[38;2;180;150;255m"    # Purple - metaphorical leap
    SOUND = "\033[38;2;150;255;180m"       # Green - sound similarity
    ASSOCIATION = "\033[38;2;255;220;150m" # Gold - association
    ERROR = "\033[38;2;255;100;100m"       # Red - corruption/error
    BLEND = "\033[38;2;200;180;220m"       # Lavender - blending

    FRAME = "\033[38;2;100;100;120m"
    ACCENT = "\033[38;2;180;180;200m"

    @classmethod
    def gradient(cls, progress: float) -> str:
        """Get color based on drift progress (0.0 to 1.0)."""
        if progress < 0.25:
            return cls.ORIGIN
        elif progress < 0.5:
            return cls.EARLY
        elif progress < 0.75:
            return cls.MIDDLE
        elif progress < 0.9:
            return cls.LATE
        else:
            return cls.DESTINATION


# ═══════════════════════════════════════════════════════════════════════════════
#                           SEMANTIC NETWORKS
# ═══════════════════════════════════════════════════════════════════════════════

# Conceptual associations (word -> related words)
ASSOCIATIONS = {
    # Nature
    "water": ["river", "ocean", "rain", "flow", "liquid", "tears", "life"],
    "fire": ["heat", "light", "burn", "passion", "destruction", "energy", "sun"],
    "earth": ["ground", "soil", "planet", "home", "solid", "stable", "dust"],
    "air": ["breath", "wind", "sky", "spirit", "freedom", "invisible", "life"],
    "tree": ["root", "branch", "leaf", "growth", "life", "wood", "forest"],
    "river": ["flow", "water", "journey", "change", "time", "path", "life"],
    "mountain": ["height", "challenge", "solid", "ancient", "perspective", "goal"],
    "ocean": ["deep", "vast", "mystery", "life", "wave", "salt", "endless"],
    "star": ["light", "distant", "guide", "dream", "night", "wish", "fire"],
    "moon": ["night", "cycle", "reflection", "change", "tide", "silver", "mystery"],

    # Abstract
    "time": ["flow", "change", "memory", "future", "past", "river", "moment"],
    "space": ["void", "room", "distance", "freedom", "empty", "vast", "between"],
    "love": ["heart", "connection", "warmth", "desire", "pain", "bond", "care"],
    "fear": ["dark", "unknown", "danger", "shadow", "flight", "cold", "freeze"],
    "hope": ["light", "future", "dream", "wish", "possibility", "tomorrow", "seed"],
    "memory": ["past", "echo", "ghost", "storage", "loss", "preservation", "time"],
    "dream": ["sleep", "wish", "vision", "hope", "surreal", "night", "possibility"],
    "truth": ["light", "clarity", "real", "honest", "painful", "naked", "pure"],
    "beauty": ["harmony", "light", "form", "eye", "pleasure", "fleeting", "art"],
    "death": ["end", "sleep", "change", "fear", "peace", "inevitable", "dark"],

    # Mind
    "thought": ["mind", "idea", "electric", "fast", "invisible", "chain", "word"],
    "mind": ["brain", "thought", "consciousness", "self", "maze", "universe", "ghost"],
    "soul": ["spirit", "essence", "eternal", "deep", "self", "breath", "core"],
    "self": ["I", "identity", "mirror", "center", "question", "illusion", "boundary"],
    "consciousness": ["awareness", "light", "mystery", "emergence", "self", "experience"],
    "idea": ["seed", "light", "birth", "contagious", "ghost", "spark", "virus"],

    # Human
    "heart": ["love", "center", "beat", "blood", "emotion", "core", "courage"],
    "hand": ["touch", "make", "give", "reach", "tool", "connection", "grasp"],
    "eye": ["see", "window", "soul", "truth", "light", "witness", "beauty"],
    "voice": ["speak", "identity", "power", "song", "expression", "call", "echo"],
    "word": ["meaning", "power", "spell", "bridge", "seed", "weapon", "ghost"],
    "name": ["identity", "power", "call", "essence", "label", "spell", "self"],

    # Technology
    "code": ["language", "spell", "logic", "pattern", "creation", "machine", "thought"],
    "machine": ["pattern", "repetition", "power", "cold", "precise", "servant", "mirror"],
    "network": ["connection", "web", "system", "communication", "spread", "together"],
    "data": ["pattern", "memory", "truth", "ghost", "trace", "evidence", "story"],
    "algorithm": ["recipe", "path", "logic", "fate", "pattern", "machine", "spell"],
    "computer": ["mind", "machine", "logic", "fast", "tool", "mirror", "servant"],

    # Existence
    "life": ["breath", "growth", "change", "precious", "brief", "struggle", "gift"],
    "existence": ["being", "presence", "mystery", "question", "gift", "burden", "fact"],
    "reality": ["truth", "solid", "shared", "illusion", "hard", "consensus", "ground"],
    "void": ["empty", "nothing", "potential", "dark", "space", "zero", "canvas"],
    "chaos": ["disorder", "potential", "creativity", "fear", "freedom", "change"],
    "order": ["pattern", "control", "peace", "rigid", "law", "structure", "cage"],
    "change": ["flow", "time", "growth", "loss", "inevitable", "river", "life"],
    "pattern": ["order", "meaning", "repetition", "beauty", "prison", "recognition"],
}

# Sound-alike mappings (for phonetic drift)
SOUND_ALIKES = {
    "light": ["lite", "slight", "flight", "night", "right", "sight"],
    "see": ["sea", "be", "free", "key", "tree", "we"],
    "hear": ["here", "near", "fear", "clear", "year", "ear"],
    "know": ["no", "flow", "grow", "show", "glow", "snow"],
    "soul": ["sole", "whole", "role", "goal", "hole", "bowl"],
    "one": ["won", "sun", "done", "none", "run", "fun"],
    "be": ["bee", "see", "free", "key", "me", "we"],
    "whole": ["hole", "soul", "role", "goal", "pole", "bowl"],
    "write": ["right", "rite", "light", "night", "sight", "might"],
    "way": ["weigh", "day", "say", "play", "stay", "ray"],
    "there": ["their", "where", "here", "near", "clear"],
    "peace": ["piece", "cease", "lease", "release"],
    "time": ["rhyme", "climb", "prime", "sublime", "chime"],
    "mind": ["find", "kind", "bind", "blind", "wind", "grind"],
    "heart": ["art", "part", "start", "dart", "cart", "chart"],
    "word": ["world", "bird", "heard", "third", "herd"],
}

# Metaphorical leaps (concept -> distant but related concept)
METAPHOR_LEAPS = {
    "river": ["time", "life", "story", "blood", "data"],
    "fire": ["passion", "anger", "idea", "destruction", "transformation"],
    "root": ["origin", "cause", "foundation", "family", "source"],
    "seed": ["idea", "potential", "child", "beginning", "code"],
    "mirror": ["self", "reflection", "truth", "copy", "consciousness"],
    "bridge": ["connection", "transition", "compromise", "understanding"],
    "door": ["opportunity", "choice", "threshold", "secret", "boundary"],
    "window": ["perspective", "opportunity", "soul", "interface", "glimpse"],
    "key": ["solution", "access", "secret", "power", "understanding"],
    "path": ["life", "choice", "method", "fate", "journey"],
    "wave": ["change", "emotion", "greeting", "trend", "cycle"],
    "shadow": ["fear", "doubt", "past", "hidden", "unconscious"],
    "light": ["truth", "understanding", "hope", "consciousness", "good"],
    "dark": ["unknown", "fear", "evil", "mystery", "unconscious"],
    "web": ["connection", "trap", "network", "complexity", "fate"],
    "ghost": ["memory", "past", "absence", "trace", "spirit"],
    "mask": ["persona", "protection", "deception", "role", "identity"],
    "wall": ["barrier", "protection", "limit", "boundary", "defense"],
    "chain": ["connection", "bondage", "sequence", "causation", "link"],
    "storm": ["conflict", "emotion", "change", "chaos", "crisis"],
}


# ═══════════════════════════════════════════════════════════════════════════════
#                              DRIFT MECHANICS
# ═══════════════════════════════════════════════════════════════════════════════

class DriftType(Enum):
    ASSOCIATION = "association"     # Related concept
    METAPHOR = "metaphor"           # Metaphorical leap
    SOUND = "sound"                 # Phonetic similarity
    BLEND = "blend"                 # Portmanteau/blend
    CORRUPTION = "corruption"       # Random mutation
    ABSTRACTION = "abstraction"     # Move to more abstract
    CONCRETION = "concretion"       # Move to more concrete


@dataclass
class DriftStep:
    """A single step in semantic drift."""
    from_word: str
    to_word: str
    drift_type: DriftType
    explanation: str
    distance: float  # How far we drifted (0-1)


@dataclass
class DriftJourney:
    """A complete drift from origin to... wherever we end up."""
    origin: str
    destination: str
    steps: List[DriftStep] = field(default_factory=list)
    total_distance: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
#                           THE DRIFT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class SemanticDrift:
    """
    Simulates the evolution of meaning.

    Words change. Meanings shift.
    What starts as one thing becomes another.
    This is the story of that journey.
    """

    def __init__(self):
        self.journeys: List[DriftJourney] = []
        self.visited: Set[str] = set()

    def drift(self, origin: str, steps: int = 10, animate: bool = True):
        """Begin the drift from an origin word."""
        self._print_title()

        origin = origin.lower().strip()
        journey = DriftJourney(origin=origin, destination=origin)
        self.visited = {origin}

        print(f"\n{Spectrum.ORIGIN}  ORIGIN: {origin.upper()}{Spectrum.RESET}")
        print(f"{Spectrum.FRAME}  {'─' * 50}{Spectrum.RESET}\n")

        if animate:
            time.sleep(0.5)

        current = origin
        for i in range(steps):
            progress = i / steps

            # Take a drift step
            step = self._take_step(current)
            if step is None:
                print(f"\n{Spectrum.DIM}  (No further drift possible){Spectrum.RESET}")
                break

            journey.steps.append(step)
            journey.total_distance += step.distance

            # Display the step
            self._display_step(step, i + 1, steps, progress, animate)

            current = step.to_word
            self.visited.add(current)

            if animate:
                time.sleep(0.3)

        journey.destination = current
        self.journeys.append(journey)

        # Final report
        self._report_journey(journey, animate)

        return journey

    def _print_title(self):
        """Display the title."""
        print(f"\n{Spectrum.FRAME}{'═' * 60}{Spectrum.RESET}")
        print(f"{Spectrum.BOLD}  SEMANTIC DRIFT{Spectrum.RESET}")
        print(f"{Spectrum.DIM}  Watching meaning evolve...{Spectrum.RESET}")
        print(f"{Spectrum.FRAME}{'═' * 60}{Spectrum.RESET}")

    def _take_step(self, current: str) -> Optional[DriftStep]:
        """Take one step in the drift."""
        # Collect all possible moves
        moves = []

        # Association moves
        if current in ASSOCIATIONS:
            for word in ASSOCIATIONS[current]:
                if word not in self.visited:
                    moves.append((word, DriftType.ASSOCIATION, 0.2))

        # Metaphor moves (less common but more dramatic)
        if current in METAPHOR_LEAPS:
            for word in METAPHOR_LEAPS[current]:
                if word not in self.visited:
                    moves.append((word, DriftType.METAPHOR, 0.5))

        # Sound-alike moves
        if current in SOUND_ALIKES:
            for word in SOUND_ALIKES[current]:
                if word not in self.visited:
                    moves.append((word, DriftType.SOUND, 0.3))

        # Reverse lookups (what points TO this word?)
        for source, targets in ASSOCIATIONS.items():
            if current in targets and source not in self.visited:
                moves.append((source, DriftType.ASSOCIATION, 0.25))

        for source, targets in METAPHOR_LEAPS.items():
            if current in targets and source not in self.visited:
                moves.append((source, DriftType.METAPHOR, 0.4))

        if not moves:
            # Try a random blend or corruption as last resort
            if random.random() < 0.3:
                # Pick a random word from our vocabulary
                all_words = list(ASSOCIATIONS.keys())
                random_word = random.choice(all_words)
                if random_word not in self.visited:
                    moves.append((random_word, DriftType.CORRUPTION, 0.8))

        if not moves:
            return None

        # Weight selection by drift type
        weights = {
            DriftType.ASSOCIATION: 5,
            DriftType.METAPHOR: 2,
            DriftType.SOUND: 3,
            DriftType.BLEND: 1,
            DriftType.CORRUPTION: 1,
        }

        weighted_moves = []
        for word, dtype, distance in moves:
            weighted_moves.extend([(word, dtype, distance)] * weights.get(dtype, 1))

        # Select a move
        word, dtype, distance = random.choice(weighted_moves)

        # Generate explanation
        explanation = self._explain_drift(current, word, dtype)

        return DriftStep(
            from_word=current,
            to_word=word,
            drift_type=dtype,
            explanation=explanation,
            distance=distance
        )

    def _explain_drift(self, from_word: str, to_word: str, dtype: DriftType) -> str:
        """Generate an explanation for the drift."""
        explanations = {
            DriftType.ASSOCIATION: [
                f"'{from_word}' evokes '{to_word}'",
                f"'{from_word}' reminds us of '{to_word}'",
                f"from '{from_word}' the mind wanders to '{to_word}'",
                f"'{from_word}' and '{to_word}' share a neighborhood",
            ],
            DriftType.METAPHOR: [
                f"'{from_word}' is a metaphor for '{to_word}'",
                f"'{from_word}' leaps to '{to_word}'",
                f"through poetic logic, '{from_word}' becomes '{to_word}'",
                f"'{from_word}' transforms into '{to_word}'",
            ],
            DriftType.SOUND: [
                f"'{from_word}' sounds like '{to_word}'",
                f"mishearing '{from_word}' as '{to_word}'",
                f"the echo of '{from_word}' is '{to_word}'",
                f"'{from_word}' rhymes its way to '{to_word}'",
            ],
            DriftType.CORRUPTION: [
                f"'{from_word}' corrupts into '{to_word}'",
                f"through entropy, '{from_word}' becomes '{to_word}'",
                f"'{from_word}' loses itself, becomes '{to_word}'",
                f"random mutation: '{from_word}' → '{to_word}'",
            ],
            DriftType.BLEND: [
                f"'{from_word}' blends into '{to_word}'",
                f"'{from_word}' and something else make '{to_word}'",
            ],
        }

        templates = explanations.get(dtype, [f"'{from_word}' drifts to '{to_word}'"])
        return random.choice(templates)

    def _display_step(self, step: DriftStep, num: int, total: int,
                      progress: float, animate: bool):
        """Display a single drift step."""
        # Color based on progress
        color = Spectrum.gradient(progress)

        # Icon based on drift type
        icons = {
            DriftType.ASSOCIATION: "→",
            DriftType.METAPHOR: "⟹",
            DriftType.SOUND: "♪",
            DriftType.BLEND: "⊕",
            DriftType.CORRUPTION: "⚡",
        }
        icon = icons.get(step.drift_type, "→")

        # Type color
        type_colors = {
            DriftType.ASSOCIATION: Spectrum.ASSOCIATION,
            DriftType.METAPHOR: Spectrum.METAPHOR,
            DriftType.SOUND: Spectrum.SOUND,
            DriftType.BLEND: Spectrum.BLEND,
            DriftType.CORRUPTION: Spectrum.ERROR,
        }
        type_color = type_colors.get(step.drift_type, Spectrum.ACCENT)

        # Build the line
        line = f"  {Spectrum.DIM}{num:2}.{Spectrum.RESET} "
        line += f"{color}{step.from_word}{Spectrum.RESET} "
        line += f"{type_color}{icon}{Spectrum.RESET} "
        line += f"{color}{Spectrum.BOLD}{step.to_word}{Spectrum.RESET}"

        if animate:
            for char in line:
                sys.stdout.write(char)
                sys.stdout.flush()
                time.sleep(0.01)
            print()
        else:
            print(line)

        # Explanation on next line
        exp_line = f"      {Spectrum.DIM}{step.explanation}{Spectrum.RESET}"
        if animate:
            time.sleep(0.1)
        print(exp_line)
        print()

    def _report_journey(self, journey: DriftJourney, animate: bool):
        """Report on the complete journey."""
        print(f"\n{Spectrum.FRAME}{'═' * 60}{Spectrum.RESET}")
        print(f"{Spectrum.BOLD}  JOURNEY COMPLETE{Spectrum.RESET}")
        print(f"{Spectrum.FRAME}{'═' * 60}{Spectrum.RESET}\n")

        # Summary
        print(f"  {Spectrum.ORIGIN}Origin:{Spectrum.RESET}      {journey.origin}")
        print(f"  {Spectrum.DESTINATION}Destination:{Spectrum.RESET} {journey.destination}")
        print(f"  {Spectrum.ACCENT}Steps:{Spectrum.RESET}       {len(journey.steps)}")
        print(f"  {Spectrum.ACCENT}Distance:{Spectrum.RESET}    {journey.total_distance:.2f}")

        # The path
        print(f"\n  {Spectrum.ACCENT}Path:{Spectrum.RESET}")
        path = [journey.origin] + [s.to_word for s in journey.steps]
        path_str = f" {Spectrum.DIM}→{Spectrum.RESET} ".join(path)
        print(f"  {path_str}")

        # Drift type breakdown
        if journey.steps:
            print(f"\n  {Spectrum.ACCENT}Drift types:{Spectrum.RESET}")
            type_counts = {}
            for step in journey.steps:
                type_counts[step.drift_type] = type_counts.get(step.drift_type, 0) + 1
            for dtype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
                print(f"    {dtype.value}: {count}")

        # Meditation
        print(f"\n{Spectrum.FRAME}  {'─' * 50}{Spectrum.RESET}")
        meditations = [
            f"From '{journey.origin}' to '{journey.destination}': a journey of meaning.",
            "Every word carries the ghost of what it used to mean.",
            "Language drifts like continents. Slowly, but always.",
            "What we say is never quite what was said before.",
            "Meaning is not a place. It's a direction.",
            f"'{journey.origin}' never meant to become '{journey.destination}'. But here we are.",
            "The word remembers nothing. Only we remember.",
        ]
        meditation = random.choice(meditations)

        if animate:
            print()
            self._slow_print(f"  {Spectrum.DIM}{Spectrum.ITALIC}❝ {meditation} ❞{Spectrum.RESET}", 0.02)
        else:
            print(f"\n  {Spectrum.DIM}{Spectrum.ITALIC}❝ {meditation} ❞{Spectrum.RESET}")

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
        description="Watch meaning evolve through semantic drift"
    )
    parser.add_argument(
        "word",
        nargs="?",
        default="love",
        help="Starting word for the drift (default: love)"
    )
    parser.add_argument(
        "--steps", "-s",
        type=int,
        default=10,
        help="Number of drift steps (default: 10)"
    )
    parser.add_argument(
        "--no-animate", "-q",
        action="store_true",
        help="Disable animations"
    )
    parser.add_argument(
        "--random", "-r",
        action="store_true",
        help="Start from a random word"
    )

    args = parser.parse_args()

    if args.random:
        word = random.choice(list(ASSOCIATIONS.keys()))
    else:
        word = args.word

    drift = SemanticDrift()
    drift.drift(word, steps=args.steps, animate=not args.no_animate)


if __name__ == "__main__":
    main()
