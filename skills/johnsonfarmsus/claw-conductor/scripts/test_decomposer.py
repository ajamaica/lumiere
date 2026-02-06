#!/usr/bin/env python3
"""
Test AI-powered decomposition model selection and prompt generation
"""

import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from decomposer import Decomposer


def create_test_config():
    """Create a test configuration with mock models"""
    test_config = {
        "version": "1.0.0",
        "user_config": {
            "github_user": "test-user",
            "decomposition_model": None,  # Auto-select
            "cost_tracking_enabled": True,
            "prefer_free_when_equal": True,
            "max_parallel_tasks": 5,
            "default_complexity_if_unknown": 3
        },
        "agents": {
            "mistral-devstral-2512": {
                "model_id": "mistral/devstral-2512",
                "provider": "mistral",
                "enabled": True,
                "user_cost": {
                    "type": "free-tier"
                },
                "capabilities": {
                    "code-generation-new-features": {
                        "rating": 5,
                        "max_complexity": 5
                    },
                    "frontend-development": {
                        "rating": 5,
                        "max_complexity": 5
                    },
                    "codebase-exploration": {
                        "rating": 4,
                        "max_complexity": 4
                    }
                }
            },
            "llama-3.3-70b": {
                "model_id": "openrouter/llama-3.3-70b",
                "provider": "openrouter",
                "enabled": True,
                "user_cost": {
                    "type": "free"
                },
                "capabilities": {
                    "code-generation-new-features": {
                        "rating": 4,
                        "max_complexity": 4
                    },
                    "unit-test-generation": {
                        "rating": 5,
                        "max_complexity": 5
                    },
                    "documentation-generation": {
                        "rating": 3,
                        "max_complexity": 3
                    }
                }
            },
            "perplexity-sonar": {
                "model_id": "perplexity/sonar-large",
                "provider": "perplexity",
                "enabled": True,
                "user_cost": {
                    "type": "pay-per-use"
                },
                "capabilities": {
                    "documentation-generation": {
                        "rating": 5,
                        "max_complexity": 5
                    },
                    "codebase-exploration": {
                        "rating": 5,
                        "max_complexity": 5
                    }
                }
            }
        }
    }

    # Write to temporary file
    test_config_path = Path(__file__).parent / 'test-agent-registry.json'
    with open(test_config_path, 'w') as f:
        json.dump(test_config, f, indent=2)

    return str(test_config_path)


def test_model_selection():
    """Test that model selection works correctly"""
    print("\n=== Testing Model Selection ===\n")

    config_path = create_test_config()
    decomposer = Decomposer(config_path)

    # Test 1: Auto-selection should pick Mistral (highest overall score)
    print("Test 1: Auto-selection of best model")
    primary, fallback = decomposer._select_decomposition_models()
    print(f"  Primary model: {primary}")
    print(f"  Fallback model: {fallback}")

    expected_primary = "mistral-devstral-2512"  # Highest ratings + free tier
    if primary == expected_primary:
        print(f"  ✅ PASS: Correctly selected {expected_primary} as primary")
    else:
        print(f"  ❌ FAIL: Expected {expected_primary}, got {primary}")

    if fallback and fallback != primary:
        print(f"  ✅ PASS: Has fallback model: {fallback}")
    else:
        print(f"  ❌ FAIL: No fallback model or same as primary")

    # Test 2: Manual override
    print("\nTest 2: Manual model override")
    decomposer.config['decomposition_model'] = 'llama-3.3-70b'
    primary, fallback = decomposer._select_decomposition_models()
    print(f"  Primary model: {primary}")
    print(f"  Fallback model: {fallback}")

    if primary == 'llama-3.3-70b':
        print(f"  ✅ PASS: Manual override respected")
    else:
        print(f"  ❌ FAIL: Manual override not respected")

    # Clean up
    Path(config_path).unlink()


def test_prompt_generation():
    """Test that decomposition prompt is generated correctly"""
    print("\n=== Testing Prompt Generation ===\n")

    config_path = create_test_config()
    decomposer = Decomposer(config_path)

    test_request = "Build a todo app with user authentication and database storage"

    prompt = decomposer._build_decomposition_prompt(test_request)

    print("Generated prompt preview:")
    print("-" * 60)
    print(prompt[:500] + "...")
    print("-" * 60)

    # Verify prompt contains key elements
    checks = [
        ("request text", test_request in prompt),
        ("category list", "code-generation-new-features" in prompt),
        ("JSON format", '"description":' in prompt),
        ("complexity scale", "1-5" in prompt),
        ("dependencies", '"dependencies":' in prompt)
    ]

    print("\nPrompt validation:")
    all_passed = True
    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {check_name}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\n✅ All prompt validation checks passed!")
    else:
        print("\n❌ Some prompt validation checks failed")

    # Clean up
    Path(config_path).unlink()


def test_response_parsing():
    """Test that AI response parsing works correctly"""
    print("\n=== Testing Response Parsing ===\n")

    config_path = create_test_config()
    decomposer = Decomposer(config_path)

    # Mock AI response
    mock_response = """
    Here's the task breakdown:

    [
      {
        "description": "Design and implement database schema",
        "category": "database-operations",
        "complexity": 3,
        "dependencies": [],
        "file_targets": ["src/db/schema.sql", "src/models/*"]
      },
      {
        "description": "Implement user authentication system",
        "category": "security-fixes",
        "complexity": 4,
        "dependencies": ["Design and implement database schema"],
        "file_targets": ["src/auth/*"]
      },
      {
        "description": "Build frontend UI",
        "category": "frontend-development",
        "complexity": 3,
        "dependencies": ["Implement user authentication system"],
        "file_targets": ["src/components/*"]
      }
    ]

    These tasks should be completed in order.
    """

    try:
        tasks = decomposer._parse_ai_response(mock_response)

        print(f"Parsed {len(tasks)} tasks:")
        for task in tasks:
            print(f"\n  Task ID: {task['task_id']}")
            print(f"  Description: {task['description']}")
            print(f"  Category: {task['category']}")
            print(f"  Complexity: {task['complexity']}")
            print(f"  Dependencies: {task['dependencies']}")
            print(f"  File targets: {task['file_targets']}")

        # Validate structure
        checks = [
            ("3 tasks parsed", len(tasks) == 3),
            ("task_id assigned", all(t.get('task_id') for t in tasks)),
            ("categories present", all(t.get('category') for t in tasks)),
            ("complexity values", all(isinstance(t.get('complexity'), int) for t in tasks)),
            ("dependencies resolved", tasks[1]['dependencies'] == ['task-001']),
            ("status set to pending", all(t.get('status') == 'pending' for t in tasks))
        ]

        print("\nValidation:")
        all_passed = True
        for check_name, passed in checks:
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"  {status}: {check_name}")
            if not passed:
                all_passed = False

        if all_passed:
            print("\n✅ All parsing validation checks passed!")
        else:
            print("\n❌ Some parsing validation checks failed")

    except Exception as e:
        print(f"❌ FAIL: Parsing failed with error: {e}")

    # Clean up
    Path(config_path).unlink()


if __name__ == '__main__':
    print("=" * 60)
    print("  Claw Conductor v2.1 - AI Decomposition Tests")
    print("=" * 60)

    test_model_selection()
    test_prompt_generation()
    test_response_parsing()

    print("\n" + "=" * 60)
    print("  Tests Complete")
    print("=" * 60 + "\n")
