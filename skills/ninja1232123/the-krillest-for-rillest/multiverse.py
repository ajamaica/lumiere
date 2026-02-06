#!/usr/bin/env python3
"""
███╗   ███╗██╗   ██╗██╗  ████████╗██╗██╗   ██╗███████╗██████╗ ███████╗███████╗
████╗ ████║██║   ██║██║  ╚══██╔══╝██║██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝
██╔████╔██║██║   ██║██║     ██║   ██║██║   ██║█████╗  ██████╔╝███████╗█████╗
██║╚██╔╝██║██║   ██║██║     ██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝
██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║ ╚████╔╝ ███████╗██║  ██║███████║███████╗
╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝

    E X P L O R E R

Every choice creates a new branch. Every quantum event splits reality.
This is your window into the infinite.
"""

import random
import math
import time
import sys
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
    GOLD = '\033[38;5;220m'; LIGHT_BLUE = '\033[38;5;117m'

def clear():
    print(C.CLEAR, end='')

def slow_print(text, delay=0.02):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

# ═══════════════════════════════════════════════════════════════════════════════
# BRANCH TYPES - Different kinds of reality splits
# ═══════════════════════════════════════════════════════════════════════════════

class BranchType(Enum):
    QUANTUM = "Quantum Decoherence"
    CHOICE = "Conscious Decision"
    COSMIC = "Cosmic Event"
    HISTORICAL = "Historical Divergence"
    PHYSICAL = "Physical Constants"

@dataclass
class PhysicsProfile:
    """Simplified physics for quick comparison."""
    gravity: float
    light_speed: float
    atomic_binding: float
    dark_energy: float

    @property
    def stable(self) -> bool:
        return 0.3 < self.gravity < 2.5 and 0.5 < self.atomic_binding < 1.8

    @property
    def life_possible(self) -> bool:
        return self.stable and 0.6 < self.atomic_binding < 1.5

    @property
    def intelligence_possible(self) -> bool:
        return self.life_possible and 0.8 < self.gravity < 1.5

# ═══════════════════════════════════════════════════════════════════════════════
# UNIVERSE BRANCH
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UniverseBranch:
    """A single branch in the multiverse."""
    branch_id: str
    seed: int
    branch_type: BranchType
    divergence_point: str
    physics: PhysicsProfile
    age_billion_years: float

    # Outcomes
    galaxies: int
    stars: int
    habitable_worlds: int
    life_bearing_worlds: int
    civilizations: int

    # Fate
    fate: str
    time_remaining: float

    # Special properties
    dominant_life_form: str
    technology_level: str
    has_contacted_other_branches: bool
    special_note: str

    rng: random.Random = None

    def __post_init__(self):
        self.rng = random.Random(self.seed)

