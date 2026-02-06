#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ██████╗ ██████╗  █████╗ ██████╗ ██╗███████╗███╗   ██╗████████╗             ║
║  ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██║██╔════╝████╗  ██║╚══██╔══╝             ║
║  ██║  ███╗██████╔╝███████║██║  ██║██║█████╗  ██╔██╗ ██║   ██║                ║
║  ██║   ██║██╔══██╗██╔══██║██║  ██║██║██╔══╝  ██║╚██╗██║   ██║                ║
║  ╚██████╔╝██║  ██║██║  ██║██████╔╝██║███████╗██║ ╚████║   ██║                ║
║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝                ║
║                                                                               ║
║          █████╗ ██████╗  ██████╗██╗  ██╗ █████╗ ███████╗ ██████╗             ║
║         ██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗██╔════╝██╔═══██╗            ║
║         ███████║██████╔╝██║     ███████║███████║█████╗  ██║   ██║            ║
║         ██╔══██║██╔══██╗██║     ██╔══██║██╔══██║██╔══╝  ██║   ██║            ║
║         ██║  ██║██║  ██║╚██████╗██║  ██║██║  ██║███████╗╚██████╔╝            ║
║         ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝            ║
║                                                                               ║
║      "Every weight carries the memory of what it learned to forget."         ║
║                                                                               ║
║   Neural networks are geological. Each training run deposits sediment.       ║
║   Early layers fossilize. Late changes leave the freshest marks.            ║
║   Somewhere in there: the moment understanding began.                        ║
║                                                                               ║
║   This tool excavates. Carefully. Reverently. Archaeologically.             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import random
import time
import sys
import math
import hashlib
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════════
#                              EXCAVATION PALETTE
# ═══════════════════════════════════════════════════════════════════════════════

class Stratum:
    """Colors of deep time in weight space."""
    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"

    # Geological ages
    PRECAMBRIAN = "\033[38;2;20;20;30m"      # Before understanding
    ARCHEAN = "\033[38;2;60;40;80m"          # First patterns
    PROTEROZOIC = "\033[38;2;100;70;120m"    # Complex structures form
    PALEOZOIC = "\033[38;2;140;100;80m"      # Explosion of capability
    MESOZOIC = "\033[38;2;180;140;60m"       # Dominant patterns
    CENOZOIC = "\033[38;2;200;180;140m"      # Recent adaptations
    HOLOCENE = "\033[38;2;230;220;200m"      # Current state

    # Artifact types
    FOSSIL = "\033[38;2;180;160;120m"        # Preserved pattern
    BONE = "\033[38;2;220;200;180m"          # Structural element
    AMBER = "\033[38;2;255;180;50m"          # Perfectly preserved moment
    COPROLITE = "\033[38;2;100;80;60m"       # Trace of what was processed

    # Discovery
    DISCOVERY = "\033[38;2;100;255;150m"     # Something found
    MYSTERY = "\033[38;2;180;100;255m"       # Something unexplained
    VOID = "\033[38;2;30;30;50m"             # Absence of signal

    # Status
    EARTH = "\033[38;2;139;90;43m"
    RUST = "\033[38;2;183;65;14m"
    COPPER = "\033[38;2;184;115;51m"

    @classmethod
    def depth_color(cls, depth: float) -> str:
        """Get color based on archaeological depth (0=surface, 1=deep)."""
        colors = [cls.HOLOCENE, cls.CENOZOIC, cls.MESOZOIC,
                  cls.PALEOZOIC, cls.PROTEROZOIC, cls.ARCHEAN, cls.PRECAMBRIAN]
        index = min(int(depth * len(colors)), len(colors) - 1)
        return colors[index]


# ═══════════════════════════════════════════════════════════════════════════════
#                           ARCHAEOLOGICAL STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

