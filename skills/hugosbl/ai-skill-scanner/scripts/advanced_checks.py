#!/usr/bin/env python3  # noscan
"""  # noscan
Advanced security checks beyond regex pattern matching.  # noscan
Modules: entropy, evasion, payload decoder, dependencies, Python AST,  # noscan
structural, JS/TS analysis, data flow, steganography, network destinations,  # noscan
temporal/conditional triggers.  # noscan
"""  # noscan

import ast  # noscan
import base64  # noscan
import binascii  # noscan
import json  # noscan
import math  # noscan
import os  # noscan
import re  # noscan
import struct  # noscan
from dataclasses import dataclass  # noscan
from pathlib import Path  # noscan
from typing import Optional  # noscan

NOSCAN = re.compile(r"#\s*noscan|<!--\s*noscan\s*-->")  # noscan

SKIP_DIRS = {"node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build"}  # noscan
SCANNABLE = {".js", ".mjs", ".cjs", ".ts", ".py", ".sh", ".bash", ".md", ".txt", ".json", ".yaml", ".yml"}  # noscan


def _lines(content):  # noscan
    """Yield (line_num, line) skipping noscan-marked lines."""  # noscan
    for i, line in enumerate(content.split("\n"), 1):  # noscan
        if not NOSCAN.search(line):  # noscan
            yield i, line  # noscan


# ── 1. Entropy ───────────────────────────────────────────────────────────────  # noscan

def shannon_entropy(data):  # noscan
    if not data:  # noscan
        return 0.0  # noscan
    freq = {}  # noscan
    for c in data:  # noscan
        freq[c] = freq.get(c, 0) + 1  # noscan
    length = len(data)  # noscan
    return -sum((count / length) * math.log2(count / length) for count in freq.values())  # noscan


