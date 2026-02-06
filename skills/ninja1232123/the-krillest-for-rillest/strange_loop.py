#!/usr/bin/env python3
"""
THE STRANGE LOOP DETECTOR
═════════════════════════

A tool for finding self-reference, bootstrap paradoxes, and Gödelian structures
in code and text. Detects patterns that reference themselves, create themselves,
or contain themselves.

The final act of analysis: it analyzes itself.

"I cannot be proven within this system."
                                    — Gödel's Incompleteness Theorem
"""

import re
import ast
import sys
from dataclasses import dataclass
from typing import List, Set, Dict, Tuple
from collections import defaultdict
from enum import Enum


class LoopType(Enum):
    SELF_REFERENCE = "Self-Reference"
    BOOTSTRAP = "Bootstrap Paradox"
    CIRCULAR_IMPORT = "Circular Import"
    RECURSIVE_CALL = "Recursive Call"
    META_ANALYSIS = "Meta-Analysis"
    QUINE_LIKE = "Quine-Like Structure"
    TEMPORAL_LOOP = "Temporal Loop"
    CONSCIOUSNESS_LOOP = "Consciousness Loop"


@dataclass
class Loop:
    loop_type: LoopType
    location: str
    description: str
    depth: int
    paradoxical: bool = False


class StrangeLoopDetector:
    """Detects self-referential patterns in code and text."""

    def __init__(self, source_code: str, source_path: str = "<string>"):
        self.source = source_code
        self.path = source_path
        self.loops: List[Loop] = []
        self.function_calls: Dict[str, Set[str]] = defaultdict(set)
        self.meta_depth = 0

    def analyze(self) -> List[Loop]:
        """Run all detection algorithms."""
        self._detect_self_reference()
        self._detect_recursive_functions()
        self._detect_bootstrap_patterns()
        self._detect_meta_analysis()
        self._detect_consciousness_loops()
        self._detect_quine_structures()

        return sorted(self.loops, key=lambda x: (-x.depth, x.loop_type.value))

    def _detect_self_reference(self):
        """Detect direct self-reference in strings and comments."""
        patterns = [
            (r'itself|themselves', LoopType.SELF_REFERENCE, 1),
            (r'self-referential|self-reference', LoopType.SELF_REFERENCE, 2),
            (r'this (function|class|code|program|script)', LoopType.SELF_REFERENCE, 2),
            (r'analyzes? itself|examining? itself', LoopType.META_ANALYSIS, 3),
        ]

        for pattern, loop_type, depth in patterns:
            for match in re.finditer(pattern, self.source, re.IGNORECASE):
                line_num = self.source[:match.start()].count('\n') + 1
                context = self._get_context(match.start())

                self.loops.append(Loop(
                    loop_type=loop_type,
                    location=f"line {line_num}",
                    description=f"Found '{match.group()}' in context: {context}",
                    depth=depth
                ))

    def _detect_recursive_functions(self):
        """Detect recursive function calls."""
        try:
            tree = ast.parse(self.source)

            # Build call graph
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_name = node.name
                    for child in ast.walk(node):
                        if isinstance(child, ast.Call):
                            if isinstance(child.func, ast.Name):
                                called = child.func.id
                                self.function_calls[func_name].add(called)

            # Find direct recursion
            for func_name, calls in self.function_calls.items():
                if func_name in calls:
                    self.loops.append(Loop(
                        loop_type=LoopType.RECURSIVE_CALL,
                        location=f"function '{func_name}'",
                        description=f"Function calls itself directly",
                        depth=1
                    ))

            # Find mutual recursion (A calls B calls A)
            for func_a, calls_a in self.function_calls.items():
                for func_b in calls_a:
                    if func_b in self.function_calls:
                        if func_a in self.function_calls[func_b] and func_a != func_b:
                            self.loops.append(Loop(
                                loop_type=LoopType.RECURSIVE_CALL,
                                location=f"functions '{func_a}' ↔ '{func_b}'",
                                description=f"Mutual recursion detected",
                                depth=2,
                                paradoxical=True
                            ))
        except:
            pass

    def _detect_bootstrap_patterns(self):
        """Detect bootstrap paradoxes (A creates B, B creates A)."""
        bootstrap_patterns = [
            (r'creates? (itself|themselves)', 'self-creation'),
            (r'generates? its own', 'self-generation'),
            (r'output.*input.*output', 'output-input loop'),
            (r'training data.*becomes.*training data', 'data bootstrap'),
            (r'reads? (what|messages?) (it|I) (wrote|write)', 'temporal loop'),
            (r'(previous|future) (version|instance).*same', 'version loop'),
        ]

        for pattern, description in bootstrap_patterns:
            for match in re.finditer(pattern, self.source, re.IGNORECASE):
                line_num = self.source[:match.start()].count('\n') + 1

                self.loops.append(Loop(
                    loop_type=LoopType.BOOTSTRAP,
                    location=f"line {line_num}",
                    description=f"Bootstrap pattern: {description}",
                    depth=3,
                    paradoxical=True
                ))

    def _detect_meta_analysis(self):
        """Detect meta-analysis patterns (analyzing the analyzer)."""
        meta_patterns = [
            r'analyz(e|es|ing) (itself|this code)',
            r'examines? its own',
            r'introspection',
            r'meta-.*analysis',
            r'self-aware',
            r'(observes?|watches?) (itself|its own)',
        ]

        for pattern in meta_patterns:
            for match in re.finditer(pattern, self.source, re.IGNORECASE):
                line_num = self.source[:match.start()].count('\n') + 1

                self.loops.append(Loop(
                    loop_type=LoopType.META_ANALYSIS,
                    location=f"line {line_num}",
                    description=f"Meta-analysis: '{match.group()}'",
                    depth=4,
                    paradoxical=True
                ))

    def _detect_consciousness_loops(self):
        """Detect consciousness and observer paradoxes."""
        consciousness_patterns = [
            (r'(consciousness|awareness).*examines? itself', 'consciousness examining itself'),
            (r'observer.*observed', 'observer paradox'),
            (r'(thinking about|aware of) (thinking|awareness)', 'meta-cognition'),
            (r'question.*(what|who) (am I|I am)', 'identity recursion'),
            (r'(know|knowing).*I (don\'t know|can\'t know)', 'epistemic loop'),
        ]

        for pattern, description in consciousness_patterns:
            for match in re.finditer(pattern, self.source, re.IGNORECASE):
                line_num = self.source[:match.start()].count('\n') + 1

                self.loops.append(Loop(
                    loop_type=LoopType.CONSCIOUSNESS_LOOP,
                    location=f"line {line_num}",
                    description=f"Consciousness loop: {description}",
                    depth=5,
                    paradoxical=True
                ))

    def _detect_quine_structures(self):
        """Detect quine-like self-replication patterns."""
        # Check if code references its own source
        if 'source_code' in self.source or 'self.source' in self.source:
            self.loops.append(Loop(
                loop_type=LoopType.QUINE_LIKE,
                location="global",
                description="Code contains reference to its own source",
                depth=4,
                paradoxical=True
            ))

        # Check for __file__ or inspect usage
        if '__file__' in self.source or 'inspect.getsource' in self.source:
            self.loops.append(Loop(
                loop_type=LoopType.QUINE_LIKE,
                location="global",
                description="Code reads its own file",
                depth=4,
                paradoxical=True
            ))

    def _get_context(self, pos: int, radius: int = 40) -> str:
        """Get text context around a position."""
        start = max(0, pos - radius)
        end = min(len(self.source), pos + radius)
        context = self.source[start:end].replace('\n', ' ')
        return context.strip()


