#!/usr/bin/env python3
"""Klutch CLI - OpenClaw skill for Klutch programmable credit card API."""

from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import click
import requests

from auth import get_token, clear_token

CONFIG_PATH = Path.home() / ".config" / "klutch" / "config.json"
TOKEN_PATH = Path.home() / ".config" / "klutch" / "token.json"

DEFAULT_TIMEOUT = 30
DEFAULT_CONFIG: dict[str, Any] = {
    "api": {
        "endpoint": "https://graphql.klutchcard.com/graphql",
        "timeout": DEFAULT_TIMEOUT,
        "max_retries": 2,
    },
    "autonomous": {
        "enabled": False,
        "max_per_card": 200,
        "require_approval_above": 100,
    }
}


@dataclass
class Context:
    yolo: bool


def _deep_update(base_dict: dict, update_with: dict) -> dict:
    """Recursively update a dictionary."""
    for key, value in update_with.items():
        if isinstance(value, dict) and key in base_dict and isinstance(base_dict[key], dict):
            _deep_update(base_dict[key], value)
        else:
            base_dict[key] = value
    return base_dict


def _load_config() -> dict[str, Any]:
    cfg = DEFAULT_CONFIG.copy()
    if CONFIG_PATH.exists():
        try:
            user_cfg = json.loads(CONFIG_PATH.read_text())
            _deep_update(cfg, user_cfg)
        except (json.JSONDecodeError, IOError):
            pass
    return cfg


def _save_config(cfg: dict[str, Any]) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2))
    CONFIG_PATH.chmod(0o600)


def _api_request(query: str, endpoint: str, token: str, cfg: dict[str, Any], variables: Optional[dict] = None) -> dict[str, Any]:
    """Make a GraphQL API request to Klutch with retry and refresh logic."""
    timeout = cfg.get("api", {}).get("timeout", DEFAULT_TIMEOUT)
    max_retries = cfg.get("api", {}).get("max_retries", 2)
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload: dict[str, Any] = {"query": query}
    if variables:
        payload["variables"] = variables
    
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=timeout)
            
            # Handle token expiration (401 Unauthorized)
            if response.status_code == 401:
                if attempt < max_retries:
                    # Clear token and get a new one
                    clear_token()
                    new_token = get_token(endpoint, force_refresh=True)
                    headers["Authorization"] = f"Bearer {new_token}"
                    continue
                else:
                    raise click.ClickException("Authentication failed (401). Please check your credentials.")
            
            if response.status_code >= 400:
                raise click.ClickException(f"API error ({response.status_code}): {response.text}")
            
            try:
                result = response.json()
            except json.JSONDecodeError:
                return {"raw": response.text}
            
            if "errors" in result:
                # Some GraphQL errors might be auth-related
                msg = str(result["errors"])
                if "unauthorized" in msg.lower() or "expired" in msg.lower():
                    if attempt < max_retries:
                        clear_token()
                        new_token = get_token(endpoint, force_refresh=True)
                        headers["Authorization"] = f"Bearer {new_token}"
                        continue
                raise click.ClickException(f"GraphQL error: {result['errors']}")
            
            return result.get("data", {})
            
        except requests.RequestException as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(1)
                continue
            raise click.ClickException(f"Network error: {e}")
            
    raise click.ClickException(f"API request failed after {max_retries} retries: {last_error}")


@click.group()
@click.option("--yolo", is_flag=True, help="Bypass confirmation prompts for autonomous mode.")
@click.pass_context
def cli(ctx: click.Context, yolo: bool) -> None:
    ctx.obj = Context(yolo=yolo)


@cli.command()
@click.pass_obj
def balance(ctx: Context) -> None:
    """Check card information."""
    cfg = _load_config()
    endpoint = cfg["api"]["endpoint"]
    try:
        token = get_token(endpoint)
        
        card_query = "{ cards { id name status } }"
        card_data = _api_request(card_query, endpoint, token, cfg)
        cards = card_data.get("cards", [])
        
        result = {
            "cards": cards,
            "note": "Use 'klutch transactions' for transaction details",
        }
        click.echo(json.dumps(result, indent=2))
    except ValueError as e:
        raise click.ClickException(str(e))


