#!/usr/bin/env python3
"""
Semantic Router - Expert-Domain Routing Engine (Phase G)

Implements weighted expertise scoring for intelligent model selection
based on domain specialization, risk assessment, and confidence thresholds.

Architecture:
1. Domain Detection → Identify semantic domains in the query
2. Expertise Scoring → Weight each model's domain expertise (0-100)
3. Risk Assessment → Check for mandatory routing (medical, security, etc.)
4. Context Override → Large context forces Gemini
5. Confidence Gate → Low confidence triggers HITL notification

Author: J.A.R.V.I.S. for Cabo
Version: 1.0.0 (Phase G)
"""

import json
import re
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart-router.semantic")


class ExpertDomain(Enum):
    """Semantic domains for expertise matching (Feb 2026)."""
    # Architecture & Security
    SOFTWARE_ARCH = "SOFTWARE_ARCH"
    SECURITY_VERIFICATION = "SECURITY_VERIFICATION"
    CODE_REVIEW = "CODE_REVIEW"
    MULTI_FILE_REFACTOR = "MULTI_FILE_REFACTOR"
    DEBUGGING = "DEBUGGING"
    
    # Precision & Logic
    LOGICAL_PRECISION = "LOGICAL_PRECISION"
    CONTROL_FLOW = "CONTROL_FLOW"
    MATH = "MATH"
    RISKY_REFACTOR = "RISKY_REFACTOR"
    FORMAL_PROOFS = "FORMAL_PROOFS"
    
    # Concurrency & Scale
    CONCURRENCY = "CONCURRENCY"
    PARALLEL_SYSTEMS = "PARALLEL_SYSTEMS"
    MASSIVE_SYNTHESIS = "MASSIVE_SYNTHESIS"
    DOCUMENT_SYNTHESIS = "DOCUMENT_SYNTHESIS"
    
    # Domain-Specific
    SCIENTIFIC = "SCIENTIFIC"
    MEDICAL = "MEDICAL"
    FINANCIAL_MATH = "FINANCIAL_MATH"
    
    # Real-time & Trends
    REALTIME_SIGNAL = "REALTIME_SIGNAL"
    CURRENT_EVENTS = "CURRENT_EVENTS"
    SOCIAL_TRENDS = "SOCIAL_TRENDS"
    CULTURE_ANALYSIS = "CULTURE_ANALYSIS"
    MARKET_DATA = "MARKET_DATA"
    
    # Routine
    SYSTEM_ROUTINE = "SYSTEM_ROUTINE"
    SIMPLE_QA = "SIMPLE_QA"
    CREATIVE = "CREATIVE"


@dataclass
class DomainScore:
    """Score for a detected domain."""
    domain: str
    score: float  # 0-100 relevance to query
    keywords_matched: list[str] = field(default_factory=list)


@dataclass
class ModelExpertise:
    """Expertise assessment for a model."""
    model_id: str
    agent_id: Optional[str]
    display_name: str
    total_score: float  # Weighted expertise score
    domain_scores: dict[str, float] = field(default_factory=dict)
    is_mandatory: bool = False
    mandatory_reason: Optional[str] = None
    blind_spots_triggered: list[str] = field(default_factory=list)


@dataclass 
class SemanticDecision:
    """Complete routing decision with confidence."""
    selected_model: str
    agent_id: Optional[str]
    confidence: float  # 0-100
    expertise_score: float
    detected_domains: list[DomainScore]
    model_rankings: list[ModelExpertise]
    risk_override: Optional[str] = None
    context_override: bool = False
    concurrency_detected: bool = False
    control_flow_risk: Optional[str] = None
    hitl_required: bool = False
    hitl_message: Optional[str] = None
    reasoning: str = ""
    alternative_model: Optional[str] = None
    alternative_reason: Optional[str] = None


