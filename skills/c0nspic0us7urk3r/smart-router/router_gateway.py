#!/usr/bin/env python3
"""
Smart Router Gateway - Intelligent Model Routing Middleware

A functional prototype that implements the routing logic from SKILL.md.
Intercepts requests and routes them to the optimal model based on:
- Intent classification (CODE, ANALYSIS, CREATIVE, REALTIME, GENERAL)
- Complexity estimation (SIMPLE, MEDIUM, COMPLEX)
- Special case overrides (long context, real-time, vision)
- Cost optimization and fallback handling

Usage:
    from router_gateway import SmartRouter
    
    router = SmartRouter(config_path="router_config.json")
    response = await router.route_request(user_message, context_tokens=50000)

Author: J.A.R.V.I.S. for Cabo
Version: 1.0.0
License: MIT
"""

import asyncio
import json
import logging
import os
import re
import time
import unicodedata
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Optional

# =============================================================================
# PHASE H: PRE-FLIGHT TOKEN BUDGETING
# =============================================================================

# Try tiktoken, fallback to heuristic
try:
    import tiktoken
    _ENCODER = tiktoken.get_encoding("cl100k_base")
    _USE_TIKTOKEN = True
except ImportError:
    _ENCODER = None
    _USE_TIKTOKEN = False

CONTEXT_SAFETY_THRESHOLD = 180_000
GEMINI_PRO_MODEL = "google/gemini-2.5-pro"


def calculate_budget(messages: list, model: str = "opus") -> int:
    """
    Calculate total token budget for messages.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Target model (for encoding selection)
    
    Returns:
        Total token count (system + history + current input)
    """
    if not messages:
        return 0
    
    total = 0
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, list):
            # Multi-part message
            content = " ".join(p.get("text", "") for p in content if isinstance(p, dict))
        
        if _USE_TIKTOKEN and _ENCODER:
            total += len(_ENCODER.encode(str(content)))
        else:
            # Heuristic: ~4 chars per token
            total += len(str(content)) // 4
        
        # Add overhead for message structure
        total += 4
    
    return total


def context_guard_check(messages: list, selected_model: str) -> tuple[str, bool, list]:
    """
    Pre-flight context guard check with JIT compaction.
    
    Returns:
        (final_model, was_overridden, compacted_messages)
    """
    tokens = calculate_budget(messages)
    
    # STRIKE 1: Force Gemini if >180K
    if tokens > CONTEXT_SAFETY_THRESHOLD:
        logger.warning(f"[Context Guard] Payload: {tokens:,}. Switching to Gemini Pro for safety.")
        return GEMINI_PRO_MODEL, True, messages
    
    # STRIKE 3: JIT Compaction if 150K-180K
    if tokens > 150_000:
        logger.info(f"[Context Guard] Payload: {tokens:,}. Triggering preventative compaction.")
        compacted = jit_compact(messages)
        new_tokens = calculate_budget(compacted)
        logger.info(f"[Context Guard] Compacted: {tokens:,} → {new_tokens:,} tokens.")
        return selected_model, False, compacted
    
    return selected_model, False, messages


def jit_compact(messages: list) -> list:
    """
    JIT Compaction: Summarize oldest 30% of messages.
    Reason: Preventative compaction to keep within Opus limits.
    """
    if len(messages) < 4:
        return messages
    
    split_idx = max(1, int(len(messages) * 0.3))
    old_messages = messages[:split_idx]
    recent_messages = messages[split_idx:]
    
    # Summarize old messages into one
    summary_parts = []
    for msg in old_messages:
        role = msg.get("role", "unknown")
        content = str(msg.get("content", ""))[:200]
        summary_parts.append(f"[{role}]: {content}...")
    
    summary_msg = {
        "role": "system",
        "content": f"[Compacted History]\n" + "\n".join(summary_parts)
    }
    
    return [summary_msg] + recent_messages


async def execute_with_silent_retry(call_func, messages: list, model: str):
    """
    STRIKE 2: Error Handshake - Silent retry on context overflow.
    
    Catches context_length_exceeded errors and retries with Gemini Pro.
    Returns successful result without surfacing the error.
    """
    try:
        return await call_func(messages, model)
    except Exception as e:
        error_str = str(e).lower()
        
        # Check for context overflow errors
        is_overflow = any(kw in error_str for kw in [
            "context_length_exceeded", "context window", "too many tokens",
            "maximum context length", "input too long"
        ])
        
        # Check status codes
        status = getattr(e, "status_code", getattr(e, "status", None))
        if status in [400, 413, 422]:
            is_overflow = True
        
        if is_overflow:
            logger.warning(f"[Error Handshake] Context overflow on {model}. Silent retry with Gemini Pro.")
            return await call_func(messages, GEMINI_PRO_MODEL)
        
        raise  # Re-raise non-overflow errors

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart-router")


# =============================================================================
# ENUMS AND DATA CLASSES
# =============================================================================

class Intent(Enum):
    """Primary intent categories for request classification."""
    CODE = auto()
    ANALYSIS = auto()
    CREATIVE = auto()
    REALTIME = auto()
    GENERAL = auto()
    MIXED = auto()


