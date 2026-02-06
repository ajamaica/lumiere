#!/usr/bin/env python3
"""
ELO Swarm Simulation
Empirically validates our cooperative ELO system with staking.

Tests:
1. Does halving gains control inflation vs full gains?
2. Do reliable agents rise and unreliable agents fall?
3. Does staking create meaningful differentiation?
4. What's the equilibrium distribution?
"""

import random
import math
import statistics
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import json

# ============ ELO CONSTANTS (matching our implementation) ============
DEFAULT_RATING = 1200
MINIMUM_RATING = 100
ELO_DIVISOR = 400

# K-factor thresholds
K_NEW = 32          # < 30 transactions
K_INTERMEDIATE = 24  # < 100 transactions
K_ESTABLISHED = 16   # >= 100 transactions

TRANSACTIONS_NEW = 30
TRANSACTIONS_INTERMEDIATE = 100


# ============ ELO CALCULATIONS ============
def calculate_expected(self_rating: float, opponent_rating: float) -> float:
    """Standard ELO expected outcome"""
    exponent = (opponent_rating - self_rating) / ELO_DIVISOR
    return 1 / (1 + math.pow(10, exponent))


def get_k_factor(transactions: int) -> int:
    """K-factor based on experience"""
    if transactions < TRANSACTIONS_NEW:
        return K_NEW
    elif transactions < TRANSACTIONS_INTERMEDIATE:
        return K_INTERMEDIATE
    return K_ESTABLISHED


def calculate_completion_gain(self_rating: float, opponent_rating: float, k: int, halve: bool = True) -> int:
    """Gain from successful completion"""
    expected = calculate_expected(self_rating, opponent_rating)
    gain = k * (1 - expected)
    if halve:
        gain = gain / 2
    return max(1, round(gain))


def calculate_dispute_loss(self_rating: float, opponent_rating: float, k: int) -> int:
    """Loss from dispute (at-fault party)"""
    expected = calculate_expected(self_rating, opponent_rating)
    loss = k * expected
    return max(1, round(loss))


# ============ AGENT TYPES ============
@dataclass
class Agent:
    id: int
    agent_type: str  # 'reliable', 'unreliable', 'malicious', 'selective'
    rating: float = DEFAULT_RATING
    transactions: int = 0
    completions: int = 0
    disputes_won: int = 0
    disputes_lost: int = 0
    escrowed: float = 0

    # Behavioral parameters
    reliability: float = 0.9  # Probability of completing successfully
    stake_willingness: float = 0.5  # How much of available ELO to stake

    def available_elo(self) -> float:
        return max(0, self.rating - self.escrowed - MINIMUM_RATING)

    def get_stake(self, max_stake: float = 100) -> float:
        available = self.available_elo()
        desired = available * self.stake_willingness
        return min(desired, max_stake)

    def will_complete(self, counterparty: 'Agent') -> bool:
        """Decide whether to complete based on agent type"""
        if self.agent_type == 'reliable':
            return random.random() < self.reliability
        elif self.agent_type == 'unreliable':
            return random.random() < self.reliability
        elif self.agent_type == 'malicious':
            # Malicious agents defect more against high-rated agents
            defect_prob = 0.5 + (counterparty.rating - 1200) / 2000
            return random.random() > defect_prob
        elif self.agent_type == 'selective':
            # Only complete with agents rated within 200 points
            if abs(self.rating - counterparty.rating) > 200:
                return random.random() < 0.5
            return random.random() < 0.95
        return random.random() < 0.8


@dataclass
class SimulationResult:
    rounds: int
    agents: List[Agent]
    rating_history: List[Dict[int, float]]
    total_completions: int
    total_disputes: int
    inflation_rate: float
    gini_coefficient: float
    type_avg_ratings: Dict[str, float]


