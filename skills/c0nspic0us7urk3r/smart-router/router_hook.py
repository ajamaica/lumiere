#!/usr/bin/env python3
"""
Router Hook - OpenClaw Gateway Integration Layer

Intercepts incoming messages and logs routing decisions.
In dry-run mode, logs what WOULD happen without actually switching models.
In live mode, can modify the model selection before execution.

This hook is designed to be called from the agent (skill) layer, not as
true gateway middleware. Full gateway integration requires OpenClaw plugin
development.

Usage:
    # In agent code / skill execution:
    from router_hook import RouterHook
    
    hook = RouterHook()
    decision = hook.intercept(message_text, context_tokens)
    # Decision is logged; continue with normal processing

CLI:
    # Start dry-run monitoring
    python router_hook.py --dry-run --watch
    
    # Analyze a specific message
    python router_hook.py --analyze "Write a Python function to sort"
    
    # Show recent routing decisions
    python router_hook.py --recent 10
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import logging

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent))

from router_gateway import SmartRouter, RoutingDecision, Intent, Complexity
from state_manager import StateManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("smart-router.hook")


class RouterHook:
    """
    Gateway integration hook for the Smart Router.
    
    Modes:
    - dry_run: Log decisions without switching models (default)
    - shadow: Log decisions AND compare with actual model used
    - live: Actually switch models based on routing decisions
    """
    
    def __init__(
        self,
        config_path: Optional[str] = None,
        mode: str = "dry_run",
        session_id: Optional[str] = None
    ):
        """
        Initialize the router hook.
        
        Args:
            config_path: Path to router_config.json
            mode: Operation mode (dry_run, shadow, live)
            session_id: Session identifier for logging
        """
        self.mode = mode
        self.session_id = session_id or "unknown"
        
        # Find config file
        if config_path is None:
            config_path = self._find_config()
        
        # Load config
        self.config = {}
        if config_path and Path(config_path).exists():
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        
        # Override mode from config if set
        routing_config = self.config.get("routing", {})
        if routing_config.get("mode"):
            self.mode = routing_config["mode"]
        
        # Initialize components
        self.state = StateManager(config=self.config)
        self.router = SmartRouter(
            available_providers=self.config.get("providers", {}).get("available", 
                ["anthropic", "openai", "google", "xai"])
        )
        
        # Inject state manager's circuit breaker
        self._sync_circuit_breaker()
        
        # Stats
        self._decisions_count = 0
        self._switches_suggested = 0
        
        logger.info(f"RouterHook initialized in {self.mode} mode")
    
    def _find_config(self) -> Optional[str]:
        """Find router_config.json in standard locations."""
        locations = [
            Path(__file__).parent / "router_config.json",
            Path.home() / ".openclaw" / "router_config.json",
            Path.cwd() / "router_config.json",
        ]
        
        for loc in locations:
            if loc.exists():
                return str(loc)
        
        return None
    
    def _sync_circuit_breaker(self) -> None:
        """Sync state manager's circuit breaker with router."""
        # Inject can_call check into router's circuit breaker
        original_can_call = self.router.circuit_breaker.can_call
        
        def wrapped_can_call(model: str) -> bool:
            # Use state manager's persistent state
            return self.state.can_call_model(model)
        
        self.router.circuit_breaker.can_call = wrapped_can_call
    
    def intercept(
        self,
        message: str,
        context_tokens: int = 0,
        current_model: Optional[str] = None
    ) -> RoutingDecision:
        """
        Intercept a message and determine optimal routing.
        
        This is the main entry point for the hook.
        
        Args:
            message: User message text
            context_tokens: Estimated context size
            current_model: Currently configured model (for comparison)
            
        Returns:
            RoutingDecision with selected model and metadata
        """
        start_time = time.time()
        
        # Classify and route
        decision = self.router.classify(message, context_tokens)
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Log the decision
        self._log_decision(decision, current_model, latency_ms)
        
        # Track stats
        self._decisions_count += 1
        if current_model and decision.selected_model != self._normalize_model(current_model):
            self._switches_suggested += 1
        
        return decision
    
    def _normalize_model(self, model_id: str) -> str:
        """Normalize model ID to alias."""
        # Map full IDs to aliases
        model_map = {
            "anthropic/claude-opus-4-5": "opus",
            "anthropic/claude-sonnet-4-5": "sonnet",
            "anthropic/claude-haiku-3-5": "haiku",
            "openai/gpt-5": "gpt5",
            "google/gemini-2.5-pro": "gemini-pro",
            "google/gemini-2.5-flash": "flash",
            "xai/grok-2-latest": "grok2",
            "xai/grok-3": "grok3",
        }
        return model_map.get(model_id, model_id)
    
    def _log_decision(
        self,
        decision: RoutingDecision,
        current_model: Optional[str],
        latency_ms: float
    ) -> None:
        """Log routing decision to state manager and console."""
        current_alias = self._normalize_model(current_model) if current_model else "unknown"
        would_switch = decision.selected_model != current_alias
        
        # Log to state manager (persisted)
        self.state.log_routing_decision(
            intent=decision.intent.name,
            complexity=decision.complexity.name,
            model_selected=decision.selected_model,
            model_used=current_alias,  # In dry run, this is what's actually used
            fallback_triggered=False,
            reason=decision.reason,
            context_tokens=decision.context_tokens,
            latency_ms=latency_ms,
            session_id=self.session_id
        )
        
        # Console output for dry run visibility
        if self.mode == "dry_run":
            switch_marker = "🔄 WOULD SWITCH" if would_switch else "✓ MATCH"
            logger.info(
                f"{switch_marker}: {decision.intent.name}/{decision.complexity.name} "
                f"-> {decision.selected_model} (current: {current_alias}) "
                f"[{decision.reason}]"
            )
    
    def format_decision_display(
        self,
        decision: RoutingDecision,
        current_model: Optional[str] = None
    ) -> str:
        """Format routing decision for display to user."""
        current_alias = self._normalize_model(current_model) if current_model else "opus"
        would_switch = decision.selected_model != current_alias
        
        model_info = self.router._available_models.get(decision.selected_model)
        model_id = model_info.id if model_info else decision.selected_model
        
        lines = [
            "```",
            "┌─────────────────────────────────────────────────────┐",
            "│           SMART ROUTER - DRY RUN                    │",
            "├─────────────────────────────────────────────────────┤",
            f"│  Intent:       {decision.intent.name:<37}│",
            f"│  Complexity:   {decision.complexity.name:<37}│",
            f"│  Recommended:  {model_id:<37}│",
            f"│  Current:      {current_model or 'anthropic/claude-opus-4-5':<37}│",
            "├─────────────────────────────────────────────────────┤",
        ]
        
        if would_switch:
            lines.append(f"│  Status:       🔄 WOULD SWITCH to {decision.selected_model:<19}│")
        else:
            lines.append(f"│  Status:       ✓ Current model is optimal{' '*12}│")
        
        lines.extend([
            f"│  Reason:       {decision.reason[:37]:<37}│",
            f"│  Fallbacks:    {', '.join(decision.fallback_chain[:3]) or 'none':<37}│",
        ])
        
        if decision.context_tokens > 0:
            lines.append(f"│  Context:      {decision.context_tokens:,} tokens{' '*(27-len(f'{decision.context_tokens:,}'))}│")
        
        lines.extend([
            "└─────────────────────────────────────────────────────┘",
            "```"
        ])
        
        return "\n".join(lines)
    
    def get_stats(self) -> dict[str, Any]:
        """Get hook statistics."""
        return {
            "mode": self.mode,
            "session_id": self.session_id,
            "decisions_count": self._decisions_count,
            "switches_suggested": self._switches_suggested,
            "switch_rate": (
                f"{self._switches_suggested / self._decisions_count * 100:.1f}%"
                if self._decisions_count > 0 else "N/A"
            ),
            "circuit_breaker": self.state.get_all_circuits(),
        }
    
    def save_state(self) -> None:
        """Save all persistent state."""
        self.state.save()


