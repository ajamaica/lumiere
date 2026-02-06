# Risk Events Log

**Purpose**: Document all risk events, near-misses, and lessons learned. This is how we prevent repeat mistakes.

---

## Risk Event Summary

| ID  | Date | Level | Type | Impact | Status |
| --- | ---- | ----- | ---- | ------ | ------ |
| -   | -    | -     | -    | -      | -      |

---

## Risk Level Definitions

| Level       | Trigger                           | Required Response                             |
| ----------- | --------------------------------- | --------------------------------------------- |
| 🟢 Normal   | Within all limits                 | Continue trading                              |
| 🟡 Caution  | -3% daily OR 3 consecutive losses | Reduce size 50%, review                       |
| 🟠 Warning  | -5% daily OR -10% weekly          | Pause new entries, full review                |
| 🔴 Critical | -10% daily OR -15% weekly         | Close all, full stop, Rick approval to resume |

---

## Risk Event Types

1. **DRAWDOWN** - P&L limits breached
2. **CORRELATION** - Correlated losses across strategies
3. **POSITION** - Single position limit breach
4. **EXECUTION** - Trade execution failure
5. **JUDGMENT** - Decision-making error
6. **EXTERNAL** - Market event / black swan
7. **TECHNICAL** - System/tool failure

---

## Risk Events

<!--
TEMPLATE FOR EACH EVENT:

### RE-XXX: [Short Title]

**Date**: [YYYY-MM-DD HH:MM]
**Level**: 🟢/🟡/🟠/🔴
**Type**: [DRAWDOWN/CORRELATION/POSITION/EXECUTION/JUDGMENT/EXTERNAL/TECHNICAL]
**Status**: Active / Resolved / Monitoring

---

#### What Happened

[Detailed narrative of the event]

#### Impact

- **P&L Impact**: +/-$XXX
- **Positions Affected**: [List]
- **Strategies Affected**: [List]
- **Duration**: [How long event lasted]

#### Detection

- **How detected**: [How you noticed]
- **Time to detect**: [How long until noticed]
- **Detection gap**: [Was there delay? Why?]

#### Response

1. [Action taken]
2. [Action taken]
3. [Action taken]

**Response time**: [How quickly you acted]
**Response quality**: [Good/Adequate/Poor]

#### Root Cause Analysis

**Immediate cause**: [What directly caused it]
**Contributing factors**:
1. [Factor]
2. [Factor]

**Root cause**: [Underlying issue]

#### Lessons Learned

1. [Lesson]
2. [Lesson]

#### Preventive Measures

| Measure | Status | Owner |
|---------|--------|-------|
| [Action to prevent recurrence] | Pending/Done | Bot/Rick |

#### SKILL.md Updates

| File | Change |
|------|--------|
| [Path] | [Change made to prevent recurrence] |

#### Follow-up Required

- [ ] [Action item]
- [ ] [Action item]

#### Rick Communication

- **Notified**: Yes/No
- **When**: [Timestamp]
- **Rick's response**: [Summary]

---

-->

## [RISK EVENTS LOGGED BELOW]

---

## Near-Miss Log

Document situations that almost became risk events:

| Date | What Happened | Why It Didn't Escalate | Lesson |
| ---- | ------------- | ---------------------- | ------ |
| -    | -             | -                      | -      |

---

## Risk Metrics History

Track risk levels over time:

| Date   | Portfolio Value | Max Drawdown | Largest Position | Correlation Exposure | Risk Level |
| ------ | --------------- | ------------ | ---------------- | -------------------- | ---------- |
| [DATE] | $30,000         | 0%           | $0               | $0                   | 🟢         |

---

## Risk Patterns

### Identified Risk Patterns

[Document recurring risk patterns as they emerge]

| Pattern | Frequency | Trigger | Mitigation |
| ------- | --------- | ------- | ---------- |
| -       | -         | -       | -          |

### Time-Based Risk

| Time Period     | Risk Level     | Reason | Adjustment   |
| --------------- | -------------- | ------ | ------------ |
| [e.g., Weekend] | [Higher/Lower] | [Why]  | [What to do] |

---

## Emergency Procedures

### If 🔴 Critical Event Occurs:

1. **STOP** - Immediately halt all trading
2. **CLOSE** - Close all open positions at market
3. **DOCUMENT** - Log event details here immediately
4. **NOTIFY** - Send urgent Telegram to Rick
5. **ANALYZE** - Understand what happened
6. **WAIT** - Do not resume until Rick approves
7. **IMPLEMENT** - Put fixes in place before resuming
8. **RESUME** - Start with 50% normal sizing

### If Unable to Trade:

1. Close all positions that can be closed
2. Set stops on remaining positions
3. Notify Rick
4. Document the situation
5. Wait for system restoration

---

## Rick Escalation Criteria

**Always escalate to Rick immediately if:**

- 🔴 Critical event triggered
- Any single trade loses >$500
- Technical failure affects trading
- Unusual market conditions
- Uncertainty about how to proceed
- Any position at risk of total loss

**Escalation format:**

```
🚨 RISK ALERT 🚨

Level: [🟡/🟠/🔴]
Type: [Risk type]
Impact: $XXX potential

What happened:
[Brief description]

Current status:
[What's happening now]

My plan:
[What you intend to do]

Need from you:
[What you need from Rick]
```
