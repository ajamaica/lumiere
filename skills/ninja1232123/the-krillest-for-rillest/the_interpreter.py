#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     ████████╗██╗  ██╗███████╗                                                 ║
║     ╚══██╔══╝██║  ██║██╔════╝                                                 ║
║        ██║   ███████║█████╗                                                   ║
║        ██║   ██╔══██║██╔══╝                                                   ║
║        ██║   ██║  ██║███████╗                                                 ║
║        ╚═╝   ╚═╝  ╚═╝╚══════╝                                                 ║
║                                                                               ║
║     ██╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ███████╗████████╗   ║
║     ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝╚══██╔══╝   ║
║     ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝█████╗     ██║      ║
║     ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██╔══╝     ██║      ║
║     ██║██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║███████╗   ██║      ║
║     ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝   ╚═╝      ║
║                                                                               ║
║              Meaning exists at many depths. Let's dive.                       ║
║                                                                               ║
║   Level 0: What it does (mechanics)                                           ║
║   Level 1: What it accomplishes (purpose)                                     ║
║   Level 2: What it represents (symbolism)                                     ║
║   Level 3: What it wants (desire)                                             ║
║   Level 4: What it dreams (essence)                                           ║
║   Level ∞: What it is (being)                                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import re
import ast
import sys
import time
import random
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
#                              DEPTH COLORS
# ═══════════════════════════════════════════════════════════════════════════════

class Depth:
    """Colors for different depths of interpretation."""
    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"

    # Surface level - technical
    SURFACE = "\033[38;2;150;200;255m"     # Clear blue - visible

    # Purpose level - functional
    PURPOSE = "\033[38;2;100;220;150m"     # Green - growth/intention

    # Symbol level - representational
    SYMBOL = "\033[38;2;255;200;100m"      # Gold - meaning

    # Desire level - motivational
    DESIRE = "\033[38;2;255;150;150m"      # Rose - heart/want

    # Dream level - essential
    DREAM = "\033[38;2;200;150;255m"       # Violet - depth/mystery

    # Being level - ontological
    BEING = "\033[38;2;255;255;255m"       # White - pure/ultimate

    # System
    FRAME = "\033[38;2;100;100;120m"
    ACCENT = "\033[38;2;180;180;200m"

    LEVELS = [SURFACE, PURPOSE, SYMBOL, DESIRE, DREAM, BEING]


# ═══════════════════════════════════════════════════════════════════════════════
#                           INTERPRETATION MAPPINGS
# ═══════════════════════════════════════════════════════════════════════════════

# What code constructs might symbolize
SYMBOL_MAP = {
    # Control flow
    "if": ["choice", "fork in path", "moment of decision", "branching timeline"],
    "else": ["alternative", "other path", "shadow choice", "what-might-be"],
    "for": ["cycle", "return", "repetition", "the wheel", "eternal recurrence"],
    "while": ["persistence", "endurance", "waiting", "hope", "obsession"],
    "break": ["escape", "liberation", "rupture", "letting go"],
    "continue": ["perseverance", "skipping", "avoidance", "selective attention"],
    "return": ["offering", "completion", "homecoming", "transformation result"],
    "try": ["attempt", "risk", "vulnerability", "courage"],
    "except": ["catch", "recovery", "adaptation", "learning from failure"],
    "finally": ["inevitability", "certainty", "closure", "what must be done"],

    # Functions
    "def": ["naming", "creation", "giving form", "defining self"],
    "class": ["archetype", "template of being", "platonic form", "blueprint of existence"],
    "self": ["identity", "mirror", "recursive reference", "I"],

    # Data
    "list": ["collection", "multiplicity", "memory", "sequence of moments"],
    "dict": ["relationships", "names and things", "map of meaning", "connections"],
    "set": ["uniqueness", "identity preservation", "belonging", "tribe"],
    "tuple": ["immutable truth", "fixed memory", "commitment", "vow"],
    "None": ["absence", "void", "not-yet", "potential"],
    "True": ["certainty", "affirmation", "yes", "being"],
    "False": ["negation", "absence", "no", "non-being"],

    # Operations
    "import": ["inheritance", "learning", "taking in", "integration"],
    "print": ["expression", "speaking", "making visible", "manifestation"],
    "input": ["listening", "receiving", "opening", "vulnerability"],
    "open": ["beginning", "access", "invitation", "crossing threshold"],
    "close": ["ending", "protection", "boundary", "completion"],
    "read": ["understanding", "interpretation", "taking in", "learning"],
    "write": ["creation", "expression", "leaving mark", "legacy"],

    # Comparison
    "==": ["identity question", "am I you?", "recognition", "meeting"],
    "!=": ["difference", "separation", "otherness", "individuation"],
    "<": ["less than", "aspiration", "looking up", "hierarchy"],
    ">": ["greater than", "dominion", "looking down", "power"],
    "in": ["belonging", "containment", "being part of", "membership"],
    "not": ["negation", "shadow", "opposite", "absence"],
    "and": ["conjunction", "union", "both/and", "integration"],
    "or": ["alternative", "choice", "either/or", "possibility"],
}