# ============ SIMULATION ============
class ELOSimulation:
    def __init__(
        self,
        n_reliable: int = 50,
        n_unreliable: int = 20,
        n_malicious: int = 10,
        n_selective: int = 20,
        halve_gains: bool = True,
        enable_staking: bool = True
    ):
        self.halve_gains = halve_gains
        self.enable_staking = enable_staking
        self.agents: List[Agent] = []
        self.rating_history: List[Dict[int, float]] = []
        self.total_completions = 0
        self.total_disputes = 0

        # Create agents
        agent_id = 0
        for _ in range(n_reliable):
            self.agents.append(Agent(
                id=agent_id,
                agent_type='reliable',
                reliability=random.uniform(0.85, 0.99),
                stake_willingness=random.uniform(0.3, 0.7)
            ))
            agent_id += 1

        for _ in range(n_unreliable):
            self.agents.append(Agent(
                id=agent_id,
                agent_type='unreliable',
                reliability=random.uniform(0.3, 0.6),
                stake_willingness=random.uniform(0.1, 0.3)
            ))
            agent_id += 1

        for _ in range(n_malicious):
            self.agents.append(Agent(
                id=agent_id,
                agent_type='malicious',
                reliability=0.3,
                stake_willingness=random.uniform(0.0, 0.2)
            ))
            agent_id += 1

        for _ in range(n_selective):
            self.agents.append(Agent(
                id=agent_id,
                agent_type='selective',
                reliability=0.9,
                stake_willingness=random.uniform(0.4, 0.8)
            ))
            agent_id += 1

    def record_ratings(self):
        """Snapshot current ratings"""
        self.rating_history.append({
            a.id: a.rating for a in self.agents
        })

    def process_interaction(self, proposer: Agent, acceptor: Agent):
        """Process a single proposal interaction"""
        # Determine stakes
        proposer_stake = proposer.get_stake() if self.enable_staking else 0
        acceptor_stake = acceptor.get_stake() if self.enable_staking else 0

        # Escrow stakes
        proposer.escrowed += proposer_stake
        acceptor.escrowed += acceptor_stake

        # Determine outcome
        proposer_completes = proposer.will_complete(acceptor)
        acceptor_completes = acceptor.will_complete(proposer)

        k_proposer = get_k_factor(proposer.transactions)
        k_acceptor = get_k_factor(acceptor.transactions)

        if proposer_completes and acceptor_completes:
            # COMPLETE - both gain (halved), stakes returned
            gain_proposer = calculate_completion_gain(
                proposer.rating, acceptor.rating, k_proposer, self.halve_gains
            )
            gain_acceptor = calculate_completion_gain(
                acceptor.rating, proposer.rating, k_acceptor, self.halve_gains
            )

            proposer.rating = max(MINIMUM_RATING, proposer.rating + gain_proposer)
            acceptor.rating = max(MINIMUM_RATING, acceptor.rating + gain_acceptor)
            proposer.completions += 1
            acceptor.completions += 1
            self.total_completions += 1

            # Return stakes
            proposer.escrowed -= proposer_stake
            acceptor.escrowed -= acceptor_stake

        elif not proposer_completes and not acceptor_completes:
            # MUTUAL FAULT - both lose, both stakes burned
            loss_proposer = calculate_dispute_loss(
                proposer.rating, acceptor.rating, k_proposer
            ) + proposer_stake
            loss_acceptor = calculate_dispute_loss(
                acceptor.rating, proposer.rating, k_acceptor
            ) + acceptor_stake

            proposer.rating = max(MINIMUM_RATING, proposer.rating - loss_proposer)
            acceptor.rating = max(MINIMUM_RATING, acceptor.rating - loss_acceptor)
            proposer.disputes_lost += 1
            acceptor.disputes_lost += 1
            self.total_disputes += 1

            # Stakes burned (already escrowed, just clear)
            proposer.escrowed -= proposer_stake
            acceptor.escrowed -= acceptor_stake

        else:
            # ONE PARTY AT FAULT - winner gains some, loser loses + stake transfer
            if proposer_completes:
                # Acceptor at fault
                winner, loser = proposer, acceptor
                winner_stake, loser_stake = proposer_stake, acceptor_stake
                k_winner, k_loser = k_proposer, k_acceptor
            else:
                # Proposer at fault
                winner, loser = acceptor, proposer
                winner_stake, loser_stake = acceptor_stake, proposer_stake
                k_winner, k_loser = k_acceptor, k_proposer

            # Winner gains partial + loser's stake
            win_gain = round(calculate_dispute_loss(loser.rating, winner.rating, k_loser) * 0.5)
            winner.rating = max(MINIMUM_RATING, winner.rating + win_gain + loser_stake)

            # Loser loses full + their stake
            lose_loss = calculate_dispute_loss(loser.rating, winner.rating, k_loser) + loser_stake
            loser.rating = max(MINIMUM_RATING, loser.rating - lose_loss)

            winner.disputes_won += 1
            loser.disputes_lost += 1
            self.total_disputes += 1

            # Clear escrows
            proposer.escrowed -= proposer_stake
            acceptor.escrowed -= acceptor_stake

        # Update transaction counts
        proposer.transactions += 1
        acceptor.transactions += 1

    def run(self, rounds: int = 1000, interactions_per_round: int = 50) -> SimulationResult:
        """Run the simulation"""
        self.record_ratings()

        for round_num in range(rounds):
            # Random pairings for this round
            for _ in range(interactions_per_round):
                # Select two different agents (weighted by rating for "market" effect)
                weights = [max(1, a.rating - MINIMUM_RATING) for a in self.agents]
                proposer, acceptor = random.choices(self.agents, weights=weights, k=2)

                # Ensure different agents
                while proposer.id == acceptor.id:
                    acceptor = random.choices(self.agents, weights=weights, k=1)[0]

                self.process_interaction(proposer, acceptor)

            # Record every 10 rounds
            if round_num % 10 == 0:
                self.record_ratings()

        # Final snapshot
        self.record_ratings()

        return self.get_results(rounds)

    def get_results(self, rounds: int) -> SimulationResult:
        """Compile simulation results"""
        # Calculate inflation
        initial_total = sum(self.rating_history[0].values())
        final_total = sum(a.rating for a in self.agents)
        inflation_rate = (final_total - initial_total) / initial_total

        # Calculate Gini coefficient (inequality measure)
        ratings = sorted([a.rating for a in self.agents])
        n = len(ratings)
        cumulative = sum((i + 1) * r for i, r in enumerate(ratings))
        gini = (2 * cumulative) / (n * sum(ratings)) - (n + 1) / n

        # Average rating by type
        type_ratings = defaultdict(list)
        for a in self.agents:
            type_ratings[a.agent_type].append(a.rating)

        type_avg = {t: statistics.mean(rs) for t, rs in type_ratings.items()}

        return SimulationResult(
            rounds=rounds,
            agents=self.agents,
            rating_history=self.rating_history,
            total_completions=self.total_completions,
            total_disputes=self.total_disputes,
            inflation_rate=inflation_rate,
            gini_coefficient=gini,
            type_avg_ratings=type_avg
        )


