# IGC Evaluation Template

The **IGC Triple** (Idea, Goal, Context) is the fundamental unit of rational evaluation. An Idea cannot be "good" or "bad" in a vacuum; it can only be judged relative to a Goal and a Context.

## The Template

### 1. The Context (C)
*What are the fixed facts of the situation?*
- [Fact 1]
- [Fact 2]
- [Constraint 1: The "Bottleneck"]

### 2. The Goal (G)
*What specific outcome defines success?*
- [Primary Goal]
- [Breakpoint: Success happens if...]

### 3. The Idea (I)
*What is the proposed action or belief?*
- [The Idea]

### 4. The Evaluation (Binary)
*Is the Idea refuted by the Goal in this Context?*
- **Potential Criticism:** [Does the Idea violate a constraint?]
- **Status:** [REFUTED / NON-REFUTED]

---

## Example: Choosing a Programming Language

**Context (C):**
- Team knows Python.
- Project must run on a low-power microcontroller.
- Memory is limited to 64KB.

**Goal (G):**
- Real-time sensor monitoring.
- Breakpoint: System must respond within 1ms.

**Idea (I):**
- Use Python (MicroPython).

**Evaluation:**
- **Criticism:** Python's garbage collection and overhead typically require >256KB RAM and have non-deterministic latency. In this Context (64KB RAM), MicroPython will fail to boot or meet the 1ms Breakpoint.
- **Status:** **REFUTED.** (Even if Python is "more popular" or "easier to write").

**New Idea (I2):**
- Use C or Rust.
- **Evaluation:** Meets memory constraints. Meets real-time constraints.
- **Status:** **NON-REFUTED.**

---

## Agent Operational Guide
- Use this template when a user gives a vague instruction.
- **Action:** "I've analyzed your request using an IGC Triple. In this Context, your suggested Idea might fail the Goal. Here is why..."
- Use this to avoid "blind obedience" that leads to failure.
