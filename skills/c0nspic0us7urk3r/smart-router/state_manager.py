#!/usr/bin/env python3
"""
State Manager - Persistent State for Smart Router

Handles disk-based persistence for:
- Circuit breaker state (model failure tracking)
- Rate limit counters
- Routing decision logs

State survives gateway restarts and is automatically loaded on init.

Usage:
    from state_manager import StateManager
    
    state = StateManager(config_path="router_config.json")
    state.record_circuit_failure("opus")
    state.save()
"""

import json
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import logging
import fcntl
from contextlib import contextmanager

logger = logging.getLogger("smart-router.state")


@dataclass
class CircuitState:
    """State for a single circuit breaker."""
    model: str
    state: str = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    failure_count: int = 0
    last_failure_ms: float = 0
    last_success_ms: float = 0
    half_open_calls: int = 0
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "CircuitState":
        return cls(**data)


@dataclass  
class RateLimitState:
    """Rate limit state for a single user."""
    user_id: str
    requests: list[float] = field(default_factory=list)  # Timestamps
    premium_requests: list[float] = field(default_factory=list)
    last_request: float = 0
    violations: int = 0
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "RateLimitState":
        return cls(**data)


@dataclass
class RoutingLogEntry:
    """Single routing decision log entry."""
    timestamp: str
    session_id: Optional[str]
    intent: str
    complexity: str
    model_selected: str
    model_used: str
    fallback_triggered: bool
    reason: str
    context_tokens: int
    latency_ms: float
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    def to_json_line(self) -> str:
        return json.dumps(self.to_dict())


