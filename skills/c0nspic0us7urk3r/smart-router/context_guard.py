#!/usr/bin/env python3
"""
Context Guard - Pre-Flight Token Budgeting & Overflow Prevention (Phase H)

Prevents context overflow errors through:
1. Pre-flight token audit before model dispatch
2. Dynamic routing to high-context models when approaching limits
3. Just-In-Time (JIT) compaction when model cannot be changed
4. Error interception and automatic retry with Gemini

Usage:
    from context_guard import ContextGuard, PreFlightResult
    
    guard = ContextGuard()
    result = guard.pre_flight_check(
        message="...",
        history=[...],
        target_model="opus",
        context_tokens=180000
    )
    
    if result.force_reroute:
        # Use result.recommended_model instead
    if result.needs_compaction:
        # Run compactor.py before proceeding

Author: J.A.R.V.I.S. for Cabo
Version: 1.0.0 (Phase H)
"""

import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional, Callable

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart-router.context-guard")


# =============================================================================
# MODEL CONTEXT LIMITS (Hard Limits)
# =============================================================================

MODEL_CONTEXT_LIMITS: dict[str, int] = {
    # Anthropic
    "opus": 200_000,
    "sonnet": 200_000,
    "haiku": 200_000,
    "anthropic/claude-opus-4-5": 200_000,
    "anthropic/claude-sonnet-4-5": 200_000,
    "anthropic/claude-haiku-3-5": 200_000,
    
    # OpenAI
    "gpt5": 128_000,
    "openai/gpt-5": 128_000,
    
    # Google (high context)
    "gemini-pro": 2_000_000,
    "flash": 1_000_000,
    "google/gemini-2.5-pro": 2_000_000,
    "google/gemini-2.5-flash": 1_000_000,
    
    # xAI
    "grok2": 128_000,
    "grok3": 128_000,
    "xai/grok-2-latest": 128_000,
    "xai/grok-3": 128_000,
}

# Safety thresholds
FORCE_REROUTE_THRESHOLD = 0.90  # 90% of limit → force to Gemini
COMPACTION_THRESHOLD = 0.80     # 80% of limit → trigger JIT compaction
WARNING_THRESHOLD = 0.70        # 70% of limit → log warning

# High-context fallback model
HIGH_CONTEXT_MODEL = "gemini-pro"
HIGH_CONTEXT_MODEL_ID = "google/gemini-2.5-pro"


@dataclass
class PreFlightResult:
    """Result of pre-flight token audit."""
    
    # Input analysis
    total_tokens: int
    model_limit: int
    utilization: float  # 0.0 - 1.0
    
    # Routing decisions
    safe_to_proceed: bool
    force_reroute: bool = False
    recommended_model: Optional[str] = None
    reroute_reason: Optional[str] = None
    
    # Compaction decisions
    needs_compaction: bool = False
    compaction_target: Optional[int] = None  # Target token count after compaction
    
    # Warnings
    warnings: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "total_tokens": self.total_tokens,
            "model_limit": self.model_limit,
            "utilization": f"{self.utilization:.1%}",
            "safe_to_proceed": self.safe_to_proceed,
            "force_reroute": self.force_reroute,
            "recommended_model": self.recommended_model,
            "needs_compaction": self.needs_compaction,
            "warnings": self.warnings,
        }


@dataclass
class CompactionResult:
    """Result of JIT compaction."""
    original_tokens: int
    compacted_tokens: int
    reduction: float
    kept_items: list[str]
    dropped_items: list[str]
    success: bool
    error: Optional[str] = None


class TokenCounter:
    """
    Estimates token count for text.
    
    Uses a simple heuristic by default. Can be upgraded to use
    tiktoken or litellm.token_counter for more accuracy.
    """
    
    # Average chars per token by model family
    CHARS_PER_TOKEN = {
        "anthropic": 3.5,
        "openai": 4.0,
        "google": 4.0,
        "xai": 4.0,
        "default": 4.0,
    }
    
    def __init__(self, use_tiktoken: bool = False):
        self.use_tiktoken = use_tiktoken
        self._tiktoken_enc = None
        
        if use_tiktoken:
            try:
                import tiktoken
                self._tiktoken_enc = tiktoken.get_encoding("cl100k_base")
            except ImportError:
                logger.warning("tiktoken not available, using heuristic counter")
                self.use_tiktoken = False
    
    def count(self, text: str, provider: str = "default") -> int:
        """Count tokens in text."""
        if not text:
            return 0
        
        if self.use_tiktoken and self._tiktoken_enc:
            return len(self._tiktoken_enc.encode(text))
        
        # Heuristic: chars / chars_per_token
        chars_per_token = self.CHARS_PER_TOKEN.get(provider, 4.0)
        return int(len(text) / chars_per_token)
    
    def count_messages(self, messages: list[dict], provider: str = "default") -> int:
        """Count tokens in a message list."""
        total = 0
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, str):
                total += self.count(content, provider)
            elif isinstance(content, list):
                # Handle multi-part messages
                for part in content:
                    if isinstance(part, dict) and "text" in part:
                        total += self.count(part["text"], provider)
            # Add overhead for message structure
            total += 4  # role, etc.
        return total


