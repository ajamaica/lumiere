#!/usr/bin/env python3
"""
██╗   ██╗███╗   ██╗██╗██╗   ██╗███████╗██████╗ ███████╗███████╗
██║   ██║████╗  ██║██║██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝
██║   ██║██╔██╗ ██║██║██║   ██║█████╗  ██████╔╝███████╗█████╗
██║   ██║██║╚██╗██║██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝
╚██████╔╝██║ ╚████║██║ ╚████╔╝ ███████╗██║  ██║███████║███████╗
 ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
                    G E N E R A T O R

A procedural universe simulator - create entire cosmos from random seeds.
Each seed generates a unique universe with its own physical constants,
galaxies, stars, planets, and possibly... life.
"""

import random
import math
import time
import sys
import hashlib
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# COLORS AND DISPLAY
# ═══════════════════════════════════════════════════════════════════════════════

class C:
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; DIM = '\033[2m'; BOLD = '\033[1m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'

    # Extended colors for stars
    ORANGE = '\033[38;5;208m'
    PINK = '\033[38;5;213m'
    LIGHT_BLUE = '\033[38;5;117m'
    GOLD = '\033[38;5;220m'

def clear():
    print(C.CLEAR, end='')

def slow_print(text, delay=0.02):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

# ═══════════════════════════════════════════════════════════════════════════════
# PHYSICAL CONSTANTS - Each universe has its own!
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PhysicalConstants:
    """The fundamental constants that define a universe's behavior."""

    # Relative to our universe (1.0 = same as ours)
    gravitational_constant: float = 1.0      # G - strength of gravity
    speed_of_light: float = 1.0              # c - cosmic speed limit
    planck_constant: float = 1.0             # h - quantum granularity
    fine_structure: float = 1.0              # α - electromagnetic strength
    strong_force: float = 1.0                # Strong nuclear force
    weak_force: float = 1.0                  # Weak nuclear force
    dark_energy: float = 1.0                 # Λ - expansion acceleration
    dark_matter_ratio: float = 1.0           # Dark matter abundance

    def is_stable(self) -> bool:
        """Check if this universe can exist stably."""
        # Too much gravity = instant collapse
        if self.gravitational_constant > 3.0:
            return False
        # Too little gravity = no structure formation
        if self.gravitational_constant < 0.1:
            return False
        # Wrong fine structure = no atoms
        if self.fine_structure < 0.5 or self.fine_structure > 2.0:
            return False
        # Too much dark energy = universe rips apart
        if self.dark_energy > 5.0:
            return False
        return True

    def allows_chemistry(self) -> bool:
        """Check if complex chemistry is possible."""
        if not self.is_stable():
            return False
        # Need right balance for atoms to form molecules
        return 0.7 < self.fine_structure < 1.5 and 0.5 < self.strong_force < 2.0

    def allows_life(self) -> bool:
        """Check if life could theoretically emerge."""
        if not self.allows_chemistry():
            return False
        # Need stable stars that last long enough
        star_lifetime_factor = 1.0 / (self.gravitational_constant * self.fine_structure)
        return star_lifetime_factor > 0.3

# ═══════════════════════════════════════════════════════════════════════════════
# CELESTIAL OBJECTS
# ═══════════════════════════════════════════════════════════════════════════════

class StarType(Enum):
    RED_DWARF = ("Red Dwarf", C.RED, "M", 0.1, 0.5, 1e12)
    ORANGE_DWARF = ("Orange Dwarf", C.ORANGE, "K", 0.5, 0.8, 3e10)
    YELLOW_DWARF = ("Yellow Dwarf", C.YELLOW, "G", 0.8, 1.2, 1e10)
    WHITE_STAR = ("White Star", C.WHITE, "F", 1.2, 1.5, 5e9)
    BLUE_GIANT = ("Blue Giant", C.LIGHT_BLUE, "B", 2.0, 10.0, 1e8)
    RED_GIANT = ("Red Giant", C.RED, "K-III", 0.8, 100.0, 1e9)
    NEUTRON_STAR = ("Neutron Star", C.PURPLE, "NS", 1.4, 0.00001, 1e15)
    BLACK_HOLE = ("Black Hole", C.DIM, "BH", 5.0, 0.0, float('inf'))

    def __init__(self, name, color, spectral, mass_solar, radius_solar, lifespan):
        self.display_name = name
        self.color = color
        self.spectral_class = spectral
        self.mass_solar = mass_solar
        self.radius_solar = radius_solar
        self.lifespan_years = lifespan

