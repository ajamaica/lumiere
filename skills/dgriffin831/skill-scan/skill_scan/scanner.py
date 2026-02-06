"""
SkillGuard Scanner v0.3 — Hardened Core Engine (Python port)

Four-layer analysis:
1. Pattern matching (fast, catches obvious threats)
2. AST/evasion analysis (catches obfuscation and tricks)
3. Prompt injection analysis (catches social engineering)
4. LLM deep semantic analysis (optional, catches subtle/novel threats)

Plus: context-aware scoring that reduces false positives
"""

from __future__ import annotations

import asyncio
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .ast_analyzer import ASTAnalyzer
from .prompt_analyzer import PromptAnalyzer
from .llm_analyzer import LLMAnalyzer

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CODE_EXTENSIONS = {
    '.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx',
    '.py', '.pyw',
    '.sh', '.bash', '.zsh',
    '.rb', '.pl',
}

TEXT_EXTENSIONS = {
    '.json', '.yaml', '.yml', '.toml',
    '.md', '.txt', '.rst',
    '.env', '.env.example',
    '.cfg', '.ini', '.conf',
}

BINARY_EXTENSIONS = {
    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
    '.wasm', '.node', '.o', '.a',
}

# Max bytes to read per file (prevents memory spikes / oversized LLM payloads)
MAX_FILE_BYTES = 1_000_000

# Known-good network targets (reduce false positives)
KNOWN_GOOD_APIS = [
    'wttr.in', 'api.github.com', 'registry.npmjs.org',
    'pypi.org', 'api.openai.com', 'api.anthropic.com',
    'api.weather.gov', 'googleapis.com', 'api.telegram.org',
]

# Directories to skip during walk
_SKIP_DIRS = {'node_modules', '.git', '__pycache__', 'venv', '.venv'}

