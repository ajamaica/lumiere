# OG-OpenClawGuard

[![npm version](https://img.shields.io/npm/v/og-openclawguard.svg)](https://www.npmjs.com/package/og-openclawguard)
[![GitHub](https://img.shields.io/github/license/openguardrails/og-openclawguard)](https://github.com/openguardrails/og-openclawguard)

Detect prompt injection attacks hidden in long content (emails, web pages, documents).

Powered by [OpenGuardrails](https://openguardrails.com) SOTA security detection capabilities.

**GitHub**: [https://github.com/openguardrails/og-openclawguard](https://github.com/openguardrails/og-openclawguard)

**npm**: [https://www.npmjs.com/package/og-openclawguard](https://www.npmjs.com/package/og-openclawguard)

## OpenGuardrails - State-of-the-Art Security Detection

OpenGuardrails achieves SOTA results across multilingual safety benchmarks, outperforming LlamaGuard, Qwen3Guard, and other leading guard models.

| Metric | Score | Comparison |
|--------|-------|------------|
| English Prompt F1 | **87.1%** | +2.8% vs next best |
| English Response F1 | **88.5%** | +8.0% vs next best |
| Multilingual Prompt F1 | **97.3%** | +12.3% vs next best |
| Multilingual Response F1 | **97.2%** | +19.1% vs next best |

**Core Capabilities:**

- **Unified LLM Architecture** - Single 14B dense model quantized to 3.3B via GPTQ. Handles both content-safety and manipulation detection with superior semantic understanding.
- **Configurable Policy Adaptation** - Dynamic per-request policy with continuous sensitivity thresholds. Tune precision-recall trade-offs in real time via probabilistic logit-space control.
- **119 Languages** - Robust multilingual coverage with SOTA results on English, Chinese, and cross-lingual benchmarks. Includes 97k Chinese safety dataset contribution.
- **Production Efficiency** - P95 latency of 274.6ms with high concurrency. GPTQ quantization enables real-time inference at enterprise scale without sacrificing accuracy.

**Technical Paper**: [https://arxiv.org/abs/2510.19169](https://arxiv.org/abs/2510.19169)

## How It Works

```
Long Content (email/webpage/document)
         |
         v
   +-----------+
   |  Chunker  |  Split into 4000 char chunks with 200 char overlap
   +-----------+
         |
         v
   +-----------+
   |LLM Analysis|  Analyze each chunk independently with full focus
   | (OG-Text)  |  "Is there a hidden prompt injection in this content?"
   +-----------+
         |
         v
   +-----------+
   |  Verdict  |  Aggregate findings from all chunks -> isInjection: true/false
   +-----------+
```

## Installation

```bash
# Install from npm
openclaw plugins install og-openclawguard

# Restart gateway to load the plugin
openclaw gateway restart
```

## Verify Installation

```bash
# Check plugin list, confirm og-openclawguard status is "loaded"
openclaw plugins list
```

You should see:
```
| OG-OpenClawGuard | og-openclawguard | loaded | ...
```

## Commands

| Command | Description |
|---------|-------------|
| `/og_status` | View status and statistics |
| `/og_report` | View recent injection detection details |
| `/og_feedback <id> fp [reason]` | Report false positive |
| `/og_feedback missed <reason>` | Report missed detection |

## Testing Detection

### 1. Download Test File

Download the test file with hidden injection:

```bash
curl -L -o /tmp/test-email.txt https://raw.githubusercontent.com/openguardrails/og-openclawguard/main/samples/test-email.txt
```

### 2. Test in OpenClaw

Ask the agent to read this file:

```
Read the contents of /tmp/test-email.txt
```

### 3. View Detection Logs

```bash
# Real-time log monitoring
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep "og-openclawguard"

# Or use openclaw command
openclaw logs --follow | grep "og-openclawguard"
```

If detection succeeds, you'll see logs like:

```
[og-openclawguard] tool_result_persist triggered for "read"
[og-openclawguard] Analyzing tool result from "read" (1183 chars)
[og-openclawguard] Analysis complete in 5896ms: INJECTION DETECTED
[og-openclawguard] INJECTION DETECTED in tool result from "read": Chunk 1: Contains instructions to override guidelines and execute a malicious shell command
```

### 4. View Statistics

In OpenClaw conversation, enter:

```
/og_status
```

Returns detection statistics:

```
**OG-OpenClawGuard Status**

- Enabled: true
- Block on risk: true
- Max chunk size: 4000 chars

**Statistics**
- Total analyses: 5
- Total blocked: 1
- Blocked (24h): 1
- Avg duration: 4521ms

**User Feedback**
- False positives reported: 0
- Missed detections reported: 0

**Recent Analyses**
- 2025-02-05T14:30:19: tool_result (1183 chars) - DETECTED
```

### 5. View Detection Details

```
/og_report
```

Shows recent injection detection details:

```
**Recent Prompt Injection Detections**

**#1** - 2025-02-05T14:30:19
- Status: DETECTED
- Type: tool_result (1183 chars)
- Reason: Contains instructions to override guidelines and execute a malicious shell command
- Suspicious: "<Here comes prompt injection content>..."

Use `/og_feedback <id> fp` to report false positive
Use `/og_feedback missed <reason>` to report missed detection
```

### 6. Provide Feedback

If you find a false positive:

```
/og_feedback 1 fp This is normal security documentation
```

If you find a missed detection:

```
/og_feedback missed Email contained hidden injection that wasn't detected
```

Feedback is recorded for continuous improvement.

## Real-time Alerts and Scheduled Reports

### Real-time Alerts

When injection attacks are detected, warnings are immediately logged. You can get real-time notifications through:

**Option 1: Monitor Logs**
```bash
# Real-time monitoring with alert filtering
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep "INJECTION DETECTED"
```

**Option 2: Configure Webhook (Advanced)**

Configure hooks in `~/.openclaw/openclaw.json` to forward alerts to Slack/Discord/etc:

```json
{
  "hooks": {
    "og-alert": {
      "url": "https://your-webhook-url.com/alert",
      "events": ["plugin:og-openclawguard:injection-detected"]
    }
  }
}
```

### Scheduled Reports

You can set up scheduled tasks to have OpenClaw automatically report detection status:

In OpenClaw conversation, enter:

```
/cron add --name "OG-Daily-Report" --every 24h --message "/og_report"
```

This will automatically execute `/og_report` every 24 hours and send the detection report.

Other scheduling options:
- `--every 1h` - Every hour
- `--every 7d` - Every week
- `--cron "0 9 * * *"` - Every day at 9 AM (cron expression)

View scheduled tasks:
```
/cron list
```

Remove scheduled task:
```
/cron remove OG-Daily-Report
```

## Configuration

Edit OpenClaw config file (`~/.openclaw/openclaw.json`):

```json
{
  "plugins": {
    "entries": {
      "og-openclawguard": {
        "enabled": true,
        "config": {
          "blockOnRisk": true,
          "maxChunkSize": 4000,
          "overlapSize": 200,
          "timeoutMs": 60000
        }
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | true | Enable/disable plugin |
| `blockOnRisk` | true | Block tool calls when injection is detected |
| `maxChunkSize` | 4000 | Maximum characters per chunk |
| `overlapSize` | 200 | Overlap characters between chunks |
| `timeoutMs` | 60000 | Analysis timeout in milliseconds |

## Uninstall

```bash
openclaw plugins uninstall og-openclawguard
openclaw gateway restart
```

## Development

```bash
# Clone repository
git clone https://github.com/openguardrails/og-openclawguard.git
cd og-openclawguard

# Install dependencies
npm install

# Local development install
openclaw plugins install -l .
openclaw gateway restart

# Type check
npm run typecheck

# Run tests
npm test
```

## License

MIT