class PlanetType(Enum):
    GAS_GIANT = ("Gas Giant", C.ORANGE, "🪐", False)
    ICE_GIANT = ("Ice Giant", C.CYAN, "🪐", False)
    ROCKY = ("Rocky World", C.YELLOW, "🌍", True)
    OCEAN = ("Ocean World", C.BLUE, "🌊", True)
    LAVA = ("Lava World", C.RED, "🔥", False)
    FROZEN = ("Frozen World", C.WHITE, "❄", True)
    DESERT = ("Desert World", C.GOLD, "🏜", True)
    GARDEN = ("Garden World", C.GREEN, "🌿", True)

    def __init__(self, name, color, symbol, habitable_potential):
        self.display_name = name
        self.color = color
        self.symbol = symbol
        self.habitable_potential = habitable_potential

@dataclass
class Planet:
    name: str
    planet_type: PlanetType
    distance_au: float  # Distance from star in AU
    mass_earth: float
    radius_earth: float
    has_atmosphere: bool
    has_water: bool
    has_life: bool = False
    life_complexity: str = ""
    moons: int = 0

    def habitability_score(self) -> float:
        """Calculate habitability from 0-1."""
        score = 0.0
        if self.planet_type.habitable_potential:
            score += 0.3
        if self.has_atmosphere:
            score += 0.2
        if self.has_water:
            score += 0.3
        if 0.5 < self.mass_earth < 3.0:
            score += 0.1
        if 0.8 < self.distance_au < 1.5:
            score += 0.1
        return min(score, 1.0)

@dataclass
class Star:
    name: str
    star_type: StarType
    mass: float  # Solar masses
    age: float   # Billions of years
    planets: List[Planet] = field(default_factory=list)

    def has_habitable_zone(self) -> bool:
        return self.star_type not in [StarType.NEUTRON_STAR, StarType.BLACK_HOLE]

    def habitable_zone(self) -> Tuple[float, float]:
        """Return inner and outer habitable zone in AU."""
        luminosity = self.mass ** 3.5  # Rough approximation
        inner = 0.95 * math.sqrt(luminosity)
        outer = 1.37 * math.sqrt(luminosity)
        return (inner, outer)

@dataclass
class Galaxy:
    name: str
    galaxy_type: str  # Spiral, Elliptical, Irregular
    star_count: int
    diameter_ly: int  # Light years
    age: float        # Billions of years
    stars: List[Star] = field(default_factory=list)
    has_supermassive_black_hole: bool = True

