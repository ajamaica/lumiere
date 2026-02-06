#!/usr/bin/env python3
import os
import json
import argparse
import urllib.parse
import urllib.request

BASE_URL = "https://api.weeek.net/public/v1"


def request(method, path, params=None, body=None):
    token = os.environ.get("WEEEK_TOKEN")
    if not token:
        raise SystemExit("WEEEK_TOKEN не задан в окружении")

    url = BASE_URL + path
    if params:
        query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None}, doseq=True)
        url = url + ("?" + query if query else "")

    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read().decode("utf-8")
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw


def cmd_list_tasks(args):
    params = {
        "day": args.day,
        "userId": args.user_id,
        "projectId": args.project_id,
        "completed": args.completed,
        "boardId": args.board_id,
        "boardColumnId": args.board_column_id,
        "type": args.type,
        "priority": args.priority,
        "tags": args.tags,
        "search": args.search,
        "perPage": args.per_page,
        "offset": args.offset,
        "sortBy": args.sort_by,
        "startDate": args.start_date,
        "endDate": args.end_date,
        "all": args.all,
    }
    print(json.dumps(request("GET", "/tm/tasks", params=params), ensure_ascii=False, indent=2))


def cmd_create_task(args):
    locations = None
    if args.locations_json:
        locations = json.loads(args.locations_json)
    elif args.board_id or args.board_column_id or args.project_id:
        loc = {}
        if args.project_id is not None:
            loc["projectId"] = args.project_id
        if args.board_id is not None:
            loc["boardId"] = args.board_id
        if args.board_column_id is not None:
            loc["boardColumnId"] = args.board_column_id
        locations = [loc]
    elif args.no_locations:
        locations = []

    default_user_id = os.environ.get("WEEEK_USER_ID")
    user_id = args.user_id or default_user_id
    assignees = None
    if user_id:
        assignees = [user_id]

    body = {
        "locations": locations,
        "title": args.title,
        "description": args.description,
        "day": args.day,
        "parentId": args.parent_id,
        "userId": user_id,
        "assignees": assignees,
        "type": args.type,
        "priority": args.priority,
        "customFields": json.loads(args.custom_fields_json) if args.custom_fields_json else None,
    }
    body = {k: v for k, v in body.items() if v is not None}
    print(json.dumps(request("POST", "/tm/tasks", body=body), ensure_ascii=False, indent=2))


def cmd_update_task(args):
    body = {
        "title": args.title,
        "priority": args.priority,
        "type": args.type,
        "startDate": args.start_date,
        "dueDate": args.due_date,
        "startDateTime": args.start_datetime,
        "dueDateTime": args.due_datetime,
        "duration": args.duration,
        "tags": args.tags,
        "customFields": json.loads(args.custom_fields_json) if args.custom_fields_json else None,
    }
    body = {k: v for k, v in body.items() if v is not None}
    print(json.dumps(request("PUT", f"/tm/tasks/{args.id}", body=body), ensure_ascii=False, indent=2))


def cmd_complete(args):
    print(json.dumps(request("POST", f"/tm/tasks/{args.id}/complete"), ensure_ascii=False, indent=2))


def cmd_uncomplete(args):
    print(json.dumps(request("POST", f"/tm/tasks/{args.id}/uncomplete"), ensure_ascii=False, indent=2))


def cmd_move_board(args):
    body = {"boardId": args.board_id}
    print(json.dumps(request("POST", f"/tm/tasks/{args.id}/board", body=body), ensure_ascii=False, indent=2))


def cmd_move_board_column(args):
    body = {"boardColumnId": args.board_column_id}
    print(json.dumps(request("POST", f"/tm/tasks/{args.id}/board-column", body=body), ensure_ascii=False, indent=2))


def cmd_list_projects(args):
    print(json.dumps(request("GET", "/tm/projects"), ensure_ascii=False, indent=2))


def cmd_list_boards(args):
    params = {"projectId": args.project_id}
    print(json.dumps(request("GET", "/tm/boards", params=params), ensure_ascii=False, indent=2))


def cmd_list_board_columns(args):
    params = {"boardId": args.board_id}
    print(json.dumps(request("GET", "/tm/board-columns", params=params), ensure_ascii=False, indent=2))


parser = argparse.ArgumentParser(description="WEEEK Public API (tasks/boards/columns)")
sub = parser.add_subparsers(dest="cmd", required=True)

p = sub.add_parser("list-tasks")
p.add_argument("--day")
p.add_argument("--user-id")
p.add_argument("--project-id", type=int)
p.add_argument("--completed")
p.add_argument("--board-id", type=int)
p.add_argument("--board-column-id", type=int)
p.add_argument("--type")
p.add_argument("--priority", type=int)
p.add_argument("--tags", nargs="*")
p.add_argument("--search")
p.add_argument("--per-page", type=int)
p.add_argument("--offset", type=int)
p.add_argument("--sort-by")
p.add_argument("--start-date")
p.add_argument("--end-date")
p.add_argument("--all")
p.set_defaults(func=cmd_list_tasks)

p = sub.add_parser("create-task")
p.add_argument("--title", required=True)
p.add_argument("--description")
p.add_argument("--day")
p.add_argument("--parent-id", type=int)
p.add_argument("--user-id")
p.add_argument("--type")
p.add_argument("--priority", type=int)
p.add_argument("--custom-fields-json")
p.add_argument("--locations-json")
p.add_argument("--no-locations", action="store_true")
p.add_argument("--project-id", type=int)
p.add_argument("--board-id", type=int)
p.add_argument("--board-column-id", type=int)
p.set_defaults(func=cmd_create_task)

p = sub.add_parser("update-task")
p.add_argument("id", type=int)
p.add_argument("--title")
p.add_argument("--priority", type=int)
p.add_argument("--type")
p.add_argument("--start-date")
p.add_argument("--due-date")
p.add_argument("--start-datetime")
p.add_argument("--due-datetime")
p.add_argument("--duration", type=int)
p.add_argument("--tags", nargs="*")
p.add_argument("--custom-fields-json")
p.set_defaults(func=cmd_update_task)

p = sub.add_parser("complete-task")
p.add_argument("id", type=int)
p.set_defaults(func=cmd_complete)

p = sub.add_parser("uncomplete-task")
p.add_argument("id", type=int)
p.set_defaults(func=cmd_uncomplete)

p = sub.add_parser("move-board")
p.add_argument("id", type=int)
p.add_argument("--board-id", type=int, required=True)
p.set_defaults(func=cmd_move_board)

p = sub.add_parser("move-board-column")
p.add_argument("id", type=int)
p.add_argument("--board-column-id", type=int, required=True)
p.set_defaults(func=cmd_move_board_column)

p = sub.add_parser("list-projects")
p.set_defaults(func=cmd_list_projects)

p = sub.add_parser("list-boards")
p.add_argument("--project-id", type=int)
p.set_defaults(func=cmd_list_boards)

p = sub.add_parser("list-board-columns")
p.add_argument("--board-id", type=int, required=True)
p.set_defaults(func=cmd_list_board_columns)

args = parser.parse_args()
args.func(args)