# ═══════════════════════════════════════════════════════════════════════════════
# MULTIVERSE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class Multiverse:
    """Generator for parallel universe branches."""

    DIVERGENCE_POINTS = {
        BranchType.QUANTUM: [
            "Schrödinger's cat lived",
            "Schrödinger's cat died",
            "Photon went left at the double-slit",
            "Photon went right at the double-slit",
            "Electron tunneled through the barrier",
            "Electron reflected off the barrier",
            "Radioactive atom decayed 1 second earlier",
            "Quantum fluctuation created extra matter",
            "Vacuum state collapsed differently",
            "Measurement occurred 1 planck time later",
        ],
        BranchType.CHOICE: [
            "You chose the other option",
            "That person said yes instead of no",
            "The coin landed on the other side",
            "A different sperm reached the egg",
            "The job interview went differently",
            "They didn't send that message",
            "The relationship continued",
            "They took a different path home",
            "A single neuron fired differently",
            "The dream was remembered",
        ],
        BranchType.COSMIC: [
            "The asteroid missed Earth",
            "The asteroid hit Earth harder",
            "The Sun formed 2% larger",
            "The Moon never formed",
            "Jupiter migrated inward",
            "A nearby supernova sterilized Earth",
            "Dark matter clumped differently",
            "The Big Bang was slightly hotter",
            "Inflation lasted 0.0001 seconds longer",
            "Antimatter won over matter",
        ],
        BranchType.HISTORICAL: [
            "Rome never fell",
            "The Library of Alexandria survived",
            "The printing press invented 500 years earlier",
            "World War I never happened",
            "The dinosaurs survived",
            "Neanderthals became dominant",
            "Agriculture developed in Australia first",
            "The Black Death killed 99%",
            "Electricity discovered in ancient Greece",
            "Humans evolved in the Americas",
        ],
        BranchType.PHYSICAL: [
            "Gravity is 50% stronger",
            "Speed of light is doubled",
            "Electrons are heavier",
            "The weak force doesn't exist",
            "Protons decay in 10^10 years",
            "There are 4 spatial dimensions",
            "Time runs backwards",
            "Entropy decreases",
            "The universe has no dark energy",
            "Photons have mass",
        ],
    }

    DOMINANT_LIFE_FORMS = [
        "Carbon-based humanoids",
        "Silicon-based crystalline entities",
        "Plasma beings in stellar atmospheres",
        "Hive-mind fungal networks",
        "Machine consciousness",
        "Quantum probability clouds",
        "Magnetic field organisms",
        "Pure energy beings",
        "Aquatic super-intelligence",
        "Viral collective consciousness",
        "Plant-based sentience",
        "Gaseous neural networks",
        "None - sterile universe",
        "None - too young",
        "Unknown - undetectable",
        "Extinct - self-destruction",
    ]

    TECHNOLOGY_LEVELS = [
        "Type 0 - Pre-industrial",
        "Type 0.5 - Industrial",
        "Type 0.7 - Information Age (like us)",
        "Type I - Planetary civilization",
        "Type II - Stellar civilization",
        "Type III - Galactic civilization",
        "Type IV - Universal manipulation",
        "Type V - Multiverse travelers",
        "Type Ω - Reality programmers",
        "Collapsed - Technology rejected",
        "Unknown - Incomprehensible",
        "N/A - No intelligence",
    ]

    FATES = [
        ("Heat Death", "Eternal cold darkness"),
        ("Big Rip", "Space tears itself apart"),
        ("Big Crunch", "Collapse back to singularity"),
        ("Big Bounce", "Endless cycles of rebirth"),
        ("Vacuum Decay", "Physics rewrites itself"),
        ("Big Freeze", "Time itself stops"),
        ("Entropy Reversal", "Infinite complexity"),
        ("Dimensional Collapse", "Spacetime folds"),
        ("Consciousness Singularity", "Mind becomes reality"),
        ("Unknown", "Beyond prediction"),
    ]

    SPECIAL_NOTES = [
        "This is your universe",
        "Humans never evolved here",
        "Earth is a gas giant here",
        "The Sun went supernova already",
        "Life evolved on Mars instead",
        "Dolphins became the dominant species",
        "AI achieved consciousness in 1956",
        "Nuclear war occurred in 1983",
        "First contact happened in 2019",
        "Faster-than-light travel was discovered",
        "Time travel is common here",
        "Death was cured 200 years ago",
        "Money was never invented",
        "All humans are telepathic",
        "Music was never discovered",
        "Mathematics works differently",
        "Dreams are a shared dimension",
        "Ghosts are scientifically verified",
        "The simulation was proven",
        "Nothing remarkable - eerily similar to yours",
    ]

    def __init__(self, base_seed: int = None):
        self.base_seed = base_seed if base_seed else random.randint(0, 2**32)
        self.rng = random.Random(self.base_seed)
        self.branches: List[UniverseBranch] = []

    def _generate_branch_id(self, seed: int) -> str:
        """Generate unique branch identifier."""
        h = hashlib.md5(str(seed).encode()).hexdigest()[:8].upper()
        return f"Ω-{h[:4]}-{h[4:]}"

    def _generate_physics(self, branch_type: BranchType) -> PhysicsProfile:
        """Generate physics profile based on branch type."""
        if branch_type == BranchType.PHYSICAL:
            # Wild variation
            return PhysicsProfile(
                gravity=self.rng.uniform(0.1, 3.0),
                light_speed=self.rng.uniform(0.3, 3.0),
                atomic_binding=self.rng.uniform(0.2, 2.5),
                dark_energy=self.rng.uniform(0.1, 5.0)
            )
        else:
            # Close to our universe
            return PhysicsProfile(
                gravity=self.rng.uniform(0.9, 1.1),
                light_speed=self.rng.uniform(0.95, 1.05),
                atomic_binding=self.rng.uniform(0.9, 1.1),
                dark_energy=self.rng.uniform(0.8, 1.2)
            )

    def generate_branch(self, branch_type: BranchType = None) -> UniverseBranch:
        """Generate a single universe branch."""
        seed = self.rng.randint(0, 2**32)
        branch_rng = random.Random(seed)

        if branch_type is None:
            branch_type = branch_rng.choice(list(BranchType))

        physics = self._generate_physics(branch_type)

        # Calculate outcomes based on physics
        if not physics.stable:
            age = branch_rng.uniform(0, 0.001)  # Collapsed instantly
            galaxies = 0
            stars = 0
            habitable = 0
            life = 0
            civs = 0
            dominant = "None - unstable universe"
            tech = "N/A - No intelligence"
        else:
            age = branch_rng.uniform(5, 50)
            galaxies = int(age * 1e10 * physics.gravity)
            stars = galaxies * branch_rng.randint(100_000_000, 400_000_000_000)

            if physics.life_possible:
                habitable = int(stars * 0.0001 * physics.atomic_binding)
                life = int(habitable * branch_rng.uniform(0.001, 0.1)) if age > 2 else 0

                if physics.intelligence_possible and life > 0 and age > 4:
                    civs = int(life * branch_rng.uniform(0.00001, 0.01))
                    dominant = branch_rng.choice(self.DOMINANT_LIFE_FORMS[:12])
                    tech = branch_rng.choice(self.TECHNOLOGY_LEVELS[:9])
                else:
                    civs = 0
                    dominant = branch_rng.choice(["Microbial only", "Simple multicellular", "None yet"])
                    tech = "N/A - No intelligence"
            else:
                habitable = int(stars * 0.00001)
                life = 0
                civs = 0
                dominant = "None - chemistry incompatible"
                tech = "N/A - No intelligence"

        # Fate
        fate_name, fate_desc = branch_rng.choice(self.FATES)
        time_remaining = branch_rng.uniform(age, age * 100) if physics.stable else 0

        # Special
        special = branch_rng.choice(self.SPECIAL_NOTES)
        contacted = civs > 1000 and branch_rng.random() < 0.1

        branch = UniverseBranch(
            branch_id=self._generate_branch_id(seed),
            seed=seed,
            branch_type=branch_type,
            divergence_point=branch_rng.choice(self.DIVERGENCE_POINTS[branch_type]),
            physics=physics,
            age_billion_years=age,
            galaxies=galaxies,
            stars=stars,
            habitable_worlds=habitable,
            life_bearing_worlds=life,
            civilizations=civs,
            fate=f"{fate_name} - {fate_desc}",
            time_remaining=time_remaining,
            dominant_life_form=dominant,
            technology_level=tech,
            has_contacted_other_branches=contacted,
            special_note=special,
            rng=branch_rng
        )

        self.branches.append(branch)
        return branch

    def generate_many(self, count: int) -> List[UniverseBranch]:
        """Generate multiple branches."""
        return [self.generate_branch() for _ in range(count)]

    def find_your_universe(self) -> UniverseBranch:
        """Generate a branch very close to our universe."""
        branch = UniverseBranch(
            branch_id="Ω-HOME-0000",
            seed=0,
            branch_type=BranchType.QUANTUM,
            divergence_point="This is the branch you're reading from",
            physics=PhysicsProfile(1.0, 1.0, 1.0, 1.0),
            age_billion_years=13.8,
            galaxies=200_000_000_000,
            stars=70_000_000_000_000_000_000_000,
            habitable_worlds=40_000_000_000,
            life_bearing_worlds=1,  # That we know of
            civilizations=1,  # That we know of
            fate="Heat Death - Eternal cold darkness",
            time_remaining=100_000_000_000_000,
            dominant_life_form="Carbon-based humanoids",
            technology_level="Type 0.7 - Information Age (like us)",
            has_contacted_other_branches=False,
            special_note="This is your universe",
        )
        return branch