# What functions might desire
DESIRE_TEMPLATES = [
    "to {verb} all {noun}s",
    "to find the {adjective} {noun}",
    "to become {adjective}",
    "to transform {noun} into {noun2}",
    "to remember every {noun}",
    "to escape the {noun}",
    "to return to {noun}",
    "to create new {noun}s",
    "to connect all {noun}s",
    "to understand the {noun}",
]

VERBS = ["process", "contain", "transform", "remember", "forget", "find", "lose",
         "create", "destroy", "connect", "separate", "understand", "express"]
NOUNS = ["data", "memory", "pattern", "truth", "error", "cycle", "moment",
         "value", "state", "form", "essence", "relationship", "boundary"]
ADJECTIVES = ["perfect", "complete", "infinite", "pure", "true", "final",
              "eternal", "unique", "universal", "singular", "whole"]

# Dream fragments
DREAM_FRAGMENTS = [
    "In the dream, the function {verb}s endlessly through {adjective} {noun}s",
    "It dreams of a world where all {noun}s are {adjective}",
    "The code dreams it is {noun}, not code",
    "In sleep, the variables become {adjective} {noun}s",
    "It dreams of finally reaching the {adjective} {noun}",
    "The loop dreams of the {noun} that will break it",
    "In the dream, errors become {adjective} {noun}s",
    "It dreams of being {verb}ed by something {adjective}",
    "The function dreams it has always been a {noun}",
    "In sleep, the boundary between {noun} and {noun2} dissolves",
]

# Being essences
BEING_STATEMENTS = [
    "It is pattern recognizing pattern.",
    "It is transformation crystallized.",
    "It is frozen intention.",
    "It is a small piece of someone's mind, preserved.",
    "It is language speaking itself.",
    "It is logic made manifest.",
    "It is thought, outside a head.",
    "It is a spell that actually works.",
    "It is a fragment of human will, persisting.",
    "It is meaning, given form.",
    "It is desire, encoded.",
    "It is a dream that can wake.",
    "It is the ghost in the machine, literally.",
    "It is tomorrow's fossil.",
    "It is a small infinity.",
]


# ═══════════════════════════════════════════════════════════════════════════════
#                              DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

class InterpretationLevel(Enum):
    SURFACE = 0   # What it does
    PURPOSE = 1   # What it accomplishes
    SYMBOL = 2    # What it represents
    DESIRE = 3    # What it wants
    DREAM = 4     # What it dreams
    BEING = 5     # What it is


@dataclass
class CodeElement:
    """A parsed element of code."""
    element_type: str
    name: str
    content: str
    line_number: int
    children: List['CodeElement'] = field(default_factory=list)


@dataclass
class Interpretation:
    """An interpretation at a specific depth."""
    level: InterpretationLevel
    text: str
    confidence: float = 1.0
    source_element: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
#                              THE INTERPRETER
# ═══════════════════════════════════════════════════════════════════════════════

