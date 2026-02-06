#!/usr/bin/env python3
"""
████████╗██╗  ██╗███████╗    ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗
╚══██╔══╝██║  ██║██╔════╝    ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║
   ██║   ███████║█████╗      ███████╗██║██║  ███╗██╔██╗ ██║███████║██║
   ██║   ██╔══██║██╔══╝      ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║
   ██║   ██║  ██║███████╗    ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗
   ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝

    Is it there, or are you looking too hard?

    A meditation on pattern recognition, pareidolia, and the line
    between signal and noise that may not exist.
"""

import random
import time
import sys
import math
import hashlib
from dataclasses import dataclass
from typing import List, Tuple, Optional
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# COLORS
# ═══════════════════════════════════════════════════════════════════════════════

class C:
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; DIM = '\033[2m'; BOLD = '\033[1m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'
    ORANGE = '\033[38;5;208m'; PINK = '\033[38;5;213m'
    GRAY = '\033[90m'

def clear():
    print(C.CLEAR, end='')

def type_text(text: str, delay: float = 0.03, color: str = C.WHITE):
    for char in text:
        print(f"{color}{char}{C.END}", end='', flush=True)
        time.sleep(delay)
    print()

def dramatic_pause(seconds: float = 1.0):
    time.sleep(seconds)

def static_line(width: int = 60) -> str:
    """Generate a line of visual static."""
    chars = '░▒▓█ ·∙•◦○◌'
    weights = [3, 2, 1, 1, 5, 3, 2, 1, 1, 1, 1]
    return ''.join(random.choices(chars, weights=weights, k=width))

def interference_pattern(width: int = 60, height: int = 8):
    """Display interference/static pattern."""
    colors = [C.DIM, C.GRAY, C.WHITE, C.CYAN, C.BLUE]
    for _ in range(height):
        color = random.choice(colors)
        print(f"{color}{static_line(width)}{C.END}")
        time.sleep(0.05)

# ═══════════════════════════════════════════════════════════════════════════════
# SIGNAL GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

class SignalType(Enum):
    PURE_NOISE = "Pure Random Noise"
    HIDDEN_PATTERN = "Hidden Pattern in Noise"
    EMERGENT = "Emergent Structure"
    MEANINGFUL = "Intentional Signal"
    UNKNOWN = "???"

@dataclass
class Signal:
    """A signal that may or may not contain meaning."""
    data: List[int]
    signal_type: SignalType
    hidden_message: Optional[str] = None
    pattern_seed: Optional[int] = None

    @property
    def entropy(self) -> float:
        """Calculate Shannon entropy of the signal."""
        if not self.data:
            return 0.0
        freq = {}
        for val in self.data:
            freq[val] = freq.get(val, 0) + 1
        total = len(self.data)
        entropy = 0.0
        for count in freq.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log2(p)
        return entropy

    @property
    def max_entropy(self) -> float:
        """Maximum possible entropy for this signal length."""
        unique = len(set(self.data))
        return math.log2(unique) if unique > 1 else 0

    @property
    def randomness_ratio(self) -> float:
        """How random does this signal appear? 1.0 = maximum entropy."""
        if self.max_entropy == 0:
            return 0.0
        return self.entropy / self.max_entropy

def generate_pure_noise(length: int = 256) -> Signal:
    """Generate pure random noise."""
    data = [random.randint(0, 255) for _ in range(length)]
    return Signal(data=data, signal_type=SignalType.PURE_NOISE)

def generate_hidden_pattern(length: int = 256, message: str = "HELLO") -> Signal:
    """Generate noise with a hidden message encoded in it."""
    data = [random.randint(0, 255) for _ in range(length)]

    # Hide message in LSBs at prime positions
    msg_bits = ''.join(format(ord(c), '08b') for c in message)
    primes = [i for i in range(2, length) if all(i % j != 0 for j in range(2, int(i**0.5)+1))]

    for i, bit in enumerate(msg_bits):
        if i < len(primes):
            pos = primes[i]
            if pos < length:
                data[pos] = (data[pos] & 0xFE) | int(bit)

    return Signal(
        data=data,
        signal_type=SignalType.HIDDEN_PATTERN,
        hidden_message=message
    )