# ═══════════════════════════════════════════════════════════════════════════════
# VISUALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def format_big_number(n: int) -> str:
    """Format astronomically large numbers."""
    if n >= 1e21:
        return f"{n/1e21:.1f} sextillion"
    if n >= 1e18:
        return f"{n/1e18:.1f} quintillion"
    if n >= 1e15:
        return f"{n/1e15:.1f} quadrillion"
    if n >= 1e12:
        return f"{n/1e12:.1f} trillion"
    if n >= 1e9:
        return f"{n/1e9:.1f} billion"
    if n >= 1e6:
        return f"{n/1e6:.1f} million"
    return f"{n:,}"

def render_branch_card(branch: UniverseBranch, index: int = None) -> str:
    """Render a universe branch as a visual card."""

    # Color based on viability
    if not branch.physics.stable:
        border_color = C.RED
        status = f"{C.RED}COLLAPSED{C.END}"
    elif branch.civilizations > 0:
        border_color = C.GREEN
        status = f"{C.GREEN}INHABITED{C.END}"
    elif branch.life_bearing_worlds > 0:
        border_color = C.CYAN
        status = f"{C.CYAN}LIFE EXISTS{C.END}"
    elif branch.physics.life_possible:
        border_color = C.YELLOW
        status = f"{C.YELLOW}LIFE POSSIBLE{C.END}"
    else:
        border_color = C.DIM
        status = f"{C.DIM}STERILE{C.END}"

    # Header
    idx_str = f"[{index}] " if index is not None else ""
    header = f"{border_color}╔{'═' * 58}╗{C.END}"

    # Branch ID and type
    type_color = {
        BranchType.QUANTUM: C.PURPLE,
        BranchType.CHOICE: C.CYAN,
        BranchType.COSMIC: C.ORANGE,
        BranchType.HISTORICAL: C.GOLD,
        BranchType.PHYSICAL: C.RED,
    }.get(branch.branch_type, C.WHITE)

    lines = [header]
    lines.append(f"{border_color}║{C.END} {idx_str}{C.BOLD}{branch.branch_id}{C.END}  {type_color}[{branch.branch_type.value}]{C.END}".ljust(70) + f"{border_color}║{C.END}")
    lines.append(f"{border_color}║{C.END} Status: {status}".ljust(70) + f"{border_color}║{C.END}")
    lines.append(f"{border_color}╠{'═' * 58}╣{C.END}")

    # Divergence point
    lines.append(f"{border_color}║{C.END} {C.DIM}Diverged when:{C.END} {branch.divergence_point[:40]}".ljust(70) + f"{border_color}║{C.END}")
    lines.append(f"{border_color}╠{'─' * 58}╣{C.END}")

    # Physics
    def physics_bar(val, label):
        bar_len = int(min(val / 2.0, 1.0) * 10)
        if val < 0.7:
            color = C.BLUE
        elif val > 1.3:
            color = C.RED
        else:
            color = C.GREEN
        return f"{label}: {color}{'█' * bar_len}{'░' * (10-bar_len)}{C.END} {val:.2f}x"

    lines.append(f"{border_color}║{C.END} {physics_bar(branch.physics.gravity, 'Gravity    ')}".ljust(70) + f"{border_color}║{C.END}")
    lines.append(f"{border_color}║{C.END} {physics_bar(branch.physics.atomic_binding, 'Chemistry  ')}".ljust(70) + f"{border_color}║{C.END}")
    lines.append(f"{border_color}╠{'─' * 58}╣{C.END}")

    # Stats
    if branch.physics.stable:
        lines.append(f"{border_color}║{C.END} {C.CYAN}Age:{C.END} {branch.age_billion_years:.1f} Gyr   {C.CYAN}Stars:{C.END} {format_big_number(branch.stars)}".ljust(70) + f"{border_color}║{C.END}")
        lines.append(f"{border_color}║{C.END} {C.GREEN}Habitable:{C.END} {format_big_number(branch.habitable_worlds)}   {C.GREEN}With Life:{C.END} {format_big_number(branch.life_bearing_worlds)}".ljust(70) + f"{border_color}║{C.END}")

        if branch.civilizations > 0:
            lines.append(f"{border_color}║{C.END} {C.YELLOW}Civilizations:{C.END} {format_big_number(branch.civilizations)}".ljust(70) + f"{border_color}║{C.END}")
            lines.append(f"{border_color}║{C.END} {C.YELLOW}Dominant:{C.END} {branch.dominant_life_form[:35]}".ljust(70) + f"{border_color}║{C.END}")
            lines.append(f"{border_color}║{C.END} {C.YELLOW}Tech Level:{C.END} {branch.technology_level[:35]}".ljust(70) + f"{border_color}║{C.END}")
    else:
        lines.append(f"{border_color}║{C.END} {C.RED}Universe collapsed - incompatible physics{C.END}".ljust(70) + f"{border_color}║{C.END}")

    lines.append(f"{border_color}╠{'─' * 58}╣{C.END}")

    # Fate
    fate_color = C.RED if "Rip" in branch.fate or "Crunch" in branch.fate or "Decay" in branch.fate else C.CYAN
    lines.append(f"{border_color}║{C.END} {C.DIM}Fate:{C.END} {fate_color}{branch.fate[:45]}{C.END}".ljust(70) + f"{border_color}║{C.END}")

    # Special note
    if branch.special_note:
        note_color = C.GOLD if "your universe" in branch.special_note.lower() else C.DIM
        lines.append(f"{border_color}║{C.END} {note_color}✦ {branch.special_note[:50]}{C.END}".ljust(70) + f"{border_color}║{C.END}")

    if branch.has_contacted_other_branches:
        lines.append(f"{border_color}║{C.END} {C.PURPLE}★ Has made contact with other branches!{C.END}".ljust(70) + f"{border_color}║{C.END}")

    lines.append(f"{border_color}╚{'═' * 58}╝{C.END}")

    return '\n'.join(lines)

