#!/usr/bin/env python3
"""
agent-integration.py - LangCache integration pattern for OpenClaw agents

This example demonstrates how to integrate Redis LangCache semantic caching
into an OpenClaw agent workflow with the default caching policy enforced.

Requirements:
    pip install langcache httpx

Environment variables:
    LANGCACHE_HOST     - LangCache API host
    LANGCACHE_CACHE_ID - Cache ID
    LANGCACHE_API_KEY  - API key
    OPENAI_API_KEY     - OpenAI API key (or your LLM provider)
"""

import os
import re
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

# LangCache SDK
from langcache import LangCache
from langcache.models import SearchStrategy

# Your LLM client (example uses OpenAI)
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BlockReason(Enum):
    """Reasons why content was blocked from caching."""
    TEMPORAL = "temporal_info"
    CREDENTIALS = "credentials"
    IDENTIFIERS = "identifiers"
    PERSONAL = "personal_context"


# =============================================================================
# HARD BLOCK PATTERNS - These NEVER get cached
# =============================================================================

BLOCK_PATTERNS = {
    BlockReason.TEMPORAL: [
        r"\b(today|tomorrow|tonight|yesterday)\b",
        r"\b(this|next|last)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\bin\s+\d+\s+(minutes?|hours?|days?|weeks?)\b",
        r"\b(deadline|eta|appointment|scheduled?|meeting\s+at)\b",
        r"\b(right\s+now|at\s+\d{1,2}(:\d{2})?\s*(am|pm)?)\b",
        r"\b(this\s+morning|this\s+afternoon|this\s+evening)\b",
    ],
    BlockReason.CREDENTIALS: [
        r"\b(api[_-]?key|api[_-]?secret|access[_-]?token)\b",
        r"\b(password|passwd|pwd)\s*[:=]",
        r"\b(secret[_-]?key|private[_-]?key)\b",
        r"\b(otp|2fa|totp|authenticator)\s*(code|token)?\b",
        r"\bbearer\s+[a-zA-Z0-9_-]+",
        r"\b(sk|pk)[_-][a-zA-Z0-9]{20,}\b",  # API key patterns like sk-xxx
    ],
    BlockReason.IDENTIFIERS: [
        r"\b\d{10,15}\b",  # Phone numbers, long numeric IDs
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Emails
        r"\b(order|account|message|chat|user|customer)[_-]?id\s*[:=]?\s*\w+",
        r"\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b",  # UUIDs
        r"\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd)\b",  # Addresses
        r"\b\d{5}(-\d{4})?\b",  # ZIP codes
        r"@[a-zA-Z0-9_]{1,15}\b",  # Social handles / JIDs
    ],
    BlockReason.PERSONAL: [
        r"\bmy\s+(wife|husband|partner|girlfriend|boyfriend|spouse)\b",
        r"\bmy\s+(mom|dad|mother|father|brother|sister|son|daughter|child|kid)\b",
        r"\bmy\s+(friend|colleague|coworker|boss|manager)\s+\w+",  # "my friend John"
        r"\b(said\s+to\s+me|told\s+me|asked\s+me|between\s+us)\b",
        r"\b(private|confidential|secret)\s+(conversation|chat|message)\b",
        r"\bin\s+(our|my)\s+(chat|conversation|thread|group)\b",
        r"\b(he|she|they)\s+(said|told|asked|mentioned)\b",  # Referencing specific people
    ],
}


@dataclass
class CacheConfig:
    """Configuration for semantic caching behavior."""
    enabled: bool = True
    model_id: str = "gpt-5"
    cache_ttl_seconds: int = 86400  # 24 hours

    # Thresholds by category
    thresholds: dict = field(default_factory=lambda: {
        "factual": 0.90,
        "template": 0.88,
        "style": 0.85,
        "command": 0.92,
        "default": 0.90,
    })


@dataclass
class CacheResult:
    """Result from cache lookup."""
    hit: bool
    response: Optional[str] = None
    similarity: Optional[float] = None
    entry_id: Optional[str] = None


@dataclass
class BlockCheckResult:
    """Result from block pattern check."""
    blocked: bool
    reason: Optional[BlockReason] = None
    matched_pattern: Optional[str] = None