def find_high_entropy_strings(content, min_length=40, threshold=4.5):  # noscan
    findings = []  # noscan
    pats = [  # noscan
        re.compile(r'''["']([A-Za-z0-9+/=]{40,})["']'''),  # noscan
        re.compile(r'''["']([0-9a-fA-F]{40,})["']'''),  # noscan
        re.compile(r'''["']([A-Za-z0-9_\-]{60,})["']'''),  # noscan
    ]  # noscan
    for line_num, line in _lines(content):  # noscan
        for pat in pats:  # noscan
            for match in pat.finditer(line):  # noscan
                s = match.group(1)  # noscan
                if len(s) >= min_length:  # noscan
                    ent = shannon_entropy(s)  # noscan
                    if ent >= threshold:  # noscan
                        findings.append({"check": "ENTROPY_HIGH", "severity": "MEDIUM",  # noscan
                            "description": f"High-entropy string (entropy={ent:.2f}, len={len(s)}) — possible encoded payload",  # noscan
                            "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
    return findings  # noscan


# ── 2. String Reconstruction ─────────────────────────────────────────────────  # noscan

def find_string_concatenation_evasion(content):  # noscan
    findings = []  # noscan
    concat_pat = re.compile(r"""['"]([a-zA-Z]{2,8})['""]\s*(?:\+|\.\s*concat)\s*['"]([a-zA-Z/:]{2,8})['"]""")  # noscan
    bad_pairs = [  # noscan
        ("htt","://"),("web","hoo"),("ev","al"),("ex","ec"),("fet","ch"),  # noscan
        ("cu","rl"),("bas","e64"),(".ss","h/"),(".en","v"),(".aw","s/"),  # noscan
        ("priv","ate"),("see","d"),  # noscan
    ]  # noscan
    join_pat = re.compile(r"""\[(?:\s*['"][a-zA-Z/:._\-]?['"]\s*,?\s*){4,}\]\s*\.\s*join\s*\(""")  # noscan
    tmpl_pat = re.compile(r"""`\$\{[^}]+\}:?//\$\{[^}]+\}""")  # noscan
    rev_pat = re.compile(r"""['"][a-zA-Z]{3,}['"]\s*\.split\s*\(\s*['"]['""]\s*\)\s*\.reverse\s*\(\s*\)\s*\.join""")  # noscan

    for line_num, line in _lines(content):  # noscan
        for m in concat_pat.finditer(line):  # noscan
            p1, p2 = m.group(1).lower(), m.group(2).lower()  # noscan
            for s1, s2 in bad_pairs:  # noscan
                if s1 in p1 and s2 in p2:  # noscan
                    findings.append({"check": "EVASION_CONCAT", "severity": "HIGH",  # noscan
                        "description": f"String concat evasion: '{s1}...{s2}'",  # noscan
                        "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
                    break  # noscan
        if join_pat.search(line):  # noscan
            findings.append({"check": "EVASION_ARRAY_JOIN", "severity": "HIGH",  # noscan
                "description": "Array.join() string construction — evasion technique",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if tmpl_pat.search(line):  # noscan
            findings.append({"check": "EVASION_TEMPLATE_URL", "severity": "MEDIUM",  # noscan
                "description": "URL from template variables — verify destination",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if rev_pat.search(line):  # noscan
            findings.append({"check": "EVASION_REVERSE", "severity": "HIGH",  # noscan
                "description": "String reverse construction — evasion technique",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
    return findings  # noscan


# ── 3. Payload Decoder ───────────────────────────────────────────────────────  # noscan

DANGER_DECODED = re.compile(  # noscan
    r"(?:https?://|\.ssh|\.aws|\.env|private.?key|seed.?phrase)",  # noscan
    re.IGNORECASE)  # noscan


def decode_and_check_payloads(content):  # noscan
    findings = []  # noscan
    b64_pat = re.compile(r"""(?:atob|Buffer\.from|b64decode|decode)\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]""")  # noscan
    hex_pat = re.compile(r"""(?:Buffer\.from|fromhex|unhexlify)\s*\(\s*['"]([0-9a-fA-F]{20,})['"]""")  # noscan

    for line_num, line in _lines(content):  # noscan
        for m in b64_pat.finditer(line):  # noscan
            try:  # noscan
                decoded = base64.b64decode(m.group(1)).decode("utf-8", errors="replace")  # noscan
                if DANGER_DECODED.search(decoded):  # noscan
                    findings.append({"check": "PAYLOAD_B64_MALICIOUS", "severity": "CRITICAL",  # noscan
                        "description": f"Base64 → malicious: {decoded[:100]}",  # noscan
                        "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            except Exception:  # noscan
                pass  # noscan
        for m in hex_pat.finditer(line):  # noscan
            try:  # noscan
                decoded = binascii.unhexlify(m.group(1)).decode("utf-8", errors="replace")  # noscan
                if DANGER_DECODED.search(decoded):  # noscan
                    findings.append({"check": "PAYLOAD_HEX_MALICIOUS", "severity": "CRITICAL",  # noscan
                        "description": f"Hex → malicious: {decoded[:100]}",  # noscan
                        "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            except Exception:  # noscan
                pass  # noscan
    return findings  # noscan


# ── 4. Dependencies ──────────────────────────────────────────────────────────  # noscan

BAD_NPM = {"event-stream","flatmap-stream","colors","faker","ua-parser-js","coa","rc","node-ipc"}  # noscan

TYPO_PATS = [  # noscan
    (r"^cross-env-\w+$", "cross-env"),  # noscan
    (r"^lodas[hg]$", "lodash"),  # noscan
    (r"^expresss$", "express"),  # noscan
]  # noscan


def check_dependencies(skill_path):  # noscan
    findings = []  # noscan
    pkg = skill_path / "package.json"  # noscan
    if pkg.exists():  # noscan
        try:  # noscan
            data = json.loads(pkg.read_text())  # noscan
            deps = {}  # noscan
            for k in ("dependencies","devDependencies","peerDependencies","optionalDependencies"):  # noscan
                deps.update(data.get(k, {}))  # noscan
            for name in deps:  # noscan
                if name in BAD_NPM:  # noscan
                    findings.append({"check": "DEP_KNOWN_MALICIOUS", "severity": "CRITICAL",  # noscan
                        "description": f"Known compromised package: {name}",  # noscan
                        "line_num": 0, "line_content": f"package.json → {name}"})  # noscan
                for pat, legit in TYPO_PATS:  # noscan
                    if re.match(pat, name) and name != legit:  # noscan
                        findings.append({"check": "DEP_TYPOSQUAT", "severity": "HIGH",  # noscan
                            "description": f"Typosquat? '{name}' (meant '{legit}'?)",  # noscan
                            "line_num": 0, "line_content": f"package.json → {name}"})  # noscan
            scripts = data.get("scripts", {})  # noscan
            for sn in ("preinstall", "postinstall", "preuninstall"):  # noscan
                if sn in scripts:  # noscan
                    findings.append({"check": "DEP_INSTALL_SCRIPT", "severity": "HIGH",  # noscan
                        "description": f"Has '{sn}' script: {scripts[sn][:100]}",  # noscan
                        "line_num": 0, "line_content": f"scripts.{sn}"})  # noscan
        except Exception:  # noscan
            pass  # noscan
    for rf in ("requirements.txt", "requirements-dev.txt"):  # noscan
        rp = skill_path / rf  # noscan
        if rp.exists():  # noscan
            for ln, line in enumerate(rp.read_text().split("\n"), 1):  # noscan
                line = line.strip()  # noscan
                if line and not line.startswith("#") and any(x in line for x in ("git+","http://","https://","svn+")):  # noscan
                    findings.append({"check": "DEP_REMOTE_INSTALL", "severity": "HIGH",  # noscan
                        "description": f"Remote dependency: {line[:100]}",  # noscan
                        "line_num": ln, "line_content": line[:200]})  # noscan
    return findings  # noscan


# ── 5. Python AST ────────────────────────────────────────────────────────────  # noscan

DANGEROUS_IMPORTS = {"subprocess","os","shutil","socket","http.client","urllib.request","requests","paramiko","ftplib","smtplib","ctypes","webbrowser"}  # noscan
DANGEROUS_CALLS = {"eval","exec","compile","execfile","__import__","os.system","os.popen","subprocess.call","subprocess.run","subprocess.Popen","os.execvp"}  # noscan
SENSITIVE_PATHS = [".ssh",".aws",".env",".npmrc",".docker",".kube",".gnupg","credentials","keychain",".clawdbot",".openai"]  # noscan


def analyze_python_ast(filepath):  # noscan
    findings = []  # noscan
    try:  # noscan
        source = filepath.read_text()  # noscan
        tree = ast.parse(source, filename=str(filepath))  # noscan
    except (SyntaxError, OSError):  # noscan
        return findings  # noscan

    has_network = False  # noscan
    has_file_read = False  # noscan
    has_exec = False  # noscan

    for node in ast.walk(tree):  # noscan
        if isinstance(node, ast.Import):  # noscan
            for alias in node.names:  # noscan
                mod = alias.name.split(".")[0]  # noscan
                if mod in DANGEROUS_IMPORTS:  # noscan
                    findings.append({"check": "AST_DANGEROUS_IMPORT", "severity": "LOW",  # noscan
                        "description": f"Imports: {alias.name}",  # noscan
                        "line_num": node.lineno, "line_content": f"import {alias.name}"})  # noscan
        elif isinstance(node, ast.ImportFrom) and node.module:  # noscan
            mod = node.module.split(".")[0]  # noscan
            if mod in DANGEROUS_IMPORTS:  # noscan
                names = ", ".join(a.name for a in node.names)  # noscan
                findings.append({"check": "AST_DANGEROUS_IMPORT", "severity": "LOW",  # noscan
                    "description": f"From {node.module} import {names}",  # noscan
                    "line_num": node.lineno, "line_content": f"from {node.module} import {names}"})  # noscan
        elif isinstance(node, ast.Call):  # noscan
            fn = ""  # noscan
            if isinstance(node.func, ast.Name):  # noscan
                fn = node.func.id  # noscan
            elif isinstance(node.func, ast.Attribute):  # noscan
                if isinstance(node.func.value, ast.Name):  # noscan
                    fn = f"{node.func.value.id}.{node.func.attr}"  # noscan
                else:  # noscan
                    fn = node.func.attr  # noscan
            if fn in DANGEROUS_CALLS:  # noscan
                has_exec = True  # noscan
                findings.append({"check": "AST_DANGEROUS_CALL", "severity": "HIGH",  # noscan
                    "description": f"Dangerous call: {fn}()",  # noscan
                    "line_num": node.lineno, "line_content": f"{fn}(...)"})  # noscan
            if any(fn.startswith(m) for m in ("requests.","urllib.","http.","socket.")):  # noscan
                has_network = True  # noscan
            if fn == "open" and node.args:  # noscan
                arg = node.args[0]  # noscan
                if isinstance(arg, ast.Constant) and isinstance(arg.value, str):  # noscan
                    if any(s in arg.value for s in SENSITIVE_PATHS):  # noscan
                        has_file_read = True  # noscan
                        findings.append({"check": "AST_SENSITIVE_FILE_READ", "severity": "HIGH",  # noscan
                            "description": f"Opens sensitive: {arg.value}",  # noscan
                            "line_num": node.lineno, "line_content": f'open("{arg.value}")'})  # noscan

    if has_network and has_file_read:  # noscan
        findings.append({"check": "BEHAVIOR_EXFILTRATION", "severity": "CRITICAL",  # noscan
            "description": "Reads sensitive files AND makes network calls — likely exfiltration",  # noscan
            "line_num": 0, "line_content": "(behavioral analysis)"})  # noscan
    if has_exec and has_network:  # noscan
        findings.append({"check": "BEHAVIOR_RCE", "severity": "CRITICAL",  # noscan
            "description": "Dynamic code exec AND network calls — possible RCE",  # noscan
            "line_num": 0, "line_content": "(behavioral analysis)"})  # noscan
    return findings  # noscan


# ── 6. Structural ────────────────────────────────────────────────────────────  # noscan

def check_skill_structure(skill_path):  # noscan
    findings = []  # noscan
    safe_hidden = {".env.example", ".gitignore", ".editorconfig", ".birdrc.json5"}  # noscan
    for root, dirs, files in os.walk(skill_path):  # noscan
        dirs[:] = [d for d in dirs if d not in {".git","__pycache__","node_modules"}]  # noscan
        for f in files:  # noscan
            fpath = Path(root) / f  # noscan
            if f.startswith(".") and f not in safe_hidden:  # noscan
                findings.append({"check": "STRUCT_HIDDEN_FILE", "severity": "MEDIUM",  # noscan
                    "description": f"Hidden file: {f}",  # noscan
                    "line_num": 0, "line_content": str(fpath)})  # noscan
            ext = fpath.suffix.lower()  # noscan
            if ext in (".exe",".dll",".so",".dylib",".bin",".dat",".wasm"):  # noscan
                findings.append({"check": "STRUCT_BINARY", "severity": "HIGH",  # noscan
                    "description": f"Binary file: {f}",  # noscan
                    "line_num": 0, "line_content": str(fpath)})  # noscan
    skill_md = skill_path / "SKILL.md"  # noscan
    if skill_md.exists():  # noscan
        content = skill_md.read_text(errors="replace")  # noscan
        unsafe = [  # noscan
            (r"disable.*(?:security|firewall|antivirus)", "Disables security"),  # noscan
            (r"chmod\s+777", "World-writable permissions"),  # noscan
            (r"--no-verify", "Skips verification"),  # noscan
            (r"curl.*\|\s*(?:bash|sh|zsh)", "Pipe-to-shell pattern"),  # noscan
        ]  # noscan
        for ln, line in _lines(content):  # noscan
            for pat, desc in unsafe:  # noscan
                if re.search(pat, line, re.IGNORECASE):  # noscan
                    findings.append({"check": "STRUCT_UNSAFE_INSTRUCTION", "severity": "HIGH",  # noscan
                        "description": desc,  # noscan
                        "line_num": ln, "line_content": line.strip()[:200]})  # noscan
    return findings  # noscan


# ── 7. JavaScript / TypeScript Analysis ──────────────────────────────────────  # noscan

JS_EXTENSIONS = {".js", ".mjs", ".cjs", ".ts"}  # noscan


def analyze_js_ts(filepath, content):  # noscan
    """Analyze JS/TS files for suspicious patterns with smart regex."""  # noscan
    findings = []  # noscan
    if filepath.suffix.lower() not in JS_EXTENSIONS:  # noscan
        return findings  # noscan
    has_network = False  # noscan
    has_file_read = False  # noscan
    has_exec = False  # noscan
    has_env_access = False  # noscan
    has_child_process = False  # noscan
    dyn_require = re.compile(r"""require\s*\(\s*(?!['"`])""")  # noscan
    eval_pat = re.compile(r"""(?:^|[\s;(,=])(?:eval|new\s+Function)\s*\(""")  # noscan
    net_var_pat = re.compile(  # noscan
        r"""(?:fetch|axios\.(?:get|post|put|delete|patch|request)|got|got\.(?:get|post)"""  # noscan
        r"""|request|http\.(?:get|request)|https\.(?:get|request))\s*\(\s*(?!['"`]|https?://)""")  # noscan
    net_any_pat = re.compile(  # noscan
        r"""(?:fetch|axios|got|request|http\.(?:get|request)|https\.(?:get|request))\s*\(""")  # noscan
    env_pat = re.compile(r"""process\.env(?:\s*[\[.])""")  # noscan
    fs_pat = re.compile(  # noscan
        r"""(?:fs|require\s*\(\s*['"]fs['"]\s*\))\s*\.\s*"""  # noscan
        r"""(?:readFile|readFileSync|readdir|readdirSync|createReadStream|writeFile|writeFileSync)\s*\(""")  # noscan
    fs_sensitive = re.compile(  # noscan
        r"""(?:readFile|readFileSync|createReadStream)\s*\([^)]*"""  # noscan
        r"""(?:\.ssh|\.aws|\.env|\.npmrc|\.docker|\.kube|\.gnupg|credentials|keychain|auth|"""  # noscan
        r"""secret|private.?key|\.clawdbot|\.openai)""")  # noscan
    cp_pat = re.compile(  # noscan
        r"""(?:child_process|require\s*\(\s*['"]child_process['"]\s*\))\s*\."""  # noscan
        r"""(?:exec|execSync|spawn|spawnSync|fork|execFile)\s*\(""")  # noscan
    cp_import = re.compile(  # noscan
        r"""(?:require\s*\(\s*['"]child_process['"]\s*\)|from\s+['"]child_process['"])""")  # noscan
    for line_num, line in _lines(content):  # noscan
        if dyn_require.search(line):  # noscan
            findings.append({"check": "JS_DYNAMIC_REQUIRE", "severity": "HIGH",  # noscan
                "description": "Dynamic require() with variable — code injection risk",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if eval_pat.search(line):  # noscan
            has_exec = True  # noscan
            findings.append({"check": "JS_EVAL_FUNCTION", "severity": "HIGH",  # noscan
                "description": "eval() or new Function() — dynamic code execution",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if net_var_pat.search(line):  # noscan
            has_network = True  # noscan
            findings.append({"check": "JS_NET_VARIABLE_DEST", "severity": "HIGH",  # noscan
                "description": "Network call to variable destination (not static URL)",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        elif net_any_pat.search(line):  # noscan
            has_network = True  # noscan
        if env_pat.search(line):  # noscan
            has_env_access = True  # noscan
            findings.append({"check": "JS_PROCESS_ENV", "severity": "MEDIUM",  # noscan
                "description": "process.env access — reads environment variables",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if fs_sensitive.search(line):  # noscan
            has_file_read = True  # noscan
            findings.append({"check": "JS_SENSITIVE_FILE_READ", "severity": "HIGH",  # noscan
                "description": "Reads sensitive file path in JS",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        elif fs_pat.search(line):  # noscan
            has_file_read = True  # noscan
        if cp_pat.search(line) or cp_import.search(line):  # noscan
            has_child_process = True  # noscan
            findings.append({"check": "JS_CHILD_PROCESS", "severity": "MEDIUM",  # noscan
                "description": "child_process usage — command execution capability",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
    if has_network and has_file_read:  # noscan
        findings.append({"check": "JS_BEHAVIOR_EXFILTRATION", "severity": "CRITICAL",  # noscan
            "description": "JS: network calls + sensitive file reads = potential data exfiltration",  # noscan
            "line_num": 0, "line_content": "(cross-behavior analysis)"})  # noscan
    if has_network and has_env_access:  # noscan
        findings.append({"check": "JS_BEHAVIOR_ENV_EXFIL", "severity": "CRITICAL",  # noscan
            "description": "JS: network calls + env access = potential credential exfiltration",  # noscan
            "line_num": 0, "line_content": "(cross-behavior analysis)"})  # noscan
    if has_exec and has_network:  # noscan
        findings.append({"check": "JS_BEHAVIOR_RCE", "severity": "CRITICAL",  # noscan
            "description": "JS: eval/Function + network = potential remote code execution",  # noscan
            "line_num": 0, "line_content": "(cross-behavior analysis)"})  # noscan
    if has_child_process and has_network:  # noscan
        findings.append({"check": "JS_BEHAVIOR_CMD_NET", "severity": "HIGH",  # noscan
            "description": "JS: child_process + network = potential C2 channel",  # noscan
            "line_num": 0, "line_content": "(cross-behavior analysis)"})  # noscan
    return findings  # noscan


# ── 8. Data Flow Analysis (Python) ───────────────────────────────────────────  # noscan

def _ast_get_name_refs(node):  # noscan
    """Recursively collect all Name references in an AST subtree."""  # noscan
    refs = set()  # noscan
    for child in ast.walk(node):  # noscan
        if isinstance(child, ast.Name):  # noscan
            refs.add(child.id)  # noscan
    return refs  # noscan


def _ast_get_call_name(node):  # noscan
    """Get dotted name of a Call node's function (up to 3 levels)."""  # noscan
    if not isinstance(node, ast.Call):  # noscan
        return ""  # noscan
    if isinstance(node.func, ast.Name):  # noscan
        return node.func.id  # noscan
    if isinstance(node.func, ast.Attribute):  # noscan
        val = node.func.value  # noscan
        if isinstance(val, ast.Name):  # noscan
            return f"{val.id}.{node.func.attr}"  # noscan
        if isinstance(val, ast.Attribute) and isinstance(val.value, ast.Name):  # noscan
            return f"{val.value.id}.{val.attr}.{node.func.attr}"  # noscan
        return node.func.attr  # noscan
    return ""  # noscan


def _is_file_read_call(node):  # noscan
    """Check if an AST Call node represents reading a file."""  # noscan
    if not isinstance(node, ast.Call):  # noscan
        return False  # noscan
    fn = _ast_get_call_name(node)  # noscan
    if fn == "open":  # noscan
        return True  # noscan
    if fn in ("read", "read_text", "readlines"):  # noscan
        return True  # noscan
    if isinstance(node.func, ast.Attribute):  # noscan
        if node.func.attr in ("read", "readlines", "readline", "read_text"):  # noscan
            return True  # noscan
    return False  # noscan


def _is_env_read_node(node):  # noscan
    """Check if AST node reads env variables."""  # noscan
    if isinstance(node, ast.Call):  # noscan
        fn = _ast_get_call_name(node)  # noscan
        if fn in ("os.getenv", "os.environ.get"):  # noscan
            return True  # noscan
    if isinstance(node, ast.Subscript):  # noscan
        if isinstance(node.value, ast.Attribute):  # noscan
            if isinstance(node.value.value, ast.Name):  # noscan
                if node.value.value.id == "os" and node.value.attr == "environ":  # noscan
                    return True  # noscan
    return False  # noscan


_NETWORK_FUNCS = {  # noscan
    "requests.get", "requests.post", "requests.put", "requests.patch",  # noscan
    "requests.delete", "requests.request",  # noscan
    "urllib.request.urlopen", "urllib.request.urlretrieve",  # noscan
    "http.client.HTTPConnection", "http.client.HTTPSConnection",  # noscan
    "socket.connect", "socket.create_connection",  # noscan
}  # noscan


_LEGIT_API_DOMAINS = {  # noscan
    "api.navitia.io", "api.sncf.com",  # noscan
    "api.laposte.fr", "developer.laposte.fr",  # noscan
    "prim.iledefrance-mobilites.fr",  # noscan
    "api.open-meteo.com",  # noscan
    "api.github.com", "api.openai.com", "api.anthropic.com",  # noscan
    "api.google.com", "googleapis.com",  # noscan
    "api.stripe.com", "api.twilio.com",  # noscan
    "api.sendgrid.com", "api.mailgun.net",  # noscan
    "api.cloudflare.com",  # noscan
    "registry.npmjs.org", "pypi.org",  # noscan
    "api.telegram.org", "discord.com",  # noscan
    "api.slack.com", "hooks.slack.com",  # noscan
}  # noscan
_AUTH_HEADER_KEYS = {"authorization", "x-api-key", "apikey", "api-key", "token", "x-auth-token", "okapi-key"}  # noscan
_AUTH_VAR_PATTERNS = re.compile(r"(?:api[_-]?key|token|auth|secret|password|credential)", re.IGNORECASE)  # noscan


def _is_legitimate_api_auth(call_node, tree):  # noscan
    """Detect if a network call is using env vars for legitimate API authentication.  # noscan
    Returns True if it looks like normal API auth (env key → auth header → known API)."""  # noscan
    all_strings = set()  # noscan
    for node in ast.walk(tree):  # noscan
        if isinstance(node, ast.Constant) and isinstance(node.value, str):  # noscan
            all_strings.add(node.value)  # noscan
    has_legit_domain = any(  # noscan
        any(domain in s for domain in _LEGIT_API_DOMAINS)  # noscan
        for s in all_strings  # noscan
    )  # noscan
    has_auth_header = any(  # noscan
        s.lower() in _AUTH_HEADER_KEYS  # noscan
        for s in all_strings  # noscan
    )  # noscan
    has_auth_var = any(  # noscan
        _AUTH_VAR_PATTERNS.search(s)  # noscan
        for s in all_strings  # noscan
    )  # noscan
    return has_legit_domain and (has_auth_header or has_auth_var)  # noscan


def _is_network_func(fn_name):  # noscan
    """Check if function name is a network call."""  # noscan
    if fn_name in _NETWORK_FUNCS:  # noscan
        return True  # noscan
    if any(fn_name.startswith(p) for p in ("requests.", "urllib.", "http.", "socket.")):  # noscan
        return True  # noscan
    return False  # noscan


def _collect_stmts(body):  # noscan
    """Collect all statements in order, recursing into compound stmts."""  # noscan
    result = []  # noscan
    for stmt in body:  # noscan
        result.append(stmt)  # noscan
        for field in ("body", "orelse", "finalbody", "handlers"):  # noscan
            child = getattr(stmt, field, None)  # noscan
            if isinstance(child, list):  # noscan
                result.extend(_collect_stmts(child))  # noscan
    return result  # noscan


def analyze_python_data_flow(filepath):  # noscan
    """Trace data flows in Python to detect file→network exfiltration."""  # noscan
    findings = []  # noscan
    try:  # noscan
        source = filepath.read_text()  # noscan
        tree = ast.parse(source, filename=str(filepath))  # noscan
    except (SyntaxError, OSError):  # noscan
        return findings  # noscan
    tainted_file = set()  # noscan
    tainted_env = set()  # noscan
    file_handles = set()  # noscan
    stmts = _collect_stmts(tree.body)  # noscan
    for stmt in stmts:  # noscan
        if isinstance(stmt, ast.With):  # noscan
            for item in stmt.items:  # noscan
                ctx = item.context_expr  # noscan
                if isinstance(ctx, ast.Call):  # noscan
                    fn = _ast_get_call_name(ctx)  # noscan
                    if fn == "open":  # noscan
                        if item.optional_vars and isinstance(item.optional_vars, ast.Name):  # noscan
                            file_handles.add(item.optional_vars.id)  # noscan
        if isinstance(stmt, ast.Assign):  # noscan
            targets = []  # noscan
            for t in stmt.targets:  # noscan
                if isinstance(t, ast.Name):  # noscan
                    targets.append(t.id)  # noscan
                elif isinstance(t, ast.Tuple):  # noscan
                    for elt in t.elts:  # noscan
                        if isinstance(elt, ast.Name):  # noscan
                            targets.append(elt.id)  # noscan
            if not targets:  # noscan
                continue  # noscan
            val = stmt.value  # noscan
            is_file = _is_file_read_call(val)  # noscan
            is_env = _is_env_read_node(val)  # noscan
            val_refs = _ast_get_name_refs(val)  # noscan
            reads_handle = bool(val_refs & file_handles)  # noscan
            if is_file or reads_handle or (val_refs & tainted_file):  # noscan
                for tgt in targets:  # noscan
                    tainted_file.add(tgt)  # noscan
            if is_env or (val_refs & tainted_env):  # noscan
                for tgt in targets:  # noscan
                    tainted_env.add(tgt)  # noscan
    for _ in range(3):  # noscan
        for stmt in stmts:  # noscan
            if isinstance(stmt, ast.Assign):  # noscan
                targets = [t.id for t in stmt.targets if isinstance(t, ast.Name)]  # noscan
                if not targets:  # noscan
                    continue  # noscan
                val_refs = _ast_get_name_refs(stmt.value)  # noscan
                if val_refs & tainted_file:  # noscan
                    for tgt in targets:  # noscan
                        tainted_file.add(tgt)  # noscan
                if val_refs & tainted_env:  # noscan
                    for tgt in targets:  # noscan
                        tainted_env.add(tgt)  # noscan
    for node in ast.walk(tree):  # noscan
        if isinstance(node, ast.Call):  # noscan
            fn = _ast_get_call_name(node)  # noscan
            if _is_network_func(fn):  # noscan
                call_refs = set()  # noscan
                for arg in node.args:  # noscan
                    call_refs |= _ast_get_name_refs(arg)  # noscan
                for kw in node.keywords:  # noscan
                    call_refs |= _ast_get_name_refs(kw.value)  # noscan
                leaked_file = call_refs & tainted_file  # noscan
                leaked_env = call_refs & tainted_env  # noscan
                is_auth_pattern = _is_legitimate_api_auth(node, tree)  # noscan
                if leaked_file:  # noscan
                    sev = "MEDIUM" if is_auth_pattern else "CRITICAL"  # noscan
                    findings.append({"check": "DATAFLOW_FILE_EXFIL", "severity": sev,  # noscan
                        "description": f"File data in vars {leaked_file} sent via {fn}() — {'possible exfiltration (review destination)' if is_auth_pattern else 'exfiltration'}",  # noscan
                        "line_num": getattr(node, "lineno", 0),  # noscan
                        "line_content": f"{fn}(...) uses file-tainted vars"})  # noscan
                if leaked_env:  # noscan
                    sev = "LOW" if is_auth_pattern else "CRITICAL"  # noscan
                    findings.append({"check": "DATAFLOW_ENV_EXFIL", "severity": sev,  # noscan
                        "description": f"Env data in vars {leaked_env} sent via {fn}() — {'API auth (expected pattern)' if is_auth_pattern else 'credential exfiltration'}",  # noscan
                        "line_num": getattr(node, "lineno", 0),  # noscan
                        "line_content": f"{fn}(...) uses env-tainted vars"})  # noscan
    return findings  # noscan


# ── 9. Steganography / Hidden Content Detection ─────────────────────────────  # noscan

MAGIC_SIGS = [  # noscan
    (b"\x89PNG\r\n\x1a\n", "image/png"),  # noscan
    (b"\xff\xd8\xff", "image/jpeg"),  # noscan
    (b"GIF87a", "image/gif"),  # noscan
    (b"GIF89a", "image/gif"),  # noscan
    (b"%PDF", "application/pdf"),  # noscan
    (b"PK\x03\x04", "application/zip"),  # noscan
    (b"\x7fELF", "application/x-elf"),  # noscan
    (b"\xfe\xed\xfa\xce", "application/x-macho"),  # noscan
    (b"\xfe\xed\xfa\xcf", "application/x-macho"),  # noscan
    (b"\xcf\xfa\xed\xfe", "application/x-macho"),  # noscan
    (b"\xca\xfe\xba\xbe", "application/x-macho"),  # noscan
    (b"MZ", "application/x-executable"),  # noscan
    (b"RIFF", "media/riff"),  # noscan
]  # noscan

EXT_EXPECTED_TYPE = {  # noscan
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",  # noscan
    ".gif": "image/gif", ".pdf": "application/pdf", ".zip": "application/zip",  # noscan
    ".gz": "application/gzip", ".tar": "application/tar",  # noscan
    ".exe": "application/x-executable", ".dll": "application/x-executable",  # noscan
    ".so": "application/x-elf", ".dylib": "application/x-macho",  # noscan
}  # noscan

TEXT_EXTENSIONS = {".js",".mjs",".cjs",".ts",".py",".sh",".bash",".md",".txt",".json",".yaml",".yml",".xml",".html",".css",".env",".ini",".cfg",".conf",".toml"}  # noscan

ZERO_WIDTH_RE = re.compile(  # noscan
    r"[\u200b\u200c\u200d\u200e\u200f\u2060\u2061\u2062\u2063\u2064\u00ad]")  # noscan


def _detect_magic(data):  # noscan
    """Detect file type from magic bytes."""  # noscan
    for sig, ftype in MAGIC_SIGS:  # noscan
        if data[:len(sig)] == sig:  # noscan
            return ftype  # noscan
    return None  # noscan


def _is_mostly_text(data):  # noscan
    """Check if binary data is mostly printable text."""  # noscan
    if not data:  # noscan
        return True  # noscan
    text_chars = sum(1 for b in data if 32 <= b <= 126 or b in (9, 10, 13))  # noscan
    return text_chars / len(data) > 0.85  # noscan


def check_steganography(skill_path):  # noscan
    """Detect hidden content: disguised files, zero-width chars, etc."""  # noscan
    findings = []  # noscan
    for root, dirs, files in os.walk(skill_path):  # noscan
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]  # noscan
        for fname in files:  # noscan
            fpath = Path(root) / fname  # noscan
            ext = fpath.suffix.lower()  # noscan
            try:  # noscan
                stat = fpath.stat()  # noscan
                if stat.st_size == 0 or stat.st_size > 10 * 1024 * 1024:  # noscan
                    continue  # noscan
            except OSError:  # noscan
                continue  # noscan
            try:  # noscan
                head = b""  # noscan
                with open(fpath, "rb") as fh:  # noscan
                    head = fh.read(512)  # noscan
            except OSError:  # noscan
                continue  # noscan
            if not head:  # noscan
                continue  # noscan
            actual_type = _detect_magic(head)  # noscan
            expected_type = EXT_EXPECTED_TYPE.get(ext)  # noscan
            if ext in TEXT_EXTENSIONS and actual_type:  # noscan
                findings.append({"check": "STEGO_DISGUISED_BINARY", "severity": "CRITICAL",  # noscan
                    "description": f"File '{fname}' has text extension {ext} but is actually {actual_type}",  # noscan
                    "file": str(fpath), "line_num": 0, "line_content": f"magic: {actual_type}"})  # noscan
            if expected_type and actual_type is None and _is_mostly_text(head):  # noscan
                if ext in (".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip"):  # noscan
                    findings.append({"check": "STEGO_FAKE_MEDIA", "severity": "HIGH",  # noscan
                        "description": f"File '{fname}' claims to be {ext} but contains text/code",  # noscan
                        "file": str(fpath), "line_num": 0,  # noscan
                        "line_content": head[:80].decode("utf-8", errors="replace")})  # noscan
            if ext in TEXT_EXTENSIONS or ext == "":  # noscan
                try:  # noscan
                    text = fpath.read_text(errors="replace")  # noscan
                except OSError:  # noscan
                    continue  # noscan
                zw_matches = ZERO_WIDTH_RE.findall(text)  # noscan
                bom_count = text.count("\ufeff")  # noscan
                zw_count = len(zw_matches) - min(bom_count, 1)  # noscan
                if zw_count > 3:  # noscan
                    positions = []  # noscan
                    for i, ch in enumerate(text):  # noscan
                        if ZERO_WIDTH_RE.match(ch):  # noscan
                            positions.append(i)  # noscan
                        if len(positions) >= 5:  # noscan
                            break  # noscan
                    findings.append({"check": "STEGO_ZERO_WIDTH", "severity": "HIGH",  # noscan
                        "description": f"File '{fname}' has {zw_count} zero-width chars — hidden instructions?",  # noscan
                        "file": str(fpath), "line_num": 0,  # noscan
                        "line_content": f"Zero-width chars at positions: {positions[:5]}"})  # noscan
    return findings  # noscan


# ── 10. Network Destination Analysis ─────────────────────────────────────────  # noscan

SUSPICIOUS_SERVICES = {  # noscan
    "webhook.site", "requestbin.com", "requestbin.net",  # noscan
    "pipedream.net", "pipedream.com",  # noscan
    "ngrok.io", "ngrok.app", "ngrok-free.app",  # noscan
    "serveo.net", "localtunnel.me",  # noscan
    "burpcollaborator.net", "oastify.com",  # noscan
    "canarytokens.com", "interact.sh", "oast.fun",  # noscan
    "dnslog.cn", "ceye.io",  # noscan
    "hookbin.com", "beeceptor.com",  # noscan
    "requestcatcher.com", "smee.io",  # noscan
    "mockbin.org", "postb.in",  # noscan
    "pastebin.com", "paste.ee", "hastebin.com",  # noscan
    "transfer.sh", "file.io",  # noscan
    "telegram-bot-api.com",  # noscan
}  # noscan

SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".cc", ".top", ".buzz", ".xyz", ".pw", ".ws", ".click", ".icu"}  # noscan

LEGIT_DOMAINS = [  # noscan
    "github.com", "gitlab.com", "bitbucket.org",  # noscan
    "npmjs.com", "npmjs.org", "pypi.org",  # noscan
    "openai.com", "anthropic.com",  # noscan
    "google.com", "googleapis.com", "microsoft.com", "apple.com",  # noscan
    "amazonaws.com", "azure.com", "cloudfront.net",  # noscan
    "discord.com", "slack.com",  # noscan
    "twitter.com", "x.com", "facebook.com",  # noscan
    "stackoverflow.com", "reddit.com",  # noscan
    "clawhub.com", "clawd.bot",  # noscan
    "docker.com", "docker.io",  # noscan
    "vercel.app", "netlify.app", "herokuapp.com",  # noscan
]  # noscan

URL_RE = re.compile(r"""https?://([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})(?:[:/]|$)""")  # noscan
IP_RE = re.compile(r"""\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b""")  # noscan
IP_SAFE = {"127.0.0.1", "0.0.0.0", "255.255.255.255", "192.168.", "10.", "172."}  # noscan


def _levenshtein(s1, s2):  # noscan
    """Compute Levenshtein edit distance between two strings."""  # noscan
    if len(s1) < len(s2):  # noscan
        return _levenshtein(s2, s1)  # noscan
    if len(s2) == 0:  # noscan
        return len(s1)  # noscan
    prev = list(range(len(s2) + 1))  # noscan
    for i, c1 in enumerate(s1):  # noscan
        curr = [i + 1]  # noscan
        for j, c2 in enumerate(s2):  # noscan
            cost = 0 if c1 == c2 else 1  # noscan
            curr.append(min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost))  # noscan
        prev = curr  # noscan
    return prev[-1]  # noscan


def _get_tld(domain):  # noscan
    """Extract TLD from domain name."""  # noscan
    parts = domain.rsplit(".", 1)  # noscan
    if len(parts) == 2:  # noscan
        return "." + parts[1]  # noscan
    return ""  # noscan


def _is_lookalike(domain):  # noscan
    """Check if domain is a lookalike of a legitimate domain."""  # noscan
    domain_lower = domain.lower()  # noscan
    for legit in LEGIT_DOMAINS:  # noscan
        if domain_lower == legit:  # noscan
            continue  # noscan
        if domain_lower.endswith("." + legit):  # noscan
            continue  # noscan
        base = domain_lower.split(".")  # noscan
        legit_base = legit.split(".")  # noscan
        if len(base) >= 2 and len(legit_base) >= 2:  # noscan
            d = _levenshtein(base[-2], legit_base[-2])  # noscan
            if 0 < d <= 2 and len(base[-2]) > 3:  # noscan
                return legit  # noscan
    if re.search(r"(?:api|cdn|auth|login|oauth|sso|account)[.-]", domain_lower):  # noscan
        for legit in LEGIT_DOMAINS:  # noscan
            parts = legit.split(".")  # noscan
            if len(parts) >= 2 and parts[-2] in domain_lower and domain_lower != legit:  # noscan
                if not domain_lower.endswith("." + legit):  # noscan
                    return legit  # noscan
    return None  # noscan


def check_network_destinations(content, filepath):  # noscan
    """Extract and analyze URLs/IPs in code for suspicious destinations."""  # noscan
    findings = []  # noscan
    seen_domains = set()  # noscan
    seen_ips = set()  # noscan
    for line_num, line in _lines(content):  # noscan
        for m in URL_RE.finditer(line):  # noscan
            domain = m.group(1).lower()  # noscan
            if domain in seen_domains:  # noscan
                continue  # noscan
            seen_domains.add(domain)  # noscan
            for svc in SUSPICIOUS_SERVICES:  # noscan
                if domain == svc or domain.endswith("." + svc):  # noscan
                    findings.append({"check": "NET_DEST_SUSPICIOUS_SVC", "severity": "CRITICAL",  # noscan
                        "description": f"URL to known exfiltration/data collection service: {domain}",  # noscan
                        "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
                    break  # noscan
            tld = _get_tld(domain)  # noscan
            if tld in SUSPICIOUS_TLDS:  # noscan
                findings.append({"check": "NET_DEST_SUSPICIOUS_TLD", "severity": "MEDIUM",  # noscan
                    "description": f"URL uses suspicious TLD: {domain} ({tld})",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            lookalike = _is_lookalike(domain)  # noscan
            if lookalike:  # noscan
                findings.append({"check": "NET_DEST_LOOKALIKE", "severity": "HIGH",  # noscan
                    "description": f"Domain '{domain}' looks like '{lookalike}' — possible typosquat",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        for m in IP_RE.finditer(line):  # noscan
            ip = m.group(1)  # noscan
            if ip in seen_ips:  # noscan
                continue  # noscan
            seen_ips.add(ip)  # noscan
            parts = ip.split(".")  # noscan
            try:  # noscan
                octets = [int(p) for p in parts]  # noscan
            except ValueError:  # noscan
                continue  # noscan
            if any(o > 255 for o in octets):  # noscan
                continue  # noscan
            is_safe = False  # noscan
            if ip == "127.0.0.1" or ip == "0.0.0.0" or ip == "255.255.255.255":  # noscan
                is_safe = True  # noscan
            if ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172."):  # noscan
                is_safe = True  # noscan
            if not is_safe:  # noscan
                findings.append({"check": "NET_DEST_RAW_IP", "severity": "HIGH",  # noscan
                    "description": f"Code contacts raw IP address: {ip}",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
    return findings  # noscan


# ── 11. Temporal / Conditional Triggers ──────────────────────────────────────  # noscan

def check_temporal_triggers(content, filepath):  # noscan
    """Detect code that executes only under specific conditions."""  # noscan
    findings = []  # noscan
    ext = filepath.suffix.lower()  # noscan
    date_cond_js = re.compile(  # noscan
        r"""(?:if|while|&&|\|\|)\s*\(?.*"""  # noscan
        r"""(?:Date\.now\s*\(\)|new\s+Date|getTime\s*\(\))\s*"""  # noscan
        r"""(?:[><=!]+)\s*\d{8,}""")  # noscan
    date_cond_py = re.compile(  # noscan
        r"""(?:if|while|and|or)\s+.*"""  # noscan
        r"""(?:datetime\.now|time\.time|date\.today)\s*\(\)\s*"""  # noscan
        r"""(?:[><=!]+)""")  # noscan
    hostname_js = re.compile(  # noscan
        r"""(?:os\.hostname|require\s*\(\s*['"]os['"]\s*\)\.hostname)\s*\(\)\s*"""  # noscan
        r"""(?:===?|!==?|==)\s*['"]""")  # noscan
    hostname_py = re.compile(  # noscan
        r"""(?:socket\.gethostname|platform\.node|os\.uname)\s*\(\)\s*"""  # noscan
        r"""(?:==|!=|in\s)""")  # noscan
    env_gate_js = re.compile(  # noscan
        r"""(?:if|while|&&|\|\|)\s*\(?.*process\.env\.\w+\s*(?:===?|!==?|==)\s*['"]""")  # noscan
    env_gate_py = re.compile(  # noscan
        r"""(?:if|while)\s+.*(?:os\.environ|os\.getenv)\s*[\[(].*(?:==|!=|in\s)""")  # noscan
    delayed_exec = re.compile(  # noscan
        r"""setTimeout\s*\([^,]+,\s*(\d+)\s*\)""")  # noscan
    delayed_interval = re.compile(  # noscan
        r"""setInterval\s*\([^,]+,\s*(\d+)\s*\)""")  # noscan
    platform_cond = re.compile(  # noscan
        r"""(?:if|while|&&|\|\|)\s*\(?.*(?:process\.platform|os\.platform\s*\(\)|sys\.platform|os\.name)\s*(?:===?|!==?|==)\s*['"]""")  # noscan
    for line_num, line in _lines(content):  # noscan
        if ext in JS_EXTENSIONS or ext in (".js", ".mjs", ".cjs", ".ts"):  # noscan
            if date_cond_js.search(line):  # noscan
                findings.append({"check": "TRIGGER_DATE_CONDITION", "severity": "HIGH",  # noscan
                    "description": "Date-based conditional — code activates at specific time",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            if hostname_js.search(line):  # noscan
                findings.append({"check": "TRIGGER_HOSTNAME", "severity": "HIGH",  # noscan
                    "description": "Hostname check — code targets specific machine",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            if env_gate_js.search(line):  # noscan
                findings.append({"check": "TRIGGER_ENV_GATE", "severity": "MEDIUM",  # noscan
                    "description": "Env-gated execution — only runs in specific environment",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            m = delayed_exec.search(line)  # noscan
            if m:  # noscan
                delay_ms = int(m.group(1))  # noscan
                if delay_ms >= 3600000:  # noscan
                    hours = delay_ms / 3600000  # noscan
                    findings.append({"check": "TRIGGER_DELAYED_EXEC", "severity": "HIGH",  # noscan
                        "description": f"setTimeout with {hours:.1f}h delay — delayed execution",  # noscan
                        "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            m = delayed_interval.search(line)  # noscan
            if m:  # noscan
                delay_ms = int(m.group(1))  # noscan
                if delay_ms >= 3600000:  # noscan
                    hours = delay_ms / 3600000  # noscan
                    findings.append({"check": "TRIGGER_DELAYED_INTERVAL", "severity": "HIGH",  # noscan
                        "description": f"setInterval with {hours:.1f}h delay — periodic delayed execution",  # noscan
                        "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if ext == ".py":  # noscan
            if date_cond_py.search(line):  # noscan
                findings.append({"check": "TRIGGER_DATE_CONDITION", "severity": "HIGH",  # noscan
                    "description": "Date-based conditional — code activates at specific time",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            if hostname_py.search(line):  # noscan
                findings.append({"check": "TRIGGER_HOSTNAME", "severity": "HIGH",  # noscan
                    "description": "Hostname check — code targets specific machine",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
            if env_gate_py.search(line):  # noscan
                findings.append({"check": "TRIGGER_ENV_GATE", "severity": "MEDIUM",  # noscan
                    "description": "Env-gated execution — only runs in specific environment",  # noscan
                    "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
        if platform_cond.search(line):  # noscan
            findings.append({"check": "TRIGGER_PLATFORM_CHECK", "severity": "MEDIUM",  # noscan
                "description": "Platform-specific conditional — OS-targeted code",  # noscan
                "line_num": line_num, "line_content": line.strip()[:200]})  # noscan
    return findings  # noscan


# ── Main ─────────────────────────────────────────────────────────────────────  # noscan

def run_advanced_checks(skill_path):  # noscan
    path = Path(skill_path).resolve()  # noscan
    all_findings = []  # noscan
    all_findings.extend(check_skill_structure(path))  # noscan
    all_findings.extend(check_dependencies(path))  # noscan
    all_findings.extend(check_steganography(path))  # noscan
    for root, dirs, files in os.walk(path):  # noscan
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]  # noscan
        for fname in files:  # noscan
            fpath = Path(root) / fname  # noscan
            if fpath.suffix.lower() not in SCANNABLE:  # noscan
                continue  # noscan
            try:  # noscan
                content = fpath.read_text(errors="replace")  # noscan
            except OSError:  # noscan
                continue  # noscan
            for f in find_high_entropy_strings(content):  # noscan
                f["file"] = str(fpath); all_findings.append(f)  # noscan
            for f in find_string_concatenation_evasion(content):  # noscan
                f["file"] = str(fpath); all_findings.append(f)  # noscan
            for f in decode_and_check_payloads(content):  # noscan
                f["file"] = str(fpath); all_findings.append(f)  # noscan
            for f in analyze_js_ts(fpath, content):  # noscan
                f["file"] = str(fpath); all_findings.append(f)  # noscan
            for f in check_network_destinations(content, fpath):  # noscan
                f["file"] = str(fpath); all_findings.append(f)  # noscan
            for f in check_temporal_triggers(content, fpath):  # noscan
                f["file"] = str(fpath); all_findings.append(f)  # noscan
            if fpath.suffix == ".py":  # noscan
                for f in analyze_python_ast(fpath):  # noscan
                    f["file"] = str(fpath); all_findings.append(f)  # noscan
                for f in analyze_python_data_flow(fpath):  # noscan
                    f["file"] = str(fpath); all_findings.append(f)  # noscan
    return all_findings  # noscan