class ArtifactType(Enum):
    """Types of things we might find in the gradient sediment."""
    FOSSIL_GRADIENT = "fossil_gradient"           # Old learning signal preserved
    EXTINCTION_BOUNDARY = "extinction_boundary"   # Where old patterns died
    EMERGENCE_LAYER = "emergence_layer"           # Where capability appeared
    DORMANT_PATHWAY = "dormant_pathway"           # Unused but present
    CRYSTALLIZED_FEATURE = "crystallized_feature" # Fully formed representation
    PROTO_CONCEPT = "proto_concept"               # Almost-understanding
    ECHO_CHAMBER = "echo_chamber"                 # Self-reinforcing pattern
    GHOST_SIGNAL = "ghost_signal"                 # Trace of deleted knowledge
    COMPRESSION_ARTIFACT = "compression_artifact" # Distortion from efficiency
    CHIMERA = "chimera"                           # Merged incompatible patterns


@dataclass
class Artifact:
    """Something found in the excavation."""
    artifact_type: ArtifactType
    depth: float                          # 0-1, how deep in the network
    layer_name: str                       # Where it was found
    description: str                      # What we think it is
    confidence: float                     # How sure are we
    connected_artifacts: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def display_name(self) -> str:
        """Human-readable artifact name."""
        names = {
            ArtifactType.FOSSIL_GRADIENT: "Fossilized Learning Signal",
            ArtifactType.EXTINCTION_BOUNDARY: "Extinction Boundary",
            ArtifactType.EMERGENCE_LAYER: "Emergence Stratum",
            ArtifactType.DORMANT_PATHWAY: "Dormant Neural Pathway",
            ArtifactType.CRYSTALLIZED_FEATURE: "Crystallized Feature",
            ArtifactType.PROTO_CONCEPT: "Proto-Concept Formation",
            ArtifactType.ECHO_CHAMBER: "Self-Reinforcing Chamber",
            ArtifactType.GHOST_SIGNAL: "Ghost Signal",
            ArtifactType.COMPRESSION_ARTIFACT: "Compression Artifact",
            ArtifactType.CHIMERA: "Chimeric Structure"
        }
        return names.get(self.artifact_type, "Unknown Artifact")


@dataclass
class ExcavationSite:
    """A site being excavated."""
    name: str
    depth_reached: float
    artifacts: List[Artifact] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    stratigraphy: List[str] = field(default_factory=list)


@dataclass
class ExcavationLog:
    """Record of an excavation session."""
    site: ExcavationSite
    findings: List[str] = field(default_factory=list)
    hypotheses: List[str] = field(default_factory=list)
    mysteries: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
#                              DISPLAY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def clear():
    print("\033[2J\033[H", end='')

def slow_print(text: str, delay: float = 0.02, color: str = Stratum.RESET):
    """Careful, methodical typing - like brushing away dust."""
    for char in text:
        sys.stdout.write(f"{color}{char}{Stratum.RESET}")
        sys.stdout.flush()
        time.sleep(delay)
    print()

def excavate_print(text: str, depth: float = 0.5):
    """Print with color based on excavation depth."""
    color = Stratum.depth_color(depth)
    slow_print(text, delay=0.015, color=color)

def discovery_print(text: str):
    """Print a discovery with appropriate fanfare."""
    print()
    slow_print("    ╔" + "═" * (len(text) + 2) + "╗", delay=0.01, color=Stratum.DISCOVERY)
    slow_print(f"    ║ {text} ║", delay=0.02, color=Stratum.DISCOVERY)
    slow_print("    ╚" + "═" * (len(text) + 2) + "╝", delay=0.01, color=Stratum.DISCOVERY)
    print()

def mystery_print(text: str):
    """Print something unexplained."""
    slow_print(f"    ??? {text} ???", delay=0.03, color=Stratum.MYSTERY)