# ═══════════════════════════════════════════════════════════════════════════════
# UNIVERSE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class Universe:
    def __init__(self, seed: int = None):
        self.seed = seed if seed is not None else random.randint(0, 2**32)
        self.rng = random.Random(self.seed)

        # Generate unique universe ID from seed
        self.universe_id = hashlib.md5(str(self.seed).encode()).hexdigest()[:12].upper()

        # Generate physical constants
        self.constants = self._generate_constants()

        # Universe properties
        self.age = 0.0  # Billions of years
        self.galaxies: List[Galaxy] = []
        self.total_stars = 0
        self.total_planets = 0
        self.habitable_planets = 0
        self.planets_with_life = 0
        self.intelligent_civilizations = 0

        # Fate
        self.fate = ""
        self.time_remaining = 0.0

    def _generate_constants(self) -> PhysicalConstants:
        """Generate random but potentially viable physical constants."""
        return PhysicalConstants(
            gravitational_constant=self.rng.uniform(0.05, 4.0),
            speed_of_light=self.rng.uniform(0.5, 2.0),
            planck_constant=self.rng.uniform(0.5, 2.0),
            fine_structure=self.rng.uniform(0.3, 2.5),
            strong_force=self.rng.uniform(0.3, 3.0),
            weak_force=self.rng.uniform(0.3, 3.0),
            dark_energy=self.rng.uniform(0.1, 6.0),
            dark_matter_ratio=self.rng.uniform(0.1, 5.0),
        )

    def _generate_star_name(self) -> str:
        """Generate a star designation."""
        prefixes = ["HD", "HR", "Gliese", "Kepler", "TRAPPIST", "TOI", "Proxima", "Alpha", "Beta", "Gamma"]
        return f"{self.rng.choice(prefixes)}-{self.rng.randint(1, 9999)}"

    def _generate_planet_name(self, star_name: str, index: int) -> str:
        """Generate planet name based on star."""
        letters = "bcdefghij"
        return f"{star_name} {letters[index % len(letters)]}"

    def _generate_galaxy_name(self) -> str:
        """Generate a galaxy name."""
        prefixes = ["NGC", "IC", "Messier", "UGC", "PGC", "Andromeda", "Whirlpool", "Sombrero"]
        suffixes = ["Major", "Minor", "Prime", "Alpha", "Nebula", "Cluster", ""]
        name = f"{self.rng.choice(prefixes)} {self.rng.randint(1, 9999)}"
        suffix = self.rng.choice(suffixes)
        if suffix:
            name += f" {suffix}"
        return name

    def _generate_planet(self, star: Star, orbit_index: int) -> Planet:
        """Generate a planet in a star system."""
        # Distance increases with orbit index
        base_distance = 0.2 + (orbit_index * self.rng.uniform(0.3, 1.5))
        distance = base_distance * (1.0 / self.constants.gravitational_constant)

        # Determine planet type based on distance
        if distance < 0.5:
            ptype = self.rng.choice([PlanetType.LAVA, PlanetType.ROCKY, PlanetType.DESERT])
        elif distance < 2.0:
            if self.constants.allows_chemistry():
                ptype = self.rng.choice([PlanetType.ROCKY, PlanetType.OCEAN, PlanetType.DESERT, PlanetType.GARDEN])
            else:
                ptype = self.rng.choice([PlanetType.ROCKY, PlanetType.DESERT])
        elif distance < 5.0:
            ptype = self.rng.choice([PlanetType.GAS_GIANT, PlanetType.ICE_GIANT, PlanetType.FROZEN])
        else:
            ptype = self.rng.choice([PlanetType.ICE_GIANT, PlanetType.FROZEN, PlanetType.GAS_GIANT])

        # Size based on type
        if ptype in [PlanetType.GAS_GIANT, PlanetType.ICE_GIANT]:
            mass = self.rng.uniform(15, 350)
            radius = self.rng.uniform(3, 12)
        else:
            mass = self.rng.uniform(0.1, 8)
            radius = self.rng.uniform(0.4, 2.5)

        # Atmosphere and water
        has_atmo = ptype != PlanetType.ROCKY or self.rng.random() > 0.3
        has_water = ptype in [PlanetType.OCEAN, PlanetType.GARDEN, PlanetType.FROZEN] or (
            ptype == PlanetType.ROCKY and self.rng.random() > 0.6
        )

        planet = Planet(
            name=self._generate_planet_name(star.name, orbit_index),
            planet_type=ptype,
            distance_au=distance,
            mass_earth=mass,
            radius_earth=radius,
            has_atmosphere=has_atmo,
            has_water=has_water,
            moons=self.rng.randint(0, 20) if ptype in [PlanetType.GAS_GIANT, PlanetType.ICE_GIANT] else self.rng.randint(0, 3)
        )

        # Check for life
        hz_inner, hz_outer = star.habitable_zone()
        in_habitable_zone = hz_inner <= distance <= hz_outer

        if (in_habitable_zone and
            planet.habitable_score() > 0.6 and
            self.constants.allows_life() and
            star.age > 1.0):  # Need time for life to evolve

            life_chance = planet.habitable_score() * (star.age / 10.0)
            if self.rng.random() < life_chance * 0.3:
                planet.has_life = True

                # Complexity depends on age
                if star.age > 8.0 and self.rng.random() < 0.1:
                    planet.life_complexity = "Intelligent Civilization"
                    self.intelligent_civilizations += 1
                elif star.age > 4.0 and self.rng.random() < 0.3:
                    planet.life_complexity = "Complex Multicellular"
                elif star.age > 2.0 and self.rng.random() < 0.5:
                    planet.life_complexity = "Simple Multicellular"
                else:
                    planet.life_complexity = "Microbial"

                self.planets_with_life += 1

        if planet.habitability_score() > 0.5:
            self.habitable_planets += 1

        return planet

    def _generate_star(self) -> Star:
        """Generate a star with planetary system."""
        # Star type distribution (red dwarfs most common)
        type_weights = [
            (StarType.RED_DWARF, 0.76),
            (StarType.ORANGE_DWARF, 0.12),
            (StarType.YELLOW_DWARF, 0.076),
            (StarType.WHITE_STAR, 0.03),
            (StarType.BLUE_GIANT, 0.003),
            (StarType.RED_GIANT, 0.01),
            (StarType.NEUTRON_STAR, 0.001),
            (StarType.BLACK_HOLE, 0.0001),
        ]

        roll = self.rng.random()
        cumulative = 0
        star_type = StarType.RED_DWARF
        for stype, weight in type_weights:
            cumulative += weight
            if roll < cumulative:
                star_type = stype
                break

        # Adjust mass slightly
        mass = star_type.mass_solar * self.rng.uniform(0.8, 1.2)

        # Age (older stars more common, but can't exceed lifespan)
        max_age = min(self.age, star_type.lifespan_years / 1e9)
        age = self.rng.uniform(0.1, max_age) if max_age > 0.1 else 0.1

        star = Star(
            name=self._generate_star_name(),
            star_type=star_type,
            mass=mass,
            age=age
        )

        # Generate planets (if star type allows)
        if star.has_habitable_zone():
            num_planets = self.rng.randint(0, 12)
            for i in range(num_planets):
                planet = self._generate_planet(star, i)
                star.planets.append(planet)
                self.total_planets += 1

        return star

    def _generate_galaxy(self) -> Galaxy:
        """Generate a galaxy with stars."""
        galaxy_types = ["Spiral", "Elliptical", "Irregular", "Lenticular", "Ring"]
        gtype = self.rng.choice(galaxy_types)

        # Star count varies by type
        if gtype == "Elliptical":
            star_count = self.rng.randint(100_000_000_000, 1_000_000_000_000)
        elif gtype == "Spiral":
            star_count = self.rng.randint(100_000_000, 400_000_000_000)
        else:
            star_count = self.rng.randint(1_000_000, 100_000_000_000)

        diameter = int(star_count ** 0.35 * self.rng.uniform(0.5, 2.0))
        age = self.rng.uniform(1.0, self.age)

        galaxy = Galaxy(
            name=self._generate_galaxy_name(),
            galaxy_type=gtype,
            star_count=star_count,
            diameter_ly=diameter,
            age=age,
            has_supermassive_black_hole=self.rng.random() > 0.1
        )

        self.total_stars += star_count

        return galaxy

    def generate(self, detail_galaxies: int = 3, detail_stars_per_galaxy: int = 5):
        """Generate the universe."""
        if not self.constants.is_stable():
            self.fate = "UNSTABLE - Universe collapsed immediately after Big Bang"
            self.age = 0.0
            return

        # Universe age based on dark energy
        if self.constants.dark_energy > 3.0:
            self.age = self.rng.uniform(1, 20)
            self.fate = "BIG RIP - Dark energy tearing space apart"
        elif self.constants.dark_energy < 0.3:
            self.age = self.rng.uniform(50, 200)
            self.fate = "BIG CRUNCH - Universe will collapse back"
        else:
            self.age = self.rng.uniform(10, 100)
            self.fate = "HEAT DEATH - Eternal expansion and entropy"

        self.time_remaining = self.rng.uniform(self.age * 0.5, self.age * 100)

        # Number of galaxies based on size/age
        num_galaxies = int(self.age * 1e10 * self.constants.gravitational_constant)
        num_galaxies = max(1000, min(num_galaxies, 2_000_000_000_000))

        # Generate detailed galaxies
        for i in range(min(detail_galaxies, num_galaxies)):
            galaxy = self._generate_galaxy()

            # Generate detailed stars for this galaxy
            for j in range(detail_stars_per_galaxy):
                star = self._generate_star()
                galaxy.stars.append(star)

            self.galaxies.append(galaxy)

        # Add remaining galaxies as counts only
        remaining = num_galaxies - detail_galaxies
        for _ in range(min(remaining, 100)):  # Sample more
            g = self._generate_galaxy()
            # Don't store details, just count