class Complexity(Enum):
    """Complexity levels for cost-tier routing."""
    SIMPLE = auto()    # $ tier
    MEDIUM = auto()    # $$ tier
    COMPLEX = auto()   # $$$ tier


class CostTier(Enum):
    """Cost tiers for model selection."""
    BUDGET = "$"           # <$0.50/1M tokens
    STANDARD = "$$"        # $0.50-$5/1M tokens
    PREMIUM = "$$$"        # $5-$15/1M tokens
    ULTRA = "$$$$"         # >$15/1M tokens


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = auto()    # Normal operation
    OPEN = auto()      # Failing, reject requests
    HALF_OPEN = auto() # Testing if recovered


@dataclass
class ModelInfo:
    """Model metadata for routing decisions."""
    id: str                          # e.g., "anthropic/claude-opus-4-5"
    alias: str                       # e.g., "opus"
    provider: str                    # e.g., "anthropic"
    context_window: int              # Max tokens
    cost_tier: CostTier
    supports_vision: bool = False
    supports_realtime: bool = False
    strengths: list[str] = field(default_factory=list)


@dataclass
class RoutingDecision:
    """Result of the routing classification."""
    intent: Intent
    complexity: Complexity
    selected_model: str
    fallback_chain: list[str]
    reason: str
    special_case: Optional[str] = None
    cost_tier_allowed: list[CostTier] = field(default_factory=list)
    context_tokens: int = 0
    show_routing: bool = False


@dataclass
class SanitizedInput:
    """Result of input sanitization."""
    text: str
    original_length: int
    warnings: list[str] = field(default_factory=list)
    blocked: bool = False
    block_reason: Optional[str] = None


@dataclass
class RouterResponse:
    """Response from the router including metadata."""
    content: str
    model_used: str
    routing_decision: RoutingDecision
    switched: bool = False
    switch_reason: Optional[str] = None
    latency_ms: float = 0
    token_count: Optional[int] = None


# =============================================================================
# MODEL REGISTRY
# =============================================================================

DEFAULT_MODELS: dict[str, ModelInfo] = {
    "opus": ModelInfo(
        id="anthropic/claude-opus-4-5",
        alias="opus",
        provider="anthropic",
        context_window=200_000,
        cost_tier=CostTier.ULTRA,
        supports_vision=True,
        strengths=["complex_reasoning", "code", "analysis", "creative"]
    ),
    "sonnet": ModelInfo(
        id="anthropic/claude-sonnet-4-5",
        alias="sonnet",
        provider="anthropic",
        context_window=200_000,
        cost_tier=CostTier.PREMIUM,
        supports_vision=True,
        strengths=["balanced", "code", "creative"]
    ),
    "haiku": ModelInfo(
        id="anthropic/claude-haiku-3-5",
        alias="haiku",
        provider="anthropic",
        context_window=200_000,
        cost_tier=CostTier.BUDGET,
        strengths=["fast", "simple_tasks"]
    ),
    "gpt5": ModelInfo(
        id="openai/gpt-5",
        alias="gpt5",
        provider="openai",
        context_window=128_000,
        cost_tier=CostTier.STANDARD,
        supports_vision=True,
        strengths=["general", "analysis", "code"]
    ),
    "gemini-pro": ModelInfo(
        id="google/gemini-2.5-pro",
        alias="gemini-pro",
        provider="google",
        context_window=1_000_000,
        cost_tier=CostTier.PREMIUM,
        supports_vision=True,
        strengths=["long_context", "analysis", "multimodal"]
    ),
    "flash": ModelInfo(
        id="google/gemini-2.5-flash",
        alias="flash",
        provider="google",
        context_window=1_000_000,
        cost_tier=CostTier.BUDGET,
        strengths=["fast", "long_context", "simple_tasks"]
    ),
    "grok2": ModelInfo(
        id="xai/grok-2-latest",
        alias="grok2",
        provider="xai",
        context_window=128_000,
        cost_tier=CostTier.STANDARD,
        supports_realtime=True,
        strengths=["realtime", "current_events", "twitter"]
    ),
    "grok3": ModelInfo(
        id="xai/grok-3",
        alias="grok3",
        provider="xai",
        context_window=128_000,
        cost_tier=CostTier.PREMIUM,
        supports_realtime=True,
        strengths=["realtime", "complex_reasoning", "current_events"]
    ),
}


# =============================================================================
# INTENT CLASSIFIER
# =============================================================================