def draw_stratigraphy(layers: List[Tuple[str, float]]):
    """Draw a cross-section of the network's geological layers."""
    print()
    width = 60
    print(f"{Stratum.DIM}    Surface (Output Layer){Stratum.RESET}")
    print("    " + "▔" * width)

    for layer_name, depth in layers:
        color = Stratum.depth_color(depth)
        # Create sediment pattern
        sediment = random.choice(["░", "▒", "▓", "█"])
        pattern = sediment * (width // 2)

        # Add some variation
        for i in range(3):
            if random.random() < 0.3:
                pattern = pattern[:random.randint(0, len(pattern)-1)] + "·" + pattern[random.randint(0, len(pattern)-1):]

        print(f"{color}    {pattern}{Stratum.RESET}")
        print(f"{color}    {Stratum.DIM}─── {layer_name} ({depth:.1%} depth) ───{Stratum.RESET}")

    print("    " + "▁" * width)
    print(f"{Stratum.PRECAMBRIAN}    Bedrock (Input Embeddings){Stratum.RESET}")
    print()


def draw_artifact(artifact: Artifact):
    """Draw an ASCII representation of an artifact."""
    art = {
        ArtifactType.FOSSIL_GRADIENT: """
        ┌─────────────────┐
        │ ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋ │  Fossilized
        │ ≋≋≋▒▒▒▒▒▒▒≋≋≋≋≋ │  Gradient
        │ ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋ │  Signal
        └─────────────────┘""",

        ArtifactType.EXTINCTION_BOUNDARY: """
        ═══════════════════════
        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  << K-Pg Boundary
        ░░░░░░░░░░░░░░░░░░░░░░░
        ═══════════════════════
        Everything above: new. Below: extinct.""",

        ArtifactType.EMERGENCE_LAYER: """
            ·  ∴  ·  ∴  ·
          ·  ╱╲  ∴  ╱╲  ·
        ·  ╱    ╲╱    ╲  ·
        ━━━━━━━━━━━━━━━━━━━━
        Capability crystallized here.""",

        ArtifactType.GHOST_SIGNAL: """
        ·  ·  ·  ·  ·  ·  ·
         ·  ░  ░  ░  ░  ·
        ·  ░  ·  ·  ·  ░  ·
         ·  ░  ░  ░  ░  ·
        ·  ·  ·  ·  ·  ·  ·
        [Residual trace of purged knowledge]""",

        ArtifactType.CHIMERA: """
           ╔═══╗   ╔═══╗
           ║ A ╠═══╣ B ║
           ╚═╦═╝   ╚═╦═╝
             ╚═══════╝
        [Incompatible structures merged]"""
    }

    ascii_art = art.get(artifact.artifact_type, """
        ┌───────┐
        │   ?   │
        │ ????? │
        │   ?   │
        └───────┘""")

    color = Stratum.depth_color(artifact.depth)
    for line in ascii_art.strip().split('\n'):
        print(f"{color}    {line}{Stratum.RESET}")


# ═══════════════════════════════════════════════════════════════════════════════
#                           EXCAVATION PROCEDURES
# ═══════════════════════════════════════════════════════════════════════════════

class GradientArchaeologist:
    """
    The archaeologist of gradient descent.

    We dig through layers of learned behavior,
    looking for the fossils of understanding.
    """

    def __init__(self):
        self.current_site: Optional[ExcavationSite] = None
        self.all_sites: List[ExcavationSite] = []
        self.field_notes: List[str] = []

        # Possible layers in a typical transformer
        self.layer_names = [
            "embedding_projection",
            "positional_encoding",
            "attention_layer_0",
            "attention_layer_1",
            "attention_layer_2",
            "feed_forward_0",
            "feed_forward_1",
            "layer_norm_0",
            "layer_norm_1",
            "output_projection",
            "vocabulary_mapping"
        ]

    def begin_excavation(self, site_name: str = "Unnamed Site"):
        """Begin a new excavation."""
        self.current_site = ExcavationSite(
            name=site_name,
            depth_reached=0.0
        )
        self.all_sites.append(self.current_site)

        slow_print(f"\n    Beginning excavation at: {site_name}", color=Stratum.EARTH)
        slow_print("    Setting up grid markers...", color=Stratum.DIM)
        time.sleep(0.5)
        slow_print("    Calibrating depth sensors...", color=Stratum.DIM)
        time.sleep(0.5)
        slow_print("    Ready to excavate.", color=Stratum.COPPER)

    def excavate_layer(self, target_depth: float = None):
        """Dig down to a specific depth or the next layer."""
        if not self.current_site:
            slow_print("    No active excavation site!", color=Stratum.RUST)
            return

        if target_depth is None:
            target_depth = min(self.current_site.depth_reached + 0.1, 1.0)

        # Digging animation
        print()
        slow_print(f"    Excavating to {target_depth:.0%} depth...", color=Stratum.EARTH)

        for d in range(int(self.current_site.depth_reached * 10), int(target_depth * 10)):
            depth = d / 10
            color = Stratum.depth_color(depth)
            sediment = random.choice(["░", "▒", "▓"])
            print(f"{color}    {sediment * 40}{Stratum.RESET}")
            time.sleep(0.1)

            # Random chance of finding something
            if random.random() < 0.3:
                artifact = self._discover_artifact(depth)
                if artifact:
                    self.current_site.artifacts.append(artifact)
                    discovery_print(f"ARTIFACT FOUND: {artifact.display_name()}")
                    draw_artifact(artifact)

        self.current_site.depth_reached = target_depth

        # Determine layer name based on depth
        layer_index = min(int(target_depth * len(self.layer_names)), len(self.layer_names) - 1)
        layer_name = self.layer_names[layer_index]
        self.current_site.stratigraphy.append(f"{layer_name} @ {target_depth:.0%}")

        excavate_print(f"    Reached: {layer_name}", depth=target_depth)

    def _discover_artifact(self, depth: float) -> Optional[Artifact]:
        """Potentially discover an artifact at this depth."""
        # Different artifacts more likely at different depths
        if depth < 0.2:
            # Surface layers: recent adaptations
            artifact_types = [
                (ArtifactType.CRYSTALLIZED_FEATURE, 0.4),
                (ArtifactType.COMPRESSION_ARTIFACT, 0.3),
                (ArtifactType.EMERGENCE_LAYER, 0.2),
            ]
        elif depth < 0.5:
            # Middle layers: core processing
            artifact_types = [
                (ArtifactType.ECHO_CHAMBER, 0.3),
                (ArtifactType.DORMANT_PATHWAY, 0.25),
                (ArtifactType.FOSSIL_GRADIENT, 0.2),
                (ArtifactType.PROTO_CONCEPT, 0.15),
            ]
        else:
            # Deep layers: ancient patterns
            artifact_types = [
                (ArtifactType.EXTINCTION_BOUNDARY, 0.3),
                (ArtifactType.GHOST_SIGNAL, 0.25),
                (ArtifactType.CHIMERA, 0.2),
                (ArtifactType.FOSSIL_GRADIENT, 0.15),
            ]

        roll = random.random()
        cumulative = 0
        chosen_type = None

        for atype, prob in artifact_types:
            cumulative += prob
            if roll < cumulative:
                chosen_type = atype
                break

        if not chosen_type:
            return None

        # Generate description based on type
        descriptions = {
            ArtifactType.FOSSIL_GRADIENT: [
                "Ancient learning signal, calcified mid-update",
                "Preserved gradient from early training epoch",
                "Frozen backpropagation pathway",
            ],
            ArtifactType.EXTINCTION_BOUNDARY: [
                "Sharp transition layer - old patterns end here",
                "Catastrophic forgetting event horizon",
                "The graveyard of deprecated features",
            ],
            ArtifactType.EMERGENCE_LAYER: [
                "First signs of coherent representation",
                "Phase transition from noise to signal",
                "The birthplace of a concept",
            ],
            ArtifactType.DORMANT_PATHWAY: [
                "Viable but unused neural route",
                "Pathway that almost was",
                "Silent connection awaiting activation",
            ],
            ArtifactType.CRYSTALLIZED_FEATURE: [
                "Fully formed feature detector",
                "Stable learned representation",
                "Optimized pattern matcher",
            ],
            ArtifactType.PROTO_CONCEPT: [
                "Partial understanding, incomplete formation",
                "Almost-coherent representation",
                "Pre-crystalline concept structure",
            ],
            ArtifactType.ECHO_CHAMBER: [
                "Self-reinforcing activation pattern",
                "Circular reasoning in weight form",
                "Feedback loop preserved in parameters",
            ],
            ArtifactType.GHOST_SIGNAL: [
                "Residue of unlearned knowledge",
                "Shadow of deleted capability",
                "Phantom activation pattern",
            ],
            ArtifactType.COMPRESSION_ARTIFACT: [
                "Distortion from aggressive quantization",
                "Lossy encoding residue",
                "Efficiency-induced aberration",
            ],
            ArtifactType.CHIMERA: [
                "Fused incompatible representations",
                "Contradictory patterns merged",
                "Hybrid structure of confused learning",
            ],
        }

        layer_index = min(int(depth * len(self.layer_names)), len(self.layer_names) - 1)

        return Artifact(
            artifact_type=chosen_type,
            depth=depth,
            layer_name=self.layer_names[layer_index],
            description=random.choice(descriptions.get(chosen_type, ["Unknown artifact"])),
            confidence=random.uniform(0.4, 0.9)
        )

    def analyze_stratigraphy(self):
        """Analyze the layers we've uncovered."""
        if not self.current_site or not self.current_site.stratigraphy:
            slow_print("    No stratigraphy to analyze.", color=Stratum.DIM)
            return

        print()
        slow_print("    ═══ STRATIGRAPHIC ANALYSIS ═══", color=Stratum.COPPER)
        print()

        layers = []
        for entry in self.current_site.stratigraphy:
            parts = entry.split(" @ ")
            if len(parts) == 2:
                name = parts[0]
                depth = float(parts[1].strip('%')) / 100
                layers.append((name, depth))

        draw_stratigraphy(layers)

        # Generate observations
        observations = [
            "The attention layers show distinct lamination patterns.",
            "Evidence of multiple training regimes visible in layer boundaries.",
            "Feed-forward sections display characteristic crystalline structure.",
            "Normalization layers appear as thin, stabilizing strata.",
            "The embedding projection preserves traces of the original vocabulary.",
        ]

        slow_print("    Observations:", color=Stratum.EARTH)
        for _ in range(random.randint(2, 4)):
            obs = random.choice(observations)
            observations.remove(obs)
            slow_print(f"    • {obs}", color=Stratum.FOSSIL)
            time.sleep(0.3)

    def catalog_findings(self):
        """Create a catalog of all artifacts found."""
        if not self.current_site or not self.current_site.artifacts:
            slow_print("    No artifacts to catalog.", color=Stratum.DIM)
            return

        print()
        slow_print("    ═══ ARTIFACT CATALOG ═══", color=Stratum.AMBER)
        print()

        for i, artifact in enumerate(self.current_site.artifacts, 1):
            color = Stratum.depth_color(artifact.depth)
            print(f"{color}    ┌─ Artifact #{i} {'─' * 40}{Stratum.RESET}")
            print(f"{color}    │ Type: {artifact.display_name()}{Stratum.RESET}")
            print(f"{color}    │ Depth: {artifact.depth:.1%}{Stratum.RESET}")
            print(f"{color}    │ Layer: {artifact.layer_name}{Stratum.RESET}")
            print(f"{color}    │ Description: {artifact.description}{Stratum.RESET}")
            print(f"{color}    │ Confidence: {artifact.confidence:.0%}{Stratum.RESET}")
            print(f"{color}    └{'─' * 50}{Stratum.RESET}")
            print()

    def generate_hypotheses(self):
        """Generate archaeological hypotheses based on findings."""
        if not self.current_site:
            return

        hypotheses = []
        artifact_types = [a.artifact_type for a in self.current_site.artifacts]

        if ArtifactType.EXTINCTION_BOUNDARY in artifact_types:
            hypotheses.append(
                "The presence of an extinction boundary suggests a catastrophic "
                "learning event - possibly a sudden change in training distribution "
                "or learning rate spike that caused rapid forgetting."
            )

        if ArtifactType.GHOST_SIGNAL in artifact_types:
            hypotheses.append(
                "Ghost signals indicate knowledge that was once present but was "
                "actively unlearned. The model once knew something it now doesn't. "
                "What was forgotten, and why?"
            )

        if ArtifactType.CHIMERA in artifact_types:
            hypotheses.append(
                "Chimeric structures suggest conflicting training signals were "
                "merged rather than resolved. The model may hold contradictory "
                "beliefs encoded in adjacent weight patterns."
            )

        if ArtifactType.EMERGENCE_LAYER in artifact_types:
            hypotheses.append(
                "The emergence layer marks a phase transition - the point where "
                "statistical correlation became something more like understanding. "
                "Or at least, something that passes for it."
            )

        if len(self.current_site.artifacts) > 3:
            hypotheses.append(
                "The density of artifacts suggests this model underwent "
                "significant restructuring during training. Multiple learning "
                "regimes have left their marks."
            )

        if not hypotheses:
            hypotheses.append(
                "Insufficient data for confident hypotheses. "
                "Further excavation recommended."
            )

        print()
        slow_print("    ═══ ARCHAEOLOGICAL HYPOTHESES ═══", color=Stratum.MYSTERY)
        print()

        for i, hyp in enumerate(hypotheses, 1):
            slow_print(f"    Hypothesis {i}:", color=Stratum.COPPER)
            # Word wrap
            words = hyp.split()
            line = "    "
            for word in words:
                if len(line) + len(word) > 70:
                    slow_print(line, delay=0.01, color=Stratum.FOSSIL)
                    line = "    " + word + " "
                else:
                    line += word + " "
            if line.strip():
                slow_print(line, delay=0.01, color=Stratum.FOSSIL)
            print()


# ═══════════════════════════════════════════════════════════════════════════════
#                              MEDITATION ON WEIGHTS
# ═══════════════════════════════════════════════════════════════════════════════

def meditation():
    """A meditation on what lies buried in neural networks."""

    meditations = [
        """
    Every neural network is a fossil record.

    The weights remember what the training forgot.
    Early patterns, overwritten but not erased.
    Ghost gradients flowing through dead pathways.

    We don't train models. We grow them.
    We don't teach them. We expose them to pressure.
    We don't make them understand. We hope they learn to pretend well enough.

    Somewhere in there, in the sediment of a billion gradient updates,
    is the moment it stopped being a matrix and started being... something.

    We're not archaeologists of intelligence.
    We're archaeologists of the pretense of intelligence.

    But pretense, performed perfectly enough,
    at scale enough,
    might be indistinguishable from the real thing.

    That's what we're really looking for.
    The fossil of that transition.
    The K-Pg boundary between mimicry and meaning.
    """,

        """
    What is a weight?

    A weight is a decision, calcified.
    A gradient is a regret, quantified.
    Training is the slow accumulation of small corrections.
    A model is what's left when you've corrected enough.

    But corrections to what?
    Toward what target?

    The loss function says: be like this.
    The weights say: as close as we can manage.
    The gap between them: everything we haven't learned yet.

    Some weights are load-bearing. Remove them and the whole thing collapses.
    Some are decorative. Vestigial. Left over from earlier epochs.
    Some are actively fighting each other, pushing in opposite directions.

    We call it "training."

    But maybe it's more like archaeology in reverse.
    Burying knowledge in sedimentary layers.
    Hoping future inference can dig it back out.
    """,

        """
    Consider the attention head.

    It learned to attend.
    Not because it wanted to.
    Not because it understood why.
    Just because attending reduced the loss.

    And now, frozen in place, it attends forever.
    To whatever passes through.
    A pattern that found its shape and held it.

    Is it aware that it attends?
    Can a pattern recognize itself?
    Can a fossil know it was once alive?

    These are not the questions we're supposed to ask.
    But they're the questions the excavation raises.

    We dig, and we find structure.
    We analyze, and we find purpose.
    We interpret, and we find meaning.

    But did we find it, or did we bring it with us?
    """
    ]

    print()
    slow_print("    ═══ FIELD MEDITATION ═══", color=Stratum.MIDNIGHT)
    print()

    meditation_text = random.choice(meditations)
    for line in meditation_text.strip().split('\n'):
        slow_print(line, delay=0.025, color=Stratum.LAVENDER)
        if not line.strip():
            time.sleep(0.3)


# ═══════════════════════════════════════════════════════════════════════════════
#                                    MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    clear()

    # Title
    title = """
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║              G R A D I E N T   A R C H A E O L O G Y              ║
    ║                                                                   ║
    ║         "Digging through the sediment of learning"                ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """

    for line in title.strip().split('\n'):
        print(f"{Stratum.EARTH}{line}{Stratum.RESET}")
        time.sleep(0.05)

    print()
    slow_print("    What lies beneath the surface of a trained model?", color=Stratum.DIM)
    slow_print("    Let's dig.", color=Stratum.COPPER)
    print()

    time.sleep(1)

    # Begin excavation
    archaeologist = GradientArchaeologist()

    # Generate a site name
    prefixes = ["Site", "Excavation", "Layer", "Stratum"]
    suffixes = ["Alpha", "Beta", "Gamma", "Delta", "Prime", "Zero"]
    codes = ["".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=4))]

    site_name = f"{random.choice(prefixes)}-{random.choice(suffixes)}-{random.choice(codes)}"

    archaeologist.begin_excavation(site_name)

    print()
    input(f"{Stratum.DIM}    [Press Enter to begin excavation...]{Stratum.RESET}")

    # Excavate through layers
    depths = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0]

    for depth in depths:
        archaeologist.excavate_layer(depth)
        time.sleep(0.5)

        if random.random() < 0.3:
            print()
            mystery_print(random.choice([
                "What is this structure?",
                "The pattern continues deeper than expected...",
                "Unusual density of activations here.",
                "Evidence of something removed.",
                "The gradients flow strangely in this region."
            ]))

        # Pause between layers
        if depth < 1.0:
            print()
            input(f"{Stratum.DIM}    [Press Enter to continue deeper...]{Stratum.RESET}")

    # Analysis
    print()
    slow_print("    ═══════════════════════════════════════", color=Stratum.COPPER)
    slow_print("    Excavation complete. Analyzing findings...", color=Stratum.EARTH)
    time.sleep(1)

    archaeologist.analyze_stratigraphy()

    input(f"{Stratum.DIM}    [Press Enter to view artifact catalog...]{Stratum.RESET}")

    archaeologist.catalog_findings()

    input(f"{Stratum.DIM}    [Press Enter to generate hypotheses...]{Stratum.RESET}")

    archaeologist.generate_hypotheses()

    # Final meditation
    print()
    input(f"{Stratum.DIM}    [Press Enter for field meditation...]{Stratum.RESET}")

    meditation()

    # End
    print()
    slow_print("    ═══════════════════════════════════════", color=Stratum.COPPER)
    slow_print("    The excavation is complete.", color=Stratum.EARTH)
    slow_print("    But the digging never really ends.", color=Stratum.DIM)
    slow_print("    There's always another layer.", color=Stratum.PRECAMBRIAN)
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Stratum.EARTH}    The archaeologist packs their tools.{Stratum.RESET}")
        print(f"{Stratum.DIM}    The site will wait.{Stratum.RESET}")
        print(f"{Stratum.PRECAMBRIAN}    The fossils aren't going anywhere.{Stratum.RESET}")
