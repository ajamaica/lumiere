#!/usr/bin/env python3
"""
Claw Conductor Orchestrator - Main Controller

Coordinates the full autonomous development workflow:
1. Request triage (simple vs development)
2. Discord channel detection & workspace mapping
3. Task decomposition
4. Dependency analysis
5. Parallel execution
6. Result consolidation
7. Discord reporting
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from router import Router, Task as RoutingTask
from decomposer import Decomposer
from project_manager import ProjectManager
from worker_pool import WorkerPool
from consolidator import Consolidator
from discord_integration import DiscordIntegration


class Orchestrator:
    """Main orchestration controller for Claw Conductor"""

    def __init__(self, config_path: str = None, conductor_config_path: str = None):
        """
        Initialize orchestrator with configuration

        Args:
            config_path: Path to agent-registry.json
            conductor_config_path: Path to conductor-config.json
        """
        if config_path is None:
            config_path = str(Path(__file__).parent.parent / 'config' / 'agent-registry.json')
        if conductor_config_path is None:
            conductor_config_path = str(Path(__file__).parent.parent / 'config' / 'conductor-config.json')

        # Load conductor configuration
        with open(conductor_config_path, 'r') as f:
            self.conductor_config = json.load(f)

        # Initialize components
        self.router = Router(config_path)
        self.decomposer = Decomposer(config_path)
        self.project_manager = ProjectManager()
        self.consolidator = Consolidator()
        self.discord = DiscordIntegration(conductor_config_path)

        # Load user config from agent registry
        with open(config_path, 'r') as f:
            registry = json.load(f)
        self.config = registry.get('user_config', {})

        # Initialize worker pool
        max_workers = self.config.get('max_parallel_tasks', 5)
        self.worker_pool = WorkerPool(max_workers, self.router)

        # Triage configuration
        self.triage_config = self.conductor_config.get('triage', {})
        self.triage_enabled = self.triage_config.get('enabled', True)
        self.announce_path = self.triage_config.get('announce_path', True)

        # User override triggers
        overrides = self.triage_config.get('user_overrides', {})
        self.simple_trigger = overrides.get('simple_trigger', '!simple')
        self.dev_trigger = overrides.get('dev_trigger', '!dev')

        # Active projects
        self.projects: Dict[str, dict] = {}

    def triage_request(self, request: str) -> str:
        """
        Triage incoming request to determine if it's simple or development

        Args:
            request: User's message/request

        Returns:
            'simple' or 'development'
        """
        # Check for user overrides first
        if self.simple_trigger in request:
            return 'simple'
        if self.dev_trigger in request:
            return 'development'

        # Use fast model for classification
        triage_model = self.triage_config.get('model', 'chutes/openai/gpt-oss-120b-TEE')
        bias = self.triage_config.get('bias', 'development')

        # Classification prompt
        prompt = f"""Classify this message as SIMPLE or DEVELOPMENT:

SIMPLE examples:
- Greetings, small talk, questions about the project
- "What files exist in this project?"
- "How does the authentication work?"
- "What's the current status?"
- Discussions, clarifications, explanations

DEVELOPMENT examples:
- Requests to build, create, implement, fix, refactor, add features
- "Build a calculator app"
- "Fix the bug in authentication"
- "Add a new endpoint for user registration"
- "Refactor the database layer"
- Code generation, testing, deployment tasks

Bias: Lean towards {bias.upper()} when uncertain.

Message: "{request}"

Respond with exactly one word: SIMPLE or DEVELOPMENT"""

        # TODO: Actually call the model
        # For now, use simple heuristics
        request_lower = request.lower()

        # Development keywords
        dev_keywords = [
            'build', 'create', 'implement', 'add', 'fix', 'refactor',
            'deploy', 'test', 'write', 'develop', 'code', 'feature',
            'bug', 'update', 'modify', 'change', 'improve', 'optimize'
        ]

        # Simple keywords
        simple_keywords = [
            'what', 'why', 'how', 'explain', 'show', 'list', 'status',
            'help', 'hello', 'hi', 'thanks', 'thank you', 'ok', 'okay'
        ]

        # Score the request
        dev_score = sum(1 for kw in dev_keywords if kw in request_lower)
        simple_score = sum(1 for kw in simple_keywords if kw in request_lower)

        # Apply bias
        if bias == 'development':
            dev_score += 1

        # Make decision
        if dev_score > simple_score:
            return 'development'
        elif simple_score > dev_score:
            return 'simple'
        else:
            # Tie - use bias
            return bias

    def handle_simple_response(self, request: str, context: Dict) -> Dict:
        """
        Handle simple (non-development) requests

        Args:
            request: User's question/message
            context: Execution context (workspace, project info)

        Returns:
            Response dictionary
        """
        # Get simple response configuration
        simple_config = self.conductor_config.get('simple_response', {})
        model = simple_config.get('model', 'mistral/devstral-2512')
        max_tokens = simple_config.get('max_tokens', 2000)
        project_aware = simple_config.get('project_aware', True)

        # Build context-aware prompt
        if project_aware and context.get('project'):
            project_context = f"""You are working in project: {context['project']}