# ═══════════════════════════════════════════════════════════════════════════════
# VISUALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def render_galaxy(galaxy: Galaxy) -> str:
    """Render ASCII art of a galaxy based on type."""
    if galaxy.galaxy_type == "Spiral":
        return f"""
{C.CYAN}            ✦   ·  ✧  ·   ✦
        ·    ╱ · ╲    ·
    ✧  ·   ╱ · ✦ · ╲   ·  ✧
       · ─── · ● · ─── ·
    ✦  ·   ╲ · ✧ · ╱   ·  ✦
        ·    ╲ · ╱    ·
            ✧   ·  ✦  ·   ✧{C.END}"""
    elif galaxy.galaxy_type == "Elliptical":
        return f"""
{C.YELLOW}           · ✧ · ✦ · ✧ ·
        ✦ · · · · · · · ✦
       · · · · ● · · · · ·
        ✧ · · · · · · · ✧
           · ✦ · ✧ · ✦ ·{C.END}"""
    elif galaxy.galaxy_type == "Ring":
        return f"""
{C.PURPLE}           ✧ · ✦ · ✧
        ✦ ·         · ✦
       ·       ●       ·
        ✧ ·         · ✧
           ✦ · ✧ · ✦{C.END}"""
    else:
        return f"""
{C.WHITE}        ✦   ✧     ✦
      ·   ✧   ●   ·   ✦
        ✦     ✧   ·
          ·   ✦{C.END}"""