class SemanticRouter:
    """
    Expert-Domain Router with weighted expertise scoring.
    
    Routes queries to the model with highest domain expertise,
    accounting for risk domains, context size, and confidence thresholds.
    """
    
    def __init__(self, matrix_path: Optional[str] = None):
        """Load expert matrix configuration."""
        if matrix_path is None:
            matrix_path = Path(__file__).parent / "expert_matrix.json"
        
        with open(matrix_path, 'r') as f:
            self.matrix = json.load(f)
        
        self.models = self.matrix["models"]
        self.domain_keywords = self.matrix["domain_keywords"]
        self.risk_domains = self.matrix["risk_domains"]
        self.rules = self.matrix["routing_rules"]
        
        # Pre-compile keyword patterns
        self._compile_patterns()
        
        logger.info(f"SemanticRouter initialized with {len(self.models)} models")
    
    def _compile_patterns(self) -> None:
        """Compile regex patterns for domain detection."""
        self._domain_patterns = {}
        for domain, keywords in self.domain_keywords.items():
            # Create pattern that matches any keyword (case insensitive)
            pattern = '|'.join(re.escape(kw) for kw in keywords)
            self._domain_patterns[domain] = re.compile(pattern, re.IGNORECASE)
        
        self._risk_patterns = {}
        for risk_name, risk_config in self.risk_domains.items():
            pattern = '|'.join(re.escape(kw) for kw in risk_config["keywords"])
            self._risk_patterns[risk_name] = re.compile(pattern, re.IGNORECASE)
    
    def detect_domains(self, query: str) -> list[DomainScore]:
        """
        Detect semantic domains in the query with relevance scores.
        
        Returns list of DomainScore sorted by relevance (highest first).
        """
        detected = []
        query_lower = query.lower()
        query_len = len(query_lower.split())
        
        for domain, pattern in self._domain_patterns.items():
            matches = pattern.findall(query_lower)
            if matches:
                # Score based on keyword density and match count
                unique_matches = list(set(matches))
                density = len(matches) / max(query_len, 1)
                base_score = min(100, len(unique_matches) * 25 + density * 50)
                
                detected.append(DomainScore(
                    domain=domain,
                    score=base_score,
                    keywords_matched=unique_matches
                ))
        
        # Sort by score descending
        detected.sort(key=lambda x: x.score, reverse=True)
        
        # Limit to top N domains
        max_domains = self.rules.get("max_domain_scores", 3)
        return detected[:max_domains]
    
    def check_risk_domains(self, query: str) -> Optional[tuple[str, str, str]]:
        """
        Check if query triggers a risk domain requiring mandatory routing.
        
        Returns: (risk_name, mandatory_model, reason) or None
        """
        for risk_name, risk_config in self.risk_domains.items():
            pattern = self._risk_patterns[risk_name]
            if pattern.search(query):
                return (
                    risk_name,
                    risk_config["mandatory_model"],
                    risk_config["reason"]
                )
        return None
    
    def calculate_expertise(
        self,
        detected_domains: list[DomainScore],
        context_tokens: int = 0
    ) -> list[ModelExpertise]:
        """
        Calculate weighted expertise score for each model.
        
        Score = Σ(domain_relevance × model_expertise) / num_domains
        """
        rankings = []
        
        for model_id, model_config in self.models.items():
            expert_domains = model_config.get("expert_domains", {})
            
            # Calculate weighted score across detected domains
            total_weighted = 0
            total_weight = 0
            domain_scores = {}
            
            for domain_score in detected_domains:
                domain = domain_score.domain
                relevance = domain_score.score / 100  # Normalize to 0-1
                expertise = expert_domains.get(domain, 30)  # Default 30 if not specialized
                
                weighted = relevance * expertise
                total_weighted += weighted
                total_weight += relevance
                domain_scores[domain] = expertise
            
            # Normalize score
            if total_weight > 0:
                final_score = total_weighted / total_weight
            else:
                # No domains detected - use general capability
                final_score = expert_domains.get("SYSTEM_ROUTINE", 50)
            
            # Check for blind spots
            blind_spots = []
            for spot in model_config.get("blind_spots", []):
                if spot == "high_cost" and len(detected_domains) == 0:
                    blind_spots.append("cost_inefficient_for_simple")
                elif spot == "context_limited" and context_tokens > 100000:
                    blind_spots.append("context_may_exceed_limit")
                    final_score *= 0.7  # Penalty
            
            # Context bonus for Gemini
            if model_id == "gemini-pro" and context_tokens > 100000:
                final_score = min(100, final_score * 1.3)
            
            rankings.append(ModelExpertise(
                model_id=model_id,
                agent_id=model_config.get("agent_id"),
                display_name=model_config["display_name"],
                total_score=round(final_score, 1),
                domain_scores=domain_scores,
                blind_spots_triggered=blind_spots
            ))
        
        # Sort by score descending
        rankings.sort(key=lambda x: x.total_score, reverse=True)
        return rankings
    
    def route(
        self,
        query: str,
        context_tokens: int = 0,
        current_model: str = "opus"
    ) -> SemanticDecision:
        """
        Main routing function with full semantic analysis.
        
        Returns SemanticDecision with selected model, confidence, and reasoning.
        """
        reasoning_parts = []
        
        # Step 1: Detect semantic domains
        detected_domains = self.detect_domains(query)
        if detected_domains:
            domains_str = ", ".join(f"{d.domain}({d.score:.0f})" for d in detected_domains)
            reasoning_parts.append(f"Domains: {domains_str}")
        else:
            reasoning_parts.append("No specific domain detected")
        
        # Step 2: Check risk domains (mandatory routing)
        risk_override = None
        risk_result = self.check_risk_domains(query)
        if risk_result:
            risk_name, mandatory_model, reason = risk_result
            risk_override = risk_name
            reasoning_parts.append(f"RISK: {risk_name} → {mandatory_model} ({reason})")
        
        # Step 3: Calculate expertise scores
        rankings = self.calculate_expertise(detected_domains, context_tokens)
        
        # Step 4: Context override check
        context_override = False
        context_threshold = self.rules.get("context_override_threshold", 150000)
        if context_tokens > context_threshold:
            context_override = True
            reasoning_parts.append(f"CONTEXT OVERRIDE: {context_tokens:,} tokens > {context_threshold:,}")
        
        # Step 5: Check for concurrency domain (special handling)
        concurrency_detected = False
        control_flow_risk = None
        alternative_model = None
        alternative_reason = None
        
        concurrency_domains = ["CONCURRENCY", "PARALLEL_SYSTEMS", "MASSIVE_SYNTHESIS"]
        precision_domains = ["LOGICAL_PRECISION", "CONTROL_FLOW", "RISKY_REFACTOR"]
        
        detected_domain_names = [d.domain for d in detected_domains]
        has_concurrency = any(d in detected_domain_names for d in concurrency_domains)
        has_precision = any(d in detected_domain_names for d in precision_domains)
        
        if has_concurrency:
            concurrency_detected = True
            # Check for conflict with precision requirements
            if has_precision:
                # Complex case: needs both concurrency (Gemini) and precision (GPT-5)
                gemini_rank = next((r for r in rankings if r.model_id == "gemini-pro"), None)
                gpt_rank = next((r for r in rankings if r.model_id == "gpt5"), None)
                
                if gemini_rank and gpt_rank:
                    control_flow_risk = (
                        f"Gemini: {gemini_rank.total_score:.0f}% (69 concurrency bugs/MLOC) vs "
                        f"GPT-5: {gpt_rank.total_score:.0f}% (22 control flow errors/MLOC)"
                    )
                    alternative_model = "gpt5" if gemini_rank.model_id != "gpt5" else "gemini-pro"
                    alternative_reason = "precision" if alternative_model == "gpt5" else "concurrency"
                    reasoning_parts.append(f"CONFLICT: Concurrency vs Precision")
        
        # Step 6: Select model
        if risk_override:
            # Mandatory routing for risk domain
            selected = next(
                (r for r in rankings if r.model_id == risk_result[1]),
                rankings[0]
            )
            selected.is_mandatory = True
            selected.mandatory_reason = risk_result[2]
            confidence = 95  # High confidence for mandatory
        elif context_override:
            # Force Gemini for large context
            selected = next(
                (r for r in rankings if r.model_id == "gemini-pro"),
                rankings[0]
            )
            confidence = 90
            if has_precision:
                # Warn about control flow risk with large context + precision needs
                control_flow_risk = "Large context forces Gemini (200 control flow errors/MLOC). Precision may be degraded."
                alternative_model = "gpt5"
                alternative_reason = "precision (22 errors/MLOC)"
        else:
            # Use highest expertise score
            selected = rankings[0]
            
            # Calculate confidence based on margin over second choice
            if len(rankings) > 1:
                margin = selected.total_score - rankings[1].total_score
                confidence = min(95, 50 + margin)
                
                # If margin is small, note alternative
                if margin < 15 and not alternative_model:
                    alternative_model = rankings[1].model_id
                    alternative_reason = f"score: {rankings[1].total_score:.0f}"
            else:
                confidence = 85
        
        # Step 7: HITL gate check
        hitl_required = False
        hitl_message = None
        confidence_threshold = self.rules.get("confidence_threshold", 75)
        
        if confidence < confidence_threshold and not risk_override:
            hitl_required = True
            domain_hint = detected_domains[0].domain if detected_domains else "GENERAL"
            
            # Use enhanced HITL message if control flow risk exists
            if control_flow_risk:
                hitl_message = (
                    f"Sir, intent is ambiguous (confidence: {confidence:.0f}%). "
                    f"High risk of control flow errors. "
                    f"Recommend {selected.display_name} but {alternative_model or 'GPT-5.2'} is stronger in {alternative_reason or 'precision'}. Proceed?"
                )
            else:
                hitl_message = (
                    f"Sir, intent is ambiguous (confidence: {confidence:.0f}%). "
                    f"Routing to {selected.display_name} as best guess based on {domain_hint}. Proceed?"
                )
            reasoning_parts.append(f"HITL: Confidence {confidence:.0f}% < {confidence_threshold}%")
        
        # Special HITL for concurrency + precision conflict
        if has_concurrency and has_precision and not hitl_required and confidence < 90:
            hitl_required = True
            gemini_rank = next((r for r in rankings if r.model_id == "gemini-pro"), None)
            gpt_rank = next((r for r in rankings if r.model_id == "gpt5"), None)
            
            hitl_message = (
                f"Sir, this involves both concurrency ({gemini_rank.total_score if gemini_rank else 0:.0f}%) and "
                f"logical precision ({gpt_rank.total_score if gpt_rank else 0:.0f}%). "
                f"Gemini has 6x fewer concurrency bugs, but GPT-5 has 9x better control flow. "
                f"Recommend: {selected.display_name}. Proceed?"
            )
        
        reasoning_parts.append(f"Selected: {selected.display_name} (score: {selected.total_score})")
        
        return SemanticDecision(
            selected_model=selected.model_id,
            agent_id=selected.agent_id,
            confidence=round(confidence, 1),
            expertise_score=selected.total_score,
            detected_domains=detected_domains,
            model_rankings=rankings,
            risk_override=risk_override,
            context_override=context_override,
            concurrency_detected=concurrency_detected,
            control_flow_risk=control_flow_risk,
            hitl_required=hitl_required,
            hitl_message=hitl_message,
            reasoning=" | ".join(reasoning_parts),
            alternative_model=alternative_model,
            alternative_reason=alternative_reason
        )
    
    def dry_run(self, query: str, context_tokens: int = 0) -> str:
        """
        Perform a dry run and return formatted analysis.
        """
        decision = self.route(query, context_tokens)
        
        output = []
        output.append("=" * 60)
        output.append("SEMANTIC ROUTER - DRY RUN ANALYSIS (Phase G)")
        output.append("=" * 60)
        output.append(f"\nQUERY: {query[:100]}{'...' if len(query) > 100 else ''}")
        output.append(f"CONTEXT: {context_tokens:,} tokens")
        output.append("")
        
        # Detected Domains
        output.append("DETECTED DOMAINS:")
        if decision.detected_domains:
            for ds in decision.detected_domains:
                output.append(f"  • {ds.domain}: {ds.score:.0f}% [{', '.join(ds.keywords_matched)}]")
        else:
            output.append("  (none detected)")
        output.append("")
        
        # Risk Assessment
        if decision.risk_override:
            output.append(f"⚠️  RISK DOMAIN: {decision.risk_override}")
            output.append(f"    Mandatory model enforced")
            output.append("")
        
        # Concurrency Detection
        if decision.concurrency_detected:
            output.append("🔄 CONCURRENCY DETECTED: Yes")
            if decision.control_flow_risk:
                output.append(f"⚠️  CONTROL FLOW RISK: {decision.control_flow_risk}")
            output.append("")
        
        # Model Rankings
        output.append("MODEL EXPERTISE RANKINGS:")
        for i, ranking in enumerate(decision.model_rankings):
            marker = "→" if ranking.model_id == decision.selected_model else " "
            mandatory = " [MANDATORY]" if ranking.is_mandatory else ""
            output.append(f"  {marker} {i+1}. {ranking.display_name}: {ranking.total_score:.1f}{mandatory}")
            if ranking.blind_spots_triggered:
                output.append(f"       ⚠️  Blind spots: {', '.join(ranking.blind_spots_triggered)}")
        output.append("")
        
        # Decision
        output.append("-" * 60)
        output.append(f"SELECTED MODEL: {decision.selected_model}")
        output.append(f"AGENT ID: {decision.agent_id or 'main session'}")
        output.append(f"CONFIDENCE: {decision.confidence:.0f}%")
        output.append(f"EXPERTISE SCORE: {decision.expertise_score:.1f}")
        
        if decision.context_override:
            output.append("CONTEXT OVERRIDE: YES (large context → Gemini)")
        
        if decision.alternative_model:
            output.append(f"ALTERNATIVE: {decision.alternative_model} ({decision.alternative_reason})")
        
        if decision.hitl_required:
            output.append(f"\n🚨 HITL REQUIRED:")
            output.append(f"   {decision.hitl_message}")
        
        output.append(f"\nREASONING: {decision.reasoning}")
        output.append("=" * 60)
        
        return "\n".join(output)


# CLI for testing
if __name__ == "__main__":
    import sys
    
    router = SemanticRouter()
    
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        context = 0
        
        # Check for context flag
        if "--context" in sys.argv:
            idx = sys.argv.index("--context")
            context = int(sys.argv[idx + 1])
            query = " ".join(sys.argv[1:idx])
        
        print(router.dry_run(query, context))
    else:
        # Default test
        test_query = "Analyze this 300K log file for security vulnerabilities and write a mitigation script."
        print(router.dry_run(test_query, 300000))
