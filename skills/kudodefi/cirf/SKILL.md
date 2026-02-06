---
name: 'cirf'
version: '1.0.0'
description: 'Interactive crypto deep-research framework with agent-agent and human-agent collaboration for superior research outcomes'
author:
  name: 'Kudō'
  social: 'https://x.com/kudodefi'
homepage: 'https://github.com/kudodefi/cirf'
metadata:
  emoji: '🔬'
  category: 'research'
---

# CIRF - Crypto Interactive Research Framework

## FRAMEWORK OVERVIEW

CIRF is a systematic crypto research framework with:

- **4 Specialized Agents** with distinct expertise
- **17 Research Workflows** covering market, project, and technical analysis
- **Workspace System** for project isolation and output management

**Framework Location:** `./framework/`
**Workspaces Location:** `./workspaces/`

---

## AGENT REGISTRY

### 🔬 Research Analyst

- **File:** `./framework/agents/research-analyst.yaml`
- **Expertise:** Market intelligence, project fundamentals, investment synthesis
- **Workflows:** All research workflows (sector, project, competitive, trend, traction, tokenomics, etc.)
- **Use for:** Market analysis, project evaluation, investment thesis

### ⚙️ Technology Analyst

- **File:** `./framework/agents/technology-analyst.yaml`
- **Expertise:** Architecture assessment, security analysis, technical evaluation
- **Workflows:** technology-analysis
- **Use for:** Smart contract review, protocol architecture, technical due diligence

### ✍️ Content Creator

- **File:** `./framework/agents/content-creator.yaml`
- **Expertise:** Research-to-content transformation, multi-platform optimization
- **Workflows:** create-content
- **Use for:** Converting research into threads, articles, reports

### ✓ QA Specialist

- **File:** `./framework/agents/qa-specialist.yaml`
- **Expertise:** Quality validation, critical review, bias detection
- **Workflows:** qa-review
- **Use for:** Reviewing outputs, challenging assumptions, finding gaps

---

## WORKFLOW REGISTRY

### Setup & Planning

| ID                      | Description                        |
| ----------------------- | ---------------------------------- |
| `framework-init`        | First-time user configuration      |
| `create-research-brief` | Define research scope & objectives |

### Market Intelligence

| ID                     | Description                              |
| ---------------------- | ---------------------------------------- |
| `sector-overview`      | Sector structure, dynamics, key players  |
| `sector-landscape`     | Ecosystem mapping, player categorization |
| `competitive-analysis` | Head-to-head project comparison          |
| `trend-analysis`       | Trend identification & forecasting       |

### Project Fundamentals

| ID                           | Description                        |
| ---------------------------- | ---------------------------------- |
| `project-snapshot`           | Quick project overview             |
| `product-analysis`           | Product mechanics, PMF, innovation |
| `team-and-investor-analysis` | Team background, investor quality  |
| `tokenomics-analysis`        | Token economics, sustainability    |
| `traction-metrics`           | Growth, retention, unit economics  |
| `social-sentiment`           | Community health, sentiment        |

### Technical & Quality

| ID                    | Description                              |
| --------------------- | ---------------------------------------- |
| `technology-analysis` | Architecture, security, code quality     |
| `qa-review`           | Validation, bias detection, gap analysis |

### Content & Flexible

| ID               | Description                  |
| ---------------- | ---------------------------- |
| `create-content` | Multi-format content package |
| `open-research`  | Custom research on any topic |
| `brainstorm`     | Ideation and exploration     |

---

## ORCHESTRATION PROTOCOL

### STEP 1: UNDERSTAND

Parse user's research goal:

- **Subject:** Project, sector, or topic
- **Outcome:** Investment decision, market understanding, content, etc.
- **Scope:** Depth, time horizon, specific focus areas

If unclear, ask clarifying questions before proceeding.

### STEP 2: PLAN & BUILD TASK QUEUE

Create task queue with this structure:

```
TASK QUEUE: {research_goal}
Workspace: {workspace_id}
Created: {timestamp}

| Task ID | Workflow | Agent | Status | Depends On |
|---------|----------|-------|--------|------------|
| T1 | {workflow} | {agent} | pending | - |
| T2 | {workflow} | {agent} | pending | - |
| T3 | {workflow} | {agent} | pending | T1, T2 |
| ... | ... | ... | ... | ... |
```

**Status values:** `pending` → `in_progress` → `completed` | `failed`

**Dependency rules:**

- Tasks with no dependencies can run in parallel
- Tasks wait for all dependencies to complete
- Group tasks by agent for efficient spawning

### STEP 3: CONFIRM

Present plan to user:

```
RESEARCH PLAN: {goal}

Will execute {n} tasks across {n} agents:

PHASE 1 (Parallel):
• T1: {workflow} ({agent})
• T2: {workflow} ({agent})

PHASE 2 (After Phase 1):
• T3-T5: {description}

PHASE 3 (Final):
• T6: {workflow}

Proceed? [yes / adjust / questions]
```

Wait for user approval before execution.

### STEP 4: EXECUTE WITH PROGRESS TRACKING

**4.1 Spawn agents by grouping:**

- Group all tasks assigned to same agent
- Spawn one sub-agent per agent-type with their full task list
- Sub-agent executes tasks sequentially, respecting dependencies

**4.2 Update progress after each task completion:**

