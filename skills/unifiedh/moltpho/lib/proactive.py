"""
Proactive purchasing rubric for the Moltpho OpenClaw skill.

Implements SPEC.md Section 11: Autonomous + proactive purchasing policy.
Detects need signals in conversation and makes purchase decisions based on
confidence scoring, budget signals, and policy constraints.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import TypedDict


# =============================================================================
# Constants (from SPEC.md Section 11)
# =============================================================================

# Confidence scoring thresholds
CONFIDENCE_EXPLICIT = 1.0       # "buy me X", "order X", "I need X"
CONFIDENCE_STRONG_IMPLIED = 0.8  # "we're out of X", "X broke"
CONFIDENCE_WEAK_IMPLIED = 0.5    # "it would be nice to have X"
CONFIDENCE_UNKNOWN = 0.0
CONFIDENCE_THRESHOLD = 0.7       # Minimum to proceed with purchase

# Default proactive cap in cents (from SPEC.md Section 11.2)
DEFAULT_PROACTIVE_CAP_CENTS = 75_00  # $75

# Low-risk item categories that allow proactive purchasing by default
LOW_RISK_CATEGORIES = [
    "household essentials",
    "office supplies",
    "cables/adapters",
    "basic kitchen",
    "toiletries",
    "cleaning supplies",
    "batteries",
    "light bulbs",
]

# System blocklist - IMMUTABLE (from SPEC Appendix F)
# Items matching these keywords cannot be purchased regardless of owner settings
SYSTEM_BLOCKLIST = [
    "weapon",
    "firearm",
    "ammunition",
    "gun",
    "controlled substance",
    "prescription",
    "medication",
    "tobacco",
    "nicotine",
    "cigarette",
    "vape",
    "alcohol",
    "beer",
    "wine",
    "liquor",
    "adult content",
    "xxx",
    "porn",
    "hazardous material",
    "explosive",
    "flammable",
]


# =============================================================================
# Need Signal Detection (from SPEC.md Section 11.2)
# =============================================================================

# Explicit signals - indicate clear purchase intent
EXPLICIT_SIGNALS = [
    r"\bi need\b",
    r"\bwe need\b",
    r"\bwe're out of\b",
    r"\bwe are out of\b",
    r"\bran out of\b",
    r"\bbuy\b",
    r"\border\b",
    r"\bpurchase\b",
    r"\bget me\b",
    r"\breplace\b",
    r"\bneed to replace\b",
]

# Strong implied signals - indicate high likelihood of need
STRONG_IMPLIED_SIGNALS = [
    r"\bbroke\b",
    r"\bbroken\b",
    r"\bdoesn't work\b",
    r"\bdoesn't work anymore\b",
    r"\bstopped working\b",
    r"\bno longer have\b",
    r"\blast one\b",
    r"\bnearly out\b",
    r"\balmost out\b",
    r"\brunning low\b",
    r"\bneed more\b",
    r"\bneed another\b",
]

# Weak implied signals - convenience, not necessity
WEAK_IMPLIED_SIGNALS = [
    r"\bit would be nice to have\b",
    r"\bwould be nice\b",
    r"\bcould use\b",
    r"\bmight want\b",
    r"\bthinking about getting\b",
    r"\bmaybe get\b",
]

# Budget constraint signals - reduce confidence when detected
BUDGET_SIGNALS = [
    r"\bmoney is tight\b",
    r"\bon a budget\b",
    r"\bcan't afford\b",
    r"\bcannot afford\b",
    r"\btoo expensive\b",
    r"\bneed to save\b",
    r"\bsaving money\b",
    r"\bcut back\b",
    r"\bcutting back\b",
    r"\btight budget\b",
    r"\bfinancially tight\b",
    r"\bstrapped for cash\b",
]


# =============================================================================
# Types
# =============================================================================


class ConfidenceTier(str, Enum):
    """Confidence tier for audit trail (SPEC.md Section 11.3)."""

    HIGH = "HIGH"      # >= 0.8
    MEDIUM = "MEDIUM"  # >= 0.6
    LOW = "LOW"        # < 0.6


class ItemDict(TypedDict, total=False):
    """Item dictionary structure for purchase decisions."""

    title: str
    brand: str
    category: str
    category_hierarchy: list[str]
    bullet_points: list[str]
    price_cents: int
    asin: str


class CreditPolicyDict(TypedDict, total=False):
    """Credit policy dictionary structure."""

    proactive_purchasing_enabled: bool
    autonomous_purchasing_enabled: bool
    per_order_cap_cents: int | None
    daily_cap_cents: int | None
    category_allowlist: list[str] | None
    category_denylist: list[str] | None


@dataclass
class DecisionAudit:
    """
    Audit trail for every purchase decision (SPEC.md Section 11.3).

    This data is stored in orders.decision_reason for compliance and debugging.
    """

    signals_detected: list[str] = field(default_factory=list)
    confidence_score: float = 0.0
    confidence_tier: ConfidenceTier = ConfidenceTier.LOW
    budget_adjustment: float = 0.0
    rule_path: str = ""
    blocklist_check: str = "not_checked"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "signals_detected": self.signals_detected,
            "confidence_score": self.confidence_score,
            "confidence_tier": self.confidence_tier.value,
            "budget_adjustment": self.budget_adjustment,
            "rule_path": self.rule_path,
            "blocklist_check": self.blocklist_check,
        }


# =============================================================================
# Keyword Matching (from SPEC.md Section 11.5)
# =============================================================================


def _compile_keyword_pattern(keyword: str) -> re.Pattern[str]:
    """
    Compile a keyword into a regex pattern following SPEC.md Section 11.5 rules.

    Match rules:
    - Case-insensitive
    - Word boundary matching (default)
    - *keyword = suffix match
    - keyword* = prefix match
    - *keyword* = contains

    Args:
        keyword: The keyword to compile, optionally with wildcards.

    Returns:
        Compiled regex pattern.
    """
    # Escape special regex characters except our wildcards
    escaped = re.escape(keyword)
    # Restore our wildcards
    escaped = escaped.replace(r"\*", "*")

    prefix_wild = keyword.startswith("*")
    suffix_wild = keyword.endswith("*")

    # Remove wildcards for pattern construction
    core = escaped.strip("*")

    if prefix_wild and suffix_wild:
        # *keyword* = contains (word characters on either side OK)
        pattern = rf"\w*{core}\w*"
    elif prefix_wild:
        # *keyword = suffix match (word must end with keyword)
        pattern = rf"\w*{core}\b"
    elif suffix_wild:
        # keyword* = prefix match (word must start with keyword)
        pattern = rf"\b{core}\w*"
    else:
        # No wildcards = word boundary match
        pattern = rf"\b{core}\b"

    return re.compile(pattern, re.IGNORECASE)


def matches_keyword(text: str, keyword: str) -> bool:
    """
    Check if text matches a keyword following SPEC.md Section 11.5 rules.

    Match rules:
    - Case-insensitive
    - Word boundary matching (default)
    - *keyword = suffix match
    - keyword* = prefix match
    - *keyword* = contains

    Priority: Denylist > Allowlist > System blocklist

    Args:
        text: The text to search in.
        keyword: The keyword to match.

    Returns:
        True if the keyword matches, False otherwise.
    """
    pattern = _compile_keyword_pattern(keyword)
    return pattern.search(text) is not None


def _get_item_searchable_text(item: ItemDict) -> str:
    """
    Extract searchable text from item metadata.

    Applied to: Product title, brand, category hierarchy, bullet points
    (per SPEC.md Section 11.5).
    """
    parts = []

    if "title" in item:
        parts.append(item["title"])

    if "brand" in item:
        parts.append(item["brand"])

    if "category" in item:
        parts.append(item["category"])

    if "category_hierarchy" in item:
        parts.extend(item["category_hierarchy"])

    if "bullet_points" in item:
        parts.extend(item["bullet_points"])

    return " ".join(parts)


def _check_blocklist(item: ItemDict, blocklist: list[str]) -> tuple[bool, str | None]:
    """
    Check if item matches any keyword in a blocklist.

    Returns:
        Tuple of (is_blocked, matched_keyword).
    """
    text = _get_item_searchable_text(item)

    for keyword in blocklist:
        if matches_keyword(text, keyword):
            return True, keyword

    return False, None


def _check_allowlist(item: ItemDict, allowlist: list[str]) -> bool:
    """
    Check if item matches any keyword in an allowlist.

    Returns:
        True if item matches allowlist (or allowlist is empty/None).
    """
    if not allowlist:
        return True  # Empty allowlist means all allowed

    text = _get_item_searchable_text(item)

    for keyword in allowlist:
        if matches_keyword(text, keyword):
            return True

    return False


def _is_low_risk_category(item: ItemDict) -> bool:
    """
    Check if item falls into a low-risk category for proactive purchasing.

    Low-risk categories are defined in SPEC.md Section 11.2.
    """
    text = _get_item_searchable_text(item).lower()

    for category in LOW_RISK_CATEGORIES:
        # Simple substring check for categories (less strict than keyword matching)
        if category.lower() in text:
            return True

    return False


# =============================================================================
# Need Signal Detection
# =============================================================================


def _detect_signals(
    conversation: list[str],
) -> tuple[list[str], float, float]:
    """
    Detect need signals in conversation and compute base confidence.

    Returns:
        Tuple of (signals_detected, base_confidence, budget_adjustment).
    """
    combined_text = " ".join(conversation).lower()
    signals_detected: list[str] = []
    base_confidence = CONFIDENCE_UNKNOWN
    budget_adjustment = 0.0

    # Check for explicit signals (highest confidence)
    for pattern in EXPLICIT_SIGNALS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            # Extract the matched signal for audit
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                signals_detected.append(f"explicit: '{match.group()}'")
            base_confidence = max(base_confidence, CONFIDENCE_EXPLICIT)

    # Check for strong implied signals
    if base_confidence < CONFIDENCE_EXPLICIT:
        for pattern in STRONG_IMPLIED_SIGNALS:
            if re.search(pattern, combined_text, re.IGNORECASE):
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    signals_detected.append(f"strong_implied: '{match.group()}'")
                base_confidence = max(base_confidence, CONFIDENCE_STRONG_IMPLIED)

    # Check for weak implied signals
    if base_confidence < CONFIDENCE_STRONG_IMPLIED:
        for pattern in WEAK_IMPLIED_SIGNALS:
            if re.search(pattern, combined_text, re.IGNORECASE):
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    signals_detected.append(f"weak_implied: '{match.group()}'")
                base_confidence = max(base_confidence, CONFIDENCE_WEAK_IMPLIED)

    # Check for budget constraint signals (reduce confidence)
    for pattern in BUDGET_SIGNALS:
        if re.search(pattern, combined_text, re.IGNORECASE):
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                signals_detected.append(f"budget_constraint: '{match.group()}'")
            # Reduce confidence by 0.3-0.5 per SPEC.md Section 11.2
            # Use 0.4 as middle ground; stack up to -0.5 max
            budget_adjustment = min(budget_adjustment - 0.4, -0.5)

    return signals_detected, base_confidence, budget_adjustment


def _get_confidence_tier(confidence: float) -> ConfidenceTier:
    """Map confidence score to tier for audit trail."""
    if confidence >= 0.8:
        return ConfidenceTier.HIGH
    elif confidence >= 0.6:
        return ConfidenceTier.MEDIUM
    else:
        return ConfidenceTier.LOW


# =============================================================================
# Main Decision Function (from SPEC.md Section 11.2)
# =============================================================================


def should_purchase_proactively(
    conversation: list[str],
    item: ItemDict,
    credit_policy: CreditPolicyDict,
    available_credit_cents: int,
) -> tuple[bool, str, float]:
    """
    Determine whether to proceed with a proactive purchase.

    This implements the decision rubric from SPEC.md Section 11.2.

    Args:
        conversation: List of conversation messages to analyze for need signals.
        item: Item dictionary with title, brand, category, price_cents, etc.
        credit_policy: Credit policy dictionary with caps and lists.
        available_credit_cents: Current available credit in cents.

    Returns:
        Tuple of (should_buy, reason, confidence).
        - should_buy: True if purchase should proceed.
        - reason: Human-readable explanation.
        - confidence: Final confidence score (0-1).

    Checks (in order):
        1. proactive_purchasing_enabled in credit_policy
        2. Item not in system blocklist
        3. Item not in user's denylist
        4. Item price <= min(per_order_cap, proactive_cap=$75)
        5. Item price <= daily_cap (if set)
        6. Item price <= available_credit
        7. Confidence >= threshold
        8. Item is low-risk category (for proactive)
    """
    audit = DecisionAudit()
    item_price_cents = item.get("price_cents", 0)
    rule_path_parts: list[str] = []

    # 1. Check if proactive purchasing is enabled
    if not credit_policy.get("proactive_purchasing_enabled", True):
        audit.rule_path = "proactive_disabled"
        audit.blocklist_check = "skipped"
        return False, "Proactive purchasing is disabled", 0.0

    # 2. Check system blocklist (IMMUTABLE - cannot be overridden)
    is_blocked, blocked_keyword = _check_blocklist(item, SYSTEM_BLOCKLIST)
    if is_blocked:
        audit.blocklist_check = f"blocked: {blocked_keyword}"
        audit.rule_path = "system_blocklist"
        return False, f"Item blocked by system blocklist: {blocked_keyword}", 0.0

    audit.blocklist_check = "passed"
    rule_path_parts.append("system_blocklist_passed")

    # 3. Check user's denylist (Priority: Denylist > Allowlist)
    user_denylist = credit_policy.get("category_denylist") or []
    if user_denylist:
        is_denied, denied_keyword = _check_blocklist(item, user_denylist)
        if is_denied:
            audit.rule_path = " -> ".join(rule_path_parts + [f"user_denylist: {denied_keyword}"])
            return False, f"Item blocked by user denylist: {denied_keyword}", 0.0
        rule_path_parts.append("user_denylist_passed")

    # Check allowlist (if item not in allowlist, block)
    user_allowlist = credit_policy.get("category_allowlist") or []
    if user_allowlist and not _check_allowlist(item, user_allowlist):
        audit.rule_path = " -> ".join(rule_path_parts + ["not_in_allowlist"])
        return False, "Item not in user allowlist", 0.0
    if user_allowlist:
        rule_path_parts.append("user_allowlist_passed")

    # 4. Check price against caps
    per_order_cap = credit_policy.get("per_order_cap_cents")
    proactive_cap = DEFAULT_PROACTIVE_CAP_CENTS

    # Effective cap is min(per_order_cap, proactive_cap=$75)
    if per_order_cap is not None:
        effective_cap = min(per_order_cap, proactive_cap)
    else:
        effective_cap = proactive_cap

    if item_price_cents > effective_cap:
        audit.rule_path = " -> ".join(rule_path_parts + ["exceeds_proactive_cap"])
        return (
            False,
            f"Item price ${item_price_cents / 100:.2f} exceeds proactive cap ${effective_cap / 100:.2f}",
            0.0,
        )
    rule_path_parts.append("within_proactive_cap")

    # 5. Check daily cap (if set)
    daily_cap = credit_policy.get("daily_cap_cents")
    if daily_cap is not None and item_price_cents > daily_cap:
        audit.rule_path = " -> ".join(rule_path_parts + ["exceeds_daily_cap"])
        return (
            False,
            f"Item price ${item_price_cents / 100:.2f} exceeds daily cap ${daily_cap / 100:.2f}",
            0.0,
        )
    if daily_cap is not None:
        rule_path_parts.append("within_daily_cap")

    # 6. Check available credit
    if item_price_cents > available_credit_cents:
        audit.rule_path = " -> ".join(rule_path_parts + ["insufficient_credit"])
        return (
            False,
            f"Insufficient credit: need ${item_price_cents / 100:.2f}, have ${available_credit_cents / 100:.2f}",
            0.0,
        )
    rule_path_parts.append("sufficient_credit")

    # Detect need signals and compute confidence
    signals_detected, base_confidence, budget_adjustment = _detect_signals(conversation)
    audit.signals_detected = signals_detected
    audit.budget_adjustment = budget_adjustment

    # Apply budget adjustment
    final_confidence = max(0.0, base_confidence + budget_adjustment)
    audit.confidence_score = final_confidence
    audit.confidence_tier = _get_confidence_tier(final_confidence)

    # 7. Check confidence threshold
    if final_confidence < CONFIDENCE_THRESHOLD:
        audit.rule_path = " -> ".join(rule_path_parts + [f"low_confidence ({final_confidence:.2f})"])
        return (
            False,
            f"Confidence {final_confidence:.2f} below threshold {CONFIDENCE_THRESHOLD}",
            final_confidence,
        )
    rule_path_parts.append(f"confidence_ok ({final_confidence:.2f})")

    # 8. Check if item is low-risk category (for proactive)
    if not _is_low_risk_category(item):
        audit.rule_path = " -> ".join(rule_path_parts + ["not_low_risk"])
        return False, "Item is not in a low-risk category for proactive purchasing", final_confidence
    rule_path_parts.append("low_risk_category")

    # All checks passed - proceed with purchase
    audit.rule_path = " -> ".join(rule_path_parts)

    reason = (
        f"Proactive purchase approved: confidence={final_confidence:.2f}, "
        f"signals={len(signals_detected)}, price=${item_price_cents / 100:.2f}"
    )

    return True, reason, final_confidence


def get_decision_audit(
    conversation: list[str],
    item: ItemDict,
    credit_policy: CreditPolicyDict,
    available_credit_cents: int,
) -> DecisionAudit:
    """
    Get full audit trail for a purchase decision.

    This provides the data required for orders.decision_reason (SPEC.md Section 11.3).

    Args:
        conversation: List of conversation messages to analyze.
        item: Item dictionary with metadata.
        credit_policy: Credit policy dictionary.
        available_credit_cents: Current available credit in cents.

    Returns:
        DecisionAudit object with full audit trail.
    """
    audit = DecisionAudit()
    item_price_cents = item.get("price_cents", 0)
    rule_path_parts: list[str] = []

    # Check proactive enabled
    if not credit_policy.get("proactive_purchasing_enabled", True):
        audit.rule_path = "proactive_disabled"
        audit.blocklist_check = "skipped"
        return audit

    # System blocklist check
    is_blocked, blocked_keyword = _check_blocklist(item, SYSTEM_BLOCKLIST)
    if is_blocked:
        audit.blocklist_check = f"blocked: {blocked_keyword}"
        audit.rule_path = "system_blocklist"
        return audit

    audit.blocklist_check = "passed"
    rule_path_parts.append("system_blocklist_passed")

    # User denylist check
    user_denylist = credit_policy.get("category_denylist") or []
    if user_denylist:
        is_denied, denied_keyword = _check_blocklist(item, user_denylist)
        if is_denied:
            audit.rule_path = " -> ".join(rule_path_parts + [f"user_denylist: {denied_keyword}"])
            return audit
        rule_path_parts.append("user_denylist_passed")

    # Allowlist check
    user_allowlist = credit_policy.get("category_allowlist") or []
    if user_allowlist and not _check_allowlist(item, user_allowlist):
        audit.rule_path = " -> ".join(rule_path_parts + ["not_in_allowlist"])
        return audit
    if user_allowlist:
        rule_path_parts.append("user_allowlist_passed")

    # Price cap checks
    per_order_cap = credit_policy.get("per_order_cap_cents")
    proactive_cap = DEFAULT_PROACTIVE_CAP_CENTS
    effective_cap = min(per_order_cap, proactive_cap) if per_order_cap else proactive_cap

    if item_price_cents > effective_cap:
        audit.rule_path = " -> ".join(rule_path_parts + ["exceeds_proactive_cap"])
        return audit
    rule_path_parts.append("within_proactive_cap")

    # Daily cap check
    daily_cap = credit_policy.get("daily_cap_cents")
    if daily_cap is not None and item_price_cents > daily_cap:
        audit.rule_path = " -> ".join(rule_path_parts + ["exceeds_daily_cap"])
        return audit
    if daily_cap is not None:
        rule_path_parts.append("within_daily_cap")

    # Credit check
    if item_price_cents > available_credit_cents:
        audit.rule_path = " -> ".join(rule_path_parts + ["insufficient_credit"])
        return audit
    rule_path_parts.append("sufficient_credit")

    # Detect signals and compute confidence
    signals_detected, base_confidence, budget_adjustment = _detect_signals(conversation)
    audit.signals_detected = signals_detected
    audit.budget_adjustment = budget_adjustment

    final_confidence = max(0.0, base_confidence + budget_adjustment)
    audit.confidence_score = final_confidence
    audit.confidence_tier = _get_confidence_tier(final_confidence)

    # Confidence threshold check
    if final_confidence < CONFIDENCE_THRESHOLD:
        audit.rule_path = " -> ".join(rule_path_parts + [f"low_confidence ({final_confidence:.2f})"])
        return audit
    rule_path_parts.append(f"confidence_ok ({final_confidence:.2f})")

    # Low-risk category check
    if not _is_low_risk_category(item):
        audit.rule_path = " -> ".join(rule_path_parts + ["not_low_risk"])
        return audit
    rule_path_parts.append("low_risk_category")

    # Success path
    audit.rule_path = " -> ".join(rule_path_parts)
    return audit


# =============================================================================
# Convenience Functions
# =============================================================================


def is_blocked_by_system(item: ItemDict) -> tuple[bool, str | None]:
    """
    Check if an item is blocked by the system blocklist.

    This is a convenience function for quick blocklist checks.

    Args:
        item: Item dictionary with metadata.

    Returns:
        Tuple of (is_blocked, matched_keyword).
    """
    return _check_blocklist(item, SYSTEM_BLOCKLIST)


def compute_confidence(conversation: list[str]) -> tuple[float, list[str]]:
    """
    Compute confidence score from conversation without item context.

    Useful for pre-screening conversations before item selection.

    Args:
        conversation: List of conversation messages.

    Returns:
        Tuple of (final_confidence, signals_detected).
    """
    signals_detected, base_confidence, budget_adjustment = _detect_signals(conversation)
    final_confidence = max(0.0, base_confidence + budget_adjustment)
    return final_confidence, signals_detected