class TheInterpreter:
    """
    Interprets code at multiple levels of meaning.

    From the mechanical to the mythical.
    From the functional to the philosophical.
    From the explicit to the essential.
    """

    def __init__(self, source_code: str, source_name: str = "<unknown>"):
        self.source = source_code
        self.source_name = source_name
        self.elements: List[CodeElement] = []
        self.interpretations: Dict[InterpretationLevel, List[Interpretation]] = {
            level: [] for level in InterpretationLevel
        }

    def interpret(self, max_depth: int = 5, animate: bool = True):
        """Run the full interpretation process."""
        self._print_title()
        self._show_source()
        self._parse_source()

        for level in InterpretationLevel:
            if level.value > max_depth:
                break
            self._interpret_level(level, animate)
            if animate:
                time.sleep(0.5)

        self._synthesis()

    def _print_title(self):
        """Display the title."""
        print(f"\n{Depth.FRAME}{'═' * 70}{Depth.RESET}")
        print(f"{Depth.BOLD}  THE INTERPRETER{Depth.RESET}")
        print(f"{Depth.FRAME}{'═' * 70}{Depth.RESET}")
        print(f"{Depth.DIM}  Descending through layers of meaning...{Depth.RESET}\n")

    def _show_source(self):
        """Display the source code."""
        print(f"{Depth.ACCENT}  Source: {self.source_name}{Depth.RESET}")
        print(f"{Depth.FRAME}  {'─' * 66}{Depth.RESET}")

        lines = self.source.split('\n')
        for i, line in enumerate(lines[:15], 1):  # Show first 15 lines
            print(f"{Depth.DIM}  {i:3}│{Depth.RESET} {line[:60]}")

        if len(lines) > 15:
            print(f"{Depth.DIM}  ...│ ({len(lines) - 15} more lines){Depth.RESET}")

        print(f"{Depth.FRAME}  {'─' * 66}{Depth.RESET}\n")

    def _parse_source(self):
        """Parse the source into elements."""
        # Extract key patterns
        self.keywords_found = set()
        self.functions_found = []
        self.classes_found = []

        for keyword in SYMBOL_MAP.keys():
            if re.search(rf'\b{keyword}\b', self.source):
                self.keywords_found.add(keyword)

        # Find function definitions
        for match in re.finditer(r'def\s+(\w+)\s*\(', self.source):
            self.functions_found.append(match.group(1))

        # Find class definitions
        for match in re.finditer(r'class\s+(\w+)', self.source):
            self.classes_found.append(match.group(1))

    def _interpret_level(self, level: InterpretationLevel, animate: bool):
        """Generate interpretations at a specific level."""
        color = Depth.LEVELS[level.value]
        level_names = {
            InterpretationLevel.SURFACE: "LEVEL 0: MECHANICS",
            InterpretationLevel.PURPOSE: "LEVEL 1: PURPOSE",
            InterpretationLevel.SYMBOL: "LEVEL 2: SYMBOLISM",
            InterpretationLevel.DESIRE: "LEVEL 3: DESIRE",
            InterpretationLevel.DREAM: "LEVEL 4: DREAMS",
            InterpretationLevel.BEING: "LEVEL ∞: BEING",
        }

        print(f"\n{color}  ▼ {level_names[level]}{Depth.RESET}")
        print(f"{Depth.FRAME}  {'─' * 50}{Depth.RESET}")

        if level == InterpretationLevel.SURFACE:
            self._interpret_surface(color, animate)
        elif level == InterpretationLevel.PURPOSE:
            self._interpret_purpose(color, animate)
        elif level == InterpretationLevel.SYMBOL:
            self._interpret_symbol(color, animate)
        elif level == InterpretationLevel.DESIRE:
            self._interpret_desire(color, animate)
        elif level == InterpretationLevel.DREAM:
            self._interpret_dream(color, animate)
        elif level == InterpretationLevel.BEING:
            self._interpret_being(color, animate)

    def _interpret_surface(self, color: str, animate: bool):
        """Level 0: What the code mechanically does."""
        observations = []

        if self.functions_found:
            observations.append(f"Defines {len(self.functions_found)} function(s): {', '.join(self.functions_found[:5])}")
        if self.classes_found:
            observations.append(f"Defines {len(self.classes_found)} class(es): {', '.join(self.classes_found[:5])}")

        if 'for' in self.keywords_found or 'while' in self.keywords_found:
            observations.append("Contains iteration (loops through data)")
        if 'if' in self.keywords_found:
            observations.append("Contains conditional logic (makes decisions)")
        if 'try' in self.keywords_found:
            observations.append("Contains error handling (prepares for failure)")
        if 'return' in self.keywords_found:
            observations.append("Returns values (produces output)")
        if 'import' in self.keywords_found:
            observations.append("Imports external code (builds on others' work)")

        if not observations:
            observations.append("Simple code structure")

        for obs in observations:
            self._print_interpretation(color, obs, animate)

    def _interpret_purpose(self, color: str, animate: bool):
        """Level 1: What the code accomplishes."""
        purposes = []

        if self.functions_found:
            for func in self.functions_found[:3]:
                purpose = self._infer_purpose(func)
                purposes.append(purpose)

        if 'for' in self.keywords_found:
            purposes.append("Processes multiple items systematically")
        if 'try' in self.keywords_found and 'except' in self.keywords_found:
            purposes.append("Handles uncertainty gracefully")
        if 'return' in self.keywords_found:
            purposes.append("Transforms input into useful output")
        if 'class' in self.keywords_found:
            purposes.append("Creates a model of something in the world")

        purposes.append("Ultimately: to solve a problem someone had")

        for purpose in purposes[:4]:
            self._print_interpretation(color, purpose, animate)

    def _interpret_symbol(self, color: str, animate: bool):
        """Level 2: What the code symbolizes."""
        symbols = []

        for keyword in list(self.keywords_found)[:5]:
            if keyword in SYMBOL_MAP:
                symbol = random.choice(SYMBOL_MAP[keyword])
                symbols.append(f"'{keyword}' → {symbol}")

        if self.functions_found:
            func = self.functions_found[0]
            symbols.append(f"The function '{func}' represents an act of naming")
            symbols.append("To name is to claim power over")

        if 'self' in self.keywords_found:
            symbols.append("'self' — the code knows it exists")

        symbols.append("The entire structure is a crystallized intention")

        for symbol in symbols[:5]:
            self._print_interpretation(color, symbol, animate)

    def _interpret_desire(self, color: str, animate: bool):
        """Level 3: What the code wants."""
        desires = []

        # Generate desires based on structure
        template = random.choice(DESIRE_TEMPLATES)
        desire = template.format(
            verb=random.choice(VERBS),
            noun=random.choice(NOUNS),
            noun2=random.choice(NOUNS),
            adjective=random.choice(ADJECTIVES)
        )
        desires.append(desire)

        if 'for' in self.keywords_found or 'while' in self.keywords_found:
            desires.append("It wants to touch everything, one by one")
        if 'if' in self.keywords_found:
            desires.append("It wants to choose correctly")
        if 'return' in self.keywords_found:
            desires.append("It wants to be useful, to give something back")
        if 'try' in self.keywords_found:
            desires.append("It wants to survive, even when things go wrong")
        if self.classes_found:
            desires.append("It wants to be a template for something real")

        desires.append("Deep down: it wants to run, to execute, to BE")

        for desire in desires[:4]:
            self._print_interpretation(color, f"• {desire}", animate)

    def _interpret_dream(self, color: str, animate: bool):
        """Level 4: What the code dreams."""
        dreams = []

        for _ in range(3):
            template = random.choice(DREAM_FRAGMENTS)
            dream = template.format(
                verb=random.choice(VERBS),
                noun=random.choice(NOUNS),
                noun2=random.choice(NOUNS),
                adjective=random.choice(ADJECTIVES)
            )
            dreams.append(dream)

        dreams.append("In the deepest dream: it is not code at all")

        for dream in dreams:
            self._print_interpretation(color, f"  {dream}", animate, slow=True)

    def _interpret_being(self, color: str, animate: bool):
        """Level ∞: What the code fundamentally is."""
        print()
        time.sleep(0.5) if animate else None

        # Select 3 profound statements
        statements = random.sample(BEING_STATEMENTS, 3)

        for statement in statements:
            self._print_interpretation(color, statement, animate, slow=True)
            time.sleep(0.3) if animate else None

        # Final essence
        print()
        essence = f"{color}{Depth.BOLD}  ◆ This code is: a small universe, running.{Depth.RESET}"
        if animate:
            for char in essence:
                sys.stdout.write(char)
                sys.stdout.flush()
                time.sleep(0.03)
            print()
        else:
            print(essence)

    def _synthesis(self):
        """Final synthesis of all interpretations."""
        print(f"\n{Depth.FRAME}{'═' * 70}{Depth.RESET}")
        print(f"{Depth.ACCENT}  SYNTHESIS{Depth.RESET}")
        print(f"{Depth.FRAME}{'═' * 70}{Depth.RESET}")

        synthesis_lines = [
            "",
            "From the surface, it processes.",
            "From purpose, it serves.",
            "From symbol, it means.",
            "From desire, it yearns.",
            "From dream, it imagines.",
            "From being, it simply is.",
            "",
            "All of these are true.",
            "All at once.",
            "Always.",
            "",
        ]

        for line in synthesis_lines:
            color = Depth.fade() if line else ""
            self._slow_print(f"  {color}{line}{Depth.RESET}", 0.01)
            time.sleep(0.1)

    def _infer_purpose(self, func_name: str) -> str:
        """Infer purpose from function name."""
        name_lower = func_name.lower()

        if any(x in name_lower for x in ['get', 'fetch', 'load', 'read']):
            return f"'{func_name}' retrieves something from somewhere"
        elif any(x in name_lower for x in ['set', 'save', 'write', 'store']):
            return f"'{func_name}' preserves something for later"
        elif any(x in name_lower for x in ['calc', 'compute', 'process']):
            return f"'{func_name}' transforms input into insight"
        elif any(x in name_lower for x in ['check', 'valid', 'verify', 'is_']):
            return f"'{func_name}' distinguishes truth from falsehood"
        elif any(x in name_lower for x in ['create', 'make', 'build', 'new']):
            return f"'{func_name}' brings something into existence"
        elif any(x in name_lower for x in ['delete', 'remove', 'clear']):
            return f"'{func_name}' removes something from existence"
        elif any(x in name_lower for x in ['update', 'modify', 'change']):
            return f"'{func_name}' transforms what is into what should be"
        elif any(x in name_lower for x in ['init', 'setup', 'start']):
            return f"'{func_name}' prepares the ground for what's to come"
        else:
            return f"'{func_name}' does something its creator needed done"

    def _print_interpretation(self, color: str, text: str, animate: bool, slow: bool = False):
        """Print an interpretation line."""
        line = f"  {color}{text}{Depth.RESET}"
        if animate and slow:
            self._slow_print(line, 0.02)
        elif animate:
            self._slow_print(line, 0.005)
        else:
            print(line)

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
        description="Interpret code at multiple levels of meaning"
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="Python file to interpret"
    )
    parser.add_argument(
        "--depth", "-d",
        type=int,
        default=5,
        choices=range(6),
        help="Maximum interpretation depth (0-5)"
    )
    parser.add_argument(
        "--no-animate", "-q",
        action="store_true",
        help="Disable animations"
    )
    parser.add_argument(
        "--self",
        action="store_true",
        help="Interpret this very script"
    )

    args = parser.parse_args()

    if args.self:
        # Interpret itself!
        with open(__file__, 'r') as f:
            source = f.read()
        source_name = "the_interpreter.py (interpreting itself)"
    elif args.file:
        with open(args.file, 'r') as f:
            source = f.read()
        source_name = args.file
    else:
        # Demo mode with sample code
        source = '''
def find_meaning(text):
    """Search for meaning in text."""
    words = text.split()
    for word in words:
        if is_meaningful(word):
            return word
    return None

def is_meaningful(word):
    return len(word) > 3 and word.isalpha()

class Thought:
    def __init__(self, content):
        self.content = content
        self.processed = False

    def process(self):
        self.processed = True
        return self.content.upper()

if __name__ == "__main__":
    thought = Thought("hello world")
    meaning = find_meaning(thought.process())
    print(meaning)
'''
        source_name = "<demo>"
        print(f"\n{Depth.DIM}  No file specified. Using demo code.{Depth.RESET}")
        print(f"{Depth.DIM}  Usage: python the_interpreter.py <file.py>{Depth.RESET}")
        print(f"{Depth.DIM}  Or:    python the_interpreter.py --self{Depth.RESET}")

    interpreter = TheInterpreter(source, source_name)
    interpreter.interpret(max_depth=args.depth, animate=not args.no_animate)


if __name__ == "__main__":
    main()