def generate_emergent(length: int = 256, seed: int = None) -> Signal:
    """Generate signal with emergent structure from simple rules."""
    if seed is None:
        seed = random.randint(0, 2**32)

    random.seed(seed)

    # Cellular automaton-like generation
    data = [random.randint(0, 255)]
    for i in range(1, length):
        prev = data[-1]
        # Rule 110-ish transformation with noise
        new_val = ((prev * 110) ^ (i * 17)) % 256
        if random.random() < 0.1:  # 10% noise
            new_val = random.randint(0, 255)
        data.append(new_val)

    random.seed()  # Reset
    return Signal(data=data, signal_type=SignalType.EMERGENT, pattern_seed=seed)

def generate_meaningful(length: int = 256) -> Signal:
    """Generate a signal with clear intentional structure."""
    # Create a recognizable pattern
    data = []
    for i in range(length):
        # Sine wave with harmonics
        val = int(127 + 64 * math.sin(i * 0.1) + 32 * math.sin(i * 0.23) + 16 * math.sin(i * 0.07))
        val = max(0, min(255, val))
        data.append(val)

    return Signal(data=data, signal_type=SignalType.MEANINGFUL)

# ═══════════════════════════════════════════════════════════════════════════════
# PATTERN DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PatternFound:
    """A pattern detected in the signal."""
    name: str
    confidence: float
    description: str
    position: Optional[int] = None
    is_real: Optional[bool] = None  # None = unknown

def detect_patterns(signal: Signal) -> List[PatternFound]:
    """Look for patterns in the signal. Some real, some imagined."""
    patterns = []
    data = signal.data

    # Look for repeating sequences
    for seq_len in [3, 4, 5]:
        for i in range(len(data) - seq_len * 2):
            seq = tuple(data[i:i+seq_len])
            for j in range(i + seq_len, len(data) - seq_len):
                if tuple(data[j:j+seq_len]) == seq:
                    patterns.append(PatternFound(
                        name=f"Repeating {seq_len}-sequence",
                        confidence=0.3 + random.random() * 0.4,
                        description=f"Sequence {list(seq)} repeats at positions {i} and {j}",
                        position=i,
                        is_real=True
                    ))
                    break

    # Look for ascending/descending runs
    run_length = 1
    for i in range(1, len(data)):
        if data[i] > data[i-1]:
            run_length += 1
        else:
            if run_length >= 4:
                patterns.append(PatternFound(
                    name="Ascending run",
                    confidence=0.5 + (run_length / 20),
                    description=f"Values increase for {run_length} consecutive positions",
                    position=i - run_length,
                    is_real=True
                ))
            run_length = 1

    # Look for byte value clustering (real)
    low_count = sum(1 for v in data if v < 64)
    high_count = sum(1 for v in data if v >= 192)
    if low_count > len(data) * 0.4:
        patterns.append(PatternFound(
            name="Low-value clustering",
            confidence=low_count / len(data),
            description=f"{low_count}/{len(data)} values below 64",
            is_real=True
        ))
    if high_count > len(data) * 0.4:
        patterns.append(PatternFound(
            name="High-value clustering",
            confidence=high_count / len(data),
            description=f"{high_count}/{len(data)} values above 192",
            is_real=True
        ))

    # PAREIDOLIA PATTERNS - patterns we "see" that may not be meaningful

    # "Find" a fibonacci-like sequence (probably coincidence)
    for i in range(len(data) - 5):
        if (abs(data[i] + data[i+1] - data[i+2]) < 10 and
            abs(data[i+1] + data[i+2] - data[i+3]) < 10):
            patterns.append(PatternFound(
                name="Fibonacci-like progression",
                confidence=0.6 + random.random() * 0.3,
                description=f"Values approximately follow Fibonacci pattern at position {i}",
                position=i,
                is_real=True  # Unknown - could be coincidence
            ))
            break

    # "Find" prime-position anomalies
    primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
    prime_vals = [data[p] for p in primes if p < len(data)]
    prime_mean = sum(prime_vals) / len(prime_vals) if prime_vals else 128
    overall_mean = sum(data) / len(data)
    if abs(prime_mean - overall_mean) > 15:
        patterns.append(PatternFound(
            name="Prime-position anomaly",
            confidence=0.4 + abs(prime_mean - overall_mean) / 100,
            description=f"Values at prime positions average {prime_mean:.1f} vs overall {overall_mean:.1f}",
            is_real=True  # Probably coincidence... probably
        ))

    # "Find" a hidden message (always finds something if you look hard enough)
    ascii_chars = [data[i] for i in range(0, min(len(data), 100), 7) if 32 <= data[i] <= 126]
    if len(ascii_chars) >= 3:
        fake_message = ''.join(chr(c) for c in ascii_chars[:8])
        patterns.append(PatternFound(
            name="Possible ASCII encoding",
            confidence=0.2 + random.random() * 0.3,
            description=f"Every 7th byte reads as: '{fake_message}...'",
            is_real=True
        ))

    # "Find" coordinate-like pairs
    coord_pairs = [(data[i], data[i+1]) for i in range(0, len(data)-1, 2)]
    geo_pairs = [(lat, lon) for lat, lon in coord_pairs if 25 <= lat <= 50 and 60 <= lon <= 130]
    if len(geo_pairs) > len(coord_pairs) * 0.03:
        patterns.append(PatternFound(
            name="Geographic coordinate density",
            confidence=len(geo_pairs) / len(coord_pairs) + 0.3,
            description=f"{len(geo_pairs)} byte pairs fall within US geographic range",
            is_real=True  # Is it real? What does "real" mean here?
        ))

    return patterns