class IntentClassifier:
    """Classifies user requests into intent categories."""
    
    # Keyword patterns for each intent
    PATTERNS: dict[Intent, list[str]] = {
        Intent.CODE: [
            r"\b(write|code|debug|fix|refactor|implement|function|class|script)\b",
            r"\b(api|bug|error|compile|test|pr|commit|merge|deploy)\b",
            r"\b(python|javascript|typescript|rust|go|java|cpp|ruby)\b",
            r"\.(py|js|ts|go|rs|java|cpp|rb|sh|yaml|json|toml)\b",
            r"```\w*\n",  # Code blocks
        ],
        Intent.ANALYSIS: [
            r"\b(analyze|explain|compare|research|understand|evaluate)\b",
            r"\b(assess|review|investigate|examine|study|interpret)\b",
            r"\b(why|how does|what causes|break down|dissect)\b",
            r"\bhelp me understand\b",
        ],
        Intent.CREATIVE: [
            r"\b(write|create|compose|draft|design|brainstorm|imagine)\b",
            r"\b(story|poem|essay|article|blog|novel|script|lyrics)\b",
            r"\b(creative|fiction|narrative|marketing|copy|slogan)\b",
        ],
        Intent.REALTIME: [
            r"\b(now|today|current|latest|trending|news|happening)\b",
            r"\b(live|real-?time|breaking|recent|this week)\b",
            r"\b(price|stock|crypto|bitcoin|btc|eth|gme|score)\b",
            r"\b(twitter|x\.com|tweet|elon|musk)\b",
            r"\b(weather|forecast|temperature)\b",
        ],
        Intent.GENERAL: [
            r"\b(what is|who is|where is|when did|translate)\b",
            r"\b(summarize|summary|brief|tldr|eli5)\b",
            r"\b(help|how to|can you|please)\b",
        ],
    }
    
    def __init__(self):
        # Compile patterns for efficiency
        self._compiled: dict[Intent, list[re.Pattern]] = {
            intent: [re.compile(p, re.IGNORECASE) for p in patterns]
            for intent, patterns in self.PATTERNS.items()
        }
    
    def classify(self, text: str) -> tuple[Intent, dict[Intent, int]]:
        """
        Classify the primary intent of the request.
        
        Returns:
            Tuple of (primary_intent, scores_dict)
        """
        scores: dict[Intent, int] = {intent: 0 for intent in Intent if intent != Intent.MIXED}
        
        for intent, patterns in self._compiled.items():
            for pattern in patterns:
                matches = pattern.findall(text)
                scores[intent] += len(matches)
        
        # Check for mixed intent (multiple high scores)
        high_scores = [(intent, score) for intent, score in scores.items() if score >= 2]
        
        if len(high_scores) > 1:
            # Multiple intents detected
            # Special case: REALTIME always wins if present
            if scores[Intent.REALTIME] >= 2:
                return Intent.REALTIME, scores
            return Intent.MIXED, scores
        
        # Return highest scoring intent, default to GENERAL
        primary = max(scores.items(), key=lambda x: x[1])
        if primary[1] == 0:
            return Intent.GENERAL, scores
        
        return primary[0], scores


# =============================================================================
# COMPLEXITY ESTIMATOR
# =============================================================================

class ComplexityEstimator:
    """Estimates request complexity for cost-tier routing."""
    
    # Keywords that suggest higher complexity
    COMPLEX_INDICATORS = [
        r"\b(step by step|thoroughly|in detail|comprehensive)\b",
        r"\b(critical|important|crucial|essential|must)\b",
        r"\b(research|deep dive|extensive|complete)\b",
        r"\b(all|every|entire|full)\b",
    ]
    
    SIMPLE_INDICATORS = [
        r"\b(quick|brief|short|simple|just|only)\b",
        r"\b(yes or no|one word|single|briefly)\b",
        r"^\s*\w+\s*\?\s*$",  # Single-word questions
    ]
    
    def __init__(self):
        self._complex_patterns = [re.compile(p, re.IGNORECASE) for p in self.COMPLEX_INDICATORS]
        self._simple_patterns = [re.compile(p, re.IGNORECASE) for p in self.SIMPLE_INDICATORS]
    
    def estimate(self, text: str, intent: Intent) -> Complexity:
        """
        Estimate complexity based on text and intent.
        
        Factors:
        - Word count
        - Complexity indicators
        - Intent type
        - Question structure
        """
        word_count = len(text.split())
        
        # Count indicator matches
        complex_score = sum(
            len(p.findall(text)) for p in self._complex_patterns
        )
        simple_score = sum(
            len(p.findall(text)) for p in self._simple_patterns
        )
        
        # Mixed intent defaults to COMPLEX
        if intent == Intent.MIXED:
            return Complexity.COMPLEX
        
        # Length-based baseline
        if word_count < 30:
            baseline = Complexity.SIMPLE
        elif word_count < 150:
            baseline = Complexity.MEDIUM
        else:
            baseline = Complexity.COMPLEX
        
        # Adjust based on indicators
        if simple_score > complex_score and baseline != Complexity.COMPLEX:
            return Complexity.SIMPLE
        elif complex_score > simple_score:
            return Complexity.COMPLEX
        
        return baseline


# =============================================================================
# INPUT SANITIZER
# =============================================================================

