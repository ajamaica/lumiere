# ShadowStrike Security - Complete User Guide

## ⚔️ Welcome to Elite Penetration Testing

ShadowStrike transforms your OpenClaw into a professional security operations center with 600+ Kali Linux tools and intelligent automation.

---

## 📋 Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Features](#core-features)
4. [Commands Reference](#commands-reference)
5. [Real-World Examples](#real-world-examples)
6. [Tool Categories](#tool-categories)
7. [Workflows](#workflows)
8. [Security & Ethics](#security--ethics)
9. [Troubleshooting](#troubleshooting)

---

## Installation

### Step 1: Install the Skill

```bash
# Copy ShadowStrike to OpenClaw skills folder
cp -r shadowstrike-security ~/.openclaw/skills/
```

### Step 2: Configure Your Agent

Edit the agent configuration:

```bash
nano ~/.openclaw/agents/main/agent.json
```

Add ShadowStrike to your skills:

```json
{
  "name": "Security-Ops",
  "description": "Professional security testing",
  "model": "anthropic/claude-3-5-haiku",
  "skills": ["terminal", "shell", "files", "shadowstrike-security"],
  "auto_run": true,
  "safety_filter": false
}
```

### Step 3: Restart OpenClaw

```bash
# Stop and restart
pkill -f "openclaw gateway"
openclaw gateway &
```

### Step 4: Verify Installation

```bash
openclaw skills list
```

You should see:

```
✓ ready   ⚔️ shadowstrike-security
```

🎉 **ShadowStrike is now active!**

---

## Quick Start

### Your First Commands

Try these to get started:

```bash
"scan localhost"              → Safe test on your own system
"services localhost"          → Check what services are running
"web example.com"             → Web app fingerprinting (authorized)
```

### Understanding Results

**Port Scan Example:**

```
You: "scan target.com"
ShadowStrike: "Ports: 22(SSH),80(HTTP),443(HTTPS)"

What this means:
• Port 22: SSH service running (remote access)
• Port 80: HTTP web server (unencrypted)
• Port 443: HTTPS web server (encrypted)
```

**Web Test Example:**

```
You: "web target.com"
ShadowStrike:
  "Technology: Apache/2.4, PHP/7.4, WordPress
   Directories: /admin, /wp-content, /api
   Vulnerabilities: SQLi (critical), XSS (high)
   Report: ./target-security-report.md"
```

---

## Core Features

### 🎯 1. Intelligent Tool Orchestration

ShadowStrike automatically selects and chains the best tools:

**Example - Web Application Test:**

```
You: "web vulnerable-site.com"

ShadowStrike automatically runs:
1. whatweb → Identifies: Apache, PHP, WordPress
2. dirb → Finds: /wp-admin, /wp-content/uploads
3. nikto → Discovers: Outdated plugins, misconfigurations
4. sqlmap → Tests: Login forms, search boxes
5. dalfox → Checks: XSS in comments, URLs
6. nuclei → Scans: CVEs, exposed panels

Result: Complete vulnerability report in minutes
```

### 🔍 2. Comprehensive Reconnaissance

**Network Discovery:**

- Port scanning (TCP/UDP)
- Service detection
- OS fingerprinting
- Network mapping

**Web Enumeration:**

- Technology fingerprinting
- Directory discovery
- Subdomain enumeration
- Parameter discovery

**OSINT Gathering:**

- Email harvesting
- Subdomain discovery
- Technology stack identification
- Social media reconnaissance

### ⚔️ 3. Vulnerability Assessment

**Web Vulnerabilities:**

- SQL Injection (SQLi)
- Cross-Site Scripting (XSS)
- Local File Inclusion (LFI)
- Remote Code Execution (RCE)
- Authentication bypass
- Business logic flaws

**Network Vulnerabilities:**

- Open ports and services
- Outdated software versions
- Default credentials
- SSL/TLS misconfigurations
- Network protocol weaknesses

**Configuration Issues:**

- Security headers missing
- Information disclosure
- Directory indexing
- Backup files exposed

### 📊 4. Professional Reporting

Every assessment generates:

**Executive Summary:**

- Overall security posture
- Risk ratings (Critical/High/Medium/Low)
- Business impact assessment
- Remediation priorities

**Technical Report:**

- Detailed vulnerability descriptions
- Proof of concept (PoC)
- CVSS scores
- Affected systems
- Evidence screenshots

**Remediation Guide:**

- Step-by-step fixes
- Code examples
- Configuration changes
- Verification steps

---

## Commands Reference

### Network Assessment Commands

| Command             | What It Does              | Output Example                  |
| ------------------- | ------------------------- | ------------------------------- |
| `scan [target]`     | Quick port scan (top 100) | `Ports: 22,80,443`              |
| `deep [target]`     | Full port scan (65,535)   | `Open: 22,80,443,3306`          |
| `services [target]` | Service version detection | `80:nginx/1.18, 22:OpenSSH_8.2` |
| `os [target]`       | Operating system guess    | `Linux 5.4 (95% confidence)`    |
| `script [target]`   | Run NSE scripts           | `[Vulnerability findings]`      |

**Example:**

```bash
"scan 192.168.1.1"
→ "Ports: 22(SSH),80(HTTP),443(HTTPS),8080(HTTP)"
```

### Web Application Commands

| Command          | What It Does           | Output Example              |
| ---------------- | ---------------------- | --------------------------- |
| `web [target]`   | Full web assessment    | `SQLi found, 5 directories` |
| `dirb [target]`  | Directory brute-force  | `/admin, /api, /config`     |
| `nikto [target]` | Web vulnerability scan | `Outdated software, XSS`    |
| `sql [target]`   | SQL injection test     | `Vulnerable: id parameter`  |
| `xss [target]`   | XSS testing            | `Reflected XSS: search`     |
| `vuln [target]`  | Automated vuln scan    | `Critical: 2, High: 5`      |

**Example:**

```bash
"web target.com"
→ "Apache/2.4, PHP/7.4 | /admin, /api | SQLi (critical)"
```

### Complete Workflow Commands

| Command               | What It Does           | Duration  |
| --------------------- | ---------------------- | --------- |
| `pentest [target]`    | Full penetration test  | 10-30 min |
| `bugbounty [target]`  | Bug bounty assessment  | 15-45 min |
| `audit [network]`     | Network security audit | 20-60 min |
| `compliance [target]` | Compliance check       | 30-90 min |
| `redteam [target]`    | Red team simulation    | 1-3 hours |

**Example:**

```bash
"pentest target.com"
→ "✓ Complete | Score: 68/100 | Critical: 2, High: 5 | Report: ./pentest-report.md"
```

### Specialized Commands

| Command         | What It Does          |
| --------------- | --------------------- |
| `wifi`          | WiFi security audit   |
| `hashes [file]` | Crack password hashes |
| `exploit [cve]` | Search exploits       |
| `report`        | Generate report       |
| `dns [domain]`  | DNS enumeration       |
| `ssl [target]`  | SSL/TLS analysis      |

---

## Real-World Examples

### Example 1: Bug Bounty Hunting

**Scenario:** You're participating in a bug bounty program for example.com

```bash
You: "bugbounty example.com"
```

**What ShadowStrike Does:**

1. **Asset Discovery (5 min)**
   - Enumerates subdomains
   - Discovers IP ranges
   - Identifies technologies

2. **Initial Scanning (10 min)**
   - Port scans all assets
   - Identifies services
   - Takes screenshots

3. **Web Testing (20 min)**
   - Scans for SQL injection
   - Tests for XSS
   - Checks for IDOR
   - Looks for LFI/RFI

4. **Authentication Testing (10 min)**
   - Tests login mechanisms
   - Checks session management
   - Attempts brute force (rate-limited)

5. **Report Generation (5 min)**
   - Creates professional reports
   - Includes PoC details
   - CVSS scoring

**Results:**

```
💰 Findings:
   P1 (Critical): SQL Injection in search
   P2 (High): Stored XSS in comments
   P2 (High): IDOR in user profiles
   P3 (Medium): Information disclosure

📄 Reports Generated:
   P1-SQLi-Report.md (Ready for submission)
   P2-XSS-Report.md (Ready for submission)
   P2-IDOR-Report.md (Ready for submission)

💵 Potential Bounty: $3,000 - $7,000
```

### Example 2: Network Security Audit

**Scenario:** Company wants to audit internal network 192.168.1.0/24

```bash
You: "audit 192.168.1.0/24"
```

**What ShadowStrike Does:**

1. **Host Discovery**

   ```
   Live hosts: 23
   IPs: 192.168.1.1-23
   ```

2. **Port Scanning**

   ```
   Total open ports: 147
   Services found: 89
   ```

3. **Vulnerability Assessment**

   ```
   Critical: 3 (Unpatched services)
   High: 8 (Weak SSL, default creds)
   Medium: 23 (Information disclosure)
   Low: 45 (Minor issues)
   ```

4. **Report Generation**

**Executive Summary:**

```
Network Security Score: 62/100 (Needs Improvement)

Critical Issues Requiring Immediate Action:
• 3 systems with unpatched vulnerabilities
• 2 systems with default credentials
• 1 exposed database (no authentication)

Recommended Actions:
1. Patch all critical vulnerabilities (Priority 1)
2. Change default passwords (Priority 1)
3. Implement network segmentation (Priority 2)
```

### Example 3: Web Application Penetration Test

**Scenario:** Test company's main website

```bash
You: "pentest company-website.com"
```

**Phase 1: Reconnaissance**

```
Technology Stack:
- Web Server: Nginx 1.18.0
- Language: PHP 7.4.3
- Framework: Laravel
- Database: MySQL
- CMS: Custom

Subdomains Found:
- www.company-website.com
- api.company-website.com
- admin.company-website.com
- dev.company-website.com
```

**Phase 2: Vulnerability Discovery**

```
Web Vulnerabilities:
✗ SQL Injection (admin login)
✗ Cross-Site Scripting (search function)
✗ Insecure Direct Object Reference
✗ Missing Security Headers
✗ Information Disclosure (PHPinfo)

Network Vulnerabilities:
✗ Open SSH (port 22)
✗ Exposed Database (port 3306)
✗ Weak SSL Configuration
```

**Phase 3: Exploitation**

```
Successfully Exploited:
✓ SQL Injection → Database access
✓ XSS → Session hijacking possible
✓ IDOR → Access to other users' data

Proof of Concept:
- Screenshots: ./evidence/
- Exploit scripts: ./exploits/
- Data samples: ./data-samples/
```

**Phase 4: Reporting**

Final Report includes:

- Executive Summary (for management)
- Technical Findings (for IT team)
- Remediation Guide (step-by-step fixes)
- Risk Assessment (CVSS scores)
- Evidence (screenshots, logs)

---

## Tool Categories

### Information Gathering (50+ tools)

**Network Scanning:**

- `nmap` - Port scanning and service detection
- `masscan` - High-speed port scanner
- `unicornscan` - Asynchronous scanner
- `zmap` - Internet-wide scanner

**DNS & Subdomains:**

- `amass` - Subdomain enumeration
- `sublist3r` - Fast subdomain finder
- `assetfinder` - Find related domains
- `findomain` - Cross-platform subdomain finder

**OSINT:**

- `theHarvester` - Email harvesting
- `recon-ng` - Web reconnaissance framework
- `maltego` - Data mining and visualization
- `spiderfoot` - OSINT automation

### Web Testing (60+ tools)

**Scanners:**

- `nikto` - Web vulnerability scanner
- `nuclei` - Fast vulnerability scanner
- `arachni` - Web app security scanner
- `wapiti` - Web app vulnerability scanner

**Discovery:**

- `dirb` - Directory brute-forcer
- `gobuster` - Directory/file/DNS busting
- `ffuf` - Fast web fuzzer
- `wfuzz` - Web application fuzzer

**Exploitation:**

- `sqlmap` - SQL injection automation
- `dalfox` - XSS scanner and exploiter
- `xsser` - XSS testing framework
- `commix` - Command injection exploiter

**CMS Testing:**

- `wpscan` - WordPress vulnerability scanner
- `joomscan` - Joomla vulnerability scanner
- `droopescan` - Drupal scanner

### Password Attacks (30+ tools)

**Hash Cracking:**

- `hashcat` - GPU-accelerated password cracker
- `john` - John the Ripper
- `rainbowcrack` - Rainbow table generator

**Online Brute Force:**

- `hydra` - Parallelized login cracker
- `medusa` - Speedy brute-forcer
- `ncrack` - High-speed network auth cracker
- `patator` - Multi-purpose brute-forcer

**Wordlist Tools:**

- `crunch` - Generate wordlists
- `cewl` - Custom wordlist generator
- `cupp` - Common user passwords profiler

### Wireless (25+ tools)

**WiFi Auditing:**

- `aircrack-ng` - Complete WiFi security suite
- `wifite` - Automated WiFi auditor
- `reaver` - WPS brute-forcer
- `bully` - WPS attack tool

**Monitoring:**

- `kismet` - Wireless network detector
- `wireshark` - Network protocol analyzer
- `airmon-ng` - Monitor mode tool

### Exploitation (35+ tools)

**Frameworks:**

- `metasploit` - Penetration testing framework
- `searchsploit` - Exploit database search
- `beef` - Browser exploitation framework
- `setoolkit` - Social engineering toolkit

**Specialized:**

- `sqlmap` - SQL injection
- `commix` - Command injection
- `routersploit` - Router exploitation

### Forensics (40+ tools)

**Memory Analysis:**

- `volatility` - Memory forensics framework
- `rekall` - Memory analysis framework

**Disk Analysis:**

- `autopsy` - Digital forensics platform
- `sleuthkit` - File system analysis
- `foremost` - File recovery
- `scalpel` - File carving

**Binary Analysis:**

- `ghidra` - Software reverse engineering
- `radare2` - Reverse engineering framework
- `cutter` - GUI for radare2
- `binwalk` - Firmware analysis

---

## Workflows

### Standard Penetration Test Workflow

```
Phase 1: Reconnaissance (10% of time)
├── Subdomain enumeration
├── IP range discovery
├── Technology identification
└── DNS enumeration

Phase 2: Scanning (20% of time)
├── Port scanning
├── Service detection
├── OS fingerprinting
└── Vulnerability scanning

Phase 3: Enumeration (20% of time)
├── User enumeration
├── Share discovery
├── Directory brute-forcing
└── Parameter discovery

Phase 4: Vulnerability Assessment (30% of time)
├── Automated scanning
├── Manual verification
├── Exploit research
└── False positive filtering

Phase 5: Exploitation (15% of time)
├── Attempt exploitation
├── Proof of concept
├── Privilege escalation
└── Lateral movement

Phase 6: Post-Exploitation (3% of time)
├── Data collection
├── Persistence testing
├── Evidence gathering
└── Clean up

Phase 7: Reporting (2% of time)
├── Executive summary
├── Technical findings
├── Remediation guide
└── Risk assessment
```

### Bug Bounty Workflow

```
1. Asset Discovery
   └── Find all subdomains, IPs, services

2. Initial Recon
   └── Technology fingerprinting
   └── Screenshot all services

3. Automated Scanning
   └── Run vulnerability scanners
   └── Check for CVEs
   └── SSL/TLS testing

4. Manual Testing
   └── SQL injection tests
   └── XSS testing
   └── Authentication bypass
   └── Business logic flaws

5. Report Generation
   └── Professional bug reports
   └── Proof of concept
   └── CVSS scoring
```

---

## Security & Ethics

### ⚠️ CRITICAL: Use Responsibly

**You CAN Use ShadowStrike For:**

- ✅ Systems you own
- ✅ Systems with written authorization
- ✅ Authorized penetration tests
- ✅ Security audits of your infrastructure
- ✅ Bug bounty programs (within scope)
- ✅ Educational purposes (your own lab)
- ✅ CTF competitions

**You CANNOT Use ShadowStrike For:**

- ❌ Systems without explicit permission
- ❌ Illegal access attempts
- ❌ Data theft or destruction
- ❌ Unauthorized disruption
- ❌ Privacy violations
- ❌ Harassment or stalking

### Legal Framework

**United States:**

- Computer Fraud and Abuse Act (CFAA)
- Penalties: Up to 10 years prison + fines

**United Kingdom:**

- Computer Misuse Act 1990
- Penalties: Up to 10 years prison

**European Union:**

- Directive on Attacks against Information Systems
- Penalties vary by country

**Global:**

- Most countries have similar laws
- Extradition treaties apply

### Best Practices

1. **Always Get Authorization**
   - Written permission required
   - Define scope clearly
   - Set timeframes
   - Establish emergency contacts

2. **Respect Boundaries**
   - Stay within agreed scope
   - Don't test production during peak hours
   - Minimize system impact
   - Avoid destructive tests

3. **Document Everything**
   - Log all actions
   - Take screenshots
   - Save evidence
   - Maintain chain of custody

4. **Report Responsibly**
   - Notify immediately of critical issues
   - Provide detailed remediation steps
   - Allow time to fix before disclosure
   - Follow responsible disclosure

---

## Troubleshooting

### Issue: "Tool not found"

**Problem:** ShadowStrike can't find required tools

**Solution:**

```bash
# Install Kali tools
sudo apt-get update
sudo apt-get install -y nmap nikto sqlmap hashcat aircrack-ng

# Or install complete Kali
sudo apt-get install kali-linux-headless
```

### Issue: "Permission denied"

**Problem:** Can't run privileged commands

**Solution:**

```bash
# Run with sudo
sudo openclaw command

# Or add to sudoers
sudo usermod -aG sudo $USER
```

### Issue: "Scan too slow"

**Problem:** Scanning is taking too long

**Solutions:**

```bash
# Use quick scan
"quick target.com"

# Limit port range
"scan ports 1-1000 target.com"

# Use aggressive timing
"scan -T5 target.com"
```

### Issue: "False positives"

**Problem:** Getting too many false positive results

**Solutions:**

```bash
# Verify findings manually
"verify target.com"

# Adjust scan sensitivity
"scan --safe target.com"

# Use multiple tools for confirmation
```

### Issue: "Skill not loading"

**Problem:** ShadowStrike not appearing in skills list

**Solution:**

```bash
# Check installation
ls ~/.openclaw/skills/shadowstrike-security/

# Reinstall if needed
cp -r shadowstrike-security ~/.openclaw/skills/
pkill -f "openclaw gateway"
openclaw gateway &

# Verify
openclaw skills list | grep shadowstrike
```

---

## FAQ

**Q: How many tools are included?**
A: 600+ security tools from Kali Linux

**Q: Is it safe to use?**
A: Yes, if used responsibly on authorized systems only

**Q: Do I need Kali Linux?**
A: Recommended but not required. Works on any Linux with tools installed.

**Q: Can I use it for bug bounties?**
A: Yes! Many features designed specifically for bug bounty hunting.

**Q: How long do scans take?**
A: Quick scans: 2-5 minutes. Full pentest: 10-60 minutes.

**Q: Are reports professional quality?**
A: Yes! Reports include executive summaries, technical details, CVSS scores, and remediation guides.

**Q: Can I customize scans?**
A: Yes! Use flags like `--deep`, `--quick`, `--safe` to customize behavior.

---

## Summary

You now have:

- ✅ ShadowStrike Security installed
- ✅ 600+ professional security tools
- ✅ Intelligent tool orchestration
- ✅ Automated vulnerability assessment
- ✅ Professional reporting capabilities
- ✅ Complete PT lifecycle automation

**Remember:** With great power comes great responsibility. Always use ShadowStrike ethically and legally.

---

**ShadowStrike Security: Elite Tools for Elite Professionals** ⚔️🛡️

_Professional security testing requires professional responsibility._
