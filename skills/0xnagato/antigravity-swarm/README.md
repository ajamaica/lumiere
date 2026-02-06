# Antigravity Sub-Agents Skill 🚀

**Hire a team of AI agents to code for you.**

This skill allows you to spawn multiple specialized AI agents (Sub-Agents) to work on complex tasks in parallel. Whether you are using the terminal or the Antigravity IDE, this tool orchestrates a team of experts—Architects, Engineers, and Validators—to solve your problems efficiently.

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   ✨ Antigravity Swarm Mission Control ✨                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
╭──────────────────┬───────────┬─────────────┬──────╮╭───── Live Activity ─────╮
│ Agent            │ Role      │   Status    │ Time ││                         │
├──────────────────┼───────────┼─────────────┼──────┤│                         │
│ Prometheus       │ serial    │ ✔ Completed │ 32s  ││                         │
│ Junior           │ serial    │ 🔄 Running  │ 15s  ││ Agent: Junior           │
│ Quality_Validat… │ validator │ ⏳ Pending  │ -    ││ Action: Implementing    │
╰──────────────────┴───────────┴─────────────┴──────╯│ core logic...           │
                                                     │                         │
                                                     ╰─────────────────────────╯
```

> [!IMPORTANT] > **Why do you need this?**
> As of 2026-01-31, **there is NO native method** to deploy sub-agents in Gemini CLI or the Antigravity IDE.
> This skill bridges that gap, unlocking true parallel agent orchestration for your environment.

> [!NOTE] > **Windows Compatibility**
> This skill includes native support for Windows PowerShell environments (CP949/Korean locale) by enforcing UTF-8 encoding for all I/O operations.

> [!WARNING]
> **Do NOT modify files in this directory while the Orchestrator is running.**
> The system actively reads and writes to `task_plan.md`, `findings.md`, and `subagents.yaml`.
> Manual edits during execution may cause race conditions or inconsistent agent behavior.

> [!NOTE]
> **State Files Management**
> When you initiate a major mission, the system will automatically generate `task_plan.md`, `findings.md`, and `progress.md` in your project root.
> These files serve as the "shared memory" for the agent swarm. Do not delete them while a mission is active.

---

## Why use this?

- **Parallel Execution**: Why wait for one agent to finish? Run 3 agents at once (e.g., one writes docs, one writes tests, one writes code).
- **Specialization**: Assign different "Personas" (Prompts) to each agent.
- **Quality Assurance**: **[NEW]** Every team includes a mandatory **Validator Agent** who reviews the work before completion, ensuring high quality.

---

## Installation

1.  **Locate the Skill**: Ensure this repository is in your skills folder:
    ```bash
    ~/.gemini/skills/antigravity-swarm/
    ```
2.  **Install Dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

    _(Requires `rich`, `pyyaml`, etc.)_

3.  **Gemini CLI**: Ensure the `gemini` command is installed and in your PATH.

---

## User Manual

There are three main ways to use this skill.

### 🅰️ Scenario A: Gemini CLI (Manual Mode)

Use this when you want to manually "hire" a team to do a job for you from your terminal.

**Step 1: Hire the Team (Plan)**
Run the planner with your mission description.

```bash
python3 scripts/planner.py "Create a Snake game with a green background and score tracking"
```

**Step 2: Review the Plan**
The Planner will propose a team from the **Available Agent Pool** (see below) and draft a `task_plan.md`.

**Step 3: Execute (Orchestrate)**
Once approved, launch the team:

```bash
python3 scripts/orchestrator.py
```

### 🅱️ Scenario B: Ultrawork Loop (Autonomous Mode)

Use this for "set and forget" operations. The system will Plan -> Act -> Verify -> Fix in a loop until the mission succeeds.

```bash
python3 scripts/ultrawork_loop.py "Refactor the authentication module and add tests"
```

### 🆎 Scenario C: Antigravity IDE (Agent Integration)

If integrated into `~/.gemini/GEMINI.md`, the Main Agent will **automatically** trigger this skill for complex tasks.

---

## Available Agent Roles (Oh-My-Opencode Standard)

The Planner automatically selects the best experts for your mission from this pool:

| Role                  | Expertise                                         | Model          |
| --------------------- | ------------------------------------------------- | -------------- |
| **Oracle**            | Architecture, Deep Debugging, Root Cause Analysis | gemini-3-pro   |
| **Librarian**         | Documentation, Code Structure, Research           | gemini-3-flash |
| **Explore**           | Fast Search, Pattern Matching, Reconnaissance     | gemini-3-flash |
| **Frontend**          | UI/UX, Styling, Accessibility                     | gemini-3-flash |
| **Multimodal**        | Vision Analysis, Mockups                          | gemini-3-pro   |
| **Doc_Writer**        | READMEs, API Docs, Comments                       | gemini-3-flash |
| **Prometheus**        | Strategic Planning, Requirements Gathering        | gemini-3-pro   |
| **Momus**             | Critical Review, Risk Identification              | gemini-3-pro   |
| **Sisyphus**          | Task Coordination, Delegation (PM)                | gemini-3-flash |
| **Junior**            | Implementation, Coding, Bug Fixing                | gemini-3-flash |
| **Quality_Validator** | Final Verification & Testing (Mandatory)          | gemini-3-flash |

---

## Protocol & Architecture

### The "Manus Protocol"

This skill enforces a rigorous state management protocol:

- **`task_plan.md`**: The master checklist.
- **`findings.md`**: Shared scratchpad for agents to exchange knowledge.
- **`progress.md`**: Immutable log of what has been done.

### The "Validator" Rule

By design, the **final agent** in any generated team is strictly enforced to be a **Quality Validator**.

- **Role**: Reviewer / QA.
- **Task**: Check if `task_plan.md` is complete, run tests, and ensure the user's requirements are met.
- **Benefit**: Redundant self-correction loop.

---

## Directory Structure

```text
antigravity-swarm/
├── scripts/
│   ├── planner.py       # The "Hiring Manager" (Generates subagents.yaml)
│   ├── orchestrator.py  # The "Project Manager" (Runs the agents)
│   ├── dispatch_agent.py # The "Worker" (Shim layer for Gemini CLI)
│   └── ultrawork_loop.py # The "Autonomous Loop" (Plan -> Act -> Verify)
├── subagents.yaml       # The current team roster
├── task_plan.md         # Current mission status
└── README.md            # This file
```

---

## ⭐️ Credits & Inspiration

This project is heavily inspired by **[Oh-My-Opencode](https://github.com/code-yeongyu/oh-my-opencode)**.

We have adopted its core philosophies:

- **Multi-Agent Orchestration**: Using specialized roles (Oracle, Librarian, Sisyphus) for distinct tasks.
- **The "Manus Protocol"**: Using persistent markdown files (`task_plan.md`, `findings.md`) for state management. This pattern is heavily inspired by **[planning-with-files](https://github.com/OthmanAdi/planning-with-files)**.
- **Ultrawork Loop**: The autonomous "Plan -> Act -> Verify" cycle.

Huge thanks to the original creators for defining these agent interaction patterns.
