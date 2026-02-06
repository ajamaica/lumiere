#!/usr/bin/env python3
"""Run a Strands agent from a Python file with a prompt.

Usage:
    python3 run-agent.py <agent-file.py> "Your prompt"
    python3 run-agent.py <agent-file.py> --interactive

The agent file must define an `agent` variable (a strands.Agent instance).
"""

import importlib.util
import sys
from pathlib import Path


def load_agent(filepath):
    """Load a Strands agent from a Python file."""
    path = Path(filepath).resolve()
    if not path.exists():
        print(f"Error: {filepath} not found")
        sys.exit(1)

    spec = importlib.util.spec_from_file_location("agent_module", str(path))
    module = importlib.util.module_from_spec(spec)

    # Add the agent's directory to sys.path for local imports
    agent_dir = str(path.parent)
    if agent_dir not in sys.path:
        sys.path.insert(0, agent_dir)

    spec.loader.exec_module(module)

    if not hasattr(module, "agent"):
        print(f"Error: {filepath} must define an 'agent' variable (strands.Agent instance)")
        sys.exit(1)

    return module.agent


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 run-agent.py <agent-file.py> \"prompt\" | --interactive")
        sys.exit(1)

    agent_file = sys.argv[1]
    agent = load_agent(agent_file)

    if len(sys.argv) > 2:
        if sys.argv[2] == "--interactive":
            print("Interactive mode. Type 'quit' to exit.\n")
            while True:
                try:
                    prompt = input("You: ").strip()
                    if prompt.lower() in ("quit", "exit", "q"):
                        break
                    if not prompt:
                        continue
                    result = agent(prompt)
                    print(f"\nAgent: {result}\n")
                except (KeyboardInterrupt, EOFError):
                    break
        else:
            prompt = " ".join(sys.argv[2:])
            result = agent(prompt)
            print(result)
    else:
        print(f"Agent loaded from {agent_file}. Provide a prompt as second argument.")


if __name__ == "__main__":
    main()
