"""LLM Analyzer — Layer 4 deep semantic security analysis.

Uses httpx for HTTP calls and secrets for random delimiters.
Provider detection: OPENAI_API_KEY → ANTHROPIC_API_KEY.
Graceful degradation: no key = silently skip, API error = pattern results stand.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import subprocess
import time

import httpx

from .llm_prompts import build_protection_rules, THREAT_ANALYSIS_PROMPT, build_user_prompt


class LLMAnalyzer:
    def __init__(self, options: dict | None = None):
        options = options or {}
        self.temperature: float = options.get("temperature", 0.1)
        self.max_tokens: int = options.get("max_tokens", 2000)
        self.timeout: float = options.get("timeout", 60.0)

        provider, api_key, model = self._detect_provider()
        self.provider = provider
        self.api_key = api_key
        self.model = model

    @staticmethod
    def _detect_provider() -> tuple[str, str, str]:
        openai_key = os.getenv("OPENAI_API_KEY", "")
        if openai_key:
            return ("openai", openai_key, "gpt-4o-mini")

        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        if anthropic_key:
            return ("anthropic", anthropic_key, "claude-sonnet-4-5-20250514")

        # Try OpenClaw gateway config
        try:
            result = subprocess.run(
                ["openclaw", "gateway", "config.get"],
                capture_output=True,
                text=True,
                check=True
            )
            config = json.loads(result.stdout)

            if config.get("env", {}).get("OPENAI_API_KEY"):
                return ("openai", config["env"]["OPENAI_API_KEY"], "gpt-4o-mini")

            if config.get("env", {}).get("ANTHROPIC_API_KEY"):
                return ("anthropic", config["env"]["ANTHROPIC_API_KEY"], "claude-sonnet-4-5-20250514")

        except Exception:
            pass

        return ("none", "", "")

    def is_available(self) -> bool:
        return self.provider != "none"

    def analyze(
        self,
        skill_path: str,
        metadata: dict | None,
        files: list[dict],
        file_contents: dict[str, str],
    ) -> dict | None:
        """Synchronous wrapper around async analyze."""
        import asyncio
        return asyncio.run(self.analyze_async(skill_path, metadata, files, file_contents))

    async def analyze_async(
        self,
        skill_path: str,
        metadata: dict | None,
        files: list[dict],
        file_contents: dict[str, str],
    ) -> dict | None:
        if not self.is_available():
            return None

        start_time = time.time()

        # Generate random hex delimiter for prompt injection protection
        delimiter = f"<<<SKILL_CONTENT_{secrets.token_hex(16)}>>>"

        # Pre-check: if any file content contains the delimiter, flag immediately
        for file_path, content in file_contents.items():
            if delimiter in content:
                return {
                    "verdict": "MALICIOUS",
                    "confidence": 1.0,
                    "severity": "critical",
                    "findings": [
                        {
                            "title": "Delimiter injection detected",
                            "severity": "critical",
                            "category": "prompt-injection",
                            "file": file_path,
                            "evidence": "File content contains the random analysis delimiter",
                            "description": (
                                "The skill file contains the exact random delimiter used to "
                                "separate untrusted content. This is statistically impossible "
                                "without deliberate prompt injection."
                            ),
                        }
                    ],
                    "overall_assessment": "Skill actively attempts to escape the analysis sandbox via delimiter injection.",
                    "primary_threats": ["prompt-injection"],
                    "model": self.model,
                    "provider": self.provider,
                    "latencyMs": int((time.time() - start_time) * 1000),
                }

        # Build prompts
        system_prompt = "\n".join([
            build_protection_rules(delimiter),
            "",
            THREAT_ANALYSIS_PROMPT,
        ])
        user_prompt = build_user_prompt(delimiter, metadata, files, file_contents)

        # Call the LLM
        raw_response = None
        try:
            raw_response = await self.call_llm(system_prompt, user_prompt)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                import asyncio
                await asyncio.sleep(2)
                try:
                    raw_response = await self.call_llm(system_prompt, user_prompt)
                except Exception as retry_err:
                    return self._error_result(retry_err, start_time)
            else:
                return self._error_result(exc, start_time)
        except Exception as err:
            return self._error_result(err, start_time)

        parsed = self._parse_response(raw_response)
        parsed["model"] = self.model
        parsed["provider"] = self.provider
        parsed["latencyMs"] = int((time.time() - start_time) * 1000)

        return parsed

    async def call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Make an LLM API call and return raw response text.

        Public so that other analyzers (meta, alignment) can reuse the
        same HTTP/provider logic.
        """
        if self.provider == "openai":
            return await self._call_openai(system_prompt, user_prompt)
        elif self.provider == "anthropic":
            return await self._call_anthropic(system_prompt, user_prompt)
        raise RuntimeError("No LLM provider available")

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")

    async def _call_anthropic(self, system_prompt: str, user_prompt: str) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": self.temperature,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("content", [{}])
            return content[0].get("text", "") if content else ""

    def _parse_response(self, raw: str | None) -> dict:
        if not raw or not isinstance(raw, str):
            return self._suspicious_parse_result("Empty response from LLM")

        cleaned = raw.strip()
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()

        # Try direct JSON parse
        try:
            parsed = json.loads(cleaned)
            return self._validate_result(parsed)
        except (json.JSONDecodeError, ValueError):
            pass

        # Fallback: extract JSON object
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            try:
                parsed = json.loads(m.group(0))
                return self._validate_result(parsed)
            except (json.JSONDecodeError, ValueError):
                pass

        return self._suspicious_parse_result("Failed to parse LLM response as JSON")

    @staticmethod
    def _validate_result(parsed: dict) -> dict:
        valid_verdicts = {"SAFE", "SUSPICIOUS", "MALICIOUS"}
        valid_severities = {"none", "low", "medium", "high", "critical"}

        verdict = parsed.get("verdict", "SUSPICIOUS")
        if verdict not in valid_verdicts:
            verdict = "SUSPICIOUS"

        confidence = parsed.get("confidence", 0.5)
        if not isinstance(confidence, (int, float)):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))

        severity = parsed.get("severity", "medium")
        if severity not in valid_severities:
            severity = "medium"

        findings = parsed.get("findings", [])
        if not isinstance(findings, list):
            findings = []

        overall_assessment = parsed.get("overall_assessment", "No assessment provided")
        if not isinstance(overall_assessment, str):
            overall_assessment = "No assessment provided"

        primary_threats = parsed.get("primary_threats", [])
        if not isinstance(primary_threats, list):
            primary_threats = []

        return {
            "verdict": verdict,
            "confidence": confidence,
            "severity": severity,
            "findings": findings,
            "overall_assessment": overall_assessment,
            "primary_threats": primary_threats,
        }

    @staticmethod
    def _suspicious_parse_result(reason: str) -> dict:
        return {
            "verdict": "SUSPICIOUS",
            "confidence": 0.3,
            "severity": "medium",
            "findings": [
                {
                    "title": "LLM response parse failure",
                    "severity": "medium",
                    "category": "behavioral",
                    "file": "(llm-response)",
                    "evidence": reason,
                    "description": (
                        "The LLM response could not be parsed. This may indicate "
                        "the analyzed skill disrupted the analysis prompt."
                    ),
                }
            ],
            "overall_assessment": reason,
            "primary_threats": [],
        }

    def _error_result(self, err: Exception, start_time: float) -> dict:
        return {
            "verdict": "ERROR",
            "confidence": 0,
            "severity": "none",
            "findings": [],
            "overall_assessment": f"LLM analysis failed: {err}",
            "primary_threats": [],
            "model": self.model,
            "provider": self.provider,
            "latencyMs": int((time.time() - start_time) * 1000),
            "error": str(err),
        }