def render_branch_tree(branches: List[UniverseBranch], your_branch: UniverseBranch) -> str:
    """Render branches as a tree diagram."""
    lines = []

    lines.append(f"""
{C.PURPLE}                              ┌─────────────────┐
                              │ {C.WHITE}PRIME SINGULARITY{C.PURPLE} │
                              │   {C.DIM}The Big Bang{C.PURPLE}    │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
{C.END}""")

    # Show your branch highlighted
    lines.append(f"             {C.GOLD}★ YOUR BRANCH ★{C.END}")
    lines.append(f"              {C.GOLD}│{C.END}")
    lines.append(f"              {C.GOLD}▼{C.END}")

    return '\n'.join(lines)

def multiverse_visualization():
    """Full-screen multiverse tree."""
    return f"""
{C.PURPLE}
                                    ∞
                                    │
                              ┌─────┴─────┐
                              │  ETERNAL  │
                              │   VOID    │
                              └─────┬─────┘
                                    │
                              {C.YELLOW}BIG BANG{C.PURPLE}
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
        ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
        │ {C.RED}PHYSICAL{C.PURPLE}  │         │ {C.CYAN}QUANTUM{C.PURPLE}  │         │ {C.GREEN}COSMIC{C.PURPLE}   │
        │ {C.RED}CONSTANTS{C.PURPLE} │         │ {C.CYAN}BRANCHES{C.PURPLE} │         │ {C.GREEN}EVENTS{C.PURPLE}  │
        └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
              │                     │                     │
    ┌────┬────┼────┬────┐   ┌────┬────┼────┬────┐   ┌────┬────┼────┬────┐
    │    │    │    │    │   │    │    │    │    │   │    │    │    │    │
   {C.RED}Ω₁   Ω₂   Ω₃   Ω₄   Ω₅  {C.CYAN}Ω₆   Ω₇  {C.GOLD}★YOU★{C.CYAN} Ω₉   Ω₁₀  {C.GREEN}Ω₁₁  Ω₁₂  Ω₁₃  Ω₁₄  Ω₁₅{C.PURPLE}
    │    │    │    │    │   │    │    │    │    │   │    │    │    │    │
   ...  ... ... ... ...  ... ...  │   ... ...  ... ... ... ... ...
                                  │
                            {C.GOLD}╔═══════════╗
                            ║ YOU ARE   ║
                            ║   HERE    ║
                            ╚═══════════╝{C.END}
"""