class InputSanitizer:
    """Sanitizes user input for security before routing."""
    
    MAX_INPUT_LENGTH = 500_000  # 500K chars
    
    # Patterns that BLOCK the request (credential leakage)
    BLOCK_PATTERNS = [
        (r"sk-ant-[a-zA-Z0-9\-]{10,}", "Anthropic API key"),
        (r"sk-[a-zA-Z0-9]{48,}", "OpenAI API key"),
        (r"xai-[a-zA-Z0-9]{20,}", "xAI API key"),
        (r"AIza[a-zA-Z0-9]{35}", "Google API key"),
        (r"AKIA[A-Z0-9]{16}", "AWS access key"),
        (r"-----BEGIN.*PRIVATE KEY-----", "Private key"),
    ]
    
    # Patterns that WARN but allow (PII)
    WARN_PATTERNS = [
        (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
        (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "Credit card"),
        (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "Email"),
    ]
    
    def __init__(self):
        self._block_compiled = [(re.compile(p), name) for p, name in self.BLOCK_PATTERNS]
        self._warn_compiled = [(re.compile(p), name) for p, name in self.WARN_PATTERNS]
    
    def sanitize(self, text: str) -> SanitizedInput:
        """
        Sanitize input before routing.
        
        Steps:
        1. Length validation
        2. Null byte removal
        3. Unicode normalization
        4. Control character stripping
        5. Sensitive data detection
        """
        result = SanitizedInput(
            text=text,
            original_length=len(text),
            warnings=[],
            blocked=False
        )
        
        # 1. Length validation
        if len(text) > self.MAX_INPUT_LENGTH:
            result.text = text[:self.MAX_INPUT_LENGTH]
            result.warnings.append(f"Input truncated from {len(text)} to {self.MAX_INPUT_LENGTH} chars")
        
        # 2. Null byte removal
        result.text = result.text.replace('\x00', '')
        
        # 3. Unicode normalization (prevents homograph attacks)
        result.text = unicodedata.normalize('NFKC', result.text)
        
        # 4. Control character stripping (keep newlines/tabs)
        result.text = ''.join(
            c for c in result.text
            if c in '\n\t\r' or not unicodedata.category(c).startswith('C')
        )
        
        # 5a. Check for blocked patterns (credentials)
        for pattern, name in self._block_compiled:
            if pattern.search(result.text):
                result.blocked = True
                result.block_reason = f"Input contains {name} - request blocked for security"
                logger.warning(f"BLOCKED: {name} detected in input")
                return result
        
        # 5b. Check for warning patterns (PII)
        for pattern, name in self._warn_compiled:
            if pattern.search(result.text):
                result.warnings.append(f"Potential {name} detected")
                logger.info(f"WARNING: Potential {name} in input")
        
        return result


# =============================================================================
# CIRCUIT BREAKER
# =============================================================================

class CircuitBreaker:
    """
    Circuit breaker for model availability.
    
    Prevents repeated calls to failing models.
    States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing)
    """
    
    def __init__(
        self,
        failure_threshold: int = 3,
        reset_timeout_ms: int = 300_000,  # 5 minutes
        half_open_max_calls: int = 1
    ):
        self.failure_threshold = failure_threshold
        self.reset_timeout_ms = reset_timeout_ms
        self.half_open_max_calls = half_open_max_calls
        
        # State per model
        self._states: dict[str, CircuitState] = {}
        self._failures: dict[str, int] = {}
        self._last_failure: dict[str, float] = {}
        self._half_open_calls: dict[str, int] = {}
    
    def can_call(self, model: str) -> bool:
        """Check if model can be called."""
        state = self._states.get(model, CircuitState.CLOSED)
        
        if state == CircuitState.CLOSED:
            return True
        
        if state == CircuitState.OPEN:
            # Check if timeout elapsed
            last = self._last_failure.get(model, 0)
            if (time.time() * 1000 - last) > self.reset_timeout_ms:
                # Transition to HALF_OPEN
                self._states[model] = CircuitState.HALF_OPEN
                self._half_open_calls[model] = 0
                logger.info(f"Circuit HALF_OPEN for {model}")
                return True
            return False
        
        if state == CircuitState.HALF_OPEN:
            # Allow limited calls
            calls = self._half_open_calls.get(model, 0)
            return calls < self.half_open_max_calls
        
        return False
    
    def record_success(self, model: str) -> None:
        """Record successful call - reset circuit."""
        self._states[model] = CircuitState.CLOSED
        self._failures[model] = 0
        logger.debug(f"Circuit CLOSED for {model} (success)")
    
    def record_failure(self, model: str) -> None:
        """Record failed call - potentially open circuit."""
        self._failures[model] = self._failures.get(model, 0) + 1
        self._last_failure[model] = time.time() * 1000
        
        state = self._states.get(model, CircuitState.CLOSED)
        
        if state == CircuitState.HALF_OPEN:
            # Failure in half-open -> back to OPEN
            self._states[model] = CircuitState.OPEN
            logger.warning(f"Circuit OPEN for {model} (half-open failure)")
        elif self._failures[model] >= self.failure_threshold:
            # Threshold reached -> OPEN
            self._states[model] = CircuitState.OPEN
            logger.warning(f"Circuit OPEN for {model} (threshold reached)")
    
    def get_state(self, model: str) -> CircuitState:
        """Get current circuit state for model."""
        return self._states.get(model, CircuitState.CLOSED)
    
    def get_all_states(self) -> dict[str, str]:
        """Get all circuit states for status display."""
        return {model: state.name for model, state in self._states.items()}


# =============================================================================
# MODEL ROUTER (MAIN ORCHESTRATOR)
# =============================================================================

class SmartRouter:
    """
    Main routing orchestrator.
    
    Coordinates intent classification, complexity estimation, model selection,
    and fallback handling with circuit breaker protection.
    """
    
    # Routing matrix: (Intent, Complexity) -> preferred model aliases
    ROUTING_MATRIX: dict[tuple[Intent, Complexity], list[str]] = {
        # CODE tasks
        (Intent.CODE, Complexity.SIMPLE): ["sonnet", "gpt5", "haiku"],
        (Intent.CODE, Complexity.MEDIUM): ["opus", "sonnet", "gpt5"],
        (Intent.CODE, Complexity.COMPLEX): ["opus", "sonnet", "gpt5"],
        
        # ANALYSIS tasks
        (Intent.ANALYSIS, Complexity.SIMPLE): ["flash", "haiku", "gpt5"],
        (Intent.ANALYSIS, Complexity.MEDIUM): ["gpt5", "sonnet", "opus"],
        (Intent.ANALYSIS, Complexity.COMPLEX): ["opus", "gpt5", "gemini-pro"],
        
        # CREATIVE tasks
        (Intent.CREATIVE, Complexity.SIMPLE): ["sonnet", "gpt5", "haiku"],
        (Intent.CREATIVE, Complexity.MEDIUM): ["opus", "sonnet", "gpt5"],
        (Intent.CREATIVE, Complexity.COMPLEX): ["opus", "gpt5", "sonnet"],
        
        # REALTIME tasks (Grok preferred)
        (Intent.REALTIME, Complexity.SIMPLE): ["grok2", "grok3"],
        (Intent.REALTIME, Complexity.MEDIUM): ["grok2", "grok3"],
        (Intent.REALTIME, Complexity.COMPLEX): ["grok3", "grok2"],
        
        # GENERAL tasks
        (Intent.GENERAL, Complexity.SIMPLE): ["flash", "haiku", "gpt5"],
        (Intent.GENERAL, Complexity.MEDIUM): ["sonnet", "gpt5", "flash"],
        (Intent.GENERAL, Complexity.COMPLEX): ["opus", "gpt5", "sonnet"],
        
        # MIXED defaults to COMPLEX handling
        (Intent.MIXED, Complexity.SIMPLE): ["sonnet", "gpt5", "opus"],
        (Intent.MIXED, Complexity.MEDIUM): ["opus", "sonnet", "gpt5"],
        (Intent.MIXED, Complexity.COMPLEX): ["opus", "gpt5", "sonnet"],
    }
    
    # Cost tier allowances by complexity
    COST_TIERS_ALLOWED: dict[Complexity, list[CostTier]] = {
        Complexity.SIMPLE: [CostTier.BUDGET],
        Complexity.MEDIUM: [CostTier.BUDGET, CostTier.STANDARD],
        Complexity.COMPLEX: [CostTier.BUDGET, CostTier.STANDARD, CostTier.PREMIUM, CostTier.ULTRA],
    }
    
    # Fallback chains by task type
    FALLBACK_CHAINS: dict[str, list[str]] = {
        "code": ["opus", "sonnet", "gpt5", "gemini-pro"],
        "analysis": ["opus", "gpt5", "gemini-pro", "sonnet"],
        "creative": ["opus", "gpt5", "sonnet", "gemini-pro"],
        "realtime": ["grok2", "grok3"],  # Limited fallback
        "general": ["flash", "haiku", "sonnet", "gpt5"],
        "long_context": ["gemini-pro", "flash"],
    }
    
    def __init__(
        self,
        models: Optional[dict[str, ModelInfo]] = None,
        available_providers: Optional[list[str]] = None,
        model_caller: Optional[Callable] = None,
        config_path: Optional[str] = None
    ):
        """
        Initialize the router.
        
        Args:
            models: Model registry (defaults to DEFAULT_MODELS)
            available_providers: List of configured provider names
            model_caller: Async function to call models (for actual routing)
            config_path: Path to JSON config file
        """
        self.models = models or DEFAULT_MODELS.copy()
        self.available_providers = available_providers or ["anthropic", "openai", "google", "xai"]
        self.model_caller = model_caller
        
        # Initialize components
        self.intent_classifier = IntentClassifier()
        self.complexity_estimator = ComplexityEstimator()
        self.sanitizer = InputSanitizer()
        self.circuit_breaker = CircuitBreaker()
        
        # Load config if provided
        if config_path and Path(config_path).exists():
            self._load_config(config_path)
        
        # Filter models by available providers
        self._available_models = {
            alias: info for alias, info in self.models.items()
            if info.provider in self.available_providers
        }
        
        logger.info(f"SmartRouter initialized with {len(self._available_models)} models")
    
    def _load_config(self, config_path: str) -> None:
        """Load configuration from JSON file."""
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        if "available_providers" in config:
            self.available_providers = config["available_providers"]
        
        if "circuit_breaker" in config:
            cb = config["circuit_breaker"]
            self.circuit_breaker = CircuitBreaker(
                failure_threshold=cb.get("threshold", 3),
                reset_timeout_ms=cb.get("reset_timeout_ms", 300_000)
            )
    
    def classify(self, text: str, context_tokens: int = 0) -> RoutingDecision:
        """
        Classify a request and determine routing.
        
        This is the main entry point for routing decisions.
        
        Args:
            text: User request text
            context_tokens: Estimated context size in tokens
            
        Returns:
            RoutingDecision with selected model and metadata
        """
        # Check for [show routing] flag
        show_routing = "[show routing]" in text.lower()
        clean_text = re.sub(r"\[show routing\]", "", text, flags=re.IGNORECASE).strip()
        
        # PHASE H: Pre-flight token audit
        audit = pre_flight_token_audit(clean_text, context_tokens, "opus")  # Default target
        
        if audit["force_gemini"]:
            logger.warning(f"Phase H: Context {audit['total_tokens']:,} > {PHASE_H_FORCE_THRESHOLD:,} - forcing Gemini Pro")
            return RoutingDecision(
                intent=Intent.ANALYSIS,
                complexity=Complexity.COMPLEX,
                selected_model=PHASE_H_MODEL,
                fallback_chain=["flash"],
                reason=f"Phase H: Context overflow prevention ({audit['total_tokens']:,} tokens)",
                special_case="phase_h_overflow_prevention",
                context_tokens=audit["total_tokens"],
                show_routing=show_routing
            )
        
        if audit["needs_compaction"]:
            logger.info(f"Phase H: {audit['utilization']:.1%} utilization - JIT compaction recommended (target: {audit['compaction_target']:,})")
        
        # Check for user model override
        override = self._check_user_override(clean_text)
        if override:
            return RoutingDecision(
                intent=Intent.GENERAL,
                complexity=Complexity.MEDIUM,
                selected_model=override,
                fallback_chain=[],
                reason=f"User override: {override}",
                special_case="user_override",
                show_routing=show_routing
            )
        
        # Classify intent
        intent, intent_scores = self.intent_classifier.classify(clean_text)
        
        # Estimate complexity
        complexity = self.complexity_estimator.estimate(clean_text, intent)
        
        # Check special cases
        special_case = None
        
        # Special case: Long context
        if context_tokens > 200_000:
            special_case = "long_context_extreme"
            return self._route_long_context(
                context_tokens, intent, complexity, show_routing
            )
        elif context_tokens > 128_000:
            special_case = "long_context"
            # Prefer models with larger context windows
            intent = Intent.ANALYSIS  # Treat as analysis for routing
        
        # Special case: Realtime always gets Grok (bypass cost filtering)
        if intent == Intent.REALTIME:
            special_case = "realtime_required"
            grok_models = ["grok2", "grok3"] if complexity != Complexity.COMPLEX else ["grok3", "grok2"]
            for grok in grok_models:
                if grok in self._available_models and self.circuit_breaker.can_call(grok):
                    return RoutingDecision(
                        intent=intent,
                        complexity=complexity,
                        selected_model=grok,
                        fallback_chain=[m for m in ["grok2", "grok3"] if m != grok and m in self._available_models],
                        reason=f"REALTIME intent requires Grok (bypasses cost tier)",
                        special_case="realtime_required",
                        context_tokens=context_tokens,
                        show_routing=show_routing
                    )
            # No Grok available - warn and fall through
            logger.warning("REALTIME intent but no Grok available - using fallback")
        
        # Get allowed cost tiers
        allowed_tiers = self.COST_TIERS_ALLOWED[complexity]
        
        # Filter models by cost tier
        cost_filtered = {
            alias: info for alias, info in self._available_models.items()
            if info.cost_tier in allowed_tiers
        }
        
        # If COMPLEX, allow all tiers (don't filter)
        if complexity == Complexity.COMPLEX:
            cost_filtered = self._available_models
        
        # Get preferred models from routing matrix
        preferences = self.ROUTING_MATRIX.get(
            (intent, complexity),
            ["sonnet", "gpt5", "flash"]  # Default fallback
        )
        
        # Select first available model that passes filters
        selected_model = None
        for alias in preferences:
            if alias in cost_filtered and self.circuit_breaker.can_call(alias):
                selected_model = alias
                break
        
        # If no preferred model available, use cheapest available
        if not selected_model:
            available = [
                (alias, info) for alias, info in cost_filtered.items()
                if self.circuit_breaker.can_call(alias)
            ]
            if available:
                # Sort by cost tier (budget first)
                tier_order = {CostTier.BUDGET: 0, CostTier.STANDARD: 1, 
                             CostTier.PREMIUM: 2, CostTier.ULTRA: 3}
                available.sort(key=lambda x: tier_order.get(x[1].cost_tier, 99))
                selected_model = available[0][0]
        
        # Build fallback chain
        task_type = self._intent_to_task_type(intent)
        fallback_chain = [
            m for m in self.FALLBACK_CHAINS.get(task_type, [])
            if m in self._available_models 
            and m != selected_model
            and self.circuit_breaker.can_call(m)
        ]
        
        # Build reason string
        reason = f"{intent.name} intent, {complexity.name} complexity"
        if special_case:
            reason += f" [{special_case}]"
        
        return RoutingDecision(
            intent=intent,
            complexity=complexity,
            selected_model=selected_model or "opus",  # Ultimate fallback
            fallback_chain=fallback_chain,
            reason=reason,
            special_case=special_case,
            cost_tier_allowed=allowed_tiers,
            context_tokens=context_tokens,
            show_routing=show_routing
        )
    
    def _route_long_context(
        self,
        context_tokens: int,
        intent: Intent,
        complexity: Complexity,
        show_routing: bool
    ) -> RoutingDecision:
        """Handle long context routing (>128K tokens)."""
        
        # Only Gemini can handle >200K
        if context_tokens > 200_000:
            if "gemini-pro" in self._available_models:
                selected = "gemini-pro"
            elif "flash" in self._available_models:
                selected = "flash"
            else:
                # No suitable model
                return RoutingDecision(
                    intent=intent,
                    complexity=complexity,
                    selected_model="ERROR",
                    fallback_chain=[],
                    reason=f"Context {context_tokens} tokens exceeds all available models",
                    special_case="context_overflow",
                    context_tokens=context_tokens,
                    show_routing=show_routing
                )
            
            return RoutingDecision(
                intent=intent,
                complexity=complexity,
                selected_model=selected,
                fallback_chain=["flash"] if selected == "gemini-pro" else [],
                reason=f"Long context ({context_tokens} tokens) requires Gemini",
                special_case="long_context_extreme",
                context_tokens=context_tokens,
                show_routing=show_routing
            )
        
        # 128K-200K: prefer Gemini but Claude works
        fallback = self.FALLBACK_CHAINS["long_context"]
        for model in fallback:
            if model in self._available_models:
                return RoutingDecision(
                    intent=intent,
                    complexity=complexity,
                    selected_model=model,
                    fallback_chain=[m for m in fallback if m != model],
                    reason=f"Long context ({context_tokens} tokens)",
                    special_case="long_context",
                    context_tokens=context_tokens,
                    show_routing=show_routing
                )
        
        # Fallback to Opus (200K limit)
        return RoutingDecision(
            intent=intent,
            complexity=complexity,
            selected_model="opus",
            fallback_chain=["sonnet"],
            reason=f"Long context ({context_tokens} tokens), using Opus 200K",
            special_case="long_context",
            context_tokens=context_tokens,
            show_routing=show_routing
        )
    
    def _check_user_override(self, text: str) -> Optional[str]:
        """Check for explicit user model override."""
        overrides = {
            r"^use grok:": "grok2",
            r"^use claude:": "opus",
            r"^use opus:": "opus",
            r"^use sonnet:": "sonnet",
            r"^use gemini:": "gemini-pro",
            r"^use flash:": "flash",
            r"^use gpt:": "gpt5",
            r"^use haiku:": "haiku",
        }
        
        for pattern, model in overrides.items():
            if re.match(pattern, text.lower()):
                if model in self._available_models:
                    return model
        
        return None
    
    def _intent_to_task_type(self, intent: Intent) -> str:
        """Map intent to fallback chain task type."""
        mapping = {
            Intent.CODE: "code",
            Intent.ANALYSIS: "analysis",
            Intent.CREATIVE: "creative",
            Intent.REALTIME: "realtime",
            Intent.GENERAL: "general",
            Intent.MIXED: "analysis",
        }
        return mapping.get(intent, "general")
    
    async def route_request(
        self,
        text: str,
        context_tokens: int = 0
    ) -> RouterResponse:
        """
        Route a request to the optimal model and execute it.
        
        This is the full routing + execution pipeline.
        
        Args:
            text: User request
            context_tokens: Estimated context size
            
        Returns:
            RouterResponse with content and metadata
        """
        start_time = time.time()
        
        # Sanitize input
        sanitized = self.sanitizer.sanitize(text)
        if sanitized.blocked:
            return RouterResponse(
                content=f"❌ Request blocked: {sanitized.block_reason}",
                model_used="none",
                routing_decision=RoutingDecision(
                    intent=Intent.GENERAL,
                    complexity=Complexity.SIMPLE,
                    selected_model="blocked",
                    fallback_chain=[],
                    reason=sanitized.block_reason or "Security block"
                )
            )
        
        # Classify and route
        decision = self.classify(sanitized.text, context_tokens)
        
        # Check for context overflow
        if decision.selected_model == "ERROR":
            return RouterResponse(
                content=self._build_context_error(decision.context_tokens),
                model_used="none",
                routing_decision=decision
            )
        
        # If no model caller provided, return decision only (dry run)
        if not self.model_caller:
            routing_info = self._format_routing_info(decision) if decision.show_routing else ""
            return RouterResponse(
                content=f"{routing_info}[DRY RUN - No model caller configured]",
                model_used=decision.selected_model,
                routing_decision=decision,
                latency_ms=(time.time() - start_time) * 1000
            )
        
        # Execute with fallback
        response = await self._execute_with_fallback(
            sanitized.text,
            decision
        )
        
        response.latency_ms = (time.time() - start_time) * 1000
        
        # Prepend routing info if requested
        if decision.show_routing:
            routing_info = self._format_routing_info(decision)
            if response.switched:
                routing_info += f"\n⚠️ Switched to {response.model_used} ({response.switch_reason})"
            response.content = f"{routing_info}\n\n---\n\n{response.content}"
        
        return response
    
    async def _execute_with_fallback(
        self,
        text: str,
        decision: RoutingDecision
    ) -> RouterResponse:
        """Execute request with fallback chain."""
        models_to_try = [decision.selected_model] + decision.fallback_chain
        attempted = []
        last_error = None
        
        for model_alias in models_to_try:
            if not self.circuit_breaker.can_call(model_alias):
                continue
            
            model_info = self._available_models.get(model_alias)
            if not model_info:
                continue
            
            try:
                # Call the model
                content = await self.model_caller(model_info.id, text)
                
                # Success - record and return
                self.circuit_breaker.record_success(model_alias)
                
                switched = len(attempted) > 0
                return RouterResponse(
                    content=content,
                    model_used=model_alias,
                    routing_decision=decision,
                    switched=switched,
                    switch_reason=last_error if switched else None
                )
                
            except Exception as e:
                # Record failure
                attempted.append(model_alias)
                last_error = str(e)
                self.circuit_breaker.record_failure(model_alias)
                logger.warning(f"Model {model_alias} failed: {e}")
                continue
        
        # All models exhausted
        return RouterResponse(
            content=self._build_exhaustion_error(attempted),
            model_used="none",
            routing_decision=decision,
            switched=True,
            switch_reason="all_models_exhausted"
        )
    
    def _format_routing_info(self, decision: RoutingDecision) -> str:
        """Format routing decision for display."""
        model_info = self._available_models.get(decision.selected_model)
        model_id = model_info.id if model_info else decision.selected_model
        
        return (
            f"```\n"
            f"[ROUTING DECISION]\n"
            f"─────────────────────────────────────\n"
            f"Intent:      {decision.intent.name}\n"
            f"Complexity:  {decision.complexity.name}\n"
            f"Model:       {model_id}\n"
            f"Reason:      {decision.reason}\n"
            f"Fallbacks:   {', '.join(decision.fallback_chain) or 'none'}\n"
            f"Context:     {decision.context_tokens:,} tokens\n"
            f"─────────────────────────────────────\n"
            f"```"
        )
    
    def _build_context_error(self, token_count: int) -> str:
        """Build error message for context overflow."""
        return (
            f"⚠️ **Context Window Exceeded**\n\n"
            f"Your input is approximately **{token_count:,} tokens**, which exceeds "
            f"the context window of all currently available models.\n\n"
            f"**Options:**\n"
            f"1. **Reduce input size** — Remove unnecessary content\n"
            f"2. **Split into chunks** — I can process sequentially\n"
            f"3. **Enable Gemini** — 1M token context available\n\n"
            f"Would you like me to help split this into manageable chunks?"
        )
    
    def _build_exhaustion_error(self, attempted: list[str]) -> str:
        """Build error message when all models exhausted."""
        return (
            f"❌ **Request Failed**\n\n"
            f"Unable to complete your request. All available models have been exhausted.\n\n"
            f"**Models attempted:** {', '.join(attempted)}\n\n"
            f"**What you can do:**\n"
            f"1. **Wait** — Token quotas typically reset hourly or daily\n"
            f"2. **Simplify** — Try a shorter or simpler request\n"
            f"3. **Check status** — Run `/router status` to see model availability"
        )
    
    def get_status(self) -> dict[str, Any]:
        """Get router status for display."""
        return {
            "available_models": list(self._available_models.keys()),
            "available_providers": self.available_providers,
            "circuit_breaker_states": self.circuit_breaker.get_all_states(),
            "routing_matrix_size": len(self.ROUTING_MATRIX),
        }


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for testing the router."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Smart Router Gateway")
    parser.add_argument("--classify", type=str, help="Classify a request")
    parser.add_argument("--context-tokens", type=int, default=0, help="Context size")
    parser.add_argument("--status", action="store_true", help="Show router status")
    parser.add_argument("--providers", nargs="+", help="Available providers")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    # Initialize router
    router = SmartRouter(
        available_providers=args.providers or ["anthropic", "openai", "google", "xai"]
    )
    
    if args.status:
        status = router.get_status()
        if args.json:
            print(json.dumps(status, indent=2))
        else:
            print("Smart Router Status")
            print("=" * 50)
            print(f"Available models: {', '.join(status['available_models'])}")
            print(f"Providers: {', '.join(status['available_providers'])}")
            if status['circuit_breaker_states']:
                print(f"Circuit breakers: {status['circuit_breaker_states']}")
        return
    
    if args.classify:
        decision = router.classify(args.classify, args.context_tokens)
        
        if args.json:
            print(json.dumps({
                "intent": decision.intent.name,
                "complexity": decision.complexity.name,
                "selected_model": decision.selected_model,
                "fallback_chain": decision.fallback_chain,
                "reason": decision.reason,
                "special_case": decision.special_case,
                "context_tokens": decision.context_tokens,
            }, indent=2))
        else:
            print(router._format_routing_info(decision))
        return
    
    # Interactive mode
    print("Smart Router - Interactive Mode")
    print("Type a message to see routing decision, 'status' for status, 'quit' to exit")
    print("-" * 50)
    
    while True:
        try:
            text = input("\n> ").strip()
            if not text:
                continue
            if text.lower() == "quit":
                break
            if text.lower() == "status":
                status = router.get_status()
                print(f"Models: {', '.join(status['available_models'])}")
                continue
            
            decision = router.classify(text)
            print(router._format_routing_info(decision))
            
        except KeyboardInterrupt:
            break
        except EOFError:
            break
    
    print("\nGoodbye!")


if __name__ == "__main__":
    main()