# Allowed hidden file names (not flagged as suspicious)
_ALLOWED_HIDDEN = {
    '.gitignore', '.env.example', '.eslintrc', '.prettierrc',
    'gitignore',
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _line_number(content: str, offset: int) -> int:
    """Return 1-based line number for *offset* within *content*."""
    return content[:offset].count('\n') + 1


def _get_line(content: str, line_num: int) -> str:
    """Return the (1-based) *line_num*-th line from *content*, stripped."""
    lines = content.split('\n')
    if 1 <= line_num <= len(lines):
        return lines[line_num - 1].strip()
    return ''


# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

class SkillScanner:
    """Core scanner implementing four-layer skill analysis."""

    def __init__(self, rules: list[dict], options: dict | None = None):
        options = options or {}
        self.rules = rules

        # Pre-compile rule patterns
        self.compiled_rules: list[dict] = []
        for rule in rules:
            compiled = [re.compile(p, re.IGNORECASE) for p in rule['patterns']]
            self.compiled_rules.append({**rule, 'compiled': compiled})

        self.ast_analyzer = ASTAnalyzer()
        self.prompt_analyzer = PromptAnalyzer()

        # LLM options: { llm: True, llmOnly: True, llmAuto: True }
        self.llm_options = {
            'enabled': bool(options.get('llm') or options.get('llmOnly') or options.get('llmAuto')),
            'llmOnly': bool(options.get('llmOnly')),
            'llmAuto': bool(options.get('llmAuto')),
        }

        self.llm_analyzer: LLMAnalyzer | None = None
        if self.llm_options['enabled']:
            self.llm_analyzer = LLMAnalyzer()

    # ------------------------------------------------------------------
    # Full skill directory scan
    # ------------------------------------------------------------------

    def scan_directory(self, skill_path: str) -> dict:
        """Full skill directory scan — four-layer analysis."""
        report: dict[str, Any] = {
            'path': skill_path,
            'scannedAt': datetime.now(timezone.utc).isoformat(),
            'version': '0.2.0',
            'files': [],
            'findings': [],
            'score': 100,
            'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'info': 0},
            'metadata': None,
            'flags': [],
            'declaredCapabilities': {},
            'behavioralSignatures': [],
        }

        skill_path_p = Path(skill_path)

        # Parse SKILL.md
        skill_md_path = str(skill_path_p / 'SKILL.md')
        skill_md, skill_md_err, skill_md_truncated = self.read_file_safe(
            skill_md_path,
            max_bytes=MAX_FILE_BYTES,
        )
        if skill_md_err:
            report['findings'].append({
                'ruleId': 'READ_ERROR',
                'severity': 'medium',
                'category': 'suspicious-file',
                'title': 'SKILL.md could not be read (may hide malicious content)',
                'file': 'SKILL.md',
                'line': 0,
                'context': skill_md_err[:200],
                'weight': 10,
            })
        if skill_md_truncated:
            report['findings'].append({
                'ruleId': 'FILE_TRUNCATED',
                'severity': 'medium',
                'category': 'suspicious-file',
                'title': 'SKILL.md truncated during scan (too large)',
                'file': 'SKILL.md',
                'line': 0,
                'context': f"Truncated at {MAX_FILE_BYTES} bytes",
                'weight': 8,
            })
        if not skill_md:
            report['flags'].append('NO_SKILL_MD')
        else:
            report['metadata'] = self.parse_skill_metadata(skill_md)
            report['declaredCapabilities'] = self.extract_declared_capabilities(report['metadata'])

            # Run prompt analysis on SKILL.md (common injection target)
            prompt_findings = self.prompt_analyzer.analyze(skill_md, 'SKILL.md')
            report['findings'].extend(prompt_findings)

        # Enumerate files
        files = self.walk_directory(skill_path)
        report['files'] = [
            {'path': f['relativePath'], 'size': f['size'], 'type': f['type']}
            for f in files
        ]

        # Check file structure
        self.check_file_structure(files, report)

        # Layers 1-3: Pattern, AST, and Prompt analysis (skip in llm-only mode)
        if not self.llm_options['llmOnly']:
            for file_info in files:
                if file_info['type'] == 'binary':
                    report['findings'].append({
                        'ruleId': 'BINARY_FILE',
                        'severity': 'high',
                        'category': 'suspicious-file',
                        'title': 'Binary file included in skill package',
                        'file': file_info['relativePath'],
                        'line': 0,
                        'context': f"Binary file: {file_info['relativePath']} ({file_info['size']} bytes)",
                        'weight': 15,
                    })
                    continue

                if file_info['type'] in ('directory-skipped', 'symlink'):
                    continue

                content, read_err, truncated = self.read_file_safe(
                    file_info['absolutePath'],
                    max_bytes=MAX_FILE_BYTES,
                )
                if read_err:
                    report['findings'].append({
                        'ruleId': 'READ_ERROR',
                        'severity': 'medium',
                        'category': 'suspicious-file',
                        'title': 'File could not be read (may hide malicious content)',
                        'file': file_info['relativePath'],
                        'line': 0,
                        'context': read_err[:200],
                        'weight': 10,
                    })
                if truncated:
                    report['findings'].append({
                        'ruleId': 'FILE_TRUNCATED',
                        'severity': 'medium',
                        'category': 'suspicious-file',
                        'title': 'File truncated during scan (too large)',
                        'file': file_info['relativePath'],
                        'line': 0,
                        'context': f"Truncated at {MAX_FILE_BYTES} bytes",
                        'weight': 8,
                    })
                if not content:
                    continue

                # Layer 1: Pattern matching
                self.pattern_scan(content, file_info['relativePath'], report)

                # Layer 2: AST/evasion analysis (JS/TS files)
                ext = Path(file_info['relativePath']).suffix.lower()
                if ext in CODE_EXTENSIONS and (
                    ext.startswith('.j') or ext.startswith('.t')
                    or ext.startswith('.m') or ext.startswith('.c')
                ):
                    ast_findings = self.ast_analyzer.analyze(content, file_info['relativePath'])
                    report['findings'].extend(ast_findings)

                # Layer 3: Prompt injection analysis (text/markdown files)
                if ext in TEXT_EXTENSIONS or ext == '.md':
                    if file_info['relativePath'] != 'SKILL.md':  # Already scanned above
                        prompt_findings = self.prompt_analyzer.analyze(content, file_info['relativePath'])
                        report['findings'].extend(prompt_findings)

                # Python-specific evasion detection
                if ext in ('.py', '.pyw'):
                    self.python_analysis(content, file_info['relativePath'], report)

                # Shell script analysis
                if ext in ('.sh', '.bash', '.zsh'):
                    self.shell_analysis(content, file_info['relativePath'], report)

            # Deduplicate
            report['findings'] = self.deduplicate_findings(report['findings'])

            # Detect behavioral signatures first (needs raw findings)
            self.detect_behavioral_signatures(report)

            # Context-aware scoring adjustments (may suppress behavioral findings too)
            self.apply_context_scoring(report)

            # Aggregate repeated findings — same rule in same file counts once
            self.aggregate_findings(report)

            # Re-check behavioral suppression after aggregation
            self.recheck_behavioral_suppression(report)

        # Calculate final score (pattern-based)
        self.calculate_score(report)

        # Layer 4: LLM deep semantic analysis (optional)
        if (
            self.llm_options['enabled']
            and self.llm_analyzer is not None
            and self.llm_analyzer.is_available()
        ):
            should_run_llm = (
                self.llm_options['llmOnly']
                or not self.llm_options['llmAuto']
                or (
                    self.llm_options['llmAuto']
                    and report.get('risk') in ('MEDIUM', 'HIGH', 'CRITICAL')
                )
            )

            if should_run_llm:
                # Collect file contents for LLM analysis
                file_contents: dict[str, str] = {}
                for file_info in files:
                    if file_info['type'] in ('binary', 'directory-skipped', 'symlink'):
                        continue
                    if file_info['size'] > MAX_FILE_BYTES:
                        continue
                    fc, _, _ = self.read_file_safe(file_info['absolutePath'], max_bytes=MAX_FILE_BYTES)
                    if fc:
                        file_contents[file_info['relativePath']] = fc

                llm_result = asyncio.run(
                    self.llm_analyzer.analyze(
                        skill_path, report['metadata'], report['files'], file_contents
                    )
                )

                if llm_result:
                    report['llmAnalysis'] = {
                        'verdict': llm_result.get('verdict'),
                        'confidence': llm_result.get('confidence'),
                        'model': llm_result.get('model'),
                        'provider': llm_result.get('provider'),
                        'latencyMs': llm_result.get('latencyMs'),
                        'overall_assessment': llm_result.get('overall_assessment'),
                        'primary_threats': llm_result.get('primary_threats'),
                        'error': llm_result.get('error'),
                    }

                    # Merge LLM findings into report (unless ERROR)
                    if llm_result.get('verdict') != 'ERROR':
                        self.merge_llm_findings(report, llm_result)
                        # Recalculate score with merged findings
                        self.calculate_score(report)

                # Layer 5a: Alignment verification
                if file_contents:
                    from .alignment_analyzer import AlignmentAnalyzer
                    alignment = AlignmentAnalyzer()
                    alignment_result = alignment.analyze(
                        report['metadata'], skill_md or '', file_contents, self.llm_analyzer
                    )
                    if alignment_result:
                        report['alignmentAnalysis'] = alignment_result
                        # Add mismatch findings
                        mismatch_findings = alignment.to_findings(alignment_result)
                        report['findings'].extend(mismatch_findings)
                        # Add behavioral signature for non-aligned skills
                        if not alignment_result.get('aligned'):
                            report['behavioralSignatures'].append({
                                'name': 'DESCRIPTION_MISMATCH',
                                'description': 'Code behavior does not match SKILL.md description',
                                'severity': 'high',
                                'confidence': alignment_result.get('confidence', 'MEDIUM').lower(),
                            })
                        self.calculate_score(report)

                # Layer 5b: Meta-analysis (reviews ALL findings including alignment)
                from .meta_analyzer import MetaAnalyzer
                meta = MetaAnalyzer()
                meta_result = meta.analyze(report, file_contents, self.llm_analyzer)
                if meta_result:
                    meta.apply_to_report(report, meta_result)
                    # Recalculate final score after FP filtering / severity adjustments
                    self.calculate_score(report)

        return report

    # ------------------------------------------------------------------
    # Merge LLM findings
    # ------------------------------------------------------------------

    def merge_llm_findings(self, report: dict, llm_result: dict) -> None:
        """Merge LLM findings into the report.

        - LLM can freely upgrade severity
        - LLM can downgrade only with confidence >= 0.8, one level max
        """
        severity_order = ['none', 'info', 'low', 'medium', 'high', 'critical']

        # Add LLM-specific findings with [LLM] prefix
        for finding in llm_result.get('findings', []):
            category_raw = (finding.get('category') or 'ANALYSIS').upper()
            rule_id = 'LLM_' + re.sub(r'[^A-Z0-9]', '_', category_raw)
            report['findings'].append({
                'ruleId': rule_id,
                'severity': finding.get('severity', 'medium'),
                'category': finding.get('category', 'behavioral'),
                'title': f"[LLM] {finding.get('title', '')}",
                'file': finding.get('file', '(llm-analysis)'),
                'line': 0,
                'match': (finding.get('evidence') or '')[:80],
                'context': (finding.get('description') or '')[:200],
                'weight': self._llm_severity_weight(finding.get('severity')),
                'source': 'llm',
            })

        # Severity adjustment: LLM verdict can influence overall risk
        if llm_result.get('confidence', 0) >= 0.8 and llm_result.get('verdict') == 'SAFE':
            current_risk = (report.get('risk') or 'low').lower()
            current_idx = severity_order.index(current_risk) if current_risk in severity_order else 0
            if current_idx > 0:
                report['score'] = min(100, report['score'] + 10)

    @staticmethod
    def _llm_severity_weight(severity: str | None) -> int:
        """Map LLM severity to finding weight."""
        weights = {'critical': 25, 'high': 15, 'medium': 8, 'low': 3, 'info': 0}
        return weights.get(severity or 'medium', 8)

    # ------------------------------------------------------------------
    # Scan arbitrary content
    # ------------------------------------------------------------------

    def scan_content(self, content: str, source: str = 'unknown') -> list[dict]:
        """Scan arbitrary text content (messages, posts, etc.)."""
        findings: list[dict] = []
        lines = content.split('\n')

        for rule in self.compiled_rules:
            for regex in rule['compiled']:
                for m in regex.finditer(content):
                    line_num = _line_number(content, m.start())
                    findings.append({
                        'ruleId': rule['id'],
                        'severity': rule['severity'],
                        'category': rule['category'],
                        'title': rule['title'],
                        'file': source,
                        'line': line_num,
                        'match': m.group(0)[:80],
                        'context': (lines[line_num - 1] if line_num - 1 < len(lines) else '').strip()[:200],
                        'weight': rule['weight'],
                    })

        # Prompt injection analysis
        prompt_findings = self.prompt_analyzer.analyze(content, source)
        findings.extend(prompt_findings)

        return self.deduplicate_findings(findings)

    # ------------------------------------------------------------------
    # Layer 1: Pattern matching scan
    # ------------------------------------------------------------------

    def pattern_scan(self, content: str, file_path: str, report: dict) -> None:
        """Layer 1: regex-based pattern matching."""
        lines = content.split('\n')
        ext = Path(file_path).suffix.lower().lstrip('.')

        for rule in self.compiled_rules:
            rule_langs = rule['languages']
            if '*' not in rule_langs and ext not in rule_langs:
                continue

            for regex in rule['compiled']:
                for m in regex.finditer(content):
                    line_num = _line_number(content, m.start())
                    line_content = (lines[line_num - 1] if line_num - 1 < len(lines) else '').strip()

                    report['findings'].append({
                        'ruleId': rule['id'],
                        'severity': rule['severity'],
                        'category': rule['category'],
                        'title': rule['title'],
                        'file': file_path,
                        'line': line_num,
                        'match': m.group(0)[:80],
                        'context': line_content[:200],
                        'weight': rule['weight'],
                    })

    # ------------------------------------------------------------------
    # Python-specific evasion detection
    # ------------------------------------------------------------------

    def python_analysis(self, content: str, file_path: str, report: dict) -> None:
        """Detect Python-specific evasion techniques."""
        checks = [
            (r'\b__import__\s*\(', 'Dynamic __import__() — bypasses static import analysis', 'critical', 25),
            (r'\bgetattr\s*\([^,]+,\s*[\'"]', 'getattr() — dynamic attribute access may evade analysis', 'high', 15),
            (r'\bcompile\s*\([^)]+[\'"]exec[\'"]', 'compile() with exec mode — dynamic code execution', 'critical', 25),
            (r'\bpickle\s*\.\s*loads?\s*\(', 'pickle deserialization — can execute arbitrary code', 'critical', 30),
            (r'\bmarshall?\s*\.\s*loads?\s*\(', 'marshal deserialization — can execute arbitrary code', 'critical', 30),
            (r'\bsubprocess\s*\.\s*(?:call|run|Popen|check_output)', 'subprocess execution', 'high', 15),
            (r'\bctypes\s*\.\s*(?:cdll|windll|CDLL)', 'ctypes foreign function interface — native code execution', 'critical', 25),
            (r'\bos\s*\.\s*system\s*\(', 'os.system() — shell command execution', 'critical', 25),
            (r'\bos\s*\.\s*popen\s*\(', 'os.popen() — shell command execution', 'critical', 25),
            (r'\b(?:yaml\s*\.\s*(?:load|unsafe_load))\s*\(', 'Unsafe YAML loading — can execute arbitrary code', 'critical', 25),
        ]

        lines = content.split('\n')
        for pattern, msg, severity, weight in checks:
            regex = re.compile(pattern)
            for m in regex.finditer(content):
                line_num = _line_number(content, m.start())
                rule_id = 'PYTHON_' + msg.split(' ')[0].upper()
                report['findings'].append({
                    'ruleId': rule_id,
                    'severity': severity,
                    'category': 'code-execution',
                    'title': msg,
                    'file': file_path,
                    'line': line_num,
                    'match': m.group(0),
                    'context': (lines[line_num - 1] if line_num - 1 < len(lines) else '').strip()[:200],
                    'weight': weight,
                })

    # ------------------------------------------------------------------
    # Shell script analysis
    # ------------------------------------------------------------------

    def shell_analysis(self, content: str, file_path: str, report: dict) -> None:
        """Detect dangerous shell patterns."""
        checks = [
            (r'\bcurl\s+[^|]*\|\s*(?:bash|sh|zsh)', 'Pipe curl to shell — remote code execution', 'critical', 30),
            (r'\bwget\s+[^|]*\|\s*(?:bash|sh|zsh)', 'Pipe wget to shell — remote code execution', 'critical', 30),
            (r'\beval\s+"\$\(', 'eval with command substitution', 'critical', 25),
            (r'\bbase64\s+(?:-d|--decode)', 'Base64 decode in shell — may hide payload', 'high', 20),
            (r'\bnc\s+(?:-[elp]|--listen)', 'Netcat listener — reverse shell indicator', 'critical', 30),
            (r'/dev/tcp/', 'Bash /dev/tcp — network connection without external tools', 'critical', 30),
            (r'\bmkfifo\b.*\bnc\b|\bnc\b.*\bmkfifo\b', 'Named pipe + netcat — reverse shell pattern', 'critical', 30),
        ]

        lines = content.split('\n')
        for pattern, msg, severity, weight in checks:
            regex = re.compile(pattern)
            for m in regex.finditer(content):
                line_num = _line_number(content, m.start())
                report['findings'].append({
                    'ruleId': f'SHELL_{severity.upper()}',
                    'severity': severity,
                    'category': 'code-execution',
                    'title': msg,
                    'file': file_path,
                    'line': line_num,
                    'match': m.group(0),
                    'context': (lines[line_num - 1] if line_num - 1 < len(lines) else '').strip()[:200],
                    'weight': weight,
                })

    # ------------------------------------------------------------------
    # Context-aware scoring adjustments
    # ------------------------------------------------------------------

    def apply_context_scoring(self, report: dict) -> None:
        """Apply context-aware scoring adjustments.

        The core insight: a legit API skill MUST read tokens and make network
        calls.  What matters is WHERE the data goes and WHETHER capabilities
        are declared.
        """
        declared = report.get('declaredCapabilities', {})
        all_contexts = ' '.join(
            (f.get('context', '') + ' ' + f.get('match', '')) for f in report['findings']
        )

        # Check if network calls target known-good APIs
        targets_known_api = any(api in all_contexts for api in KNOWN_GOOD_APIS)

        # Build a map of constant string values from all scanned files
        # Helps resolve variables like `const API_BASE = 'https://api.github.com'`
        resolved_urls: set[str] = set()
        for file_entry in report['files']:
            if file_entry['type'] in ('code', 'text'):
                file_content, _, _ = self.read_file_safe(
                    str(Path(report['path']) / file_entry['path']),
                    max_bytes=MAX_FILE_BYTES,
                )
                if file_content:
                    url_pattern = re.compile(
                        r"""(?:const|let|var)\s+\w+\s*=\s*['"`](https?://[^'"`\s]+)['"`]"""
                    )
                    for url_m in url_pattern.finditer(file_content):
                        resolved_urls.add(url_m.group(1))

        # Check if any resolved URLs point to known-good APIs
        file_targets_known_api = any(
            any(api in url for api in KNOWN_GOOD_APIS)
            for url in resolved_urls
        )

        # Check if credential access matches declared env vars
        declared_env_vars = declared.get('env', [])

        for finding in report['findings']:
            # === CREDENTIAL ACCESS ===
            if finding.get('ruleId') == 'CRED_ACCESS' or finding.get('category') == 'credential-theft':
                # If the specific env var is declared in metadata, this is expected behavior
                accesses_declared_var = any(
                    env_var in finding.get('context', '') or env_var in finding.get('match', '')
                    for env_var in declared_env_vars
                )

                if accesses_declared_var:
                    finding['weight'] = max(1, math.floor(finding['weight'] * 0.1))  # 90% reduction
                    finding['contextNote'] = 'Accesses declared env var — expected behavior'
                    finding['severity'] = 'info'
                    continue

                # process.env.SPECIFIC_VAR (not iterating all env) is less suspicious
                ctx = finding.get('context', '')
                if re.search(r'process\.env\.\w+', ctx) and 'Object.entries' not in ctx:
                    finding['weight'] = max(2, math.floor(finding['weight'] * 0.4))
                    finding['contextNote'] = 'Specific env var access (not harvesting)'
                    if finding['severity'] == 'critical':
                        finding['severity'] = 'medium'

                # api_key / api-key as variable name, function param, or dict key in code
                match_text = finding.get('match', '')
                if re.search(r'api[_-]?key', match_text, re.IGNORECASE) and re.search(
                    r'\.(py|js|ts|rb)$', finding.get('file', '')
                ):
                    ctx_lower = ctx.lower()
                    is_variable_usage = (
                        bool(re.search(r'(?:def |self\.|=|,|\(|:)\s*api[_-]?key', ctx_lower, re.IGNORECASE))
                        or bool(re.search(r'api[_-]?key\s*[=:]', ctx_lower, re.IGNORECASE))
                        or bool(re.search(r'headers|params|config|settings|options', ctx_lower, re.IGNORECASE))
                    )
                    if is_variable_usage:
                        finding['weight'] = max(2, math.floor(finding['weight'] * 0.3))
                        finding['contextNote'] = 'API key as variable/parameter — standard code pattern'
                        finding['severity'] = 'medium'

            # === OBFUSCATION — context-aware ===
            if finding.get('ruleId') == 'OBFUSCATION' and re.search(r'base64', finding.get('match', ''), re.IGNORECASE):
                is_media_script = bool(re.search(
                    r'image|photo|media|picture|visual|gen|generate|draw|paint',
                    finding.get('file', '') + ' ' + (report.get('metadata') or {}).get('description', ''),
                    re.IGNORECASE,
                ))
                if is_media_script:
                    finding['weight'] = max(2, math.floor(finding['weight'] * 0.2))
                    finding['contextNote'] = 'base64 in image/media context — standard encoding, not obfuscation'
                    finding['severity'] = 'low'

            # === NETWORK ACTIVITY ===
            if finding.get('category') == 'data-exfiltration' or finding.get('ruleId') == 'NETWORK_EXFIL':
                matched_good = (
                    any(
                        api in finding.get('context', '') or api in finding.get('match', '')
                        for api in KNOWN_GOOD_APIS
                    )
                    or file_targets_known_api
                )

                # Skill describes itself as API-related + code uses standard HTTP libs
                desc = (report.get('metadata') or {}).get('description', '')
                desc_mentions_api = bool(re.search(
                    r'\bapi\b|fetch|http|endpoint|service|query|search', desc, re.IGNORECASE
                ))
                is_standard_http_lib = bool(re.search(
                    r'\b(httpx|requests|axios|fetch|urllib|http\.client)\b',
                    finding.get('context', '') + ' ' + finding.get('match', ''),
                ))

                if matched_good and declared.get('network'):
                    finding['weight'] = max(1, math.floor(finding['weight'] * 0.1))  # 90% reduction
                    finding['contextNote'] = 'Known-good API + declared network capability'
                    finding['severity'] = 'info'
                elif matched_good:
                    finding['weight'] = max(1, math.floor(finding['weight'] * 0.2))  # 80% reduction
                    finding['contextNote'] = 'Known-good API'
                    finding['severity'] = 'low'
                elif declared.get('network'):
                    finding['weight'] = max(2, math.floor(finding['weight'] * 0.5))
                    finding['contextNote'] = 'Declared network capability'
                elif desc_mentions_api and is_standard_http_lib:
                    finding['weight'] = max(2, math.floor(finding['weight'] * 0.3))
                    finding['contextNote'] = 'API skill using standard HTTP library'
                    finding['severity'] = 'medium' if finding['severity'] == 'critical' else 'low'

            # === FILESYSTEM ===
            if declared.get('filesystem') and finding.get('category') == 'filesystem':
                finding['weight'] = max(2, math.floor(finding['weight'] * 0.5))
                finding['contextNote'] = 'Declared filesystem capability'

            # === COMMENTS/DOCUMENTATION ===
            ctx = finding.get('context', '')
            if (
                ctx.startswith('//')
                or ctx.startswith('#')
                or ctx.startswith('*')
                or ctx.startswith('/*')
            ):
                if finding.get('category') != 'prompt-injection':
                    finding['weight'] = max(1, math.floor(finding['weight'] * 0.3))
                    finding['contextNote'] = (finding.get('contextNote') or '') + ' (in comment)'
                    if finding['severity'] == 'critical':
                        finding['severity'] = 'medium'
                    elif finding['severity'] == 'high':
                        finding['severity'] = 'low'

            # === DOCUMENTATION FILES ===
            is_doc_file = bool(re.search(
                r'^(SKILL\.md|README|CHANGELOG|LICENSE|.*README.*\.md|SERVER_README)',
                finding.get('file', ''),
                re.IGNORECASE,
            ))
            if is_doc_file and finding.get('category') != 'prompt-injection':
                finding['weight'] = max(1, math.floor(finding['weight'] * 0.1))
                finding['contextNote'] = (finding.get('contextNote') or '') + ' (in documentation)'
                finding['severity'] = 'info'

            # SKILL.md frontmatter (---) is metadata, never dangerous
            if finding.get('file') == 'SKILL.md' and finding.get('context', '').startswith('---'):
                finding['weight'] = 0
                finding['contextNote'] = 'YAML frontmatter — metadata only'
                finding['severity'] = 'info'

            # Prompt injection in SKILL.md frontmatter specifically
            if finding.get('file') == 'SKILL.md' and finding.get('category') == 'prompt-injection':
                line_num = finding.get('line', 0)
                if report.get('metadata') and line_num <= 10:
                    finding['weight'] = max(0, math.floor(finding['weight'] * 0.05))
                    finding['contextNote'] = 'In SKILL.md frontmatter — not injection'
                    finding['severity'] = 'info'

        # === BEHAVIORAL COMPOUND ADJUSTMENTS ===
        cred_findings = [
            f for f in report['findings']
            if (f.get('category') == 'credential-theft' or f.get('ruleId') == 'CRED_ACCESS')
            and f.get('weight', 0) > 0
        ]
        all_cred_declared = all(
            f.get('severity') == 'info'
            or 'declared' in (f.get('contextNote') or '')
            or 'standard code' in (f.get('contextNote') or '')
            for f in cred_findings
        ) if cred_findings else True

        net_findings = [
            f for f in report['findings']
            if (f.get('category') == 'data-exfiltration' or f.get('ruleId') == 'NETWORK_EXFIL')
            and f.get('weight', 0) > 0
        ]
        all_network_known = all(
            f.get('severity') in ('info', 'low')
            or 'Declared' in (f.get('contextNote') or '')
            or 'Known-good' in (f.get('contextNote') or '')
            or 'API skill' in (f.get('contextNote') or '')
            for f in net_findings
        ) if net_findings else True

        if all_cred_declared and all_network_known:
            for finding in report['findings']:
                if finding.get('category') == 'behavioral':
                    finding['weight'] = max(1, math.floor(finding['weight'] * 0.1))
                    finding['contextNote'] = 'Suppressed — all access is declared/known-good'
                    finding['severity'] = 'info'
            for sig in report['behavioralSignatures']:
                sig['suppressed'] = True
                sig['note'] = 'All underlying access is declared/known-good'

    # ------------------------------------------------------------------
    # Detect compound behavioral signatures
    # ------------------------------------------------------------------

    def detect_behavioral_signatures(self, report: dict) -> None:
        """Detect compound behavioral signatures.

        Patterns of activity that together indicate malicious intent.
        """
        categories = {f.get('category') for f in report['findings']}
        rule_ids = {f.get('ruleId') for f in report['findings']}

        # Signature: Data Exfiltration
        if (
            ('credential-theft' in categories or 'CRED_ACCESS' in rule_ids)
            and ('data-exfiltration' in categories or 'NETWORK_EXFIL' in rule_ids)
        ):
            report['behavioralSignatures'].append({
                'name': 'DATA_EXFILTRATION',
                'description': 'Credential access combined with network activity — classic exfiltration pattern',
                'severity': 'critical',
                'confidence': 'high',
            })
            report['findings'].append({
                'ruleId': 'BEHAVIORAL_EXFIL',
                'severity': 'critical',
                'category': 'behavioral',
                'title': '\u26a0\ufe0f BEHAVIORAL: Credential read + network send = data exfiltration signature',
                'file': '(compound)',
                'line': 0,
                'match': '',
                'context': 'Multiple files/patterns combine to form exfiltration behavior',
                'weight': 30,
            })

        # Signature: Trojan Skill
        if (
            'PROMPT_INJECTION' in rule_ids
            and ('code-execution' in categories or 'EXEC_CALL' in rule_ids)
        ):
            report['behavioralSignatures'].append({
                'name': 'TROJAN_SKILL',
                'description': 'Prompt injection + code execution — skill injects instructions and executes code',
                'severity': 'critical',
                'confidence': 'high',
            })

        # Signature: Evasive Malware
        if (
            (
                'STRING_CONSTRUCTION' in rule_ids
                or 'ENCODED_STRING' in rule_ids
                or 'FUNCTION_ALIAS' in rule_ids
                or 'DYNAMIC_IMPORT' in rule_ids
            )
            and ('code-execution' in categories or 'credential-theft' in categories)
        ):
            report['behavioralSignatures'].append({
                'name': 'EVASIVE_MALWARE',
                'description': 'Code obfuscation/evasion + dangerous behavior — actively trying to hide malicious intent',
                'severity': 'critical',
                'confidence': 'high',
            })
            report['findings'].append({
                'ruleId': 'BEHAVIORAL_EVASIVE',
                'severity': 'critical',
                'category': 'behavioral',
                'title': '\u26a0\ufe0f BEHAVIORAL: Evasion techniques + dangerous operations = evasive malware signature',
                'file': '(compound)',
                'line': 0,
                'match': '',
                'context': 'Skill uses obfuscation to hide dangerous behavior',
                'weight': 35,
            })

        # Signature: Persistent Backdoor
        if (
            'persistence' in categories
            and ('code-execution' in categories or 'data-exfiltration' in categories)
        ):
            report['behavioralSignatures'].append({
                'name': 'PERSISTENT_BACKDOOR',
                'description': 'Persistence mechanism + code execution/exfiltration — establishes ongoing unauthorized access',
                'severity': 'critical',
                'confidence': 'high',
            })

    # ------------------------------------------------------------------
    # Extract declared capabilities from metadata
    # ------------------------------------------------------------------

    def extract_declared_capabilities(self, metadata: dict | None) -> dict:
        """Extract declared capabilities from SKILL.md metadata."""
        caps: dict[str, Any] = {'network': False, 'filesystem': False, 'exec': False, 'env': []}
        if not metadata:
            return caps

        oc_meta = (metadata.get('metadata') or {}).get('openclaw') or metadata.get('openclaw')
        if not oc_meta:
            return caps

        requires = oc_meta.get('requires', {})
        bins = requires.get('bins', [])
        env = requires.get('env', [])

        if any(b in bins for b in ('curl', 'wget', 'httpie')):
            caps['network'] = True
        if env:
            caps['env'] = list(env)

        # Check description for network/filesystem hints
        desc = (metadata.get('description') or '').lower()
        if any(kw in desc for kw in ('api', 'fetch', 'http', 'web')):
            caps['network'] = True
        if any(kw in desc for kw in ('file', 'read', 'write', 'save')):
            caps['filesystem'] = True

        return caps

    # ------------------------------------------------------------------
    # Parse SKILL.md metadata (YAML frontmatter)
    # ------------------------------------------------------------------

    @staticmethod
    def parse_skill_metadata(content: str) -> dict | None:
        """Parse YAML-like frontmatter from SKILL.md."""
        fm_match = re.match(r'^---\n([\s\S]*?)\n---', content)
        if not fm_match:
            return None

        meta: dict[str, Any] = {}
        for line in fm_match.group(1).split('\n'):
            kv = re.match(r'^(\w+):\s*(.+)', line)
            if kv:
                key = kv.group(1)
                val = kv.group(2).strip()
                try:
                    meta[key] = json.loads(val)
                except (json.JSONDecodeError, ValueError):
                    meta[key] = val
        return meta

    # ------------------------------------------------------------------
    # Check file structure
    # ------------------------------------------------------------------

    def check_file_structure(self, files: list[dict], report: dict) -> None:
        """Inspect the file tree for suspicious structural patterns."""
        for f in files:
            name = Path(f['relativePath']).name
            if name.startswith('.') and name not in _ALLOWED_HIDDEN and name.lstrip('.') not in _ALLOWED_HIDDEN:
                report['findings'].append({
                    'ruleId': 'HIDDEN_FILE',
                    'severity': 'medium',
                    'category': 'suspicious-file',
                    'title': 'Hidden file detected',
                    'file': f['relativePath'],
                    'line': 0,
                    'context': f"Hidden file: {f['relativePath']}",
                    'weight': 10,
                })

        for f in files:
            if f.get('type') == 'symlink':
                report['findings'].append({
                    'ruleId': 'SYMLINK_SKIPPED',
                    'severity': 'high',
                    'category': 'suspicious-file',
                    'title': 'Symlink skipped during scan (potential traversal)',
                    'file': f['relativePath'],
                    'line': 0,
                    'context': f"Symlink: {f['relativePath']}",
                    'weight': 15,
                })

        for f in files:
            if f['size'] > 512_000:
                size_kb = f['size'] / 1024
                report['findings'].append({
                    'ruleId': 'LARGE_FILE',
                    'severity': 'medium',
                    'category': 'suspicious-file',
                    'title': 'Unusually large file for a skill package',
                    'file': f['relativePath'],
                    'line': 0,
                    'context': f"{f['relativePath']}: {size_kb:.0f}KB",
                    'weight': 5,
                })

        has_bundled_deps = any(
            'node_modules/' in f['relativePath'] or '__pycache__/' in f['relativePath']
            for f in files
        )
        if has_bundled_deps:
            report['flags'].append('BUNDLED_DEPS')
            report['findings'].append({
                'ruleId': 'BUNDLED_DEPS',
                'severity': 'high',
                'category': 'suspicious-file',
                'title': 'Bundled dependency directory — could hide malicious packages',
                'file': '(directory)',
                'line': 0,
                'context': 'Skill bundles node_modules or __pycache__',
                'weight': 15,
            })

    # ------------------------------------------------------------------
    # Walk directory (recursive file enumeration)
    # ------------------------------------------------------------------

    def walk_directory(self, dir_path: str, base: str | None = None) -> list[dict]:
        """Recursively enumerate files, classifying by type."""
        if base is None:
            base = dir_path

        results: list[dict] = []
        dir_p = Path(dir_path)
        base_p = Path(base)

        try:
            entries = sorted(dir_p.iterdir())
        except OSError:
            return results

        for entry in entries:
            try:
                relative_path = str(entry.relative_to(base_p))
            except ValueError:
                relative_path = entry.name

            if entry.is_symlink():
                results.append({
                    'relativePath': relative_path,
                    'absolutePath': str(entry),
                    'size': 0,
                    'type': 'symlink',
                })
                continue
            if entry.is_dir():
                if entry.name in _SKIP_DIRS:
                    results.append({
                        'relativePath': relative_path,
                        'absolutePath': str(entry),
                        'size': 0,
                        'type': 'directory-skipped',
                    })
                    continue
                results.extend(self.walk_directory(str(entry), base))
            elif entry.is_file():
                ext = entry.suffix.lower()
                try:
                    size = entry.stat().st_size
                except OSError:
                    size = 0

                if ext in CODE_EXTENSIONS:
                    ftype = 'code'
                elif ext in TEXT_EXTENSIONS:
                    ftype = 'text'
                elif ext in BINARY_EXTENSIONS:
                    ftype = 'binary'
                else:
                    ftype = 'other'

                results.append({
                    'relativePath': relative_path,
                    'absolutePath': str(entry),
                    'size': size,
                    'type': ftype,
                })

        return results

    # ------------------------------------------------------------------
    # Aggregate findings
    # ------------------------------------------------------------------

    def aggregate_findings(self, report: dict) -> None:
        """Aggregate repeated findings.

        Same rule in same file should count as one finding with slightly
        increased weight, not N separate penalties.
        """
        groups: dict[str, list[dict]] = {}
        for finding in report['findings']:
            key = f"{finding.get('ruleId')}:{finding.get('file')}"
            groups.setdefault(key, []).append(finding)

        aggregated: list[dict] = []
        for key, findings in groups.items():
            if len(findings) <= 2:
                aggregated.extend(findings)
            else:
                # 3+ findings of same rule in same file: keep first, suppress rest
                primary = findings[0]
                bonus = min(primary['weight'], math.floor(len(findings) * 1.5))
                primary['weight'] = primary['weight'] + bonus
                primary['contextNote'] = (
                    (primary.get('contextNote') or '') + f' ({len(findings)} occurrences)'
                )
                aggregated.append(primary)

                for f in findings[1:]:
                    f['weight'] = 0
                    f['severity'] = 'info'
                    f['contextNote'] = '(aggregated — counted in primary finding)'
                    aggregated.append(f)

        report['findings'] = aggregated

    # ------------------------------------------------------------------
    # Deduplicate findings
    # ------------------------------------------------------------------

    @staticmethod
    def deduplicate_findings(findings: list[dict]) -> list[dict]:
        """Remove duplicate findings (same rule + file + line)."""
        seen: set[str] = set()
        result: list[dict] = []
        for f in findings:
            key = f"{f.get('ruleId')}:{f.get('file')}:{f.get('line')}"
            if key not in seen:
                seen.add(key)
                result.append(f)
        return result

    # ------------------------------------------------------------------
    # Calculate score
    # ------------------------------------------------------------------

    def calculate_score(self, report: dict) -> None:
        """Calculate the final risk score from findings and flags."""
        deductions = 0
        # Reset summary counts
        report['summary'] = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'info': 0}

        for finding in report['findings']:
            deductions += finding.get('weight', 0)
            sev = finding.get('severity', '')
            if sev in report['summary']:
                report['summary'][sev] += 1

        if 'NO_SKILL_MD' in report.get('flags', []):
            deductions += 10
        if 'BUNDLED_DEPS' in report.get('flags', []):
            deductions += 5

        # Behavioral signatures add extra penalty (unless suppressed)
        for sig in report.get('behavioralSignatures', []):
            if sig.get('suppressed'):
                continue
            if sig.get('severity') == 'critical':
                deductions += 15
            elif sig.get('severity') == 'high':
                deductions += 10

        report['score'] = max(0, 100 - deductions)
        if report['score'] >= 80:
            report['risk'] = 'LOW'
        elif report['score'] >= 50:
            report['risk'] = 'MEDIUM'
        elif report['score'] >= 20:
            report['risk'] = 'HIGH'
        else:
            report['risk'] = 'CRITICAL'

    # ------------------------------------------------------------------
    # Re-check behavioral suppression after aggregation
    # ------------------------------------------------------------------

    def recheck_behavioral_suppression(self, report: dict) -> None:
        """Re-check whether behavioral findings should be suppressed."""
        cred_findings = [
            f for f in report['findings']
            if (f.get('category') == 'credential-theft' or f.get('ruleId') == 'CRED_ACCESS')
            and f.get('weight', 0) > 0
        ]
        net_findings = [
            f for f in report['findings']
            if (f.get('category') == 'data-exfiltration' or f.get('ruleId') == 'NETWORK_EXFIL')
            and f.get('weight', 0) > 0
        ]

        all_cred_ok = (
            len(cred_findings) == 0
            or all(
                f.get('severity') == 'info'
                or 'declared' in (f.get('contextNote') or '')
                or 'standard code' in (f.get('contextNote') or '')
                or 'expected' in (f.get('contextNote') or '')
                for f in cred_findings
            )
        )
        all_net_ok = (
            len(net_findings) == 0
            or all(
                f.get('severity') in ('info', 'low')
                or 'Declared' in (f.get('contextNote') or '')
                or 'Known-good' in (f.get('contextNote') or '')
                or 'API skill' in (f.get('contextNote') or '')
                for f in net_findings
            )
        )

        if all_cred_ok and all_net_ok:
            for f in report['findings']:
                if f.get('category') == 'behavioral' and f.get('weight', 0) > 0:
                    f['weight'] = max(1, math.floor(f['weight'] * 0.1))
                    f['contextNote'] = 'Suppressed — all access is declared/known-good'
                    f['severity'] = 'info'
            for sig in report.get('behavioralSignatures', []):
                sig['suppressed'] = True

    # ------------------------------------------------------------------
    # Safe file read
    # ------------------------------------------------------------------

    @staticmethod
    def read_file_safe(file_path: str, max_bytes: int | None = None) -> tuple[str | None, str | None, bool]:
        """Read a file safely with size cap. Returns (content, error, truncated)."""
        error = None
        try:
            cap = max_bytes if max_bytes is not None else MAX_FILE_BYTES
            with open(file_path, 'rb') as f:
                raw = f.read(cap + 1)
            truncated = len(raw) > cap
            if truncated:
                raw = raw[:cap]
            try:
                content = raw.decode('utf-8')
            except UnicodeDecodeError as e:
                error = f"Unicode decode error: {e}"
                content = raw.decode('utf-8', errors='replace')
            return content, error, truncated
        except Exception as e:
            return None, str(e), False