class CachedAgent:
    """
    An agent wrapper that adds semantic caching to LLM calls.
    Enforces the default caching policy with hard blocks.

    Usage:
        agent = CachedAgent(config=CacheConfig())
        response = await agent.complete("What is Redis?")
    """

    def __init__(self, config: Optional[CacheConfig] = None):
        self.config = config or CacheConfig()

        # Initialize LangCache client
        self.cache = LangCache(
            server_url=f"https://{os.environ['LANGCACHE_HOST']}",
            cache_id=os.environ["LANGCACHE_CACHE_ID"],
            api_key=os.environ["LANGCACHE_API_KEY"],
        )

        # Initialize LLM client (example: OpenAI-compatible API)
        self.llm_client = httpx.AsyncClient(
            base_url="https://api.openai.com/v1",
            headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
            timeout=60.0,
        )

        # Metrics
        self.cache_hits = 0
        self.cache_misses = 0
        self.blocked_requests = {reason: 0 for reason in BlockReason}

    def _check_hard_blocks(self, text: str) -> BlockCheckResult:
        """
        Check if text contains any hard-blocked patterns.
        Returns BlockCheckResult with reason if blocked.
        """
        text_lower = text.lower()

        for reason, patterns in BLOCK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    return BlockCheckResult(
                        blocked=True,
                        reason=reason,
                        matched_pattern=pattern,
                    )

        return BlockCheckResult(blocked=False)

    def _normalize_prompt(self, prompt: str) -> str:
        """Normalize prompt for better cache hit rates."""
        normalized = prompt.strip().lower()
        normalized = re.sub(r'\s+', ' ', normalized)

        # Remove common filler phrases
        fillers = [
            r'^(please |can you |could you |would you |hey |hi |hello )',
            r'^(i want to |i need to |i\'d like to )',
            r'( please| thanks| thank you)$',
        ]
        for pattern in fillers:
            normalized = re.sub(pattern, '', normalized)

        return normalized.strip()

    def _detect_category(self, prompt: str) -> str:
        """Detect the category of a prompt for threshold selection."""
        prompt_lower = prompt.lower()

        # Template patterns
        if re.search(r"(polite|professional|formal|warmer|shorter|firmer|rewrite|rephrase)", prompt_lower):
            return "style"

        if re.search(r"(template|draft|write a|compose a|reply to)", prompt_lower):
            return "template"

        # Command patterns
        if re.search(r"(what does|how do i|explain|command|flag|option|syntax)", prompt_lower):
            return "command"

        # Default to factual
        return "factual"

    def _is_cacheable(self, prompt: str, response: str = "") -> tuple[bool, Optional[str]]:
        """
        Check if prompt/response pair should be cached.
        Returns (is_cacheable, block_reason).
        """
        if not self.config.enabled:
            return False, "caching_disabled"

        # Check prompt for hard blocks
        prompt_check = self._check_hard_blocks(prompt)
        if prompt_check.blocked:
            self.blocked_requests[prompt_check.reason] += 1
            logger.info(
                f"BLOCKED ({prompt_check.reason.value}): {prompt[:50]}... "
                f"[pattern: {prompt_check.matched_pattern}]"
            )
            return False, prompt_check.reason.value

        # Check response for hard blocks (don't cache responses with sensitive data)
        if response:
            response_check = self._check_hard_blocks(response)
            if response_check.blocked:
                self.blocked_requests[response_check.reason] += 1
                logger.info(
                    f"BLOCKED response ({response_check.reason.value}): "
                    f"[pattern: {response_check.matched_pattern}]"
                )
                return False, response_check.reason.value

        return True, None

    async def _search_cache(self, prompt: str, category: str) -> CacheResult:
        """Search for cached response with category-specific threshold."""
        try:
            threshold = self.config.thresholds.get(
                category,
                self.config.thresholds["default"]
            )

            result = await asyncio.to_thread(
                self.cache.search,
                prompt=prompt,
                similarity_threshold=threshold,
                search_strategies=[SearchStrategy.EXACT, SearchStrategy.SEMANTIC],
                attributes={"model": self.config.model_id},
            )

            if result.hit:
                # Verify cached response doesn't contain blocked content
                response_check = self._check_hard_blocks(result.response)
                if response_check.blocked:
                    logger.warning(
                        f"Cached response contains blocked content, skipping: "
                        f"{response_check.reason.value}"
                    )
                    return CacheResult(hit=False)

                return CacheResult(
                    hit=True,
                    response=result.response,
                    similarity=result.similarity,
                    entry_id=result.entry_id,
                )
        except Exception as e:
            logger.warning(f"Cache search failed: {e}")

        return CacheResult(hit=False)

    async def _store_in_cache(
        self,
        prompt: str,
        response: str,
        category: str
    ) -> None:
        """Store response in cache (fire-and-forget) if allowed."""
        # Final safety check before storing
        cacheable, reason = self._is_cacheable(prompt, response)
        if not cacheable:
            logger.debug(f"Not storing in cache: {reason}")
            return

        try:
            await asyncio.to_thread(
                self.cache.set,
                prompt=prompt,
                response=response,
                attributes={
                    "model": self.config.model_id,
                    "category": category,
                },
            )
            logger.debug(f"Cached [{category}]: {prompt[:50]}...")
        except Exception as e:
            logger.warning(f"Cache store failed: {e}")

    async def _call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Call the LLM API."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.llm_client.post(
            "/chat/completions",
            json={
                "model": self.config.model_id,
                "messages": messages,
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        force_refresh: bool = False,
    ) -> str:
        """
        Complete a prompt with semantic caching.
        Enforces caching policy with hard blocks.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt (not included in cache key)
            force_refresh: Skip cache and call LLM directly

        Returns:
            The LLM response (from cache or fresh)
        """
        normalized_prompt = self._normalize_prompt(prompt)
        category = self._detect_category(prompt)

        # Check if cacheable (hard blocks)
        cacheable, block_reason = self._is_cacheable(prompt)

        if not force_refresh and cacheable:
            cache_result = await self._search_cache(normalized_prompt, category)

            if cache_result.hit:
                self.cache_hits += 1
                logger.info(
                    f"Cache HIT [{category}] (similarity={cache_result.similarity:.3f}): "
                    f"{prompt[:50]}..."
                )
                return cache_result.response

        # Cache miss, blocked, or force refresh - call LLM
        self.cache_misses += 1
        if block_reason:
            logger.info(f"Cache SKIP (blocked: {block_reason}): {prompt[:50]}...")
        else:
            logger.info(f"Cache MISS [{category}]: {prompt[:50]}...")

        response = await self._call_llm(prompt, system_prompt)

        # Store in cache if allowed (async, don't block response)
        if cacheable:
            asyncio.create_task(
                self._store_in_cache(normalized_prompt, response, category)
            )

        return response

    def get_stats(self) -> dict:
        """Get cache statistics including block reasons."""
        total = self.cache_hits + self.cache_misses
        hit_rate = self.cache_hits / total if total > 0 else 0
        return {
            "hits": self.cache_hits,
            "misses": self.cache_misses,
            "total": total,
            "hit_rate": f"{hit_rate:.1%}",
            "blocked": {
                reason.value: count
                for reason, count in self.blocked_requests.items()
            },
        }


