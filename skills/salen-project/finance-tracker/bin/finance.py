#!/usr/bin/env python3
"""
Finance Tracker CLI v2.0
Complete personal finance management with recurring expenses, goals, multi-currency, and insights.

Usage:
    finance add <amount> "<description>"
    finance undo
    finance edit <id> [--amount=X] [--desc="Y"]
    finance recurring add <amount> "<desc>" <frequency>
    finance goal add "<name>" <target> [--by=DATE]
    finance insights
    finance rates
    ... and more. Run 'finance help' for full list.
"""

import sys
import os
import json

# Add lib to path - resolve symlinks
script_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, os.path.join(script_dir, '..', 'lib'))

from categories import detect_category, get_emoji, list_categories, CATEGORIES
from storage import get_storage
from reports import generate_report, list_recent, search_transactions
from parser import parse_expense, parse_amount, format_confirmation, format_error
from portfolio import get_portfolio, Portfolio
from trends import analyze_trends, compare_periods, get_budget_status
from recurring import get_recurring_manager
from goals import get_goals_manager
from currency import get_converter
from insights import get_insights, get_daily_summary, get_weekly_digest


def parse_cli_amount(amount_str: str) -> int:
    """Parse amount from CLI, supporting k suffix and currency."""
    converter = get_converter()
    storage = get_storage()
    default_currency = storage.get_currency()
    
    amount, original_currency = converter.parse_amount(amount_str, default_currency)
    return amount


def cmd_add(args):
    """Add an expense."""
    if len(args) < 2:
        print(format_error("parse_failed", "Usage: finance add 50000 \"lunch\""))
        return 1
    
    amount = parse_cli_amount(args[0])
    
    if amount is None or amount <= 0:
        print(format_error("invalid_amount"))
        return 1
    
    # Get description
    description = " ".join(args[1:]).strip('"\'')
    
    if not description:
        print(format_error("no_description"))
        return 1
    
    # Add transaction
    storage = get_storage()
    tx = storage.add_transaction(amount, description)
    
    print(format_confirmation(
        tx["amount"],
        tx["category"],
        tx["description"],
        storage.get_currency()
    ))
    
    return 0


def cmd_undo(args):
    """Undo the last transaction."""
    storage = get_storage()
    removed = storage.undo_last()
    
    if removed:
        emoji = get_emoji(removed["category"])
        print(f"↩️ Removed: {emoji} {removed['amount']:,} — {removed['description']}")
    else:
        print("❌ No transactions to undo.")
    
    return 0


def cmd_edit(args):
    """Edit a transaction."""
    if len(args) < 1:
        print("❌ Usage: finance edit <id> [--amount=X] [--desc=\"Y\"] [--category=Z]")
        return 1
    
    try:
        tx_id = int(args[0])
    except ValueError:
        print("❌ Invalid transaction ID")
        return 1
    
    amount = None
    description = None
    category = None
    
    for arg in args[1:]:
        if arg.startswith("--amount="):
            amount = parse_cli_amount(arg.split("=", 1)[1])
        elif arg.startswith("--desc="):
            description = arg.split("=", 1)[1].strip('"\'')
        elif arg.startswith("--category="):
            category = arg.split("=", 1)[1].strip('"\'')
    
    storage = get_storage()
    tx = storage.edit_transaction(tx_id, amount, description, category)
    
    if tx:
        emoji = get_emoji(tx["category"])
        print(f"✏️ Updated: {emoji} {tx['amount']:,} — {tx['description']}")
    else:
        print(f"❌ Transaction #{tx_id} not found")
    
    return 0


def cmd_delete(args):
    """Delete a specific transaction."""
    if len(args) < 1:
        print("❌ Usage: finance delete <id>")
        return 1
    
    try:
        tx_id = int(args[0])
    except ValueError:
        print("❌ Invalid transaction ID")
        return 1
    
    storage = get_storage()
    if storage.delete_transaction(tx_id):
        print(f"🗑️ Deleted transaction #{tx_id}")
    else:
        print(f"❌ Transaction #{tx_id} not found")
    
    return 0


def cmd_report(args):
    """Generate spending report."""
    period = args[0] if args else "month"
    print(generate_report(period))
    return 0


def cmd_recent(args):
    """List recent transactions."""
    n = int(args[0]) if args else 5
    print(list_recent(n))
    return 0


def cmd_search(args):
    """Search transactions."""
    if not args:
        print(format_error("parse_failed", "Usage: finance search \"food\""))
        return 1
    
    query = " ".join(args).strip('"\'')
    print(search_transactions(query))
    return 0


def cmd_categories(args):
    """List all categories."""
    print(list_categories())
    return 0