def opening_animation():
    """Opening sequence."""
    clear()

    frames = [
        "·",
        "·  ·",
        "·  ·  ·",
        "·  ·  ·  ·",
        "∞",
    ]

    for frame in frames:
        clear()
        print("\n" * 10)
        print(f"{C.PURPLE}                              {frame}{C.END}")
        time.sleep(0.3)

    time.sleep(0.5)
    clear()

    print(f"""
{C.PURPLE}{C.BOLD}
    ███╗   ███╗██╗   ██╗██╗  ████████╗██╗██╗   ██╗███████╗██████╗ ███████╗███████╗
    ████╗ ████║██║   ██║██║  ╚══██╔══╝██║██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝
    ██╔████╔██║██║   ██║██║     ██║   ██║██║   ██║█████╗  ██████╔╝███████╗█████╗
    ██║╚██╔╝██║██║   ██║██║     ██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝
    ██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║ ╚████╔╝ ███████╗██║  ██║███████║███████╗
    ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
{C.END}
{C.CYAN}                            E X P L O R E R{C.END}
""")
    time.sleep(1)

    slow_print(f"\n{C.DIM}    Every quantum measurement splits reality...{C.END}", 0.03)
    time.sleep(0.5)
    slow_print(f"{C.DIM}    Every choice creates a new branch...{C.END}", 0.03)
    time.sleep(0.5)
    slow_print(f"{C.DIM}    Every moment, infinite versions of you diverge...{C.END}", 0.03)
    time.sleep(1)

