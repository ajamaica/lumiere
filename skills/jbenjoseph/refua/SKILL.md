# Skill: Refua

## Summary

Refua is used in drug discovery to computationally fold and score biomolecular complexes (e.g., protein–ligand/protein–protein) and optionally profile ADMET, helping prioritize which molecules to synthesize and test first in a drug discovery pipeline.

This skill runs and connects to the **refua-mcp** MCP server, which exposes Refua’s “unified Complex API” as MCP tools for:

- **Boltz2** complex folding (+ optional affinity evaluation)
- **BoltzGen** design workflows
- Optional **ADMET** profiling (when installed)

Clawdbot supports MCP natively, so the only requirement is running this MCP server and calling its tools. ([github.com](https://github.com/agentcures/refua-mcp))

---

## When to use

Use this skill when you need to:

- Fold a **protein–ligand**, **protein–protein**, or (fold-only) **DNA/RNA** complex
- Estimate **binding affinity** for a specified binder within a complex spec
- Run **ADMET** predictions for one or more SMILES ligands (if enabled)
- Execute GPU/CPU-heavy Refua workflows via MCP tool calls

Do NOT use this skill when:

- The task is a simple deterministic calculation (prefer a non-ML tool)
- The user expects you to invent sequences/SMILES (request inputs instead)
- The user requests unsafe wet-lab or clinical guidance

---

## Installation & assets (operator steps)

### 1) Install Refua + refua-mcp

Install Refua (CPU or CUDA), then install the MCP server package: ([github.com](https://github.com/agentcures/refua-mcp))

- GPU support:
  - `pip install refua[cuda]`
- CPU-only:
  - `pip install refua`
- MCP server:
  - `pip install refua-mcp`

### 2) Optional: enable ADMET

ADMET tool support is optional and requires an extra: ([github.com](https://github.com/agentcures/refua-mcp))

- `pip install refua[admet]`

### 3) Download model/assets

Boltz2 and BoltzGen require model/molecule assets. Refua can download them automatically: ([github.com](https://github.com/agentcures/refua-mcp))

- `python -c "from refua import download_assets; download_assets()"`

Default asset locations + overrides: ([github.com](https://github.com/agentcures/refua-mcp))

- **Boltz2** uses `~/.boltz` by default
  - Override via tool option `boltz.cache_dir` if needed
- **BoltzGen** uses a bundled HF artifact by default
  - Override via tool option `boltzgen.mol_dir` if needed

---

## Running the MCP server

Start the server using the module entrypoint: ([github.com](https://github.com/agentcures/refua-mcp))

```bash
python3 -m refua_mcp.server
```
