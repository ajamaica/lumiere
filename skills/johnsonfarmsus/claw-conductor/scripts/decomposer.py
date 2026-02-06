#!/usr/bin/env python3
"""
Task Decomposition Engine

Analyzes complex development requests and breaks them into
independent, actionable subtasks with dependencies.
"""

import json
from pathlib import Path
from typing import List, Dict


class Decomposer:
    """Decompose complex requests into subtasks"""

    # Standard task categories from capability system
    CATEGORIES = [
        "code-generation-new-features",
        "bug-detection-fixes",
        "multi-file-refactoring",
        "unit-test-generation",
        "debugging-complex-issues",
        "api-development",
        "security-vulnerability-detection",
        "security-fixes",
        "documentation-generation",
        "code-review",
        "frontend-development",
        "backend-development",
        "database-operations",
        "codebase-exploration",
        "dependency-management",
        "legacy-modernization",
        "error-correction",
        "performance-optimization",
        "test-coverage-analysis",
        "algorithm-implementation",
        "boilerplate-generation"
    ]

    def __init__(self, config_path: str):
        """
        Initialize decomposer

        Args:
            config_path: Path to agent-registry.json
        """
        with open(config_path, 'r') as f:
            registry = json.load(f)
        self.config = registry.get('user_config', {})
        self.agents = registry.get('agents', {})

    def decompose(self, request: str) -> List[Dict]:
        """
        Decompose request into subtasks using AI models

        Args:
            request: User's development request

        Returns:
            List of task dictionaries with structure:
            {
                'description': str,
                'category': str,
                'complexity': int (1-5),
                'dependencies': List[str],  # task_ids
                'file_targets': List[str],
                'status': 'pending'
            }

        Raises:
            Exception: If no models configured or all AI attempts fail
        """
        primary_model, fallback_model = self._select_decomposition_models()

        if not primary_model:
            raise Exception(
                "No AI models configured in agent registry. "
                "Please add at least one enabled model with capabilities."
            )

        print(f"[Decomposer] Using AI model '{primary_model}' for task decomposition")
        return self.decompose_with_ai(request, primary_model, fallback_model)

    def _select_decomposition_models(self) -> tuple:
        """
        Select the best model(s) for task decomposition

        Returns:
            (primary_model_id, fallback_model_id)
        """
        decomp_model = self.config.get('decomposition_model')

        # If user specified a model, use it and find fallback
        if decomp_model and decomp_model in self.agents:
            if self.agents[decomp_model].get('enabled', False):
                fallback = self._find_best_model_excluding([decomp_model])
                return (decomp_model, fallback)

        # Auto-select: Find models with best overall capabilities
        model_scores = []

        for agent_id, agent in self.agents.items():
            if not agent.get('enabled', False):
                continue

            capabilities = agent.get('capabilities', {})
            if not capabilities:
                continue

            # Score based on relevant capabilities for decomposition
            ratings = []
            for category in ['code-generation-new-features', 'codebase-exploration',
                             'documentation-generation', 'api-development']:
                cap = capabilities.get(category, {})
                if cap.get('rating'):
                    ratings.append(cap['rating'])

            if not ratings:
                continue

            # Average rating across relevant categories
            avg_score = sum(ratings) / len(ratings)

            # Cost factor
            cost_type = agent.get('user_cost', {}).get('type', 'pay-per-use')
            cost_bonus = 0.5 if cost_type in ['free', 'free-tier'] else 0

            model_scores.append({
                'agent_id': agent_id,
                'score': avg_score + cost_bonus,
                'cost': cost_type
            })

        # Sort by score (desc)
        model_scores.sort(key=lambda x: -x['score'])

        if len(model_scores) >= 2:
            return (model_scores[0]['agent_id'], model_scores[1]['agent_id'])
        elif len(model_scores) == 1:
            return (model_scores[0]['agent_id'], None)
        else:
            return (None, None)

    def _find_best_model_excluding(self, exclude_ids: List[str]) -> str:
        """
        Find the best model excluding specified models

        Args:
            exclude_ids: List of model IDs to exclude

        Returns:
            Best model ID or None
        """
        model_scores = []

        for agent_id, agent in self.agents.items():
            if agent_id in exclude_ids:
                continue
            if not agent.get('enabled', False):
                continue

            capabilities = agent.get('capabilities', {})
            if not capabilities:
                continue

            ratings = []
            for category in ['code-generation-new-features', 'codebase-exploration',
                             'documentation-generation']:
                cap = capabilities.get(category, {})
                if cap.get('rating'):
                    ratings.append(cap['rating'])

            if not ratings:
                continue

            avg_score = sum(ratings) / len(ratings)
            model_scores.append({'agent_id': agent_id, 'score': avg_score})

        model_scores.sort(key=lambda x: -x['score'])
        return model_scores[0]['agent_id'] if model_scores else None

    def decompose_with_ai(self, request: str, primary_model: str,
                          fallback_model: str = None) -> List[Dict]:
        """
        Use AI model to decompose request into structured tasks

        Args:
            request: User's development request
            primary_model: Primary model to use
            fallback_model: Fallback model if primary fails

        Returns:
            List of task dictionaries

        Raises:
            Exception: If both primary and fallback models fail
        """
        errors = []

        # Try primary model
        try:
            return self._call_ai_for_decomposition(request, primary_model)
        except Exception as e:
            error_msg = f"Primary model '{primary_model}' failed: {e}"
            print(f"[Decomposer] {error_msg}")
            errors.append(error_msg)

            # Try fallback model if available
            if fallback_model:
                try:
                    print(f"[Decomposer] Trying fallback model '{fallback_model}'")
                    return self._call_ai_for_decomposition(request, fallback_model)
                except Exception as e2:
                    error_msg2 = f"Fallback model '{fallback_model}' failed: {e2}"
                    print(f"[Decomposer] {error_msg2}")
                    errors.append(error_msg2)

            # Both models failed
            raise Exception(
                "Task decomposition failed. " +
                " | ".join(errors) +
                "\n\nPlease check your model configuration and try again."
            )

    def _call_ai_for_decomposition(self, request: str, model_id: str) -> List[Dict]:
        """
        Call AI model to decompose request

        Args:
            request: User's development request
            model_id: Model to use

        Returns:
            List of task dictionaries

        Raises:
            Exception: If AI call fails
        """
        # Construct prompt for AI decomposition
        prompt = self._build_decomposition_prompt(request)

        # Call the AI model via OpenClaw Task interface
        try:
            response = self._invoke_openclaw_task(model_id, prompt)
            tasks = self._parse_ai_response(response)
            return tasks
        except Exception as e:
            raise Exception(f"AI decomposition failed: {e}")

    def _build_decomposition_prompt(self, request: str) -> str:
        """
        Build a structured prompt for AI task decomposition

        Args:
            request: User's development request

        Returns:
            Formatted prompt string
        """
        categories_list = '\n'.join([f"- {cat}" for cat in self.CATEGORIES])

        prompt = f"""You are a software project analyst. Decompose the following development request into independent, actionable subtasks.

DEVELOPMENT REQUEST:
{request}

AVAILABLE TASK CATEGORIES:
{categories_list}

For each task, provide:
1. description: Clear, specific description of what needs to be done
2. category: One of the categories above that best fits the task
3. complexity: Integer 1-5 (1=trivial, 2=simple, 3=moderate, 4=complex, 5=very complex)
4. dependencies: List of other task descriptions this depends on (use exact description text)
5. file_targets: Estimated file paths that will be created/modified (e.g., src/api/*, tests/*)

RULES:
- Break down the request into 3-8 independent tasks
- Order tasks logically (database before API, API before frontend, tests last)
- Be specific about what each task accomplishes
- Assign realistic complexity based on scope
- Identify clear dependencies (e.g., auth depends on database)

Return your response as a JSON array of task objects. Example format:
[
  {{
    "description": "Design and implement database schema",
    "category": "database-operations",
    "complexity": 3,
    "dependencies": [],
    "file_targets": ["src/db/schema.sql", "src/models/*"]
  }},
  {{
    "description": "Implement user authentication system",
    "category": "security-fixes",
    "complexity": 4,
    "dependencies": ["Design and implement database schema"],
    "file_targets": ["src/auth/*", "src/middleware/auth.js"]
  }}
]

RESPOND WITH ONLY THE JSON ARRAY, NO OTHER TEXT."""

        return prompt

    def _invoke_openclaw_task(self, model_id: str, prompt: str) -> str:
        """
        Invoke OpenClaw CLI to call an AI model

        Args:
            model_id: Claw-conductor model ID (e.g., 'mistral-devstral-2512')
            prompt: Prompt to send

        Returns:
            AI model's response text

        Raises:
            Exception: If invocation fails
        """
        import subprocess
        import json
        import tempfile
        import os

        # Write prompt to temp file to avoid shell escaping issues
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(prompt)
            prompt_file = f.name

        try:
            # Use openclaw agent command (uses main agent with configured model)
            result = subprocess.run(
                ['openclaw', 'agent', '--agent', 'main', '--message', prompt, '--json'],
                capture_output=True,
                text=True,
                timeout=120,  # 2 minutes timeout
                cwd=os.path.expanduser('~')
            )

            if result.returncode != 0:
                raise Exception(f"OpenClaw agent command failed: {result.stderr}")

            # Parse JSON response
            response_data = json.loads(result.stdout)

            # Extract text from response
            if response_data.get('status') == 'ok':
                payloads = response_data.get('result', {}).get('payloads', [])
                if payloads and payloads[0].get('text'):
                    return payloads[0]['text']

            raise Exception(f"No text in response: {result.stdout[:200]}")

        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse OpenClaw response as JSON: {e}")
        except subprocess.TimeoutExpired:
            raise Exception("OpenClaw agent command timed out after 120s")
        finally:
            # Clean up temp file
            if os.path.exists(prompt_file):
                os.unlink(prompt_file)

    def _parse_ai_response(self, response: str) -> List[Dict]:
        """
        Parse AI model's JSON response into task structure

        Args:
            response: AI's response (should be JSON array)

        Returns:
            List of task dictionaries with proper structure

        Raises:
            Exception: If parsing fails
        """
        try:
            # Extract JSON from response (AI might include extra text)
            response = response.strip()

            # Find JSON array in response
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1

            if start_idx == -1 or end_idx == 0:
                raise Exception("No JSON array found in AI response")

            json_str = response[start_idx:end_idx]
            ai_tasks = json.loads(json_str)

            # Convert AI format to our internal format
            tasks = []
            task_id_counter = 1
            description_to_id = {}  # Map descriptions to task IDs for dependencies

            for ai_task in ai_tasks:
                task_id = f'task-{task_id_counter:03d}'
                description = ai_task.get('description', 'Unnamed task')

                # Map description to task_id for dependency resolution
                description_to_id[description] = task_id

                tasks.append({
                    'task_id': task_id,
                    'description': description,
                    'category': ai_task.get('category', 'code-generation-new-features'),
                    'complexity': int(ai_task.get('complexity', 3)),
                    'dependencies': [],  # Will be resolved in second pass
                    'file_targets': ai_task.get('file_targets', ['src/*']),
                    'status': 'pending',
                    '_ai_dependencies': ai_task.get('dependencies', [])  # Temp storage
                })

                task_id_counter += 1

            # Second pass: Resolve dependencies (description -> task_id)
            for task in tasks:
                ai_deps = task.pop('_ai_dependencies', [])
                resolved_deps = []

                for dep_desc in ai_deps:
                    # Try exact match first
                    if dep_desc in description_to_id:
                        resolved_deps.append(description_to_id[dep_desc])
                    else:
                        # Try fuzzy match (partial string match)
                        for desc, tid in description_to_id.items():
                            if dep_desc.lower() in desc.lower() or desc.lower() in dep_desc.lower():
                                resolved_deps.append(tid)
                                break

                task['dependencies'] = resolved_deps

            return tasks

        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            raise Exception(f"Failed to process AI response: {e}")


if __name__ == '__main__':
    # Test AI-powered decomposition
    import sys

    decomposer = Decomposer('../config/agent-registry.json')

    test_request = """
    Build a towing dispatch system with:
    - Customer portal for requesting service
    - Driver dashboard for accepting jobs
    - Admin panel for managing users
    - Real-time location tracking
    - Database for storing jobs and users
    """

    try:
        tasks = decomposer.decompose(test_request)

        print(f"\n✅ Decomposed into {len(tasks)} tasks:\n")
        for task in tasks:
            deps_str = f" (depends on: {', '.join(task['dependencies'])})" if task['dependencies'] else ""
            print(f"  {task['task_id']}: {task['description']}{deps_str}")
            print(f"           Category: {task['category']}, Complexity: {task['complexity']}\n")

    except Exception as e:
        print(f"\n❌ Decomposition failed: {e}\n", file=sys.stderr)
        sys.exit(1)