Workspace: {context['workspace']}
Source: {context['source']}

"""
        else:
            project_context = ""

        prompt = f"""{project_context}User message: {request}

Respond naturally and helpfully."""

        # TODO: Actually call the model
        # For now, return a placeholder
        response = f"[Simple response mode - project: {context.get('project', 'none')}]\n"
        response += f"I understand you're asking: {request[:100]}...\n"
        response += f"This would be answered by model: {model}"

        return {
            'success': True,
            'mode': 'simple',
            'response': response,
            'model': model,
            'project': context.get('project'),
            'workspace': str(context.get('workspace', ''))
        }

    def handle_message(self, request: str, channel_id: str = None,
                      channel_name: str = None, project_name: str = None,
                      workspace: str = None, github_user: str = None) -> dict:
        """
        Main entry point - handles any message with triage and routing

        Args:
            request: User's message/request
            channel_id: Discord channel ID (if from Discord)
            channel_name: Discord channel name (if from Discord)
            project_name: Project name (fallback if not Discord)
            workspace: Workspace path (fallback)
            github_user: GitHub username

        Returns:
            Response dictionary
        """
        # Phase 1: Detect context (Discord vs direct)
        context = self.discord.detect_context(channel_id, channel_name, project_name)

        # Check for errors in context
        if 'error' in context:
            return {
                'success': False,
                'error': context['error'],
                'context': context
            }

        # Use workspace from context if not explicitly provided
        if workspace is None and context.get('workspace'):
            workspace = str(context['workspace'])

        # Use project name from context if not explicitly provided
        if project_name is None and context.get('project'):
            project_name = context['project']

        # Phase 2: Triage request (simple vs development)
        if self.triage_enabled:
            classification = self.triage_request(request)
        else:
            # If triage disabled, assume development
            classification = 'development'

        # Announce path if configured
        if self.announce_path:
            if classification == 'simple':
                print("📋 Simple response mode")
            else:
                print("🔧 Development mode - full orchestration")

        # Phase 3: Route to appropriate handler
        if classification == 'simple':
            return self.handle_simple_response(request, context)
        else:
            return self.execute_request(
                request=request,
                project_name=project_name,
                workspace=workspace,
                github_user=github_user
            )

    def execute_request(self, request: str, project_name: str = None,
                       workspace: str = None, github_user: str = None) -> dict:
        """
        Execute a complex development request

        Args:
            request: User's development request
            project_name: Optional project name (auto-generated if None)
            workspace: Optional workspace path (default: /root/projects/{name})
            github_user: Optional GitHub username for repo creation

        Returns:
            dict: Execution result with project info, tasks, and status
        """
        print(f"🎯 Orchestrator received request: {request[:100]}...")

        # Phase 1: Initialize project
        project = self._initialize_project(request, project_name, workspace, github_user)
        project_id = project['project_id']
        self.projects[project_id] = project

        print(f"📁 Project initialized: {project['name']} ({project_id})")

        # Phase 2: Decompose request into tasks
        print(f"🔍 Decomposing request into subtasks...")
        tasks = self.decomposer.decompose(request)

        if not tasks:
            return {
                'success': False,
                'error': 'Failed to decompose request into tasks',
                'project': project
            }

        print(f"📋 Decomposed into {len(tasks)} tasks:")
        for i, task in enumerate(tasks, 1):
            print(f"   {i}. {task['description'][:60]}... "
                  f"(complexity: {task['complexity']}, category: {task['category']})")

        # Add tasks to project
        project['tasks'] = tasks
        project['total_tasks'] = len(tasks)

        # Phase 3: Build dependency graph
        dependencies = self._build_dependency_graph(tasks)
        project['dependencies'] = dependencies

        print(f"🔗 Dependency graph built")

        # Phase 4: Route tasks to models
        print(f"🎯 Routing tasks to optimal models...")
        for task in tasks:
            routing_task = RoutingTask(
                description=task['description'],
                category=task['category'],
                complexity=task['complexity']
            )
            model_id, details = self.router.route_task(routing_task)
            task['assigned_model'] = model_id
            task['routing_details'] = details
            print(f"   • {task['description'][:50]}... → {model_id}")

        # Phase 5: Execute tasks in parallel
        print(f"⚡ Executing tasks in parallel (max {self.worker_pool.max_workers} concurrent)...")

        for task in tasks:
            self.worker_pool.schedule_task(task, project)

        # Wait for all tasks to complete
        self.worker_pool.wait_all()

        # Phase 6: Consolidate results
        print(f"📦 Consolidating results...")
        consolidation_result = self.consolidator.consolidate(project)

        # Phase 7: Update project status
        project['status'] = 'completed' if consolidation_result['success'] else 'failed'
        project['completed_at'] = datetime.now(timezone.utc).isoformat()
        project['consolidation'] = consolidation_result

        # Save final project state
        self.project_manager.save_project_state(project)

        # Return result
        return {
            'success': project['status'] == 'completed',
            'mode': 'development',
            'project': project,
            'github_repo': project.get('github_repo'),
            'tasks_completed': len([t for t in tasks if t['status'] == 'completed']),
            'tasks_failed': len([t for t in tasks if t['status'] == 'failed']),
            'execution_time': self._calculate_total_time(project),
            'workspace': project.get('workspace')
        }

    def _initialize_project(self, request: str, project_name: Optional[str],
                           workspace: Optional[str], github_user: Optional[str]) -> dict:
        """Initialize project workspace and metadata"""

        # Generate project name if not provided
        if project_name is None:
            # Extract project name from request or use timestamp
            project_name = self._extract_project_name(request)

        # Create project
        project = self.project_manager.create_project(
            name=project_name,
            description=request,
            workspace=workspace,
            github_user=github_user
        )

        return project

    def _extract_project_name(self, request: str) -> str:
        """Extract a reasonable project name from request"""
        # Simple heuristic: look for common patterns
        request_lower = request.lower()

        if 'dispatch' in request_lower:
            return 'dispatch-suite'
        elif 'calculator' in request_lower:
            return 'calculator'
        elif 'todo' in request_lower or 'task' in request_lower:
            return 'task-manager'
        elif 'blog' in request_lower:
            return 'blog-system'
        else:
            # Use timestamp-based name
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
            return f'project-{timestamp}'

    def _build_dependency_graph(self, tasks: List[dict]) -> dict:
        """Build dependency graph from tasks"""
        graph = {}

        for i, task in enumerate(tasks):
            task_id = task.get('task_id', f'task-{i+1:03d}')
            task['task_id'] = task_id  # Ensure task_id is set

            dependencies = task.get('dependencies', [])
            graph[task_id] = dependencies

        return graph

    def _calculate_total_time(self, project: dict) -> float:
        """Calculate total execution time in seconds"""
        if 'started_at' not in project or 'completed_at' not in project:
            return 0.0

        start = datetime.fromisoformat(project['started_at'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(project['completed_at'].replace('Z', '+00:00'))

        return (end - start).total_seconds()

    def get_project_status(self, project_id: str) -> dict:
        """Get current status of a project"""
        if project_id not in self.projects:
            return {'error': 'Project not found'}

        project = self.projects[project_id]

        tasks = project.get('tasks', [])
        return {
            'project_id': project_id,
            'name': project['name'],
            'status': project['status'],
            'progress': {
                'total': len(tasks),
                'completed': len([t for t in tasks if t.get('status') == 'completed']),
                'failed': len([t for t in tasks if t.get('status') == 'failed']),
                'in_progress': len([t for t in tasks if t.get('status') == 'running']),
                'pending': len([t for t in tasks if t.get('status') == 'pending'])
            },
            'workers_active': self.worker_pool.get_active_count()
        }


def main():
    """Example usage demonstrating triage and routing"""
    print("=== Claw Conductor v2.1 - Triage & Discord Integration ===\n")

    orchestrator = Orchestrator()

    # Example 1: Simple question (should use simple response)
    print("📝 Example 1: Simple question")
    result1 = orchestrator.handle_message(
        request="What files exist in this project?",
        channel_name="scientific-calculator"
    )
    print(f"Mode: {result1.get('mode')}")
    print(f"Response: {result1.get('response', result1.get('error'))}\n")

    # Example 2: Development request (should use full orchestration)
    print("📝 Example 2: Development request")
    dev_request = """
    Build a simple calculator web application with:
    - Basic arithmetic operations (add, subtract, multiply, divide)
    - Clean, modern UI
    - Responsive design
    - Unit tests
    """

    result2 = orchestrator.handle_message(
        request=dev_request,
        project_name='calculator-app',
        github_user='jfasteroid'
    )

    if result2['success']:
        print(f"\n✅ Project completed successfully!")
        print(f"   Mode: {result2.get('mode')}")
        print(f"   GitHub: {result2.get('github_repo')}")
        print(f"   Tasks: {result2['tasks_completed']}/{result2['tasks_completed'] + result2['tasks_failed']}")
        print(f"   Time: {result2.get('execution_time', 0):.0f}s")
    else:
        print(f"\n❌ Request failed")
        print(f"   Mode: {result2.get('mode')}")
        if 'tasks_completed' in result2:
            print(f"   Tasks completed: {result2['tasks_completed']}")
            print(f"   Tasks failed: {result2['tasks_failed']}")

    # Example 3: User override (force simple mode with !simple)
    print("\n📝 Example 3: User override (!simple)")
    result3 = orchestrator.handle_message(
        request="!simple Build a calculator",
        channel_name="test-project"
    )
    print(f"Mode: {result3.get('mode')}")
    print(f"Response: {result3.get('response', result3.get('error'))[:100]}...")


if __name__ == '__main__':
    main()
