#!/usr/bin/env python3
"""
Proactive Task Manager
Enables AI agents to manage goals and work autonomously on tasks.
"""

import json
import argparse
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
import uuid

# Data file location
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
DATA_FILE = DATA_DIR / "tasks.json"

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)

def load_data() -> Dict[str, Any]:
    """Load tasks data from JSON file."""
    if not DATA_FILE.exists():
        return {"goals": [], "tasks": []}
    
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data: Dict[str, Any]) -> None:
    """Save tasks data to JSON file."""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def generate_id(prefix: str) -> str:
    """Generate a unique ID."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def find_goal_by_title(data: Dict[str, Any], title: str) -> Optional[Dict]:
    """Find a goal by title (case-insensitive partial match)."""
    title_lower = title.lower()
    for goal in data["goals"]:
        if title_lower in goal["title"].lower():
            return goal
    return None

def find_task_by_id(data: Dict[str, Any], task_id: str) -> Optional[Dict]:
    """Find a task by ID."""
    for task in data["tasks"]:
        if task["id"] == task_id:
            return task
    return None

def get_task_dependencies_met(data: Dict[str, Any], task: Dict) -> bool:
    """Check if all task dependencies are completed."""
    if "depends_on" not in task or not task["depends_on"]:
        return True
    
    for dep_id in task["depends_on"]:
        dep_task = find_task_by_id(data, dep_id)
        if not dep_task or dep_task["status"] != "completed":
            return False
    
    return True

def add_goal(args) -> None:
    """Add a new goal."""
    data = load_data()
    
    goal = {
        "id": generate_id("goal"),
        "title": args.title,
        "priority": args.priority,
        "context": args.context or "",
        "created_at": datetime.now(timezone.utc).isoformat() + "Z",
        "status": args.status
    }
    
    data["goals"].append(goal)
    save_data(data)
    
    print(json.dumps({"success": True, "goal": goal}, indent=2))

def add_task(args) -> None:
    """Add a task to a goal."""
    data = load_data()
    
    # Find the goal
    goal = find_goal_by_title(data, args.goal_title)
    if not goal:
        print(json.dumps({"success": False, "error": f"Goal not found: {args.goal_title}"}), file=sys.stderr)
        sys.exit(1)
    
    task = {
        "id": generate_id("task"),
        "goal_id": goal["id"],
        "title": args.task_title,
        "priority": args.priority or goal["priority"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat() + "Z",
        "notes": ""
    }
    
    if args.depends_on:
        task["depends_on"] = args.depends_on.split(",")
    
    if args.estimate:
        task["estimate_minutes"] = args.estimate
    
    data["tasks"].append(task)
    save_data(data)
    
    print(json.dumps({"success": True, "task": task}, indent=2))

def next_task(args) -> None:
    """Get the next task to work on."""
    data = load_data()
    
    # Filter pending tasks
    candidates = [
        task for task in data["tasks"]
        if task["status"] == "pending" and get_task_dependencies_met(data, task)
    ]
    
    # Apply goal filter if specified
    if args.goal:
        candidates = [t for t in candidates if t["goal_id"] == args.goal]
    
    # Apply time estimate filter if specified
    if args.max_estimate:
        candidates = [
            t for t in candidates
            if "estimate_minutes" in t and t["estimate_minutes"] <= args.max_estimate
        ]
    
    if not candidates:
        print(json.dumps({"success": True, "task": None, "message": "No tasks available"}))
        return
    
    # Sort by priority (high > medium > low)
    priority_order = {"high": 3, "medium": 2, "low": 1}
    candidates.sort(key=lambda t: priority_order.get(t["priority"], 0), reverse=True)
    
    next_task = candidates[0]
    
    # Get goal info
    goal = next((g for g in data["goals"] if g["id"] == next_task["goal_id"]), None)
    
    result = {
        "success": True,
        "task": next_task,
        "goal": goal
    }
    
    print(json.dumps(result, indent=2))

def complete_task(args) -> None:
    """Mark a task as completed."""
    data = load_data()
    
    task = find_task_by_id(data, args.task_id)
    if not task:
        print(json.dumps({"success": False, "error": f"Task not found: {args.task_id}"}), file=sys.stderr)
        sys.exit(1)
    
    task["status"] = "completed"
    task["completed_at"] = datetime.now(timezone.utc).isoformat() + "Z"
    
    if args.notes:
        task["notes"] = args.notes
    
    save_data(data)
    
    print(json.dumps({"success": True, "task": task}, indent=2))

def update_task(args) -> None:
    """Update a task."""
    data = load_data()
    
    task = find_task_by_id(data, args.task_id)
    if not task:
        print(json.dumps({"success": False, "error": f"Task not found: {args.task_id}"}), file=sys.stderr)
        sys.exit(1)
    
    if args.status:
        task["status"] = args.status
    
    if args.priority:
        task["priority"] = args.priority
    
    if args.notes:
        if task.get("notes"):
            task["notes"] += "\n" + args.notes
        else:
            task["notes"] = args.notes
    
    task["updated_at"] = datetime.now(timezone.utc).isoformat() + "Z"
    
    save_data(data)
    
    print(json.dumps({"success": True, "task": task}, indent=2))

def list_goals(args) -> None:
    """List all goals."""
    data = load_data()
    
    goals = data["goals"]
    
    if args.status:
        goals = [g for g in goals if g["status"] == args.status]
    
    if args.priority:
        goals = [g for g in goals if g["priority"] == args.priority]
    
    print(json.dumps({"success": True, "goals": goals}, indent=2))

def list_tasks(args) -> None:
    """List tasks for a goal."""
    data = load_data()
    
    goal = find_goal_by_title(data, args.goal_title)
    if not goal:
        print(json.dumps({"success": False, "error": f"Goal not found: {args.goal_title}"}), file=sys.stderr)
        sys.exit(1)
    
    tasks = [t for t in data["tasks"] if t["goal_id"] == goal["id"]]
    
    if args.status:
        tasks = [t for t in tasks if t["status"] == args.status]
    
    if args.priority:
        tasks = [t for t in tasks if t["priority"] == args.priority]
    
    print(json.dumps({"success": True, "goal": goal, "tasks": tasks}, indent=2))

def status(args) -> None:
    """Show overall status."""
    data = load_data()
    
    active_goals = [g for g in data["goals"] if g["status"] == "active"]
    
    tasks_by_status = {}
    for status_name in ["pending", "in_progress", "blocked", "needs_input", "completed"]:
        tasks_by_status[status_name] = len([t for t in data["tasks"] if t["status"] == status_name])
    
    # Recent completions (last 5)
    completed_tasks = [t for t in data["tasks"] if t["status"] == "completed"]
    completed_tasks.sort(key=lambda t: t.get("completed_at", ""), reverse=True)
    recent_completions = completed_tasks[:5]
    
    result = {
        "success": True,
        "active_goals_count": len(active_goals),
        "tasks_by_status": tasks_by_status,
        "recent_completions": recent_completions
    }
    
    print(json.dumps(result, indent=2))

def main():
    parser = argparse.ArgumentParser(description="Proactive Task Manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # add-goal
    parser_add_goal = subparsers.add_parser("add-goal", help="Add a new goal")
    parser_add_goal.add_argument("title", help="Goal title")
    parser_add_goal.add_argument("--priority", choices=["low", "medium", "high"], default="medium")
    parser_add_goal.add_argument("--context", help="Goal context/background")
    parser_add_goal.add_argument("--status", choices=["active", "paused", "completed"], default="active")
    
    # add-task
    parser_add_task = subparsers.add_parser("add-task", help="Add a task to a goal")
    parser_add_task.add_argument("goal_title", help="Goal title (partial match)")
    parser_add_task.add_argument("task_title", help="Task title")
    parser_add_task.add_argument("--priority", choices=["low", "medium", "high"])
    parser_add_task.add_argument("--depends-on", help="Comma-separated task IDs this depends on")
    parser_add_task.add_argument("--estimate", type=int, help="Estimated minutes to complete")
    
    # next-task
    parser_next_task = subparsers.add_parser("next-task", help="Get next task to work on")
    parser_next_task.add_argument("--goal", help="Goal ID filter")
    parser_next_task.add_argument("--max-estimate", type=int, help="Max time estimate filter")
    
    # complete-task
    parser_complete_task = subparsers.add_parser("complete-task", help="Mark task as completed")
    parser_complete_task.add_argument("task_id", help="Task ID")
    parser_complete_task.add_argument("--notes", help="Completion notes")
    
    # update-task
    parser_update_task = subparsers.add_parser("update-task", help="Update a task")
    parser_update_task.add_argument("task_id", help="Task ID")
    parser_update_task.add_argument("--status", choices=["pending", "in_progress", "blocked", "needs_input", "completed", "cancelled"])
    parser_update_task.add_argument("--priority", choices=["low", "medium", "high"])
    parser_update_task.add_argument("--notes", help="Add notes")
    
    # list-goals
    parser_list_goals = subparsers.add_parser("list-goals", help="List goals")
    parser_list_goals.add_argument("--status", choices=["active", "paused", "completed"])
    parser_list_goals.add_argument("--priority", choices=["low", "medium", "high"])
    
    # list-tasks
    parser_list_tasks = subparsers.add_parser("list-tasks", help="List tasks for a goal")
    parser_list_tasks.add_argument("goal_title", help="Goal title (partial match)")
    parser_list_tasks.add_argument("--status", choices=["pending", "in_progress", "blocked", "needs_input", "completed", "cancelled"])
    parser_list_tasks.add_argument("--priority", choices=["low", "medium", "high"])
    
    # status
    parser_status = subparsers.add_parser("status", help="Show overall status")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Route to command handlers
    commands = {
        "add-goal": add_goal,
        "add-task": add_task,
        "next-task": next_task,
        "complete-task": complete_task,
        "update-task": update_task,
        "list-goals": list_goals,
        "list-tasks": list_tasks,
        "status": status
    }
    
    commands[args.command](args)

if __name__ == "__main__":
    main()