def cmd_export(args):
    """Export transactions."""
    format_type = args[0] if args else "csv"
    storage = get_storage()
    
    if format_type == "csv":
        print(storage.export_csv())
    elif format_type == "json":
        transactions = storage.get_transactions()
        print(json.dumps(transactions, indent=2, ensure_ascii=False))
    else:
        print(f"Unknown format: {format_type}. Use 'csv' or 'json'.")
        return 1
    
    return 0


def cmd_currency(args):
    """Get or set currency, or show rates."""
    storage = get_storage()
    
    if args:
        storage.set_currency(args[0])
        print(f"✅ Currency set to {args[0].upper()}")
    else:
        print(f"💱 Currency: {storage.get_currency()}")
    
    return 0


def cmd_rates(args):
    """Show exchange rates."""
    converter = get_converter()
    
    if args:
        print(converter.get_rate_info(args[0]))
    else:
        print(converter.get_rates_report())
    
    return 0


def cmd_convert(args):
    """Convert between currencies."""
    if len(args) < 3:
        print("❌ Usage: finance convert 100 USD UZS")
        return 1
    
    try:
        amount = float(args[0].replace('k', '000').replace('K', '000'))
    except ValueError:
        print("❌ Invalid amount")
        return 1
    
    from_curr = args[1].upper()
    to_curr = args[2].upper()
    
    converter = get_converter()
    converted, rate = converter.convert(amount, from_curr, to_curr)
    
    from_formatted = converter.format_amount(amount, from_curr)
    to_formatted = converter.format_amount(converted, to_curr)
    
    print(f"💱 {from_formatted} = {to_formatted}")
    print(f"   Rate: 1 {from_curr} = {rate:.4f} {to_curr}")
    
    return 0


def cmd_income(args):
    """Log income."""
    if len(args) < 2:
        print("❌ Usage: finance income 5000000 \"salary\"")
        return 1
    
    amount = parse_cli_amount(args[0])
    if amount <= 0:
        print("❌ Invalid amount")
        return 1
    
    description = " ".join(args[1:]).strip('"\'')
    
    # Detect income type
    income_type = "other"
    desc_lower = description.lower()
    if any(w in desc_lower for w in ["salary", "wage", "paycheck"]):
        income_type = "salary"
    elif any(w in desc_lower for w in ["freelance", "gig", "contract"]):
        income_type = "freelance"
    elif any(w in desc_lower for w in ["business", "sales", "revenue"]):
        income_type = "business"
    elif any(w in desc_lower for w in ["dividend", "interest", "investment"]):
        income_type = "investment"
    elif any(w in desc_lower for w in ["gift", "bonus"]):
        income_type = "gift"
    
    portfolio = get_portfolio()
    income = portfolio.add_income(amount, description, income_type)
    
    emoji = Portfolio.INCOME_TYPES.get(income_type, {}).get("emoji", "💰")
    print(f"✅ Income logged: {emoji} {amount:,} UZS — {description}")
    return 0


def cmd_asset(args):
    """Manage assets."""
    if len(args) < 1:
        portfolio = get_portfolio()
        print(portfolio.get_portfolio_report())
        return 0
    
    action = args[0].lower()
    portfolio = get_portfolio()
    
    if action == "add" and len(args) >= 3:
        name = args[1].strip('"\'')
        value = parse_cli_amount(args[2])
        
        if value <= 0:
            print("❌ Invalid value")
            return 1
        
        asset_type = args[3] if len(args) > 3 else "other"
        asset = portfolio.add_asset(name, value, asset_type)
        
        emoji = Portfolio.ASSET_TYPES.get(asset_type, {}).get("emoji", "📦")
        print(f"✅ Asset added: {emoji} {name} = {value:,} UZS")
        return 0
    
    elif action == "remove" and len(args) >= 2:
        name = args[1].strip('"\'')
        if portfolio.remove_asset(name):
            print(f"✅ Removed: {name}")
        else:
            print(f"❌ Asset not found: {name}")
        return 0
    
    elif action == "list":
        print(portfolio.get_portfolio_report())
        return 0
    
    else:
        print("Usage: finance asset [add|remove|list] ...")
        return 1


def cmd_portfolio(args):
    """Show portfolio/net worth."""
    portfolio = get_portfolio()
    print(portfolio.get_portfolio_report())
    return 0


def cmd_trends(args):
    """Analyze spending trends."""
    days = int(args[0]) if args else 90
    print(analyze_trends(days))
    return 0


def cmd_compare(args):
    """Compare spending between periods."""
    days = int(args[0]) if args else 30
    print(compare_periods(days, days))
    return 0


def cmd_budget(args):
    """Check budget status."""
    if not args:
        print("Usage: finance budget <daily_amount>")
        print("Example: finance budget 100000")
        return 1
    
    daily = parse_cli_amount(args[0])
    if daily <= 0:
        print("❌ Invalid amount")
        return 1
    
    print(get_budget_status(daily))
    return 0


