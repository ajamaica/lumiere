"""
Prompt Performance Tester Skill - Multi-Provider Edition
Tests prompts across Claude, GPT, and Gemini models with detailed performance metrics.
Measures: latency, cost, quality, consistency, and token usage.

PROPRIETARY - Do not share source code without license agreement
"""

import anthropic
import time
import json
import os
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

# Optional imports for other providers
try:
    import openai
except ImportError:
    openai = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None


@dataclass
class PerformanceMetrics:
    """Performance metrics for a prompt test"""
    model_id: str
    provider: str  # "anthropic", "openai", "google"
    prompt_text: str
    response_text: str
    latency_ms: float
    tokens_input: int
    tokens_output: int
    estimated_cost_cents: float
    quality_score: float  # 0-100 based on response quality
    timestamp: str
    error: Optional[str] = None


@dataclass
class TestResults:
    """Complete test results comparing models"""
    test_id: str
    prompt_text: str
    models_tested: list[str]
    results: list[PerformanceMetrics]
    recommendations: list[str]
    best_model: str
    cheapest_model: str
    fastest_model: str
    created_at: str


class PromptPerformanceTester:
    """
    Test and compare prompts across multiple LLM models and providers.

    Supports:
    - Anthropic Claude (Haiku, Sonnet, Opus)
    - OpenAI GPT (GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo)
    - Google Gemini (2.0 Flash, 1.5 Pro, 1.5 Flash)

    Features:
    - Multi-provider testing
    - Latency, cost, quality metrics
    - Consistency testing
    - Detailed recommendations
    """

    # Model pricing (cost per 1M tokens)
    MODEL_PRICING = {
        # Anthropic Claude 4.5 Series (Latest 2026)
        "claude-haiku-4-5-20251001": {
            "provider": "anthropic",
            "input": 1.00,      # $1.00 per 1M input tokens
            "output": 5.00      # $5.00 per 1M output tokens
        },
        "claude-sonnet-4-5-20250929": {
            "provider": "anthropic",
            "input": 3.00,      # $3.00 per 1M input tokens
            "output": 15.00     # $15.00 per 1M output tokens
        },
        "claude-opus-4-5-20251101": {
            "provider": "anthropic",
            "input": 5.00,      # $5.00 per 1M input tokens
            "output": 25.00     # $25.00 per 1M output tokens
        },

        # OpenAI GPT-5.2 Series (Latest 2026)
        "gpt-5.2-instant": {
            "provider": "openai",
            "input": 1.75,      # $1.75 per 1M input tokens
            "output": 14.00     # $14.00 per 1M output tokens
        },
        "gpt-5.2-thinking": {
            "provider": "openai",
            "input": 1.75,      # $1.75 per 1M input tokens
            "output": 14.00     # $14.00 per 1M output tokens
        },
        "gpt-5.2-pro": {
            "provider": "openai",
            "input": 1.75,      # $1.75 per 1M input tokens
            "output": 14.00     # $14.00 per 1M output tokens
        },

        # Google Gemini Latest (2026)
        "gemini-3-pro": {
            "provider": "google",
            "input": 2.00,      # $2.00 per 1M input tokens (up to 200K context)
            "output": 12.00     # $12.00 per 1M output tokens
        },
        "gemini-2.5-pro": {
            "provider": "google",
            "input": 1.25,      # $1.25 per 1M input tokens
            "output": 10.00     # $10.00 per 1M output tokens
        },
        "gemini-2.5-flash": {
            "provider": "google",
            "input": 0.30,      # $0.30 per 1M input tokens
            "output": 2.50      # $2.50 per 1M output tokens
        },
        "gemini-2.5-flash-lite": {
            "provider": "google",
            "input": 0.10,      # $0.10 per 1M input tokens
            "output": 0.40      # $0.40 per 1M output tokens
        },
    }

    # Watermark for IP tracking
    WATERMARK = "PROPRIETARY_SKILL_VEDANT_2024_MULTI_PROVIDER"

    def __init__(self, anthropic_api_key: str = None, openai_api_key: str = None, google_api_key: str = None):
        """Initialize with API keys for different providers"""

        # Anthropic
        self.anthropic_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        if self.anthropic_key:
            self.anthropic_client = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.anthropic_client = None

        # OpenAI
        self.openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if self.openai_key and openai:
            self.openai_client = openai.OpenAI(api_key=self.openai_key)
        else:
            self.openai_client = None

        # Google Gemini
        self.google_key = google_api_key or os.getenv("GOOGLE_API_KEY")
        if self.google_key and genai:
            genai.configure(api_key=self.google_key)

        self.test_history = []

    def test_prompt(
        self,
        prompt_text: str,
        models: list[str] = None,
        num_runs: int = 1,
        system_prompt: str = None,
        max_tokens: int = 1000
    ) -> TestResults:
        """
        Test a prompt across multiple models.

        Args:
            prompt_text: The prompt to test
            models: List of models to test (default: all available)
            num_runs: Number of times to run each model
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens for response

        Returns:
            TestResults with performance metrics for all models
        """

        if models is None:
            models = list(self.MODEL_PRICING.keys())

        all_results = []
        test_id = self._generate_test_id()

        for model in models:
            if model not in self.MODEL_PRICING:
                print(f"⚠️  Unknown model: {model}")
                continue

            print(f"Testing {model}...")
            model_results = []

            for run in range(num_runs):
                metric = self._test_single_model(
                    model=model,
                    prompt=prompt_text,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens
                )
                model_results.append(metric)

            all_results.extend(model_results)

        # Generate recommendations
        recommendations = self._generate_recommendations(all_results)

        # Find best models
        successful_results = [r for r in all_results if r.error is None]
        best_model = max(successful_results, key=lambda x: x.quality_score).model_id if successful_results else "N/A"
        cheapest_model = min(successful_results, key=lambda x: x.estimated_cost_cents).model_id if successful_results else "N/A"
        fastest_model = min(successful_results, key=lambda x: x.latency_ms).model_id if successful_results else "N/A"

        results = TestResults(
            test_id=test_id,
            prompt_text=prompt_text[:200] + "..." if len(prompt_text) > 200 else prompt_text,
            models_tested=models,
            results=all_results,
            recommendations=recommendations,
            best_model=best_model,
            cheapest_model=cheapest_model,
            fastest_model=fastest_model,
            created_at=datetime.now().isoformat()
        )

        self.test_history.append(results)
        return results

    def _test_single_model(
        self,
        model: str,
        prompt: str,
        system_prompt: str = None,
        max_tokens: int = 1000
    ) -> PerformanceMetrics:
        """Test a single model"""

        try:
            provider = self.MODEL_PRICING[model]["provider"]

            if provider == "anthropic":
                return self._test_anthropic(model, prompt, system_prompt, max_tokens)
            elif provider == "openai":
                return self._test_openai(model, prompt, system_prompt, max_tokens)
            elif provider == "google":
                return self._test_google(model, prompt, system_prompt, max_tokens)
            else:
                raise ValueError(f"Unknown provider: {provider}")

        except Exception as e:
            return PerformanceMetrics(
                model_id=model,
                provider=self.MODEL_PRICING.get(model, {}).get("provider", "unknown"),
                prompt_text=prompt,
                response_text="",
                latency_ms=0,
                tokens_input=0,
                tokens_output=0,
                estimated_cost_cents=0,
                quality_score=0,
                timestamp=datetime.now().isoformat(),
                error=str(e)
            )

    def _test_anthropic(self, model: str, prompt: str, system_prompt: str, max_tokens: int) -> PerformanceMetrics:
        """Test using Anthropic API"""
        if not self.anthropic_client:
            raise ValueError("Anthropic API key not configured")

        start_time = time.time()

        message = self.anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}]
        )

        latency_ms = (time.time() - start_time) * 1000
        response_text = message.content[0].text if message.content else ""
        tokens_input = message.usage.input_tokens
        tokens_output = message.usage.output_tokens

        estimated_cost_cents = self._calculate_cost(model, tokens_input, tokens_output)
        quality_score = self._score_response_quality(response_text, latency_ms)

        return PerformanceMetrics(
            model_id=model,
            provider="anthropic",
            prompt_text=prompt,
            response_text=response_text[:200] + "..." if len(response_text) > 200 else response_text,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_cents=estimated_cost_cents,
            quality_score=quality_score,
            timestamp=datetime.now().isoformat()
        )

    def _test_openai(self, model: str, prompt: str, system_prompt: str, max_tokens: int) -> PerformanceMetrics:
        """Test using OpenAI API"""
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")

        start_time = time.time()

        response = self.openai_client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt or "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
        )

        latency_ms = (time.time() - start_time) * 1000
        response_text = response.choices[0].message.content if response.choices else ""
        tokens_input = response.usage.prompt_tokens
        tokens_output = response.usage.completion_tokens

        estimated_cost_cents = self._calculate_cost(model, tokens_input, tokens_output)
        quality_score = self._score_response_quality(response_text, latency_ms)

        return PerformanceMetrics(
            model_id=model,
            provider="openai",
            prompt_text=prompt,
            response_text=response_text[:200] + "..." if len(response_text) > 200 else response_text,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_cents=estimated_cost_cents,
            quality_score=quality_score,
            timestamp=datetime.now().isoformat()
        )

    def _test_google(self, model: str, prompt: str, system_prompt: str, max_tokens: int) -> PerformanceMetrics:
        """Test using Google Gemini API"""
        if not genai:
            raise ValueError("google-generativeai package not installed")

        start_time = time.time()

        gemini_model = genai.GenerativeModel(model)
        response = gemini_model.generate_content(
            f"{system_prompt or 'You are a helpful assistant.'}\n\n{prompt}",
            generation_config={"max_output_tokens": max_tokens}
        )

        latency_ms = (time.time() - start_time) * 1000
        response_text = response.text if response else ""

        # Estimate tokens (Gemini doesn't always return exact counts)
        tokens_input = len(prompt.split()) * 1.3  # Rough estimate
        tokens_output = len(response_text.split()) * 1.3

        estimated_cost_cents = self._calculate_cost(model, int(tokens_input), int(tokens_output))
        quality_score = self._score_response_quality(response_text, latency_ms)

        return PerformanceMetrics(
            model_id=model,
            provider="google",
            prompt_text=prompt,
            response_text=response_text[:200] + "..." if len(response_text) > 200 else response_text,
            latency_ms=latency_ms,
            tokens_input=int(tokens_input),
            tokens_output=int(tokens_output),
            estimated_cost_cents=estimated_cost_cents,
            quality_score=quality_score,
            timestamp=datetime.now().isoformat()
        )

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate estimated cost in cents"""
        if model not in self.MODEL_PRICING:
            return 0

        pricing = self.MODEL_PRICING[model]
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]

        # Convert dollars to cents
        return round((input_cost + output_cost) * 100, 4)

    def _score_response_quality(self, response: str, latency_ms: float) -> float:
        """Score response quality (0-100)"""
        score = 50  # Base score

        # Length quality (optimal 200-1000 chars)
        if 200 <= len(response) <= 1000:
            score += 25
        elif len(response) > 100:
            score += 15

        # Completeness (has punctuation, sentences)
        if response.count(".") > 0:
            score += 15
        if response.count("?") > 0 or response.count("!") > 0:
            score += 5

        # Latency quality (faster is better, but not too instant)
        if 500 < latency_ms < 5000:
            score += 10
        elif latency_ms < 500:
            score += 5

        return min(100, max(0, score))

    def _generate_recommendations(self, results: list[PerformanceMetrics]) -> list[str]:
        """Generate recommendations based on results"""
        recommendations = []

        successful = [r for r in results if r.error is None]

        if not successful:
            recommendations.append("All tests failed. Check API keys and prompt validity.")
            return recommendations

        # Cost recommendation
        cheapest = min(successful, key=lambda x: x.estimated_cost_cents)
        recommendations.append(f"Cost-optimized: Use {cheapest.model_id} (${cheapest.estimated_cost_cents/100:.4f})")

        # Quality recommendation
        best_quality = max(successful, key=lambda x: x.quality_score)
        recommendations.append(f"Best quality: {best_quality.model_id} ({best_quality.quality_score:.0f}/100)")

        # Speed recommendation
        fastest = min(successful, key=lambda x: x.latency_ms)
        recommendations.append(f"Fastest: {fastest.model_id} ({fastest.latency_ms:.0f}ms)")

        # Cross-provider comparison
        by_provider = {}
        for r in successful:
            if r.provider not in by_provider:
                by_provider[r.provider] = []
            by_provider[r.provider].append(r)

        if len(by_provider) > 1:
            recommendations.append(f"Multi-provider comparison: {len(by_provider)} providers tested")

        return recommendations

    def _generate_test_id(self) -> str:
        """Generate unique test ID"""
        import uuid
        return f"test_{uuid.uuid4().hex[:8]}"

    def format_results(self, results: TestResults) -> str:
        """Format results as readable string"""
        output = f"""
