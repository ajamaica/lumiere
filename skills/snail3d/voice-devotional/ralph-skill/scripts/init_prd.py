#!/usr/bin/env python3
"""
Initialize a new Ralph PRD-based project.
"""

import sys
import json
from pathlib import Path
from typing import Optional

PRD_TEMPLATE = {
    "pn": "Project Name",
    "pd": "Project description",
    "sp": "Starter prompt for Claude Code",
    "gh": False,
    "ts": {"language": "python"},
    "p": {
        "00_security": {
            "n": "Security",
            "t": [
                {
                    "id": "SEC-001",
                    "ti": "Create .gitignore",
                    "d": "Add .gitignore with secrets, dependencies, and build artifacts",
                    "f": ".gitignore",
                    "pr": "high",
                    "st": "pending",
                    "ac": "[x] .gitignore created, [ ] Common patterns included"
                },
                {
                    "id": "SEC-002",
                    "ti": "Create .env.example",
                    "d": "Create .env.example template with required variables (no real secrets)",
                    "f": ".env.example",
                    "pr": "high",
                    "st": "pending",
                    "ac": "[x] Template created, [ ] Documented"
                }
            ]
        },
        "01_setup": {
            "n": "Setup",
            "t": [
                {
                    "id": "SETUP-001",
                    "ti": "Initialize git repository",
                    "d": "Initialize git repo and create initial commit",
                    "f": "terminal",
                    "pr": "high",
                    "st": "pending",
                    "ac": "[x] Git initialized, [ ] First commit made"
                },
                {
                    "id": "SETUP-002",
                    "ti": "Setup dependencies",
                    "d": "Install and configure project dependencies",
                    "f": "terminal",
                    "pr": "high",
                    "st": "pending",
                    "ac": "[x] Dependencies installed, [ ] Lock file created"
                }
            ]
        },
        "02_core": {
            "n": "Core",
            "t": []
        },
        "03_api": {
            "n": "API",
            "t": []
        },
        "04_test": {
            "n": "Testing",
            "t": [
                {
                    "id": "TEST-001",
                    "ti": "Setup test framework",
                    "d": "Configure test framework and create initial test structure",
                    "f": "tests/",
                    "pr": "high",
                    "st": "pending",
                    "ac": "[x] Test framework installed, [ ] Sample test written"
                }
            ]
        }
    }
}

CONFIG_TEMPLATE = {
    "project_name": "Project Name",
    "language": "python",
    "prd_path": "PRD.json",
    "test_command": "pytest",
    "auto_commit": False,
    "claude_code_flags": ["--dangerously-skip-permissions"],
    "git_user": "auto",
    "git_email": "auto"
}

GITIGNORE_TEMPLATES = {
    "python": """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
.venv
venv/
.env
.env.local

# IDEs
.vscode/
.idea/
*.swp
.DS_Store
""",
    "javascript": """# Node
node_modules/
npm-debug.log
yarn-error.log
package-lock.json
.env
.env.local
dist/
build/

# IDEs
.vscode/
.idea/
*.swp
.DS_Store
""",
    "go": """# Go
*.o
*.a
*.so
__debug_bin
.env
.env.local

# IDEs
.vscode/
.idea/
*.swp
.DS_Store
""",
    "rust": """# Rust
/target
Cargo.lock
.env
.env.local

# IDEs
.vscode/
.idea/
*.swp
.DS_Store
"""
}

def create_project(name: str, language: str = "python", path: str = "."):
    """Create new Ralph project."""
    project_path = Path(path)
    project_path.mkdir(parents=True, exist_ok=True)
    
    # Update templates with project name
    prd = PRD_TEMPLATE.copy()
    prd["pn"] = name
    prd["pd"] = f"{name} - PRD-driven project"
    prd["ts"]["language"] = language
    
    config = CONFIG_TEMPLATE.copy()
    config["project_name"] = name
    config["language"] = language
    
    # Write PRD.json
    prd_file = project_path / "PRD.json"
    with open(prd_file, 'w') as f:
        json.dump(prd, f, indent=2)
    print(f"✅ Created {prd_file}")
    
    # Write ralph.config.json
    config_file = project_path / "ralph.config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"✅ Created {config_file}")
    
    # Write .gitignore
    gitignore_file = project_path / ".gitignore"
    gitignore_content = GITIGNORE_TEMPLATES.get(language, "# Add patterns here\n")
    with open(gitignore_file, 'w') as f:
        f.write(gitignore_content)
    print(f"✅ Created {gitignore_file}")
    
    # Write .env.example
    env_file = project_path / ".env.example"
    with open(env_file, 'w') as f:
        f.write("# Copy this to .env and fill in your values\n")
        f.write(f"# {name.upper()} Environment Variables\n")
    print(f"✅ Created {env_file}")
    
    print(f"\n🎉 Ralph project '{name}' initialized!")
    print(f"📁 Location: {project_path.resolve()}")
    print(f"\nNext steps:")
    print(f"  1. cd {path}")
    print(f"  2. Edit PRD.json to add your project tasks")
    print(f"  3. Run: ralph build")

def main():
    if len(sys.argv) < 2:
        print("Usage: init_prd.py --name <project> [--language python|js|go|rust] [--path .]", file=sys.stderr)
        print("Example: init_prd.py --name 'My App' --language python", file=sys.stderr)
        sys.exit(1)
    
    name = None
    language = "python"
    path = "."
    
    # Parse arguments
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--name" and i + 1 < len(sys.argv):
            name = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--language" and i + 1 < len(sys.argv):
            language = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--path" and i + 1 < len(sys.argv):
            path = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    if not name:
        print("Error: --name is required", file=sys.stderr)
        sys.exit(1)
    
    create_project(name, language, path)

if __name__ == "__main__":
    main()