# ===== RECURRING COMMANDS =====

def cmd_recurring(args):
    """Manage recurring expenses."""
    if len(args) < 1:
        recurring = get_recurring_manager()
        print(recurring.get_report())
        return 0
    
    action = args[0].lower()
    recurring = get_recurring_manager()
    
    if action == "add" and len(args) >= 4:
        amount = parse_cli_amount(args[1])
        description = args[2].strip('"\'')
        frequency = args[3].lower()
        
        # Parse optional --day=X
        day = None
        for arg in args[4:]:
            if arg.startswith("--day="):
                day = int(arg.split("=")[1])
        
        if frequency not in recurring.FREQUENCIES:
            print(f"❌ Invalid frequency. Use: {', '.join(recurring.FREQUENCIES.keys())}")
            return 1
        
        item = recurring.add_recurring(amount, description, frequency, day)
        emoji = get_emoji(item["category"])
        print(f"✅ Recurring added: {emoji} {amount:,} — {description} ({frequency})")
        return 0
    
    elif action == "remove" and len(args) >= 2:
        id_or_name = args[1].strip('"\'')
        if recurring.remove_recurring(id_or_name):
            print(f"✅ Removed recurring expense")
        else:
            print(f"❌ Not found: {id_or_name}")
        return 0
    
    elif action == "list":
        print(recurring.get_report())
        return 0
    
    elif action == "process":
        logged = recurring.process_due()
        if logged:
            print(f"✅ Processed {len(logged)} recurring expense(s)")
            for tx in logged:
                emoji = get_emoji(tx["category"])
                print(f"   {emoji} {tx['amount']:,} — {tx['description']}")
        else:
            print("✅ No recurring expenses due today")
        return 0
    
    elif action == "due":
        due = recurring.get_due_today()
        if due:
            print("🔄 Due Today:")
            for item in due:
                emoji = get_emoji(item["category"])
                print(f"   {emoji} {item['amount']:,} — {item['description']}")
        else:
            print("✅ Nothing due today")
        return 0
    
    else:
        print("Usage: finance recurring [add|remove|list|process|due]")
        return 1


# ===== GOAL COMMANDS =====

def cmd_goal(args):
    """Manage savings goals."""
    if len(args) < 1:
        goals = get_goals_manager()
        print(goals.get_report())
        return 0
    
    action = args[0].lower()
    goals = get_goals_manager()
    
    if action == "add" and len(args) >= 3:
        name = args[1].strip('"\'')
        target = parse_cli_amount(args[2])
        
        # Parse optional --by=DATE, --current=X
        deadline = None
        current = 0
        for arg in args[3:]:
            if arg.startswith("--by="):
                deadline = arg.split("=")[1]
            elif arg.startswith("--current="):
                current = parse_cli_amount(arg.split("=")[1])
        
        goal = goals.add_goal(name, target, deadline, current)
        print(f"🎯 Goal added: {name}")
        print(f"   Target: {target:,} UZS")
        if deadline:
            print(f"   Deadline: {deadline}")
        return 0
    
    elif action == "update" and len(args) >= 3:
        name = args[1].strip('"\'')
        amount = parse_cli_amount(args[2])
        
        goal = goals.update_goal(name, amount)
        if goal:
            progress = goals.get_goal_progress(goal)
            print(f"✅ Added {amount:,} to {goal['name']}")
            print(f"   Progress: {progress['current']:,} / {progress['target']:,} ({progress['percentage']:.0f}%)")
            if goal.get("completed"):
                print(f"   🎉 GOAL COMPLETED!")
        else:
            print(f"❌ Goal not found: {name}")
        return 0
    
    elif action == "set" and len(args) >= 3:
        name = args[1].strip('"\'')
        amount = parse_cli_amount(args[2])
        
        goal = goals.set_goal_amount(name, amount)
        if goal:
            progress = goals.get_goal_progress(goal)
            print(f"✅ Set {goal['name']} to {amount:,}")
            print(f"   Progress: {progress['percentage']:.0f}%")
        else:
            print(f"❌ Goal not found: {name}")
        return 0
    
    elif action == "remove" and len(args) >= 2:
        name = args[1].strip('"\'')
        if goals.remove_goal(name):
            print(f"✅ Removed goal: {name}")
        else:
            print(f"❌ Goal not found: {name}")
        return 0
    
    elif action == "list":
        print(goals.get_report())
        return 0
    
    else:
        print("Usage: finance goal [add|update|set|remove|list]")
        print("  add <name> <target> [--by=DATE]")
        print("  update <name> <amount>  (adds to current)")
        print("  set <name> <amount>     (sets current)")
        return 1


# ===== INSIGHTS =====

