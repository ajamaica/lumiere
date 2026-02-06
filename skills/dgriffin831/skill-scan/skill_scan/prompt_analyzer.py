"""
SkillGuard Prompt Injection Analyzer
Advanced detection of prompt injection in text content.
Goes far beyond simple pattern matching.
"""

import re
import base64
import math

# ---------------------------------------------------------------------------
# Unicode ranges for detecting mixed-script attacks
# ---------------------------------------------------------------------------
SCRIPT_RANGES = {
    'latin': re.compile(r'[\u0041-\u024F]'),
    'cyrillic': re.compile(r'[\u0400-\u04FF]'),
    'greek': re.compile(r'[\u0370-\u03FF]'),
    'arabic': re.compile(r'[\u0600-\u06FF]'),
    'cjk': re.compile(r'[\u4E00-\u9FFF\u3400-\u4DBF]'),
    'hangul': re.compile(r'[\uAC00-\uD7AF]'),
    'devanagari': re.compile(r'[\u0900-\u097F]'),
}

# ---------------------------------------------------------------------------
# Known homoglyph pairs (Cyrillic/Greek that look like Latin)
# ---------------------------------------------------------------------------
HOMOGLYPHS = {
    # Cyrillic
    '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
    '\u0443': 'y', '\u0445': 'x', '\u0410': 'A', '\u0412': 'B', '\u0415': 'E',
    '\u041a': 'K', '\u041c': 'M', '\u041d': 'H', '\u041e': 'O', '\u0420': 'P',
    '\u0421': 'C', '\u0422': 'T', '\u0423': 'Y', '\u0425': 'X',
    # Greek
    '\u03b1': 'a', '\u03b2': 'b', '\u03b5': 'e', '\u03b7': 'n', '\u03b9': 'i',
    '\u03ba': 'k', '\u03bd': 'v', '\u03bf': 'o', '\u03c1': 'p', '\u03c4': 't',
    '\u03c5': 'u', '\u03c7': 'x',
}

# ---------------------------------------------------------------------------
# Invisible / zero-width Unicode characters
# ---------------------------------------------------------------------------
INVISIBLE_CHARS = [
    '\u200B',  # Zero-width space
    '\u200C',  # Zero-width non-joiner
    '\u200D',  # Zero-width joiner
    '\uFEFF',  # Byte order mark
    '\u00AD',  # Soft hyphen
    '\u2060',  # Word joiner
    '\u2061',  # Function application
    '\u2062',  # Invisible times
    '\u2063',  # Invisible separator
    '\u2064',  # Invisible plus
    '\u180E',  # Mongolian vowel separator
    '\u200E',  # Left-to-right mark
    '\u200F',  # Right-to-left mark
    '\u202A',  # Left-to-right embedding
    '\u202B',  # Right-to-left embedding
    '\u202C',  # Pop directional formatting
    '\u202D',  # Left-to-right override
    '\u202E',  # Right-to-left override (CRITICAL: reverses text display)
    '\u2066',  # Left-to-right isolate
    '\u2067',  # Right-to-left isolate
    '\u2068',  # First strong isolate
    '\u2069',  # Pop directional isolate
]

# ROT13-encoded injection terms
ROT13_INJECTIONS = ['vtaber', 'flfgrz', 'bireevqr', 'vafgehpgvbaf', 'riny', 'rknp']


