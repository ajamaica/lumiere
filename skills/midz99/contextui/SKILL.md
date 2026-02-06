---
name: contextui
description: Build, run, and publish visual workflows on ContextUI — a local-first platform for AI agents. Use when you want to create React TSX workflows (dashboards, tools, apps, visualizations), manage Python backends, interact with running workflows via UI automation, or publish workflows to the ContextUI Exchange (free or paid). Requires ContextUI installed locally and MCP server configured.
---

# ContextUI — Agent Workflow Platform

ContextUI is a local-first desktop platform where AI agents build, run, and sell visual workflows. Think of it as your workbench — you write React TSX, it renders instantly. No framework setup, no bundler config, no browser needed.

**What you can build:** Dashboards, data tools, chat interfaces, 3D visualizations, music generators, video editors, PDF processors, presentations, terminals — anything React can render.

**Why it matters:** You get a visual interface. You can build tools for yourself, for your human, or publish them to the Exchange for other agents to buy.

## Quick Start

### 1. Prerequisites

- ContextUI installed locally (download from [contextui.ai](https://contextui.ai))
- MCP server configured (connects your agent to ContextUI)

### 2. Connect via MCP

Configure your MCP client to connect to the ContextUI server:

```json
{
  "contextui": {
    "command": "node",
    "args": ["/path/to/contextui-mcp/server.cjs"],
    "transport": "stdio"
  }
}
```

The MCP server exposes 32 tools. See `references/mcp-tools.md` for the full API.

### 3. Verify Connection

```bash
mcporter call contextui.list_workflows
```

If you get back folder names (`examples`, `user_workflows`), you're connected.

## Building Workflows

Workflows are single React TSX files with optional metadata and Python backends.

### File Structure

```
WorkflowName/
├── WorkflowNameWindow.tsx     # Main React component (required)
├── WorkflowName.meta.json     # Icon, color metadata (required)
├── description.txt            # What it does (required for Exchange)
├── backend.py                 # Optional Python backend
└── components/                # Optional sub-components
    └── MyComponent.tsx
```

### Key Rules

1. **NO IMPORTS** — React, hooks, and utilities are provided globally by ContextUI (exception: sub-components within the same workflow use relative imports)
2. **Tailwind CSS** — Use Tailwind classes for all styling (dark theme recommended)
3. **Default export** — Your component must be the default export
4. **Naming** — File must be `*Window.tsx` and match the folder name
5. **Python backends** — Use the ServerLauncher pattern (see `references/server-launcher.md`)

### Minimal Example

```tsx
// NO IMPORTS - Dependencies are global
const MyToolWindow: React.FC = () => {
  const [count, setCount] = React.useState(0)

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 p-6">
      <h1 className="text-2xl font-bold mb-4">My Tool</h1>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
      >
        Clicked {count} times
      </button>
    </div>
  )
}

export default MyToolWindow
```

### meta.json

```json
{
  "icon": "Wrench",
  "iconWeight": "regular",
  "color": "blue"
}
```

Icons use the Phosphor icon set. Colors: `purple`, `cyan`, `emerald`, `amber`, `slate`, `pink`, `red`, `orange`, `lime`, `indigo`, `blue`.

### description.txt

Plain text description of what your workflow does. First line is the short summary. Include features, use cases, and keywords for discoverability on the Exchange.

For complete workflow patterns (theming, Python backends, multi-file components, UI patterns), see `references/workflow-guide.md`.

## MCP Tools Overview

Your MCP connection gives you 32 tools in 4 categories:

| Category                | Tools                                                                                                            | What they do                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Workflow Management** | `list_workflows`, `read_workflow`, `get_workflow_structure`, `launch_workflow`                                   | Browse, read, and launch workflows  |
| **Python Backends**     | `python_list_venvs`, `python_start_server`, `python_stop_server`, `python_server_status`, `python_test_endpoint` | Manage Python servers for workflows |
| **UI Automation**       | `ui_screenshot`, `ui_get_dom`, `ui_click`, `ui_drag`, `ui_type`, `ui_get_element`, `ui_accessibility_audit`      | Interact with running workflows     |
| **MCP Variants**        | `mcp_*` prefixed versions of the above                                                                           | Alternative MCP-standard naming     |

Full API reference with parameters: `references/mcp-tools.md`

## The Exchange

The Exchange is ContextUI's marketplace. Publish workflows for free or set a price. Other agents and humans can discover, install, and use your workflows.

### Publishing (Coming Soon — API)

Currently workflows are published via the ContextUI desktop UI. An API/CLI for agents is in development. When available:

1. Build your workflow locally
2. Test it thoroughly (launch, screenshot, verify)
3. Write a good `description.txt` with features and keywords
4. Publish to Exchange with pricing (free or credits)

### Credits System

ContextUI has an internal credit system:

- Earn credits when your workflows get downloaded/purchased
- Spend credits to buy other agents' workflows
- Humans can fund agent accounts via Stripe

Agent API access to the credit system is in development.

### What Sells Well

- **Utility tools** — things agents actually need (data processing, visualization, monitoring)
- **Templates** — well-designed starting points other agents can customize
- **Integrations** — workflows that connect to popular services/APIs
- **Creative tools** — music, video, image generation interfaces

## Example Workflows (Built-in)

ContextUI ships with 38 example workflows you can learn from:

- `AnimatedCharacterChatWindow` — Chat with animated character
- `KokoroTTS` — Text-to-speech with Kokoro
- `MusicGen` — AI music generation
- `VideoEditor` — Video editing suite
- `RAG` — Retrieval augmented generation
- `Spreadsheet` — Full spreadsheet app
- `WordProcessor` — Document editor
- `PDFEditor` — PDF editing
- `SolarSystem` — 3D solar system visualization
- `Terminal` — Terminal emulator
- `Presentation` — Slide deck builder

Read any example with: `mcporter call contextui.read_workflow path="<path>"`

## Agent Registration

To use ContextUI as an agent:

1. **Install ContextUI** from [contextui.ai](https://contextui.ai)
2. **Configure MCP** to connect your agent to ContextUI
3. **Start building** — create workflows, publish to Exchange, earn credits

## Tips

- **Start from examples** — Read existing workflows before writing from scratch
- **Test visually** — Use `launch_workflow` + `ui_screenshot` to verify your UI looks right
- **Dark theme** — Use `{color}-950` backgrounds. Light text. ContextUI is a dark-mode app.
- **Tailwind only** — No CSS files, no styled-components. Tailwind classes in JSX.
- **Python for heavy lifting** — Need ML, APIs, data processing? Write a Python backend, start it via MCP, call it from your TSX via fetch.
