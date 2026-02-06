#!/usr/bin/env python3
"""
Smart Router Executor - Sub-Agent Delegation Engine

Implements the execution layer that actually delegates tasks to different models
via OpenClaw's sessions_spawn mechanism.

Execution Flow:
1. Router analyzes message → recommends model
2. If recommended ≠ current → Executor prepares delegation
3. sessions_spawn called with appropriate model
4. Result stitched back with model attribution header
5. Circuit breaker updated on success/failure

Usage:
    from executor import RouterExecutor
    
    executor = RouterExecutor()
    plan = executor.analyze("What's Bitcoin price?", current_model="opus")
    
    if plan.should_delegate:
        # Call sessions_spawn with plan.spawn_params
        # On completion, use plan.format_result(output)

Author: J.A.R.V.I.S. for Cabo
Version: 1.0.0
"""

import json
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import logging

sys.path.insert(0, str(Path(__file__).parent))

from router_gateway import SmartRouter, RoutingDecision, Intent, Complexity
from state_manager import StateManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart-router.executor")


@dataclass
class ExecutionPlan:
    """Plan for how to execute a request."""
    
    # Routing decision
    decision: RoutingDecision
    current_model: str
    
    # Delegation decision
    should_delegate: bool
    delegation_reason: Optional[str] = None
    
    # Spawn parameters (if delegating)
    spawn_params: Optional[dict] = None
    
    # Fallback chain for retry
    fallback_models: list[str] = field(default_factory=list)
    fallback_index: int = 0
    
    # Tracking
    task_id: Optional[str] = None
    started_at: Optional[float] = None
    
    def get_spawn_call(self) -> str:
        """
        Generate the sessions_spawn tool call for the agent to execute.
        
        Returns a formatted string showing the exact tool call.
        """
        if not self.should_delegate or not self.spawn_params:
            return ""
        
        agent_part = f'agentId="{self.spawn_params["agentId"]}"' if "agentId" in self.spawn_params else f'model="{self.spawn_params.get("model", "default")}"'
        return f"""sessions_spawn(
    task="{self.spawn_params['task'][:100]}...",
    {agent_part},
    label="{self.spawn_params['label']}"
)"""
    
    def format_result(self, output: str, model_used: str) -> str:
        """
        Format the result with model attribution header.
        
        Args:
            output: The raw output from the sub-agent
            model_used: The model that completed the task
            
        Returns:
            Formatted output with header
        """
        model_display = {
            "opus": "Claude Opus",
            "sonnet": "Claude Sonnet", 
            "haiku": "Claude Haiku",
            "gpt5": "GPT-5",
            "gemini-pro": "Gemini Pro",
            "flash": "Gemini Flash",
            "grok2": "Grok 2",
            "grok3": "Grok 3",
        }.get(model_used, model_used)
        
        intent_emoji = {
            Intent.CODE: "💻",
            Intent.ANALYSIS: "🔍",
            Intent.CREATIVE: "🎨",
            Intent.REALTIME: "⚡",
            Intent.GENERAL: "💬",
        }.get(self.decision.intent, "✅")
        
        header = f"{intent_emoji} **{model_display}** completed this task"
        
        if self.decision.special_case:
            case_info = {
                "realtime_required": "(real-time data)",
                "long_context": "(large context)",
                "long_context_extreme": "(250K+ context)",
            }.get(self.decision.special_case, "")
            if case_info:
                header += f" {case_info}"
        
        return f"{header}\n\n---\n\n{output}"
    
    def format_failure(self, error: str, attempted_models: list[str]) -> str:
        """Format error message when all models fail."""
        return (
            f"❌ **Task Delegation Failed**\n\n"
            f"Unable to complete the request after trying: {', '.join(attempted_models)}\n\n"
            f"**Last error:** {error}\n\n"
            f"_Falling back to main session processing._"
        )


@dataclass
class DelegationTracker:
    """Tracks active delegated tasks."""
    task_id: str
    plan: ExecutionPlan
    started_at: float
    status: str = "pending"  # pending, running, completed, failed
    result: Optional[str] = None
    model_used: Optional[str] = None
    attempts: list[str] = field(default_factory=list)