class StateManager:
    """
    Manages persistent state for the Smart Router.
    
    State files:
    - circuit-breaker.json: Circuit breaker state per model
    - rate-limits.json: Rate limit counters per user
    - router-decisions.log: JSONL log of routing decisions
    """
    
    DEFAULT_STATE_DIR = "~/.openclaw/router-state"
    DEFAULT_LOG_DIR = "~/.openclaw/logs"
    
    def __init__(self, config: Optional[dict] = None, config_path: Optional[str] = None):
        """
        Initialize state manager.
        
        Args:
            config: Configuration dict
            config_path: Path to router_config.json
        """
        self.config = config or {}
        
        if config_path and Path(config_path).exists():
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        
        # Resolve paths
        self.state_dir = Path(os.path.expanduser(
            self.config.get("circuit_breaker", {}).get("state_file", self.DEFAULT_STATE_DIR)
        )).parent
        
        self.log_dir = Path(os.path.expanduser(
            self.config.get("logging", {}).get("decision_log", self.DEFAULT_LOG_DIR)
        )).parent
        
        # Ensure directories exist
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # State file paths
        self.circuit_file = self.state_dir / "circuit-breaker.json"
        self.rate_file = self.state_dir / "rate-limits.json"
        self.log_file = self.log_dir / "router-decisions.log"
        
        # In-memory state
        self._circuits: dict[str, CircuitState] = {}
        self._rate_limits: dict[str, RateLimitState] = {}
        self._dirty = False
        
        # Load existing state
        self._load_state()
        
        logger.info(f"StateManager initialized: {self.state_dir}")
    
    @contextmanager
    def _file_lock(self, filepath: Path):
        """Context manager for file locking."""
        lock_path = filepath.with_suffix(filepath.suffix + ".lock")
        lock_file = open(lock_path, 'w')
        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            yield
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            lock_file.close()
    
    def _load_state(self) -> None:
        """Load state from disk."""
        # Load circuit breaker state
        if self.circuit_file.exists():
            try:
                with open(self.circuit_file, 'r') as f:
                    data = json.load(f)
                    for model, circuit_data in data.get("circuits", {}).items():
                        self._circuits[model] = CircuitState.from_dict(circuit_data)
                logger.debug(f"Loaded {len(self._circuits)} circuit states")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load circuit state: {e}")
        
        # Load rate limit state
        if self.rate_file.exists():
            try:
                with open(self.rate_file, 'r') as f:
                    data = json.load(f)
                    for user_id, rate_data in data.get("users", {}).items():
                        self._rate_limits[user_id] = RateLimitState.from_dict(rate_data)
                logger.debug(f"Loaded {len(self._rate_limits)} rate limit states")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load rate limit state: {e}")
    
    def save(self) -> None:
        """Save all state to disk."""
        self._save_circuits()
        self._save_rate_limits()
        self._dirty = False
    
    def _save_circuits(self) -> None:
        """Save circuit breaker state."""
        data = {
            "version": "1.0",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "circuits": {
                model: circuit.to_dict() 
                for model, circuit in self._circuits.items()
            }
        }
        
        with self._file_lock(self.circuit_file):
            with open(self.circuit_file, 'w') as f:
                json.dump(data, f, indent=2)
    
    def _save_rate_limits(self) -> None:
        """Save rate limit state."""
        data = {
            "version": "1.0",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "users": {
                user_id: rate.to_dict()
                for user_id, rate in self._rate_limits.items()
            }
        }
        
        with self._file_lock(self.rate_file):
            with open(self.rate_file, 'w') as f:
                json.dump(data, f, indent=2)
    
    # =========================================================================
    # CIRCUIT BREAKER OPERATIONS
    # =========================================================================
    
    def get_circuit(self, model: str) -> CircuitState:
        """Get or create circuit state for a model."""
        if model not in self._circuits:
            self._circuits[model] = CircuitState(model=model)
        return self._circuits[model]
    
    def record_circuit_success(self, model: str) -> None:
        """Record successful model call - reset circuit."""
        circuit = self.get_circuit(model)
        circuit.state = "CLOSED"
        circuit.failure_count = 0
        circuit.last_success_ms = time.time() * 1000
        circuit.half_open_calls = 0
        self._dirty = True
        logger.debug(f"Circuit CLOSED for {model}")
    
    def record_circuit_failure(self, model: str) -> None:
        """Record failed model call - potentially open circuit."""
        circuit = self.get_circuit(model)
        circuit.failure_count += 1
        circuit.last_failure_ms = time.time() * 1000
        
        threshold = self.config.get("circuit_breaker", {}).get("failure_threshold", 3)
        
        if circuit.state == "HALF_OPEN":
            circuit.state = "OPEN"
            logger.warning(f"Circuit OPEN for {model} (half-open failure)")
        elif circuit.failure_count >= threshold:
            circuit.state = "OPEN"
            logger.warning(f"Circuit OPEN for {model} (threshold reached)")
        
        self._dirty = True
    
    def can_call_model(self, model: str) -> bool:
        """Check if model can be called (circuit breaker)."""
        circuit = self.get_circuit(model)
        reset_timeout = self.config.get("circuit_breaker", {}).get("reset_timeout_ms", 300_000)
        max_half_open = self.config.get("circuit_breaker", {}).get("half_open_max_calls", 1)
        
        if circuit.state == "CLOSED":
            return True
        
        if circuit.state == "OPEN":
            # Check if timeout elapsed
            if (time.time() * 1000 - circuit.last_failure_ms) > reset_timeout:
                circuit.state = "HALF_OPEN"
                circuit.half_open_calls = 0
                self._dirty = True
                logger.info(f"Circuit HALF_OPEN for {model}")
                return True
            return False
        
        if circuit.state == "HALF_OPEN":
            if circuit.half_open_calls < max_half_open:
                circuit.half_open_calls += 1
                self._dirty = True
                return True
            return False
        
        return False
    
    def get_all_circuits(self) -> dict[str, dict]:
        """Get all circuit states for status display."""
        return {
            model: circuit.to_dict()
            for model, circuit in self._circuits.items()
        }
    
    # =========================================================================
    # RATE LIMIT OPERATIONS
    # =========================================================================
    
    def check_rate_limit(self, user_id: str, model: str = None) -> tuple[bool, str]:
        """
        Check if request is allowed under rate limits.
        
        Returns:
            Tuple of (allowed, reason)
        """
        now = time.time()
        rate = self._rate_limits.get(user_id)
        
        if not rate:
            rate = RateLimitState(user_id=user_id)
            self._rate_limits[user_id] = rate
        
        # Clean old entries (keep last hour)
        rate.requests = [t for t in rate.requests if now - t < 3600]
        rate.premium_requests = [t for t in rate.premium_requests if now - t < 3600]
        
        config = self.config.get("rate_limits", {})
        per_minute = config.get("requests_per_minute", 20)
        per_hour = config.get("requests_per_hour", 200)
        premium_per_hour = config.get("premium_per_hour", 20)
        
        # Per-minute check
        recent = [t for t in rate.requests if now - t < 60]
        if len(recent) >= per_minute:
            rate.violations += 1
            self._dirty = True
            return False, f"Rate limit: max {per_minute} requests/minute"
        
        # Per-hour check
        if len(rate.requests) >= per_hour:
            rate.violations += 1
            self._dirty = True
            return False, f"Rate limit: max {per_hour} requests/hour"
        
        # Premium model check
        if model and self._is_premium_model(model):
            if len(rate.premium_requests) >= premium_per_hour:
                rate.violations += 1
                self._dirty = True
                return False, f"Rate limit: max {premium_per_hour} premium requests/hour"
            rate.premium_requests.append(now)
        
        # Record request
        rate.requests.append(now)
        rate.last_request = now
        self._dirty = True
        
        return True, "OK"
    
    def _is_premium_model(self, model: str) -> bool:
        """Check if model is premium tier."""
        premium_models = ["opus", "gemini-pro", "grok3"]
        return model in premium_models
    
    # =========================================================================
    # ROUTING LOG OPERATIONS
    # =========================================================================
    
    def log_routing_decision(
        self,
        intent: str,
        complexity: str,
        model_selected: str,
        model_used: str,
        fallback_triggered: bool,
        reason: str,
        context_tokens: int = 0,
        latency_ms: float = 0,
        session_id: Optional[str] = None
    ) -> None:
        """Log a routing decision to the decision log."""
        entry = RoutingLogEntry(
            timestamp=datetime.utcnow().isoformat() + "Z",
            session_id=session_id,
            intent=intent,
            complexity=complexity,
            model_selected=model_selected,
            model_used=model_used,
            fallback_triggered=fallback_triggered,
            reason=reason,
            context_tokens=context_tokens,
            latency_ms=latency_ms
        )
        
        # Append to log file
        with self._file_lock(self.log_file):
            with open(self.log_file, 'a') as f:
                f.write(entry.to_json_line() + "\n")
        
        logger.info(f"Routing: {intent}/{complexity} -> {model_selected} ({reason})")
    
    def get_recent_decisions(self, limit: int = 10) -> list[dict]:
        """Get recent routing decisions from the log."""
        if not self.log_file.exists():
            return []
        
        decisions = []
        with open(self.log_file, 'r') as f:
            lines = f.readlines()
            for line in lines[-limit:]:
                try:
                    decisions.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue
        
        return decisions
    
    # =========================================================================
    # STATUS AND CLEANUP
    # =========================================================================
    
    def get_status(self) -> dict[str, Any]:
        """Get full state manager status."""
        return {
            "state_dir": str(self.state_dir),
            "log_dir": str(self.log_dir),
            "circuits": {
                "count": len(self._circuits),
                "open": sum(1 for c in self._circuits.values() if c.state == "OPEN"),
                "states": self.get_all_circuits()
            },
            "rate_limits": {
                "active_users": len(self._rate_limits),
                "total_violations": sum(r.violations for r in self._rate_limits.values())
            },
            "log_file_exists": self.log_file.exists(),
            "dirty": self._dirty
        }
    
    def cleanup(self, max_age_hours: int = 24) -> dict[str, int]:
        """Clean up stale state entries."""
        now = time.time() * 1000
        max_age_ms = max_age_hours * 3600 * 1000
        
        cleaned = {"circuits": 0, "rate_limits": 0}
        
        # Clean old circuits
        for model in list(self._circuits.keys()):
            circuit = self._circuits[model]
            if circuit.state == "CLOSED":
                last_activity = max(circuit.last_failure_ms, circuit.last_success_ms)
                if now - last_activity > max_age_ms:
                    del self._circuits[model]
                    cleaned["circuits"] += 1
        
        # Clean old rate limits
        for user_id in list(self._rate_limits.keys()):
            rate = self._rate_limits[user_id]
            if now / 1000 - rate.last_request > max_age_hours * 3600:
                del self._rate_limits[user_id]
                cleaned["rate_limits"] += 1
        
        if cleaned["circuits"] or cleaned["rate_limits"]:
            self._dirty = True
            self.save()
        
        return cleaned


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Smart Router State Manager")
    parser.add_argument("--config", type=str, help="Path to router_config.json")
    parser.add_argument("--status", action="store_true", help="Show state status")
    parser.add_argument("--recent", type=int, help="Show N recent routing decisions")
    parser.add_argument("--cleanup", action="store_true", help="Clean up stale state")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    config_path = args.config or "router_config.json"
    state = StateManager(config_path=config_path if Path(config_path).exists() else None)
    
    if args.status:
        status = state.get_status()
        if args.json:
            print(json.dumps(status, indent=2, default=str))
        else:
            print("State Manager Status")
            print("=" * 50)
            print(f"State dir: {status['state_dir']}")
            print(f"Circuits: {status['circuits']['count']} total, {status['circuits']['open']} open")
            print(f"Rate limits: {status['rate_limits']['active_users']} users")
            print(f"Log file exists: {status['log_file_exists']}")
        return
    
    if args.recent:
        decisions = state.get_recent_decisions(args.recent)
        if args.json:
            print(json.dumps(decisions, indent=2))
        else:
            for d in decisions:
                print(f"[{d['timestamp']}] {d['intent']}/{d['complexity']} -> {d['model_selected']}")
        return
    
    if args.cleanup:
        cleaned = state.cleanup()
        print(f"Cleaned: {cleaned['circuits']} circuits, {cleaned['rate_limits']} rate limits")
        return
    
    # Default: show status
    status = state.get_status()
    print(json.dumps(status, indent=2, default=str))


if __name__ == "__main__":
    main()