# =============================================================================
# Example usage
# =============================================================================

async def main():
    """Demonstrate cached agent with policy enforcement."""

    agent = CachedAgent(config=CacheConfig(enabled=True, model_id="gpt-5"))

    test_queries = [
        # CACHEABLE - Factual Q&A
        ("What is Redis?", "Should cache"),
        ("Explain semantic caching", "Should cache"),

        # CACHEABLE - Style transforms
        ("Make this message warmer: Thanks for your email", "Should cache"),
        ("Rewrite this to be more professional", "Should cache"),

        # CACHEABLE - Templates
        ("Write a polite decline email", "Should cache"),

        # BLOCKED - Temporal
        ("What's on my calendar today?", "BLOCKED: temporal"),
        ("Remind me in 20 minutes", "BLOCKED: temporal"),
        ("What's the deadline for this week?", "BLOCKED: temporal"),

        # BLOCKED - Credentials
        ("Store my API key sk-abc123xyz", "BLOCKED: credentials"),
        ("My password is hunter2", "BLOCKED: credentials"),

        # BLOCKED - Identifiers
        ("Send email to john@example.com", "BLOCKED: identifiers"),
        ("Call me at 5551234567", "BLOCKED: identifiers"),
        ("Order ID: 12345678", "BLOCKED: identifiers"),

        # BLOCKED - Personal context
        ("My wife said we should...", "BLOCKED: personal"),
        ("In our private chat, he mentioned...", "BLOCKED: personal"),
    ]

    print("=" * 60)
    print("LangCache Policy Enforcement Demo")
    print("=" * 60)

    for query, expected in test_queries:
        print(f"\nQuery: {query}")
        print(f"Expected: {expected}")
        try:
            response = await agent.complete(query)
            print(f"Response: {response[:80]}...")
        except Exception as e:
            print(f"Error: {e}")

    print("\n" + "=" * 60)
    print("Cache Statistics:")
    print("=" * 60)
    stats = agent.get_stats()
    print(f"Hits: {stats['hits']}")
    print(f"Misses: {stats['misses']}")
    print(f"Hit Rate: {stats['hit_rate']}")
    print(f"Blocked by reason:")
    for reason, count in stats['blocked'].items():
        print(f"  - {reason}: {count}")


if __name__ == "__main__":
    asyncio.run(main())