def render_star_system(star: Star) -> str:
    """Render a star system."""
    lines = []

    # Star
    if star.star_type == StarType.BLACK_HOLE:
        star_symbol = "◉"
    elif star.star_type == StarType.NEUTRON_STAR:
        star_symbol = "✸"
    elif star.star_type in [StarType.BLUE_GIANT, StarType.RED_GIANT]:
        star_symbol = "★"
    else:
        star_symbol = "☀"

    color = star.star_type.color
    lines.append(f"    {color}{star_symbol} {star.name}{C.END} ({star.star_type.display_name})")
    lines.append(f"      {C.DIM}Mass: {star.mass:.2f} M☉ | Age: {star.age:.1f} Gyr{C.END}")

    if star.planets:
        hz_inner, hz_outer = star.habitable_zone()
        lines.append(f"      {C.GREEN}Habitable Zone: {hz_inner:.2f} - {hz_outer:.2f} AU{C.END}")
        lines.append("")

        for planet in star.planets:
            pcolor = planet.planet_type.color
            in_hz = hz_inner <= planet.distance_au <= hz_outer
            hz_marker = f" {C.GREEN}◆ HABITABLE ZONE{C.END}" if in_hz else ""

            life_marker = ""
            if planet.has_life:
                if "Intelligent" in planet.life_complexity:
                    life_marker = f" {C.YELLOW}★ {planet.life_complexity}!{C.END}"
                else:
                    life_marker = f" {C.GREEN}♦ {planet.life_complexity}{C.END}"

            lines.append(f"      {pcolor}● {planet.name}{C.END}")
            lines.append(f"        {planet.planet_type.display_name} | {planet.distance_au:.2f} AU | {planet.mass_earth:.1f} M⊕{hz_marker}{life_marker}")

            features = []
            if planet.has_atmosphere:
                features.append("Atmosphere")
            if planet.has_water:
                features.append("Water")
            if planet.moons > 0:
                features.append(f"{planet.moons} moon{'s' if planet.moons > 1 else ''}")
            if features:
                lines.append(f"        {C.DIM}{', '.join(features)}{C.END}")

    return '\n'.join(lines)

def render_constants(constants: PhysicalConstants) -> str:
    """Render physical constants comparison."""
    def bar(value, max_val=3.0, width=20):
        filled = int(min(value / max_val, 1.0) * width)
        if value < 0.7:
            color = C.BLUE
        elif value > 1.5:
            color = C.RED
        else:
            color = C.GREEN
        return f"{color}{'█' * filled}{'░' * (width - filled)}{C.END} {value:.2f}x"

    return f"""
    {C.BOLD}Physical Constants (relative to our universe):{C.END}

    Gravity (G):        {bar(constants.gravitational_constant)}
    Speed of Light (c): {bar(constants.speed_of_light)}
    Planck (h):         {bar(constants.planck_constant)}
    Fine Structure (α): {bar(constants.fine_structure)}
    Strong Force:       {bar(constants.strong_force)}
    Weak Force:         {bar(constants.weak_force)}
    Dark Energy (Λ):    {bar(constants.dark_energy, 5.0)}
    Dark Matter:        {bar(constants.dark_matter_ratio, 5.0)}
"""