class ContextGuard:
    """
    Pre-flight token budgeting and context overflow prevention.
    
    Ensures requests don't exceed model context limits by:
    1. Auditing total token count before dispatch
    2. Force-routing to high-context models when needed
    3. Triggering JIT compaction when approaching limits
    """
    
    def __init__(
        self,
        model_limits: Optional[dict[str, int]] = None,
        token_counter: Optional[TokenCounter] = None,
        compactor_path: Optional[str] = None,
    ):
        self.model_limits = model_limits or MODEL_CONTEXT_LIMITS
        self.counter = token_counter or TokenCounter()
        
        # Path to compactor.py for JIT compaction
        if compactor_path:
            self.compactor_path = Path(compactor_path)
        else:
            self.compactor_path = Path(__file__).parent / "compactor.py"
    
    def get_model_limit(self, model: str) -> int:
        """Get context limit for a model."""
        # Try exact match
        if model in self.model_limits:
            return self.model_limits[model]
        
        # Try alias lookup
        model_lower = model.lower()
        for key, limit in self.model_limits.items():
            if key.lower() == model_lower or key.endswith(f"/{model_lower}"):
                return limit
        
        # Default conservative limit
        logger.warning(f"Unknown model '{model}', using conservative 100K limit")
        return 100_000
    
    def get_provider(self, model: str) -> str:
        """Extract provider from model ID."""
        if "/" in model:
            return model.split("/")[0]
        
        # Guess from alias
        provider_map = {
            "opus": "anthropic", "sonnet": "anthropic", "haiku": "anthropic",
            "gpt": "openai", "gpt5": "openai",
            "gemini": "google", "flash": "google",
            "grok": "xai",
        }
        
        for prefix, provider in provider_map.items():
            if model.lower().startswith(prefix):
                return provider
        
        return "default"
    
    def pre_flight_check(
        self,
        message: str,
        target_model: str,
        context_tokens: int = 0,
        history: Optional[list[dict]] = None,
        system_prompt: Optional[str] = None,
        allow_reroute: bool = True,
        allow_compaction: bool = True,
    ) -> PreFlightResult:
        """
        Perform pre-flight token audit.
        
        Args:
            message: Current user message
            target_model: Model the request will be sent to
            context_tokens: Pre-calculated context token count (if known)
            history: Conversation history (if context_tokens not provided)
            system_prompt: System prompt (if context_tokens not provided)
            allow_reroute: Allow force-routing to high-context model
            allow_compaction: Allow JIT compaction recommendation
        
        Returns:
            PreFlightResult with routing/compaction decisions
        """
        provider = self.get_provider(target_model)
        model_limit = self.get_model_limit(target_model)
        
        # Calculate total tokens
        if context_tokens > 0:
            total_tokens = context_tokens
        else:
            total_tokens = 0
            if system_prompt:
                total_tokens += self.counter.count(system_prompt, provider)
            if history:
                total_tokens += self.counter.count_messages(history, provider)
            total_tokens += self.counter.count(message, provider)
        
        # Calculate utilization
        utilization = total_tokens / model_limit if model_limit > 0 else 1.0
        
        warnings = []
        force_reroute = False
        recommended_model = None
        reroute_reason = None
        needs_compaction = False
        compaction_target = None
        
        # Check thresholds
        if utilization >= FORCE_REROUTE_THRESHOLD:
            # Critical: Force reroute to Gemini
            if allow_reroute and target_model not in ["gemini-pro", "flash", 
                                                        "google/gemini-2.5-pro",
                                                        "google/gemini-2.5-flash"]:
                force_reroute = True
                recommended_model = HIGH_CONTEXT_MODEL
                reroute_reason = f"Preventative Context Safety: {utilization:.1%} of {model_limit:,} limit"
                warnings.append(f"⚠️ Context at {utilization:.1%} - force routing to Gemini Pro")
                logger.warning(f"Pre-flight: Force reroute to Gemini ({total_tokens:,}/{model_limit:,} = {utilization:.1%})")
            elif not allow_reroute:
                # Can't reroute, must compact
                needs_compaction = True
                compaction_target = int(model_limit * 0.7)  # Target 70%
                warnings.append(f"⚠️ Context at {utilization:.1%} - JIT compaction required")
        
        elif utilization >= COMPACTION_THRESHOLD:
            # Warning: Approaching limit
            if allow_compaction and target_model not in ["gemini-pro", "flash"]:
                needs_compaction = True
                compaction_target = int(model_limit * 0.6)  # Target 60%
                warnings.append(f"⚡ Context at {utilization:.1%} - compaction recommended")
                logger.info(f"Pre-flight: Compaction recommended ({total_tokens:,}/{model_limit:,})")
        
        elif utilization >= WARNING_THRESHOLD:
            warnings.append(f"📊 Context at {utilization:.1%} of model limit")
        
        # Determine if safe to proceed
        safe_to_proceed = (
            utilization < FORCE_REROUTE_THRESHOLD or
            force_reroute or  # Will be handled by rerouting
            target_model in ["gemini-pro", "flash", "google/gemini-2.5-pro", "google/gemini-2.5-flash"]
        )
        
        return PreFlightResult(
            total_tokens=total_tokens,
            model_limit=model_limit,
            utilization=utilization,
            safe_to_proceed=safe_to_proceed,
            force_reroute=force_reroute,
            recommended_model=recommended_model,
            reroute_reason=reroute_reason,
            needs_compaction=needs_compaction,
            compaction_target=compaction_target,
            warnings=warnings,
        )
    
    def should_intercept_error(self, error: Exception) -> bool:
        """Check if an error is a context overflow that should be intercepted."""
        error_str = str(error).lower()
        
        overflow_patterns = [
            "context length",
            "context_length",
            "token limit",
            "maximum context",
            "too many tokens",
            "exceeds the model",
            "input too long",
            "request too large",
        ]
        
        # Check HTTP status codes
        if hasattr(error, "status_code"):
            if error.status_code in [400, 413, 422]:
                for pattern in overflow_patterns:
                    if pattern in error_str:
                        return True
        
        # Check error message
        for pattern in overflow_patterns:
            if pattern in error_str:
                return True
        
        return False
    
    def get_retry_model(self) -> tuple[str, str]:
        """Get the high-context model for retry after overflow."""
        return HIGH_CONTEXT_MODEL, HIGH_CONTEXT_MODEL_ID