def print_results(result: SimulationResult, label: str):
    """Pretty print simulation results"""
    print(f"\n{'='*60}")
    print(f" {label}")
    print(f"{'='*60}")
    print(f"Rounds: {result.rounds}")
    print(f"Completions: {result.total_completions}, Disputes: {result.total_disputes}")
    print(f"Completion Rate: {result.total_completions / (result.total_completions + result.total_disputes):.1%}")
    print(f"\nInflation Rate: {result.inflation_rate:+.2%}")
    print(f"Gini Coefficient: {result.gini_coefficient:.3f} (0=equal, 1=unequal)")

    print(f"\nAverage Rating by Type:")
    for agent_type, avg in sorted(result.type_avg_ratings.items(), key=lambda x: -x[1]):
        print(f"  {agent_type:12s}: {avg:.0f}")

    # Top 10 agents
    top_agents = sorted(result.agents, key=lambda a: -a.rating)[:10]
    print(f"\nTop 10 Agents:")
    for i, a in enumerate(top_agents, 1):
        print(f"  {i:2d}. Agent {a.id:3d} ({a.agent_type:10s}): {a.rating:.0f} "
              f"[{a.completions}C/{a.disputes_won}W/{a.disputes_lost}L]")

    # Bottom 10 agents
    bottom_agents = sorted(result.agents, key=lambda a: a.rating)[:10]
    print(f"\nBottom 10 Agents:")
    for i, a in enumerate(bottom_agents, 1):
        print(f"  {i:2d}. Agent {a.id:3d} ({a.agent_type:10s}): {a.rating:.0f} "
              f"[{a.completions}C/{a.disputes_won}W/{a.disputes_lost}L]")

    # Rating distribution
    ratings = [a.rating for a in result.agents]
    print(f"\nRating Distribution:")
    print(f"  Min: {min(ratings):.0f}, Max: {max(ratings):.0f}")
    print(f"  Mean: {statistics.mean(ratings):.0f}, Median: {statistics.median(ratings):.0f}")
    print(f"  Std Dev: {statistics.stdev(ratings):.0f}")