class RouterExecutor:
    """
    Executor that handles actual task delegation via sessions_spawn.
    
    This class prepares execution plans that the agent (J.A.R.V.I.S.) 
    can use to make sessions_spawn calls.
    """
    
    # Models that should NOT trigger delegation (process in main session)
    MAIN_SESSION_MODELS = ["opus"]  # Current default model
    
    # Agent ID mapping for sessions_spawn (configured in openclaw.json)
    # None means use main session (no delegation needed for that tier)
    AGENT_IDS = {
        "opus": None,       # Main session handles this
        "sonnet": None,     # Main session with model override
        "haiku": None,      # Main session with model override  
        "gpt5": "gpt",      # GPT-5 agent
        "gemini-pro": "gemini",  # Gemini Pro agent
        "flash": "flash",   # Gemini Flash agent
        "grok2": "grok",    # Grok agent
        "grok3": "grok",    # Grok agent (fallback)
    }
    
    # Model overrides for Anthropic tiers (handled in main session)
    MODEL_OVERRIDES = {
        "sonnet": "anthropic/claude-sonnet-4-5",
        "haiku": "anthropic/claude-haiku-3-5",
    }
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize executor with router and state manager."""
        if config_path is None:
            config_path = Path(__file__).parent / "router_config.json"
        
        self.config = {}
        if Path(config_path).exists():
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        
        self.state = StateManager(config=self.config)
        self.router = SmartRouter(
            available_providers=self.config.get("providers", {}).get("available",
                ["anthropic", "openai", "google", "xai"])
        )
        
        # Inject persistent circuit breaker
        self._sync_circuit_breaker()
        
        # Active delegations
        self._delegations: dict[str, DelegationTracker] = {}
        self._task_counter = 0
        
        logger.info("RouterExecutor initialized")
    
    def _sync_circuit_breaker(self) -> None:
        """Sync state manager's circuit breaker with router."""
        def wrapped_can_call(model: str) -> bool:
            return self.state.can_call_model(model)
        self.router.circuit_breaker.can_call = wrapped_can_call
    
    def _normalize_model(self, model_id: str) -> str:
        """Normalize full model ID to alias."""
        # Full model ID to alias mapping
        FULL_TO_ALIAS = {
            "anthropic/claude-opus-4-5": "opus",
            "anthropic/claude-sonnet-4-5": "sonnet",
            "anthropic/claude-haiku-3-5": "haiku",
            "openai/gpt-5": "gpt5",
            "google/gemini-2.5-pro": "gemini-pro",
            "google/gemini-2.5-flash": "flash",
            "xai/grok-2-latest": "grok2",
            "xai/grok-3": "grok3",
        }
        return FULL_TO_ALIAS.get(model_id, model_id)
    
    def analyze(
        self,
        message: str,
        current_model: str = "anthropic/claude-opus-4-5",
        context_tokens: int = 0,
        force_delegate: bool = False
    ) -> ExecutionPlan:
        """
        Analyze a message and create an execution plan.
        
        Args:
            message: User's message
            current_model: Currently active model
            context_tokens: Estimated context size
            force_delegate: Always delegate if True
            
        Returns:
            ExecutionPlan with delegation decision and parameters
        """
        # Normalize current model
        current_alias = self._normalize_model(current_model)
        
        # Get routing decision
        decision = self.router.classify(message, context_tokens)
        
        # Determine if we should delegate
        should_delegate = False
        delegation_reason = None
        
        recommended = decision.selected_model
        
        if force_delegate and recommended != current_alias:
            should_delegate = True
            delegation_reason = "forced_delegation"
        elif recommended != current_alias:
            # Check if this is a significant optimization
            if decision.special_case in ["realtime_required", "long_context", "long_context_extreme"]:
                should_delegate = True
                delegation_reason = decision.special_case
            elif decision.intent == Intent.REALTIME and recommended in ["grok2", "grok3"]:
                should_delegate = True
                delegation_reason = "realtime_requires_grok"
            elif context_tokens > 128000 and recommended in ["gemini-pro", "flash"]:
                should_delegate = True
                delegation_reason = "long_context_requires_gemini"
            elif decision.complexity == Complexity.SIMPLE and recommended in ["haiku", "flash"]:
                # Cost optimization - delegate simple tasks to cheaper models
                should_delegate = True
                delegation_reason = "cost_optimization"
        
        # Build spawn parameters if delegating
        spawn_params = None
        if should_delegate:
            self._task_counter += 1
            task_id = f"router-{self._task_counter}-{int(time.time())}"
            
            agent_id = self.AGENT_IDS.get(recommended)
            
            spawn_params = {
                "task": message,
                "label": f"router-{decision.intent.name.lower()}-{recommended}",
            }
            
            if agent_id:
                # Delegate to configured agent
                spawn_params["agentId"] = agent_id
            elif recommended in self.MODEL_OVERRIDES:
                # Use main agent with model override
                spawn_params["model"] = self.MODEL_OVERRIDES[recommended]
        else:
            task_id = None
        
        # Build fallback chain
        fallback_models = [
            m for m in decision.fallback_chain
            if m != recommended and self.state.can_call_model(m)
        ]
        
        plan = ExecutionPlan(
            decision=decision,
            current_model=current_alias,
            should_delegate=should_delegate,
            delegation_reason=delegation_reason,
            spawn_params=spawn_params,
            fallback_models=fallback_models,
            task_id=task_id,
            started_at=time.time() if should_delegate else None
        )
        
        # Log the decision
        self.state.log_routing_decision(
            intent=decision.intent.name,
            complexity=decision.complexity.name,
            model_selected=recommended,
            model_used=current_alias if not should_delegate else recommended,
            fallback_triggered=False,
            reason=delegation_reason or "no_delegation",
            context_tokens=context_tokens,
            latency_ms=0,
            session_id="executor"
        )
        
        if should_delegate:
            logger.info(f"DELEGATE: {decision.intent.name} -> {recommended} ({delegation_reason})")
        else:
            logger.info(f"MAIN SESSION: {decision.intent.name} -> {current_alias}")
        
        return plan
    
    def record_success(self, plan: ExecutionPlan, model: str) -> None:
        """Record successful delegation - update circuit breaker."""
        self.state.record_circuit_success(model)
        self.state.save()
        logger.info(f"SUCCESS: {model}")
    
    def record_failure(self, plan: ExecutionPlan, model: str, error: str) -> Optional[ExecutionPlan]:
        """
        Record failed delegation and get retry plan.
        
        Args:
            plan: Original execution plan
            model: Model that failed
            error: Error message
            
        Returns:
            New ExecutionPlan for retry, or None if no fallbacks
        """
        self.state.record_circuit_failure(model)
        self.state.save()
        logger.warning(f"FAILURE: {model} - {error}")
        
        # Check for fallback
        if plan.fallback_index < len(plan.fallback_models):
            next_model = plan.fallback_models[plan.fallback_index]
            plan.fallback_index += 1
            
            if self.state.can_call_model(next_model):
                # Update spawn params for retry
                plan.spawn_params = {
                    "task": plan.spawn_params["task"],
                    "model": self.MODEL_IDS.get(next_model, next_model),
                    "label": f"router-fallback-{next_model}",
                }
                logger.info(f"RETRY: Falling back to {next_model}")
                return plan
        
        return None
    
    def get_delegation_status(self) -> dict[str, Any]:
        """Get status of all tracked delegations."""
        return {
            "active": len([d for d in self._delegations.values() if d.status == "running"]),
            "completed": len([d for d in self._delegations.values() if d.status == "completed"]),
            "failed": len([d for d in self._delegations.values() if d.status == "failed"]),
            "total": len(self._delegations),
        }