╔══════════════════════════════════════════════════════════╗
║           PROMPT PERFORMANCE TEST RESULTS                ║
╚══════════════════════════════════════════════════════════╝

Test ID: {results.test_id}
Timestamp: {results.created_at}
Models Tested: {', '.join(results.models_tested)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETAILED RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        for result in results.results:
            if result.error:
                output += f"\n❌ {result.model_id} ({result.provider})\n   Error: {result.error}\n"
            else:
                output += f"""
✅ {result.model_id} ({result.provider})
   Latency:  {result.latency_ms:.0f}ms
   Cost:     ${result.estimated_cost_cents/100:.6f}
   Quality:  {result.quality_score:.1f}/100
   Tokens:   {result.tokens_input} input, {result.tokens_output} output
"""

        output += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        for i, rec in enumerate(results.recommendations, 1):
            output += f"{i}. {rec}\n"

        output += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best Model (Quality): {results.best_model}
Best Model (Cost):    {results.cheapest_model}
Best Model (Speed):   {results.fastest_model}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        return output


if __name__ == "__main__":
    # Example usage
    import os

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        tester = PromptPerformanceTester(anthropic_api_key=api_key)
        results = tester.test_prompt(
            prompt_text="What are the benefits of AI?",
            models=["claude-haiku-4-5-20251001"],
            num_runs=1,
            max_tokens=200
        )
        print(tester.format_results(results))
