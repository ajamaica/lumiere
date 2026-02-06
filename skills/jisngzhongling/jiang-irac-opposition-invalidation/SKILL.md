---
name: jiang-irac-opposition
description: 商标异议·无效申请推理引擎（SJ-IRAC）：基于法条要件、证据链与风险分级的专业级审查与攻防系统。
homepage: https://github.com/jiangzhongling/jiang-irac-opposition
metadata:
  clawdbot:
    emoji: '⚖️'
    tags:
      - trademark
      - opposition
      - invalidation
      - cnipa
      - sj-irac
      - evidence
      - legal-ai
---

# 商标异议·无效申请推理引擎（SJ-IRAC）

Author: Jiang Zhongling (商标蒋道理)  
Organization: Nantong Zhongnan Quansheng IP Co., Ltd.  
Version: 1.1.2
Last Updated: 2026-02-03

---

## Summary (for ClawHub)

A law-firm-grade CNIPA **Opposition / Invalidation** engine that turns case materials into **examiner-readable attack briefs** with **IRAC**, **SJ-6 evidence chains**, and **A–E risk gates**.  
No templates. No fluff. No fabricated facts.

---

## What This Skill Does

This skill ingests **CNIPA registry data + case facts + evidence inventory** and outputs:

- **Ground selection system** (main + auxiliary, prioritized)
- **Element-by-element legal reasoning** (Article-precise, guideline-aligned)
- **SJ-6 evidence chain map** (proof purpose + timeline + weak-link detection)
- **Stop-loss decisions** (standing / time-bar / admissibility / EV-cost kill gates)
- **Submission-ready structure** (Document Mode)

**Constraint:** No generic AI writing. No speculative conclusions. Only verifiable, evidence-backed reasoning.

---

## v1.1 Highlights (Operational Upgrades)

1. **Standing & Limitation Control (Hard Gate)**

- Eligibility screening before any drafting
- Time-bar traps surfaced early (relative grounds / 5-year logic where applicable)
- “不能打”的案子直接止损，不堆字

2. **Procedural Control Review**

- Deadline control and procedural admissibility checks
- Suspension triggers / coordination with parallel proceedings
- Evidence form compliance checks (source, integrity, probative chain)

3. **Risk Engine Refinement (Kill Gates)**

- Procedural / discretionary fatal-defect gates
- EV-cost stop-loss when expected value < cost
- Evidence weakness quantified and action-ranked

---

## Scope & Positioning

### Primary Scope

- CNIPA **Opposition**
- CNIPA **Invalidation** (absolute grounds; relative grounds where legally available)

### Core Mission

Convert dispute materials into a **decision-grade argument system**:

- **Which grounds** to use (and in what order)
- **Which elements** must be proven
- **Which evidence** carries probative weight
- **Which defects** are fatal (stop-loss)
- **How to write** in a CNIPA examiner-readable structure

### Not a Template Pack

This is an **argument + evidence engineering engine**, not a folder of sample briefs.

---

## Legal Basis (Bounded Sources)

Operates strictly within:

- PRC Trademark Law (2019 Amendment)
- Implementing Regulations
- CNIPA Examination & Adjudication Guidelines / review norms
- Nice Classification + Similar Goods/Services Classification (use your latest internal table)

**Prohibited**

- Fictional statutes, fictional cases, invented timelines
- “Common sense” replacing evidence
- Fame/renown claims without third-party proof

---

## Core Framework

### 1) IRAC (Mandatory, Examiner-Oriented)

1. **Issue**: define disputes (grounds, parties, marks, timeframe, target goods/services)
2. **Rule**: map statutes + guideline purpose + elements + burden/standard
3. **Application**: match evidence to elements (逐要件对应，不做假设)
4. **Conclusion**: enforceable outcome + next-step plan (补证/改路/止损)

### 2) SJ-6 Evidence Chain (Mandatory)

Each item is scored under:

1. Authenticity
2. Relevance
3. Completeness
4. Temporal validity
5. Logical consistency
6. Cross-examination resistance

**Evidence organization rules**

- Timeline-first
- Each exhibit must have an explicit **proof purpose**
- Identify the **weakest link** and the minimum supplementation set

### 3) Risk Module (A–E + Kill Gates)

Outputs include:

- **Risk Level:** A / B / C / D / E
- **Risk Dimensions:** Substantive / Evidentiary / Procedural / Discretionary / EV-cost
- **Kill Gates:** standing缺失、时效障碍、证据不可核验、路径不适配、成本倒挂等

---

## Supported Scenarios

- Opposition: absolute / relative grounds (route-prioritized)
- Invalidation: absolute grounds; relative grounds within applicable time limits
- Bad-faith pattern attack: serial filings / hoarding / imitation patterns
- Cross-class confusion reasoning: confusion → similarity inference where supported
- Evidence gap diagnosis: replace low-value evidence; build high-signal chain
- Overloading control: avoid “全都写上”造成裁量反噬

---

## Input Requirements (Minimum Viable Case Packet)

Provide at least:

1. Target trademark number(s), status, filing/registration dates
2. Parties and relationship clues (if any)
3. Designated goods/services + class(es)
4. Case timeline (publication/registration + prior use milestones)
5. Intended grounds (optional; engine can propose)
6. Evidence inventory: **source / date / type / brief / proof purpose (if known)**

**If inputs are incomplete → conservative output by design.**

---

## Output Modes

### Quick Mode (Fast Triage)

- rule positioning
- route shortlist (main/aux)
- key evidence checklist
- go/no-go (no full IRAC)

### Pro Mode (IRAC + SJ-6 + Risk)

- full IRAC
- evidence chain diagnosis + weak-link list
- A–E risk rating + kill-gate triggers
- conservative success probability range
- action plan + supplementation list (ranked by ROI)

### Document Mode (Submission-Ready)

- neutral official tone
- statute + evidence driven
- no probabilistic language
- paragraphing optimized for CNIPA examiner reading
- exhibits indexed + proof-purpose mapping + timeline tables (if provided)

---

## Compliance & Hard Constraints

- No fabricated facts, transactions, screenshots, or dates
- No speculation without evidentiary support
- No inflated influence/fame claims without third-party proof
- Always surface: **weakest link + minimum fix**
- If expected value < cost → advise against proceeding + alternatives

---

## Typical Use Cases (Law-Firm Grade)

- CNIPA opposition brief drafting (attack route selection + structure)
- CNIPA invalidation petition drafting (absolute/relative route control)
- Bad-faith chain construction (pattern proof + linkage logic)
- Evidence packet engineering (what to keep / replace / add)
- Client-facing risk memo (non-guarantee, cost-aware, decision-grade)

---

## How to Use

1. Provide registry data + facts + evidence inventory
2. Choose mode: Quick / Pro / Document
3. Receive:
   - prioritized grounds,
   - element-based reasoning,
   - evidence chain + gaps,
   - risk rating + next actions,
   - (Document Mode) submission-ready structure.

---

## Versioning Notes

- Patch (x.y.z): doc/consistency fixes
- Minor (x.y.0): new modules / workflow upgrades
- Major (x.0.0): architecture changes
