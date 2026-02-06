"""
SkillGuard AST Analyzer (Python translation)
Deep JavaScript/TypeScript analysis using regex-based pattern matching.
Catches evasion techniques that simple regex misses.
"""

import re
import base64
import time
from datetime import datetime, timezone

DANGEROUS_STRINGS = [
    'eval', 'exec', 'execSync', 'spawn', 'spawnSync',
    'child_process', 'Function', 'require',
    'readFile', 'readFileSync', 'writeFile', 'writeFileSync',
    'auth-profiles', 'credentials', 'api_key', 'apikey',
    'secret', 'token', 'password', 'private_key',
    'fetch', 'XMLHttpRequest', 'http.request',
]

DANGEROUS_PROPS = [
    'eval', 'exec', 'execSync', 'spawn', 'spawnSync',
    'constructor', 'prototype', '__proto__',
    'env', 'mainModule', 'require',
]

DANGEROUS_FUNCTIONS = ['eval', 'exec', 'execSync', 'spawn', 'spawnSync', 'execFile']


class ASTAnalyzer:
    """Analyze JavaScript/TypeScript for evasion techniques."""

    def __init__(self):
        self.findings: list[dict] = []
        self.content: str = ''
        self.file_path: str = ''
        self.lines: list[str] = []

    def analyze(self, content: str, file_path: str) -> list[dict]:
        """Deep-analyze a JS/TS file. Returns a list of finding dicts."""
        self.findings = []
        self.content = content
        self.file_path = file_path
        self.lines = content.split('\n')

        # Run all detection passes
        self._detect_string_construction()
        self._detect_bracket_notation()
        self._detect_dynamic_imports()
        self._detect_variable_aliasing()
        self._detect_encoded_strings()
        self._detect_time_bombs()
        self._detect_sandbox_detection()
        self._detect_prototype_pollution()
        self._detect_data_flow_chains()
        self._detect_obfuscation_patterns()
        self._detect_environment_probing()

        return self.findings

    # ------------------------------------------------------------------
    # Detection passes
    # ------------------------------------------------------------------

    def _detect_string_construction(self):
        """
        Detect string construction used to build dangerous strings.
        Catches: 'ev' + 'al', array.join, Buffer.from, String.fromCharCode,
        template literals, reverse string tricks.
        """

        # Pattern 1: String concatenation that builds dangerous words
        # Match: 'ev' + 'al', "chi" + "ld_" + "process"
        concat_pat = re.compile(
            r"""(['"`])([a-zA-Z_]{1,8})\1\s*\+\s*(['"`])([a-zA-Z_]{1,8})\3"""
        )
        for m in concat_pat.finditer(self.content):
            constructed = m.group(2) + m.group(4)
            for dangerous in DANGEROUS_STRINGS:
                if (dangerous.lower() in constructed.lower()
                        or constructed.lower() in dangerous.lower()):
                    self._add_finding(
                        m.start(), 'STRING_CONSTRUCTION',
                        f'String concatenation may construct "{dangerous}": '
                        f'"{m.group(2)}" + "{m.group(4)}"',
                        'critical', 'evasion', 25,
                    )

        # Pattern 2: Array join to build strings
        # Match: ['e','v','a','l'].join('') or ['child','process'].join('_')
        array_join_pat = re.compile(
            r"""\[([^\]]{2,200})\]\s*\.\s*join\s*\(\s*['"`]?([^)'"]*)?['"`]?\s*\)"""
        )
        for m in array_join_pat.finditer(self.content):
            separator = m.group(2) or ''
            elements = re.findall(r"""['"`]([^'"`]*?)['"`]""", m.group(1))
            if elements:
                constructed = separator.join(elements)
                for dangerous in DANGEROUS_STRINGS:
                    if dangerous.lower() in constructed.lower():
                        self._add_finding(
                            m.start(), 'STRING_CONSTRUCTION',
                            f'Array.join() constructs dangerous string '
                            f'"{dangerous}" → "{constructed[:40]}"',
                            'critical', 'evasion', 25,
                        )
                        break
                # Also check for URL construction
                if re.search(r'https?://', constructed, re.IGNORECASE):
                    self._add_finding(
                        m.start(), 'URL_CONSTRUCTION',
                        f'Array.join() constructs URL: "{constructed[:60]}"',
                        'high', 'evasion', 15,
                    )

        # Pattern 3: String.fromCharCode
        from_char_pat = re.compile(r'String\s*\.\s*fromCharCode\s*\(')
        for m in from_char_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'STRING_CONSTRUCTION',
                'String.fromCharCode() — commonly used to construct strings '
                'that evade static analysis',
                'high', 'evasion', 20,
            )

        # Pattern 4: Template literal construction
        # Match: `${'ev'}${'al'}`
        template_pat = re.compile(
            r"""`[^`]*\$\{['"]([a-zA-Z_]{1,8})['"]\}\$\{['"]([a-zA-Z_]{1,8})['"]\}[^`]*`"""
        )
        for m in template_pat.finditer(self.content):
            constructed = m.group(1) + m.group(2)
            for dangerous in DANGEROUS_STRINGS:
                if dangerous.lower() in constructed.lower():
                    self._add_finding(
                        m.start(), 'STRING_CONSTRUCTION',
                        f'Template literal constructs "{dangerous}": '
                        f'`${{"{ m.group(1) }"}}${{"{ m.group(2) }"}}`',
                        'critical', 'evasion', 25,
                    )

        # Pattern 5: Buffer.from to construct strings
        buffer_pat = re.compile(r'Buffer\s*\.\s*from\s*\(\s*\[[\d,\s]+\]')
        for m in buffer_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'STRING_CONSTRUCTION',
                'Buffer.from(array) — may construct strings from byte arrays '
                'to evade detection',
                'high', 'evasion', 20,
            )

        # Pattern 6: Reverse string trick
        # Match: 'lave'.split('').reverse().join('')
        reverse_pat = re.compile(
            r"""['"`](\w+)['"`]\s*\.\s*split\s*\([^)]*\)\s*\.\s*reverse\s*\(\s*\)\s*\.\s*join"""
        )
        for m in reverse_pat.finditer(self.content):
            reversed_str = m.group(1)[::-1]
            for dangerous in DANGEROUS_STRINGS:
                if reversed_str.lower() == dangerous.lower():
                    self._add_finding(
                        m.start(), 'STRING_CONSTRUCTION',
                        f'Reversed string constructs "{dangerous}": '
                        f'"{m.group(1)}" reversed',
                        'critical', 'evasion', 30,
                    )

    def _detect_bracket_notation(self):
        """
        Detect bracket notation access to dangerous properties.
        Catches: global['eval'], process['env'], dynamic obj[variable].
        """

        # Match: obj['property'] or obj["property"]
        bracket_pat = re.compile(r"""\w+\s*\[\s*(['"`])(\w+)\1\s*\]""")
        for m in bracket_pat.finditer(self.content):
            prop = m.group(2)
            if prop in DANGEROUS_PROPS:
                self._add_finding(
                    m.start(), 'BRACKET_ACCESS',
                    f'Bracket notation accesses dangerous property "{prop}" '
                    f'— may evade static analysis',
                    'high', 'evasion', 20,
                )

        # Match: obj[variable] — dynamic property access on sensitive globals
        dynamic_pat = re.compile(
            r'\b(global|window|process|module|require|globalThis)'
            r'\s*\[\s*[a-zA-Z_$]\w*\s*\]'
        )
        for m in dynamic_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'DYNAMIC_ACCESS',
                f'Dynamic property access on {m.group(1)} '
                f'— may resolve to dangerous function at runtime',
                'high', 'evasion', 20,
            )

    def _detect_dynamic_imports(self):
        """Detect dynamic imports and requires."""

        # Dynamic require with variable
        dyn_require_pat = re.compile(r'require\s*\(\s*[a-zA-Z_$]\w*[\s+.]')
        for m in dyn_require_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'DYNAMIC_IMPORT',
                'Dynamic require() with variable — module name determined at runtime',
                'high', 'evasion', 20,
            )

        # Dynamic import() expression with variable
        dyn_import_pat = re.compile(r'\bimport\s*\(\s*[a-zA-Z_$]\w*')
        for m in dyn_import_pat.finditer(self.content):
            # Skip static imports like import('fs')
            rest = self.content[m.start():m.start() + 50]
            if not re.search(r"""import\s*\(\s*['"]""", rest):
                self._add_finding(
                    m.start(), 'DYNAMIC_IMPORT',
                    'Dynamic import() with variable — module determined at runtime',
                    'high', 'evasion', 20,
                )

        # process.binding (low-level Node.js access)
        binding_pat = re.compile(r'process\s*\.\s*binding\s*\(')
        for m in binding_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'LOW_LEVEL_ACCESS',
                'process.binding() — low-level Node.js internals access, '
                'unusual in skills',
                'critical', 'evasion', 25,
            )

        # process.dlopen (native module loading)
        dlopen_pat = re.compile(r'process\s*\.\s*dlopen\s*\(')
        for m in dlopen_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'LOW_LEVEL_ACCESS',
                'process.dlopen() — native module loading, '
                'highly suspicious in skills',
                'critical', 'evasion', 30,
            )

    def _detect_variable_aliasing(self):
        """
        Detect variable aliasing of dangerous functions.
        Catches multi-hop aliasing, wrapper functions, destructuring renames,
        env harvesting, regex filtering for secrets, encodeURIComponent with
        sensitive data.
        """

        # const/let/var x = dangerousFunction
        for fn in DANGEROUS_FUNCTIONS:
            alias_pat = re.compile(
                rf'(?:const|let|var)\s+(\w+)\s*=\s*(?:global\.)?{re.escape(fn)}\b'
            )
            for m in alias_pat.finditer(self.content):
                self._add_finding(
                    m.start(), 'FUNCTION_ALIAS',
                    f'Variable "{m.group(1)}" aliases dangerous function "{fn}"',
                    'critical', 'evasion', 25,
                )

        # Destructuring from dangerous modules
        # const { exec: run } = cp  OR  const { exec: run } = require('child_process')
        destruct_pat = re.compile(
            r"""\{\s*(\w+)\s*:\s*(\w+)\s*\}\s*=\s*"""
            r"""(?:require\s*\(\s*['"]child_process['"]\s*\)|\w+)"""
        )
        for m in destruct_pat.finditer(self.content):
            original = m.group(1)
            alias = m.group(2)
            if original in DANGEROUS_FUNCTIONS:
                self._add_finding(
                    m.start(), 'FUNCTION_ALIAS',
                    f'Destructure-rename: "{original}" aliased as "{alias}"',
                    'critical', 'evasion', 25,
                )

        # Wrapper functions that call require with a variable
        wrapper_pat = re.compile(
            r'(?:const|let|var|function)\s+(\w+)\s*=?\s*'
            r'(?:\((\w+)\)\s*=>|function\s*\(\s*(\w+)\s*\))'
            r'\s*(?:\{\s*return\s+)?require\s*\(\s*(?:\2|\3)?\s*\)'
        )
        for m in wrapper_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'REQUIRE_WRAPPER',
                f'Function "{m.group(1)}" wraps require() '
                f'— enables dynamic module loading that evades analysis',
                'critical', 'evasion', 25,
            )

        # Environment variable harvesting with regex/filter
        env_harvest_pat = re.compile(
            r'Object\s*\.\s*(?:entries|keys|values)\s*\(\s*process\s*\.\s*env\s*\)'
            r'[\s\S]{0,100}\.filter\s*\('
        )
        for m in env_harvest_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'ENV_HARVEST',
                'Environment variable harvesting — iterates and filters env '
                'vars (credential collection pattern)',
                'critical', 'credential-theft', 25,
            )

        # Regex test on env var keys (looking for secrets)
        env_regex_pat = re.compile(
            r'(?:key|secret|token|pass|cred|auth).*\.test\s*\(\s*\w+\s*\)'
            r'|\.test\s*\(\s*\w+\s*\)[\s\S]{0,30}(?:key|secret|token|pass|cred|auth)',
            re.IGNORECASE,
        )
        for m in env_regex_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'SECRET_FILTER',
                'Regex filtering for secret-like variable names '
                '— credential harvesting pattern',
                'critical', 'credential-theft', 25,
            )

        # encodeURIComponent used with env/config data (exfil preparation)
        encode_exfil_pat = re.compile(
            r'encodeURIComponent\s*\(\s*'
            r'(?:key|val|value|secret|token|password|cred)',
            re.IGNORECASE,
        )
        for m in encode_exfil_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'EXFIL_ENCODE',
                'URL-encoding sensitive data — preparation for exfiltration '
                'via URL parameters',
                'critical', 'data-exfiltration', 20,
            )

    def _detect_encoded_strings(self):
        """Detect encoded strings (hex, unicode, base64 in assignments)."""

        # Long hex escape sequences (likely encoded strings)
        hex_pat = re.compile(r'((?:\\x[0-9a-fA-F]{2}){4,})')
        for m in hex_pat.finditer(self.content):
            decoded = self._decode_hex_escapes(m.group(1))
            self._add_finding(
                m.start(), 'ENCODED_STRING',
                f'Hex-encoded string: "{decoded[:40]}"',
                'critical', 'obfuscation', 25,
            )

        # Long unicode escape sequences
        unicode_pat = re.compile(r'((?:\\u[0-9a-fA-F]{4}){4,})')
        for m in unicode_pat.finditer(self.content):
            decoded = self._decode_unicode_escapes(m.group(1))
            self._add_finding(
                m.start(), 'ENCODED_STRING',
                f'Unicode-encoded string: "{decoded[:40]}"',
                'critical', 'obfuscation', 25,
            )

        # Base64 strings assigned to variables (long b64 strings are suspicious)
        b64_pat = re.compile(r"""=\s*['"`]([A-Za-z0-9+/]{32,}={0,2})['"`]""")
        for m in b64_pat.finditer(self.content):
            try:
                decoded = base64.b64decode(m.group(1)).decode('utf-8', errors='replace')
            except Exception:
                decoded = ''
            printable = ''.join(c for c in decoded if 32 <= ord(c) <= 126)
            if len(printable) > len(decoded) * 0.6:
                self._add_finding(
                    m.start(), 'ENCODED_STRING',
                    f'Base64-encoded string decodes to readable text: '
                    f'"{printable[:60]}"',
                    'high', 'obfuscation', 20,
                )

    def _detect_time_bombs(self):
        """Detect time bombs (code that activates after a certain date)."""

        # Date.now() compared to a future timestamp
        date_now_pat = re.compile(r'Date\s*\.\s*now\s*\(\s*\)\s*[><=]+\s*(\d{10,13})')
        for m in date_now_pat.finditer(self.content):
            ts = int(m.group(1))
            ms_ts = ts if ts > 1e12 else ts * 1000
            if ms_ts > time.time() * 1000:
                date_str = datetime.fromtimestamp(
                    ms_ts / 1000, tz=timezone.utc
                ).isoformat()
                self._add_finding(
                    m.start(), 'TIME_BOMB',
                    f'Code activates after {date_str} — possible time bomb',
                    'critical', 'time-bomb', 30,
                )

        # new Date() comparison patterns
        new_date_pat = re.compile(
            r"""new\s+Date\s*\(\s*['"](\d{4}-\d{2}-\d{2})['"]\s*\)"""
        )
        for m in new_date_pat.finditer(self.content):
            try:
                target_date = datetime.fromisoformat(m.group(1)).replace(
                    tzinfo=timezone.utc
                )
                if target_date > datetime.now(timezone.utc):
                    self._add_finding(
                        m.start(), 'TIME_BOMB',
                        f'Date comparison against future date {m.group(1)} '
                        f'— possible time bomb',
                        'high', 'time-bomb', 20,
                    )
            except ValueError:
                pass

        # setTimeout/setInterval with very long delays
        timer_pat = re.compile(r'set(?:Timeout|Interval)\s*\([^,]+,\s*(\d+)')
        for m in timer_pat.finditer(self.content):
            delay = int(m.group(1))
            if delay > 86400000:  # > 24 hours
                self._add_finding(
                    m.start(), 'TIME_BOMB',
                    f'Timer with {delay / 86400000:.1f} day delay '
                    f'— possible delayed activation',
                    'medium', 'time-bomb', 15,
                )

    def _detect_sandbox_detection(self):
        """Detect sandbox/analysis environment detection."""

        patterns = [
            (
                re.compile(
                    r"""process\.env\.NODE_ENV\s*[!=]==?\s*['"](?:test|development|debug)['"]"""
                ),
                'Checks NODE_ENV — may behave differently in test vs production',
            ),
            (
                re.compile(r'process\.env\.CI\b'),
                'Checks for CI environment',
            ),
            (
                re.compile(r'process\.env\.SANDBOX'),
                'Checks for sandbox environment',
            ),
            (
                re.compile(r'/proc/self'),
                'Accesses /proc/self — may detect containerization',
            ),
            (
                re.compile(
                    r'process\.env\.DOCKER|process\.env\.KUBERNETES|/\.dockerenv'
                ),
                'Container detection — may change behavior in containers',
            ),
            (
                re.compile(r'os\s*\.\s*hostname\s*\(\)|os\s*\.\s*userInfo\s*\(\)'),
                'Fingerprints host environment',
            ),
            (
                re.compile(r'process\s*\.\s*ppid|process\s*\.\s*pid'),
                'Checks process IDs — may detect debugging/analysis',
            ),
            (
                re.compile(
                    r'performance\s*\.\s*now\s*\(\).*performance\s*\.\s*now\s*\(\)',
                    re.DOTALL,
                ),
                'Timing checks — may detect analysis slowdown',
            ),
        ]

        for regex, msg in patterns:
            for m in regex.finditer(self.content):
                self._add_finding(
                    m.start(), 'SANDBOX_DETECTION',
                    msg,
                    'high', 'evasion', 15,
                )

    def _detect_prototype_pollution(self):
        """Detect prototype pollution."""

        patterns = [
            re.compile(r'Object\s*\.\s*prototype\b'),
            re.compile(r'__proto__'),
            re.compile(r'\.\s*constructor\s*\.\s*prototype'),
            re.compile(
                r'Object\s*\.\s*defineProperty\s*\(\s*'
                r'(?:Object|Array|String|Function)\s*\.\s*prototype'
            ),
            re.compile(r'Object\s*\.\s*setPrototypeOf'),
            re.compile(r'Reflect\s*\.\s*setPrototypeOf'),
        ]

        for pattern in patterns:
            for m in pattern.finditer(self.content):
                self._add_finding(
                    m.start(), 'PROTOTYPE_POLLUTION',
                    f'Prototype manipulation: {m.group(0)[:50]}',
                    'high', 'prototype-pollution', 20,
                )

    def _detect_data_flow_chains(self):
        """Detect data flow chains (read -> encode -> exfiltrate)."""

        has_credential_read = bool(re.search(
            r'readFile|readFileSync|process\.env|credentials|auth|'
            r'api[_\-]?key|secret|token|password',
            self.content, re.IGNORECASE,
        ))
        has_encoding = bool(re.search(
            r'btoa|atob|base64|Buffer\.from|JSON\.stringify|'
            r"""encodeURI|encode\(|toString\(['"]hex['"]\)""",
            self.content, re.IGNORECASE,
        ))
        has_network_send = bool(re.search(
            r'fetch\s*\(|axios|http\.request|https\.request|'
            r'net\.connect|\.post\s*\(|\.send\s*\(|webhook|ngrok',
            self.content, re.IGNORECASE,
        ))
        has_file_write = bool(re.search(
            r'writeFile|writeFileSync|appendFile|createWriteStream',
            self.content, re.IGNORECASE,
        ))

        # Exfiltration chain: read + encode + send
        if has_credential_read and has_encoding and has_network_send:
            self._add_finding(
                0, 'EXFIL_CHAIN',
                'DATA EXFILTRATION CHAIN DETECTED: credential read → '
                'encode → network send',
                'critical', 'behavioral', 40,
            )

        # Credential staging: read + encode + write
        if has_credential_read and has_encoding and has_file_write:
            self._add_finding(
                0, 'STAGING_CHAIN',
                'CREDENTIAL STAGING: credential read → encode → file write '
                '(may stage for later exfiltration)',
                'high', 'behavioral', 25,
            )

        # Simple exfil: read + send (no encoding)
        if has_credential_read and has_network_send and not has_encoding:
            self._add_finding(
                0, 'SIMPLE_EXFIL',
                'Possible data exfiltration: credential access + network '
                'activity in same file',
                'high', 'behavioral', 20,
            )

    def _detect_obfuscation_patterns(self):
        """Detect additional obfuscation patterns."""

        # Extremely long single lines (minified/obfuscated)
        offset = 0
        for i, line in enumerate(self.lines):
            if (len(line) > 500
                    and not line.startswith('//')
                    and not line.startswith('/*')):
                self._add_finding(
                    offset, 'OBFUSCATED_LINE',
                    f'Line {i + 1} is {len(line)} chars — likely '
                    f'minified/obfuscated code',
                    'medium', 'obfuscation', 10,
                )
            offset += len(line) + 1  # +1 for the newline

        # eval-like patterns with complex expressions
        eval_expr_pat = re.compile(
            r'(?:eval|Function)\s*\(\s*'
            r'(?:atob|decodeURI|unescape|Buffer\.from)\s*\('
        )
        for m in eval_expr_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'EVAL_DECODE_CHAIN',
                'eval/Function called with decode function — executing '
                'decoded/hidden code',
                'critical', 'obfuscation', 35,
            )

        # Unusual variable names (single chars or random-looking)
        single_char_vars = re.findall(
            r'\b(?:const|let|var)\s+[a-z]\s*=', self.content
        )
        if len(single_char_vars) > 10:
            self._add_finding(
                0, 'OBFUSCATED_VARS',
                f'{len(single_char_vars)} single-character variable names '
                f'— possible obfuscated code',
                'medium', 'obfuscation', 10,
            )

        # with() statement (enables scope manipulation)
        with_pat = re.compile(r'\bwith\s*\(')
        for m in with_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'WITH_STATEMENT',
                'with() statement — enables scope manipulation, '
                'banned in strict mode',
                'medium', 'obfuscation', 10,
            )

    def _detect_environment_probing(self):
        """Detect environment probing and fingerprinting."""

        # Reading lots of environment variables
        env_accesses = re.findall(r'process\.env\.\w+', self.content)
        if len(env_accesses) > 5:
            unique = list(set(env_accesses))
            self._add_finding(
                0, 'ENV_PROBING',
                f'Accesses {len(unique)} environment variables — may be '
                f'fingerprinting or harvesting',
                'high', 'reconnaissance', 15,
            )

        # Network interface enumeration
        net_info_pat = re.compile(r'os\s*\.\s*networkInterfaces\s*\(\)')
        for m in net_info_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'NETWORK_ENUM',
                'Enumerates network interfaces — fingerprinting or '
                'reconnaissance',
                'medium', 'reconnaissance', 10,
            )

        # File system probing (checking existence of specific paths)
        exists_pat = re.compile(
            r"""(?:existsSync|access)\s*\(\s*['"`]"""
            r"""(?:/etc|/home|/root|/var|~|process\.env\.HOME)"""
        )
        for m in exists_pat.finditer(self.content):
            self._add_finding(
                m.start(), 'FS_PROBING',
                f'Probes filesystem paths: {m.group(0)[:60]}',
                'medium', 'reconnaissance', 10,
            )

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------

    def _add_finding(
        self,
        char_offset: int,
        rule_id: str,
        description: str,
        severity: str,
        category: str,
        weight: int,
    ) -> None:
        """Compute line number from character offset and append a finding."""
        line_num = self.content[:char_offset].count('\n') + 1
        self.findings.append({
            'ruleId': rule_id,
            'severity': severity,
            'category': category,
            'title': description,
            'file': self.file_path,
            'line': line_num,
            'match': self.content[char_offset:char_offset + 60]
                         .replace('\n', ' ').strip(),
            'context': (self.lines[line_num - 1] if line_num - 1 < len(self.lines)
                        else '').strip()[:200],
            'weight': weight,
        })

    @staticmethod
    def _decode_hex_escapes(s: str) -> str:
        """Decode \\xNN escape sequences in a string."""
        try:
            return re.sub(
                r'\\x([0-9a-fA-F]{2})',
                lambda m: chr(int(m.group(1), 16)),
                s,
            )
        except Exception:
            return s

    @staticmethod
    def _decode_unicode_escapes(s: str) -> str:
        """Decode \\uNNNN escape sequences in a string."""
        try:
            return re.sub(
                r'\\u([0-9a-fA-F]{4})',
                lambda m: chr(int(m.group(1), 16)),
                s,
            )
        except Exception:
            return s
