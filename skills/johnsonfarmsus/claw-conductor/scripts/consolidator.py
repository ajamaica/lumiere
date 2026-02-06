#!/usr/bin/env python3
"""
Result Consolidator

Merges parallel task outputs, resolves conflicts,
and commits results to git.
"""

import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List


class Consolidator:
    """Consolidate parallel task results"""

    def consolidate(self, project: Dict) -> Dict:
        """
        Consolidate all task results for a project

        Args:
            project: Project dictionary with completed tasks

        Returns:
            dict: Consolidation result with success status
        """
        workspace = Path(project['workspace'])
        tasks = project.get('tasks', [])

        print(f"📦 Consolidating results for {project['name']}...")

        # Check task statuses
        completed = [t for t in tasks if t.get('status') == 'completed']
        failed = [t for t in tasks if t.get('status') == 'failed']

        if failed:
            print(f"⚠️  {len(failed)} tasks failed:")
            for task in failed:
                print(f"   ❌ {task['task_id']}: {task.get('result', {}).get('error', 'Unknown error')}")

        if not completed:
            return {
                'success': False,
                'error': f'No tasks completed successfully ({len(failed)} failed)',
                'tasks_completed': 0,
                'tasks_failed': len(failed)
            }

        print(f"✅ {len(completed)}/{len(tasks)} tasks completed successfully")

        # Check for git conflicts
        conflicts = self._check_git_conflicts(workspace)
        if conflicts:
            print(f"⚠️  Git conflicts detected:")
            for conflict in conflicts:
                print(f"   🔥 {conflict}")

            # TODO: Use AI model to resolve conflicts
            # For now, mark as needs manual resolution
            return {
                'success': False,
                'error': f'{len(conflicts)} git conflicts detected',
                'conflicts': conflicts,
                'tasks_completed': len(completed),
                'tasks_failed': len(failed)
            }

        # Run tests (if test files exist)
        test_result = self._run_tests(workspace)
        if test_result and not test_result['success']:
            print(f"❌ Tests failed:")
            print(f"   {test_result['error']}")
            # Continue anyway, but mark in result

        # Commit all changes
        commit_result = self._commit_changes(project, workspace)

        if not commit_result['success']:
            return {
                'success': False,
                'error': f"Failed to commit changes: {commit_result['error']}",
                'tasks_completed': len(completed),
                'tasks_failed': len(failed)
            }

        # Push to GitHub (if repo configured)
        if project.get('github_repo'):
            push_result = self._push_to_github(workspace)
            if not push_result['success']:
                print(f"⚠️  Failed to push to GitHub: {push_result['error']}")
                # Don't fail consolidation if push fails

        # Success
        return {
            'success': True,
            'tasks_completed': len(completed),
            'tasks_failed': len(failed),
            'commit_sha': commit_result.get('commit_sha'),
            'tests_passed': test_result.get('success', True) if test_result else None,
            'pushed_to_github': push_result.get('success', False) if project.get('github_repo') else False
        }

    def _check_git_conflicts(self, workspace: Path) -> List[str]:
        """
        Check for git merge conflicts

        Args:
            workspace: Project workspace path

        Returns:
            List of conflicted file paths
        """
        try:
            # Check git status for conflicts
            result = subprocess.run(
                ['git', 'diff', '--name-only', '--diff-filter=U'],
                cwd=workspace,
                capture_output=True,
                text=True,
                check=True
            )
            conflicts = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            return conflicts
        except subprocess.CalledProcessError:
            return []

    def _run_tests(self, workspace: Path) -> Dict:
        """
        Run project tests if test framework detected

        Args:
            workspace: Project workspace path

        Returns:
            dict: Test result or None if no tests
        """
        # Check for common test frameworks
        has_pytest = (workspace / 'pytest.ini').exists() or (workspace / 'tests').exists()
        has_npm_test = (workspace / 'package.json').exists()

        if has_pytest:
            try:
                result = subprocess.run(
                    ['pytest', '-v'],
                    cwd=workspace,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                return {
                    'success': result.returncode == 0,
                    'framework': 'pytest',
                    'output': result.stdout,
                    'error': result.stderr if result.returncode != 0 else None
                }
            except (subprocess.TimeoutExpired, FileNotFoundError) as e:
                return {
                    'success': False,
                    'framework': 'pytest',
                    'error': str(e)
                }

        elif has_npm_test:
            try:
                result = subprocess.run(
                    ['npm', 'test'],
                    cwd=workspace,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                return {
                    'success': result.returncode == 0,
                    'framework': 'npm',
                    'output': result.stdout,
                    'error': result.stderr if result.returncode != 0 else None
                }
            except (subprocess.TimeoutExpired, FileNotFoundError) as e:
                return {
                    'success': False,
                    'framework': 'npm',
                    'error': str(e)
                }

        # No tests found
        return None

    def _commit_changes(self, project: Dict, workspace: Path) -> Dict:
        """
        Commit all changes to git

        Args:
            project: Project metadata
            workspace: Project workspace path

        Returns:
            dict: Commit result
        """
        try:
            # Stage all changes
            subprocess.run(['git', 'add', '.'], cwd=workspace, check=True)

            # Check if there are changes to commit
            result = subprocess.run(
                ['git', 'diff', '--cached', '--quiet'],
                cwd=workspace,
                check=False
            )

            if result.returncode == 0:
                # No changes to commit
                return {
                    'success': True,
                    'commit_sha': None,
                    'message': 'No changes to commit'
                }

            # Create commit message
            tasks_completed = len([t for t in project['tasks'] if t.get('status') == 'completed'])
            commit_message = self._generate_commit_message(project, tasks_completed)

            # Commit
            subprocess.run(
                ['git', 'commit', '-m', commit_message],
                cwd=workspace,
                check=True,
                capture_output=True
            )

            # Get commit SHA
            result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=workspace,
                capture_output=True,
                text=True,
                check=True
            )
            commit_sha = result.stdout.strip()

            print(f"✅ Committed changes: {commit_sha[:7]}")

            return {
                'success': True,
                'commit_sha': commit_sha,
                'message': commit_message
            }

        except subprocess.CalledProcessError as e:
            return {
                'success': False,
                'error': f'Git commit failed: {e.stderr if hasattr(e, "stderr") else str(e)}'
            }

    def _generate_commit_message(self, project: Dict, tasks_completed: int) -> str:
        """
        Generate conventional commit message

        Args:
            project: Project metadata
            tasks_completed: Number of tasks completed

        Returns:
            str: Commit message
        """
        # Determine commit type
        has_new_features = any(
            'frontend' in t.get('category', '') or 'backend' in t.get('category', '') or 'api' in t.get('category', '')
            for t in project['tasks'] if t.get('status') == 'completed'
        )

        commit_type = 'feat' if has_new_features else 'chore'

        # Build message
        message = f"""{commit_type}: {project['name']} - {tasks_completed} tasks completed

Autonomous development by Claw Conductor
Tasks: {tasks_completed} completed

Co-Authored-By: Claw Conductor <conductor@clawhub.ai>
"""
        return message

    def _push_to_github(self, workspace: Path) -> Dict:
        """
        Push changes to GitHub

        Args:
            workspace: Project workspace path

        Returns:
            dict: Push result
        """
        try:
            subprocess.run(
                ['git', 'push'],
                cwd=workspace,
                check=True,
                capture_output=True,
                timeout=30
            )

            print(f"✅ Pushed to GitHub")

            return {'success': True}

        except subprocess.CalledProcessError as e:
            return {
                'success': False,
                'error': f'Git push failed: {e.stderr.decode() if e.stderr else str(e)}'
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'Git push timed out'
            }


if __name__ == '__main__':
    # Test consolidation
    consolidator = Consolidator()

    # Mock project
    project = {
        'name': 'test-project',
        'workspace': '/tmp/test-project',
        'tasks': [
            {'task_id': 'task-001', 'status': 'completed'},
            {'task_id': 'task-002', 'status': 'completed'},
            {'task_id': 'task-003', 'status': 'failed', 'result': {'error': 'Test error'}}
        ]
    }

    result = consolidator.consolidate(project)

    print(f"\nConsolidation result:")
    print(f"  Success: {result['success']}")
    print(f"  Tasks completed: {result.get('tasks_completed', 0)}")
    print(f"  Tasks failed: {result.get('tasks_failed', 0)}")