class ExecutorAgent:
    """
    High-level interface for the agent to use.
    
    This class provides simple methods that return formatted strings
    for the agent to include in tool calls or responses.
    """
    
    def __init__(self):
        self.executor = RouterExecutor(
            config_path=Path(__file__).parent / "router_config.json"
        )
    
    def should_delegate(
        self,
        message: str,
        context_tokens: int = 0
    ) -> tuple[bool, Optional[dict], str]:
        """
        Check if a message should be delegated.
        
        Returns:
            Tuple of (should_delegate, spawn_params, reason)
        """
        plan = self.executor.analyze(message, context_tokens=context_tokens)
        
        if plan.should_delegate:
            return True, plan.spawn_params, plan.delegation_reason or ""
        
        return False, None, "process_in_main_session"
    
    def format_delegation_header(
        self,
        model: str,
        intent: str,
        special_case: Optional[str] = None
    ) -> str:
        """Format the header for a delegated response."""
        model_display = {
            "grok2": "Grok 2",
            "grok3": "Grok 3",
            "gemini-pro": "Gemini Pro",
            "flash": "Gemini Flash",
            "gpt5": "GPT-5",
            "sonnet": "Claude Sonnet",
            "haiku": "Claude Haiku",
        }.get(model, model)
        
        intent_emoji = {
            "REALTIME": "⚡",
            "ANALYSIS": "🔍",
            "CODE": "💻",
            "CREATIVE": "🎨",
            "GENERAL": "💬",
        }.get(intent, "✅")
        
        header = f"{intent_emoji} **{model_display}** completed this task"
        
        if special_case:
            case_info = {
                "realtime_required": "(real-time data)",
                "realtime_requires_grok": "(real-time data)",
                "long_context": "(large context)",
                "long_context_extreme": "(250K+ context)",
                "long_context_requires_gemini": "(large context)",
                "cost_optimization": "(optimized)",
            }.get(special_case, "")
            if case_info:
                header += f" {case_info}"
        
        return header


# =============================================================================
# CLI
# =============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Smart Router Executor")
    parser.add_argument("--analyze", type=str, help="Analyze a message")
    parser.add_argument("--context-tokens", type=int, default=0)
    parser.add_argument("--force", action="store_true", help="Force delegation")
    parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    
    executor = RouterExecutor()
    
    if args.analyze:
        plan = executor.analyze(
            args.analyze,
            context_tokens=args.context_tokens,
            force_delegate=args.force
        )
        
        if args.json:
            print(json.dumps({
                "should_delegate": plan.should_delegate,
                "delegation_reason": plan.delegation_reason,
                "recommended_model": plan.decision.selected_model,
                "intent": plan.decision.intent.name,
                "complexity": plan.decision.complexity.name,
                "spawn_params": plan.spawn_params,
                "fallbacks": plan.fallback_models,
            }, indent=2))
        else:
            print(f"Should delegate: {plan.should_delegate}")
            if plan.should_delegate:
                print(f"Reason: {plan.delegation_reason}")
                print(f"Model: {plan.decision.selected_model}")
                print(f"\nSpawn call:\n{plan.get_spawn_call()}")
            else:
                print(f"Process in main session ({plan.current_model})")
        
        executor.state.save()
        return
    
    print("Usage: python executor.py --analyze 'message' [--context-tokens N] [--force]")


if __name__ == "__main__":
    main()