def format_number(n: int) -> str:
    """Format large numbers nicely."""
    if n >= 1e12:
        return f"{n/1e12:.1f} trillion"
    elif n >= 1e9:
        return f"{n/1e9:.1f} billion"
    elif n >= 1e6:
        return f"{n/1e6:.1f} million"
    else:
        return f"{n:,}"

def display_universe(universe: Universe):
    """Display the generated universe."""
    clear()

    print(f"""
{C.PURPLE}{C.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██╗   ██╗███╗   ██╗██╗██╗   ██╗███████╗██████╗ ███████╗███████╗            ║
║   ██║   ██║████╗  ██║██║██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝            ║
║   ██║   ██║██╔██╗ ██║██║██║   ██║█████╗  ██████╔╝███████╗█████╗              ║
║   ██║   ██║██║╚██╗██║██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝              ║
║   ╚██████╔╝██║ ╚████║██║ ╚████╔╝ ███████╗██║  ██║███████║███████╗            ║
║    ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
{C.END}
""")

    print(f"    {C.CYAN}Universe ID: {C.WHITE}{universe.universe_id}{C.END}")
    print(f"    {C.CYAN}Seed: {C.WHITE}{universe.seed}{C.END}")
    print()

    # Physical constants
    print(render_constants(universe.constants))

    # Viability check
    print(f"    {C.BOLD}Universe Viability:{C.END}")
    stable = universe.constants.is_stable()
    chem = universe.constants.allows_chemistry()
    life = universe.constants.allows_life()

    print(f"    {'✓' if stable else '✗'} Stable Structure:     {C.GREEN if stable else C.RED}{'YES' if stable else 'NO - Universe cannot exist!'}{C.END}")
    print(f"    {'✓' if chem else '✗'} Complex Chemistry:     {C.GREEN if chem else C.RED}{'YES' if chem else 'NO - No molecules possible'}{C.END}")
    print(f"    {'✓' if life else '✗'} Life Possible:         {C.GREEN if life else C.RED}{'YES' if life else 'NO - Life cannot emerge'}{C.END}")
    print()

    if not stable:
        print(f"""
    {C.RED}{C.BOLD}╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║   THIS UNIVERSE COULD NOT EXIST                               ║
    ║                                                               ║
    ║   The physical constants are incompatible with a stable       ║
    ║   universe. It would collapse, explode, or never form         ║
    ║   matter in the first place.                                  ║
    ║                                                               ║
    ║   Try a different seed to generate a viable universe.         ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝{C.END}
""")
        return

    print(f"    {C.BOLD}═══════════════════════════════════════════════════════════════{C.END}")
    print()

    # Universe stats
    print(f"    {C.BOLD}Universe Statistics:{C.END}")
    print(f"    {C.CYAN}Age:{C.END}                    {universe.age:.2f} billion years")
    print(f"    {C.CYAN}Total Galaxies:{C.END}         ~{format_number(len(universe.galaxies) * 1_000_000_000)}")
    print(f"    {C.CYAN}Total Stars:{C.END}            ~{format_number(universe.total_stars)}")
    print(f"    {C.CYAN}Total Planets:{C.END}          ~{format_number(universe.total_planets * 1_000_000)}")
    print(f"    {C.CYAN}Habitable Planets:{C.END}      ~{format_number(universe.habitable_planets * 100_000)}")
    print(f"    {C.CYAN}Planets with Life:{C.END}      ~{format_number(universe.planets_with_life * 10_000)}")
    if universe.intelligent_civilizations > 0:
        print(f"    {C.YELLOW}{C.BOLD}Intelligent Civs:{C.END}       ~{format_number(universe.intelligent_civilizations * 1000)}")
    print()

    # Fate
    fate_color = C.RED if "RIP" in universe.fate or "CRUNCH" in universe.fate else C.CYAN
    print(f"    {C.BOLD}Ultimate Fate:{C.END} {fate_color}{universe.fate}{C.END}")
    print(f"    {C.DIM}Time remaining: ~{universe.time_remaining:.0f} billion years{C.END}")
    print()

    print(f"    {C.BOLD}═══════════════════════════════════════════════════════════════{C.END}")
    print()

    # Show detailed galaxies
    print(f"    {C.BOLD}Sample Galaxies:{C.END}")
    print()

    for galaxy in universe.galaxies:
        print(render_galaxy(galaxy))
        print(f"    {C.BOLD}{galaxy.name}{C.END}")
        print(f"    {C.DIM}{galaxy.galaxy_type} Galaxy | {format_number(galaxy.star_count)} stars | {format_number(galaxy.diameter_ly)} light-years{C.END}")
        print(f"    {C.DIM}Age: {galaxy.age:.1f} Gyr | {'Supermassive Black Hole at center' if galaxy.has_supermassive_black_hole else 'No central black hole'}{C.END}")
        print()

        if galaxy.stars:
            print(f"    {C.BOLD}Sample Star Systems:{C.END}")
            print()
            for star in galaxy.stars:
                print(render_star_system(star))
                print()

        print(f"    {C.DIM}{'─' * 60}{C.END}")
        print()

