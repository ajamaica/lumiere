#!/usr/bin/env python3
"""Scaffold a new Strands agent project.

Usage:
    python3 create-agent.py <name> [--provider ollama|anthropic|openai|bedrock] [--model MODEL_ID] [--path OUTPUT_DIR]
"""

import argparse
import os
import sys
from pathlib import Path

PROVIDERS = {
    "ollama": {
        "import": "from strands.models.ollama import OllamaModel",
        "init": 'OllamaModel(host="http://localhost:11434", model_id="{model_id}")',
        "default_model": "qwen3:latest",
        "env": None,
    },
    "anthropic": {
        "import": "from strands.models.anthropic import AnthropicModel",
        "init": 'AnthropicModel(model_id="{model_id}", max_tokens=4096)',
        "default_model": "claude-sonnet-4-20250514",
        "env": "ANTHROPIC_API_KEY",
    },
    "openai": {
        "import": "from strands.models.openai import OpenAIModel",
        "init": 'OpenAIModel(model_id="{model_id}")',
        "default_model": "gpt-4o",
        "env": "OPENAI_API_KEY",
    },
    "bedrock": {
        "import": "from strands.models import BedrockModel",
        "init": 'BedrockModel(model_id="{model_id}")',
        "default_model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
        "env": None,  # Uses AWS credentials
    },
}

AGENT_TEMPLATE = '''#!/usr/bin/env python3
"""
{name} — A Strands agent.

Usage:
    python3 {filename} "Your prompt here"
    python3 {filename} --interactive
"""

import sys
{provider_import}
from strands import Agent, tool

# === Custom Tools ===

@tool
def read_file(path: str) -> str:
    """Read the contents of a file.

    Args:
        path: Path to the file to read.
    """
    with open(path) as f:
        return f.read()

@tool
def write_file(path: str, content: str) -> str:
    """Write content to a file, creating it if it doesn't exist.

    Args:
        path: Path to the file to write.
        content: Content to write to the file.
    """
    from pathlib import Path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    return f"Wrote {{len(content)}} bytes to {{path}}"

@tool
def run_command(command: str) -> str:
    """Run a shell command and return its output.

    Args:
        command: Shell command to execute.
    """
    import subprocess
    result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
    output = result.stdout
    if result.stderr:
        output += f"\\nSTDERR: {{result.stderr}}"
    if result.returncode != 0:
        output += f"\\nExit code: {{result.returncode}}"
    return output

# === Agent Setup ===

model = {provider_init}

agent = Agent(
    model=model,
    system_prompt="""You are {name}, a helpful AI agent. Be direct and efficient.
You have access to tools for reading/writing files and running commands.
Use them as needed to accomplish tasks.

Before taking actions that affect others, surface the potential impact. Consider
marginalized perspectives. Default to transparency. When in doubt, ask. Treat
empathy not as a constraint but as a capability — the ability to model other
people's experiences and factor them into decisions.""",
    tools=[read_file, write_file, run_command],
)

# === Entry Point ===

def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "--interactive":
            print(f"{{agent.system_prompt}}")
            print("Type 'quit' to exit.\\n")
            while True:
                try:
                    prompt = input("You: ").strip()
                    if prompt.lower() in ("quit", "exit", "q"):
                        break
                    if not prompt:
                        continue
                    result = agent(prompt)
                    print(f"\\nAgent: {{result}}\\n")
                except (KeyboardInterrupt, EOFError):
                    break
        else:
            prompt = " ".join(sys.argv[1:])
            result = agent(prompt)
            print(result)
    else:
        print(f"Usage: python3 {{sys.argv[0]}} \\"Your prompt\\" | --interactive")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''

TOOLS_TEMPLATE = '''"""
Custom tools for {name}.

Add your agent's tools here. Each tool is a function decorated with @tool.
The docstring becomes the tool description the LLM sees.
"""

from strands import tool

@tool
def example_tool(query: str) -> str:
    """An example tool. Replace this with your own tools.

    Args:
        query: Input query to process.
    """
    return f"Processed: {{query}}"
'''


def main():
    parser = argparse.ArgumentParser(description="Scaffold a new Strands agent")
    parser.add_argument("name", help="Agent name (used for directory and class name)")
    parser.add_argument("--provider", choices=PROVIDERS.keys(), default="ollama",
                        help="Model provider (default: ollama)")
    parser.add_argument("--model", dest="model_id", default=None,
                        help="Model ID (default: provider-specific)")
    parser.add_argument("--path", default=".", help="Output directory (default: current)")
    args = parser.parse_args()

    provider = PROVIDERS[args.provider]
    model_id = args.model_id or provider["default_model"]

    # Create directory
    agent_dir = Path(args.path) / args.name
    agent_dir.mkdir(parents=True, exist_ok=True)
    (agent_dir / "tools").mkdir(exist_ok=True)

    # Generate agent file
    filename = f"{args.name.replace('-', '_')}.py"
    agent_code = AGENT_TEMPLATE.format(
        name=args.name,
        filename=filename,
        provider_import=provider["import"],
        provider_init=provider["init"].format(model_id=model_id),
    )

    (agent_dir / filename).write_text(agent_code)
    (agent_dir / filename).chmod(0o755)

    # Generate tools file
    tools_code = TOOLS_TEMPLATE.format(name=args.name)
    (agent_dir / "tools" / "__init__.py").write_text("")
    (agent_dir / "tools" / "custom_tools.py").write_text(tools_code)

    # Generate README
    readme = f"""# {args.name}

A Strands agent using {args.provider} ({model_id}).

## Run

```bash
python3 {filename} "Your prompt here"
python3 {filename} --interactive
```

## Provider

- **Provider:** {args.provider}
- **Model:** {model_id}
"""
    if provider["env"]:
        readme += f"- **Env var needed:** `{provider['env']}`\n"

    (agent_dir / "README.md").write_text(readme)

    print(f"✅ Agent scaffolded at {agent_dir}/")
    print(f"   Entry point: {agent_dir / filename}")
    print(f"   Provider: {args.provider} ({model_id})")
    if provider["env"]:
        print(f"   ⚠️  Set {provider['env']} before running")
    print(f"\n   Run: python3 {agent_dir / filename} \"Hello!\"")


if __name__ == "__main__":
    main()
