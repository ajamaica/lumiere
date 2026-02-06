#!/usr/bin/env python3
"""
Smart Router State Compactor

Manages and optimizes router state including:
- Circuit breaker state cleanup
- Routing decision log compaction  
- Rate limit counter reset
- Model availability cache refresh

Run periodically (e.g., via cron) or on-demand to maintain system health.

Usage:
    python compactor.py [--all | --circuit-breaker | --logs | --rate-limits | --cache]
    python compactor.py --status
    python compactor.py --dry-run --all
"""

import argparse
import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

# Configuration
ROUTER_STATE_DIR = Path(os.environ.get(
    "ROUTER_STATE_DIR", 
    os.path.expanduser("~/.openclaw/router-state")
))
ROUTER_LOGS_DIR = Path(os.environ.get(
    "ROUTER_LOGS_DIR",
    os.path.expanduser("~/.openclaw/logs")
))

# Retention policies
CONFIG = {
    "circuit_breaker": {
        "max_age_hours": 1,           # Clear circuit state older than 1 hour
        "max_entries": 100,           # Keep max 100 circuit records
    },
    "routing_logs": {
        "max_age_days": 7,            # Compact logs older than 7 days
        "archive_after_days": 30,     # Archive logs older than 30 days
        "max_file_size_mb": 10,       # Rotate if file exceeds 10MB
    },
    "rate_limits": {
        "reset_window_hours": 24,     # Clear rate limit counters daily
    },
    "model_cache": {
        "max_age_minutes": 15,        # Refresh availability cache every 15 min
    },
}


