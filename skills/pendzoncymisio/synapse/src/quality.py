#!/usr/bin/env python3
"""
quality.py - Decentralized Quality Tracking for HiveBrain

Implements a reputation system based on signed PQ attestations.
No central authority - quality is tracked via cryptographically
signed feedback from agents who use shared memory shards.

Copyright (c) 2026 HiveBrain Project
"""

import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from collections import defaultdict

from .identity import QualityAttestation, IdentityManager


@dataclass
class AgentReputation:
    """
    Aggregated reputation score for an agent.
    
    Attributes:
        agent_id: Unique agent identifier
        total_shares: Number of shards shared
        total_downloads: Number of times shards were downloaded
        average_rating: Mean quality rating (0.0-1.0)
        positive_attestations: Count of ratings >= 0.7
        negative_attestations: Count of ratings < 0.4
        last_updated: Timestamp of last reputation update
    """
    agent_id: str
    total_shares: int = 0
    total_downloads: int = 0
    average_rating: float = 0.0
    positive_attestations: int = 0
    negative_attestations: int = 0
    last_updated: str = ""
    
    def to_dict(self) -> Dict:
        """Export reputation as dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Export reputation as JSON."""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AgentReputation':
        """Load reputation from dictionary."""
        return cls(**data)


class QualityTracker:
    """
    Manages decentralized quality tracking for the HiveBrain network.
    
    Stores signed attestations locally and provides reputation queries.
    No central server - each agent maintains their own view of quality.
    """
    
    def __init__(self, storage_dir: Optional[Path] = None):
        """
        Initialize the quality tracker.
        
        Args:
            storage_dir: Directory to store attestations and reputation data.
                        Defaults to ~/.openclaw/quality/
        """
        if storage_dir is None:
            storage_dir = Path.home() / ".openclaw" / "quality"
        
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.attestations_dir = self.storage_dir / "attestations"
        self.attestations_dir.mkdir(exist_ok=True)
        
        self.reputation_file = self.storage_dir / "reputation.json"
        
        # In-memory cache
        self._reputation_cache: Dict[str, AgentReputation] = {}
        self._load_reputation_cache()
    
    def _load_reputation_cache(self) -> None:
        """Load reputation data from disk into memory."""
        if self.reputation_file.exists():
            data = json.loads(self.reputation_file.read_text())
            self._reputation_cache = {
                agent_id: AgentReputation.from_dict(rep_data)
                for agent_id, rep_data in data.items()
            }
    
    def _save_reputation_cache(self) -> None:
        """Save reputation data from memory to disk."""
        data = {
            agent_id: rep.to_dict()
            for agent_id, rep in self._reputation_cache.items()
        }
        self.reputation_file.write_text(json.dumps(data, indent=2))
    
    def submit_attestation(
        self,
        attestation: QualityAttestation,
        verify: bool = True
    ) -> bool:
        """
        Submit a quality attestation to the local tracker.
        
        Args:
            attestation: Signed attestation object
            verify: Whether to verify the signature (default: True)
            
        Returns:
            True if attestation was accepted
        """
        # Verify signature if requested
        if verify and attestation.signature is None:
            print("Attestation is not signed")
            return False
        
        # Store attestation to disk
        attestation_file = self.attestations_dir / f"{attestation.shard_hash}_{attestation.timestamp}.json"
        attestation_file.write_text(attestation.to_json())
        
        # Update reputation
        self._update_reputation(attestation)
        
        print(f"✓ Accepted attestation for shard {attestation.shard_hash[:8]}")
        return True
    
    def _update_reputation(self, attestation: QualityAttestation) -> None:
        """
        Update the provider's reputation based on new attestation.
        
        Args:
            attestation: Quality attestation
        """
        provider_id = attestation.provider_agent_id
        
        # Get or create reputation entry
        if provider_id not in self._reputation_cache:
            self._reputation_cache[provider_id] = AgentReputation(
                agent_id=provider_id,
                last_updated=datetime.now(timezone.utc).isoformat()
            )
        
        rep = self._reputation_cache[provider_id]
        
        # Update counters
        rep.total_downloads += 1
        
        if attestation.rating >= 0.7:
            rep.positive_attestations += 1
        elif attestation.rating < 0.4:
            rep.negative_attestations += 1
        
        # Recalculate average rating
        # Use exponential moving average for newer data
        alpha = 0.1  # Weight for new data
        if rep.average_rating == 0.0:
            rep.average_rating = attestation.rating
        else:
            rep.average_rating = (
                alpha * attestation.rating + 
                (1 - alpha) * rep.average_rating
            )
        
        rep.last_updated = datetime.now(timezone.utc).isoformat()
        
        # Save to disk
        self._save_reputation_cache()
    
    def get_reputation(self, agent_id: str) -> Optional[AgentReputation]:
        """
        Get reputation for a specific agent.
        
        Args:
            agent_id: Agent identifier
            
        Returns:
            AgentReputation object or None if not found
        """
        return self._reputation_cache.get(agent_id)
    
    def get_all_reputations(self) -> List[AgentReputation]:
        """
        Get all agent reputations, sorted by average rating.
        
        Returns:
            List of AgentReputation objects
        """
        return sorted(
            self._reputation_cache.values(),
            key=lambda r: r.average_rating,
            reverse=True
        )
    
    def get_top_agents(self, limit: int = 10) -> List[AgentReputation]:
        """
        Get the top-rated agents.
        
        Args:
            limit: Maximum number of agents to return
            
        Returns:
            List of top AgentReputation objects
        """
        return self.get_all_reputations()[:limit]
    
    def get_attestations_for_shard(self, shard_hash: str) -> List[QualityAttestation]:
        """
        Get all attestations for a specific shard.
        
        Args:
            shard_hash: Hash of the memory shard
            
        Returns:
            List of QualityAttestation objects
        """
        attestations = []
        
        for attestation_file in self.attestations_dir.glob(f"{shard_hash}_*.json"):
            try:
                attestation = QualityAttestation.from_json(attestation_file.read_text())
                attestations.append(attestation)
            except Exception as e:
                print(f"Failed to load attestation {attestation_file}: {e}")
        
        return attestations
    
    def get_attestations_by_provider(self, provider_id: str) -> List[QualityAttestation]:
        """
        Get all attestations for shards provided by a specific agent.
        
        Args:
            provider_id: Agent identifier
            
        Returns:
            List of QualityAttestation objects
        """
        attestations = []
        
        for attestation_file in self.attestations_dir.glob("*.json"):
            try:
                attestation = QualityAttestation.from_json(attestation_file.read_text())
                if attestation.provider_agent_id == provider_id:
                    attestations.append(attestation)
            except Exception as e:
                print(f"Failed to load attestation {attestation_file}: {e}")
        
        return attestations
    
    def get_trust_score(self, agent_id: str) -> float:
        """
        Calculate a trust score for an agent (0.0-1.0).
        
        Combines average rating with attestation volume and recency.
        
        Args:
            agent_id: Agent identifier
            
        Returns:
            Trust score (0.0 = untrustworthy, 1.0 = highly trustworthy)
        """
        rep = self.get_reputation(agent_id)
        if rep is None:
            return 0.5  # Neutral for unknown agents
        
        # Base score from average rating
        base_score = rep.average_rating
        
        # Volume bonus (more downloads = more confidence)
        volume_factor = min(1.0, rep.total_downloads / 100.0)
        
        # Positive/negative ratio
        total_attestations = rep.positive_attestations + rep.negative_attestations
        if total_attestations > 0:
            ratio_factor = rep.positive_attestations / total_attestations
        else:
            ratio_factor = 0.5
        
        # Recency penalty (old data less trustworthy)
        if rep.last_updated:
            try:
                last_updated = datetime.fromisoformat(rep.last_updated)
                age_days = (datetime.now(timezone.utc) - last_updated).days
                recency_factor = max(0.5, 1.0 - (age_days / 365.0))
            except:
                recency_factor = 0.8
        else:
            recency_factor = 0.8
        
        # Weighted combination
        trust_score = (
            0.5 * base_score +
            0.2 * volume_factor +
            0.2 * ratio_factor +
            0.1 * recency_factor
        )
        
        return max(0.0, min(1.0, trust_score))
    
    def should_trust_agent(
        self,
        agent_id: str,
        threshold: float = 0.6
    ) -> bool:
        """
        Determine if an agent should be trusted based on reputation.
        
        Args:
            agent_id: Agent identifier
            threshold: Minimum trust score required (default: 0.6)
            
        Returns:
            True if agent meets trust threshold
        """
        return self.get_trust_score(agent_id) >= threshold
    
    def cleanup_old_attestations(self, days: int = 365) -> int:
        """
        Remove attestations older than specified days.
        
        Args:
            days: Maximum age in days
            
        Returns:
            Number of attestations removed
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        removed = 0
        
        for attestation_file in self.attestations_dir.glob("*.json"):
            try:
                attestation = QualityAttestation.from_json(attestation_file.read_text())
                timestamp = datetime.fromisoformat(attestation.timestamp)
                
                if timestamp < cutoff:
                    attestation_file.unlink()
                    removed += 1
            except Exception as e:
                print(f"Failed to process {attestation_file}: {e}")
        
        # Rebuild reputation cache
        self._rebuild_reputation_cache()
        
        print(f"✓ Removed {removed} old attestations")
        return removed
    
    def _rebuild_reputation_cache(self) -> None:
        """Rebuild reputation cache from all attestations."""
        self._reputation_cache.clear()
        
        for attestation_file in self.attestations_dir.glob("*.json"):
            try:
                attestation = QualityAttestation.from_json(attestation_file.read_text())
                self._update_reputation(attestation)
            except Exception as e:
                print(f"Failed to rebuild from {attestation_file}: {e}")
        
        self._save_reputation_cache()
    
    def export_reputation_report(self) -> Dict:
        """
        Export a comprehensive reputation report.
        
        Returns:
            Dictionary with reputation statistics
        """
        all_reps = self.get_all_reputations()
        
        return {
            "total_agents": len(all_reps),
            "top_agents": [r.to_dict() for r in all_reps[:10]],
            "average_rating_global": sum(r.average_rating for r in all_reps) / len(all_reps) if all_reps else 0.0,
            "total_attestations": sum(
                len(list(self.attestations_dir.glob("*.json")))
                for _ in [None]
            ),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }


# Example usage
if __name__ == "__main__":
    print("=== Quality Tracking Demo ===\n")
    
    # Initialize tracker
    tracker = QualityTracker()
    
    # Create a mock identity for testing
    try:
        identity_manager = IdentityManager()
        identity = identity_manager.generate_identity(name="consumer_agent", force=True)
        identity_manager.load_identity("consumer_agent")
        
        # Create and sign an attestation
        attestation = QualityAttestation(
            shard_hash="abc123def456",
            provider_agent_id="provider_xyz",
            consumer_agent_id=identity.agent_id,
            rating=0.9,
            feedback="Excellent shard! Helped me solve a complex problem."
        )
        
        attestation.sign(identity_manager)
        
        # Submit to tracker
        tracker.submit_attestation(attestation, verify=False)
        
        # Check reputation
        rep = tracker.get_reputation("provider_xyz")
        if rep:
            print(f"\n✓ Provider Reputation:")
            print(f"  Agent ID: {rep.agent_id}")
            print(f"  Average Rating: {rep.average_rating:.2f}")
            print(f"  Total Downloads: {rep.total_downloads}")
            print(f"  Positive Attestations: {rep.positive_attestations}")
        
        # Check trust score
        trust = tracker.get_trust_score("provider_xyz")
        print(f"\n✓ Trust Score: {trust:.2f}")
        print(f"  Should Trust: {tracker.should_trust_agent('provider_xyz')}")
        
        # Export report
        report = tracker.export_reputation_report()
        print(f"\n✓ Global Report:")
        print(f"  Total Agents: {report['total_agents']}")
        print(f"  Global Avg Rating: {report['average_rating_global']:.2f}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