def cmd_insights(args):
    """Show smart insights."""
    print(get_insights())
    return 0


def cmd_summary(args):
    """Quick daily summary."""
    print(get_daily_summary())
    return 0


def cmd_digest(args):
    """Weekly digest."""
    print(get_weekly_digest())
    return 0


# ===== QUICK SHORTCUTS =====

def cmd_quick(args):
    """Show quick action buttons info."""
    print("""
⚡ Quick Actions for Telegram

These shortcuts work in chat:
• "spent 50k lunch" → finance add 50000 "lunch"
• "taxi 15k" → finance add 15000 "taxi"  
• "coffee 8k" → finance add 8000 "coffee"

Common patterns:
• <amount>k <description>
• spent <amount> <description>
• bought <description> <amount>

Or use inline buttons (if enabled in your bot).
""")
    return 0


def cmd_help(args):
    """Show help."""
    help_text = """
💰 Finance Tracker v2.0 — Complete Personal Finance

EXPENSES:
  finance add <amount> "<desc>"     Log an expense
  finance undo                      Remove last transaction
  finance edit <id> [--amount=X]    Edit a transaction
  finance delete <id>               Delete a transaction
  finance report [period]           View spending report
  finance recent [n]                List recent transactions
  finance search "<query>"          Search transactions

RECURRING:
  finance recurring                 List recurring expenses
  finance recurring add <amt> "<desc>" <freq>  Add recurring
  finance recurring remove <id>     Remove recurring
  finance recurring process         Log all due today
  finance recurring due             Show what's due

GOALS:
  finance goal                      List savings goals
  finance goal add "<name>" <target> [--by=DATE]
  finance goal update "<name>" <amount>  Add to goal
  finance goal set "<name>" <amount>     Set goal amount
  finance goal remove "<name>"

CURRENCY:
  finance rates                     Show exchange rates
  finance rates USD                 Show specific rate
  finance convert 100 USD UZS       Convert currencies
  finance currency [code]           Get/set default currency

INCOME & ASSETS:
  finance income <amount> "<desc>"  Log income
  finance asset add "<name>" <value> [type]
  finance portfolio                 Show net worth

ANALYSIS:
  finance insights                  Smart spending insights
  finance summary                   Quick daily summary
  finance digest                    Weekly digest
  finance trends [days]             Analyze patterns
  finance compare [days]            Compare periods
  finance budget <daily_amount>     Check budget status

OTHER:
  finance categories                List expense categories
  finance export [csv|json]         Export data

EXAMPLES:
  finance add 50k "lunch at cafe"
  finance add $20 "online purchase"
  finance recurring add 110k "mobile" monthly --day=1
  finance goal add "Laptop" 5000000 --by=2026-06-01
  finance goal update "Laptop" 500k
  finance insights

AMOUNT FORMATS:
  50000, 50k, 50K, $50, €100, 100 USD

FREQUENCIES: daily, weekly, biweekly, monthly, quarterly, yearly

TIPS:
  • Use 'k' for thousands: 50k = 50,000
  • Prefix with $ or € for auto-conversion
  • Categories are auto-detected from description
  • Data stored in ~/.finance-tracker/
"""
    print(help_text)
    return 0


def main():
    if len(sys.argv) < 2:
        cmd_help([])
        return 0
    
    command = sys.argv[1].lower()
    args = sys.argv[2:]
    
    commands = {
        # Core
        "add": cmd_add,
        "undo": cmd_undo,
        "edit": cmd_edit,
        "delete": cmd_delete,
        "report": cmd_report,
        "recent": cmd_recent,
        "search": cmd_search,
        "categories": cmd_categories,
        "export": cmd_export,
        
        # Currency
        "currency": cmd_currency,
        "rates": cmd_rates,
        "convert": cmd_convert,
        
        # Income & Assets
        "income": cmd_income,
        "asset": cmd_asset,
        "portfolio": cmd_portfolio,
        "networth": cmd_portfolio,
        
        # Analysis
        "trends": cmd_trends,
        "analyze": cmd_trends,
        "compare": cmd_compare,
        "budget": cmd_budget,
        "insights": cmd_insights,
        "summary": cmd_summary,
        "digest": cmd_digest,
        
        # Recurring
        "recurring": cmd_recurring,
        "recur": cmd_recurring,
        "sub": cmd_recurring,
        "subscription": cmd_recurring,
        
        # Goals
        "goal": cmd_goal,
        "goals": cmd_goal,
        "save": cmd_goal,
        "saving": cmd_goal,
        
        # Other
        "quick": cmd_quick,
        "help": cmd_help,
        "--help": cmd_help,
        "-h": cmd_help,
    }
    
    if command in commands:
        return commands[command](args)
    else:
        print(f"Unknown command: {command}")
        print("Run 'finance help' for usage.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