class JITCompactor:
    """
    Just-In-Time context compaction.
    
    Reduces context size by:
    1. Summarizing oldest 40% of conversation
    2. Keeping must-have identifiers (file paths, goals)
    3. Dropping optional verbose content
    """
    
    # Patterns for must-keep content
    MUST_KEEP_PATTERNS = [
        r"(?:^|\s)/[\w./]+\.\w+",  # File paths
        r"(?:^|\s)~/[\w./]+",       # Home-relative paths
        r"#\s*(?:GOAL|TASK|TODO|MISSION):",  # Goal markers
        r"```[\w]*\n.*?```",        # Code blocks (keep recent ones)
    ]
    
    # Patterns for droppable content
    DROPPABLE_PATTERNS = [
        r'"raw_response":\s*\{[^}]+\}',  # Raw API responses
        r'"headers":\s*\{[^}]+\}',        # HTTP headers
        r'tool_call_id":\s*"[^"]+',       # Tool call IDs
        r'"timestamp":\s*"[^"]+',         # Timestamps in JSON
    ]
    
    def __init__(self, token_counter: Optional[TokenCounter] = None):
        self.counter = token_counter or TokenCounter()
    
    def compact(
        self,
        messages: list[dict],
        target_tokens: int,
        provider: str = "default",
    ) -> CompactionResult:
        """
        Compact messages to target token count.
        
        Strategy:
        1. Calculate current tokens
        2. Identify oldest 40% of messages
        3. Summarize or drop based on content type
        4. Keep must-have identifiers
        """
        current_tokens = self.counter.count_messages(messages, provider)
        
        if current_tokens <= target_tokens:
            return CompactionResult(
                original_tokens=current_tokens,
                compacted_tokens=current_tokens,
                reduction=0.0,
                kept_items=["all messages retained"],
                dropped_items=[],
                success=True,
            )
        
        # Need to reduce by this many tokens
        tokens_to_reduce = current_tokens - target_tokens
        
        # Split messages: oldest 40% vs recent 60%
        split_point = int(len(messages) * 0.4)
        old_messages = messages[:split_point]
        recent_messages = messages[split_point:]
        
        kept_items = []
        dropped_items = []
        compacted_messages = []
        
        # Process old messages - summarize or drop
        old_text_parts = []
        for msg in old_messages:
            content = msg.get("content", "")
            if isinstance(content, str):
                # Check for must-keep patterns
                has_must_keep = False
                for pattern in self.MUST_KEEP_PATTERNS:
                    if re.search(pattern, content, re.MULTILINE | re.DOTALL):
                        has_must_keep = True
                        break
                
                # Check for droppable patterns
                is_droppable = False
                for pattern in self.DROPPABLE_PATTERNS:
                    if re.search(pattern, content):
                        is_droppable = True
                        break
                
                if is_droppable and not has_must_keep:
                    dropped_items.append(f"Dropped verbose content from {msg.get('role', 'unknown')}")
                else:
                    old_text_parts.append(content[:500])  # Truncate to summary
                    kept_items.append(f"Summarized {msg.get('role', 'unknown')} message")
        
        # Create summary message for old content
        if old_text_parts:
            summary = "[Context Summary]\n" + "\n---\n".join(old_text_parts[:5])
            compacted_messages.append({
                "role": "system",
                "content": summary
            })
        
        # Keep all recent messages
        compacted_messages.extend(recent_messages)
        kept_items.append(f"Kept {len(recent_messages)} recent messages intact")
        
        compacted_tokens = self.counter.count_messages(compacted_messages, provider)
        reduction = (current_tokens - compacted_tokens) / current_tokens
        
        return CompactionResult(
            original_tokens=current_tokens,
            compacted_tokens=compacted_tokens,
            reduction=reduction,
            kept_items=kept_items,
            dropped_items=dropped_items,
            success=compacted_tokens <= target_tokens,
        )


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def check_context(
    message: str,
    model: str,
    context_tokens: int = 0,
) -> PreFlightResult:
    """Quick pre-flight check."""
    guard = ContextGuard()
    return guard.pre_flight_check(message, model, context_tokens)