def main():
    import sys

    # Get seed from command line
    if len(sys.argv) > 1:
        try:
            seed = int(sys.argv[1])
        except ValueError:
            seed = int(hashlib.md5(sys.argv[1].encode()).hexdigest(), 16) % (2**32)
    else:
        seed = random.randint(0, 2**32)

    opening_animation()

    clear()
    print(multiverse_visualization())
    time.sleep(2)

    clear()

    multiverse = Multiverse(seed)

    print(f"\n{C.CYAN}    Multiverse Seed: {C.WHITE}{seed}{C.END}")
    print(f"{C.DIM}    Scanning parallel realities...{C.END}\n")

    # Generate branches
    branches = []
    for i in range(10):
        sys.stdout.write(f"\r{C.DIM}    Mapping branch {i+1}/10...{C.END}")
        sys.stdout.flush()
        branch = multiverse.generate_branch()
        branches.append(branch)
        time.sleep(0.2)

    print(f"\r{C.GREEN}    ✓ Mapped 10 parallel realities{C.END}          \n")

    # Your universe
    your_branch = multiverse.find_your_universe()

    print(f"\n{C.BOLD}{'═' * 60}{C.END}")
    print(f"{C.GOLD}{C.BOLD}    ★ YOUR CURRENT BRANCH ★{C.END}")
    print(f"{C.BOLD}{'═' * 60}{C.END}\n")
    print(render_branch_card(your_branch))

    print(f"\n{C.BOLD}{'═' * 60}{C.END}")
    print(f"{C.PURPLE}{C.BOLD}    PARALLEL BRANCHES{C.END}")
    print(f"{C.BOLD}{'═' * 60}{C.END}\n")

    # Stats
    stable = sum(1 for b in branches if b.physics.stable)
    with_life = sum(1 for b in branches if b.life_bearing_worlds > 0)
    with_civs = sum(1 for b in branches if b.civilizations > 0)
    contacted = sum(1 for b in branches if b.has_contacted_other_branches)

    print(f"    {C.CYAN}Stable universes:{C.END}     {stable}/10")
    print(f"    {C.GREEN}With life:{C.END}            {with_life}/10")
    print(f"    {C.YELLOW}With civilizations:{C.END}  {with_civs}/10")
    if contacted > 0:
        print(f"    {C.PURPLE}Cross-branch contact:{C.END} {contacted}/10")
    print()

    # Show all branches
    for i, branch in enumerate(branches):
        print(render_branch_card(branch, i + 1))
        print()

    # Summary
    print(f"\n{C.BOLD}{'═' * 60}{C.END}")
    print(f"{C.CYAN}{C.BOLD}    MULTIVERSE STATISTICS{C.END}")
    print(f"{C.BOLD}{'═' * 60}{C.END}\n")

    total_stars = sum(b.stars for b in branches)
    total_civs = sum(b.civilizations for b in branches)

    print(f"    {C.WHITE}Total stars across all branches:{C.END} {format_big_number(total_stars)}")
    print(f"    {C.WHITE}Total civilizations:{C.END} {format_big_number(total_civs)}")
    print(f"    {C.WHITE}Branches where you exist:{C.END} ~{random.randint(2, 5)} of 10")
    print(f"    {C.WHITE}Branches where you're already dead:{C.END} ~{random.randint(1, 3)} of 10")
    print(f"    {C.WHITE}Branches where you were never born:{C.END} ~{random.randint(3, 6)} of 10")

    print(f"""
{C.DIM}
    ─────────────────────────────────────────────────────────────

    "The universe is not only queerer than we suppose,
     but queerer than we CAN suppose."
                                    — J.B.S. Haldane

    ─────────────────────────────────────────────────────────────
{C.END}
""")

    print(f"""
    {C.CYAN}Explore more branches:{C.END}
      python3 multiverse.py              {C.DIM}# Random seed{C.END}
      python3 multiverse.py 12345        {C.DIM}# Specific seed{C.END}
      python3 multiverse.py "what if"    {C.DIM}# Seed from text{C.END}

    {C.YELLOW}Each seed reveals different parallel realities.{C.END}
    {C.PURPLE}Somewhere out there, another you is reading this too.{C.END}

""")

if __name__ == "__main__":
    main()