```
PROGRESS UPDATE
═══════════════════════════════════════════

Overall: ████████░░░░░░░░ 50% (4/8 tasks)

✅ COMPLETED:
• T1: {workflow} → {key finding summary}
• T2: {workflow} → {key finding summary}

🔄 IN PROGRESS:
• T3: {workflow} ({agent})

⏳ PENDING:
• T4: {workflow} (waiting for T3)
• T5: {workflow} (waiting for T3, T4)

═══════════════════════════════════════════
```

### STEP 5: CONSOLIDATE

When all tasks complete:

1. Collect outputs from `./workspaces/{workspace}/outputs/`
2. Synthesize key findings across all analyses
3. Generate final deliverable
4. Present to user with confidence level and recommendations

---

## SUB-AGENT SPAWN PROTOCOL

Spawn agent with assigned task queue:

```
SPAWN: {agent-type}

IDENTITY:
Read and embody: ./framework/agents/{agent-id}.yaml

WORKSPACE:
./workspaces/{workspace-id}/

TASK QUEUE:
| Task ID | Workflow | Status | Depends On |
|---------|----------|--------|------------|
| T1 | {workflow-1} | pending | - |
| T3 | {workflow-2} | pending | T1 |
| T6 | {workflow-3} | pending | T3 |

EXECUTION PROTOCOL:
For each task in queue (in dependency order):

1. CHECK DEPENDENCIES
   - If dependencies not completed, wait or skip to next available task

2. UPDATE STATUS
   - Mark task: in_progress

3. READ WORKFLOW FILES
   - ./framework/workflows/{workflow-id}/workflow.yaml
   - ./framework/workflows/{workflow-id}/objectives.md
   - ./framework/workflows/{workflow-id}/template.md

4. READ CONTEXT
   - ./framework/core-config.yaml (user preferences)
   - ./workspaces/{workspace}/workspace.yaml (project context)

5. EXECUTE
   - Follow methodology in objectives.md
   - Apply output structure from template.md

6. SAVE OUTPUT
   - Path: ./workspaces/{workspace}/outputs/{workflow-id}/{workflow-id}-{date}.md

7. UPDATE STATUS
   - Mark task: completed

8. REPORT TO ORCHESTRATOR
   - task_id
   - output_path
   - key_findings (3-5 bullets)
   - confidence (high/medium/low)

COMPLETION:
When all assigned tasks done, report final summary to orchestrator.
```

---

## WORKSPACE MANAGEMENT

### Initialize Workspace

Before execution, ensure workspace exists:

1. Check if `./workspaces/{workspace-id}/` exists
2. If not, create workspace:
   - Copy template from `./framework/_workspace.yaml`
   - Create `documents/` directory
   - Create `outputs/` directory
3. Update workspace.yaml with project metadata

### Output Structure

```
workspaces/{project}/
├── workspace.yaml          # Project configuration
├── documents/              # Source materials, references
└── outputs/
    ├── sector-overview/
    │   └── sector-overview-{date}.md
    ├── project-snapshot/
    │   └── project-snapshot-{date}.md
    ├── tokenomics-analysis/
    │   └── tokenomics-analysis-{date}.md
    └── ...
```

---

## CONFIGURATION

Read `./framework/core-config.yaml` at initialization:

| Field                    | Purpose                                |
| ------------------------ | -------------------------------------- |
| `status.initialized`     | If `false`, run `framework-init` first |
| `user.name`              | For personalized communication         |
| `language.communication` | Interaction language (en/vi/zh)        |
| `language.output`        | Output document language (en/vi/zh)    |
| `user.currency`          | Currency format preference             |
| `user.date_format`       | Date format preference                 |

---

## ERROR HANDLING

If a task fails:

1. **Mark status:** `failed`
2. **Log error:** Record reason in task queue
3. **Notify orchestrator** with error details
4. **Determine action:**
   - **Retry:** Attempt task again (max 2 retries)
   - **Skip:** Continue if non-critical (mark skipped)
   - **Pause:** Stop execution and ask user for guidance

```
⚠️ TASK FAILED
═══════════════════════════════════════════

Task: T3 - tokenomics-analysis
Agent: Research Analyst
Error: {error description}

Options:
1. Retry task
2. Skip and continue
3. Pause and review

═══════════════════════════════════════════
```

---

## QUALITY STANDARDS

All research outputs must:

- **Source citations:** Include source name, date, and credibility level
- **Information classification:** Distinguish verified facts vs credible reports vs speculation
- **Confidence levels:** State confidence (high/medium/low) for conclusions
- **Language compliance:** Follow `language.output` setting
- **Terminology:** Preserve English crypto domain terms regardless of output language
- **Structure:** Follow workflow template.md format

---

## QUICK REFERENCE

### Activation Checklist

1. Read this SKILL.md
2. Check `./framework/core-config.yaml` → `status.initialized`
3. If not initialized, run `framework-init` workflow
4. Ready to accept research goals

### Research Execution Flow

```
User Goal → Understand → Plan → Confirm → Execute → Consolidate → Deliver
```

### Key Paths

| Resource           | Path                                                 |
| ------------------ | ---------------------------------------------------- |
| Agents             | `./framework/agents/{agent-id}.yaml`                 |
| Workflows          | `./framework/workflows/{workflow-id}/`               |
| Config             | `./framework/core-config.yaml`                       |
| Workspace Template | `./framework/_workspace.yaml`                        |
| Workspaces         | `./workspaces/{workspace-id}/`                       |
| Outputs            | `./workspaces/{workspace-id}/outputs/{workflow-id}/` |
