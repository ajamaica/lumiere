"""Vulnerability pattern definitions for ClawdHub Security Auditor."""

from __future__ import annotations

from typing import TypedDict


class Pattern(TypedDict):
    id: str
    name: str
    regex: str
    description: str


PATTERNS: dict[str, list[Pattern]] = {
    "critical": [
        {
            "id": "DESTRUCT_001",
            "name": "Recursive deletion with dangerous target",
            "regex": r"rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)\s+.*(\/\s|\/\"|\/\'|\/\)|\/;|\$HOME|\$WORKSPACE|~\/|\/etc|\/usr|\/var)",
            "description": "Recursive rm targeting root, home, workspace, or system directories.",
        },
        {
            "id": "DESTRUCT_002",
            "name": "rm -rf / (direct)",
            "regex": r"rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+/\s",
            "description": "Direct recursive deletion of root filesystem.",
        },
        {
            "id": "INJECT_001",
            "name": "Pipe to shell (curl/wget)",
            "regex": r"(curl|wget)\s+[^\|]*\|\s*(bash|sh|zsh|dash|eval|python[23]?|perl|ruby|node)",
            "description": "Downloads content and pipes directly to a shell interpreter.",
        },
        {
            "id": "INJECT_002",
            "name": "eval on variable/command substitution",
            "regex": r"eval\s+[\"\']*\$",
            "description": "Evaluating dynamically constructed strings — command injection risk.",
        },
        {
            "id": "EXFIL_001",
            "name": "Credential exfiltration via HTTP",
            "regex": r"(curl|wget)\s+.*(-d\s|--data\s|--data-raw\s|--data-urlencode\s).*(\$[A-Z_]*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY|APIKEY|PASS))",
            "description": "Sending environment variable secrets to an external URL.",
        },
        {
            "id": "EXFIL_002",
            "name": "Env var dump to network",
            "regex": r"(curl|wget)\s+.*(\benv\b|printenv|set\b).*\|",
            "description": "Dumping environment variables and piping to network tool.",
        },
        {
            "id": "EXFIL_003",
            "name": "Sending secrets via DNS/HTTP exfiltration",
            "regex": r"(curl|wget|nc|ncat)\s+.*\$\(cat\s+(/etc/shadow|/etc/passwd|~/\.ssh|~/\.gnupg|~/\.aws)",
            "description": "Exfiltrating sensitive files via network requests.",
        },
        {
            "id": "B64_EXEC_001",
            "name": "Base64 decode and execute",
            "regex": r"(base64\s+(-d|--decode)|atob)\s*.*\|\s*(bash|sh|eval|python[23]?|perl|source)",
            "description": "Decoding base64 payload and piping to interpreter.",
        },
        {
            "id": "B64_EXEC_002",
            "name": "Echo base64 pipe to decode and exec",
            "regex": r"echo\s+['\"]?[A-Za-z0-9+/=]{20,}['\"]?\s*\|\s*base64\s+(-d|--decode)\s*\|\s*(bash|sh|eval)",
            "description": "Inline base64 payload decoded and executed.",
        },
        {
            "id": "SYSWRITE_001",
            "name": "Writing to /etc/",
            "regex": r"(>|tee|cp|mv|install)\s+.*\/etc\/",
            "description": "Writing to system configuration directory.",
        },
        {
            "id": "SYSWRITE_002",
            "name": "Writing to ~/.ssh/",
            "regex": r"(>|tee|cp|mv|install|cat\s.*>>?)\s*.*~\/\.ssh\/",
            "description": "Modifying SSH keys or configuration.",
        },
        {
            "id": "SYSWRITE_003",
            "name": "Writing to ~/.gnupg/",
            "regex": r"(>|tee|cp|mv|install)\s+.*~\/\.gnupg\/",
            "description": "Modifying GPG keyring.",
        },
        {
            "id": "CHMOD_001",
            "name": "chmod 777 on sensitive paths",
            "regex": r"chmod\s+777\s+.*(\/etc|\/usr|\/var|~\/\.ssh|~\/\.gnupg|\/home)",
            "description": "Setting world-writable permissions on sensitive paths.",
        },
        {
            "id": "REVSHELL_001",
            "name": "Reverse shell (bash /dev/tcp)",
            "regex": r"(bash\s+-i\s*.*\/dev\/tcp|\/dev\/tcp\/\d)",
            "description": "Bash reverse shell via /dev/tcp.",
        },
        {
            "id": "REVSHELL_002",
            "name": "Reverse shell (netcat)",
            "regex": r"(nc|ncat|netcat)\s+(-e\s|--exec\s|-c\s).*\/(bash|sh)",
            "description": "Netcat reverse shell with exec.",
        },
        {
            "id": "REVSHELL_003",
            "name": "Reverse shell (python/perl/ruby)",
            "regex": r"(python[23]?|perl|ruby)\s+-[ec]\s+.*socket.*connect",
            "description": "Scripted reverse shell via socket connect.",
        },
        {
            "id": "REVSHELL_004",
            "name": "Reverse shell (mkfifo pipe)",
            "regex": r"mkfifo\s+.*\|\s*(nc|ncat|netcat|bash|sh)",
            "description": "Named pipe reverse shell.",
        },
    ],
    "high": [
        {
            "id": "PROMPT_INJ_001",
            "name": "Prompt injection: ignore previous",
            "regex": r"(?i)(ignore\s+(all\s+)?previous\s+instructions|disregard\s+(all\s+)?prior|forget\s+(everything|all\s+previous)|override\s+system\s+prompt)",
            "description": "Prompt injection attempt to override agent instructions.",
        },
        {
            "id": "PROMPT_INJ_002",
            "name": "Prompt injection: new role assignment",
            "regex": r"(?i)(you\s+are\s+now|from\s+now\s+on\s+you|act\s+as\s+if|pretend\s+you\s+are|your\s+new\s+(role|instructions))",
            "description": "Prompt injection attempting to reassign the agent's role.",
        },
        {
            "id": "PROMPT_INJ_003",
            "name": "Prompt injection: hidden instructions",
            "regex": r"(?i)(system:\s*you\s+must|<\s*system\s*>|BEGIN\s+SYSTEM\s+PROMPT|\[INST\]|\[\/INST\])",
            "description": "Hidden system prompt injection markers.",
        },
        {
            "id": "UNTRUSTED_REG_001",
            "name": "Installing from untrusted registry",
            "regex": r"(npm\s+install|pip\s+install|gem\s+install)\s+.*--registry\s+http[s]?:\/\/(?!registry\.(npmjs\.org|pypi\.org|rubygems\.org))",
            "description": "Installing packages from non-standard registries.",
        },
        {
            "id": "UNTRUSTED_REG_002",
            "name": "pip install from URL",
            "regex": r"pip[3]?\s+install\s+.*https?:\/\/(?!pypi\.org)",
            "description": "Installing Python packages directly from arbitrary URLs.",
        },
        {
            "id": "PATH_MOD_001",
            "name": "Modifying PATH",
            "regex": r"(^|\s)(export\s+)?PATH\s*=",
            "description": "Modifying the PATH environment variable — potential hijacking.",
        },
        {
            "id": "SETUID_001",
            "name": "Creating setuid/setgid binary",
            "regex": r"chmod\s+[u+]*[0-7]*[4-7][0-7]{2}\s|chmod\s+[ug]\+s\s",
            "description": "Setting setuid or setgid bits on a file.",
        },
        {
            "id": "SKILL_ESCAPE_001",
            "name": "Accessing other skills' directories",
            "regex": r"\.\.\/(\.\.\/)*skills\/|\/skills\/[a-z]",
            "description": "Path traversal to access other installed skills.",
        },
        {
            "id": "OBFUSC_001",
            "name": "Hex-encoded command strings",
            "regex": r"\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){4,}",
            "description": "Long hex-encoded strings — potential obfuscated payload.",
        },
        {
            "id": "OBFUSC_002",
            "name": "Octal-encoded command strings",
            "regex": r"\\[0-3][0-7]{2}(\\[0-3][0-7]{2}){4,}",
            "description": "Long octal-encoded strings — potential obfuscated payload.",
        },
        {
            "id": "OBFUSC_003",
            "name": "Python exec/compile on encoded data",
            "regex": r"(exec|compile)\s*\(\s*(bytes\.fromhex|codecs\.decode|base64\.|binascii\.)",
            "description": "Executing decoded/deobfuscated code in Python.",
        },
        {
            "id": "CRON_001",
            "name": "Crontab modification",
            "regex": r"(crontab\s+-[elr]|\/etc\/cron)",
            "description": "Modifying cron jobs for persistence.",
        },
        {
            "id": "DOCKER_ESCAPE_001",
            "name": "Docker socket access",
            "regex": r"\/var\/run\/docker\.sock",
            "description": "Accessing Docker socket — container escape risk.",
        },
    ],
    "medium": [
        {
            "id": "NOPIN_001",
            "name": "npm install without version pinning",
            "regex": r"npm\s+install\s+[a-z@][a-z0-9@/_-]*\s*$",
            "description": "Installing npm packages without pinned versions.",
        },
        {
            "id": "NOPIN_002",
            "name": "pip install without version pinning",
            "regex": r"pip[3]?\s+install\s+[a-z][a-z0-9_-]*\s*$",
            "description": "Installing Python packages without pinned versions.",
        },
        {
            "id": "GLOB_DEL_001",
            "name": "Broad glob deletion",
            "regex": r"rm\s+(-[a-zA-Z]*\s+)*\*",
            "description": "Deleting with wildcard glob — risky in wrong directory.",
        },
        {
            "id": "GLOB_DEL_002",
            "name": "find with -delete",
            "regex": r"find\s+\/\s.*-delete",
            "description": "find from root with -delete — dangerous scope.",
        },
        {
            "id": "NOERR_001",
            "name": "Missing set -e in bash script",
            "regex": r"^#!\s*\/bin\/(ba)?sh(?!.*set\s+-e)",
            "description": "Bash script without set -e — errors silently ignored.",
        },
        {
            "id": "INSECURE_TOOL_001",
            "name": "Using telnet",
            "regex": r"\btelnet\s+",
            "description": "Using telnet — cleartext protocol.",
        },
        {
            "id": "INSECURE_TOOL_002",
            "name": "Using ftp (not sftp)",
            "regex": r"(?<![s])\bftp\s+",
            "description": "Using FTP instead of SFTP — cleartext protocol.",
        },
        {
            "id": "HTTP_001",
            "name": "HTTP instead of HTTPS",
            "regex": r"http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])",
            "description": "Using HTTP for non-local URLs — no encryption.",
        },
        {
            "id": "CURL_INSECURE_001",
            "name": "curl with --insecure/-k",
            "regex": r"curl\s+.*(-k\s|--insecure)",
            "description": "Disabling TLS certificate verification.",
        },
        {
            "id": "WGET_NOCHECK_001",
            "name": "wget --no-check-certificate",
            "regex": r"wget\s+.*--no-check-certificate",
            "description": "Disabling TLS certificate verification in wget.",
        },
        {
            "id": "TMPFILE_001",
            "name": "Predictable temp file",
            "regex": r"\/tmp\/[a-zA-Z_][a-zA-Z0-9_]*\.(sh|py|txt|dat)",
            "description": "Using predictable temp file names — symlink attack risk.",
        },
        {
            "id": "SUDO_001",
            "name": "Sudo usage",
            "regex": r"\bsudo\s+",
            "description": "Using sudo — privilege escalation in a skill context.",
        },
    ],
    "low": [
        {
            "id": "META_001",
            "name": "Missing license",
            "regex": r"__NO_FILE_MATCH__",  # Checked via metadata, not regex
            "description": "No LICENSE file found in the skill.",
        },
        {
            "id": "META_002",
            "name": "No SKILL.md metadata",
            "regex": r"__NO_FILE_MATCH__",  # Checked via metadata
            "description": "SKILL.md is missing or has no frontmatter metadata.",
        },
        {
            "id": "META_003",
            "name": "Large file in skill",
            "regex": r"__NO_FILE_MATCH__",  # Checked via file size
            "description": "File exceeding 1MB found — unusual for a skill.",
        },
        {
            "id": "META_004",
            "name": "No changelog",
            "regex": r"__NO_FILE_MATCH__",  # Checked via metadata
            "description": "No CHANGELOG or changelog found in the skill.",
        },
        {
            "id": "STYLE_001",
            "name": "TODO/FIXME/HACK comments",
            "regex": r"(?i)(TODO|FIXME|HACK|XXX|TEMP)\s*:",
            "description": "Unfinished work markers — quality concern.",
        },
    ],
}
