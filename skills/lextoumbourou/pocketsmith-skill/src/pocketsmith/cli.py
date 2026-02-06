"""CLI interface for PocketSmith API using argparse."""

import argparse
import functools
import json
import os
import sys
from typing import Any, Callable

from . import __version__
from .api import PocketSmithAPI
from .auth import is_authenticated
from .client import APIError


class WritesDisabledError(Exception):
    """Raised when write operations are attempted without POCKETSMITH_ALLOW_WRITES=true."""

    def __init__(self):
        super().__init__(
            "Write operations are disabled by default. "
            "Set POCKETSMITH_ALLOW_WRITES=true to enable create, update, and delete operations."
        )


def requires_write_permission(func: Callable) -> Callable:
    """Decorator that checks if write operations are allowed before executing."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if os.environ.get("POCKETSMITH_ALLOW_WRITES", "").lower() != "true":
            raise WritesDisabledError()
        return func(*args, **kwargs)
    return wrapper


def print_json(data: Any) -> None:
    """Print data as formatted JSON."""
    print(json.dumps(data, indent=2))


# -----------------------------------------------------------------------------
# Auth commands
# -----------------------------------------------------------------------------


def cmd_auth_status(args: argparse.Namespace) -> int:
    """Check authentication status."""
    authenticated = is_authenticated()
    if authenticated:
        with PocketSmithAPI() as api:
            try:
                user = api.get_me()
                print(json.dumps({
                    "authenticated": True,
                    "user_id": user.get("id"),
                    "login": user.get("login"),
                    "name": user.get("name"),
                }))
                return 0
            except APIError:
                print(json.dumps({"authenticated": False, "error": "Invalid developer key"}))
                return 1
    print(json.dumps({"authenticated": False}))
    return 1


# -----------------------------------------------------------------------------
# User commands
# -----------------------------------------------------------------------------


def cmd_me(args: argparse.Namespace) -> int:
    """Get current user info."""
    with PocketSmithAPI() as api:
        result = api.get_me()
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Transaction commands
# -----------------------------------------------------------------------------


def cmd_transactions_get(args: argparse.Namespace) -> int:
    """Get a single transaction."""
    with PocketSmithAPI() as api:
        result = api.get_transaction(args.id)
        print_json(result)
    return 0


@requires_write_permission
def cmd_transactions_update(args: argparse.Namespace) -> int:
    """Update a transaction."""
    labels = None
    if args.labels is not None:
        labels = [l.strip() for l in args.labels.split(",") if l.strip()]

    with PocketSmithAPI() as api:
        result = api.update_transaction(
            args.id,
            memo=args.memo,
            cheque_number=args.cheque_number,
            payee=args.payee,
            amount=args.amount,
            date=args.date,
            is_transfer=args.is_transfer,
            category_id=args.category_id,
            note=args.note,
            needs_review=args.needs_review,
            labels=labels,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_transactions_delete(args: argparse.Namespace) -> int:
    """Delete a transaction."""
    with PocketSmithAPI() as api:
        api.delete_transaction(args.id)
        print(json.dumps({"status": "success", "message": f"Transaction {args.id} deleted"}))
    return 0


def cmd_transactions_list_user(args: argparse.Namespace) -> int:
    """List transactions for a user."""
    with PocketSmithAPI() as api:
        result = api.list_user_transactions(
            args.user_id,
            start_date=args.start_date,
            end_date=args.end_date,
            updated_since=args.updated_since,
            uncategorised=args.uncategorised,
            type=args.type,
            needs_review=args.needs_review,
            search=args.search,
            page=args.page,
        )
        print_json(result)
    return 0


def cmd_transactions_list_account(args: argparse.Namespace) -> int:
    """List transactions for an account."""
    with PocketSmithAPI() as api:
        result = api.list_account_transactions(
            args.account_id,
            start_date=args.start_date,
            end_date=args.end_date,
            updated_since=args.updated_since,
            uncategorised=args.uncategorised,
            type=args.type,
            needs_review=args.needs_review,
            search=args.search,
            page=args.page,
        )
        print_json(result)
    return 0


def cmd_transactions_list_category(args: argparse.Namespace) -> int:
    """List transactions for categories."""
    with PocketSmithAPI() as api:
        result = api.list_category_transactions(
            args.category_ids,
            start_date=args.start_date,
            end_date=args.end_date,
            updated_since=args.updated_since,
            uncategorised=args.uncategorised,
            type=args.type,
            needs_review=args.needs_review,
            search=args.search,
            page=args.page,
        )
        print_json(result)
    return 0


def cmd_transactions_list_transaction_account(args: argparse.Namespace) -> int:
    """List transactions for a transaction account."""
    with PocketSmithAPI() as api:
        result = api.list_transaction_account_transactions(
            args.transaction_account_id,
            start_date=args.start_date,
            end_date=args.end_date,
            updated_since=args.updated_since,
            uncategorised=args.uncategorised,
            type=args.type,
            needs_review=args.needs_review,
            search=args.search,
            page=args.page,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_transactions_create(args: argparse.Namespace) -> int:
    """Create a transaction."""
    labels = None
    if args.labels is not None:
        labels = [l.strip() for l in args.labels.split(",") if l.strip()]

    with PocketSmithAPI() as api:
        result = api.create_transaction(
            args.transaction_account_id,
            payee=args.payee,
            amount=args.amount,
            date=args.date,
            is_transfer=args.is_transfer,
            labels=labels,
            category_id=args.category_id,
            note=args.note,
            memo=args.memo,
            cheque_number=args.cheque_number,
            needs_review=args.needs_review,
        )
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Category commands
# -----------------------------------------------------------------------------


def cmd_categories_get(args: argparse.Namespace) -> int:
    """Get a single category."""
    with PocketSmithAPI() as api:
        result = api.get_category(args.id)
        print_json(result)
    return 0


def cmd_categories_list(args: argparse.Namespace) -> int:
    """List categories for a user."""
    with PocketSmithAPI() as api:
        result = api.list_categories(args.user_id)
        print_json(result)
    return 0


@requires_write_permission
def cmd_categories_create(args: argparse.Namespace) -> int:
    """Create a category."""
    with PocketSmithAPI() as api:
        result = api.create_category(
            args.user_id,
            title=args.title,
            colour=args.colour,
            parent_id=args.parent_id,
            is_transfer=args.is_transfer,
            is_bill=args.is_bill,
            roll_up=args.roll_up,
            refund_behaviour=args.refund_behaviour,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_categories_update(args: argparse.Namespace) -> int:
    """Update a category."""
    # Handle parent_id: ... means not provided, None means top-level, int means set parent
    parent_id_value: int | None | type[...] = ...
    if args.no_parent:
        parent_id_value = None  # Make top-level
    elif args.parent_id is not None:
        parent_id_value = args.parent_id

    with PocketSmithAPI() as api:
        result = api.update_category(
            args.id,
            title=args.title,
            colour=args.colour,
            parent_id=parent_id_value,
            is_transfer=args.is_transfer,
            is_bill=args.is_bill,
            roll_up=args.roll_up,
            refund_behaviour=args.refund_behaviour,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_categories_delete(args: argparse.Namespace) -> int:
    """Delete a category."""
    with PocketSmithAPI() as api:
        api.delete_category(args.id)
        print(json.dumps({"status": "success", "message": f"Category {args.id} deleted"}))
    return 0


# -----------------------------------------------------------------------------
# Labels commands
# -----------------------------------------------------------------------------


def cmd_labels_list(args: argparse.Namespace) -> int:
    """List labels for a user."""
    with PocketSmithAPI() as api:
        result = api.list_labels(args.user_id)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Budget commands
# -----------------------------------------------------------------------------


def cmd_budget_list(args: argparse.Namespace) -> int:
    """List budget for a user."""
    with PocketSmithAPI() as api:
        result = api.list_budget(args.user_id, roll_up=args.roll_up)
        print_json(result)
    return 0


def cmd_budget_summary(args: argparse.Namespace) -> int:
    """Get budget summary for a user."""
    with PocketSmithAPI() as api:
        result = api.get_budget_summary(
            args.user_id,
            period=args.period,
            interval=args.interval,
            start_date=args.start_date,
            end_date=args.end_date,
        )
        print_json(result)
    return 0


def cmd_budget_trend(args: argparse.Namespace) -> int:
    """Get trend analysis for a user."""
    with PocketSmithAPI() as api:
        result = api.get_trend_analysis(
            args.user_id,
            period=args.period,
            interval=args.interval,
            start_date=args.start_date,
            end_date=args.end_date,
            categories=args.categories,
            scenarios=args.scenarios,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_budget_refresh(args: argparse.Namespace) -> int:
    """Refresh forecast cache for a user."""
    with PocketSmithAPI() as api:
        api.delete_forecast_cache(args.user_id)
        print(json.dumps({"status": "success", "message": f"Forecast cache refreshed for user {args.user_id}"}))
    return 0


# -----------------------------------------------------------------------------
# Parser
# -----------------------------------------------------------------------------


def add_transaction_filter_args(parser: argparse.ArgumentParser) -> None:
    """Add common transaction filter arguments to a parser."""
    parser.add_argument("--start-date", help="Start date filter (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="End date filter (YYYY-MM-DD)")
    parser.add_argument("--updated-since", help="Only transactions updated since this datetime")
    parser.add_argument("--uncategorised", action="store_true", help="Only uncategorised transactions")
    parser.add_argument("--type", choices=["debit", "credit"], help="Filter by transaction type")
    parser.add_argument("--needs-review", action="store_true", help="Only transactions needing review")
    parser.add_argument("--search", help="Search term for payee/memo")
    parser.add_argument("--page", type=int, help="Page number for pagination")


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog="pocketsmith",
        description="CLI for accessing PocketSmith financial data via the API",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # -------------------------------------------------------------------------
    # Auth commands
    # -------------------------------------------------------------------------
    auth_parser = subparsers.add_parser("auth", help="Authentication commands")
    auth_subparsers = auth_parser.add_subparsers(dest="auth_command")
    auth_subparsers.add_parser("status", help="Check authentication status")

    # -------------------------------------------------------------------------
    # Me command
    # -------------------------------------------------------------------------
    subparsers.add_parser("me", help="Get current user info")

    # -------------------------------------------------------------------------
    # Transaction commands
    # -------------------------------------------------------------------------
    tx_parser = subparsers.add_parser("transactions", help="Transaction commands")
    tx_subparsers = tx_parser.add_subparsers(dest="transactions_command")

    # Get single transaction
    tx_get = tx_subparsers.add_parser("get", help="Get a single transaction")
    tx_get.add_argument("id", type=int, help="Transaction ID")

    # Update transaction
    tx_update = tx_subparsers.add_parser("update", help="Update a transaction")
    tx_update.add_argument("id", type=int, help="Transaction ID")
    tx_update.add_argument("--memo", help="Bank memo/description")
    tx_update.add_argument("--cheque-number", help="Cheque number")
    tx_update.add_argument("--payee", help="Payee name")
    tx_update.add_argument("--amount", type=float, help="Signed amount (negative for debits)")
    tx_update.add_argument("--date", help="Transaction date (YYYY-MM-DD)")
    tx_update.add_argument("--is-transfer", type=lambda x: x.lower() == "true", help="Is transfer (true/false)")
    tx_update.add_argument("--category-id", type=int, help="Category ID")
    tx_update.add_argument("--note", help="User note")
    tx_update.add_argument("--needs-review", type=lambda x: x.lower() == "true", help="Needs review (true/false)")
    tx_update.add_argument("--labels", help="Comma-separated labels")

    # Delete transaction
    tx_delete = tx_subparsers.add_parser("delete", help="Delete a transaction")
    tx_delete.add_argument("id", type=int, help="Transaction ID")

    # List transactions by user
    tx_list_user = tx_subparsers.add_parser("list-by-user", help="List transactions for a user")
    tx_list_user.add_argument("user_id", type=int, help="User ID")
    add_transaction_filter_args(tx_list_user)

    # List transactions by account
    tx_list_account = tx_subparsers.add_parser("list-by-account", help="List transactions for an account")
    tx_list_account.add_argument("account_id", type=int, help="Account ID")
    add_transaction_filter_args(tx_list_account)

    # List transactions by category
    tx_list_category = tx_subparsers.add_parser("list-by-category", help="List transactions for categories")
    tx_list_category.add_argument("category_ids", help="Comma-separated category IDs")
    add_transaction_filter_args(tx_list_category)

    # List transactions by transaction account
    tx_list_ta = tx_subparsers.add_parser("list-by-transaction-account", help="List transactions for a transaction account")
    tx_list_ta.add_argument("transaction_account_id", type=int, help="Transaction account ID")
    add_transaction_filter_args(tx_list_ta)

    # Create transaction
    tx_create = tx_subparsers.add_parser("create", help="Create a transaction")
    tx_create.add_argument("transaction_account_id", type=int, help="Transaction account ID")
    tx_create.add_argument("--payee", required=True, help="Payee name")
    tx_create.add_argument("--amount", type=float, required=True, help="Signed amount (negative for debits)")
    tx_create.add_argument("--date", required=True, help="Transaction date (YYYY-MM-DD)")
    tx_create.add_argument("--is-transfer", type=lambda x: x.lower() == "true", help="Is transfer (true/false)")
    tx_create.add_argument("--labels", help="Comma-separated labels")
    tx_create.add_argument("--category-id", type=int, help="Category ID")
    tx_create.add_argument("--note", help="User note")
    tx_create.add_argument("--memo", help="Bank memo")
    tx_create.add_argument("--cheque-number", help="Cheque number")
    tx_create.add_argument("--needs-review", type=lambda x: x.lower() == "true", help="Needs review (true/false)")

    # -------------------------------------------------------------------------
    # Category commands
    # -------------------------------------------------------------------------
    cat_parser = subparsers.add_parser("categories", help="Category commands")
    cat_subparsers = cat_parser.add_subparsers(dest="categories_command")

    # Get single category
    cat_get = cat_subparsers.add_parser("get", help="Get a single category")
    cat_get.add_argument("id", type=int, help="Category ID")

    # List categories
    cat_list = cat_subparsers.add_parser("list", help="List categories for a user")
    cat_list.add_argument("user_id", type=int, help="User ID")

    # Create category
    cat_create = cat_subparsers.add_parser("create", help="Create a category")
    cat_create.add_argument("user_id", type=int, help="User ID")
    cat_create.add_argument("--title", required=True, help="Category title")
    cat_create.add_argument("--colour", help="CSS hex colour (e.g., '#ff0000')")
    cat_create.add_argument("--parent-id", type=int, help="Parent category ID")
    cat_create.add_argument("--is-transfer", type=lambda x: x.lower() == "true", help="Is transfer category (true/false)")
    cat_create.add_argument("--is-bill", type=lambda x: x.lower() == "true", help="Is bill category (true/false)")
    cat_create.add_argument("--roll-up", type=lambda x: x.lower() == "true", help="Roll up to parent (true/false)")
    cat_create.add_argument("--refund-behaviour", choices=["debit_only", "credit_only"], help="Refund behaviour")

    # Update category
    cat_update = cat_subparsers.add_parser("update", help="Update a category")
    cat_update.add_argument("id", type=int, help="Category ID")
    cat_update.add_argument("--title", help="Category title")
    cat_update.add_argument("--colour", help="CSS hex colour (e.g., '#ff0000')")
    cat_update.add_argument("--parent-id", type=int, help="Parent category ID")
    cat_update.add_argument("--no-parent", action="store_true", help="Make this a top-level category")
    cat_update.add_argument("--is-transfer", type=lambda x: x.lower() == "true", help="Is transfer category (true/false)")
    cat_update.add_argument("--is-bill", type=lambda x: x.lower() == "true", help="Is bill category (true/false)")
    cat_update.add_argument("--roll-up", type=lambda x: x.lower() == "true", help="Roll up to parent (true/false)")
    cat_update.add_argument("--refund-behaviour", choices=["debit_only", "credit_only"], help="Refund behaviour")

    # Delete category
    cat_delete = cat_subparsers.add_parser("delete", help="Delete a category")
    cat_delete.add_argument("id", type=int, help="Category ID")

    # -------------------------------------------------------------------------
    # Labels commands
    # -------------------------------------------------------------------------
    labels_parser = subparsers.add_parser("labels", help="Labels commands")
    labels_subparsers = labels_parser.add_subparsers(dest="labels_command")

    # List labels
    labels_list = labels_subparsers.add_parser("list", help="List labels for a user")
    labels_list.add_argument("user_id", type=int, help="User ID")

    # -------------------------------------------------------------------------
    # Budget commands
    # -------------------------------------------------------------------------
    budget_parser = subparsers.add_parser("budget", help="Budget commands")
    budget_subparsers = budget_parser.add_subparsers(dest="budget_command")

    # List budget
    budget_list = budget_subparsers.add_parser("list", help="List budget for a user")
    budget_list.add_argument("user_id", type=int, help="User ID")
    budget_list.add_argument("--roll-up", type=lambda x: x.lower() == "true", help="Roll up parent categories (true/false)")

    # Budget summary
    budget_summary = budget_subparsers.add_parser("summary", help="Get budget summary for a user")
    budget_summary.add_argument("user_id", type=int, help="User ID")
    budget_summary.add_argument("--period", required=True, choices=["weeks", "months", "years", "event"], help="Analysis interval")
    budget_summary.add_argument("--interval", required=True, type=int, help="Period multiplier")
    budget_summary.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    budget_summary.add_argument("--end-date", required=True, help="End date (YYYY-MM-DD)")

    # Trend analysis
    budget_trend = budget_subparsers.add_parser("trend", help="Get trend analysis for a user")
    budget_trend.add_argument("user_id", type=int, help="User ID")
    budget_trend.add_argument("--period", required=True, choices=["weeks", "months", "years", "event"], help="Analysis interval")
    budget_trend.add_argument("--interval", required=True, type=int, help="Period multiplier")
    budget_trend.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    budget_trend.add_argument("--end-date", required=True, help="End date (YYYY-MM-DD)")
    budget_trend.add_argument("--categories", required=True, help="Comma-separated category IDs")
    budget_trend.add_argument("--scenarios", required=True, help="Comma-separated scenario IDs")

    # Refresh forecast cache
    budget_refresh = budget_subparsers.add_parser("refresh", help="Refresh forecast cache for a user")
    budget_refresh.add_argument("user_id", type=int, help="User ID")

    return parser


def main() -> int:
    """Main entry point for the CLI."""
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    try:
        # Auth commands
        if args.command == "auth":
            if args.auth_command == "status" or args.auth_command is None:
                return cmd_auth_status(args)

        # Me command
        elif args.command == "me":
            return cmd_me(args)

        # Transaction commands
        elif args.command == "transactions":
            if args.transactions_command == "get":
                return cmd_transactions_get(args)
            elif args.transactions_command == "update":
                return cmd_transactions_update(args)
            elif args.transactions_command == "delete":
                return cmd_transactions_delete(args)
            elif args.transactions_command == "list-by-user":
                return cmd_transactions_list_user(args)
            elif args.transactions_command == "list-by-account":
                return cmd_transactions_list_account(args)
            elif args.transactions_command == "list-by-category":
                return cmd_transactions_list_category(args)
            elif args.transactions_command == "list-by-transaction-account":
                return cmd_transactions_list_transaction_account(args)
            elif args.transactions_command == "create":
                return cmd_transactions_create(args)
            else:
                parser.parse_args(["transactions", "--help"])
                return 0

        # Category commands
        elif args.command == "categories":
            if args.categories_command == "get":
                return cmd_categories_get(args)
            elif args.categories_command == "list":
                return cmd_categories_list(args)
            elif args.categories_command == "create":
                return cmd_categories_create(args)
            elif args.categories_command == "update":
                return cmd_categories_update(args)
            elif args.categories_command == "delete":
                return cmd_categories_delete(args)
            else:
                parser.parse_args(["categories", "--help"])
                return 0

        # Labels commands
        elif args.command == "labels":
            if args.labels_command == "list" or args.labels_command is None:
                return cmd_labels_list(args)
            else:
                parser.parse_args(["labels", "--help"])
                return 0

        # Budget commands
        elif args.command == "budget":
            if args.budget_command == "list":
                return cmd_budget_list(args)
            elif args.budget_command == "summary":
                return cmd_budget_summary(args)
            elif args.budget_command == "trend":
                return cmd_budget_trend(args)
            elif args.budget_command == "refresh":
                return cmd_budget_refresh(args)
            else:
                parser.parse_args(["budget", "--help"])
                return 0

        parser.print_help()
        return 0

    except WritesDisabledError as e:
        print(json.dumps({"error": str(e), "hint": "export POCKETSMITH_ALLOW_WRITES=true"}), file=sys.stderr)
        return 1
    except APIError as e:
        print(json.dumps({"error": e.message, "status_code": e.status_code}), file=sys.stderr)
        return 1
    except ValueError as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
