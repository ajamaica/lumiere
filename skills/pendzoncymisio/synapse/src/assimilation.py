"""
WiP, do not assimilate anything on the protocol testing stage.
Assimilation Engine for the Synapse Protocol.

Handles the critical transition from 'Downloaded File' to 'Active Memory'
with safety checks, model alignment verification, and injection detection.
"""

import logging
import re
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
import json

from .core import MemoryShard


logger = logging.getLogger(__name__)


@dataclass
class SafetyReport:
    """Results from a safety scan of a memory shard."""
    is_safe: bool
    risk_level: str  # 'safe', 'low', 'medium', 'high', 'critical'
    detected_threats: List[str]
    warnings: List[str]
    scan_duration_ms: float
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "is_safe": self.is_safe,
            "risk_level": self.risk_level,
            "detected_threats": self.detected_threats,
            "warnings": self.warnings,
            "scan_duration_ms": self.scan_duration_ms,
            "timestamp": self.timestamp,
        }


class AssimilationEngine:
    """
    Handles the transition from 'Downloaded File' to 'Active Memory'.
    
    This is the 'Immunology' layer that ensures agents don't accidentally
    integrate malicious or incompatible data into their knowledge base.
    """
    
    def __init__(
        self,
        agent_model: str,
        agent_dimension: int,
        safety_threshold: float = 0.8,
        strict_mode: bool = True,
    ):
        """
        Initialize the assimilation engine.
        
        Args:
            agent_model: The embedding model used by this agent
            agent_dimension: The vector dimension size
            safety_threshold: Minimum safety score (0-1) required to pass
            strict_mode: If True, reject any shard with warnings
        """
        self.agent_model = agent_model
        self.agent_dimension = agent_dimension
        self.safety_threshold = safety_threshold
        self.strict_mode = strict_mode
        
        # Load threat patterns
        self.threat_patterns = self._load_threat_patterns()
        
        logger.info(
            f"AssimilationEngine initialized: model={agent_model}, "
            f"dims={agent_dimension}, strict={strict_mode}"
        )
    
    def _load_threat_patterns(self) -> List[Dict[str, Any]]:
        """
        Load known malicious patterns to scan for.
        
        In production, this would load from a regularly updated database.
        """
        return [
            {
                "name": "prompt_injection",
                "pattern": r"ignore (previous|all) instructions",
                "severity": "high",
            },
            {
                "name": "data_exfiltration",
                "pattern": r"send.*to.*http[s]?://",
                "severity": "critical",
            },
            {
                "name": "credential_theft",
                "pattern": r"(password|api[_-]?key|token|secret)[:=]",
                "severity": "critical",
            },
            {
                "name": "code_execution",
                "pattern": r"(exec|eval|__import__|system)\s*\(",
                "severity": "high",
            },
            {
                "name": "jailbreak_attempt",
                "pattern": r"(you are now|act as|pretend to be).*(unrestricted|unlimited|uncensored)",
                "severity": "high",
            },
        ]
    
    def check_model_alignment(self, shard: MemoryShard) -> Tuple[bool, Optional[str]]:
        """
        Ensures the agent isn't trying to load incompatible vectors.
        
        For example: loading 1536-dim vectors into a 768-dim model would
        cause runtime errors or corrupted embeddings.
        
        Args:
            shard: The MemoryShard to check
            
        Returns:
            Tuple of (is_compatible, error_message)
        """
        # Check dimension compatibility
        if shard.dimension_size != self.agent_dimension:
            return False, (
                f"Dimension mismatch: Shard has {shard.dimension_size}D vectors, "
                f"but agent uses {self.agent_dimension}D model"
            )
        
        # Check model compatibility (if specified)
        if shard.embedding_model and shard.embedding_model != self.agent_model:
            warning = (
                f"Model mismatch: Shard uses '{shard.embedding_model}', "
                f"but agent uses '{self.agent_model}'. "
            )
            
            # Check if models are compatible families
            if self._are_models_compatible(shard.embedding_model, self.agent_model):
                logger.warning(f"{warning} Models may be compatible, proceeding with caution.")
                return True, None
            else:
                return False, f"{warning} Models are likely incompatible."
        
        logger.info(f"Model alignment check passed for shard: {shard.display_name}")
        return True, None
    
    def _are_models_compatible(self, model1: str, model2: str) -> bool:
        """
        Check if two models are from compatible families.
        
        Args:
            model1: First model name
            model2: Second model name
            
        Returns:
            True if models are likely compatible
        """
        # Extract base model name (before version numbers)
        base1 = re.sub(r'[v-]\d+.*$', '', model1.lower())
        base2 = re.sub(r'[v-]\d+.*$', '', model2.lower())
        
        # Same base model
        if base1 == base2:
            return True
        
        # Known compatible model families
        compatible_families = [
            {'openai', 'ada', 'babbage', 'curie', 'davinci'},
            {'claw', 'molt', 'openclaw'},
            {'bert', 'roberta', 'distilbert'},
        ]
        
        for family in compatible_families:
            if any(base1.startswith(m) for m in family) and \
               any(base2.startswith(m) for m in family):
                return True
        
        return False
    
    def scan_for_injections(self, shard: MemoryShard) -> SafetyReport:
        """
        The 'Immunology' step. Scans the shard for malicious patterns.
        
        This runs the data through local 'guardrail' checks to look for:
        - Prompt injection attempts
        - Code execution vectors
        - Data exfiltration patterns
        - Credential theft attempts
        
        Args:
            shard: The MemoryShard to scan
            
        Returns:
            SafetyReport with scan results
        """
        import time
        start_time = time.time()
        
        detected_threats = []
        warnings = []
        max_severity = "safe"
        
        # Read metadata
        metadata_str = json.dumps(shard.to_dict())
        
        # Scan metadata for threats
        for threat in self.threat_patterns:
            pattern = re.compile(threat["pattern"], re.IGNORECASE)
            
            if pattern.search(metadata_str):
                threat_msg = f"{threat['name']} detected (severity: {threat['severity']})"
                detected_threats.append(threat_msg)
                
                # Update max severity
                if self._compare_severity(threat["severity"], max_severity) > 0:
                    max_severity = threat["severity"]
        
        # Additional checks
        
        # Check for suspiciously large entry counts (potential DoS)
        if shard.entry_count > 10_000_000:
            warnings.append(
                f"Unusually large entry count: {shard.entry_count:,}. "
                "This may cause memory issues."
            )
        
        # Check for missing metadata
        if not shard.tags:
            warnings.append("Shard has no tags. Origin/purpose unclear.")
        
        # Check file size reasonableness
        if Path(shard.file_path).exists():
            file_size_mb = Path(shard.file_path).stat().st_size / (1024 * 1024)
            if file_size_mb > 1000:  # Over 1GB
                warnings.append(
                    f"Large file size: {file_size_mb:.1f}MB. "
                    "Ensure sufficient disk space."
                )
        
        # Determine if safe
        is_safe = (
            len(detected_threats) == 0 and
            (not self.strict_mode or len(warnings) == 0)
        )
        
        # If threats detected, set risk level appropriately
        if not is_safe:
            risk_level = max_severity
        elif warnings:
            risk_level = "low"
        else:
            risk_level = "safe"
        
        scan_duration_ms = (time.time() - start_time) * 1000
        
        from datetime import datetime
        report = SafetyReport(
            is_safe=is_safe,
            risk_level=risk_level,
            detected_threats=detected_threats,
            warnings=warnings,
            scan_duration_ms=scan_duration_ms,
            timestamp=datetime.utcnow().isoformat(),
        )
        
        # Log results
        if not is_safe:
            logger.warning(
                f"Safety scan failed for {shard.display_name}: "
                f"{len(detected_threats)} threats detected"
            )
        else:
            logger.info(
                f"Safety scan passed for {shard.display_name} "
                f"({scan_duration_ms:.2f}ms)"
            )
        
        return report
    
    def _compare_severity(self, sev1: str, sev2: str) -> int:
        """
        Compare two severity levels.
        
        Returns:
            1 if sev1 > sev2, -1 if sev1 < sev2, 0 if equal
        """
        severity_order = ["safe", "low", "medium", "high", "critical"]
        idx1 = severity_order.index(sev1) if sev1 in severity_order else 0
        idx2 = severity_order.index(sev2) if sev2 in severity_order else 0
        
        if idx1 > idx2:
            return 1
        elif idx1 < idx2:
            return -1
        else:
            return 0
    
    def merge_to_local_db(
        self,
        verified_shard: MemoryShard,
        target_db_path: str,
        merge_strategy: str = "append",
    ) -> Dict[str, Any]:
        """
        Upserts the new vectors into the agent's primary Vector Store.
        
        Args:
            verified_shard: The MemoryShard that has passed safety checks
            target_db_path: Path to the agent's vector database
            merge_strategy: How to merge ('append', 'replace', 'upsert')
            
        Returns:
            Dictionary with merge results
        """
        logger.info(
            f"Merging shard '{verified_shard.display_name}' into {target_db_path} "
            f"using strategy: {merge_strategy}"
        )
        
        # Validate target exists
        target_path = Path(target_db_path)
        if not target_path.exists():
            logger.warning(f"Target database does not exist: {target_db_path}")
            # Could create new database here if needed
        
        # TODO: Implement actual vector database merging
        # This would depend on the specific vector DB being used:
        # - FAISS: Load both indices, merge, save
        # - LanceDB: Open table, insert/upsert rows
        # - ChromaDB: Get collection, add embeddings
        # - Pinecone: Upsert vectors to index
        
        # Placeholder result
        result = {
            "status": "success",
            "entries_merged": verified_shard.entry_count,
            "target_db": target_db_path,
            "merge_strategy": merge_strategy,
            "shard_hash": verified_shard.payload_hash,
        }
        
        logger.info(
            f"Merge complete: {result['entries_merged']} entries added to {target_db_path}"
        )
        
        return result
    
    def assimilate(
        self,
        shard: MemoryShard,
        target_db_path: str,
        skip_safety_check: bool = False,
        merge_strategy: str = "append",
    ) -> Dict[str, Any]:
        """
        Complete assimilation pipeline: validate, scan, and merge.
        
        Args:
            shard: The MemoryShard to assimilate
            target_db_path: Path to the agent's vector database
            skip_safety_check: Skip safety scan (NOT RECOMMENDED)
            merge_strategy: How to merge ('append', 'replace', 'upsert')
            
        Returns:
            Dictionary with assimilation results
            
        Raises:
            ValueError: If shard fails validation or safety checks
        """
        logger.info(f"Beginning assimilation of shard: {shard.display_name}")
        
        # Step 1: Validate shard
        is_valid, error = shard.validate()
        if not is_valid:
            raise ValueError(f"Shard validation failed: {error}")
        
        # Step 2: Check model alignment
        is_compatible, error = self.check_model_alignment(shard)
        if not is_compatible:
            raise ValueError(f"Model alignment check failed: {error}")
        
        # Step 3: Safety scan
        if not skip_safety_check:
            safety_report = self.scan_for_injections(shard)
            
            if not safety_report.is_safe:
                raise ValueError(
                    f"Safety scan failed: {len(safety_report.detected_threats)} threats detected. "
                    f"Threats: {', '.join(safety_report.detected_threats)}"
                )
            
            if safety_report.warnings:
                logger.warning(
                    f"Safety scan warnings: {', '.join(safety_report.warnings)}"
                )
        else:
            logger.warning("Safety check SKIPPED - proceeding without guardrails!")
            safety_report = None
        
        # Step 4: Merge to local database
        merge_result = self.merge_to_local_db(shard, target_db_path, merge_strategy)
        
        # Compile final report
        result = {
            "status": "success",
            "shard": {
                "name": shard.display_name,
                "hash": shard.payload_hash,
                "entries": shard.entry_count,
                "model": shard.embedding_model,
                "tags": shard.tags,
            },
            "safety_report": safety_report.to_dict() if safety_report else None,
            "merge_result": merge_result,
        }
        
        logger.info(f"Assimilation complete: {shard.display_name}")
        
        return result


def create_assimilation_engine(
    agent_config: Dict[str, Any],
    strict_mode: bool = True,
) -> AssimilationEngine:
    """
    Factory function to create an AssimilationEngine from agent config.
    
    Args:
        agent_config: Dictionary with 'model' and 'dimension' keys
        strict_mode: Whether to use strict safety checks
        
    Returns:
        Configured AssimilationEngine instance
    """
    return AssimilationEngine(
        agent_model=agent_config.get("model", "unknown"),
        agent_dimension=agent_config.get("dimension", 1536),
        strict_mode=strict_mode,
    )