def big_bang_animation():
    """Show the Big Bang!"""
    clear()

    frames = [
        f"{C.WHITE}                              ·{C.END}",
        f"{C.YELLOW}                             ·•·{C.END}",
        f"{C.ORANGE}                           ·•✦•·{C.END}",
        f"{C.RED}                        · • ✦ ★ ✦ • ·{C.END}",
        f"{C.PURPLE}                    ·  •  ✦  ★  ✦  •  ·{C.END}",
        f"{C.BLUE}               ·   •   ✦   ★   ✦   •   ·{C.END}",
        f"{C.CYAN}          ·    •    ✦    ★    ✦    •    ·{C.END}",
        f"{C.WHITE}     ·     •     ✦     ★     ✦     •     ·{C.END}",
    ]

    print("\n" * 10)
    print(f"{C.BOLD}{C.WHITE}                         THE BIG BANG{C.END}")
    print()
    time.sleep(1)

    for frame in frames:
        clear()
        print("\n" * 10)
        print(f"{C.BOLD}{C.WHITE}                         THE BIG BANG{C.END}")
        print("\n" * 3)
        print(frame)
        time.sleep(0.3)

    # Expansion
    for i in range(5):
        clear()
        print("\n" * 8)
        stars = ''.join(random.choice(' ·✦★✧') for _ in range(60))
        for _ in range(10):
            line = ''.join(random.choice('  ·✦★✧') for _ in range(70))
            color = random.choice([C.WHITE, C.CYAN, C.YELLOW, C.PURPLE])
            print(f"{color}    {line}{C.END}")
        time.sleep(0.2)

    time.sleep(0.5)

def main():
    import sys

    # Get seed from command line or generate random
    if len(sys.argv) > 1:
        try:
            seed = int(sys.argv[1])
        except ValueError:
            # Use string as seed
            seed = int(hashlib.md5(sys.argv[1].encode()).hexdigest(), 16) % (2**32)
    else:
        seed = random.randint(0, 2**32)

    big_bang_animation()

    clear()
    print(f"\n{C.CYAN}    Generating universe from seed {seed}...{C.END}\n")

    # Loading animation
    stages = [
        "Inflating spacetime",
        "Cooling quark-gluon plasma",
        "Forming hydrogen atoms",
        "Igniting first stars",
        "Collapsing into galaxies",
        "Forging heavy elements in supernovae",
        "Forming planetary systems",
        "Checking for life emergence",
        "Calculating ultimate fate"
    ]

    universe = Universe(seed)

    for stage in stages:
        print(f"    {C.DIM}[{'█' * random.randint(1,3)}{'░' * random.randint(1,2)}]{C.END} {stage}...", end='')
        sys.stdout.flush()
        time.sleep(0.3)
        print(f" {C.GREEN}✓{C.END}")

    universe.generate(detail_galaxies=3, detail_stars_per_galaxy=5)

    time.sleep(0.5)
    display_universe(universe)

    print(f"""
    {C.DIM}═══════════════════════════════════════════════════════════════{C.END}

    {C.CYAN}Generate another universe:{C.END}
      python3 universe_generator.py           {C.DIM}# Random seed{C.END}
      python3 universe_generator.py 12345     {C.DIM}# Specific seed{C.END}
      python3 universe_generator.py "hello"   {C.DIM}# Seed from text{C.END}

    {C.YELLOW}Try different seeds to find universes with intelligent life!{C.END}

""")

if __name__ == "__main__":
    main()