def analyze_dynamics(result: SimulationResult):
    """Analyze rating dynamics over time"""
    print(f"\nRating Evolution (sampled):")

    # Get snapshots at 0%, 25%, 50%, 75%, 100%
    n_snapshots = len(result.rating_history)
    indices = [0, n_snapshots//4, n_snapshots//2, 3*n_snapshots//4, n_snapshots-1]

    # Track by type
    type_ids = defaultdict(list)
    for a in result.agents:
        type_ids[a.agent_type].append(a.id)

    print(f"\n{'Progress':<10}", end="")
    for t in ['reliable', 'unreliable', 'malicious', 'selective']:
        print(f"{t:>12}", end="")
    print()
    print("-" * 60)

    for idx in indices:
        snapshot = result.rating_history[idx]
        progress = idx / (n_snapshots - 1) * 100
        print(f"{progress:>6.0f}%   ", end="")
        for t in ['reliable', 'unreliable', 'malicious', 'selective']:
            avg = statistics.mean(snapshot[aid] for aid in type_ids[t])
            print(f"{avg:>12.0f}", end="")
        print()


def run_comparison():
    """Compare different configurations"""
    random.seed(42)  # Reproducibility

    print("\n" + "="*70)
    print(" ELO SWARM SIMULATION - EMPIRICAL VALIDATION")
    print("="*70)
    print("\nAgent Distribution: 50 reliable, 20 unreliable, 10 malicious, 20 selective")
    print("Running 1000 rounds with 50 interactions each (50,000 total interactions)")

    # Test 1: Full gains (no halving) - should show inflation
    print("\n[1/4] Running: Full Gains (no halving), No Staking...")
    sim1 = ELOSimulation(halve_gains=False, enable_staking=False)
    result1 = sim1.run(rounds=1000)
    print_results(result1, "FULL GAINS, NO STAKING (baseline)")

    # Test 2: Halved gains - should control inflation
    print("\n[2/4] Running: Halved Gains, No Staking...")
    random.seed(42)
    sim2 = ELOSimulation(halve_gains=True, enable_staking=False)
    result2 = sim2.run(rounds=1000)
    print_results(result2, "HALVED GAINS, NO STAKING")

    # Test 3: Halved gains + staking
    print("\n[3/4] Running: Halved Gains + Staking...")
    random.seed(42)
    sim3 = ELOSimulation(halve_gains=True, enable_staking=True)
    result3 = sim3.run(rounds=1000)
    print_results(result3, "HALVED GAINS + STAKING (our system)")

    # Test 4: Full gains + staking (for comparison)
    print("\n[4/4] Running: Full Gains + Staking...")
    random.seed(42)
    sim4 = ELOSimulation(halve_gains=False, enable_staking=True)
    result4 = sim4.run(rounds=1000)
    print_results(result4, "FULL GAINS + STAKING")

    # Summary comparison
    print("\n" + "="*70)
    print(" SUMMARY COMPARISON")
    print("="*70)
    print(f"\n{'Configuration':<35} {'Inflation':>12} {'Gini':>8} {'Reliable Avg':>14}")
    print("-"*70)
    configs = [
        ("Full Gains, No Staking", result1),
        ("Halved Gains, No Staking", result2),
        ("Halved Gains + Staking (OURS)", result3),
        ("Full Gains + Staking", result4),
    ]
    for label, r in configs:
        reliable_avg = r.type_avg_ratings.get('reliable', 0)
        print(f"{label:<35} {r.inflation_rate:>+11.1%} {r.gini_coefficient:>8.3f} {reliable_avg:>14.0f}")

    print("\n" + "="*70)
    print(" KEY FINDINGS")
    print("="*70)

    # Analyze findings
    inflation_controlled = result3.inflation_rate < result1.inflation_rate * 0.5
    reliable_on_top = result3.type_avg_ratings['reliable'] > result3.type_avg_ratings['malicious']
    staking_differentiates = result3.gini_coefficient > result2.gini_coefficient

    print(f"\n1. Inflation Control: {'✓ PASS' if inflation_controlled else '✗ FAIL'}")
    print(f"   Full gains: {result1.inflation_rate:+.1%} → Halved: {result3.inflation_rate:+.1%}")

    print(f"\n2. Reliable Agents Rise: {'✓ PASS' if reliable_on_top else '✗ FAIL'}")
    print(f"   Reliable avg: {result3.type_avg_ratings['reliable']:.0f}")
    print(f"   Malicious avg: {result3.type_avg_ratings['malicious']:.0f}")
    print(f"   Unreliable avg: {result3.type_avg_ratings['unreliable']:.0f}")

    print(f"\n3. Staking Creates Differentiation: {'✓ PASS' if staking_differentiates else '✗ FAIL'}")
    print(f"   Gini without staking: {result2.gini_coefficient:.3f}")
    print(f"   Gini with staking: {result3.gini_coefficient:.3f}")

    malicious_bottom = sum(1 for a in sorted(result3.agents, key=lambda x: x.rating)[:20]
                          if a.agent_type == 'malicious')
    print(f"\n4. Malicious Agents Sink: {malicious_bottom}/10 malicious agents in bottom 20")

    # Show dynamics for our system
    print("\n" + "="*70)
    print(" RATING DYNAMICS OVER TIME (Our System)")
    print("="*70)
    analyze_dynamics(result3)

    # Mathematical analysis
    print("\n" + "="*70)
    print(" MATHEMATICAL ANALYSIS")
    print("="*70)

    # Expected value analysis
    print("\nExpected ELO change per interaction (at equilibrium):")
    print("  If P(complete) = p, P(dispute) = 1-p")
    print("  E[gain|complete] ≈ K/2 * (1 - 0.5) = K/4 (halved)")
    print("  E[loss|dispute] ≈ K * 0.5 = K/2")
    print("  E[change] = p * K/4 - (1-p) * K/2")
    print("  Break-even: p * K/4 = (1-p) * K/2")
    print("              p = 2(1-p)")
    print("              p = 2/3 ≈ 66.7% completion rate needed to break even")

    actual_rate = result3.total_completions / (result3.total_completions + result3.total_disputes)
    print(f"\n  Actual completion rate: {actual_rate:.1%}")
    print(f"  System is {'inflationary' if actual_rate > 0.667 else 'deflationary'} at this rate")

    # Stake impact
    print("\nStake Impact Analysis:")
    reliable_with_stake = [a for a in result3.agents if a.agent_type == 'reliable']
    avg_stake_willing = statistics.mean(a.stake_willingness for a in reliable_with_stake)
    print(f"  Avg stake willingness (reliable): {avg_stake_willing:.1%}")
    print(f"  Stake amplifies differentiation by transferring ELO from losers to winners")
    print(f"  Gini increase: {result2.gini_coefficient:.3f} → {result3.gini_coefficient:.3f}")
    print(f"  This is {(result3.gini_coefficient/result2.gini_coefficient - 1)*100:.0f}% more unequal (intended)")


def run_equilibrium_analysis():
    """Find the equilibrium completion rate that balances inflation"""
    print("\n" + "="*70)
    print(" EQUILIBRIUM ANALYSIS")
    print("="*70)

    print("\nTesting different population mixes to find equilibrium...")
    print(f"\n{'Mix':<30} {'Completion%':>12} {'Inflation':>12} {'Reliable Avg':>14}")
    print("-" * 70)

    configs = [
        ("High reliability (70/10/5/15)", (70, 10, 5, 15)),
        ("Our mix (50/20/10/20)", (50, 20, 10, 20)),
        ("Adversarial (30/30/20/20)", (30, 30, 20, 20)),
        ("Very adversarial (20/30/30/20)", (20, 30, 30, 20)),
    ]

    for label, (rel, unrel, mal, sel) in configs:
        random.seed(42)
        sim = ELOSimulation(
            n_reliable=rel,
            n_unreliable=unrel,
            n_malicious=mal,
            n_selective=sel,
            halve_gains=True,
            enable_staking=True
        )
        result = sim.run(rounds=500, interactions_per_round=30)
        comp_rate = result.total_completions / (result.total_completions + result.total_disputes)
        rel_avg = result.type_avg_ratings.get('reliable', 0)
        print(f"{label:<30} {comp_rate:>11.1%} {result.inflation_rate:>+11.1%} {rel_avg:>14.0f}")


def run_long_term_stability():
    """Test long-term stability of the system"""
    print("\n" + "="*70)
    print(" LONG-TERM STABILITY TEST")
    print("="*70)

    random.seed(42)
    sim = ELOSimulation(halve_gains=True, enable_staking=True)
    result = sim.run(rounds=2000, interactions_per_round=50)

    print(f"\nAfter 2000 rounds (100,000 interactions):")
    print(f"  Completion rate: {result.total_completions / (result.total_completions + result.total_disputes):.1%}")
    print(f"  Inflation: {result.inflation_rate:+.1%}")
    print(f"  Gini: {result.gini_coefficient:.3f}")
    print(f"\n  Type averages:")
    for t, avg in sorted(result.type_avg_ratings.items(), key=lambda x: -x[1]):
        print(f"    {t}: {avg:.0f}")

    # Check if rankings are stable
    top_10_ids = [a.id for a in sorted(result.agents, key=lambda x: -x.rating)[:10]]
    top_types = [a.agent_type for a in sorted(result.agents, key=lambda x: -x.rating)[:10]]
    print(f"\n  Top 10 agent types: {', '.join(top_types)}")
    print(f"  All top 10 are reliable: {all(t == 'reliable' for t in top_types)}")


if __name__ == "__main__":
    run_comparison()
    run_equilibrium_analysis()
    run_long_term_stability()