def dry_run(model: str, context_tokens: int) -> str:
    """
    Perform a dry run check and return formatted output.
    """
    guard = ContextGuard()
    result = guard.pre_flight_check(
        message="Test message for dry run",
        target_model=model,
        context_tokens=context_tokens,
    )
    
    output = []
    output.append("=" * 60)
    output.append("CONTEXT GUARD - PRE-FLIGHT CHECK (Phase H)")
    output.append("=" * 60)
    output.append(f"\nTarget Model: {model}")
    output.append(f"Model Limit: {result.model_limit:,} tokens")
    output.append(f"Context Size: {result.total_tokens:,} tokens")
    output.append(f"Utilization: {result.utilization:.1%}")
    output.append("")
    
    # Status
    if result.safe_to_proceed:
        output.append("✅ SAFE TO PROCEED")
    else:
        output.append("❌ UNSAFE - ACTION REQUIRED")
    
    # Routing decision
    if result.force_reroute:
        output.append(f"\n🔄 FORCE REROUTE: → {result.recommended_model}")
        output.append(f"   Reason: {result.reroute_reason}")
    
    # Compaction decision
    if result.needs_compaction:
        output.append(f"\n📦 JIT COMPACTION REQUIRED")
        output.append(f"   Target: {result.compaction_target:,} tokens")
    
    # Warnings
    if result.warnings:
        output.append("\n⚠️ WARNINGS:")
        for w in result.warnings:
            output.append(f"   {w}")
    
    output.append("")
    output.append("=" * 60)
    
    return "\n".join(output)


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Context Guard - Pre-flight token check")
    parser.add_argument("--model", type=str, default="opus", help="Target model")
    parser.add_argument("--tokens", type=int, default=100000, help="Context token count")
    parser.add_argument("--dry-run", action="store_true", help="Run dry run check")
    
    args = parser.parse_args()
    
    if args.dry_run or True:  # Always dry run for CLI
        print(dry_run(args.model, args.tokens))