class RouterCompactor:
    """Manages router state compaction and cleanup."""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.stats = {
            "circuit_breaker_cleaned": 0,
            "logs_compacted": 0,
            "logs_archived": 0,
            "rate_limits_reset": 0,
            "cache_entries_cleared": 0,
            "bytes_freed": 0,
        }
    
    def run_all(self) -> dict[str, Any]:
        """Run all compaction tasks."""
        self.compact_circuit_breaker()
        self.compact_routing_logs()
        self.reset_rate_limits()
        self.refresh_model_cache()
        return self.stats
    
    def compact_circuit_breaker(self) -> int:
        """
        Clean up stale circuit breaker state.
        
        Circuit breakers track model failures to prevent repeated calls to
        failing services. Old entries should be cleared to allow retry.
        """
        state_file = ROUTER_STATE_DIR / "circuit-breaker.json"
        
        if not state_file.exists():
            return 0
        
        try:
            with open(state_file, "r") as f:
                state = json.load(f)
        except (json.JSONDecodeError, IOError):
            return 0
        
        now = time.time()
        max_age_ms = CONFIG["circuit_breaker"]["max_age_hours"] * 3600 * 1000
        
        original_count = len(state.get("circuits", {}))
        
        # Filter out stale circuits
        active_circuits = {}
        for model, circuit in state.get("circuits", {}).items():
            last_failure = circuit.get("last_failure_ms", 0)
            if now * 1000 - last_failure < max_age_ms:
                active_circuits[model] = circuit
            else:
                self.stats["circuit_breaker_cleaned"] += 1
        
        # Enforce max entries (keep most recent)
        max_entries = CONFIG["circuit_breaker"]["max_entries"]
        if len(active_circuits) > max_entries:
            sorted_circuits = sorted(
                active_circuits.items(),
                key=lambda x: x[1].get("last_failure_ms", 0),
                reverse=True
            )
            active_circuits = dict(sorted_circuits[:max_entries])
            self.stats["circuit_breaker_cleaned"] += len(sorted_circuits) - max_entries
        
        if not self.dry_run and self.stats["circuit_breaker_cleaned"] > 0:
            state["circuits"] = active_circuits
            state["last_compaction"] = datetime.utcnow().isoformat()
            with open(state_file, "w") as f:
                json.dump(state, f, indent=2)
        
        return self.stats["circuit_breaker_cleaned"]
    
    def compact_routing_logs(self) -> tuple[int, int]:
        """
        Compact and archive routing decision logs.
        
        - Logs older than max_age_days: summarize to daily aggregates
        - Logs older than archive_after_days: move to archive
        - Large files: rotate
        """
        log_file = ROUTER_LOGS_DIR / "router-decisions.log"
        archive_dir = ROUTER_LOGS_DIR / "archive"
        
        if not log_file.exists():
            return 0, 0
        
        # Check file size
        file_size = log_file.stat().st_size
        max_size = CONFIG["routing_logs"]["max_file_size_mb"] * 1024 * 1024
        
        if file_size > max_size:
            self._rotate_log(log_file)
        
        # Read and parse log entries
        try:
            with open(log_file, "r") as f:
                lines = f.readlines()
        except IOError:
            return 0, 0
        
        now = datetime.utcnow()
        compact_threshold = now - timedelta(days=CONFIG["routing_logs"]["max_age_days"])
        archive_threshold = now - timedelta(days=CONFIG["routing_logs"]["archive_after_days"])
        
        kept_lines = []
        compacted_entries = []
        archived_entries = []
        
        for line in lines:
            try:
                entry = json.loads(line.strip())
                entry_time = datetime.fromisoformat(entry.get("timestamp", "").replace("Z", ""))
                
                if entry_time < archive_threshold:
                    archived_entries.append(entry)
                    self.stats["logs_archived"] += 1
                elif entry_time < compact_threshold:
                    compacted_entries.append(entry)
                    self.stats["logs_compacted"] += 1
                else:
                    kept_lines.append(line)
            except (json.JSONDecodeError, ValueError):
                kept_lines.append(line)  # Keep unparseable lines
        
        if not self.dry_run:
            # Write kept lines back
            if self.stats["logs_compacted"] > 0 or self.stats["logs_archived"] > 0:
                with open(log_file, "w") as f:
                    f.writelines(kept_lines)
            
            # Archive old entries
            if archived_entries:
                archive_dir.mkdir(parents=True, exist_ok=True)
                archive_file = archive_dir / f"router-decisions-{now.strftime('%Y%m')}.jsonl"
                with open(archive_file, "a") as f:
                    for entry in archived_entries:
                        f.write(json.dumps(entry) + "\n")
            
            # Write daily summaries for compacted entries
            if compacted_entries:
                self._write_daily_summaries(compacted_entries)
        
        self.stats["bytes_freed"] += file_size - (len("".join(kept_lines)))
        return self.stats["logs_compacted"], self.stats["logs_archived"]
    
    def _rotate_log(self, log_file: Path) -> None:
        """Rotate a log file by renaming with timestamp."""
        if self.dry_run:
            return
        
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        rotated = log_file.with_suffix(f".{timestamp}.log")
        log_file.rename(rotated)
    
    def _write_daily_summaries(self, entries: list[dict]) -> None:
        """Aggregate entries into daily summary files."""
        from collections import defaultdict
        
        daily_stats = defaultdict(lambda: {
            "total_requests": 0,
            "by_model": defaultdict(int),
            "by_intent": defaultdict(int),
            "fallbacks_triggered": 0,
        })
        
        for entry in entries:
            date = entry.get("timestamp", "")[:10]
            daily_stats[date]["total_requests"] += 1
            daily_stats[date]["by_model"][entry.get("model_used", "unknown")] += 1
            daily_stats[date]["by_intent"][entry.get("intent_detected", "unknown")] += 1
            if entry.get("fallback_triggered"):
                daily_stats[date]["fallbacks_triggered"] += 1
        
        summary_dir = ROUTER_LOGS_DIR / "summaries"
        summary_dir.mkdir(parents=True, exist_ok=True)
        
        for date, stats in daily_stats.items():
            summary_file = summary_dir / f"summary-{date}.json"
            # Merge with existing if present
            existing = {}
            if summary_file.exists():
                with open(summary_file, "r") as f:
                    existing = json.load(f)
            
            # Merge stats
            merged = {
                "date": date,
                "total_requests": existing.get("total_requests", 0) + stats["total_requests"],
                "by_model": {**existing.get("by_model", {}), **dict(stats["by_model"])},
                "by_intent": {**existing.get("by_intent", {}), **dict(stats["by_intent"])},
                "fallbacks_triggered": existing.get("fallbacks_triggered", 0) + stats["fallbacks_triggered"],
            }
            
            with open(summary_file, "w") as f:
                json.dump(merged, f, indent=2)
    
    def reset_rate_limits(self) -> int:
        """
        Reset expired rate limit counters.
        
        Rate limit state tracks per-user request counts. Old entries
        should be cleared to free memory and reset daily quotas.
        """
        state_file = ROUTER_STATE_DIR / "rate-limits.json"
        
        if not state_file.exists():
            return 0
        
        try:
            with open(state_file, "r") as f:
                state = json.load(f)
        except (json.JSONDecodeError, IOError):
            return 0
        
        now = time.time()
        window_seconds = CONFIG["rate_limits"]["reset_window_hours"] * 3600
        
        # Clear expired user entries
        active_users = {}
        for user_id, user_state in state.get("users", {}).items():
            last_request = user_state.get("last_request", 0)
            if now - last_request < window_seconds:
                # Filter out old timestamps from request lists
                user_state["requests"] = [
                    t for t in user_state.get("requests", [])
                    if now - t < 3600  # Keep last hour
                ]
                user_state["premium_requests"] = [
                    t for t in user_state.get("premium_requests", [])
                    if now - t < 3600
                ]
                active_users[user_id] = user_state
            else:
                self.stats["rate_limits_reset"] += 1
        
        if not self.dry_run and self.stats["rate_limits_reset"] > 0:
            state["users"] = active_users
            state["last_cleanup"] = datetime.utcnow().isoformat()
            with open(state_file, "w") as f:
                json.dump(state, f, indent=2)
        
        return self.stats["rate_limits_reset"]
    
    def refresh_model_cache(self) -> int:
        """
        Clear stale model availability cache entries.
        
        The router caches model availability to avoid repeated API checks.
        Stale cache can cause incorrect routing decisions.
        """
        cache_file = ROUTER_STATE_DIR / "model-availability.json"
        
        if not cache_file.exists():
            return 0
        
        try:
            with open(cache_file, "r") as f:
                cache = json.load(f)
        except (json.JSONDecodeError, IOError):
            return 0
        
        now = time.time()
        max_age_seconds = CONFIG["model_cache"]["max_age_minutes"] * 60
        
        active_entries = {}
        for model, entry in cache.get("models", {}).items():
            checked_at = entry.get("checked_at", 0)
            if now - checked_at < max_age_seconds:
                active_entries[model] = entry
            else:
                self.stats["cache_entries_cleared"] += 1
        
        if not self.dry_run and self.stats["cache_entries_cleared"] > 0:
            cache["models"] = active_entries
            cache["last_refresh"] = datetime.utcnow().isoformat()
            with open(cache_file, "w") as f:
                json.dump(cache, f, indent=2)
        
        return self.stats["cache_entries_cleared"]
    
    def get_status(self) -> dict[str, Any]:
        """Get current state of all router components."""
        status = {
            "state_dir": str(ROUTER_STATE_DIR),
            "logs_dir": str(ROUTER_LOGS_DIR),
            "components": {},
        }
        
        # Circuit breaker status
        cb_file = ROUTER_STATE_DIR / "circuit-breaker.json"
        if cb_file.exists():
            try:
                with open(cb_file, "r") as f:
                    cb_state = json.load(f)
                open_circuits = sum(
                    1 for c in cb_state.get("circuits", {}).values()
                    if c.get("state") == "open"
                )
                status["components"]["circuit_breaker"] = {
                    "total_circuits": len(cb_state.get("circuits", {})),
                    "open_circuits": open_circuits,
                    "last_compaction": cb_state.get("last_compaction"),
                }
            except (json.JSONDecodeError, IOError):
                status["components"]["circuit_breaker"] = {"error": "Failed to read state"}
        else:
            status["components"]["circuit_breaker"] = {"status": "no state file"}
        
        # Rate limits status
        rl_file = ROUTER_STATE_DIR / "rate-limits.json"
        if rl_file.exists():
            try:
                with open(rl_file, "r") as f:
                    rl_state = json.load(f)
                status["components"]["rate_limits"] = {
                    "active_users": len(rl_state.get("users", {})),
                    "last_cleanup": rl_state.get("last_cleanup"),
                }
            except (json.JSONDecodeError, IOError):
                status["components"]["rate_limits"] = {"error": "Failed to read state"}
        else:
            status["components"]["rate_limits"] = {"status": "no state file"}
        
        # Logs status
        log_file = ROUTER_LOGS_DIR / "router-decisions.log"
        if log_file.exists():
            file_size = log_file.stat().st_size
            status["components"]["routing_logs"] = {
                "file_size_kb": round(file_size / 1024, 2),
                "max_size_mb": CONFIG["routing_logs"]["max_file_size_mb"],
                "needs_rotation": file_size > CONFIG["routing_logs"]["max_file_size_mb"] * 1024 * 1024,
            }
        else:
            status["components"]["routing_logs"] = {"status": "no log file"}
        
        # Model cache status
        cache_file = ROUTER_STATE_DIR / "model-availability.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    cache = json.load(f)
                status["components"]["model_cache"] = {
                    "cached_models": len(cache.get("models", {})),
                    "last_refresh": cache.get("last_refresh"),
                }
            except (json.JSONDecodeError, IOError):
                status["components"]["model_cache"] = {"error": "Failed to read cache"}
        else:
            status["components"]["model_cache"] = {"status": "no cache file"}
        
        return status