@cli.command()
@click.option("--limit", type=click.IntRange(min=1), default=10, show_default=True)
@click.pass_obj
def transactions(ctx: Context, limit: int) -> None:
    """List recent transactions."""
    cfg = _load_config()
    endpoint = cfg["api"]["endpoint"]
    try:
        token = get_token(endpoint)
        
        query = """
        query($filter: TransactionFilter) {
            transactions(filter: $filter) {
                id
                amount
                merchantName
                transactionStatus
            }
        }
        """
        
        now = datetime.now()
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        end_date = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        variables = {
            "filter": {
                "startDate": start_date,
                "endDate": end_date,
                "transactionStatus": ["SETTLED", "PENDING"],
            }
        }
        
        data = _api_request(query, endpoint, token, cfg, variables)
        transactions_list = data.get("transactions", [])
        
        if limit and len(transactions_list) > limit:
            transactions_list = transactions_list[:limit]
        
        click.echo(json.dumps({"transactions": transactions_list}, indent=2))
    except ValueError as e:
        raise click.ClickException(str(e))


@cli.group()
def card() -> None:
    """Manage cards and view card info."""


@card.command("list")
@click.pass_obj
def card_list(ctx: Context) -> None:
    """List all cards."""
    cfg = _load_config()
    endpoint = cfg["api"]["endpoint"]
    try:
        token = get_token(endpoint)
        query = "{ cards { id name status } }"
        data = _api_request(query, endpoint, token, cfg)
        click.echo(json.dumps(data, indent=2))
    except ValueError as e:
        raise click.ClickException(str(e))


@card.command("categories")
@click.pass_obj
def card_categories(ctx: Context) -> None:
    """List transaction categories."""
    cfg = _load_config()
    endpoint = cfg["api"]["endpoint"]
    try:
        token = get_token(endpoint)
        query = "{ transactionCategories { id name mccs } }"
        data = _api_request(query, endpoint, token, cfg)
        click.echo(json.dumps(data, indent=2))
    except ValueError as e:
        raise click.ClickException(str(e))


@card.command("spending")
@click.pass_obj
def card_spending(ctx: Context) -> None:
    """View spending grouped by category."""
    cfg = _load_config()
    endpoint = cfg["api"]["endpoint"]
    try:
        token = get_token(endpoint)
        
        now = datetime.now()
        start_date = now.replace(day=1).strftime("%Y-%m-%dT%H:%M:%SZ")
        end_date = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        query = """
        query($filter: TransactionFilter, $groupBy: TransactionGroupByProperty, $operation: GroupByOperation) {
            groupTransactions(filter: $filter, groupByProperty: $groupBy, operation: $operation) {
                key
                value
            }
        }
        """
        
        variables = {
            "filter": {
                "startDate": start_date,
                "endDate": end_date,
                "transactionStatus": ["SETTLED"],
                "transactionTypes": ["CHARGE"],
            },
            "groupBy": "CATEGORY",
            "operation": "SUM",
        }
        
        data = _api_request(query, endpoint, token, cfg, variables)
        click.echo(json.dumps(data, indent=2))
    except ValueError as e:
        raise click.ClickException(str(e))


@cli.group()
def config() -> None:
    """Manage configuration."""


@config.command("get")
@click.argument("key", required=False)
def config_get(key: Optional[str]) -> None:
    """Get configuration value."""
    cfg = _load_config()
    if not key:
        click.echo(json.dumps(cfg, indent=2, sort_keys=True))
        return
    
    keys = key.split(".")
    value = cfg
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            raise click.ClickException(f"Unknown config key: {key}")
    click.echo(json.dumps(value, indent=2))


@config.command("set")
@click.argument("key")
@click.argument("value")
def config_set(key: str, value: str) -> None:
    """Set configuration value."""
    cfg = _load_config()
    
    if value.lower() == "true":
        parsed_value = True
    elif value.lower() == "false":
        parsed_value = False
    elif value.isdigit():
        parsed_value = int(value)
    else:
        try:
            parsed_value = float(value)
        except ValueError:
            parsed_value = value
    
    keys = key.split(".")
    target = cfg
    for k in keys[:-1]:
        if k not in target:
            target[k] = {}
        target = target[k]
    target[keys[-1]] = parsed_value
    
    _save_config(cfg)
    click.echo(f"Set {key} = {parsed_value}")


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
