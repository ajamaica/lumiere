"""CLI interface for Sharesight API using argparse."""

import argparse
import functools
import json
import os
import sys
from typing import Any, Callable

from . import __version__
from .api import SharesightAPI
from .auth import get_token, is_authenticated, clear_token
from .client import APIError


class WritesDisabledError(Exception):
    """Raised when write operations are attempted without SHARESIGHT_ALLOW_WRITES=true."""

    def __init__(self):
        super().__init__(
            "Write operations are disabled by default. "
            "Set SHARESIGHT_ALLOW_WRITES=true to enable create, update, and delete operations."
        )


def requires_write_permission(func: Callable) -> Callable:
    """Decorator that checks if write operations are allowed before executing."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if os.environ.get("SHARESIGHT_ALLOW_WRITES", "").lower() != "true":
            raise WritesDisabledError()
        return func(*args, **kwargs)
    return wrapper


def print_json(data: Any) -> None:
    """Print data as formatted JSON."""
    print(json.dumps(data, indent=2))


# -----------------------------------------------------------------------------
# Auth commands
# -----------------------------------------------------------------------------


def cmd_auth(args: argparse.Namespace) -> int:
    """Authenticate with Sharesight API."""
    try:
        get_token(force_refresh=True)
        print(json.dumps({"status": "authenticated", "message": "Successfully authenticated with Sharesight API"}))
        return 0
    except ValueError as e:
        print(json.dumps({"status": "error", "message": str(e)}), file=sys.stderr)
        return 1


def cmd_auth_status(args: argparse.Namespace) -> int:
    """Check authentication status."""
    authenticated = is_authenticated()
    print(json.dumps({"authenticated": authenticated}))
    return 0 if authenticated else 1


def cmd_auth_clear(args: argparse.Namespace) -> int:
    """Clear saved authentication token."""
    clear_token()
    print(json.dumps({"status": "success", "message": "Token cleared"}))
    return 0


# -----------------------------------------------------------------------------
# Portfolio commands
# -----------------------------------------------------------------------------


def cmd_portfolios_list(args: argparse.Namespace) -> int:
    """List all portfolios."""
    with SharesightAPI() as api:
        result = api.list_portfolios(consolidated=args.consolidated)
        print_json(result)
    return 0


def cmd_portfolios_get(args: argparse.Namespace) -> int:
    """Get a specific portfolio."""
    with SharesightAPI() as api:
        result = api.get_portfolio(args.id, consolidated=args.consolidated)
        print_json(result)
    return 0


def cmd_portfolios_holdings(args: argparse.Namespace) -> int:
    """List holdings for a portfolio."""
    with SharesightAPI() as api:
        result = api.list_portfolio_holdings(args.id, consolidated=args.consolidated)
        print_json(result)
    return 0


def cmd_portfolios_performance(args: argparse.Namespace) -> int:
    """Get performance report for a portfolio."""
    with SharesightAPI() as api:
        result = api.get_portfolio_performance(
            args.id,
            start_date=args.start_date,
            end_date=args.end_date,
            consolidated=args.consolidated,
            include_sales=args.include_sales,
            grouping=args.grouping,
        )
        print_json(result)
    return 0


def cmd_portfolios_chart(args: argparse.Namespace) -> int:
    """Get performance index chart data."""
    with SharesightAPI() as api:
        result = api.get_portfolio_performance_chart(
            args.id,
            start_date=args.start_date,
            end_date=args.end_date,
            consolidated=args.consolidated,
            grouping=args.grouping,
            benchmark_code=args.benchmark,
        )
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Holdings commands
# -----------------------------------------------------------------------------


def cmd_holdings_list(args: argparse.Namespace) -> int:
    """List all holdings."""
    with SharesightAPI() as api:
        result = api.list_holdings()
        print_json(result)
    return 0


def cmd_holdings_get(args: argparse.Namespace) -> int:
    """Get a specific holding."""
    with SharesightAPI() as api:
        result = api.get_holding(
            args.id,
            average_purchase_price=args.avg_price,
            cost_base=args.cost_base,
            values_over_time=args.values_over_time,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_holdings_update(args: argparse.Namespace) -> int:
    """Update a holding's DRP settings."""
    with SharesightAPI() as api:
        result = api.update_holding(
            args.id,
            enable_drp=args.enable_drp,
            drp_mode_setting=args.drp_mode,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_holdings_delete(args: argparse.Namespace) -> int:
    """Delete a holding."""
    with SharesightAPI() as api:
        result = api.delete_holding(args.id)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Custom Investments commands
# -----------------------------------------------------------------------------


def cmd_investments_list(args: argparse.Namespace) -> int:
    """List custom investments."""
    with SharesightAPI() as api:
        result = api.list_custom_investments(portfolio_id=args.portfolio_id)
        print_json(result)
    return 0


def cmd_investments_get(args: argparse.Namespace) -> int:
    """Get a custom investment."""
    with SharesightAPI() as api:
        result = api.get_custom_investment(args.id)
        print_json(result)
    return 0


@requires_write_permission
def cmd_investments_create(args: argparse.Namespace) -> int:
    """Create a custom investment."""
    with SharesightAPI() as api:
        result = api.create_custom_investment(
            code=args.code,
            name=args.name,
            country_code=args.country,
            investment_type=args.type,
            portfolio_id=args.portfolio_id,
            face_value=args.face_value,
            interest_rate=args.interest_rate,
            income_type=args.income_type,
            payment_frequency=args.payment_frequency,
            first_payment_date=args.first_payment_date,
            maturity_date=args.maturity_date,
            auto_calc_income=args.auto_calc_income,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_investments_update(args: argparse.Namespace) -> int:
    """Update a custom investment."""
    with SharesightAPI() as api:
        result = api.update_custom_investment(
            args.id,
            code=args.code,
            name=args.name,
            portfolio_id=args.portfolio_id,
            face_value=args.face_value,
            interest_rate=args.interest_rate,
            income_type=args.income_type,
            payment_frequency=args.payment_frequency,
            first_payment_date=args.first_payment_date,
            maturity_date=args.maturity_date,
            auto_calc_income=args.auto_calc_income,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_investments_delete(args: argparse.Namespace) -> int:
    """Delete a custom investment."""
    with SharesightAPI() as api:
        result = api.delete_custom_investment(args.id)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Prices commands
# -----------------------------------------------------------------------------


def cmd_prices_list(args: argparse.Namespace) -> int:
    """List prices for a custom investment."""
    with SharesightAPI() as api:
        result = api.list_prices(
            args.instrument_id,
            start_date=args.start_date,
            end_date=args.end_date,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_prices_create(args: argparse.Namespace) -> int:
    """Create a price entry."""
    with SharesightAPI() as api:
        result = api.create_price(
            args.instrument_id,
            price=args.price,
            date=args.date,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_prices_update(args: argparse.Namespace) -> int:
    """Update a price entry."""
    with SharesightAPI() as api:
        result = api.update_price(
            args.id,
            price=args.price,
            date=args.date,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_prices_delete(args: argparse.Namespace) -> int:
    """Delete a price entry."""
    with SharesightAPI() as api:
        result = api.delete_price(args.id)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Coupon Rates commands
# -----------------------------------------------------------------------------


def cmd_coupon_rates_list(args: argparse.Namespace) -> int:
    """List coupon rates for a custom investment."""
    with SharesightAPI() as api:
        result = api.list_coupon_rates(
            args.instrument_id,
            start_date=args.start_date,
            end_date=args.end_date,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_coupon_rates_create(args: argparse.Namespace) -> int:
    """Create a coupon rate."""
    with SharesightAPI() as api:
        result = api.create_coupon_rate(
            args.instrument_id,
            interest_rate=args.rate,
            date=args.date,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_coupon_rates_update(args: argparse.Namespace) -> int:
    """Update a coupon rate."""
    with SharesightAPI() as api:
        result = api.update_coupon_rate(
            args.id,
            interest_rate=args.rate,
            date=args.date,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_coupon_rates_delete(args: argparse.Namespace) -> int:
    """Delete a coupon rate."""
    with SharesightAPI() as api:
        result = api.delete_coupon_rate(args.id)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Trades commands
# -----------------------------------------------------------------------------


@requires_write_permission
def cmd_trades_create(args: argparse.Namespace) -> int:
    """Create a trade."""
    with SharesightAPI() as api:
        result = api.create_trade(
            portfolio_id=args.portfolio_id,
            symbol=args.symbol,
            market=args.market,
            transaction_date=args.date,
            quantity=args.quantity,
            price=args.price,
            transaction_type=args.type,
            brokerage=args.brokerage,
            comments=args.comments,
        )
        print_json(result)
    return 0


def cmd_trades_get(args: argparse.Namespace) -> int:
    """Get a trade."""
    with SharesightAPI() as api:
        result = api.get_trade(args.id)
        print_json(result)
    return 0


@requires_write_permission
def cmd_trades_update(args: argparse.Namespace) -> int:
    """Update a trade."""
    with SharesightAPI() as api:
        result = api.update_trade(
            args.id,
            trade_date=args.date,
            quantity=args.quantity,
            price=args.price,
            brokerage=args.brokerage,
            comments=args.comments,
        )
        print_json(result)
    return 0


@requires_write_permission
def cmd_trades_delete(args: argparse.Namespace) -> int:
    """Delete a trade."""
    with SharesightAPI() as api:
        result = api.delete_trade(args.id)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Countries command
# -----------------------------------------------------------------------------


def cmd_countries(args: argparse.Namespace) -> int:
    """List country definitions."""
    with SharesightAPI() as api:
        supported = None
        if args.supported:
            supported = True
        elif args.unsupported:
            supported = False
        result = api.list_countries(supported=supported)
        print_json(result)
    return 0


# -----------------------------------------------------------------------------
# Parser
# -----------------------------------------------------------------------------


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog="sharesight",
        description="CLI for accessing Sharesight portfolio data via the API",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # -------------------------------------------------------------------------
    # Auth commands
    # -------------------------------------------------------------------------
    auth_parser = subparsers.add_parser("auth", help="Authentication commands")
    auth_subparsers = auth_parser.add_subparsers(dest="auth_command")

    auth_subparsers.add_parser("login", help="Authenticate with Sharesight API")
    auth_subparsers.add_parser("status", help="Check authentication status")
    auth_subparsers.add_parser("clear", help="Clear saved authentication token")

    # -------------------------------------------------------------------------
    # Portfolios commands
    # -------------------------------------------------------------------------
    portfolios_parser = subparsers.add_parser("portfolios", help="Portfolio commands")
    portfolios_subparsers = portfolios_parser.add_subparsers(dest="portfolios_command")

    p_list = portfolios_subparsers.add_parser("list", help="List all portfolios")
    p_list.add_argument("--consolidated", action="store_true", help="Show consolidated portfolio views")

    p_get = portfolios_subparsers.add_parser("get", help="Get a specific portfolio")
    p_get.add_argument("id", type=int, help="Portfolio ID")
    p_get.add_argument("--consolidated", action="store_true", help="Portfolio is consolidated")

    p_holdings = portfolios_subparsers.add_parser("holdings", help="List holdings for a portfolio")
    p_holdings.add_argument("id", type=int, help="Portfolio ID")
    p_holdings.add_argument("--consolidated", action="store_true", help="Consolidated view")

    p_perf = portfolios_subparsers.add_parser("performance", help="Get performance report")
    p_perf.add_argument("id", type=int, help="Portfolio ID")
    p_perf.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    p_perf.add_argument("--end-date", help="End date (YYYY-MM-DD)")
    p_perf.add_argument("--consolidated", action="store_true", help="Consolidated view")
    p_perf.add_argument("--include-sales", action="store_true", help="Include sales")
    p_perf.add_argument(
        "--grouping",
        choices=["country", "currency", "market", "portfolio", "sector_classification", "industry_classification", "investment_type", "ungrouped"],
        help="Group holdings by attribute",
    )

    p_chart = portfolios_subparsers.add_parser("chart", help="Get performance index chart data")
    p_chart.add_argument("id", type=int, help="Portfolio ID")
    p_chart.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    p_chart.add_argument("--end-date", help="End date (YYYY-MM-DD)")
    p_chart.add_argument("--consolidated", action="store_true", help="Consolidated view")
    p_chart.add_argument("--grouping", help="Group by attribute")
    p_chart.add_argument("--benchmark", help="Benchmark code (e.g., SPY.NYSE)")

    # -------------------------------------------------------------------------
    # Holdings commands
    # -------------------------------------------------------------------------
    holdings_parser = subparsers.add_parser("holdings", help="Holdings commands")
    holdings_subparsers = holdings_parser.add_subparsers(dest="holdings_command")

    holdings_subparsers.add_parser("list", help="List all holdings")

    h_get = holdings_subparsers.add_parser("get", help="Get a specific holding")
    h_get.add_argument("id", type=int, help="Holding ID")
    h_get.add_argument("--avg-price", action="store_true", help="Include average purchase price")
    h_get.add_argument("--cost-base", action="store_true", help="Include cost base")
    h_get.add_argument("--values-over-time", help="'true' or start date for values over time")

    h_update = holdings_subparsers.add_parser("update", help="Update holding DRP settings")
    h_update.add_argument("id", type=int, help="Holding ID")
    h_update.add_argument("--enable-drp", type=lambda x: x.lower() == "true", help="Enable DRP (true/false)")
    h_update.add_argument("--drp-mode", choices=["up", "down", "half", "down_track"], help="DRP mode")

    h_delete = holdings_subparsers.add_parser("delete", help="Delete a holding")
    h_delete.add_argument("id", type=int, help="Holding ID")

    # -------------------------------------------------------------------------
    # Custom Investments commands
    # -------------------------------------------------------------------------
    investments_parser = subparsers.add_parser("investments", help="Custom investments commands")
    investments_subparsers = investments_parser.add_subparsers(dest="investments_command")

    i_list = investments_subparsers.add_parser("list", help="List custom investments")
    i_list.add_argument("--portfolio-id", type=int, help="Filter by portfolio ID")

    i_get = investments_subparsers.add_parser("get", help="Get a custom investment")
    i_get.add_argument("id", type=int, help="Custom investment ID")

    i_create = investments_subparsers.add_parser("create", help="Create a custom investment")
    i_create.add_argument("--code", required=True, help="Investment code")
    i_create.add_argument("--name", required=True, help="Investment name")
    i_create.add_argument("--country", required=True, help="Country code (e.g., AU, NZ)")
    i_create.add_argument(
        "--type", required=True,
        choices=["ORDINARY", "WARRANT", "SHAREFUND", "PROPFUND", "PREFERENCE", "STAPLEDSEC", "OPTIONS", "RIGHTS", "MANAGED_FUND", "FIXED_INTEREST", "PIE"],
        help="Investment type",
    )
    i_create.add_argument("--portfolio-id", type=int, help="Portfolio ID")
    i_create.add_argument("--face-value", type=float, help="Face value (FIXED_INTEREST)")
    i_create.add_argument("--interest-rate", type=float, help="Interest rate (FIXED_INTEREST)")
    i_create.add_argument("--income-type", choices=["DIVIDEND", "INTEREST"], help="Income type (FIXED_INTEREST)")
    i_create.add_argument("--payment-frequency", choices=["ON_MATURITY", "YEARLY", "TWICE_YEARLY", "QUARTERLY", "MONTHLY"], help="Payment frequency")
    i_create.add_argument("--first-payment-date", help="First payment date YYYY-MM-DD")
    i_create.add_argument("--maturity-date", help="Maturity date YYYY-MM-DD")
    i_create.add_argument("--auto-calc-income", action="store_true", help="Auto-calculate income")

    i_update = investments_subparsers.add_parser("update", help="Update a custom investment")
    i_update.add_argument("id", type=int, help="Custom investment ID")
    i_update.add_argument("--code", help="Investment code")
    i_update.add_argument("--name", help="Investment name")
    i_update.add_argument("--portfolio-id", type=int, help="Portfolio ID")
    i_update.add_argument("--face-value", type=float, help="Face value")
    i_update.add_argument("--interest-rate", type=float, help="Interest rate")
    i_update.add_argument("--income-type", choices=["DIVIDEND", "INTEREST"], help="Income type")
    i_update.add_argument("--payment-frequency", choices=["ON_MATURITY", "YEARLY", "TWICE_YEARLY", "QUARTERLY", "MONTHLY"], help="Payment frequency")
    i_update.add_argument("--first-payment-date", help="First payment date YYYY-MM-DD")
    i_update.add_argument("--maturity-date", help="Maturity date YYYY-MM-DD")
    i_update.add_argument("--auto-calc-income", type=lambda x: x.lower() == "true", help="Auto-calculate income (true/false)")

    i_delete = investments_subparsers.add_parser("delete", help="Delete a custom investment")
    i_delete.add_argument("id", type=int, help="Custom investment ID")

    # -------------------------------------------------------------------------
    # Prices commands
    # -------------------------------------------------------------------------
    prices_parser = subparsers.add_parser("prices", help="Custom investment prices commands")
    prices_subparsers = prices_parser.add_subparsers(dest="prices_command")

    pr_list = prices_subparsers.add_parser("list", help="List prices for a custom investment")
    pr_list.add_argument("instrument_id", type=int, help="Custom investment instrument ID")
    pr_list.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    pr_list.add_argument("--end-date", help="End date (YYYY-MM-DD)")

    pr_create = prices_subparsers.add_parser("create", help="Create a price entry")
    pr_create.add_argument("instrument_id", type=int, help="Custom investment instrument ID")
    pr_create.add_argument("--price", type=float, required=True, help="Price value")
    pr_create.add_argument("--date", required=True, help="Price date (YYYY-MM-DD)")

    pr_update = prices_subparsers.add_parser("update", help="Update a price entry")
    pr_update.add_argument("id", type=int, help="Price ID")
    pr_update.add_argument("--price", type=float, help="Price value")
    pr_update.add_argument("--date", help="Price date (YYYY-MM-DD)")

    pr_delete = prices_subparsers.add_parser("delete", help="Delete a price entry")
    pr_delete.add_argument("id", type=int, help="Price ID")

    # -------------------------------------------------------------------------
    # Coupon Rates commands
    # -------------------------------------------------------------------------
    coupon_parser = subparsers.add_parser("coupon-rates", help="Coupon rates commands")
    coupon_subparsers = coupon_parser.add_subparsers(dest="coupon_command")

    cr_list = coupon_subparsers.add_parser("list", help="List coupon rates for a custom investment")
    cr_list.add_argument("instrument_id", type=int, help="Custom investment instrument ID")
    cr_list.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    cr_list.add_argument("--end-date", help="End date (YYYY-MM-DD)")

    cr_create = coupon_subparsers.add_parser("create", help="Create a coupon rate")
    cr_create.add_argument("instrument_id", type=int, help="Custom investment instrument ID")
    cr_create.add_argument("--rate", type=float, required=True, help="Interest rate percentage")
    cr_create.add_argument("--date", required=True, help="Effective date (YYYY-MM-DD)")

    cr_update = coupon_subparsers.add_parser("update", help="Update a coupon rate")
    cr_update.add_argument("id", type=int, help="Coupon rate ID")
    cr_update.add_argument("--rate", type=float, help="Interest rate percentage")
    cr_update.add_argument("--date", help="Effective date (YYYY-MM-DD)")

    cr_delete = coupon_subparsers.add_parser("delete", help="Delete a coupon rate")
    cr_delete.add_argument("id", type=int, help="Coupon rate ID")

    # -------------------------------------------------------------------------
    # Trades commands
    # -------------------------------------------------------------------------
    trades_parser = subparsers.add_parser("trades", help="Trade commands")
    trades_subparsers = trades_parser.add_subparsers(dest="trades_command")

    tr_create = trades_subparsers.add_parser("create", help="Create a trade")
    tr_create.add_argument("portfolio_id", type=int, help="Portfolio ID")
    tr_create.add_argument("--symbol", required=True, help="Instrument symbol/code")
    tr_create.add_argument("--market", required=True, help="Market code (e.g., NYSE, ASX)")
    tr_create.add_argument("--date", required=True, help="Trade date (YYYY-MM-DD)")
    tr_create.add_argument("--quantity", type=float, required=True, help="Number of units")
    tr_create.add_argument("--price", type=float, required=True, help="Price per unit")
    tr_create.add_argument("--type", default="BUY", choices=["BUY", "SELL", "SPLIT", "BONUS", "CONSOLD", "CANCEL", "CAPITAL_RETURN", "OPENING_BALANCE"], help="Transaction type")
    tr_create.add_argument("--brokerage", type=float, help="Brokerage/commission amount")
    tr_create.add_argument("--comments", help="Comments")

    tr_get = trades_subparsers.add_parser("get", help="Get a trade")
    tr_get.add_argument("id", type=int, help="Trade ID")

    tr_update = trades_subparsers.add_parser("update", help="Update a trade")
    tr_update.add_argument("id", type=int, help="Trade ID")
    tr_update.add_argument("--date", help="Trade date (YYYY-MM-DD)")
    tr_update.add_argument("--quantity", type=float, help="Number of units")
    tr_update.add_argument("--price", type=float, help="Price per unit")
    tr_update.add_argument("--brokerage", type=float, help="Brokerage amount")
    tr_update.add_argument("--comments", help="Comments")

    tr_delete = trades_subparsers.add_parser("delete", help="Delete a trade")
    tr_delete.add_argument("id", type=int, help="Trade ID")

    # -------------------------------------------------------------------------
    # Countries command
    # -------------------------------------------------------------------------
    countries_parser = subparsers.add_parser("countries", help="List country definitions")
    countries_parser.add_argument("--supported", action="store_true", help="Only show supported countries")
    countries_parser.add_argument("--unsupported", action="store_true", help="Only show unsupported countries")

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
            if args.auth_command == "login" or args.auth_command is None:
                return cmd_auth(args)
            elif args.auth_command == "status":
                return cmd_auth_status(args)
            elif args.auth_command == "clear":
                return cmd_auth_clear(args)

        # Portfolios commands
        elif args.command == "portfolios":
            if args.portfolios_command == "list" or args.portfolios_command is None:
                return cmd_portfolios_list(args)
            elif args.portfolios_command == "get":
                return cmd_portfolios_get(args)
            elif args.portfolios_command == "holdings":
                return cmd_portfolios_holdings(args)
            elif args.portfolios_command == "performance":
                return cmd_portfolios_performance(args)
            elif args.portfolios_command == "chart":
                return cmd_portfolios_chart(args)

        # Holdings commands
        elif args.command == "holdings":
            if args.holdings_command == "list" or args.holdings_command is None:
                return cmd_holdings_list(args)
            elif args.holdings_command == "get":
                return cmd_holdings_get(args)
            elif args.holdings_command == "update":
                return cmd_holdings_update(args)
            elif args.holdings_command == "delete":
                return cmd_holdings_delete(args)

        # Investments commands
        elif args.command == "investments":
            if args.investments_command == "list" or args.investments_command is None:
                return cmd_investments_list(args)
            elif args.investments_command == "get":
                return cmd_investments_get(args)
            elif args.investments_command == "create":
                return cmd_investments_create(args)
            elif args.investments_command == "update":
                return cmd_investments_update(args)
            elif args.investments_command == "delete":
                return cmd_investments_delete(args)

        # Prices commands
        elif args.command == "prices":
            if args.prices_command == "list":
                return cmd_prices_list(args)
            elif args.prices_command == "create":
                return cmd_prices_create(args)
            elif args.prices_command == "update":
                return cmd_prices_update(args)
            elif args.prices_command == "delete":
                return cmd_prices_delete(args)

        # Coupon rates commands
        elif args.command == "coupon-rates":
            if args.coupon_command == "list":
                return cmd_coupon_rates_list(args)
            elif args.coupon_command == "create":
                return cmd_coupon_rates_create(args)
            elif args.coupon_command == "update":
                return cmd_coupon_rates_update(args)
            elif args.coupon_command == "delete":
                return cmd_coupon_rates_delete(args)

        # Trades commands
        elif args.command == "trades":
            if args.trades_command == "create":
                return cmd_trades_create(args)
            elif args.trades_command == "get":
                return cmd_trades_get(args)
            elif args.trades_command == "update":
                return cmd_trades_update(args)
            elif args.trades_command == "delete":
                return cmd_trades_delete(args)

        # Countries command
        elif args.command == "countries":
            return cmd_countries(args)

        parser.print_help()
        return 0

    except WritesDisabledError as e:
        print(json.dumps({"error": str(e), "hint": "export SHARESIGHT_ALLOW_WRITES=true"}), file=sys.stderr)
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