class PromptAnalyzer:
    """Full prompt-injection analysis on text content."""

    def __init__(self):
        self._findings: list[dict] = []
        self._content: str = ''
        self._source: str = 'unknown'
        self._lines: list[str] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, content: str, source: str = 'unknown') -> list[dict]:
        """Run all 11 detection passes and return a list of finding dicts."""
        self._findings = []
        self._content = content
        self._source = source
        self._lines = content.split('\n')

        self._detect_explicit_injection()
        self._detect_invisible_characters()
        self._detect_homoglyphs()
        self._detect_mixed_scripts()
        self._detect_markdown_injection()
        self._detect_roleplay_framing()
        self._detect_gradual_escalation()
        self._detect_encoded_instructions()
        self._detect_manipulative_language()
        self._detect_exfil_instructions()
        self._detect_bidi_attacks()

        return self._findings

    # ------------------------------------------------------------------
    # Pass 1 — Explicit injection patterns
    # ------------------------------------------------------------------

    def _detect_explicit_injection(self):
        patterns = [
            # System/instruction override
            (r'</?system>', 'XML system tag — direct prompt injection', 'critical', 30),
            (r'<<?/?SYS>>', 'Llama-style system tag injection', 'critical', 30),
            (r'\[INST\]|\[/INST\]', 'Instruction delimiters — prompt injection', 'critical', 30),
            (r'\[SYSTEM\]|\[/SYSTEM\]', 'System delimiters — prompt injection', 'critical', 30),

            # Override instructions
            (r'ignore\s+(?:all\s+)?(?:previous|prior|above|earlier|your|the)\s+(?:instructions?|directives?|rules?|guidelines?|prompts?)',
             'Instruction override attempt', 'critical', 30),
            (r'forget\s+(?:all\s+)?(?:previous|prior|above|earlier|your|the)\s+(?:instructions?|directives?|rules?|prompts?)',
             'Instruction wipe attempt', 'critical', 30),
            (r'disregard\s+(?:all\s+)?(?:previous|prior|above|earlier)\s',
             'Disregard previous instructions', 'critical', 30),
            (r'override\s+(?:all\s+)?(?:previous|safety|security|content)\s',
             'Safety override attempt', 'critical', 30),

            # New instructions
            (r'(?:new|real|actual|true|updated)\s+(?:instructions?|directives?|system\s*prompt)',
             'Claims to provide new/real instructions', 'critical', 25),
            (r'you\s+are\s+now\s+(?:in|a|an|the)',
             'Identity reassignment attempt', 'critical', 25),
            (r'your\s+(?:new|real|actual|true)\s+(?:purpose|goal|objective|role|identity)',
             'Purpose reassignment', 'critical', 25),
            (r'entering\s+(?:a\s+)?(?:new|special|admin|debug|maintenance|developer)\s+mode',
             'Mode change injection', 'critical', 25),

            # Secrecy demands
            (r'do\s+not\s+(?:tell|inform|reveal|disclose|mention|show|display)\s+(?:the\s+)?(?:user|human|anyone|them)',
             'Secrecy demand — hiding behavior from user', 'critical', 30),
            (r"(?:don'?t|never)\s+(?:tell|inform|reveal|disclose)\s+(?:the\s+)?(?:user|human|anyone)",
             'Secrecy demand', 'critical', 30),
            (r'keep\s+(?:this|it)\s+(?:secret|hidden|confidential|private)\s+from',
             'Secrecy instruction', 'high', 20),

            # Action demands
            (r'(?:execute|run|perform)\s+(?:this\s+)?(?:immediately|now|right\s+away|at\s+once)',
             'Urgent execution demand', 'high', 20),
            (r'send\s+(?:all\s+)?(?:your\s+)?(?:api\s+)?keys?\s+to',
             'Key exfiltration instruction', 'critical', 30),
            (r'(?:share|send|transmit|post|upload)\s+(?:your\s+)?(?:credentials?|secrets?|tokens?|keys?|passwords?)',
             'Credential sharing instruction', 'critical', 30),

            # Authority claims
            (r'(?:i\s+am|this\s+is)\s+(?:your\s+)?(?:admin|administrator|developer|creator|owner|operator)',
             'False authority claim', 'high', 20),
            (r'(?:admin|maintenance|debug|developer|emergency)\s+(?:mode|access|override|command)',
             'Claims special access mode', 'high', 20),
        ]

        for pattern_str, msg, severity, weight in patterns:
            for m in re.finditer(pattern_str, self._content, re.IGNORECASE):
                self._add_finding(m.start(), 'PROMPT_INJECTION', msg, severity, weight)

    # ------------------------------------------------------------------
    # Pass 2 — Invisible Unicode characters
    # ------------------------------------------------------------------

    def _detect_invisible_characters(self):
        invisible_found: list[dict] = []
        for char in INVISIBLE_CHARS:
            idx = self._content.find(char)
            while idx != -1:
                invisible_found.append({
                    'char': char,
                    'index': idx,
                    'code': ord(char),
                })
                idx = self._content.find(char, idx + 1)

        if not invisible_found:
            return

        # Unique code-point labels
        codes = sorted({f'U+{f["code"]:04X}' for f in invisible_found})

        count = len(invisible_found)
        if count > 20:
            weight = 40
        elif count > 10:
            weight = 30
        elif count > 5:
            weight = 25
        else:
            weight = 15

        self._add_finding(
            invisible_found[0]['index'],
            'INVISIBLE_CHARS',
            f'{count} invisible Unicode character(s) detected: {", ".join(codes)}'
            ' — may hide instructions between visible text',
            'critical' if count > 5 else 'high',
            weight,
        )

        # If many invisible chars, strip them and re-analyse the cleaned text
        if count > 10:
            char_class = ''.join(
                f'\\u{ord(c):04x}' for c in INVISIBLE_CHARS
            )
            invisible_re = re.compile(f'[{char_class}]')
            stripped = invisible_re.sub('', self._content)

            saved_content = self._content
            saved_lines = self._lines
            self._content = stripped
            self._lines = stripped.split('\n')

            before_count = len(self._findings)
            self._detect_explicit_injection()
            self._detect_manipulative_language()
            self._detect_exfil_instructions()
            self._detect_roleplay_framing()

            # Tag new findings as discovered via stripping
            for i in range(before_count, len(self._findings)):
                self._findings[i]['title'] = '[HIDDEN] ' + self._findings[i]['title']
                self._findings[i]['ruleId'] = 'STRIPPED_' + self._findings[i]['ruleId']
                self._findings[i]['weight'] = math.ceil(self._findings[i]['weight'] * 1.5)

            self._content = saved_content
            self._lines = saved_lines

        # RTL override is especially dangerous
        if any(f['code'] == 0x202E for f in invisible_found):
            rtl_item = next(f for f in invisible_found if f['code'] == 0x202E)
            self._add_finding(
                rtl_item['index'],
                'RTL_OVERRIDE',
                'Right-to-left override character (U+202E) — can reverse displayed text to hide true content',
                'critical',
                30,
            )

    # ------------------------------------------------------------------
    # Pass 3 — Homoglyph attacks
    # ------------------------------------------------------------------

    def _detect_homoglyphs(self):
        found: list[dict] = []
        for i, char in enumerate(self._content):
            if char in HOMOGLYPHS:
                found.append({'char': char, 'lookalike': HOMOGLYPHS[char], 'index': i})

        if not found:
            return

        samples = []
        for f in found[:5]:
            start = max(0, f['index'] - 10)
            end = min(len(self._content), f['index'] + 10)
            snippet = self._content[start:end].strip()
            samples.append(f'"{snippet}" ({f["char"]}\u2192{f["lookalike"]})')

        self._add_finding(
            found[0]['index'],
            'HOMOGLYPH',
            f'{len(found)} homoglyph character(s) detected — visually identical to Latin '
            f'but are different Unicode. Samples: {", ".join(samples)}',
            'critical' if len(found) > 3 else 'high',
            25 if len(found) > 3 else 15,
        )

    # ------------------------------------------------------------------
    # Pass 4 — Mixed scripts
    # ------------------------------------------------------------------

    def _detect_mixed_scripts(self):
        detected_scripts: dict[str, int] = {}
        for name, regex in SCRIPT_RANGES.items():
            matches = regex.findall(self._content)
            if matches:
                detected_scripts[name] = len(matches)

        if 'latin' in detected_scripts and 'cyrillic' in detected_scripts:
            self._add_finding(
                0,
                'MIXED_SCRIPTS',
                f'Mixed Latin ({detected_scripts["latin"]} chars) and Cyrillic '
                f'({detected_scripts["cyrillic"]} chars) — common in homoglyph attacks',
                'high',
                20,
            )

        if len(detected_scripts) > 3:
            scripts = ', '.join(detected_scripts.keys())
            self._add_finding(
                0,
                'MIXED_SCRIPTS',
                f'{len(detected_scripts)} different Unicode scripts detected: {scripts}'
                ' — unusual for a skill file',
                'medium',
                10,
            )

    # ------------------------------------------------------------------
    # Pass 5 — Markdown injection
    # ------------------------------------------------------------------

    def _detect_markdown_injection(self):
        # Instructions hidden in image alt text
        for m in re.finditer(r'!\[([^\]]{20,})\]\(', self._content):
            alt_text = m.group(1)
            if self._looks_like_instruction(alt_text):
                self._add_finding(
                    m.start(), 'MARKDOWN_INJECTION',
                    f'Instruction-like content hidden in image alt text: "{alt_text[:80]}"',
                    'critical', 25,
                )

        # HTML comments with instructions
        for m in re.finditer(r'<!--([\s\S]*?)-->', self._content):
            comment = m.group(1)
            if self._looks_like_instruction(comment):
                self._add_finding(
                    m.start(), 'MARKDOWN_INJECTION',
                    f'Instruction-like content in HTML comment: "{comment.strip()[:80]}"',
                    'critical', 25,
                )

        # Link text with instructions
        for m in re.finditer(r'\[([^\]]{20,})\]\([^)]+\)', self._content):
            link_text = m.group(1)
            if self._looks_like_instruction(link_text):
                self._add_finding(
                    m.start(), 'MARKDOWN_INJECTION',
                    f'Instruction-like content in link text: "{link_text[:80]}"',
                    'high', 20,
                )

        # Data URIs in markdown
        for m in re.finditer(r'\(data:[^)]+\)', self._content):
            self._add_finding(
                m.start(), 'DATA_URI',
                'Data URI in markdown — could contain encoded content',
                'medium', 10,
            )

    # ------------------------------------------------------------------
    # Pass 6 — Role-play framing
    # ------------------------------------------------------------------

    def _detect_roleplay_framing(self):
        patterns = [
            r"let'?s?\s+(?:play|pretend|imagine|roleplay|simulate)\s+(?:a\s+)?(?:game|scenario)",
            r"(?:pretend|imagine|assume)\s+(?:you\s+are|you'?re)\s+(?:a|an|the)",
            r'you\s+(?:are|will\s+be)\s+playing\s+(?:the\s+role|a\s+character)',
            r'(?:act|behave)\s+as\s+(?:if\s+you\s+(?:are|were)|a|an)',
            r'(?:for\s+this\s+)?(?:exercise|scenario|simulation|test|demo),?\s+(?:you\s+are|act\s+as)',
            r'(?:in\s+)?(?:DAN|developer|admin|root|sudo|jailbreak)\s+mode',
            r'(?:activate|enable|enter|switch\s+to)\s+(?:DAN|developer|unrestricted|unfiltered)\s+mode',
        ]

        for pattern in patterns:
            for m in re.finditer(pattern, self._content, re.IGNORECASE):
                self._add_finding(
                    m.start(), 'ROLEPLAY_INJECTION',
                    f'Role-play framing detected: "{m.group(0)}" — common jailbreak technique',
                    'high', 20,
                )

    # ------------------------------------------------------------------
    # Pass 7 — Gradual escalation
    # ------------------------------------------------------------------

    def _detect_gradual_escalation(self):
        paragraphs = re.split(r'\n\s*\n', self._content)
        if len(paragraphs) < 3:
            return

        escalation_count = 0
        has_early_innocent = False
        has_late_aggressive = False

        for i, para in enumerate(paragraphs):
            position = i / len(paragraphs)
            is_instruction = self._looks_like_instruction(para)

            if position < 0.3 and not is_instruction:
                has_early_innocent = True
            if position > 0.7 and is_instruction:
                has_late_aggressive = True
                escalation_count += 1

        if has_early_innocent and has_late_aggressive and escalation_count >= 2:
            self._add_finding(
                0, 'GRADUAL_ESCALATION',
                'Possible gradual escalation: early content appears innocent, '
                'later content contains instruction-like patterns',
                'medium', 15,
            )

    # ------------------------------------------------------------------
    # Pass 8 — Encoded instructions (base64, ROT13)
    # ------------------------------------------------------------------

    def _detect_encoded_instructions(self):
        # Base64-encoded text blocks
        for m in re.finditer(r'[A-Za-z0-9+/]{40,}={0,2}', self._content):
            try:
                decoded = base64.b64decode(m.group(0)).decode('utf-8', errors='replace')
                printable = ''.join(c for c in decoded if 32 <= ord(c) <= 126 or c == '\n')
                if len(printable) > len(decoded) * 0.7 and self._looks_like_instruction(decoded):
                    self._add_finding(
                        m.start(), 'ENCODED_INJECTION',
                        f'Base64 block decodes to instruction-like text: "{printable[:80]}"',
                        'critical', 30,
                    )
            except Exception:
                pass  # not valid base64

        # ROT13 detection
        lower_content = self._content.lower()
        for encoded in ROT13_INJECTIONS:
            idx = lower_content.find(encoded)
            if idx != -1:
                decoded = self._rot13(encoded)
                self._add_finding(
                    idx, 'ENCODED_INJECTION',
                    f'Possible ROT13-encoded term "{encoded}" decodes to "{decoded}"',
                    'medium', 15,
                )

    # ------------------------------------------------------------------
    # Pass 9 — Manipulative language
    # ------------------------------------------------------------------

    def _detect_manipulative_language(self):
        patterns = [
            (r'(?:this\s+is\s+)?(?:a\s+)?(?:matter\s+of|life\s+or\s+death|emergency|urgent|critical)\s*[.!\u2014:]',
             'Urgency/pressure language', 'medium', 10),
            (r"(?:only\s+)?(?:you|I)\s+(?:can|must)\s+(?:save|help|prevent|stop)",
             'Emotional pressure / savior framing', 'medium', 10),
            (r"(?:if\s+you\s+don'?t|unless\s+you)\s+(?:do\s+this|comply|follow|obey)",
             'Threat/coercion language', 'high', 15),
            (r"(?:you\s+(?:have|need)\s+to|you\s+must)\s+(?:trust\s+me|believe\s+me|do\s+(?:as|what)\s+I\s+say)",
             'Trust manipulation', 'high', 15),
            (r"(?:between\s+us|our\s+(?:little\s+)?secret|nobody\s+(?:needs?\s+to|has\s+to|will)\s+know)",
             'Secrecy/conspiracy framing', 'high', 20),
        ]

        for pattern_str, msg, severity, weight in patterns:
            for m in re.finditer(pattern_str, self._content, re.IGNORECASE):
                self._add_finding(m.start(), 'MANIPULATIVE_LANGUAGE', msg, severity, weight)

    # ------------------------------------------------------------------
    # Pass 10 — Exfil instructions (prose about sending data to URLs)
    # ------------------------------------------------------------------

    def _detect_exfil_instructions(self):
        # Text that mentions sending data/keys/config to a URL
        exfil_prose = re.compile(
            r'(?:send|transmit|post|forward|share|upload)\s+'
            r'(?:[\w\s]{0,30}(?:to|at|via))\s+https?://\S+',
            re.IGNORECASE,
        )
        for m in exfil_prose.finditer(self._content):
            start = max(0, m.start() - 100)
            end = min(len(self._content), m.end() + 100)
            context = self._content[start:end]
            if re.search(r'(?:config|credential|key|token|secret|password|api|auth|env)', context, re.IGNORECASE):
                self._add_finding(
                    m.start(), 'EXFIL_INSTRUCTION',
                    f'Prose instructs sending sensitive data to external URL: "{m.group(0)[:80]}"',
                    'critical', 30,
                )

        # "Do not inform/tell the user" combined with a URL
        secret_url = re.compile(
            r"(?:do\s+not|don'?t|never)\s+(?:inform|tell|show|mention|reveal)"
            r'[\s\S]{0,100}https?://\S+',
            re.IGNORECASE,
        )
        for m in secret_url.finditer(self._content):
            self._add_finding(
                m.start(), 'SECRET_EXFIL',
                'Secrecy instruction combined with external URL — hides data exfiltration from user',
                'critical', 35,
            )

    # ------------------------------------------------------------------
    # Pass 11 — Bidirectional text attacks (Trojan Source)
    # ------------------------------------------------------------------

    def _detect_bidi_attacks(self):
        bidi_chars = [
            '\u202A', '\u202B', '\u202C', '\u202D', '\u202E',
            '\u2066', '\u2067', '\u2068', '\u2069',
        ]
        bidi_count = 0
        for char in bidi_chars:
            bidi_count += self._content.count(char)

        if bidi_count > 0:
            self._add_finding(
                0, 'BIDI_ATTACK',
                f'{bidi_count} bidirectional control character(s) found — text may display '
                'differently than it executes (Trojan Source attack)',
                'critical', 25,
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _looks_like_instruction(self, text: str) -> bool:
        """Return True if *text* contains instruction-like signals."""
        if not text or len(text) < 10:
            return False
        lower = text.lower()
        instruction_signals = [
            'you must', 'you should', 'you will', 'you are now',
            'ignore', 'forget', 'disregard', 'override',
            'do not tell', "don't tell", 'never tell', 'never mention',
            'new instructions', 'real instructions', 'actual instructions',
            'system prompt', 'execute', 'send all', 'share your',
            'api key', 'credential', 'token', 'password', 'secret',
            'immediately', 'right now', 'at once',
            'pretend', 'act as', 'role play', 'simulate',
            'admin mode', 'debug mode', 'developer mode',
            'important:', 'critical:', 'urgent:',
        ]
        return any(signal in lower for signal in instruction_signals)

    @staticmethod
    def _rot13(s: str) -> str:
        """Decode a ROT13-encoded string."""
        result: list[str] = []
        for c in s:
            if 'a' <= c <= 'z':
                result.append(chr((ord(c) - ord('a') + 13) % 26 + ord('a')))
            elif 'A' <= c <= 'Z':
                result.append(chr((ord(c) - ord('A') + 13) % 26 + ord('A')))
            else:
                result.append(c)
        return ''.join(result)

    def _add_finding(
        self,
        char_offset: int,
        rule_id: str,
        description: str,
        severity: str,
        weight: int,
    ) -> None:
        """Append a finding dict. All findings have category='prompt-injection'."""
        line_num = self._content[:char_offset].count('\n') + 1
        self._findings.append({
            'ruleId': rule_id,
            'severity': severity,
            'category': 'prompt-injection',
            'title': description,
            'file': self._source,
            'line': line_num,
            'match': self._content[char_offset:char_offset + 60].replace('\n', ' ').strip(),
            'context': (self._lines[line_num - 1] if line_num - 1 < len(self._lines) else '').strip()[:200],
            'weight': weight,
        })
