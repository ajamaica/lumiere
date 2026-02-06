#!/usr/bin/env python3
"""Manage small collaboration tasks and status notes."""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

TASK_FILE_DEFAULT = Path(__file__).resolve().parent.parent / "data" / "tasks.json"


def load_tasks(path: Path) -> List[Dict[str, Any]]:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("[]", encoding="utf-8")
    return json.loads(path.read_text(encoding="utf-8"))


def save_tasks(path: Path, tasks: List[Dict[str, Any]]) -> None:
    path.write_text(json.dumps(tasks, indent=2), encoding="utf-8")


def next_id(tasks: List[Dict[str, Any]]) -> int:
    if not tasks:
        return 1
    return max(task.get("id", 0) for task in tasks) + 1


def list_tasks(tasks: List[Dict[str, Any]], status: str | None, owner: str | None) -> None:
    filtered = tasks
    if status:
        filtered = [task for task in filtered if task.get("status") == status]
    if owner:
        filtered = [task for task in filtered if task.get("owner") == owner]
    if not filtered:
        print("No tasks match the filters.")
        return
    filtered.sort(key=lambda item: (item.get("status", ""), item.get("id", 0)))
    for task in filtered:
        print(format_task(task))


def format_task(task: Dict[str, Any]) -> str:
    note = task.get("note")
    parts = [f"[{task.get('id')}] {task.get('title')}"]
    parts.append(f"status={task.get('status', 'open')}")
    parts.append(f"priority={task.get('priority', 'medium')}")
    parts.append(f"owner={task.get('owner', 'team')}")
    if note:
        parts.append(f"note={note}")
    parts.append(f"created={task.get('created')}")
    return " | ".join(parts)


def add_task(
    tasks: List[Dict[str, Any]],
    title: str,
    owner: str,
    priority: str,
    note: str | None,
) -> Dict[str, Any]:
    task = {
        "id": next_id(tasks),
        "title": title,
        "owner": owner,
        "priority": priority,
        "status": "open",
        "created": datetime.now().isoformat(),
    }
    if note:
        task["note"] = note
    tasks.append(task)
    return task


def complete_task(tasks: List[Dict[str, Any]], task_id: int) -> bool:
    for task in tasks:
        if task.get("id") == task_id:
            task["status"] = "done"
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Collaboration helper task tracker.")
    parser.add_argument(
        "--data",
        type=Path,
        default=TASK_FILE_DEFAULT,
        help="Path to the tasks.json state file.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List collaboration tasks.")
    list_parser.add_argument("--status", choices=["open", "in-progress", "done"], help="Filter by status.")
    list_parser.add_argument("--owner", help="Filter by owner.")

    add_parser = subparsers.add_parser("add", help="Add a new task.")
    add_parser.add_argument("title", help="Task title or summary.")
    add_parser.add_argument("--owner", default="team", help="Owner handling the task.")
    add_parser.add_argument(
        "--priority",
        choices=["low", "medium", "high"],
        default="medium",
        help="Task priority.",
    )
    add_parser.add_argument("--note", help="Optional context or links.")

    complete_parser = subparsers.add_parser("complete", help="Mark a task done.")
    complete_parser.add_argument("id", type=int, help="Numeric ID of the task to complete.")

    args = parser.parse_args()
    tasks = load_tasks(args.data)

    if args.command == "list":
        list_tasks(tasks, args.status, args.owner)
    elif args.command == "add":
        task = add_task(tasks, args.title, args.owner, args.priority, args.note)
        save_tasks(args.data, tasks)
        print(f"Created task {task['id']}.")
    elif args.command == "complete":
        success = complete_task(tasks, args.id)
        if success:
            save_tasks(args.data, tasks)
            print(f"Task {args.id} marked done.")
        else:
            print(f"Task {args.id} not found.")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