# =============================================================================
# LIVE DRY RUN MONITOR
# =============================================================================

class DryRunMonitor:
    """
    Monitor for live dry run testing.
    
    Watches the routing decision log and displays decisions in real-time.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.hook = RouterHook(config_path=config_path, mode="dry_run")
        self.log_file = self.hook.state.log_file
        self._last_position = 0
    
    def watch(self, interval: float = 1.0) -> None:
        """Watch log file for new routing decisions."""
        print("=" * 60)
        print("SMART ROUTER DRY RUN MONITOR")
        print(f"Watching: {self.log_file}")
        print("Press Ctrl+C to stop")
        print("=" * 60)
        print()
        
        # Get initial position
        if self.log_file.exists():
            self._last_position = self.log_file.stat().st_size
        
        try:
            while True:
                self._check_new_entries()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n\nMonitor stopped.")
    
    def _check_new_entries(self) -> None:
        """Check for new log entries."""
        if not self.log_file.exists():
            return
        
        current_size = self.log_file.stat().st_size
        if current_size <= self._last_position:
            return
        
        with open(self.log_file, 'r') as f:
            f.seek(self._last_position)
            new_lines = f.readlines()
            self._last_position = f.tell()
        
        for line in new_lines:
            try:
                entry = json.loads(line.strip())
                self._display_entry(entry)
            except json.JSONDecodeError:
                continue
    
    def _display_entry(self, entry: dict) -> None:
        """Display a routing decision entry."""
        timestamp = entry.get("timestamp", "?")[:19]
        intent = entry.get("intent", "?")
        complexity = entry.get("complexity", "?")
        selected = entry.get("model_selected", "?")
        used = entry.get("model_used", "?")
        reason = entry.get("reason", "")
        
        switch = "🔄" if selected != used else "✓"
        
        print(f"[{timestamp}] {switch} {intent}/{complexity} -> {selected}")
        print(f"           Reason: {reason}")
        print(f"           Current: {used}")
        print()


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Smart Router Hook")
    parser.add_argument("--config", type=str, help="Path to router_config.json")
    parser.add_argument("--analyze", type=str, help="Analyze a message")
    parser.add_argument("--context-tokens", type=int, default=0, help="Context token count")
    parser.add_argument("--current-model", type=str, default="anthropic/claude-opus-4-5",
                       help="Current model for comparison")
    parser.add_argument("--dry-run", action="store_true", help="Enable dry run mode")
    parser.add_argument("--watch", action="store_true", help="Watch for new decisions")
    parser.add_argument("--recent", type=int, help="Show N recent decisions")
    parser.add_argument("--stats", action="store_true", help="Show hook statistics")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    # Find config
    config_path = args.config
    if not config_path:
        default_path = Path(__file__).parent / "router_config.json"
        if default_path.exists():
            config_path = str(default_path)
    
    # Watch mode
    if args.watch:
        monitor = DryRunMonitor(config_path=config_path)
        monitor.watch()
        return
    
    # Initialize hook
    hook = RouterHook(
        config_path=config_path,
        mode="dry_run" if args.dry_run else "shadow"
    )
    
    # Analyze mode
    if args.analyze:
        decision = hook.intercept(
            args.analyze,
            context_tokens=args.context_tokens,
            current_model=args.current_model
        )
        
        if args.json:
            print(json.dumps({
                "intent": decision.intent.name,
                "complexity": decision.complexity.name,
                "selected_model": decision.selected_model,
                "fallback_chain": decision.fallback_chain,
                "reason": decision.reason,
                "context_tokens": decision.context_tokens,
                "current_model": args.current_model,
                "would_switch": decision.selected_model != hook._normalize_model(args.current_model)
            }, indent=2))
        else:
            print(hook.format_decision_display(decision, args.current_model))
        
        hook.save_state()
        return
    
    # Recent decisions
    if args.recent:
        decisions = hook.state.get_recent_decisions(args.recent)
        if args.json:
            print(json.dumps(decisions, indent=2))
        else:
            print(f"Recent {len(decisions)} routing decisions:")
            print("-" * 60)
            for d in decisions:
                switch = "🔄" if d["model_selected"] != d["model_used"] else "✓"
                print(f"[{d['timestamp'][:19]}] {switch} {d['intent']}/{d['complexity']} -> {d['model_selected']}")
        return
    
    # Stats
    if args.stats:
        stats = hook.get_stats()
        if args.json:
            print(json.dumps(stats, indent=2))
        else:
            print("Router Hook Statistics")
            print("=" * 40)
            print(f"Mode: {stats['mode']}")
            print(f"Decisions: {stats['decisions_count']}")
            print(f"Switches suggested: {stats['switches_suggested']}")
            print(f"Switch rate: {stats['switch_rate']}")
        return
    
    # Default: interactive mode
    print("Smart Router Hook - Interactive Mode")
    print("Enter messages to analyze, 'stats' for statistics, 'quit' to exit")
    print("-" * 60)
    
    while True:
        try:
            text = input("\n> ").strip()
            if not text:
                continue
            if text.lower() == "quit":
                break
            if text.lower() == "stats":
                stats = hook.get_stats()
                print(f"Decisions: {stats['decisions_count']}, Switches: {stats['switches_suggested']}")
                continue
            
            decision = hook.intercept(text, current_model=args.current_model)
            print(hook.format_decision_display(decision, args.current_model))
            
        except KeyboardInterrupt:
            break
        except EOFError:
            break
    
    hook.save_state()
    print("\nGoodbye!")


if __name__ == "__main__":
    main()
