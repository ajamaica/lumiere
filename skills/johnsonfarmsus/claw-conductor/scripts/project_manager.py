#!/usr/bin/env python3
"""
Project Manager

Handles project creation, initialization, and state management.
"""

import json
import os
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional


class ProjectManager:
    """Manage project workspaces and state"""

    def __init__(self, projects_root: str = "/root/projects"):
        """
        Initialize project manager

        Args:
            projects_root: Root directory for all projects
        """
        self.projects_root = Path(projects_root)

    def create_project(self, name: str, description: str,
                      workspace: Optional[str] = None,
                      github_user: Optional[str] = None) -> dict:
        """
        Create and initialize a new project

        Args:
            name: Project name
            description: Project description
            workspace: Optional custom workspace path
            github_user: Optional GitHub username for repo creation

        Returns:
            dict: Project metadata
        """
        # Generate project ID
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        project_id = f"{name}-{timestamp}"

        # Determine workspace
        if workspace is None:
            workspace = str(self.projects_root / name)

        workspace_path = Path(workspace)

        # Create project structure
        print(f"📁 Creating project workspace: {workspace}")
        workspace_path.mkdir(parents=True, exist_ok=True)

        # Create .claw-conductor directory for state
        conductor_dir = workspace_path / '.claw-conductor'
        conductor_dir.mkdir(exist_ok=True)

        # Initialize git repository
        print(f"🔧 Initializing git repository...")
        self._init_git(workspace_path)

        # Create GitHub repository (if user provided)
        github_repo = None
        if github_user:
            try:
                github_repo = self._create_github_repo(name, github_user)
                print(f"🐙 GitHub repository created: {github_repo}")

                # Set remote
                subprocess.run(
                    ['git', 'remote', 'add', 'origin', f'https://github.com/{github_user}/{name}.git'],
                    cwd=workspace_path,
                    check=False  # May already exist
                )
            except Exception as e:
                print(f"⚠️  GitHub repo creation failed: {e}")

        # Create project metadata
        project = {
            'project_id': project_id,
            'name': name,
            'description': description,
            'workspace': str(workspace_path),
            'github_repo': github_repo,
            'github_user': github_user,
            'status': 'in_progress',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'started_at': datetime.now(timezone.utc).isoformat(),
            'tasks': [],
            'dependencies': {},
            'progress': {
                'total_tasks': 0,
                'completed': 0,
                'failed': 0,
                'in_progress': 0,
                'pending': 0
            }
        }

        # Save project state
        self.save_project_state(project)

        # Create initial README
        readme_path = workspace_path / 'README.md'
        if not readme_path.exists():
            readme_content = f"""# {name}

{description}

**Status:** In Development
**Created:** {datetime.now(timezone.utc).strftime('%Y-%m-%d')}
**Managed by:** Claw Conductor

## Project Structure

This project is being built autonomously using Claw Conductor,
an intelligent multi-model AI orchestration system.

## Development Progress

See `.claw-conductor/project-state.json` for current status.
"""
            readme_path.write_text(readme_content)

            # Commit README
            subprocess.run(['git', 'add', 'README.md'], cwd=workspace_path, check=True)
            subprocess.run(
                ['git', 'commit', '-m', 'chore: initial commit - project setup\n\nCo-Authored-By: Claw Conductor <noreply@clawhub.ai>'],
                cwd=workspace_path,
                check=True
            )

            # Push if GitHub repo exists
            if github_repo:
                subprocess.run(
                    ['git', 'push', '-u', 'origin', 'main'],
                    cwd=workspace_path,
                    check=False  # May fail if repo not set up
                )

        return project

    def _init_git(self, workspace: Path):
        """Initialize git repository"""
        if not (workspace / '.git').exists():
            subprocess.run(['git', 'init'], cwd=workspace, check=True)
            subprocess.run(
                ['git', 'config', 'user.name', 'Claw Conductor'],
                cwd=workspace,
                check=True
            )
            subprocess.run(
                ['git', 'config', 'user.email', 'conductor@clawhub.ai'],
                cwd=workspace,
                check=True
            )

            # Create main branch
            subprocess.run(
                ['git', 'checkout', '-b', 'main'],
                cwd=workspace,
                check=False  # May already be on main
            )

    def _create_github_repo(self, name: str, user: str) -> str:
        """
        Create GitHub repository using gh CLI

        Args:
            name: Repository name
            user: GitHub username

        Returns:
            str: Repository URL (e.g., "github.com/user/repo")
        """
        # Check if gh CLI is available
        result = subprocess.run(['which', 'gh'], capture_output=True)
        if result.returncode != 0:
            raise Exception("GitHub CLI (gh) not installed")

        # Create private repo
        result = subprocess.run(
            ['gh', 'repo', 'create', name, '--private', '--confirm'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            # Repo might already exist
            print(f"Note: GitHub repo may already exist: {result.stderr}")

        return f"{user}/{name}"

    def save_project_state(self, project: dict):
        """Save project state to disk"""
        workspace = Path(project['workspace'])
        state_file = workspace / '.claw-conductor' / 'project-state.json'

        with open(state_file, 'w') as f:
            json.dump(project, f, indent=2)

    def load_project_state(self, workspace: str) -> Optional[dict]:
        """Load project state from disk"""
        state_file = Path(workspace) / '.claw-conductor' / 'project-state.json'

        if not state_file.exists():
            return None

        with open(state_file, 'r') as f:
            return json.load(f)

    def update_progress(self, project: dict):
        """Update project progress statistics"""
        tasks = project.get('tasks', [])

        project['progress'] = {
            'total_tasks': len(tasks),
            'completed': len([t for t in tasks if t.get('status') == 'completed']),
            'failed': len([t for t in tasks if t.get('status') == 'failed']),
            'in_progress': len([t for t in tasks if t.get('status') == 'running']),
            'pending': len([t for t in tasks if t.get('status') == 'pending'])
        }

        self.save_project_state(project)


if __name__ == '__main__':
    # Test project creation
    pm = ProjectManager(projects_root='/tmp/test-projects')

    project = pm.create_project(
        name='test-calculator',
        description='A simple calculator for testing',
        github_user=None  # Skip GitHub for test
    )

    print(f"\n✅ Project created:")
    print(f"   ID: {project['project_id']}")
    print(f"   Workspace: {project['workspace']}")
    print(f"   Status: {project['status']}")