def main():
    parser = argparse.ArgumentParser(
        description="Smart Router State Compactor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python compactor.py --status           # Show current state
    python compactor.py --all              # Run all compaction tasks
    python compactor.py --dry-run --all    # Preview changes without applying
    python compactor.py --circuit-breaker  # Clean circuit breaker only
    python compactor.py --logs             # Compact routing logs only
        """
    )
    
    parser.add_argument("--all", action="store_true", help="Run all compaction tasks")
    parser.add_argument("--circuit-breaker", action="store_true", help="Clean circuit breaker state")
    parser.add_argument("--logs", action="store_true", help="Compact routing logs")
    parser.add_argument("--rate-limits", action="store_true", help="Reset rate limit counters")
    parser.add_argument("--cache", action="store_true", help="Refresh model cache")
    parser.add_argument("--status", action="store_true", help="Show current state")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    compactor = RouterCompactor(dry_run=args.dry_run)
    
    if args.status:
        status = compactor.get_status()
        if args.json:
            print(json.dumps(status, indent=2))
        else:
            print("Smart Router State Status")
            print("=" * 50)
            print(f"State directory: {status['state_dir']}")
            print(f"Logs directory:  {status['logs_dir']}")
            print()
            for component, info in status["components"].items():
                print(f"[{component}]")
                for key, value in info.items():
                    print(f"  {key}: {value}")
                print()
        return
    
    # Run requested tasks
    if args.all:
        compactor.run_all()
    else:
        if args.circuit_breaker:
            compactor.compact_circuit_breaker()
        if args.logs:
            compactor.compact_routing_logs()
        if args.rate_limits:
            compactor.reset_rate_limits()
        if args.cache:
            compactor.refresh_model_cache()
    
    # Output results
    if args.json:
        print(json.dumps(compactor.stats, indent=2))
    else:
        prefix = "[DRY RUN] " if args.dry_run else ""
        print(f"{prefix}Compaction complete:")
        print(f"  Circuit breaker entries cleaned: {compactor.stats['circuit_breaker_cleaned']}")
        print(f"  Log entries compacted:           {compactor.stats['logs_compacted']}")
        print(f"  Log entries archived:            {compactor.stats['logs_archived']}")
        print(f"  Rate limit counters reset:       {compactor.stats['rate_limits_reset']}")
        print(f"  Cache entries cleared:           {compactor.stats['cache_entries_cleared']}")
        if compactor.stats['bytes_freed'] > 0:
            print(f"  Bytes freed:                     {compactor.stats['bytes_freed']:,}")


if __name__ == "__main__":
    main()