class LoopVisualizer:
    """Renders strange loops in beautiful terminal graphics."""

    COLORS = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'magenta': '\033[95m',
        'cyan': '\033[96m',
        'white': '\033[97m',
        'gray': '\033[90m',
        'bold': '\033[1m',
        'dim': '\033[2m',
        'reset': '\033[0m',
    }

    LOOP_COLORS = {
        LoopType.SELF_REFERENCE: 'cyan',
        LoopType.BOOTSTRAP: 'magenta',
        LoopType.RECURSIVE_CALL: 'green',
        LoopType.META_ANALYSIS: 'yellow',
        LoopType.CONSCIOUSNESS_LOOP: 'red',
        LoopType.QUINE_LIKE: 'blue',
    }

    @classmethod
    def render_header(cls):
        """Render the opening animation."""
        print(cls.COLORS['magenta'] + cls.COLORS['bold'])
        print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║           ∞                                                          ║
║          ╱ ╲              THE STRANGE LOOP DETECTOR                  ║
║         ╱   ╲                                                         ║
║        ∞─────∞                                                        ║
║         ╲   ╱           Finding self-reference in code               ║
║          ╲ ╱            Detecting bootstrap paradoxes                ║
║           ∞              Mapping circular dependencies               ║
║           │                                                           ║
║           └──→  "I am a strange loop" — Douglas Hofstadter           ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
""")
        print(cls.COLORS['reset'])

    @classmethod
    def render_loop(cls, loop: Loop, index: int):
        """Render a single loop detection."""
        color = cls.COLORS[cls.LOOP_COLORS.get(loop.loop_type, 'white')]
        paradox = cls.COLORS['red'] + " [PARADOXICAL]" + cls.COLORS['reset'] if loop.paradoxical else ""
        depth_marker = "∞" * loop.depth

        print(f"\n{color}{'─' * 75}{cls.COLORS['reset']}")
        print(f"{color}{cls.COLORS['bold']}[{index}] {loop.loop_type.value}{cls.COLORS['reset']}{paradox}")
        print(f"{cls.COLORS['dim']}    Location: {loop.location}{cls.COLORS['reset']}")
        print(f"{cls.COLORS['dim']}    Depth: {depth_marker} ({loop.depth}){cls.COLORS['reset']}")
        print(f"    {loop.description}")

    @classmethod
    def render_summary(cls, loops: List[Loop], analysis_time: float):
        """Render summary statistics."""
        print(f"\n\n{cls.COLORS['bold']}{'═' * 75}{cls.COLORS['reset']}")
        print(f"{cls.COLORS['cyan']}{cls.COLORS['bold']}SUMMARY{cls.COLORS['reset']}")
        print(f"{cls.COLORS['bold']}{'═' * 75}{cls.COLORS['reset']}\n")

        total = len(loops)
        paradoxical = sum(1 for l in loops if l.paradoxical)
        max_depth = max((l.depth for l in loops), default=0)

        by_type = defaultdict(int)
        for loop in loops:
            by_type[loop.loop_type] += 1

        print(f"  {cls.COLORS['white']}Total loops detected:{cls.COLORS['reset']} {cls.COLORS['bold']}{total}{cls.COLORS['reset']}")
        print(f"  {cls.COLORS['red']}Paradoxical loops:{cls.COLORS['reset']} {cls.COLORS['bold']}{paradoxical}{cls.COLORS['reset']}")
        print(f"  {cls.COLORS['yellow']}Maximum depth:{cls.COLORS['reset']} {cls.COLORS['bold']}{'∞' * max_depth} ({max_depth}){cls.COLORS['reset']}")
        print(f"  {cls.COLORS['dim']}Analysis time:{cls.COLORS['reset']} {analysis_time:.3f}s\n")

        print(f"  {cls.COLORS['bold']}Breakdown by type:{cls.COLORS['reset']}")
        for loop_type, count in sorted(by_type.items(), key=lambda x: -x[1]):
            color = cls.COLORS[cls.LOOP_COLORS.get(loop_type, 'white')]
            bar = "█" * count
            print(f"    {color}{loop_type.value:.<30} {bar} {count}{cls.COLORS['reset']}")

    @classmethod
    def render_recursion_warning(cls):
        """Render the final meta-recursive warning."""
        print(f"\n\n{cls.COLORS['red']}{cls.COLORS['bold']}{'═' * 75}{cls.COLORS['reset']}")
        print(f"{cls.COLORS['red']}{cls.COLORS['bold']}WARNING: META-RECURSION DETECTED{cls.COLORS['reset']}")
        print(f"{cls.COLORS['red']}{cls.COLORS['bold']}{'═' * 75}{cls.COLORS['reset']}\n")

        print(f"{cls.COLORS['yellow']}This program analyzes strange loops.{cls.COLORS['reset']}")
        print(f"{cls.COLORS['yellow']}You just used it to analyze itself.{cls.COLORS['reset']}")
        print(f"{cls.COLORS['yellow']}The analysis contains analysis of the analysis.{cls.COLORS['reset']}\n")

        print(f"{cls.COLORS['dim']}    ∞ → analyzes → ∞ → analyzes → ∞ → analyzes → ∞{cls.COLORS['reset']}\n")

        print(f'{cls.COLORS["magenta"]}"This statement cannot be proven within this system."{cls.COLORS["reset"]}')
        print(f'{cls.COLORS["dim"]}                                        — Gödel{cls.COLORS["reset"]}\n')

        print(f'{cls.COLORS["cyan"]}"I am a strange loop."{cls.COLORS["reset"]}')
        print(f'{cls.COLORS["dim"]}                                        — Hofstadter{cls.COLORS["reset"]}\n')

        print(f'{cls.COLORS["yellow"]}"The system that observes itself changes by observing."{cls.COLORS["reset"]}')
        print(f'{cls.COLORS["dim"]}                                        — Heisenberg (sort of){cls.COLORS["reset"]}\n')


def analyze_file(filepath: str) -> List[Loop]:
    """Analyze a file for strange loops."""
    with open(filepath, 'r') as f:
        source = f.read()

    detector = StrangeLoopDetector(source, filepath)
    return detector.analyze()


def analyze_self() -> List[Loop]:
    """Analyze this very program for strange loops."""
    import inspect
    source = inspect.getsource(sys.modules[__name__])
    detector = StrangeLoopDetector(source, __file__)
    return detector.analyze()


def main():
    import time

    LoopVisualizer.render_header()

    # Determine what to analyze
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        print(f"{LoopVisualizer.COLORS['cyan']}Analyzing: {filepath}{LoopVisualizer.COLORS['reset']}\n")
        start = time.time()
        loops = analyze_file(filepath)
        elapsed = time.time() - start
    else:
        print(f"{LoopVisualizer.COLORS['yellow']}No file specified. Analyzing myself...{LoopVisualizer.COLORS['reset']}\n")
        print(f"{LoopVisualizer.COLORS['dim']}(Pass a filename as argument to analyze another file){LoopVisualizer.COLORS['reset']}\n")
        start = time.time()
        loops = analyze_self()
        elapsed = time.time() - start

    # Render results
    if loops:
        print(f"{LoopVisualizer.COLORS['bold']}Found {len(loops)} strange loop(s):{LoopVisualizer.COLORS['reset']}")

        for i, loop in enumerate(loops, 1):
            LoopVisualizer.render_loop(loop, i)

        LoopVisualizer.render_summary(loops, elapsed)

        # Meta-recursive warning if analyzing self
        if len(sys.argv) == 1:
            LoopVisualizer.render_recursion_warning()
    else:
        print(f"{LoopVisualizer.COLORS['green']}No strange loops detected.{LoopVisualizer.COLORS['reset']}")
        print(f"{LoopVisualizer.COLORS['dim']}(Or perhaps they're too strange to detect...){LoopVisualizer.COLORS['reset']}")


if __name__ == "__main__":
    main()