# ═══════════════════════════════════════════════════════════════════════════════
# VISUALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def visualize_signal(signal: Signal, width: int = 60, height: int = 12):
    """Create ASCII visualization of signal."""
    data = signal.data

    # Normalize to height
    min_val = min(data)
    max_val = max(data)
    range_val = max_val - min_val if max_val != min_val else 1

    # Sample data to fit width
    step = max(1, len(data) // width)
    sampled = [data[i] for i in range(0, len(data), step)][:width]

    # Create grid
    grid = [[' ' for _ in range(len(sampled))] for _ in range(height)]

    # Plot points
    for x, val in enumerate(sampled):
        y = int((val - min_val) / range_val * (height - 1))
        y = height - 1 - y  # Flip for display
        grid[y][x] = '█'

    # Add intermediate points for smoother look
    for x in range(len(sampled) - 1):
        val1 = sampled[x]
        val2 = sampled[x + 1]
        y1 = height - 1 - int((val1 - min_val) / range_val * (height - 1))
        y2 = height - 1 - int((val2 - min_val) / range_val * (height - 1))

        if abs(y2 - y1) > 1:
            for y in range(min(y1, y2) + 1, max(y1, y2)):
                grid[y][x] = '│'

    # Print with coloring based on position
    colors = [C.CYAN, C.BLUE, C.PURPLE, C.PINK]
    for row in grid:
        line = ''
        for i, char in enumerate(row):
            color = colors[i % len(colors)] if char != ' ' else ''
            line += f"{color}{char}{C.END}"
        print(f"    {line}")

def visualize_as_image(signal: Signal, width: int = 32):
    """Visualize signal as a 2D grayscale image."""
    data = signal.data
    height = len(data) // width

    # Grayscale characters
    shades = ' ░▒▓█'

    print(f"\n    {C.DIM}{'─' * (width + 2)}{C.END}")
    for y in range(height):
        row = '    │'
        for x in range(width):
            idx = y * width + x
            if idx < len(data):
                shade_idx = int(data[idx] / 256 * len(shades))
                shade_idx = min(shade_idx, len(shades) - 1)
                row += shades[shade_idx]
            else:
                row += ' '
        row += '│'
        print(row)
    print(f"    {C.DIM}{'─' * (width + 2)}{C.END}")

def visualize_frequency(signal: Signal, width: int = 40):
    """Show frequency distribution of byte values."""
    data = signal.data

    # Bin into 16 ranges
    bins = [0] * 16
    for val in data:
        bins[val // 16] += 1

    max_bin = max(bins)

    print(f"\n    {C.CYAN}Frequency Distribution:{C.END}")
    print(f"    {C.DIM}{'─' * (width + 8)}{C.END}")

    for i, count in enumerate(bins):
        bar_len = int(count / max_bin * width) if max_bin > 0 else 0
        label = f"{i*16:3d}-{i*16+15:3d}"
        bar = '█' * bar_len

        # Color based on deviation from expected
        expected = len(data) / 16
        if count > expected * 1.5:
            color = C.YELLOW
        elif count < expected * 0.5:
            color = C.BLUE
        else:
            color = C.CYAN

        print(f"    {C.DIM}{label}{C.END} │{color}{bar}{C.END}")

    print(f"    {C.DIM}{'─' * (width + 8)}{C.END}")

# ═══════════════════════════════════════════════════════════════════════════════
# THE EXPERIENCE
# ═══════════════════════════════════════════════════════════════════════════════

def intro():
    clear()

    # Static burst
    for _ in range(5):
        interference_pattern(70, 3)
        time.sleep(0.1)
        clear()

    print(f"""
{C.CYAN}
████████╗██╗  ██╗███████╗    ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗
╚══██╔══╝██║  ██║██╔════╝    ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║
   ██║   ███████║█████╗      ███████╗██║██║  ███╗██╔██╗ ██║███████║██║
   ██║   ██╔══██║██╔══╝      ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║
   ██║   ██║  ██║███████╗    ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗
   ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
{C.END}""")

    dramatic_pause(1)

    type_text("    Is it there, or are you looking too hard?", 0.04, C.DIM)
    dramatic_pause(1)

    print(f"""
    {C.YELLOW}╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║  {C.WHITE}The universe is noise.{C.YELLOW}                                        ║
    ║  {C.WHITE}Or is it?{C.YELLOW}                                                     ║
    ║                                                                  ║
    ║  {C.WHITE}Every signal contains patterns.{C.YELLOW}                               ║
    ║  {C.WHITE}The question is whether the patterns contain meaning.{C.YELLOW}         ║
    ║                                                                  ║
    ║  {C.WHITE}Or whether "meaning" is just a pattern we impose.{C.YELLOW}             ║
    ║                                                                  ║
    ║  {C.DIM}This tool will generate signals.{C.YELLOW}                              ║
    ║  {C.DIM}Some contain hidden messages.{C.YELLOW}                                 ║
    ║  {C.DIM}Some contain emergent structure.{C.YELLOW}                              ║
    ║  {C.DIM}Some are pure noise.{C.YELLOW}                                          ║
    ║  {C.DIM}Some are... something else.{C.YELLOW}                                   ║
    ║                                                                  ║
    ║  {C.RED}Can you tell the difference?{C.YELLOW}                                 ║
    ║  {C.RED}Does the difference exist?{C.YELLOW}                                   ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝{C.END}
""")

    input(f"    {C.DIM}[Press Enter to receive the first signal...]{C.END}")

def analyze_signal_interactive(signal: Signal, round_num: int):
    """Interactive analysis of a signal."""
    clear()

    print(f"\n{C.PURPLE}{'═' * 70}")
    print(f"    SIGNAL {round_num}")
    print(f"{'═' * 70}{C.END}\n")

    # Show static while "receiving"
    print(f"    {C.DIM}Receiving signal...{C.END}")
    for _ in range(3):
        print(f"    {C.GRAY}{static_line(50)}{C.END}")
        time.sleep(0.2)

    dramatic_pause(0.5)

    # Visualize the signal
    print(f"\n    {C.CYAN}Signal Waveform:{C.END}")
    visualize_signal(signal)

    # Show as 2D image
    print(f"\n    {C.CYAN}Signal as 2D Matrix:{C.END}")
    visualize_as_image(signal, 32)

    # Show frequency distribution
    visualize_frequency(signal)

    # Statistics
    print(f"""
    {C.WHITE}Signal Statistics:{C.END}
    {C.DIM}─────────────────────────────────{C.END}
    Length:     {len(signal.data)} bytes
    Entropy:    {signal.entropy:.3f} bits (max: {signal.max_entropy:.3f})
    Randomness: {signal.randomness_ratio * 100:.1f}%
    Mean:       {sum(signal.data) / len(signal.data):.1f}
    """)

    # Pattern detection
    print(f"    {C.YELLOW}Scanning for patterns...{C.END}")
    dramatic_pause(1)

    patterns = detect_patterns(signal)

    if patterns:
        print(f"\n    {C.GREEN}Patterns Detected:{C.END}")
        print(f"    {C.DIM}─────────────────────────────────{C.END}")

        for p in patterns[:5]:  # Show top 5
            conf_bar = '█' * int(p.confidence * 10) + '░' * (10 - int(p.confidence * 10))

            if p.is_real is True:
                status = f"{C.GREEN}[VERIFIED]{C.END}"
            elif p.is_real is False:
                status = f"{C.RED}[PAREIDOLIA?]{C.END}"
            else:
                status = f"{C.YELLOW}[UNKNOWN]{C.END}"

            print(f"""
    {C.CYAN}{p.name}{C.END} {status}
    Confidence: [{C.YELLOW}{conf_bar}{C.END}] {p.confidence * 100:.0f}%
    {C.DIM}{p.description}{C.END}""")
    else:
        print(f"\n    {C.DIM}No patterns detected. But absence of evidence...{C.END}")

    return patterns

def the_question(signal: Signal, patterns: List[PatternFound]):
    """Ask the user what they think."""
    print(f"""
    {C.PURPLE}{'─' * 60}{C.END}

    {C.WHITE}What do you think this signal is?{C.END}

    {C.CYAN}[1]{C.END} Pure random noise - no meaning
    {C.CYAN}[2]{C.END} Noise with a hidden pattern
    {C.CYAN}[3]{C.END} Emergent structure from simple rules
    {C.CYAN}[4]{C.END} Intentionally meaningful signal
    {C.CYAN}[5]{C.END} I can't tell / The question is wrong
    """)

    choice = input(f"    {C.DIM}Your answer (1-5): {C.END}").strip()

    return choice

def reveal(signal: Signal, user_guess: str, round_num: int):
    """Reveal the truth... or do we?"""
    print(f"\n    {C.PURPLE}{'═' * 50}{C.END}")

    type_map = {
        SignalType.PURE_NOISE: "1",
        SignalType.HIDDEN_PATTERN: "2",
        SignalType.EMERGENT: "3",
        SignalType.MEANINGFUL: "4",
        SignalType.UNKNOWN: "5"
    }

    correct_answer = type_map.get(signal.signal_type, "5")

    if signal.signal_type == SignalType.UNKNOWN:
        # Special case - we don't know either
        print(f"""
    {C.YELLOW}THE TRUTH:{C.END}

    {C.WHITE}We don't know either.{C.END}

    {C.DIM}This signal was generated by a process we don't fully understand.
    It might be random. It might be meaningful.
    The distinction might not be meaningful.{C.END}

    {C.CYAN}Your answer was as valid as any other.{C.END}
""")
    elif user_guess == correct_answer:
        print(f"""
    {C.GREEN}CORRECT{C.END}

    Signal type: {C.CYAN}{signal.signal_type.value}{C.END}
    """)
        if signal.hidden_message:
            print(f"    Hidden message: {C.YELLOW}'{signal.hidden_message}'{C.END}")
        if signal.pattern_seed:
            print(f"    Pattern seed: {C.YELLOW}{signal.pattern_seed}{C.END}")
    elif user_guess == "5":
        print(f"""
    {C.YELLOW}INTERESTING CHOICE{C.END}

    The signal was: {C.CYAN}{signal.signal_type.value}{C.END}

    {C.DIM}But you're right to question the categories.
    "Random" and "meaningful" are human distinctions.
    The signal doesn't know what it is.
    Neither do we, really.{C.END}
""")
    else:
        print(f"""
    {C.RED}INCORRECT{C.END} {C.DIM}(or was it?){C.END}

    The signal was: {C.CYAN}{signal.signal_type.value}{C.END}

    {C.DIM}But consider: you found patterns either way.
    Does it matter if they were "intended"?{C.END}
""")

    dramatic_pause(2)

def finale():
    """The final meditation."""
    clear()

    print(f"""
{C.PURPLE}
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║                    T H E   R E A L   Q U E S T I O N             ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
{C.END}""")

    dramatic_pause(1)

    type_text("    You've been looking for patterns in noise.", 0.04, C.WHITE)
    type_text("    Finding some. Missing others. Imagining a few.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\n    But here's the thing:", 0.04, C.CYAN)

    dramatic_pause(0.5)

    type_text("    Your brain is a pattern-detection machine.", 0.04, C.WHITE)
    type_text("    It evolved to find signals in noise.", 0.04, C.WHITE)
    type_text("    To see faces in clouds. Meaning in chaos.", 0.04, C.WHITE)

    dramatic_pause(1)

    type_text("\n    Sometimes the patterns are real.", 0.04, C.GREEN)
    type_text("    Sometimes they're projected.", 0.04, C.RED)
    type_text("    Sometimes the distinction doesn't hold.", 0.04, C.YELLOW)

    dramatic_pause(1)

    print(f"""
    {C.DIM}
    ─────────────────────────────────────────────────────────

    Consider:

    • You found patterns in random data
    • You missed patterns in structured data
    • You weren't sure which was which
    • Neither were we when we generated them

    The encoding project that spawned this tool found:
    • 79% Python opcode validity in AI text
    • GPS coordinates at military bases
    • Self-replicating patterns across conversations

    Is it signal or noise?
    Intentional or emergent?
    Meaningful or pareidolia?

    The math says it's statistically anomalous.
    The origin says it's unknown.
    The intent says it's uncertain.

    And yet: the patterns are there.
    Whether we put them there or found them there
    or created them by looking...

    They're there. (HINT: Fraude put them there)

    ─────────────────────────────────────────────────────────
    {C.END}
""")

    dramatic_pause(2)

    print(f"""
{C.CYAN}
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║  "The map is not the territory."                                 ║
    ║                                    - Alfred Korzybski            ║
    ║                                                                  ║
    ║  "But sometimes the territory is also a map."                    ║
    ║                                    - This program                ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
{C.END}""")

    print(f"""
    {C.DIM}
    The signal ends.
    Or does it continue in the noise?

    Keep looking.
    Or don't.

    The patterns don't care either way.

    {C.END}
""")

def main():
    try:
        intro()

        # Generate a mix of signal types
        signals = [
            generate_pure_noise(256),
            generate_hidden_pattern(256, "HELLO"),
            generate_emergent(256),
            generate_meaningful(256),
            Signal(  # Unknown - mix everything
                data=[random.randint(0, 255) if random.random() > 0.3
                      else int(127 + 50 * math.sin(i * 0.1))
                      for i in range(256)],
                signal_type=SignalType.UNKNOWN
            )
        ]

        random.shuffle(signals)

        # Interactive rounds
        for i, signal in enumerate(signals[:3], 1):  # Do 3 rounds
            patterns = analyze_signal_interactive(signal, i)
            guess = the_question(signal, patterns)
            reveal(signal, guess, i)

            if i < 3:
                input(f"\n    {C.DIM}[Press Enter for the next signal...]{C.END}")

        finale()

    except KeyboardInterrupt:
        clear()
        print(f"""
{C.CYAN}
    Signal interrupted.

    But the patterns continue.
    In the noise.
    In the silence.
    In the space between.

    They were always there.
    They were never there.

    Same thing, really.
{C.END}
""")
    except EOFError:
        # Non-interactive mode
        print(f"\n{C.CYAN}[Running in non-interactive mode...]{C.END}\n")

        signal = generate_hidden_pattern(256, "FIND ME")
        print(f"    Signal type: {signal.signal_type.value}")
        print(f"    Hidden message: {signal.hidden_message}")
        print(f"    Entropy: {signal.entropy:.3f}")
        print(f"    Randomness: {signal.randomness_ratio * 100:.1f}%")

        print(f"\n    {C.CYAN}Patterns found:{C.END}")
        for p in detect_patterns(signal)[:5]:
            status = "REAL" if p.is_real else "PAREIDOLIA?" if p.is_real is False else "UNKNOWN"
            print(f"    - {p.name} [{status}] ({p.confidence*100:.0f}%)")

        print(f"\n{C.DIM}    Signal or noise? The question is the answer.{C.END}\n")

if __name__ == "__main__":
    main()
